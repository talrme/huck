const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{for(const style of ['daybook','orbit','compact']){
  const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'America/Los_Angeles'}),page=await context.newPage();await page.clock.setFixedTime(Date.parse('2026-11-01T20:00:00Z'));await page.goto('http://127.0.0.1:5190/?demo=1');
  await page.locator('[data-settings]').click();await page.locator(`button[data-style=${style}]`).click();await page.locator('[data-save-settings]').click();
  await page.evaluate(()=>HuckTest.enqueue('start',{id:'history-dream',childId:'avi',start:Date.now()-60*60000}));const block=page.locator('.sleep-block.running');
  assert.equal(await block.locator('.history-zs i').count(),4);assert.equal(await page.locator('.sleep-block:not(.running) .history-zs').count(),0);assert.equal(await block.locator('.history-zs').getAttribute('aria-hidden'),'true');
  const z=block.locator('.history-zs i').first();assert.equal(await z.evaluate(e=>getComputedStyle(e).animationName),'history-dream');assert(await z.evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=11));assert.equal(await block.evaluate(e=>getComputedStyle(e).animationName),'history-glow');
  const a=await z.evaluate(e=>getComputedStyle(e).transform);await new Promise(r=>setTimeout(r,200));assert.notEqual(await z.evaluate(e=>getComputedStyle(e).transform),a,'Zs actually drift');
  for(const theme of ['original','night','berry','mint'])for(const width of [320,390,1280]){
   await page.setViewportSize({width,height:844});await page.evaluate(theme=>document.body.dataset.theme=theme,theme);await block.scrollIntoViewIfNeeded();
   assert(await block.evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))&&e.scrollWidth<=e.clientWidth;}));
   await block.click();assert(await page.locator('#history-details').isVisible());assert(!(await page.locator('#modal').isVisible()));
  }
  await page.setViewportSize({width:390,height:844});await block.scrollIntoViewIfNeeded();await page.locator('.chart-shell').screenshot({path:`/tmp/huck-history-zs-${style}.png`});
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await z.evaluate(e=>getComputedStyle(e).animationName),'none');
  await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('[data-settings]').click();await page.locator('#motion').uncheck();await page.locator('[data-save-settings]').click();assert.equal(await z.evaluate(e=>getComputedStyle(e).animationName),'none');
  await page.locator('[data-end="0"]').click();assert.equal(await page.locator('.history-zs').count(),0);
  await context.close();console.log('PASS '+style+': active-only moving Zs, readable labels/clicks across themes and widths, OS/app reduced motion, cleanup on end');
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
