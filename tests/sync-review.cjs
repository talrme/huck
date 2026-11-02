const {chromium}=require('playwright'),assert=require('node:assert/strict'),C=require('../shared/core.js');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}),now=Date.parse('2026-11-01T20:00:00Z');
 try{for(const extraBlocked of [false,true]){
  const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'America/Los_Angeles',reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  let state=C.initial();state.entries=[{id:'original-sleep',childId:'avi',start:now-3600000,end:now-600000,rev:2,deleted:false,autoEnded:false}];
  const rejected={id:'rejected-command',type:'edit',createdAt:now,payload:{id:'original-sleep',childId:'avi',start:now-3600000,end:null,expectedRev:1},blocked:'This sleep changed on another phone. Close and reopen it before editing.'};
  const later={id:'later-command',type:'child',createdAt:now,payload:{id:'test-child',name:'Test'},...(extraBlocked?{blocked:'Child already exists.'}:{})};
  await page.addInitScript(({base,queue})=>localStorage.setItem('huck-v1',JSON.stringify({base,queue,prefs:{motion:false}})),{base:state,queue:[rejected,later]});
  await page.route('**/config.js',r=>r.fulfill({contentType:'text/javascript',body:'window.HUCK_CONFIG={backendUrl:"https://huck-review.invalid/exec",sheetUrl:"https://example.invalid"};'}));
  await page.route('https://huck-review.invalid/**',async r=>{const u=new URL(r.request().url());if(u.searchParams.get('action')==='command')state=C.apply(state,JSON.parse(u.searchParams.get('payload')),now);await r.fulfill({contentType:'text/javascript',body:`${u.searchParams.get('callback')}(${JSON.stringify({ok:true,state})});`});});
  await page.clock.setFixedTime(now);await page.goto('http://127.0.0.1:5190/');await page.locator('.nap-entry').first().click();await page.locator('[data-end-state=running]').click();await page.locator('[data-save-entry]').click();
  assert(await page.locator('#modal-notice').isVisible());assert((await page.locator('#modal-notice').innerText()).includes('changed on another phone'));assert.equal(await page.locator('#modal-notice [data-discard]').getAttribute('data-discard'),rejected.id);
  if(!extraBlocked)await page.screenshot({path:'/tmp/huck-inline-sync-review.png'});
  await page.locator('#modal-notice [data-discard]').click();assert(await page.locator('#modal').isVisible());assert.equal(await page.locator('[data-end-state=running]').getAttribute('aria-pressed'),'true','Keep current still-sleeping draft');
  const backup=await page.evaluate(()=>JSON.parse(localStorage.getItem('huck-discarded-changes-v1')));assert.equal(backup.length,1);assert.deepEqual(backup[0].command,rejected);
  if(extraBlocked){
   assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('huck-v1')).queue.map(c=>c.id)),[later.id],'Discard only the reviewed command, not all blocked changes');
   await page.locator('.entry-cancel').click();await page.locator('#review').click();assert.equal(await page.locator('#modal-footer [data-discard]').getAttribute('data-discard'),later.id);await page.locator('#modal-footer [data-discard]').click();assert(!(await page.locator('#modal').isVisible()));
  }else{
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('huck-v1')).queue.length===0);assert(state.children.some(c=>c.id==='test-child'),'Unrelated pending command still syncs');
   await page.locator('[data-save-entry]').click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('huck-v1')).queue.length===0);assert.equal(state.entries[0].end,null,'Current still-sleeping draft can save after resolving conflict');
  }
  assert.deepEqual(errors,[]);await context.close();console.log('PASS sync review: '+(extraBlocked?'only one rejected change removed, standalone review closes':'visible actual reason, draft kept, backup saved, other commands sync, still-sleeping save succeeds'));
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
