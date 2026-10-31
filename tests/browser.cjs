const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const C=require('../shared/core.js');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{let f=path.join(root,new URL(req.url,'http://local').pathname);try{if(fs.statSync(f).isDirectory())f=path.join(f,'index.html');res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png'})[path.extname(f)]||'text/plain');res.end(fs.readFileSync(f));}catch{res.writeHead(404);res.end();}});
const now=Date.parse('2026-10-30T18:00:00Z');
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  for(const style of ['daybook','orbit','compact']){ const i=['daybook','orbit','compact'].indexOf(style)+1;
   const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'America/Los_Angeles',reducedMotion:'reduce'});const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.clock.setFixedTime(now);
   await p.goto(`${base}/?demo=1`);await p.locator('.sleep-block').first().waitFor();await p.locator('[data-settings]').click();await p.locator(`button[data-style="${style}"]`).click();await p.locator('[data-save-settings]').click();assert.equal(await p.locator('body').getAttribute('data-style'),style);
   assert(await p.locator('#sample-note').isVisible());assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   assert.equal(await p.locator('#summary').count(),0);assert.equal(await p.locator('#last-entry').count(),0);
   assert.equal(await p.locator('.day-column.is-today').count(),1);assert.equal(await p.locator('.day-column[aria-current="date"]').count(),1);
   assert.equal(await p.locator('.day-column.is-today header').innerText(),'Today\n10/30');
   assert.equal(await p.locator('#today-naps h2').innerText(),'Recent naps');assert.equal(await p.locator('.nap-entry').count(),1);
   assert(await p.locator('#today-naps').evaluate(el=>{const s=getComputedStyle(el);return s.marginTop==='36px'&&parseFloat(s.borderTopWidth)>0;}));
   if(style==='daybook')assert(await p.evaluate(()=>{const a=getComputedStyle(document.querySelector('#today-naps')),b=getComputedStyle(document.querySelector('.history-heading'));return a.borderTopColor===b.borderTopColor&&a.borderTopWidth===b.borderTopWidth&&a.paddingTop===b.paddingTop;}));
   assert.equal(await p.locator('.nap-duration strong').innerText(),'45m');assert((await p.locator('.nap-times').innerText()).includes('8:20 AM'));
   assert(await p.locator('#timer-art').evaluate(img=>img.complete&&img.naturalWidth>0));
   assert(await p.locator('#chart-scroll').evaluate(e=>e.scrollLeft+e.clientWidth>=e.scrollWidth-5));
   await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:`/tmp/huck-style-${style}.png`});
   await p.locator('[data-start="5"]').click();assert.equal(await p.locator('#timer-status').innerText(),'Sleeping');assert.equal(await p.locator('#elapsed-main').innerText(),'5m');assert.equal(await p.locator('#elapsed-seconds').innerText(),'00s');
   assert(await p.evaluate(()=>{const entries=HuckTest.getState().entries;const starts=[...document.querySelectorAll('.nap-entry')].map(row=>entries.find(e=>e.id===row.dataset.edit).start);return starts.every((s,i)=>!i||s<=starts[i-1]);}));
   assert(await p.evaluate(()=>{const a=getComputedStyle(document.querySelector('#today-naps h2')),b=getComputedStyle(document.querySelector('.history h2'));return a.fontSize===b.fontSize&&a.fontWeight===b.fontWeight&&a.color===b.color;}));
   await p.clock.setFixedTime(now+1000);await p.waitForFunction(()=>document.querySelector('#elapsed-seconds')?.textContent==='01s');
   await p.screenshot({path:`/tmp/huck-live-seconds-${i}.png`});
   await p.reload();assert.equal(await p.locator('#timer-status').innerText(),'Sleeping');assert.equal(await p.locator('body').getAttribute('data-style'),style);
   await p.locator('[data-end="0"]').click();assert.equal(await p.locator('#timer-status').innerText(),'Awake');assert.equal(await p.locator('#elapsed-seconds').count(),0);
   await p.locator('.nap-entry').first().click();assert(await p.locator('#modal').isVisible());await p.locator('[data-save-entry]').click();assert(!(await p.locator('#modal').isVisible()));
   await p.locator('.nap-entry').first().click();await p.locator('[data-delete-entry]').click();await p.locator('[data-confirm-delete]').click();assert(!(await p.locator('#modal').isVisible()));
   await p.locator('[data-settings]').click();
   for(const theme of ['night','berry','mint','original']){await p.locator(`[data-theme="${theme}"]`).click();assert.equal(await p.locator('body').getAttribute('data-theme'),theme);assert.equal(await p.locator('body').getAttribute('data-style'),style);assert(await p.locator('[data-close]').isVisible());}
   await p.locator('[data-save-settings]').click();
   if(i===1){
    await p.locator('[data-older]').click();assert.equal(await p.locator('.day-column').count(),14);
    await p.locator('[data-settings]').click();await p.getByText('Sleep schedule & timer cleanup',{exact:true}).click();await p.locator('#dayStart').selectOption('6');await p.locator('[data-save-settings]').click();
    assert.equal(await p.evaluate(()=>HuckTest.getState().settings.dayStart),6);
    await p.locator('[data-settings]').click();await p.getByText('Advanced settings',{exact:true}).click();await p.locator('#new-child').fill('Test child');await p.locator('[data-add-child]').click();await p.locator('#child-select').selectOption({label:'Test child'});await p.locator('[data-save-settings]').click();assert.equal(await p.locator('#child-name').innerText(),'Test child');
    await p.locator('[data-start="10"]').click();await p.locator('[data-end="0"]').click();
    const childId=await p.evaluate(()=>HuckTest.getState().children.find(c=>c.name==='Test child').id);
    await p.locator('[data-settings]').click();await p.getByText('Advanced settings',{exact:true}).click();await p.locator(`[data-archive="${childId}"]`).click();await p.locator('[data-confirm-archive]').click();assert.equal(await p.locator('#child-select').inputValue(),'avi');await p.locator('[data-save-settings]').click();assert(await p.evaluate(id=>HuckTest.getState().entries.some(e=>e.childId===id),childId));
   }
   await p.locator('[data-share]').click();assert((await p.locator('#share-url').inputValue()).includes('child=avi'));assert(!(await p.locator('#share-url').inputValue()).includes('demo='));await p.mouse.click(2,2);assert(!(await p.locator('#modal').isVisible()));
   await p.setViewportSize({width:320,height:740});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await p.setViewportSize({width:1280,height:900});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:`/tmp/huck-desktop-${i}.png`});assert.deepEqual(errors,[]);
   console.log(`PASS style ${style}: samples, timer start/end/reload/edit/delete, independent color themes, sharing, backdrop, 320/390/1280 widths`);await context.close();
  }
  // Two isolated browsers, one simulated backend: no access to the real Sheet.
  let state=C.initial();const seen=new Set();
  async function device(){const c=await browser.newContext({viewport:{width:390,height:844},timezoneId:'America/Los_Angeles'});const p=await c.newPage();await p.clock.setFixedTime(now);await p.route('**/config.js',r=>r.fulfill({contentType:'text/javascript',body:'window.HUCK_CONFIG={backendUrl:"https://huck-test.invalid/exec",sheetUrl:"https://example.invalid"};'}));await p.route('https://huck-test.invalid/**',async r=>{const u=new URL(r.request().url());let result;try{if(u.searchParams.get('action')==='command'){const cmd=JSON.parse(u.searchParams.get('payload'));if(!seen.has(cmd.id)){state=C.apply(state,cmd,now);seen.add(cmd.id);}}result={ok:true,state};}catch(e){result={ok:false,error:e.message};}await r.fulfill({contentType:'text/javascript',body:`${u.searchParams.get('callback')}(${JSON.stringify(result)});`});});await p.goto(`${base}/`);await p.waitForFunction(()=>document.querySelector('#connection').textContent.startsWith('Synced'));return {c,p};}
  const a=await device(),b=await device();
  await a.p.locator('[data-start="5"]').click();await a.p.waitForFunction(()=>document.querySelector('#connection').textContent.startsWith('Synced'));
  await b.p.evaluate(()=>HuckTest.sync());assert.equal(await b.p.locator('#timer-status').innerText(),'Sleeping');
  await b.p.locator('[data-end="0"]').click();await b.p.waitForFunction(()=>document.querySelector('#connection').textContent.startsWith('Synced'));
  await a.p.evaluate(()=>HuckTest.sync());assert.equal(await a.p.locator('#timer-status').innerText(),'Awake');assert.equal(state.entries.length,1);assert.equal(state.entries[0].end,now);
  const count=state.entries.length;await a.p.reload();await a.p.waitForFunction(()=>document.querySelector('#connection').textContent.startsWith('Synced'));assert.equal(state.entries.length,count);
  // Concurrent command on stale browser conflicts rather than silently overwriting.
  const old=await a.p.evaluate(()=>HuckTest.getState().entries[0]);
  await b.p.evaluate(entry=>HuckTest.enqueue('edit',{id:entry.id,childId:'avi',start:entry.start-60000,end:entry.end,expectedRev:entry.rev}),old);
  await b.p.waitForFunction(()=>document.querySelector('#connection').textContent.startsWith('Synced'));
  await a.p.evaluate(entry=>HuckTest.enqueue('delete',{id:entry.id,childId:'avi',expectedRev:entry.rev}),old);
  await a.p.locator('#review').waitFor();assert.equal(state.entries[0].deleted,false);
  console.log('PASS shared backend: two-device start/end, refresh persistence, idempotent records, stale-edit protection');await a.c.close();await b.c.close();
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
