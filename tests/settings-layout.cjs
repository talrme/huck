const {chromium}=require('playwright'),assert=require('node:assert/strict'),C=require('../shared/core.js');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'America/Los_Angeles',reducedMotion:'reduce'}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));const now=Date.parse('2026-11-03T19:00:00Z'),state=C.initial();
  state.entries=[{id:'earlier',start:now-180*60000,end:now-150*60000},{id:'last',start:now-120*60000,end:now-90*60000},{id:'running',start:now-30*60000,end:null}].map(e=>({...e,childId:'avi',rev:1,deleted:false,autoEnded:false,updatedAt:now}));
  await p.clock.setFixedTime(now);await p.addInitScript(state=>localStorage.setItem('huck-sample-v1',JSON.stringify({base:state,queue:[],prefs:{style:'compact',language:'en'}})),state);
  await p.goto('http://127.0.0.1:5190/?demo=1');await p.locator('.preceding-wake .wake-chip').waitFor();
  const chips=await p.evaluate(()=>[...document.querySelectorAll('.wake-chip')].map(el=>{const s=getComputedStyle(el);return {font:s.fontSize,line:s.lineHeight,height:el.getBoundingClientRect().height};}));assert(chips.length>=2);chips.forEach(chip=>assert.deepEqual(chip,chips[0]));
  assert.equal(await p.locator('body').getAttribute('data-style'),'daybook');
  await p.locator('[data-child-help]').click();assert(await p.locator('.modal-footer [data-close]').isVisible());await p.locator('.modal-footer [data-close]').click();assert(!(await p.locator('#modal').isVisible()));
  await p.locator('[data-child-help]').click();await p.locator('#modal [data-settings]').click();assert(await p.locator('#settings-children').evaluate(e=>e.open));assert(await p.locator('#child-select').isVisible());assert(await p.locator('#new-child').isVisible());assert.equal(await p.locator('#settings-advanced #new-child').count(),0);
  await p.locator('#new-child').fill('Practice child');await p.locator('[data-add-child]').click();assert(await p.locator('#settings-children').evaluate(e=>e.open));assert(await p.locator('#settings-children .child-row').filter({hasText:'Practice child'}).isVisible());
  await p.locator('[data-save-settings]').click();await p.locator('[data-settings]').click();assert(await p.locator('#settings-basic').evaluate(e=>e.open));assert.equal(await p.locator('button[data-style]').count(),0);
  assert.equal(await p.locator('#settings-basic .settings-content>fieldset').first().locator('legend').innerText(),'Color theme');assert.equal(await p.locator('.settings-section').count(),6);
  assert(!(await p.locator('#motion').isVisible()));await p.locator('#settings-animations>summary').click();assert(await p.locator('#motion').isVisible());assert(await p.locator('#animation-level').isVisible());assert(await p.locator('#celebrate-hours').isVisible());
  await p.locator('#animation-level').evaluate(el=>{el.value='1';el.dispatchEvent(new Event('input',{bubbles:true}));});assert.equal(await p.locator('#animation-level-name').innerText(),'Gentle');
  for(const language of ['en','es','he'])for(const theme of ['original','night','berry','mint','midnight'])for(const width of [320,390,1280]){
   await p.setViewportSize({width,height:900});await p.locator(`[data-language=${language}]`).click();await p.locator(`button[data-theme=${theme}]`).click();
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert(await p.locator('#modal-body').evaluate(el=>el.scrollWidth<=el.clientWidth));assert.equal(await p.locator('.language-settings legend').innerText(),'Language');
  }
  await p.locator('[data-language=en]').click();await p.locator('button[data-theme=original]').click();await p.setViewportSize({width:390,height:844});
  await p.locator('#settings-animations>summary').click();await p.locator('#modal-body').evaluate(el=>el.scrollTop=0);await p.locator('#settings-basic').evaluate(el=>el.scrollIntoView({block:'start'}));await p.screenshot({path:'/tmp/huck-settings-phone.png'});
  await p.setViewportSize({width:1280,height:900});await p.screenshot({path:'/tmp/huck-settings-desktop.png'});await p.mouse.click(2,2);assert(!(await p.locator('#modal').isVisible()));assert.deepEqual(errors,[]);
  console.log('PASS settings: equal wake chip sizes, retired style preference normalized, explicit Close, child shortcut/unified create/select controls, colors first, six consistent groups, collapsed animation controls, live presets, three languages/five themes/3203901280, backdrop dismissal. Sample data only.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
