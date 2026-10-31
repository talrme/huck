const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const c=await browser.newContext({viewport:{width:390,height:844},timezoneId:'America/Los_Angeles',reducedMotion:'reduce'}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('http://127.0.0.1:5190/?demo=1');await p.waitForFunction(()=>window.HuckTest);assert.equal(await p.evaluate(()=>history.scrollRestoration),'manual');
  async function bottom(){await p.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));await p.waitForFunction(()=>scrollY>100);}
  async function top(){await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await p.waitForFunction(()=>scrollY===0);}
  await bottom();await p.reload();await top();
  await bottom();await p.evaluate(()=>dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));await top();
  await bottom();await p.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await top();
  await bottom();await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});assert(await p.evaluate(()=>scrollY>100));await p.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await top();
  // An ordinary focus or sync must not yank the reader back up.
  await bottom();const y=await p.evaluate(()=>scrollY);await p.evaluate(()=>{dispatchEvent(new Event('focus'));HuckTest.sync();});await p.waitForTimeout(200);assert.equal(await p.evaluate(()=>scrollY),y);
  // Real back navigation must not restore the previous bottom position.
  await p.goto('http://127.0.0.1:5190/README.md');await p.goBack();await top();
  await p.locator('[data-add]').click();await p.waitForFunction(()=>document.querySelectorAll('.time-wheel').length===8);const draft=await p.locator('#start-time').inputValue();await p.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));assert(await p.locator('#modal').isVisible());assert.equal(await p.locator('#start-time').inputValue(),draft);await p.locator('.entry-cancel').click();
  await p.screenshot({path:'/tmp/huck-reopened-top.png'});const header=await p.locator('.topbar').boundingBox();assert(header.y>=0&&header.y<844);assert.deepEqual(errors,[]);await c.close();
  console.log('PASS reopen scroll: reload, bfcache event, foreground return, real back navigation, normal focus/sync preserves scroll, modal draft preserved');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
