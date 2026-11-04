const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const URL='http://127.0.0.1:5190/staging/firebase/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const environment='test-'+Date.now(),storageKey='huck-firestore-'+environment,contexts=[],errors=[],timings=[];
 async function context(){
  const c=await browser.newContext({viewport:{width:390,height:844},timezoneId:'America/Los_Angeles',reducedMotion:'reduce'});contexts.push(c);
  const config=fs.readFileSync(path.join(__dirname,'../staging/firebase/config.js'),'utf8')+`\nHUCK_CONFIG.environment=${JSON.stringify(environment)};HUCK_CONFIG.storageKey=${JSON.stringify(storageKey)};`;
  await c.route('**/staging/firebase/config.js',r=>r.fulfill({contentType:'application/javascript',body:config}));
  await c.route('**/script.google.com/**',r=>{errors.push('Unexpected Sheets request');return r.abort();});
  const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(URL);
  await p.waitForFunction(()=>document.querySelector('#connection')?.textContent.startsWith('Synced '),null,{timeout:45000});return {c,p};
 }
 try{
  const a=await context(),b=await context();
  await a.p.evaluate(()=>localStorage.setItem('huck-v1','production-sentinel'));
  assert.equal(await a.p.locator('#child-name').innerText(),'Test baby');
  assert((await a.p.locator('#sample-note').innerText()).includes('shared test data'));
  await a.p.evaluate(()=>HuckFirestore.seedSamples());
  for(const p of [a.p,b.p])await p.waitForFunction(()=>HuckTest.getState().entries.length===84);
  const started=Date.now();await a.p.locator('[data-start]').click();
  await b.p.waitForFunction(()=>HuckCore.active(HuckTest.getState(),'avi'));
  timings.push({action:'start',secondDeviceMs:Date.now()-started});
  await a.p.waitForFunction(key=>!JSON.parse(localStorage.getItem(key)).queue.length,storageKey);
  const activeId=await b.p.evaluate(()=>HuckCore.active(HuckTest.getState(),'avi').id);
  const ended=Date.now();await b.p.locator('[data-end]').click();await a.p.waitForFunction(()=>!HuckCore.active(HuckTest.getState(),'avi'));
  timings.push({action:'end',secondDeviceMs:Date.now()-ended});
  await b.p.waitForFunction(key=>!JSON.parse(localStorage.getItem(key)).queue.length,storageKey);
  await a.p.reload();await a.p.waitForFunction(()=>document.querySelector('#connection')?.textContent.startsWith('Synced '));
  assert(await a.p.evaluate(id=>HuckTest.getState().entries.find(e=>e.id===id).end,activeId));
  assert.equal(await a.p.evaluate(()=>localStorage.getItem('huck-v1')),'production-sentinel');
  await a.p.locator('.nap-entry').first().click();await a.p.locator('[data-now=end]').click();await a.p.locator('[data-save-entry]').click();
  await a.p.waitForFunction(key=>!JSON.parse(localStorage.getItem(key)).queue.length,storageKey);
  // Both devices start together. The transaction/revision barrier must accept exactly one.
  await Promise.all([a.p.locator('[data-start]').click(),b.p.locator('[data-start]').click()]);
  for(const p of [a.p,b.p])await p.waitForFunction(key=>{const q=JSON.parse(localStorage.getItem(key)).queue;return !q.length||q.some(c=>c.blocked);},storageKey,{timeout:45000});
  await a.p.evaluate(()=>HuckTest.sync(true));await b.p.evaluate(()=>HuckTest.sync(true));
  for(const p of [a.p,b.p]){
   assert.equal(await p.evaluate(()=>HuckTest.getState().entries.filter(e=>!e.end&&!e.deleted).length),1);
   if(await p.locator('[data-review]').isVisible()){await p.locator('[data-review]').click();await p.locator('[data-discard]').click();}
  }
  await a.p.locator('[data-end]').click();for(const p of [a.p,b.p])await p.waitForFunction(()=>!HuckCore.active(HuckTest.getState(),'avi'));
  await a.p.waitForFunction(key=>!JSON.parse(localStorage.getItem(key)).queue.length,storageKey);
  // Concurrent delivery of one stable request ID must create only one child.
  const duplicate=await a.p.evaluate(async()=>{const cmd={id:crypto.randomUUID(),type:'child',createdAt:Date.now(),payload:{id:'retry-test',name:'Retry test'}};const results=await Promise.all([HuckFirestore.request('command',cmd),HuckFirestore.request('command',cmd)]);return results.map(r=>({ok:r.ok,count:r.state.children.filter(c=>c.id==='retry-test').length}));});
  assert(duplicate.every(r=>r.ok&&r.count===1));
  await a.p.evaluate(async()=>{await HuckFirestore.request('command',{id:crypto.randomUUID(),type:'child',createdAt:Date.now(),payload:{id:'expiry-test',name:'Expiry test'}});await HuckFirestore.request('command',{id:crypto.randomUUID(),type:'start',createdAt:Date.now(),payload:{id:'expired-timer',childId:'expiry-test',start:Date.now()-25*3600000}});});
  await a.p.waitForFunction(()=>HuckTest.getState().children.some(c=>c.id==='expiry-test'));
  await a.p.evaluate(()=>{const s=HuckTest.getState();return HuckTest.enqueue('settings',{settings:{...s.settings,dayReplace:91},expectedRevision:s.revision});});
  await a.p.waitForFunction(key=>!JSON.parse(localStorage.getItem(key)).queue.length,storageKey);
  assert(await a.p.evaluate(async()=>{const r=await HuckFirestore.request('snapshot');return r.state.settings.dayReplace===91&&r.state.entries.find(e=>e.id==='expired-timer').autoEnded;}),'Expired timers cannot permanently block shared settings');
  await a.c.setOffline(true);await a.p.evaluate(()=>HuckTest.enqueue('child',{id:'offline-test',name:'Offline test'}));
  assert.equal(await a.p.evaluate(key=>JSON.parse(localStorage.getItem(key)).queue.length,storageKey),1);
  await a.p.close();await a.c.setOffline(false);a.p=await a.c.newPage();a.p.on('pageerror',e=>errors.push(e.message));await a.p.goto(URL);
  await a.p.waitForFunction(key=>{const s=JSON.parse(localStorage.getItem(key)||'{}');return s.base?.children.some(c=>c.id==='offline-test')&&!s.queue.length;},storageKey,{timeout:45000});
  await b.p.waitForFunction(()=>HuckTest.getState().children.some(c=>c.id==='offline-test'));
  // Exercise the actual UI against the disposable live backend, not a mock.
  const acknowledged=()=>a.p.waitForFunction(key=>!JSON.parse(localStorage.getItem(key)).queue.length,storageKey);
  await a.p.locator('[data-settings]').click();await a.p.locator('#settings-children>summary').click();
  await a.p.locator('#new-child').fill('UI test');await a.p.locator('[data-add-child]').click();await acknowledged();
  const uiChild=await a.p.evaluate(()=>HuckTest.getState().children.find(c=>c.name==='UI test').id);
  await a.p.locator('#child-select').selectOption(uiChild);await a.p.getByText('Wake-window settings',{exact:true}).click();
  await a.p.locator('#wake-birthday').fill('2026-09-14');await a.p.locator('[data-wake-age="3"] [data-range-max]').fill('125');
  await a.p.locator('[data-save-settings]').click();await acknowledged();
  await b.p.waitForFunction(id=>HuckTest.getState().settings.wakeProfiles?.[id]?.ranges?.[3]?.max===125,uiChild);
  await a.p.locator('[data-add]').click();await a.p.locator('[data-save-entry]').click();await acknowledged();
  const uiEntry=await a.p.evaluate(id=>HuckTest.getState().entries.find(e=>e.childId===id),uiChild);
  assert(uiEntry.end);await a.p.locator('.nap-entry').first().click();await a.p.locator('[data-end-state=running]').click();
  await a.p.locator('.entry-cancel').click();assert(!(await a.p.locator('#modal').isVisible()));
  assert(await a.p.evaluate(id=>Boolean(HuckTest.getState().entries.find(e=>e.id===id).end),uiEntry.id),'Cancel must not resume a completed sleep');
  await a.p.locator('.nap-entry').first().click();await a.p.locator('[data-end-state=running]').click();await a.p.locator('[data-save-entry]').click();await acknowledged();
  await b.p.waitForFunction(id=>Boolean(HuckCore.active(HuckTest.getState(),id)),uiChild);
  await a.p.locator('[data-end]').click();await acknowledged();
  await a.p.locator('.nap-entry').first().click();await a.p.locator('[data-delete-entry]').click();await a.p.locator('[data-confirm-delete]').click();await acknowledged();
  await b.p.waitForFunction(id=>HuckTest.getState().entries.find(e=>e.id===id)?.deleted,uiEntry.id);
  await a.p.locator('[data-settings]').click();await a.p.locator('#settings-children>summary').click();
  await a.p.locator(`[data-archive="${uiChild}"]`).click();await a.p.locator('[data-confirm-archive]').click();await acknowledged();
  await b.p.waitForFunction(id=>HuckTest.getState().children.find(c=>c.id===id)?.archived,uiChild);
  await a.p.locator(`[data-archive="${uiChild}"]`).click();await a.p.locator('[data-confirm-archive]').click();await acknowledged();
  await b.p.waitForFunction(id=>!HuckTest.getState().children.find(c=>c.id===id)?.archived,uiChild);
  await a.p.locator('[data-save-settings]').click();
  await a.p.locator('[data-settings]').click();
  for(const language of ['en','es','he'])for(const theme of ['original','night','berry','mint','midnight'])for(const width of [320,390,1280]){
   await a.p.setViewportSize({width,height:844});await a.p.locator(`[data-language=${language}]`).click();await a.p.locator(`button[data-theme=${theme}]`).click();assert(await a.p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  await a.p.setViewportSize({width:390,height:844});await a.p.locator('[data-language=en]').click();await a.p.locator('[data-save-settings]').click();
  await a.p.evaluate(()=>{window.scrollTo(0,0);const e=document.querySelector('#chart-scroll');e.scrollLeft=e.scrollWidth;});await a.p.waitForTimeout(100);
  await a.p.screenshot({path:'/tmp/huck-firestore-phone.png'});await a.p.setViewportSize({width:1280,height:900});await a.p.evaluate(()=>window.scrollTo(0,0));await a.p.waitForTimeout(100);await a.p.screenshot({path:'/tmp/huck-firestore-desktop.png'});
  await a.p.locator('[data-share]').click();assert((await a.p.locator('#share-url').inputValue()).includes('/staging/firebase/'));await a.p.locator('.close').click();
  assert.equal(await a.p.evaluate(()=>localStorage.getItem('huck-v1')),'production-sentinel');assert.deepEqual(errors,[]);
  console.log('PASS Firestore: isolated live test environment, 84 synthetic entries, start/end propagation, reload persistence, manual add/edit/cancel/resume/delete, shared birthday/custom wake ranges, archive/restore, concurrent-start conflict, stable-ID dedupe, expiry/settings, durable offline retry, production-storage isolation, three languages/five themes/phone-desktop, staging share URL');
  console.log('Propagation smoke timings (includes Playwright action/observation overhead): '+JSON.stringify(timings));
 }finally{
  // Delete only this unique test environment; never staging or household data.
  const p=contexts[0]?.pages()[0];if(p&&!p.isClosed())await p.evaluate(async environment=>{if(!environment.startsWith('test-'))throw Error('Unsafe cleanup');const sdk=await import('https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js'),app=await import('https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js'),db=sdk.getFirestore(app.getApps()[0]);for(const name of ['records','commands']){const records=await sdk.getDocsFromServer(sdk.collection(db,'huckEnvironments',environment,name));if(records.empty)continue;const batch=sdk.writeBatch(db);records.docs.forEach(d=>batch.delete(d.ref));await batch.commit();}},environment).catch(e=>console.error('Test cleanup needs retry:',e.message));
  await browser.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
