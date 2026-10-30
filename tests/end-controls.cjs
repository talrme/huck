const {chromium}=require('playwright'),assert=require('node:assert/strict');
const now=Date.parse('2026-10-30T18:00:00Z');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{for(const style of ['daybook','orbit','compact']){
  const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'America/Los_Angeles',reducedMotion:'reduce'}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));await p.clock.setFixedTime(now);await p.goto('http://127.0.0.1:5190/?demo=1');
  await p.locator('[data-settings]').click();await p.locator(`button[data-style="${style}"]`).click();await p.locator('[data-save-settings]').click();
  await p.evaluate(()=>HuckTest.enqueue('start',{id:crypto.randomUUID(),childId:'avi',start:Date.now()-20*60000}));
  assert.equal(await p.locator('[data-end="0"]').innerText(),'End nap');assert.equal(await p.locator('[data-end="0"] svg').count(),0);assert.equal(await p.locator('.end-shortcuts button').count(),3);
  for(const width of [320,390,1280]){
   await p.setViewportSize({width,height:844});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   assert(await p.locator('.end-shortcuts').evaluate(el=>[...el.querySelectorAll('button>span')].every(span=>{const a=span.getBoundingClientRect(),b=span.parentElement.getBoundingClientRect();return a.left>=b.left&&a.right<=b.right;})));
  }
  await p.setViewportSize({width:390,height:844});await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:`/tmp/huck-end-controls-${style}.png`});
  await p.locator('.end-shortcuts [data-edit]').click();assert(await p.locator('#modal').isVisible());await p.locator('[data-save-entry]').click();
  await p.locator('[data-end="10"]').click();assert.equal(await p.locator('#timer-status').innerText(),'Awake');assert.equal(await p.evaluate(()=>HuckTest.getState().entries.filter(e=>!e.deleted).sort((a,b)=>b.start-a.start)[0].end),now-10*60000);
  await p.clock.setFixedTime(now+15*60000);await p.evaluate(()=>HuckTest.enqueue('start',{id:crypto.randomUUID(),childId:'avi',start:Date.now()-20*60000}));await p.locator('[data-end="5"]').click();assert.equal(await p.evaluate(()=>HuckTest.getState().entries.filter(e=>!e.deleted).sort((a,b)=>b.start-a.start)[0].end),now+10*60000);
  await p.clock.setFixedTime(Date.parse('2026-10-31T04:00:00Z'));await p.evaluate(()=>HuckTest.enqueue('start',{id:crypto.randomUUID(),childId:'avi',start:Date.now()-20*60000}));assert.equal(await p.locator('[data-end="0"]').innerText(),'End sleep');
  assert.deepEqual(errors,[]);console.log(`PASS ${style}: three shortcuts, no square, phone/desktop fit, 5m and 10m endings, manual edit, day/night labels`);await context.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
