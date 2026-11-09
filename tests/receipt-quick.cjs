const {chromium}=require('playwright'),assert=require('node:assert/strict'),C=require('../shared/core.js'),{spawn}=require('node:child_process');
const now=Date.parse('2026-11-08T20:00:00Z');
(async()=>{
 const server=spawn(process.execPath,['tools/serve.cjs'],{cwd:require('node:path').resolve(__dirname,'..'),stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error('Test server exited: '+code)));});
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  for(const mode of ['start','end']){
   const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'America/Los_Angeles',reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
   await page.clock.install({time:now});await page.clock.pauseAt(now);
   const state=C.initial();state.entries=mode==='start'?[{id:'previous',childId:'avi',start:now-60*60000,end:now-6*60000,rev:1,deleted:false}]:[{id:'current',childId:'avi',start:now-20*60000,end:null,rev:1,deleted:false}];
   await page.addInitScript(base=>{if(!localStorage.getItem('huck-sample-v1'))localStorage.setItem('huck-sample-v1',JSON.stringify({base,prefs:{motion:false},queue:[]}));},state);
   await page.goto('http://127.0.0.1:5190/?demo=1');await page.locator(`[data-${mode}="0"]`).click();
   const id=await page.evaluate(()=>HuckTest.getState().entries.at(-1).id),field=mode==='start'?'start':'end';
   const saved=()=>page.evaluate(({id,field})=>HuckTest.getState().entries.find(e=>e.id===id)[field],{id,field});
   assert.equal(await page.locator('[data-receipt-minutes]').count(),10);
   if(mode==='start'){assert(await page.locator('[data-receipt-minutes="7"]').isDisabled());assert(await page.locator('[data-receipt-minutes="6"]').isEnabled());}
   const button=await page.locator('[data-receipt-minutes="2"]').elementHandle();await page.clock.runFor(1000);assert(await button.evaluate(el=>el.isConnected),'Ticks do not replace focused buttons');
   for(const theme of ['original','night','berry','mint','midnight'])for(const width of [320,390,1280]){
    await page.setViewportSize({width,height:844});await page.evaluate(t=>document.body.dataset.theme=t,theme);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    assert(await page.locator('#receipt-quick-buttons').evaluate(el=>el.scrollWidth<=el.clientWidth));
   }
   await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.body.dataset.theme='original');
   await page.screenshot({path:`/tmp/huck-quick-${mode}-phone.png`});
   for(const [language,label] of [['es','Hace cuántos minutos'],['he','לפני כמה דקות']]){
    await page.evaluate(lang=>HuckI18n.setLanguage(lang),language);await page.waitForTimeout(30);assert.equal(await page.locator('#receipt-quick-label').innerText(),label);
    assert(!(await page.locator('[data-receipt-minutes="2"]').getAttribute('aria-label')).includes('End ·'));
   }
   await page.evaluate(()=>HuckI18n.setLanguage('en'));
   const expected=await page.evaluate(()=>Date.now()-5*60000);
   await page.locator('[data-receipt-minutes="5"]').click();assert.equal(await saved(),expected);
   assert(!(await page.locator('#end-confirmation').isVisible()),'Successful quick adjustment dismisses the pop-up');
   assert(!(await page.locator('#modal').isVisible()));
   await page.reload();assert.equal(await saved(),expected);assert(!(await page.locator('#end-confirmation').isVisible()));
   assert.deepEqual(errors,[]);await context.close();
  }
  console.log('PASS start/end quick adjustments, immediate dismissal, overlap prevention, save/reload, stable buttons, themes/languages and mobile/desktop fit; no real backend calls');
 }finally{await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
