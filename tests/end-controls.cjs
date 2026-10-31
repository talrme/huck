const {chromium}=require('playwright'),assert=require('node:assert/strict');
const now=Date.parse('2026-10-30T18:00:00Z');
async function select(p,n){await p.locator('#sleep-delay').evaluate((input,n)=>{input.value=n;input.dispatchEvent(new Event('input',{bubbles:true}));},n);}
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{for(const style of ['daybook','orbit','compact']){
  const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'America/Los_Angeles',reducedMotion:'reduce'}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));await p.clock.setFixedTime(now);await p.goto('http://127.0.0.1:5190/?demo=1');
  await p.locator('[data-settings]').click();await p.locator('button[data-style="'+style+'"]').click();await p.locator('[data-save-settings]').click();
  assert.equal(await p.locator('[data-start="0"]').innerText(),'Start sleep now');assert.equal(await p.locator('#sleep-delay').inputValue(),'3');assert.equal(await p.locator('#delay-clock').innerText(),'10:57 AM');
  const before=await p.evaluate(()=>HuckTest.getState().entries.length);await select(p,7);assert.equal(await p.evaluate(()=>HuckTest.getState().entries.length),before);
  assert.equal(await p.locator('#sleep-delay').getAttribute('min'),'1');await select(p,0);assert.equal(await p.locator('#sleep-delay').inputValue(),'1');assert((await p.locator('#delay-action').innerText()).includes('1m ago'));await select(p,7);
  assert(await p.locator('#sleep-delay').evaluate(input=>{const s=HuckTest.getState();HuckTest.enqueue('settings',{settings:s.settings,expectedRevision:s.revision});return input===document.querySelector('#sleep-delay');}));assert.equal(await p.locator('#sleep-delay').inputValue(),'7');
  await p.locator('[data-delay-apply]').click();const active=await p.evaluate(()=>HuckTest.getState().entries.find(e=>!e.end&&!e.deleted));assert.equal(active.start,now-7*60000);
  assert.equal(await p.locator('.nap-entry[data-edit="'+active.id+'"]').count(),0);assert.equal(await p.locator('[data-end="0"]').innerText(),'End sleep now');assert.equal(await p.locator('#sleep-delay').inputValue(),'3');assert.equal(await p.locator('#sleep-delay').getAttribute('max'),'10');
  await select(p,10);assert.equal(await p.locator('#sleep-delay').inputValue(),'10');assert(await p.locator('[data-delay-apply]').isDisabled());assert.equal(await p.locator('[data-delay-apply] svg').count(),0);await select(p,3);
  for(const width of [320,390,1280]){
   await p.setViewportSize({width,height:844});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   assert(await p.locator('.delay-row').evaluate(el=>[...el.querySelectorAll('strong,small,input')].every(item=>{const a=item.getBoundingClientRect(),b=el.getBoundingClientRect();return a.left>=b.left-1&&a.right<=b.right+1;})));
  }
  await p.setViewportSize({width:390,height:844});await p.evaluate(()=>scrollTo(0,0));await p.waitForTimeout(180);await p.screenshot({path:'/tmp/huck-delay-'+style+'.png'});
  for(const theme of ['night','berry','mint','original']){await p.locator('[data-settings]').click();await p.locator('button[data-theme="'+theme+'"]').click();await p.locator('[data-save-settings]').click();assert(await p.locator('[data-delay-apply]').isVisible());}
  await p.locator('.manual-time').click();assert(await p.locator('#modal').isVisible());assert(await p.locator('#end-fields').isVisible());await p.locator('[data-toggle-end]').click();await p.locator('[data-save-entry]').click();
  await select(p,5);await p.locator('[data-delay-apply]').click();assert.equal(await p.locator('#timer-status').innerText(),'Awake');assert.equal(await p.evaluate(id=>HuckTest.getState().entries.find(e=>e.id===id).end,active.id),now-5*60000);assert.equal(await p.locator('.nap-entry').first().getAttribute('data-edit'),active.id);
  assert.equal(await p.locator('#sleep-delay').getAttribute('max'),'10');
  await p.locator('[data-start="0"]').click();assert.equal(await p.locator('#sleep-delay').getAttribute('max'),'10');assert(await p.locator('#sleep-delay').isEnabled());assert(await p.locator('[data-delay-apply]').isDisabled());assert(await p.locator('#delay-error').isVisible());
  await p.clock.setFixedTime(now+5*60000);await p.waitForFunction(()=>Number(document.querySelector('#sleep-delay').max)>0);await p.locator('[data-end="0"]').click();assert((await p.locator('.nap-entry').first().innerText()).includes('5m'));
  assert.equal(await p.locator('.sleep-transfer').count(),0);assert.deepEqual(errors,[]);console.log('PASS '+style+': slider preview/confirm, default3, boundaries, stable DOM, themes, phone fit, active excluded, saved arrival and reduced motion');await context.close();
 }
 const c=await browser.newContext({viewport:{width:390,height:844},timezoneId:'America/Los_Angeles',reducedMotion:'no-preference'}),p=await c.newPage();await p.clock.setFixedTime(now);await p.goto('http://127.0.0.1:5190/?demo=1');await p.evaluate(()=>HuckTest.enqueue('start',{id:'animation-nap',childId:'avi',start:Date.now()-20*60000}));await p.locator('[data-end="0"]').click();await p.locator('.sleep-transfer').waitFor({state:'attached'});await p.locator('.sleep-transfer').waitFor({state:'detached'});assert.equal(await p.locator('.nap-entry').first().getAttribute('data-edit'),'animation-nap');await c.close();console.log('PASS animation: ghost reaches completed row and removes itself');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
