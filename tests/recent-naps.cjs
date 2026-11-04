const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  for(const style of ['daybook']){
   const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'America/Los_Angeles',reducedMotion:'reduce'}),p=await context.newPage(),errors=[];let backendRequests=0;
   p.on('pageerror',e=>errors.push(e.message));await p.route('https://script.google.com/**',r=>{backendRequests++;return r.abort();});
   await p.clock.setFixedTime(Date.parse('2026-10-31T01:00:00Z'));await p.goto('http://127.0.0.1:5190/?demo=1');
   await p.locator('[data-settings]').click();await p.getByText('Advanced settings',{exact:true}).click();
   assert.equal(await p.locator('[data-sandbox-link]').innerText(),'Open real tracker');assert(!(await p.locator('[data-sandbox-link]').getAttribute('href')).includes('demo=1'));await p.locator('[data-save-settings]').click();
   assert.equal(await p.locator('#today-naps h2').innerText(),'Recent entries');assert.equal(await p.locator('.nap-entry').count(),3);
   assert((await p.locator('.nap-times').first().innerText()).startsWith('5:00 PM'));assert((await p.locator('#timer-detail').innerText()).includes('Last nap: 35 minutes long'));assert.equal(await p.locator('.last-time-range').innerText(),'(5:00 PM–5:35 PM)');
   await p.locator('.last-time-range').click();assert(await p.locator('#modal').isVisible());await p.locator('.entry-cancel').click();
   await p.locator('[data-more-naps]').click();assert.equal(await p.locator('.nap-entry').count(),4);assert.equal(await p.locator('[data-more-naps]').getAttribute('aria-expanded'),'true');
   await p.locator('[data-more-naps]').click();assert.equal(await p.locator('.nap-entry').count(),3);
   await p.locator('.nap-entry').first().click();const id=await p.locator('.nap-entry').first().getAttribute('data-edit');
   assert.equal(await p.locator('[data-end-state="running"]').innerText(),'Still napping');await p.locator('[data-end-state="running"]').click();assert(!(await p.locator('#end-fields').isVisible()));await p.locator('[data-save-entry]').click();
   assert.equal(await p.evaluate(id=>HuckTest.getState().entries.find(e=>e.id===id).end,id),null);assert.equal(await p.locator('#timer-status').innerText(),'Sleeping');
   await p.reload();assert.equal(await p.locator('#timer-status').innerText(),'Sleeping');
   // An older entry cannot be reopened over the already active nap.
   await p.locator('.nap-entry').first().click();await p.locator('[data-end-state="running"]').click();await p.locator('[data-save-entry]').click();assert(await p.locator('#modal').isVisible());assert(await p.locator('#modal-notice').isVisible());assert((await p.locator('#modal-notice').innerText()).includes('overlaps'));
   await p.locator('[data-end-state="ended"]').click();await p.locator('[data-save-entry]').click();await p.locator('[data-end="0"]').click();assert.equal(await p.locator('#timer-status').innerText(),'Awake');
   await p.evaluate(()=>{document.querySelector('#toast').hidden=true;scrollTo(0,0);});await p.screenshot({path:`/tmp/huck-recent-${style}.png`});
   for(const width of [320,1280]){await p.setViewportSize({width,height:900});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
   assert.equal(backendRequests,0);assert.deepEqual(errors,[]);console.log('PASS '+style+': recent three, newest first, expand/collapse, still napping/reload, overlap protection, sandbox isolation and phone fit');await context.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
