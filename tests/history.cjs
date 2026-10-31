const {chromium}=require('playwright'),assert=require('node:assert/strict'),C=require('../shared/core.js');
const now=Date.parse('2026-10-30T18:00:00Z'),day=86400000;
function fixture(count){const s=C.initial();for(let i=0;i<count;i++)s.entries.push({id:'past-'+i,childId:'avi',start:now-i*day-3*3600000,end:now-i*day-2*3600000,rev:1,deleted:false,autoEnded:false});s.entries.push({id:'active',childId:'avi',start:now-30*60000,end:null,rev:1,deleted:false,autoEnded:false});return s;}
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  async function open(state=fixture(75),width=390){
   const c=await browser.newContext({viewport:{width,height:844},timezoneId:'America/Los_Angeles',reducedMotion:'reduce'}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.clock.setFixedTime(now);
   await p.addInitScript(state=>localStorage.setItem('huck-v1',JSON.stringify({base:state,queue:[],prefs:{motion:false}})),state);
   let apiCalls=0;await p.route('**/config.js',r=>r.fulfill({contentType:'text/javascript',body:'window.HUCK_CONFIG={backendUrl:"",sheetUrl:"https://example.invalid"};'}));await p.route('**/macros/**',r=>{apiCalls++;return r.abort();});
   await p.goto('http://127.0.0.1:5190/');await p.locator('.day-column').first().waitFor();return {c,p,errors,calls:()=>apiCalls};
  }
  const {c,p,errors,calls}=await open();
  assert.equal(await p.locator('.day-column').count(),30);assert.equal(await p.locator('.older-column').count(),1);assert.equal(await p.locator('.night-key').count(),0);
  assert(await p.locator('#chart-scroll').evaluate(e=>e.scrollLeft+e.clientWidth>=e.scrollWidth-5));
  await p.locator('[data-history-entry="active"]').click();assert(!(await p.locator('#modal').isVisible()));assert(await p.locator('#history-details').isVisible());assert((await p.locator('#history-details').innerText()).includes('30 minutes'));assert((await p.locator('#history-details').innerText()).includes('In progress'));assert.equal(await p.locator('.running').getAttribute('aria-pressed'),'true');
  await p.locator('#history-details [data-edit]').click();assert(await p.locator('#modal').isVisible());await p.locator('[data-save-entry]').click();
  await p.locator('[data-history-entry="past-0"]').click();assert((await p.locator('#history-details').innerText()).includes('1 hour'));assert(!(await p.locator('#modal').isVisible()));await p.locator('[data-clear-history]').click();assert(!(await p.locator('#history-details').isVisible()));assert.equal(await p.locator('.sleep-block[aria-pressed=true]').count(),0);
  // A prepend preserves the same visible content rather than jumping to another day.
  await p.locator('#chart-scroll').evaluate(e=>e.scrollLeft=300);await p.waitForTimeout(80);
  const anchor=await p.locator('.day-column').first().evaluate(e=>e.getBoundingClientRect().x);
  await p.evaluate(()=>document.querySelector('[data-older]').click());assert.equal(await p.locator('.day-column').count(),60);
  const oldAnchor=await p.locator('.day-column').nth(30).evaluate(e=>e.getBoundingClientRect().x);assert(Math.abs(anchor-oldAnchor)<2,'Prepending should preserve chart position');
  await p.locator('#chart-scroll').evaluate(e=>e.scrollLeft=0);await p.waitForFunction(()=>document.querySelectorAll('.day-column').length===75);assert.equal(await p.locator('[data-older]').count(),0);assert.equal(await p.locator('.day-column').first().getAttribute('data-date'),'2026-08-17');assert.equal(calls(),0);
  await p.locator('[data-today]').click();
  for(const style of ['daybook','orbit','compact'])for(const theme of ['original','night','berry','mint']){
   await p.locator('[data-settings]').click();await p.locator(`button[data-style="${style}"]`).click();await p.locator(`button[data-theme="${theme}"]`).click();await p.locator('[data-save-settings]').click();
   const colors=await p.evaluate(()=>{const a=getComputedStyle(document.querySelector('.running')),b=getComputedStyle(document.querySelector('.is-today .sleep-block:not(.running)'));return [a.backgroundColor,b.backgroundColor,a.color];});assert.notEqual(colors[0],colors[1]);assert.notEqual(colors[0],colors[2]);
   await p.locator('.running').click();
   for(const width of [320,390,1280]){await p.setViewportSize({width,height:900});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const box=await p.locator('#history-details').boundingBox();assert(box.x>=0&&box.x+box.width<=width);}
   await p.setViewportSize({width:390,height:844});await p.locator('[data-today]').click();await p.locator('.history-heading').scrollIntoViewIfNeeded();await p.evaluate(()=>scrollTo(0,document.querySelector('.history-heading').getBoundingClientRect().top+scrollY-12));await p.waitForTimeout(150);if(style==='daybook')await p.screenshot({path:`/tmp/huck-history-${theme}.png`});
  }
  assert.deepEqual(errors,[]);await c.close();
  // Short and empty histories need no pagination controls; cross-boundary segments share details.
  const split=fixture(10);split.entries.push({id:'split',childId:'avi',start:Date.parse('2026-10-29T13:30:00Z'),end:Date.parse('2026-10-29T14:30:00Z'),rev:1,deleted:false,autoEnded:false});
  const short=await open(split);assert.equal(await short.p.locator('.day-column').count(),10);assert.equal(await short.p.locator('[data-older]').count(),0);assert.equal(await short.p.locator('[data-history-entry="split"]').count(),2);await short.p.locator('[data-history-entry="split"]').last().click();assert.equal(await short.p.locator('[data-history-entry="split"][aria-pressed=true]').count(),2);assert((await short.p.locator('#history-details').innerText()).includes('6:30 AM'));await short.c.close();
  const empty=await open(C.initial());assert.equal(await empty.p.locator('.day-column').count(),7);assert.equal(await empty.p.locator('[data-older]').count(),0);assert(!(await empty.p.locator('#history-details').isVisible()));await empty.c.close();
  console.log('PASS history: tap details then edit, active colors, selection, 75-day progressive scroll/anchor, split records, empty history, 3 styles/4 colors/3 widths, no API writes');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
