const {chromium}=require('playwright'),assert=require('node:assert/strict'),C=require('../shared/core.js');
const now=Date.parse('2026-11-01T20:00:00Z');
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  for(const style of ['daybook','orbit','compact']){
   const c=await b.newContext({viewport:{width:390,height:844},timezoneId:'America/Los_Angeles',reducedMotion:'reduce'}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));const state=C.initial();state.entries=[{id:'last',childId:'avi',start:now-90*60000,end:now-45*60000-4000,rev:1,deleted:false,autoEnded:false}];
   await p.addInitScript(({base,style})=>localStorage.setItem('huck-sample-v1',JSON.stringify({base,prefs:{style,motion:false},queue:[]})),{base:state,style});await p.clock.setFixedTime(now);await p.goto('http://127.0.0.1:5190/?demo=1');assert.equal(await p.locator('#elapsed-main').innerText(),'45m');assert.equal(await p.locator('#elapsed-seconds').innerText(),'04s');assert((await p.locator('#elapsed').getAttribute('aria-label')).includes('awake'));assert.equal(await p.locator('#elapsed').getAttribute('aria-live'),'off');
   const main=await p.locator('#elapsed-main').elementHandle();await p.clock.setFixedTime(now+1000);await p.waitForFunction(()=>document.querySelector('#elapsed-seconds').textContent==='05s');assert(await main.evaluate(e=>e.isConnected));
   await p.clock.setFixedTime(now+55000);await p.waitForFunction(()=>document.querySelector('#elapsed-seconds').textContent==='59s');await p.clock.setFixedTime(now+56000);await p.waitForFunction(()=>document.querySelector('#elapsed-main').textContent==='46m'&&document.querySelector('#elapsed-seconds').textContent==='00s');
   for(const theme of ['original','night','berry','mint']){
    await p.evaluate(theme=>document.body.dataset.theme=theme,theme);
    for(const width of [320,390,1280]){await p.setViewportSize({width,height:844});await p.waitForTimeout(30);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert(await p.locator('#elapsed').evaluate(e=>{const a=e.querySelector('#elapsed-main').getBoundingClientRect(),s=e.querySelector('#elapsed-seconds').getBoundingClientRect(),box=e.getBoundingClientRect();return s.left>=a.right&&s.right<=box.right+1&&parseFloat(getComputedStyle(e.querySelector('#elapsed-seconds')).fontSize)<parseFloat(getComputedStyle(e.querySelector('#elapsed-main')).fontSize);}));}
    await p.setViewportSize({width:390,height:844});await p.screenshot({path:`/tmp/huck-awake-seconds-${style}-${theme}.png`});
   }
   await p.clock.setFixedTime(now+6*3600000);await p.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));assert.equal(await p.locator('#elapsed').innerText(),'—');assert.equal(await p.locator('#elapsed-seconds').count(),0);assert.deepEqual(errors,[]);await c.close();console.log('PASS '+style+': awake seconds, minute rollover, stable nodes, 320/390/1280 and4 themes, stale suppression');
  }
  for(const kind of ['estimated','missing']){
   const c=await b.newContext(),p=await c.newPage(),state=C.initial();if(kind==='estimated')state.entries=[{id:'estimated',childId:'avi',start:now-90*60000,end:now-45*60000,rev:1,deleted:false,autoEnded:true}];await p.clock.setFixedTime(now);await p.addInitScript(base=>localStorage.setItem('huck-sample-v1',JSON.stringify({base,prefs:{},queue:[]})),state);await p.goto('http://127.0.0.1:5190/?demo=1');assert.equal(await p.locator('#elapsed-seconds').count(),0);assert.equal(await p.locator('#elapsed').innerText(),kind==='estimated'?'~45m':'—');await c.close();
  }
  console.log('PASS estimated and missing wake times avoid false precision');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
