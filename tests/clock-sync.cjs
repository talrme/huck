const {chromium}=require('playwright'),assert=require('node:assert/strict'),C=require('../shared/core.js');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}),now=Date.parse('2026-11-01T20:00:00Z');
 try{for(const mode of ['legacy','legacy-blocked','calibrated']){
  let serverTime=now,state=C.initial(),attempts=[];state.entries=[{id:'realistic-sleep',childId:'avi',start:now-1800000,end:null,rev:1,deleted:false,autoEnded:false}];
  const calibrated=mode==='calibrated',phoneTime=now+(calibrated?120000:10000),errors=[];
  const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'America/Los_Angeles',reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.clock.install({time:phoneTime});await page.clock.pauseAt(phoneTime);
  if(mode==='legacy-blocked')await page.addInitScript(({base,phoneTime})=>localStorage.setItem('huck-v1',JSON.stringify({base,prefs:{motion:false},queue:[{id:'old-clock-request',type:'end',createdAt:phoneTime,payload:{id:'realistic-sleep',childId:'avi',expectedRev:1,end:phoneTime},blocked:'Choose a time in the past or now.'}]})),{base:state,phoneTime});
  await page.route('**/config.js',r=>r.fulfill({contentType:'text/javascript',body:'window.HUCK_CONFIG={backendUrl:"https://huck-clock.invalid/exec",sheetUrl:"https://example.invalid"};'}));
  await page.route('https://huck-clock.invalid/**',async r=>{const u=new URL(r.request().url());let result={ok:true,state};if(u.searchParams.get('action')==='command'){
   const cmd=JSON.parse(u.searchParams.get('payload'));attempts.push(cmd);try{state=C.apply(state,cmd,serverTime);result={ok:true,state};}catch(e){result={ok:false,error:e.message};}
  }if(calibrated)result.serverNow=serverTime;await r.fulfill({contentType:'text/javascript',body:`${u.searchParams.get('callback')}(${JSON.stringify(result)});`});});
  await page.goto('http://127.0.0.1:5190/');
  if(mode!=='legacy-blocked'){await page.waitForFunction(()=>document.querySelector('#connection').textContent.startsWith('Synced'));await page.locator('[data-end="0"]').click();}
  await page.waitForFunction(()=>document.querySelector('#sync-activity').hidden);
  if(!calibrated){
   assert.equal(state.entries[0].end,null,'Server initially rejects phone-ahead timestamp');
   const pending=await page.evaluate(()=>JSON.parse(localStorage.getItem('huck-v1')).queue);assert.equal(pending.length,1);assert(!pending[0].blocked,'Timing rejection must not block all editing');assert.equal(await page.locator('#timer-status').innerText(),'Awake','Keep optimistic end pending instead of rolling back');assert(!(await page.locator('#review').isVisible()));
   serverTime+=20000;await page.clock.runFor(7000);await page.waitForFunction(()=>JSON.parse(localStorage.getItem('huck-v1')).queue.length===0);assert.equal(new Set(attempts.map(c=>c.id)).size,1,'Same request on retry');assert.equal(state.entries[0].end,phoneTime,'Never silently shift an already queued timestamp');
  }else{
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('huck-v1')).queue.length===0);assert.equal(attempts.length,1);assert(state.entries[0].end<=serverTime&&state.entries[0].end>=serverTime-5000,'Now is calibrated despite phone being two minutes fast');
   assert.equal(await page.evaluate(()=>HuckTest.enqueue('start',{id:'invalid-future',childId:'avi',start:Date.now()+3600000})),false,'Genuinely future manual timestamps still fail local validation');
  }
  assert.equal(await page.locator('#timer-status').innerText(),'Awake');assert.deepEqual(errors,[]);await context.close();console.log('PASS '+mode+': future-time rejection recovery/calibration, no permanent blocker, optimistic end retained, timestamp and request ID preserved');
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
