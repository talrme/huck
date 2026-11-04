const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{for(const style of ['daybook']){
  const c=await browser.newContext({viewport:{width:390,height:844},timezoneId:'America/Los_Angeles'}),p=await c.newPage(),errors=[];let api=0;p.on('pageerror',e=>errors.push(e.message));await p.route('https://script.google.com/**',r=>{api++;return r.abort();});
  const now=Date.parse('2026-11-02T02:00:00Z');await p.clock.install({time:now});await p.clock.pauseAt(now);await p.goto('http://127.0.0.1:5190/?demo=1');
  assert.equal(await p.locator('#today-naps h2').innerText(),'Recent entries');assert.equal(await p.locator('.nap-entry').count(),3);assert.equal(await p.locator('.entry-wake').count(),2);
  await p.locator('[data-cycle-mascot]').click();assert((await p.locator('#timer-art').getAttribute('src')).endsWith('/smile.png'));
  await p.locator('[data-settings]').click();assert.equal(await p.locator('[data-mascot]').count(),8);
  await p.locator('[data-mascot=fox]').click();assert((await p.locator('#timer-art').getAttribute('src')).endsWith('/fox.png'));await p.locator('[data-mascot=teddy]').click();assert.equal(await p.locator('[data-mascot=teddy]').getAttribute('aria-pressed'),'true');
  await p.locator('#modal').screenshot({path:`/tmp/huck-paired-settings-${style}.png`});await p.locator('[data-save-settings]').click();
  for(const theme of ['original','night','berry','mint']){
   await p.locator('[data-settings]').click();await p.locator(`button[data-theme=${theme}]`).click();await p.locator('[data-save-settings]').click();
   assert.equal(await p.locator('body').getAttribute('data-state'),'awake');const awake=await p.locator('[data-start="0"]').evaluate(e=>getComputedStyle(e).backgroundColor);
   for(const width of [320,390,1280]){await p.setViewportSize({width,height:844});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert(await p.locator('.nap-entry').first().evaluate(e=>e.scrollWidth<=e.clientWidth));}
   await p.setViewportSize({width:390,height:844});if(theme==='original'||theme==='night'){await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:`/tmp/huck-awake-${style}-${theme}.png`});}
   await p.locator('[data-start="0"]').click();assert.equal(await p.locator('body').getAttribute('data-state'),'sleep');assert.notEqual(await p.locator('[data-end="0"]').evaluate(e=>getComputedStyle(e).backgroundColor),awake);assert((await p.locator('#timer-art').getAttribute('src')).endsWith('/teddy.png'));
   assert(await p.locator('[data-end="0"]').evaluate(e=>{const s=getComputedStyle(e),l=c=>{const rgb=c.match(/[\d.]+/g).slice(0,3).map(v=>{v=Number(v)/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];},a=l(s.backgroundColor),b=l(s.color);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5;}),'Primary button text contrast');
   for(const width of [320,390,1280]){await p.setViewportSize({width,height:844});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
   await p.setViewportSize({width:390,height:844});if(theme==='original'||theme==='night'){await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:`/tmp/huck-sleep-${style}-${theme}.png`});}
   await p.clock.runFor(60000);await p.locator('[data-end="0"]').click();await p.clock.runFor(1000);
  }
  assert.equal(await p.locator('.wake-block').count(),0);await p.locator('#history-wake').check();assert(await p.locator('.wake-block').count()>0);await p.locator('.wake-block:has(span:not(.sr-only))').last().click();assert((await p.locator('#history-details').innerText()).includes('Wake window'));assert(!(await p.locator('#modal').isVisible()));
  await p.locator('.history-heading').scrollIntoViewIfNeeded();await p.locator('[data-today]').click();await p.screenshot({path:`/tmp/huck-wake-history-${style}.png`});
  await p.reload();assert(await p.locator('#history-wake').isChecked());assert((await p.locator('#timer-art').getAttribute('src')).endsWith('/fox.png'));
  await p.locator('[data-settings]').click();assert.equal(await p.locator('[data-mascot=teddy]').getAttribute('aria-pressed'),'true');assert.equal(await p.locator('[data-mascot=fox]').getAttribute('aria-pressed'),'true');
  assert(await p.locator('img').evaluateAll(images=>images.every(i=>i.complete&&i.naturalWidth>0)));await p.locator('[data-save-settings]').click();
  await p.locator('#history-wake').uncheck();assert.equal(await p.locator('.wake-block').count(),0);
  await p.evaluate(()=>HuckTest.enqueue('add',{id:'overnight-visual',childId:'avi',start:Date.parse('2026-11-01T06:30:00Z'),end:Date.parse('2026-11-01T07:15:00Z')}));await p.locator('[data-history-entry=overnight-visual]').last().click();assert.equal(await p.locator('#history-details .history-detail-body p').innerText(),'11:30 PM – 12:15 AM');assert(!(await p.locator('#history-details').innerText()).includes('2026'));
  assert.equal(api,0);assert.deepEqual(errors,[]);await c.close();console.log('PASS '+style+': paired colors in both states/all themes/widths, immediate mascot selection/cycling/persistence, images, recent gaps, optional selectable wake history, no API writes');
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
