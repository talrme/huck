const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{for(const style of ['daybook']){
  const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'America/Los_Angeles',reducedMotion:'reduce'}),page=await context.newPage();
  await page.clock.install({time:Date.parse('2026-10-31T01:00:00Z')});await page.clock.pauseAt(Date.parse('2026-10-31T01:00:00Z'));await page.goto('http://127.0.0.1:5190/?demo=1');
  await page.locator('[data-settings]').click();await page.locator('[data-save-settings]').click();
  const oldId=await page.locator('.nap-entry').first().getAttribute('data-edit');await page.locator('[data-start="0"]').click();
  const active=await page.evaluate(()=>HuckTest.getState().entries.find(e=>!e.deleted&&!e.end));
  await page.locator(`.nap-entry[data-edit="${oldId}"]`).click();await page.locator('[data-end-state=running]').click();await page.locator('[data-save-entry]').click();
  const message=await page.locator('#modal-notice').innerText();assert(message.includes('still sleeping'));assert(message.includes('Delete'));assert(message.includes('6:00 PM'));assert(await page.locator('#toast').isHidden());
  const before=await page.evaluate(()=>JSON.stringify(HuckTest.getState()));await page.clock.runFor(10000);assert(await page.locator('#modal-notice').isVisible(),'Error persists while editing');
  for(const theme of ['original','night','berry','mint'])for(const width of [320,390,1280]){
   await page.setViewportSize({width,height:844});await page.evaluate(theme=>document.body.dataset.theme=theme,theme);await page.locator('#modal-notice').scrollIntoViewIfNeeded();
   assert(await page.locator('#modal-notice').evaluate(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return e.contains(hit)&&r.top>=0&&r.bottom<=innerHeight&&e.closest('dialog').open;}),'Error belongs to the top-layer dialog and is unobscured');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:`/tmp/huck-overlap-${style}.png`});
  assert.equal(await page.evaluate(()=>JSON.stringify(HuckTest.getState())),before,'Rejected overlap leaves all logs unchanged');await page.locator('.entry-cancel').click();
  await page.locator('#timer-detail [data-edit]').click();await page.locator('[data-delete-entry]').click();await page.locator('[data-confirm-delete]').click();
  await page.locator(`.nap-entry[data-edit="${oldId}"]`).click();await page.locator('[data-end-state=running]').click();await page.locator('[data-save-entry]').click();
  assert(!(await page.locator('#modal').isVisible()));assert(await page.evaluate(id=>HuckTest.getState().entries.find(e=>e.id===id).deleted,active.id));
  assert.equal(await page.evaluate(()=>HuckTest.getState().entries.filter(e=>!e.deleted&&!e.end).length),1);assert.equal(await page.evaluate(id=>HuckTest.getState().entries.find(e=>e.id===id).end,oldId),null);
  await context.close();console.log('PASS '+style+': persistent unblurred modal error, conflict times, all themes/widths, no destructive overlap, delete accidental sleep then resume original');
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
