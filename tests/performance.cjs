const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),C=require('../shared/core.js');
const now=Date.parse('2026-10-30T18:00:00Z');
function fixture(count){const state=C.initial();for(let i=1;i<=count;i++)state.entries.push({id:'synthetic-'+i,childId:'avi',start:now-i*3*3600000,end:now-i*3*3600000+3600000,rev:1,deleted:false,autoEnded:false});state.entries.push({id:'active',childId:'avi',start:now-30*60000,end:null,rev:1,deleted:false,autoEnded:false});return state;}
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  async function bench(baseline){
   const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'America/Los_Angeles',reducedMotion:'reduce'}),p=await context.newPage();await p.clock.setFixedTime(now);
   await p.addInitScript(state=>{localStorage.setItem('huck-v1',JSON.stringify({base:state,queue:[],prefs:{style:'daybook',motion:false}}));window.formatterConstructions=0;Intl.DateTimeFormat=new Proxy(Intl.DateTimeFormat,{construct(target,args){window.formatterConstructions++;return Reflect.construct(target,args);}});},fixture(2000));
   await p.route('**/config.js',r=>r.fulfill({contentType:'text/javascript',body:'window.HUCK_CONFIG={backendUrl:"",sheetUrl:"https://example.invalid"};'}));
   if(baseline)await p.route('**/shared/app.js*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync(baseline,'utf8')}));
   await p.goto('http://127.0.0.1:5190/');
   const result=await p.evaluate(()=>{const started=performance.now();for(let i=0;i<100;i++)HuckTest.getState();return {projectionReadsMs:Math.round((performance.now()-started)*10)/10,formatterConstructions:window.formatterConstructions,records:HuckTest.getState().entries.length};});
   if(!baseline){assert(await p.evaluate(()=>HuckTest.getState()===HuckTest.getState()));await p.clock.setFixedTime(now+240*60000);assert.equal(await p.evaluate(()=>HuckTest.getState().entries.find(e=>e.id==='active').autoEnded),true);}
   console.log((baseline?'BASELINE':'OPTIMIZED')+' synthetic history '+JSON.stringify(result));await context.close();return result;
  }
  if(process.env.HUCK_BASELINE_JS)await bench(process.env.HUCK_BASELINE_JS);await bench();
  const context=await browser.newContext({timezoneId:'America/Los_Angeles',reducedMotion:'reduce'}),p=await context.newPage();await p.clock.setFixedTime(now);let state=C.initial(),failCommand=false,pause=null;const calls=[],seen=new Set();
  await p.route('**/config.js',r=>r.fulfill({contentType:'text/javascript',body:'window.HUCK_CONFIG={backendUrl:"https://huck-test.invalid/exec",sheetUrl:"https://example.invalid"};'}));
  await p.route('https://huck-test.invalid/**',async r=>{const u=new URL(r.request().url()),action=u.searchParams.get('action');calls.push(action);if(pause){const gate=pause;pause=null;await gate;}if(action==='command'&&failCommand){failCommand=false;return r.abort();}let result;try{if(action==='command'){const command=JSON.parse(u.searchParams.get('payload'));if(!seen.has(command.id)){state=C.apply(state,command,now+60000);seen.add(command.id);}}result={ok:true,state};}catch(e){result={ok:false,error:e.message};}await r.fulfill({contentType:'text/javascript',body:`${u.searchParams.get('callback')}(${JSON.stringify(result)});`});});
  await p.goto('http://127.0.0.1:5190/');await p.waitForFunction(()=>document.querySelector('#connection').textContent.startsWith('Synced'));assert.deepEqual(calls,['snapshot']);calls.length=0;
  await p.locator('[data-start="0"]').click();await p.waitForFunction(()=>document.querySelector('#connection').textContent.startsWith('Synced'));assert.deepEqual(calls,['command'],'A save must not wait for a preliminary snapshot');calls.length=0;
  const untouched=await p.locator('.day-column').first().elementHandle();await p.evaluate(()=>HuckTest.sync());assert.deepEqual(calls,['snapshot']);assert(await untouched.evaluate(el=>el.isConnected),'An unchanged poll must not rebuild the chart');calls.length=0;
  // A failed command stays durable and retries with its original identity.
  failCommand=true;await p.clock.setFixedTime(now+60000);await p.locator('[data-end="0"]').click();await p.waitForFunction(()=>document.querySelector('#connection').textContent.startsWith('Saved here'));await p.waitForFunction(()=>document.querySelector('#sync-activity').hidden);assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('huck-v1')).queue.length),1);calls.length=0;
  await p.evaluate(()=>HuckTest.sync(true));assert.deepEqual(calls,['command']);assert.equal(state.entries.length,1);assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('huck-v1')).queue.length),0);calls.length=0;
  // A rejected direct write refreshes shared truth and remains blocked for review.
  const stale=await p.evaluate(()=>HuckTest.getState().entries[0]);state=C.apply(state,{type:'edit',payload:{id:stale.id,childId:'avi',start:stale.start,end:now+1,expectedRev:stale.rev}},now+1);
  await p.evaluate(entry=>HuckTest.enqueue('delete',{id:entry.id,childId:'avi',expectedRev:entry.rev}),stale);await p.waitForFunction(()=>!document.querySelector('#review').hidden);await p.waitForFunction(()=>document.querySelector('#sync-activity').hidden);assert.deepEqual(calls,['command','snapshot']);assert.equal(state.entries[0].deleted,false);assert(await p.evaluate(()=>JSON.parse(localStorage.getItem('huck-v1')).queue[0].blocked));
  console.log('PASS performance/sync: 2000-record cache and expiry, one-request save, unchanged DOM, durable retry, stale-write recovery');await context.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
