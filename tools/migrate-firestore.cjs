// Run only after explicit approval to publish real history to the configured database.
// Input is a private get_spreadsheet_range export, never a checked-in household file.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),C=require('../shared/core.js');
const sourceUrl='https://script.google.com/macros/s/AKfycbyjK5CG-E70zBeQy4CRF4-0VKBOiRxgdWpT5TudrZ8eVX5FT0FRJ8imGtKKfBZpHUMYnQ/exec';
const canonical=s=>({...s,entries:[...s.entries].sort((a,b)=>a.id.localeCompare(b.id))});
async function snapshot(){
  const url=new URL(sourceUrl);url.searchParams.set('action','snapshot');url.searchParams.set('callback','migrationSnapshot');url.searchParams.set('_',Date.now());
  const response=await fetch(url,{signal:AbortSignal.timeout(45000)}),body=await response.text();
  if(!body.startsWith('migrationSnapshot(')||!body.endsWith(');'))throw Error('Unexpected Sheet response; no data written.');
  const result=JSON.parse(body.slice('migrationSnapshot('.length,-2));if(!result.ok)throw Error(result.error);return result;
}
(async()=>{
  const input=process.argv[2];if(!input)throw Error('Usage: node tools/migrate-firestore.cjs /private/events-export.json [--commit]');
  const backup=JSON.parse(fs.readFileSync(input,'utf8'));assert.deepEqual(backup.values[0],['id','receivedAt','command']);
  const events=backup.values.slice(1).filter(r=>r.length).map(([id,now,json])=>({id,now,command:JSON.parse(json)}));
  const state=events.reduce((s,e)=>C.apply(s,e.command,e.now),C.initial());
  const source=await snapshot();assert.deepEqual(canonical(state),canonical(source.state),'Sheet changed since export. Re-export events before proceeding.');
  const snapshotPath=input.replace(/\.json$/,'')+'-snapshot.json';fs.writeFileSync(snapshotPath,JSON.stringify(source,null,2));
  console.log(JSON.stringify({revision:state.revision,entries:state.entries.length,visible:state.entries.filter(e=>!e.deleted).length,children:state.children.length,events:events.length,backup:snapshotPath}));
  const sandbox={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../config.js'),'utf8'),sandbox);const config=sandbox.window.HUCK_CONFIG;
  assert.equal(config.environment,'production');assert(config.firestore);
  if(!process.argv.includes('--commit'))return console.log('Verified dry run. No Firestore writes.');
  if(events.length+state.entries.length+1>490)throw Error('Migration needs a paged, guarded import; refusing to exceed transaction limit.');
  const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  try{
    const page=await browser.newPage();await page.route('http://huck-migration.test/',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Private migration</title>'}));await page.goto('http://huck-migration.test/');
    const finalSource=await snapshot();assert.deepEqual(canonical(state),canonical(finalSource.state),'Sheet changed during preparation. Aborting.');
    const migrated=await page.evaluate(async({state,events,config})=>{
      const app=await import('https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js'),sdk=await import('https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js');
      const db=sdk.getFirestore(app.initializeApp(config.firestore)),records=sdk.collection(db,'huckEnvironments','production','records'),head=sdk.doc(records,'head'),commands=sdk.collection(db,'huckEnvironments','production','commands');
      const existing=await sdk.getDocsFromServer(records);
      if(existing.empty){
        if(!(await sdk.getDocsFromServer(commands)).empty)throw Error('Orphan migration receipts exist. Manual review required.');
        await sdk.runTransaction(db,async tx=>{
          if((await tx.get(head)).exists())throw Error('Production was created concurrently. Nothing overwritten.');
          tx.set(head,{schema:1,children:state.children,settings:state.settings,revision:state.revision,updatedAt:sdk.serverTimestamp(),migration:{source:'Google Sheets',eventCount:events.length,revision:state.revision}});
          for(const entry of state.entries)tx.set(sdk.doc(records,'entry_'+entry.id),{entry});
          for(let i=0;i<events.length;i++){const e=events[i];tx.set(sdk.doc(commands,e.id),{fingerprint:JSON.stringify(e.command),type:e.command.type,revision:i+1,receivedAt:sdk.Timestamp.fromMillis(e.now),migrated:true});}
        });
      }
      const result=await sdk.getDocsFromServer(records),h=result.docs.find(d=>d.id==='head').data();
      const receipts=await sdk.getDocsFromServer(commands);
      return {state:{children:h.children,settings:h.settings,revision:h.revision,entries:result.docs.filter(d=>d.id!=='head').map(d=>d.data().entry)},receipts:receipts.docs.map(d=>({id:d.id,...d.data(),receivedAt:undefined}))};
    },{state,events,config});
    assert.deepEqual(canonical(migrated.state),canonical(state),'Production differs from source; never overwrite it.');
    for(const event of events)assert.equal(migrated.receipts.find(r=>r.id===event.id)?.fingerprint,JSON.stringify(event.command),'Missing migration receipt');
    console.log('Verified production: exact children, settings, entries (including deleted), revisions, timestamps, and all stable request receipts.');
    const after=await snapshot();assert.deepEqual(canonical(after.state),canonical(state),'Late Sheet write detected after import: reconcile before cutover.');
    console.log('Source unchanged after import. Sheet retained intact; refresh all old clients at cutover.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
