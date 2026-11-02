const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  for(const style of ['daybook','orbit','compact'])for(const noun of ['nap','sleep']){
   const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'America/Los_Angeles',reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));const now=Date.parse(noun==='nap'?'2026-11-01T20:00:00Z':'2026-11-02T06:00:00Z');await page.clock.install({time:now});await page.clock.pauseAt(now);await page.goto('http://127.0.0.1:5190/?demo=1');
   await page.locator('[data-settings]').click();await page.locator(`button[data-style=${style}]`).click();await page.locator('[data-save-settings]').click();
   const before=await page.evaluate(()=>HuckTest.getState().entries.filter(e=>!e.deleted));
   await page.locator('[data-start="0"]').click();const record=await page.evaluate(()=>HuckTest.getState().entries.find(e=>!e.end&&!e.deleted));
   assert.equal(record.start,now);assert.equal(await page.locator('#end-confirmation-label').innerText(),(noun==='nap'?'Nap':'Sleep')+' started at');assert.equal(await page.locator('[data-resume-ended]').innerText(),'Still awake?');
   for(const theme of ['original','night','berry','mint'])for(const width of [320,390,1280]){
    await page.setViewportSize({width,height:844});await page.evaluate(theme=>document.body.dataset.theme=theme,theme);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert(await page.locator('#end-confirmation').evaluate(e=>[...e.querySelectorAll('span,button')].every(n=>{const a=n.getBoundingClientRect(),b=e.getBoundingClientRect();return a.left>=b.left&&a.right<=b.right;})));
   }
   await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.body.dataset.theme='original');
   await page.screenshot({path:`/tmp/huck-started-${style}-${noun}.png`});
   await page.locator('#end-confirmation-time').click();assert(await page.locator('#start-fields').isVisible());assert(!(await page.locator('#end-fields').isVisible()));await page.clock.runFor(10000);assert(await page.locator('#modal').isVisible());await page.locator('.entry-cancel').click();
   assert.equal(await page.evaluate(id=>HuckTest.getState().entries.find(e=>e.id===id).start,record.id),now);
   // End then resume normally to keep this test isolated from unrelated sleeps.
   await page.clock.runFor(60000);await page.locator('[data-end="0"]').click();await page.locator('[data-resume-ended]').click();await page.locator('[data-confirm-resume]').click();await page.locator('[data-end="0"]').click();
   await page.locator('[data-dismiss-ended]').click();await page.clock.runFor(60000);await page.locator('[data-start="0"]').click();
   const id=await page.evaluate(()=>HuckTest.getState().entries.find(e=>!e.end&&!e.deleted).id),snapshot=await page.evaluate(()=>JSON.stringify(HuckTest.getState()));
   await page.locator('[data-resume-ended]').click();assert.equal(await page.evaluate(()=>JSON.stringify(HuckTest.getState())),snapshot,'First tap is not destructive');
   assert.equal(await page.locator('#modal-footer [data-close]').innerText(),noun==='nap'?'Keep napping':'Keep sleeping');
   await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>JSON.stringify(HuckTest.getState())),snapshot);
   // New start receipt for dismissal safety and the final confirmed cancellation.
   await page.reload();assert(!(await page.locator('#end-confirmation').isVisible()),'Never replay a receipt after reload');
   await page.evaluate(id=>{const e=HuckTest.getState().entries.find(e=>e.id===id);HuckTest.enqueue('delete',{id,childId:e.childId,expectedRev:e.rev});},id);
   await page.locator('[data-start="0"]').click();const cancelId=await page.evaluate(()=>HuckTest.getState().entries.find(e=>!e.end&&!e.deleted).id);
   await page.locator('[data-resume-ended]').click();await page.screenshot({path:`/tmp/huck-cancel-start-${style}-${noun}.png`});await page.locator('[data-confirm-cancel-start]').click();
   assert(!(await page.locator('#modal').isVisible()));assert(await page.locator('[data-start="0"]').isVisible());assert(!(await page.locator('#end-confirmation').isVisible()));
   assert(await page.evaluate(id=>HuckTest.getState().entries.find(e=>e.id===id).deleted,cancelId));
   for(const old of before)assert.deepEqual(await page.evaluate(id=>HuckTest.getState().entries.find(e=>e.id===id),old.id),old,'Previous records stay intact');
   assert.deepEqual(errors,[]);await context.close();console.log('PASS '+style+' '+noun+': start-focused adjustment, safe cancellation, unchanged history, no replay, all themes/widths');
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
