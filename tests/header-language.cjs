const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'America/Los_Angeles',reducedMotion:'reduce'}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));await p.clock.setFixedTime(Date.parse('2026-11-03T22:00:00Z'));
  await p.goto('http://127.0.0.1:5190/?demo=1');
  assert(await p.locator('.brand-icon').evaluate(e=>e.complete&&e.naturalWidth===192));
  assert(await p.locator('.topbar').evaluate(e=>e.getBoundingClientRect().height<=46));
  await p.locator('[data-child-help]').click();assert(await p.locator('#modal-body').innerText().then(s=>s.includes('open Settings')));
  await p.locator('#modal [data-settings]').click();await p.locator('#settings-basic>summary').click();
  const stateBefore=await p.evaluate(()=>JSON.stringify(HuckTest.getState()));
  await p.locator('[data-language=es]').click();
  await p.waitForFunction(()=>document.documentElement.lang==='es');
  assert.equal(await p.locator('#modal-title').innerText(),'Ajustes');
  assert.equal(await p.locator('#child-select').inputValue(),'avi');
  assert.equal(await p.evaluate(()=>JSON.stringify(HuckTest.getState())),stateBefore,'Language cannot change shared records');
  const reducerErrors=[...require('node:fs').readFileSync(require('node:path').join(__dirname,'../shared/core.js'),'utf8').matchAll(/throw Error\('([^']+)'\)/g)].map(m=>m[1]);
  assert.deepEqual(await p.evaluate(messages=>messages.filter(s=>HuckI18n.translate(s)===s),reducerErrors),[],'All reducer validation messages translated');
  const unknown=await p.locator('#modal-body').evaluate(root=>HuckI18n.untranslated(root).filter(s=>!/^\d/.test(s)&&!['Koala','Original'].includes(s)));assert.deepEqual(unknown,[],'All settings text has Spanish coverage');
  for(const style of ['daybook'])for(const theme of ['original','night','berry','mint','midnight'])for(const width of [320,390,1280]){
   await p.setViewportSize({width,height:844});await p.locator(`button[data-theme=${theme}]`).click();
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   assert(await p.locator('.swatches').evaluate(e=>e.scrollWidth<=e.clientWidth));
   for(const dark of ['night','midnight'])assert(await p.locator(`button[data-theme=${dark}]`).evaluate(e=>{const c=getComputedStyle(e),fill=getComputedStyle(e.firstElementChild);return c.borderTopColor==='rgb(0, 0, 0)'&&c.backgroundColor==='rgb(0, 0, 0)'&&fill.backgroundImage.includes('rgb(0, 0, 0)');}),'Dark swatches have full black surrounds and dividers, whether selected or not');
  }
  await p.setViewportSize({width:390,height:844});await p.locator('[data-save-settings]').click();
  assert.equal(await p.locator('#timer-status').innerText(),'Despierto');
  await p.locator('[data-start]').click();assert(await p.locator('.preceding-wake').isVisible());
  assert((await p.locator('.preceding-wake').innerText()).includes('Tiempo despierto'));
  for(const style of ['daybook'])for(const theme of ['original','night','berry','mint','midnight'])for(const width of [320,390,1280]){
   await p.setViewportSize({width,height:844});await p.evaluate(({style,theme})=>{document.body.dataset.style=style;document.body.dataset.theme=theme;},{style,theme});
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   assert(await p.locator('#actions .primary').evaluate(e=>{const c=getComputedStyle(e),rgb=s=>s.match(/[\d.]+/g).slice(0,3).map(Number),lum=s=>rgb(s).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0),a=lum(c.color),b=lum(c.backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5;}),'Primary action contrast');
  }
  await p.evaluate(()=>{document.body.dataset.style='daybook';document.body.dataset.theme='midnight';});await p.setViewportSize({width:390,height:844});await p.screenshot({path:'/tmp/huck-active-spanish.png'});
  await p.locator('#timer-detail [data-edit]').click();assert.equal(await p.locator('[data-toggle-start]').getAttribute('aria-expanded'),'true');
  assert.equal(await p.locator('#modal-title').innerText(),'Editar siesta');
  await p.locator('[data-end-state=ended]').click();await p.locator('[data-now=end]').click();
  assert.equal(await p.locator('[data-now=end]').innerText(),'Ahora');
  for(const width of [320,390,1280]){await p.setViewportSize({width,height:844});assert(await p.locator('.end-state button').evaluateAll(es=>es.every(e=>e.scrollWidth<=e.clientWidth)),'Spanish status labels must fit');}
  await p.setViewportSize({width:390,height:844});
  await p.locator('#modal').screenshot({path:'/tmp/huck-spanish-editor.png'});
  await p.locator('.entry-cancel').click();await p.locator('[data-end]').click();
  assert((await p.locator('#end-confirmation-label').innerText()).includes('terminada'));
  await p.locator('[data-resume-ended]').click();assert((await p.locator('#modal-body').innerText()).startsWith('¿Quitar'));
  await p.locator('.close').click();
  await p.locator('[data-share]').click();assert.equal(await p.locator('#modal-title').innerText(),'Guardar / Compartir');assert((await p.locator('#share-url').inputValue()).includes('child=avi'));
  await p.mouse.click(2,2);assert(!await p.locator('#modal').isVisible());
  await p.locator('[data-settings]').click();await p.locator('[data-language=en]').click();assert.equal(await p.locator('#modal-title').innerText(),'Settings');
  await p.locator('[data-language=es]').click();await p.locator('[data-save-settings]').click();await p.reload();assert.equal(await p.locator('html').getAttribute('lang'),'es');
  assert.equal(await p.locator('#child-name').innerText(),'Avi');
  await p.evaluate(()=>{const s=HuckTest.getState(),t=Date.now(),start=HuckTest.wallTime(HuckTest.periodDate(t));s.entries.push({id:'split',childId:'avi',start:start-3600000,end:start+3600000,rev:1,deleted:false});localStorage.setItem('huck-sample-v1',JSON.stringify({base:s,prefs:{language:'es',theme:'midnight'}}));});
  await p.reload();const segments=p.locator('[data-history-entry=split]');assert.equal(await segments.count(),2);assert(await p.locator('.continues-before').count());assert(await p.locator('.continues-after').count());
  await segments.last().click();assert.equal(await p.locator('[data-history-entry=split][aria-pressed=true]').count(),2);
  await p.evaluate(()=>window.scrollTo(0,0));await p.screenshot({path:'/tmp/huck-spanish-phone.png'});
  await p.setViewportSize({width:1280,height:900});await p.screenshot({path:'/tmp/huck-spanish-desktop.png'});
  assert.deepEqual(errors,[]);await context.close();console.log('PASS compact header, koala, child help, Spanish workflows/persistence, five palettes, split selection, mobile/desktop');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
