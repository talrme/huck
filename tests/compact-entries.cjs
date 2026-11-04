const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{for(const style of ['daybook']){
  const c=await browser.newContext({viewport:{width:390,height:844},timezoneId:'America/Los_Angeles',reducedMotion:'reduce'}),p=await c.newPage();await p.clock.setFixedTime(Date.parse('2026-11-02T02:00:00Z'));await p.goto('http://127.0.0.1:5190/?demo=1');
  await p.locator('[data-settings]').click();await p.locator('[data-save-settings]').click();
  assert.equal(await p.locator('.nap-entry svg,.nap-kind,.entry-glyph').count(),0);
  for(const theme of ['original','night','berry','mint'])for(const width of [320,390,1280]){
   await p.setViewportSize({width,height:844});await p.evaluate(theme=>document.body.dataset.theme=theme,theme);
   assert(await p.locator('.nap-entry').evaluateAll(es=>es.every(e=>{const r=e.getBoundingClientRect();return r.height>=44&&r.height<=46&&e.scrollWidth<=e.clientWidth;})));
   assert(await p.locator('.wake-chip').first().evaluate(e=>{const r=e.getBoundingClientRect(),upper=e.parentElement.previousElementSibling.getBoundingClientRect(),lower=e.parentElement.nextElementSibling.getBoundingClientRect();return r.top<upper.bottom&&r.bottom>lower.top;}),'Wake chip overlaps both neighboring tiles');
   assert(await p.locator('.recent-tools').evaluate(e=>{const [a,b]=e.children;return Math.abs(a.getBoundingClientRect().y-b.getBoundingClientRect().y)<2;}));assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  await p.setViewportSize({width:390,height:844});await p.locator('#today-naps').screenshot({path:`/tmp/huck-compact-entries-${style}.png`});
  const before=await p.locator('.nap-entry').count();await p.locator('[data-more-naps]').click();assert(await p.locator('.nap-entry').count()>before);await p.locator('[data-more-naps]').click();assert.equal(await p.locator('.nap-entry').count(),before);
  await p.locator('.nap-entry').first().click();assert(await p.locator('#modal').isVisible());await p.locator('.entry-cancel').click();await p.locator('[data-add]').click();assert(await p.locator('#modal').isVisible());await c.close();console.log('PASS '+style+': 44px tiles, overlapping wake chips, one-row footer, no row icons/nouns, themes/widths, edit/expand/add');
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
