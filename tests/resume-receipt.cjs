const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  for(const [noun,iso] of [['nap','2026-11-01T20:00:00Z'],['sleep','2026-11-02T06:00:00Z']]){
   const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'America/Los_Angeles',reducedMotion:'reduce'}),page=await context.newPage();
   const now=Date.parse(iso);await page.clock.install({time:now});await page.clock.pauseAt(now);await page.goto('http://127.0.0.1:5190/?demo=1');
   await page.evaluate(()=>HuckTest.enqueue('start',{id:'resume-test',childId:'avi',start:Date.now()-7*60000}));
   await page.locator('[data-end="0"]').click();
   assert.equal(await page.locator('#end-confirmation-label').innerText(),(noun==='nap'?'Nap':'Sleep')+' ended at');
   assert.equal(await page.locator('[data-resume-ended]').innerText(),noun==='nap'?'Still napping?':'Still sleeping?');
   const before=await page.evaluate(()=>JSON.stringify(HuckTest.getState()));
   await page.locator('[data-resume-ended]').click();assert(await page.locator('#modal').isVisible());
   assert.equal(await page.evaluate(()=>JSON.stringify(HuckTest.getState())),before,'First tap must not reopen a sleep');
   await page.locator('[data-close]').last().click();assert.equal(await page.evaluate(()=>JSON.stringify(HuckTest.getState())),before,'Cancel must keep the end');
   // A second locally ended sleep exercises explicit confirmation and stable ID/start.
   await page.clock.runFor(60000);await page.locator('[data-start="0"]').click();await page.clock.runFor(60000);
   const active=await page.evaluate(()=>HuckTest.getState().entries.find(e=>!e.end&&!e.deleted));
   await page.locator('[data-end="0"]').click();await page.locator('[data-resume-ended]').click();await page.locator('[data-confirm-resume]').click();
   assert(!(await page.locator('#modal').isVisible()));assert(!(await page.locator('#end-confirmation').isVisible()));
   const resumed=await page.evaluate(id=>HuckTest.getState().entries.find(e=>e.id===id),active.id);assert.equal(resumed.end,null);assert.equal(resumed.start,active.start);
   await page.reload();assert(await page.locator('[data-end="0"]').isVisible(),'Resumed record persists');await context.close();
  }
  const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'America/Los_Angeles'}),page=await context.newPage();
  const now=Date.parse('2026-11-01T20:00:00Z');await page.clock.install({time:now});await page.clock.pauseAt(now);await page.goto('http://127.0.0.1:5190/?demo=1');
  await page.evaluate(()=>HuckTest.enqueue('start',{id:'fade-test',childId:'avi',start:Date.now()-7*60000}));await page.locator('[data-end="0"]').click();await page.mouse.move(0,0);
  await page.clock.runFor(10000);const opacity=await page.locator('#end-confirmation').evaluate(e=>{const fade=e.getAnimations().find(a=>a.effect.getKeyframes().some(f=>'opacity' in f)&&a.effect.getTiming().duration===12000);fade.currentTime=10000;return Number(getComputedStyle(e).opacity);});assert(opacity<.95&&opacity>.5,'Receipt fades gently near expiry');
  await page.locator('[data-resume-ended]').focus();await page.clock.runFor(20000);assert(await page.locator('#end-confirmation').isVisible(),'Keyboard interaction pauses expiry');assert.equal(await page.locator('#end-confirmation').evaluate(e=>getComputedStyle(e).opacity),'1');
  await page.locator('[data-start="0"]').focus();await page.clock.runFor(2300);await page.locator('#end-confirmation').waitFor({state:'hidden'});await context.close();
  console.log('PASS nap/sleep labels, guarded resume, cancel, stable original timer, reload persistence, progressive fade and paused keyboard dismissal');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
