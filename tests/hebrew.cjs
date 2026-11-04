const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const c=await browser.newContext({viewport:{width:390,height:844},timezoneId:'America/Los_Angeles',reducedMotion:'reduce'}),p=await c.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));await p.clock.setFixedTime(Date.parse('2026-11-03T22:00:00Z'));await p.goto('http://127.0.0.1:5190/?demo=1');
  await p.locator('[data-settings]').click();const before=await p.evaluate(()=>JSON.stringify(HuckTest.getState()));
  await p.locator('#new-child').evaluate(e=>e.closest('details').open=true);await p.locator('#new-child').fill('בדיקה');
  for(const language of ['he','es','en','he']){
   await p.locator(`[data-language=${language}]`).click();assert.equal(await p.locator('html').getAttribute('lang'),language);
   assert.equal(await p.locator('html').getAttribute('dir'),language==='he'?'rtl':'ltr');
   assert.equal(await p.locator('.language-settings legend').innerText(),'Language');
   assert.equal(await p.locator('[data-language][aria-pressed=true]').count(),1);
   assert.equal(await p.locator('#new-child').inputValue(),'בדיקה','Switching languages preserves draft input');
   assert.deepEqual(await p.locator('[data-language]').allTextContents(),['English','Español','עברית']);
  }
  assert.equal(await p.locator('#modal-title').innerText(),'הגדרות');
  assert.equal(await p.evaluate(()=>JSON.stringify(HuckTest.getState())),before);
  assert.deepEqual(await p.evaluate(()=>HuckI18n.missingTranslations('he')),[],'Hebrew has every Spanish dictionary key');
  assert.deepEqual(await p.locator('#modal-body').evaluate(root=>HuckI18n.untranslated(root).filter(s=>!/^\d/.test(s))),[],'No English settings text remains');
  const reducerErrors=[...fs.readFileSync(path.join(__dirname,'../shared/core.js'),'utf8').matchAll(/throw Error\('([^']+)'\)/g)].map(m=>m[1]);
  assert.deepEqual(await p.evaluate(messages=>messages.filter(s=>HuckI18n.translate(s)===s),reducerErrors),[],'Reducer errors have Hebrew translations');
  for(const style of ['daybook'])for(const theme of ['original','night','berry','mint','midnight'])for(const width of [320,390,1280]){
   await p.setViewportSize({width,height:844});await p.locator(`button[data-theme=${theme}]`).click();
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   assert(await p.locator('#language').evaluate(e=>e.scrollWidth<=e.clientWidth&&getComputedStyle(e).direction==='ltr'));
   assert(await p.locator('[data-language]').evaluateAll(es=>es.every(e=>e.scrollWidth<=e.clientWidth&&e.getBoundingClientRect().height>=44)));
   assert(await p.locator('[data-language=he]').evaluate(e=>{const a=e.getBoundingClientRect(),b=document.querySelector('.language-thumb').getBoundingClientRect();return Math.abs(a.x-b.x)<1&&Math.abs(a.width-b.width)<1;}),'Sliding highlight aligns with Hebrew');
  }
  await p.setViewportSize({width:390,height:844});await p.locator('#modal').screenshot({path:'/tmp/huck-hebrew-settings.png'});await p.locator('[data-save-settings]').click();await p.reload();
  assert.equal(await p.locator('html').getAttribute('lang'),'he');assert.equal(await p.locator('#child-name').innerText(),'Avi');
  assert.equal(await p.locator('#timer-status').innerText(),'ער');
  await p.locator('[data-start]').click();assert.equal(await p.locator('#timer-status').innerText(),'ישן');
  assert((await p.locator('#end-confirmation-label').innerText()).includes('התחילה'));
  assert(await p.locator('.chart-shell').evaluate(e=>getComputedStyle(e).direction==='ltr'));
  for(const style of ['daybook'])for(const width of [320,390,1280]){
   await p.setViewportSize({width,height:844});await p.evaluate(style=>document.body.dataset.style=style,style);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   assert(await p.locator('.brand-icon').evaluate(e=>e.getBoundingClientRect().x<document.querySelector('[data-child-help]').getBoundingClientRect().x));
  }
  await p.evaluate(()=>document.body.dataset.style='daybook');await p.setViewportSize({width:390,height:844});await p.screenshot({path:'/tmp/huck-hebrew-sleep.png'});
  await p.locator('#timer-detail [data-edit]').click();assert.equal(await p.locator('#modal-title').innerText(),'עריכת תנומה');
  assert.equal(await p.locator('[data-toggle-start]').getAttribute('aria-expanded'),'true');
  await p.locator('[data-end-state=ended]').click();await p.locator('[data-now=end]').click();
  assert.equal(await p.locator('#time-preview').innerText(),'שעת הסיום חייבת להיות אחרי שעת ההתחלה.');
  for(const width of [320,390,1280]){await p.setViewportSize({width,height:844});assert(await p.locator('.end-state button').evaluateAll(es=>es.every(e=>e.scrollWidth<=e.clientWidth)));assert(await p.locator('.wheel-picker').first().evaluate(e=>getComputedStyle(e).direction==='ltr'));}
  await p.setViewportSize({width:390,height:844});await p.locator('#modal').screenshot({path:'/tmp/huck-hebrew-editor.png'});await p.locator('.entry-cancel').click();
  await p.clock.setFixedTime(Date.parse('2026-11-03T22:30:00Z'));await p.locator('[data-end]').click();
  assert((await p.locator('#end-confirmation-label').innerText()).includes('הסתיימה'));
  await p.locator('[data-resume-ended]').click();assert((await p.locator('#modal-body').innerText()).includes('להסיר את שעת הסיום'));await p.locator('.close').click();
  await p.locator('.nap-entry').first().click();assert((await p.locator('#time-preview').innerText()).includes('תנומה'));await p.locator('.entry-cancel').click();
  await p.locator('[data-history-entry]').last().click();assert((await p.locator('#history-details').innerText()).includes('דקות'));
  await p.locator('[data-share]').click();assert.equal(await p.locator('#modal-title').innerText(),'שמירה / שיתוף');assert((await p.locator('#share-url').inputValue()).includes('child=avi'));assert.equal(await p.locator('#share-url').evaluate(e=>getComputedStyle(e).direction),'ltr');await p.mouse.click(1,1);assert(!await p.locator('#modal').isVisible());
  await p.locator('[data-child-help]').click();assert.equal(await p.locator('#modal-title').innerText(),'בחירת ילד');await p.locator('#modal [data-settings]').click();await p.locator('#settings-basic>summary').click();await p.locator('[data-language=en]').click();assert.equal(await p.locator('#modal-title').innerText(),'Settings');assert.equal(await p.locator('html').getAttribute('dir'),'ltr');
  await p.emulateMedia({reducedMotion:'no-preference'});await p.waitForTimeout(50);
  const left=await p.locator('.language-thumb').evaluate(e=>e.getBoundingClientRect().x);await p.locator('[data-language=he]').click();await p.waitForTimeout(70);
  const moving=await p.locator('.language-thumb').evaluate(e=>({x:e.getBoundingClientRect().x,target:document.querySelector('[data-language=he]').getBoundingClientRect().x}));assert(moving.x>left&&moving.x<moving.target,'Highlight glides between language positions');
  await p.waitForTimeout(300);assert(await p.locator('[data-language=he]').evaluate(e=>Math.abs(e.getBoundingClientRect().x-document.querySelector('.language-thumb').getBoundingClientRect().x)<1));
  assert.deepEqual(errors,[]);await c.close();console.log('PASS Hebrew dictionary parity, RTL, language switch/drafts/persistence, all themes/styles/widths, start/end/edit/history/share and validation; no shared-data writes');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
