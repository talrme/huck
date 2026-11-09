const {chromium}=require('playwright'),assert=require('node:assert/strict'),C=require('../shared/core.js'),{spawn}=require('node:child_process');
(async()=>{
 const server=spawn(process.execPath,['tools/serve.cjs'],{cwd:require('node:path').resolve(__dirname,'..'),stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error('Test server exited: '+code)));});
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'America/Los_Angeles',reducedMotion:'no-preference'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  await page.addInitScript(base=>localStorage.setItem('huck-sample-v1',JSON.stringify({base,prefs:{motion:true},queue:[]})),C.initial());
  await page.goto('http://127.0.0.1:5190/?demo=1');
  async function measure(action){
   return page.evaluate(async action=>{
    const box=document.querySelector('#end-confirmation'),samples=[];
    document.querySelector(action).click();const until=performance.now()+420;
    do{samples.push({height:box.getBoundingClientRect().height,y:document.querySelector('#today-naps').getBoundingClientRect().y});await new Promise(requestAnimationFrame);}while(performance.now()<until);
    return samples;
   },action);
  }
  const opened=await measure('[data-start="0"]'),full=opened.at(-1).height;
  assert(full>120);assert(opened[0].height<full/2);
  assert(new Set(opened.map(v=>Math.round(v.height))).size>4,'Opening has intermediate layout heights');
  await page.hover('#receipt-quick-label');await page.waitForTimeout(350);
  assert(Math.abs(await page.locator('#end-confirmation').evaluate(e=>e.getBoundingClientRect().height)-full)<1,'Hover does not freeze opening');
  await page.screenshot({path:'/tmp/huck-receipt-spacing-phone.png'});
  const closed=await measure('[data-receipt-minutes="3"]');
  assert(new Set(closed.map(v=>Math.round(v.height))).size>4,'Closing has intermediate layout heights');
  assert(new Set(closed.map(v=>Math.round(v.y))).size>4,'Following content moves continuously');
  assert.equal(closed.at(-1).height,0);assert(await page.locator('#end-confirmation').evaluate(e=>e.hidden&&!e.inert));
  await measure('[data-end="0"]');
  // A new receipt during an outgoing transition must not be hidden by the old completion.
  await page.evaluate(()=>{document.querySelector('[data-dismiss-ended]').click();document.querySelector('[data-start="0"]').click();});
  await page.waitForTimeout(450);assert(await page.locator('#end-confirmation').isVisible());assert.match(await page.locator('#end-confirmation-label').innerText(),/^(Nap|Sleep) started at$/);
  await page.evaluate(()=>document.querySelector('[data-dismiss-ended]').click());await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(350);
  assert(await page.locator('#end-confirmation').evaluate(e=>e.hidden&&!e.inert));assert.deepEqual(errors,[]);
  await context.close();console.log('PASS smooth height/margin opening and closing, continuously moving content, hover safety, interrupted transitions and reduced-motion cleanup; sample data only');
 }finally{await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
