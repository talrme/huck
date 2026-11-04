const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const url=process.env.HUCK_CHECK_URL||'http://127.0.0.1:5190/',browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}),errors=[];
 const expected=process.argv[2]?JSON.parse(fs.readFileSync(process.argv[2],'utf8')).state:null;
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'America/Los_Angeles'}),p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
  await context.route('**/script.google.com/**',r=>{errors.push('Unexpected Sheet request');return r.abort();});
  const opened=Date.now();await p.goto(url);await p.waitForFunction(()=>document.querySelector('#connection').textContent.startsWith('Synced'),null,{timeout:45000});const freshMs=Date.now()-opened;
  const saved=await p.evaluate(()=>({config:{environment:HUCK_CONFIG.environment,project:HUCK_CONFIG.firestore?.projectId},saved:JSON.parse(localStorage.getItem('huck-v1'))}));
  assert.equal(saved.config.environment,'production');assert.equal(saved.config.project,'huck-7a55c');assert.equal(saved.saved.queue.length,0);
  if(expected){const canonical=s=>({...s,entries:[...s.entries].sort((a,b)=>a.id.localeCompare(b.id))});assert.deepEqual(canonical(saved.saved.base),canonical(expected));}
  assert.equal(await p.locator('#child-name').innerText(),'Avi');assert(!(await p.locator('#sample-note').isVisible()));assert.equal(await p.locator('[data-seed-staging]').count(),0);
  assert(await p.locator('#timer-art').evaluate(el=>el.complete&&el.naturalWidth>0));assert(await p.locator('.brand img').count()===0||await p.locator('.brand img').first().evaluate(el=>el.complete&&el.naturalWidth>0));
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.screenshot({path:'/tmp/huck-production-phone.png'});
  await p.locator('.sleep-block').first().click();assert(await p.locator('[data-history-edit]').count()||await p.locator('[data-history-entry]').count());
  await p.locator('[data-settings]').click();await p.mouse.click(2,2);assert(!(await p.locator('#modal').isVisible()));
  await p.locator('[data-share]').click();assert((await p.locator('#share-url').inputValue()).includes('child=avi'));assert(!(await p.locator('#share-url').inputValue()).includes('staging'));await p.locator('.close').click();
  await p.setViewportSize({width:1280,height:900});await p.evaluate(()=>window.scrollTo(0,0));await p.screenshot({path:'/tmp/huck-production-desktop.png'});
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
  console.log(JSON.stringify({result:'PASS read-only real production: server-confirmed Firestore, correct history/configuration, no staging controls, history selection, settings backdrop, child share link, phone/desktop, no Sheets calls',freshMs,revision:saved.saved.base.revision,storedEntries:saved.saved.base.entries.length,visible:saved.saved.base.entries.filter(e=>!e.deleted).length}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
