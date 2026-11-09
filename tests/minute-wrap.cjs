const {chromium}=require('playwright'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),C=require('../shared/core.js');
(async()=>{
 const server=spawn(process.execPath,['tools/serve.cjs'],{cwd:require('node:path').resolve(__dirname,'..'),stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error('Server exited '+code)));});
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'America/Los_Angeles',hasTouch:true}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  await page.clock.setFixedTime(Date.parse('2026-11-09T20:00:00Z'));
  await page.addInitScript(base=>localStorage.setItem('huck-sample-v1',JSON.stringify({base,prefs:{motion:false},queue:[]})),C.initial());
  await page.goto('http://127.0.0.1:5190/?demo=1');await page.locator('[data-add]').click();
  if(await page.locator('#start-fields').isHidden())await page.locator('[data-toggle-start]').click();
  for(const prefix of ['start','end']){
   const wheel=page.locator(`[data-time-field=${prefix}] [data-wheel=minute]`),input=page.locator(`#${prefix}-time`);
   const select=async row=>{await wheel.evaluate((el,row)=>{el.scrollTop=row*36;el.dispatchEvent(new Event('scroll'));},row);};
   await select(120);const hour=(await input.inputValue()).slice(0,2);
   await wheel.focus();await page.keyboard.press('ArrowUp');assert.equal(await input.inputValue(),hour+':59');assert.equal(await wheel.getAttribute('aria-valuenow'),'59');
   await page.keyboard.press('ArrowDown');assert.equal(await input.inputValue(),hour+':00');
   await page.keyboard.press('PageUp');assert.equal(await input.inputValue(),hour+':55');
   await page.keyboard.press('PageDown');assert.equal(await input.inputValue(),hour+':00');
   await page.keyboard.press('End');assert.equal(await input.inputValue(),hour+':59');await page.keyboard.press('Home');assert.equal(await input.inputValue(),hour+':00');
   for(let i=0;i<125;i++)await page.keyboard.press('ArrowUp');assert.equal(await input.inputValue(),hour+':55','Multiple full rotations never hit a stop');
   await select(299);assert.equal(await input.inputValue(),hour+':59');assert.equal(await wheel.evaluate(e=>Math.round(e.scrollTop/36)),179,'Bottom copy recenters');
   await select(0);assert.equal(await input.inputValue(),hour+':00');assert.equal(await wheel.evaluate(e=>Math.round(e.scrollTop/36)),120,'Top copy recenters');
   await wheel.scrollIntoViewIfNeeded();const box=await wheel.boundingBox(),cdp=await context.newCDPSession(page),x=box.x+box.width/2,y=box.y+box.height/2;
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+i*6}]});await page.waitForTimeout(20);}
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(500);await cdp.detach();
   assert(Number((await input.inputValue()).slice(3))>45,'Touch scroll passes zero into the previous minute cycle');assert.equal((await input.inputValue()).slice(0,2),hour);
  }
  for(const width of [320,390,1280]){await page.setViewportSize({width,height:844});assert(await page.locator('#modal').evaluate(e=>e.scrollWidth<=e.clientWidth));}
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/huck-looping-minutes-phone.png'});
  await page.locator('.entry-cancel').click();assert.equal(await page.evaluate(()=>HuckTest.getState().entries.length),0,'Cancel still discards edits');
  assert.deepEqual(errors,[]);await context.close();console.log('PASS start/end looping minutes: both boundaries, repeated rotations, touch scrolling, keyboard/Home/End, recentering, unchanged hour, cancel and responsive layout; no live backend calls');
 }finally{await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
