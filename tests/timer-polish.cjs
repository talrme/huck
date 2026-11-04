const {chromium}=require('playwright'),assert=require('node:assert/strict'),C=require('../shared/core.js');
const now=Date.parse('2026-10-30T18:00:00Z');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  for(const style of ['daybook']){
   const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'America/Los_Angeles',reducedMotion:'reduce'}),p=await context.newPage(),errors=[];let state=C.initial(),release=null;
   state.entries=[{id:'long-sleep',childId:'avi',start:now-719*60000,end:null,rev:1,deleted:false,autoEnded:false}];
   p.on('pageerror',e=>errors.push(e.message));await p.clock.setFixedTime(now);
   await p.route('**/config.js',r=>r.fulfill({contentType:'text/javascript',body:'window.HUCK_CONFIG={backendUrl:"https://huck-test.invalid/exec",sheetUrl:"https://example.invalid"};'}));
   await p.route('https://huck-test.invalid/**',async r=>{const u=new URL(r.request().url());if(release){const gate=release;release=null;await gate;}if(u.searchParams.get('action')==='command')state=C.apply(state,JSON.parse(u.searchParams.get('payload')),now);await r.fulfill({contentType:'text/javascript',body:`${u.searchParams.get('callback')}(${JSON.stringify({ok:true,state})});`});});
   let finish;release=new Promise(resolve=>finish=resolve);await p.goto('http://127.0.0.1:5190/',{waitUntil:'domcontentloaded'});await p.locator('#sync-activity').waitFor({state:'visible'});assert.equal(await p.locator('#sync-activity').innerText(),'Syncing');finish();await p.locator('#sync-activity').waitFor({state:'hidden'});
   await p.locator('[data-settings]').click();await p.locator('[data-save-settings]').click();
   assert((await p.locator('#timer-art').getAttribute('src')).endsWith('/shared/sleeping.png'));assert(await p.locator('#timer-art').evaluate(img=>img.complete&&img.naturalWidth>0));
   assert.equal(await p.locator('#elapsed-main').innerText(),'11h 59m');
   for(const width of [320,390,1280]){await p.setViewportSize({width,height:844});await p.waitForTimeout(80);assert(await p.locator('#elapsed').evaluate(el=>{const main=el.querySelector('#elapsed-main').getBoundingClientRect(),seconds=el.querySelector('#elapsed-seconds').getBoundingClientRect(),box=el.getBoundingClientRect();return Math.abs(main.bottom-seconds.bottom)<15&&seconds.left>=main.right&&seconds.right<=box.right+1&&parseFloat(getComputedStyle(el.querySelector('#elapsed-main')).fontSize)>parseFloat(getComputedStyle(el.querySelector('#elapsed-seconds')).fontSize);}));assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(style==='daybook')assert(await p.evaluate(()=>document.querySelector('#elapsed-seconds').getBoundingClientRect().right<=document.querySelector('#timer-art').getBoundingClientRect().left-4));}
   await p.setViewportSize({width:390,height:844});await p.clock.setFixedTime(now+1000);await p.waitForFunction(()=>document.querySelector('#elapsed-seconds').textContent==='01s');
   await p.waitForTimeout(100);await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:`/tmp/huck-inline-timer-${style}.png`});
   for(const theme of ['night','berry','mint','original']){await p.locator('[data-settings]').click();await p.locator(`button[data-theme="${theme}"]`).click();await p.locator('[data-save-settings]').click();}
   let finishAgain;release=new Promise(resolve=>finishAgain=resolve);await p.evaluate(()=>{HuckTest.sync();});await p.locator('#sync-activity').waitFor({state:'visible'});finishAgain();await p.locator('#sync-activity').waitFor({state:'hidden'});
   state.entries[0].end=now-10000;await p.evaluate(()=>HuckTest.sync());await p.locator('#sync-activity').waitFor({state:'hidden'});assert((await p.locator('#timer-art').getAttribute('src')).endsWith('/shared/awake.png'));assert(await p.locator('#timer-art').evaluate(img=>img.complete&&img.naturalWidth>0));assert.equal(await p.locator('#elapsed-seconds').innerText(),'11s');
   assert.equal(await p.locator('#timer-art').evaluate(el=>getComputedStyle(el).animationName),'none');assert.deepEqual(errors,[]);console.log('PASS '+style+': inline seconds through 11h59m, 320/390/1280 fit, both images, sync activity lifecycle, themes and reduced motion');await context.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
