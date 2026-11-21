const {chromium}=require('playwright'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const server=spawn(process.execPath,['tools/serve.cjs'],{cwd:require('node:path').join(__dirname,'..'),env:{...process.env,PORT:'5291'},stdio:['ignore','pipe','inherit']});
(async()=>{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'America/Los_Angeles',reducedMotion:'reduce'}),page=await context.newPage(),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/firestore.googleapis.com|script.google.com/.test(r.url()))requests.push(r.url());});
  await page.route('https://www.gstatic.com/firebasejs/**',r=>r.abort());
  const now=Date.parse('2026-11-20T20:00:00Z');await page.clock.setFixedTime(now);
  await page.goto('http://127.0.0.1:5291/?demo=1');await page.waitForFunction(()=>window.HuckTest);
  assert.equal(await page.title(),'Huck');await page.locator('[data-start]').click();
  await page.waitForFunction(()=>document.title==='0:00 💤');
  await page.clock.setFixedTime(now+61000);await page.waitForFunction(()=>document.title==='1:01 💤');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  const screen=await page.locator('#elapsed').innerText();const saved=await page.evaluate(()=>localStorage.getItem('huck-sample-v1'));
  await page.clock.setFixedTime(now+12*60000+4000);await page.waitForFunction(()=>document.title==='12:04 💤');
  assert.equal(await page.locator('#elapsed').innerText(),screen,'Hidden title updates do not tick or render the full UI');
  assert.equal(await page.evaluate(()=>localStorage.getItem('huck-sample-v1')),saved,'Hidden title ticks do not persist derived state');
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForFunction(()=>document.querySelector('#elapsed-main').textContent==='12m');
  await page.locator('[data-settings]').click();
  for(const language of ['es','he','en']){await page.locator(`[data-language=${language}]`).click();assert.equal(await page.title(),'12:04 💤');}
  await page.locator('[data-save-settings]').click();
  await page.locator('[data-end]').click();await page.waitForFunction(()=>document.title==='Huck');
  // Switching child and restoring a saved active session must use the selected child's timestamps.
  await page.evaluate(()=>{const state=HuckTest.getState(),now=Date.now();state.children.push({id:'other',name:'Other child',archived:false});state.entries.push({id:'other-sleep',childId:'other',start:now-65000,end:null,rev:1,deleted:false});localStorage.setItem('huck-sample-v1',JSON.stringify({base:state,prefs:{child:'other',language:'en',motion:false}}));});
  await page.reload();await page.waitForFunction(()=>document.title==='1:05 💤');
  await page.goto('http://127.0.0.1:5291/?demo=1&child=avi');await page.waitForFunction(()=>document.title==='Huck');
  // Check both sides of the hour boundary and the reported 104-minute case.
  await page.clock.setFixedTime(Date.parse('2026-11-21T06:59:59Z'));await page.locator('[data-start]').click();
  await page.waitForFunction(()=>document.title==='0:00 💤');
  for(const [seconds,title] of [[3599,'59:59 💤'],[3600,'1:00:00 💤'],[3601,'1:00:01 💤'],[6244,'1:44:04 💤'],[36000,'10:00:00 💤']]){
   await page.clock.setFixedTime(Date.parse('2026-11-21T06:59:59Z')+seconds*1000);
   await page.waitForFunction(title=>document.title===title,title);
  }
  for(const width of [320,390,1280]){await page.setViewportSize({width,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`/tmp/huck-tab-title-${width}.png`});}
  assert.deepEqual(requests,[],'Title ticks never read or write the real backend');assert.deepEqual(errors,[]);
  await context.close();console.log('PASS tab title: start/end, seconds/hours, hidden local-only updates, timestamp catch-up, EN/ES/HE, child isolation, reload, compact night format, phone/desktop, zero backend requests');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.kill());
