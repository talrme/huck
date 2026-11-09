const {chromium}=require('playwright'),assert=require('node:assert/strict'),C=require('../shared/core.js'),{spawn}=require('node:child_process');
const now=Date.parse('2026-11-01T20:00:00Z'),W=require('../shared/wake.js');
(async()=>{
 const server=spawn(process.execPath,['tools/serve.cjs'],{cwd:require('node:path').resolve(__dirname,'..'),env:{...process.env,PORT:'5190'},stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(new Error('Test server exited: '+code)));});
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  for(const legacy of [false,true]){
   const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'America/Los_Angeles',reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   // No production backend reads or writes are allowed in this fixture.
   await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
   await page.clock.setFixedTime(now);
   const state=C.initial();state.settings.wakeProfiles={avi:{birthday:'2026-09-18',...(legacy?{ranges:{3:{min:45,max:100}}}:{})}};
   state.entries=[{id:'last',childId:'avi',start:now-110*60000,end:now-65*60000,rev:1,deleted:false}];
   await page.addInitScript(base=>{if(!localStorage.getItem('huck-sample-v1'))localStorage.setItem('huck-sample-v1',JSON.stringify({base,prefs:{wakeInfo:true,motion:false},queue:[]}));},state);
   await page.goto('http://127.0.0.1:5190/?demo=1');
   await page.locator('[data-wake-details]').click();
   assert.equal(await page.locator(`a[href="${W.guideUrl}"]`).count(),1);
   await page.locator('[data-close]').click();
   await page.locator('[data-settings]').first().click();await page.getByText('Wake-window settings',{exact:true}).click();
   assert.equal(await page.locator('[data-wake-age]').count(),legacy?6:7);
   assert.equal(await page.locator('.wake-age-table').getAttribute('data-wake-version'),legacy?'1':'2');
   if(legacy)assert.equal(await page.locator('[data-wake-age="3"] [data-range-max]').inputValue(),'100');
   await page.locator('[data-reset-wake-ranges]').click();assert.equal(await page.locator('[data-wake-age]').count(),7);
   assert.equal(await page.locator('[data-wake-age="2"] [data-range-max]').inputValue(),'75');
   for(const width of [320,390,1280]){
    await page.setViewportSize({width,height:844});assert(await page.locator('#modal').evaluate(e=>e.scrollWidth<=e.clientWidth));
   }
   await page.setViewportSize({width:390,height:844});await page.locator('.wake-age-table').scrollIntoViewIfNeeded();
   await page.screenshot({path:`/tmp/huck-wake-guide-${legacy?'reset':'new'}-phone.png`});
   await page.locator('[data-wake-age="2"] [data-range-max]').fill('85');await page.locator('[data-save-settings]').click();
   await page.reload();await page.locator('[data-settings]').first().click();await page.getByText('Wake-window settings',{exact:true}).click();
   assert.equal(await page.locator('[data-wake-age="2"] [data-range-max]').inputValue(),'85');
   assert.equal(await page.locator('#wake-birthday').inputValue(),'2026-09-18');
   for(const [language,label] of [['es','Guía familiar del sueño · resumen'],['he','מדריך השינה המשפחתי · סקירה']]){
    await page.evaluate(lang=>{HuckI18n.setLanguage(lang);},language);
    await page.waitForTimeout(100);assert.equal(await page.locator(`a[href="${W.guideUrl}"]`).innerText(),label);
   }
   assert.deepEqual(errors,[]);await context.close();
  }
  console.log('PASS guide links, seven defaults, preserved legacy overrides, reset/save/reload, birthday preservation, EN/ES/HE and phone/desktop layout; no live backend calls');
 }finally{await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
