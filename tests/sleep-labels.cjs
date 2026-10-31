const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  for(const scenario of [
   {now:'2026-10-31T03:02:00Z',main:'nap',earlier:'nap',current:'sleep',startEdit:'20:00',changed:'sleep'},
   {now:'2026-10-31T14:02:00Z',main:'sleep',earlier:'sleep',current:'nap',startEdit:'07:00',changed:'nap'}
  ]){
   const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'America/Los_Angeles',reducedMotion:'reduce'}),p=await context.newPage();await p.clock.setFixedTime(Date.parse(scenario.now));await p.goto('http://127.0.0.1:5190/?demo=1');
   assert.equal(await p.locator('[data-start="0"]').innerText(),'Start '+scenario.current+' now');assert.equal(await p.locator('#delay-action').innerText(),'Start '+scenario.earlier);await p.locator('[data-delay-apply]').click();
   assert.equal(await p.locator('[data-end="0"]').innerText(),'End '+scenario.main+' now');assert.equal(await p.locator('#delay-action').innerText(),'End '+scenario.main);assert.equal(await p.locator('#timer-detail .session-time').count(),1);assert((await p.locator('#timer-detail').innerText()).includes('Enter end time'));
   await p.locator('#timer-detail [data-edit]').click();await p.locator('#start-time').fill(scenario.startEdit);assert.equal(await p.locator('#modal-title').innerText(),'Edit '+scenario.changed);await p.locator('[data-save-entry]').click();
   assert.equal(await p.locator('[data-end="0"]').innerText(),'End '+scenario.changed+' now');
   await p.locator('[data-open-end]').click();assert.equal(await p.locator('[data-toggle-end]').innerText(),scenario.changed==='nap'?'Still napping':'Still sleeping');await context.close();
  }
  console.log('PASS start-time labels: daylight/night boundaries, backdated start vs Now, consistent end labels, edited starts and still-sleeping wording');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
