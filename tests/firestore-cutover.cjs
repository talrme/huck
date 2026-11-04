const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),C=require('../shared/core.js');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}),environment='test-cutover-'+Date.now();
 const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'America/Los_Angeles'}),p=await context.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 const configSource=fs.readFileSync(require('node:path').join(__dirname,'../config.js'),'utf8')+`\nHUCK_CONFIG.environment=${JSON.stringify(environment)};`;
 await context.route('**/config.js',r=>r.fulfill({contentType:'text/javascript',body:configSource}));
 await context.route('**/script.google.com/**',r=>{errors.push('Unexpected Sheet request');return r.abort();});
 try{
  await p.goto('http://127.0.0.1:5190/?demo=1');
  const original=C.initial(),command={id:'legacy-ack-lost',type:'child',payload:{id:'legacy-child',name:'Legacy child'},createdAt:Date.now()},state=C.apply(original,command,Date.now());
  await p.evaluate(async({environment,state,command})=>{
   const sdk=await import('https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js'),app=await import('https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js');
   await new Promise(r=>setTimeout(r,500));const db=sdk.getFirestore(app.getApps()[0]),batch=sdk.writeBatch(db);
   batch.set(sdk.doc(db,'huckEnvironments',environment,'records','head'),{schema:1,children:state.children,settings:state.settings,revision:state.revision});
   batch.set(sdk.doc(db,'huckEnvironments',environment,'commands',command.id),{fingerprint:JSON.stringify(command),type:command.type,revision:1});await batch.commit();
  },{environment,state,command});
  const legacy=JSON.stringify({base:original,queue:[command],prefs:{theme:'berry',language:'en',child:'avi'},localOnly:false});
  await p.evaluate(legacy=>{localStorage.setItem('huck-v1',legacy);localStorage.setItem('huck-local-backup-v1','backup-sentinel');localStorage.setItem('huck-discarded-changes-v1','[]');},legacy);
  await p.goto('http://127.0.0.1:5190/');
  await p.waitForFunction(()=>{const s=JSON.parse(localStorage.getItem('huck-v1'));return s.base.revision===1&&!s.queue.length;},null,{timeout:45000});
  assert.equal(await p.locator('body').getAttribute('data-theme'),'berry');assert(!(await p.locator('#sample-note').isVisible()));assert.equal(await p.locator('[data-seed-staging]').count(),0);
  assert.equal(await p.evaluate(()=>localStorage.getItem('huck-v1-before-firestore')),legacy);assert.equal(await p.evaluate(()=>localStorage.getItem('huck-local-backup-v1')),'backup-sentinel');
  assert.equal(await p.evaluate(()=>HuckTest.getState().children.filter(c=>c.id==='legacy-child').length),1);
  await p.reload();await p.waitForFunction(()=>document.querySelector('#connection').textContent.startsWith('Synced'));
  assert.equal(await p.evaluate(()=>localStorage.getItem('huck-v1-before-firestore')),legacy);assert.deepEqual(errors,[]);
  await p.screenshot({path:'/tmp/huck-cutover-phone.png'});
  console.log('PASS production cutover: original storage key/preferences/backups retained, one-time recovery backup, migrated request receipt acknowledges old pending command without duplicate, no staging banner/sample controls, reload, no Sheets traffic. Disposable data only.');
 }finally{
  await p.evaluate(async environment=>{if(!environment.startsWith('test-cutover-'))throw Error('Unsafe cleanup');const sdk=await import('https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js'),app=await import('https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js'),db=sdk.getFirestore(app.getApps()[0]);for(const name of ['records','commands']){const docs=await sdk.getDocsFromServer(sdk.collection(db,'huckEnvironments',environment,name));const batch=sdk.writeBatch(db);docs.docs.forEach(d=>batch.delete(d.ref));await batch.commit();}},environment).catch(e=>console.error('Cleanup:',e.message));
  await browser.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
