const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'America/Los_Angeles'}),p=await context.newPage();
  await p.clock.install({time:new Date('2026-11-03T18:00:00Z')});
  await p.addInitScript(()=>{window.intervals=[];const interval=window.setInterval;window.setInterval=(fn,delay,...args)=>{intervals.push(delay);return interval(fn,delay,...args);};});
  await p.route('**/config.js',r=>r.fulfill({contentType:'text/javascript',body:'window.HUCK_CONFIG={firestore:{},environment:"production",sheetUrl:"https://example.invalid",liveUrl:"https://example.invalid"};'}));
  await p.route('**/shared/firestore.js*',r=>r.fulfill({contentType:'text/javascript',body:`(()=>{
   let state=HuckCore.initial(),consumer;window.calls=[];window.failNext=false;
   window.emitRemote=()=>{state=HuckCore.apply(state,{type:'child',payload:{id:'remote',name:'Remote child'}},Date.now());consumer({ok:true,state});};
   window.HuckFirestore={watch:fn=>consumer=fn,pause(){},resume(){},async request(action,cmd){calls.push({action,at:Date.now()});if(action==='command'){if(failNext){failNext=false;throw Object.assign(Error('Offline'),{retryable:true});}state=HuckCore.apply(state,cmd,Date.now());}return {ok:true,state};}};
  })();`}));
  await p.goto('http://127.0.0.1:5190/');await p.waitForFunction(()=>document.querySelector('#connection').textContent.startsWith('Synced'));
  assert(await p.evaluate(()=>intervals.includes(60000)&&!intervals.includes(15000)&&intervals.includes(1000)));
  const calls=await p.evaluate(()=>calls.length);await p.clock.fastForward(61000);assert.equal(await p.evaluate(()=>calls.length),calls,'Idle housekeeping must not call Firestore');
  await p.evaluate(()=>{failNext=true;HuckTest.enqueue('child',{id:'retry',name:'Retry child'});});
  await p.waitForFunction(()=>calls.some(c=>c.action==='command'));await p.clock.fastForward(7000);
  await p.waitForFunction(()=>!JSON.parse(localStorage.getItem('huck-v1')).queue.length);
  assert.equal(await p.evaluate(()=>calls.filter(c=>c.action==='command').length),2,'Failed command must retry independently of housekeeping');
  await p.evaluate(()=>emitRemote());assert(await p.evaluate(()=>HuckTest.getState().children.some(c=>c.id==='remote')));
  await p.locator('[data-settings]').click();const content=await p.locator('#modal-body').innerHTML();await p.clock.fastForward(61000);assert.equal(await p.locator('#modal-body').innerHTML(),content,'Housekeeping must preserve open settings');
  console.log('PASS Firestore housekeeping: 60s local-only refresh, no 15s timer, seconds tick retained, no idle network calls, failed save retries before housekeeping, live updates remain immediate, open modal preserved. Simulated backend only.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
