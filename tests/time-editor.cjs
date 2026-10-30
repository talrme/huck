const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const now=Date.parse('2026-10-30T18:00:00Z');
(async()=>{
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{
 for(let design=1;design<=10;design++){
  const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'America/Los_Angeles',reducedMotion:'reduce'}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));await p.clock.setFixedTime(now);
  await p.goto(`http://127.0.0.1:5190/staging-${design}/?demo=1`);
  await p.locator('[data-custom-start]').click();
  assert.equal(await p.locator('#start-time').inputValue(),'10:55');
  assert.equal(await p.locator('[data-date-preset="start"]').inputValue(),'today');
  assert.equal(await p.locator('#start-date').inputValue(),'2026-10-30');
  assert((await p.locator('#time-preview').innerText()).includes('5m'));
  await p.locator('[data-adjust="start:-5"]').click();assert.equal(await p.locator('#start-time').inputValue(),'10:50');
  await p.locator('[data-now="start"]').click();assert.equal(await p.locator('#start-time').inputValue(),'11:00');
  await p.locator('[data-ago="start:5"]').click();assert.equal(await p.locator('#start-time').inputValue(),'10:55');
  await p.locator('[data-date-preset="start"]').selectOption('yesterday');assert.equal(await p.locator('#start-date').inputValue(),'2026-10-29');
  await p.locator('[data-date-preset="start"]').selectOption('today');
  await p.locator('#start-time').fill('12:00');assert(await p.locator('[data-save-entry]').isDisabled());assert((await p.locator('#time-preview').innerText()).includes('past'));
  await p.locator('[data-close]').click();
  await p.locator('[data-add]').click();assert.equal(await p.locator('#start-time').inputValue(),'10:15');assert.equal(await p.locator('#end-time').inputValue(),'11:00');assert.equal(await p.locator('#time-preview').innerText(),'45m sleep');
  await p.screenshot({path:`/tmp/huck-time-editor-${design}.png`});
  await p.setViewportSize({width:320,height:740});assert(await p.evaluate(()=>document.querySelector('#modal').scrollWidth<=document.querySelector('#modal').clientWidth));
  await p.locator('#end-time').fill('10:00');assert(await p.locator('[data-save-entry]').isDisabled());assert((await p.locator('#time-preview').innerText()).includes('after start'));
  await p.locator('#end-time').fill('11:00');await p.locator('[data-save-entry]').click();assert(!(await p.locator('#modal').isVisible()));
  const old=await p.evaluate(()=>HuckTest.getState().entries.filter(e=>!e.deleted).sort((a,b)=>b.start-a.start)[0]);
  await p.locator('.nap-entry').first().click();await p.locator('[data-save-entry]').click();
  const unchanged=await p.evaluate(id=>HuckTest.getState().entries.find(e=>e.id===id),old.id);assert.equal(unchanged.start,old.start);assert.equal(unchanged.end,old.end);
  await p.locator('[data-add]').click();await p.locator('[data-date-preset="start"]').selectOption('yesterday');await p.locator('#start-time').fill('23:30');await p.locator('#end-time').fill('00:15');assert.equal(await p.locator('#time-preview').innerText(),'45m sleep');await p.locator('[data-save-entry]').click();assert(!(await p.locator('#modal').isVisible()));
  await p.locator('[data-start="0"]').click();await p.clock.setFixedTime(now+5*60000);
  await p.locator('#timer-detail [data-edit]').click();
  assert.equal(await p.locator('#still-sleeping').count(),0);
  assert.equal(await p.locator('[data-toggle-end]').innerText(),'Set time');assert(!(await p.locator('#end-fields').isVisible()));
  await p.locator('[data-save-entry]').click();assert.equal(await p.locator('#timer-status').innerText(),'Sleeping');
  await p.locator('#timer-detail [data-edit]').click();await p.locator('[data-toggle-end]').click();assert(await p.locator('#end-fields').isVisible());assert.equal(await p.locator('#end-time').inputValue(),'11:05');
  await p.screenshot({path:`/tmp/huck-set-end-${design}.png`});
  await p.locator('[data-toggle-end]').click();assert(!(await p.locator('#end-fields').isVisible()));await p.locator('[data-save-entry]').click();assert.equal(await p.locator('#timer-status').innerText(),'Sleeping');
  await p.locator('#timer-detail [data-edit]').click();await p.locator('[data-toggle-end]').click();await p.locator('[data-save-entry]').click();assert.equal(await p.locator('#timer-status').innerText(),'Awake');
  const fav=await p.locator('link[rel="icon"]').getAttribute('href');assert(fav.includes('favicon.png'));const touch=await p.locator('link[rel="apple-touch-icon"]').getAttribute('href');assert(touch.includes('apple-touch-icon.png'));
  const manifest=await p.evaluate(async()=>fetch(document.querySelector('link[rel="manifest"]').href).then(r=>r.json()));assert.equal(manifest.icons.length,2);
  assert.deepEqual(errors,[]);console.log(`PASS editor ${design}: defaults, quick times, yesterday, validation, overnight, unchanged precision, phone fit, new icons`);await context.close();
 }
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
