const {chromium}=require('playwright'),assert=require('node:assert/strict');
const now=Date.parse('2026-10-30T18:00:00Z');
async function wheel(p,prefix,kind,value){
 const el=p.locator(`[data-time-field="${prefix}"] [data-wheel="${kind}"]`);
 await el.evaluate((el,value)=>{const node=[...el.children].find(n=>n.textContent===value);if(!node)throw Error('Missing wheel value '+value);el.scrollTop=Number(node.dataset.index)*36;el.dispatchEvent(new Event('scroll'));},value);
}
async function time(p,prefix,h,m){await wheel(p,prefix,'hour',String(h%12||12));await wheel(p,prefix,'minute',String(m).padStart(2,'0'));await wheel(p,prefix,'period',h<12?'AM':'PM');}
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  for(const design of ['daybook','orbit','compact']){
   const c=await browser.newContext({viewport:{width:390,height:844},timezoneId:'America/Los_Angeles',hasTouch:true}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.clock.setFixedTime(now);
   await p.goto('http://127.0.0.1:5190/?demo=1');await p.locator('[data-settings]').click();await p.locator(`button[data-style="${design}"]`).click();await p.locator('[data-save-settings]').click();
   const state=()=>p.evaluate(()=>JSON.stringify(HuckTest.getState()));
   await p.locator('[data-custom-start]').click();assert.equal(await p.locator('#start-time').inputValue(),'10:55');assert.equal(await p.locator('#start-date').inputValue(),'2026-10-30');assert.equal(await p.locator('[data-adjust],[data-ago],input[type=time],input[type=date]').count(),0);
   const before=await state();await p.locator('[data-now="start"]').click();assert.equal(await p.locator('#start-time').inputValue(),'11:00');assert(await p.locator('[data-now="start"]').isVisible());
   const touchWheel=p.locator('[data-time-field=start] [data-wheel=minute]'),bounds=await touchWheel.boundingBox(),cdp=await c.newCDPSession(p),x=bounds.x+bounds.width/2,y=bounds.y+bounds.height/2;
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*6}]});await p.waitForTimeout(20);}
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(400);assert.notEqual(await p.locator('#start-time').inputValue(),'11:00','Touch swiping must move the custom wheel');await cdp.detach();
   await time(p,'start',12,0);assert(await p.locator('[data-save-entry]').isDisabled());await p.locator('.entry-cancel').click();assert.equal(await state(),before);
   await p.locator('[data-add]').click();assert.equal(await p.locator('#start-time').inputValue(),'10:15');assert.equal(await p.locator('#end-time').inputValue(),'11:00');assert.equal(await p.locator('[data-now="end"]').count(),1);await time(p,'end',10,0);assert(await p.locator('[data-save-entry]').isDisabled());await p.locator('[data-now="end"]').click();assert(!(await p.locator('[data-save-entry]').isDisabled()));await p.locator('[data-save-entry]').click();assert(!(await p.locator('#modal').isVisible()));
   const record=await p.evaluate(()=>HuckTest.getState().entries.filter(e=>!e.deleted).sort((a,b)=>b.start-a.start)[0]);
   for(const dismiss of ['cancel','x','outside','escape']){
    await p.locator('.nap-entry').first().click();await time(p,'start',10,20);assert.equal(await p.locator('#start-time').inputValue(),'10:20');
    if(dismiss==='cancel')await p.locator('.entry-cancel').click();if(dismiss==='x')await p.locator('[data-close]').first().click();if(dismiss==='outside')await p.mouse.click(2,2);if(dismiss==='escape')await p.keyboard.press('Escape');
    assert(!(await p.locator('#modal').isVisible()));assert.equal(await p.evaluate(id=>HuckTest.getState().entries.find(e=>e.id===id).start,record.id),record.start);
   }
   await p.locator('.nap-entry').first().click();await time(p,'start',10,20);await p.locator('[data-save-entry]').click();assert.equal(await p.evaluate(id=>HuckTest.getState().entries.find(e=>e.id===id).start,record.id),now-40*60000);
   const revision=await p.evaluate(id=>HuckTest.getState().entries.find(e=>e.id===id).rev,record.id);await p.locator('.nap-entry').first().click();await p.locator('[data-save-entry]').click();assert.equal(await p.evaluate(id=>HuckTest.getState().entries.find(e=>e.id===id).rev,record.id),revision);
   await p.locator('[data-start="0"]').click();await p.clock.setFixedTime(now+5*60000);
   for(const dismiss of ['x','cancel','outside','escape']){
    await p.locator('[data-open-end]').click();assert(await p.locator('#end-fields').isVisible());assert.equal(await p.locator('#end-time').inputValue(),'11:05');
    if(dismiss==='x')await p.locator('[data-close]').first().click();if(dismiss==='cancel')await p.locator('.entry-cancel').click();if(dismiss==='outside')await p.mouse.click(2,2);if(dismiss==='escape')await p.keyboard.press('Escape');
    assert.equal(await p.locator('#timer-status').innerText(),'Sleeping');assert(await p.evaluate(()=>HuckTest.getState().entries.some(e=>!e.deleted&&!e.end)));
   }
   await p.locator('[data-open-end]').click();
   const minute=p.locator('[data-time-field=end] [data-wheel=minute]');await minute.focus();await p.keyboard.press('ArrowUp');assert.equal(await p.locator('#end-time').inputValue(),'11:04');await p.keyboard.press('ArrowDown');assert.equal(await p.locator('#end-time').inputValue(),'11:05');
   for(const theme of ['original','night','berry','mint']){
    await p.evaluate(theme=>document.body.dataset.theme=theme,theme);
    for(const width of [320,390,1280]){await p.setViewportSize({width,height:844});assert(await p.locator('#modal').evaluate(e=>e.scrollWidth<=e.clientWidth));assert(await p.locator('[data-save-entry]').isVisible());assert(await p.locator('.entry-cancel').isVisible());}
    await p.setViewportSize({width:390,height:844});await p.screenshot({path:`/tmp/huck-picker-${design}-${theme}.png`,animations:'disabled'});
   }
   await p.locator('[data-save-entry]').click();assert.equal(await p.locator('#timer-status').innerText(),'Awake');
   await p.locator('.nap-entry').first().click();await p.locator('[data-end-state="running"]').click();await p.locator('[data-save-entry]').click();assert.equal(await p.locator('#timer-status').innerText(),'Sleeping');
   await p.locator('[data-open-end]').click();await p.locator('[data-delete-entry]').click();await p.locator('[data-confirm-delete]').click();assert.equal(await p.locator('#timer-status').innerText(),'Awake');
   await p.locator('[data-add]').click();await wheel(p,'start','day','Yesterday');await time(p,'start',23,30);await time(p,'end',0,15);assert.equal(await p.locator('#time-preview').innerText(),'45m sleep');await p.locator('[data-save-entry]').click();assert(!(await p.locator('#modal').isVisible()));
   assert(await p.evaluate(()=>HuckTest.getState().entries.some(e=>e.start===Date.parse('2026-10-30T06:30:00Z')&&e.end===Date.parse('2026-10-30T07:15:00Z'))));
   assert.deepEqual(errors,[]);console.log(`PASS ${design}: wheel scrolling/keyboard, Now, validation, explicit Save, all dismissal routes discard, active end regression, reopen/delete, themes/320/390/1280`);await c.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
