const {chromium}=require('playwright'),assert=require('node:assert/strict'),C=require('../shared/core.js');
const now=Date.parse('2026-10-31T18:00:00Z'),lockError='Lock timeout: another process was holding the lock for too long.';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  async function device({failure='lock',stored=false,snapshotBusy=false,stall=false}={}){
   const c=await browser.newContext({viewport:{width:390,height:844},timezoneId:'America/Los_Angeles',reducedMotion:'reduce'}),p=await c.newPage(),errors=[],calls=[],ids=[],seen=new Set();let state=C.initial(),failed=false,release;
   const gate=new Promise(resolve=>release=resolve);p.on('pageerror',e=>errors.push(e.message));await p.clock.install({time:now});await p.clock.pauseAt(now);
   if(stored)await p.addInitScript(({base,now,error})=>localStorage.setItem('huck-v1',JSON.stringify({base,prefs:{motion:false},queue:[{id:'saved-request',type:'start',createdAt:now,payload:{id:'saved-sleep',childId:'avi',start:now-60000},blocked:error}]})),{base:state,now,error:lockError});
   await p.route('**/config.js',r=>r.fulfill({contentType:'text/javascript',body:'window.HUCK_CONFIG={backendUrl:"https://huck-recovery.invalid/exec",sheetUrl:"https://example.invalid"};'}));
   await p.route('https://huck-recovery.invalid/**',async r=>{
    const url=new URL(r.request().url()),action=url.searchParams.get('action');calls.push(action);let result={ok:true,state};
    if(action==='snapshot'&&snapshotBusy&&!failed){failed=true;result={ok:false,error:'Connection is busy. Please retry shortly.',retryable:true,code:'BUSY'};}
    if(action==='command'){
     const cmd=JSON.parse(url.searchParams.get('payload'));ids.push(cmd.id);
     if(!failed&&!stored){failed=true;
      if(failure==='lock')result={ok:false,error:lockError};
      else if(failure==='busy')result={ok:false,error:'Connection is busy.',retryable:true,code:'BUSY'};
      else if(failure==='network')return r.abort();
      else if(failure==='committed'){state=C.apply(state,cmd,now+120000);seen.add(cmd.id);return r.abort();}
      if(stall){state=C.apply(state,cmd,now+120000);seen.add(cmd.id);await gate;result={ok:true,state};}
     }else if(!seen.has(cmd.id)){state=C.apply(state,cmd,now+120000);seen.add(cmd.id);result={ok:true,state};}
     else result={ok:true,state};
    }
    await r.fulfill({contentType:'text/javascript',body:`${url.searchParams.get('callback')}(${JSON.stringify(result)});`}).catch(()=>{});
   });
   await p.goto('http://127.0.0.1:5190/');return {c,p,errors,calls,ids,release,state:()=>state};
  }
  for(const failure of ['lock','busy','network','committed']){
   const d=await device({failure}),p=d.p;await p.waitForFunction(()=>document.querySelector('#connection').textContent.startsWith('Synced'));await p.locator('[data-start="0"]').click();await p.waitForFunction(()=>document.querySelector('#sync-activity').hidden);
   assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('huck-v1')).queue.length),1);assert(!(await p.evaluate(()=>JSON.parse(localStorage.getItem('huck-v1')).queue[0].blocked)));assert(!(await p.locator('#review').isVisible()));
   const before=d.calls.length;await p.evaluate(()=>HuckTest.sync());assert.equal(d.calls.length,before,'Polling/focus must respect retry backoff');
   await p.clock.runFor(7000);await p.waitForFunction(()=>JSON.parse(localStorage.getItem('huck-v1')).queue.length===0);assert.equal(d.state().entries.length,1);assert.equal(new Set(d.ids).size,1,'Retry must keep the original command ID');assert.deepEqual(d.errors,[]);await d.c.close();console.log('PASS automatic retry: '+failure);
  }
  const migrated=await device({stored:true});await migrated.p.waitForFunction(()=>JSON.parse(localStorage.getItem('huck-v1')).queue.length===0);assert.equal(migrated.state().entries.length,1);assert.equal(migrated.calls[0],'command');assert(!(await migrated.p.locator('#review').isVisible()));await migrated.c.close();console.log('PASS legacy lock-blocked queue recovery');
  const reading=await device({snapshotBusy:true});await reading.p.waitForFunction(()=>document.querySelector('#sync-activity').hidden);await reading.p.clock.runFor(7000);await reading.p.waitForFunction(()=>document.querySelector('#connection').textContent.startsWith('Synced'));assert.equal(reading.calls.filter(x=>x==='snapshot').length,2);await reading.c.close();console.log('PASS snapshot busy recovery');
  const stalled=await device({stall:true}),p=stalled.p;await p.waitForFunction(()=>document.querySelector('#connection').textContent.startsWith('Synced'));await p.locator('[data-start="0"]').click();await p.waitForFunction(()=>!document.querySelector('#sync-activity').hidden);await p.clock.setSystemTime(now+41000);await p.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await p.clock.runFor(7000);await p.waitForFunction(()=>JSON.parse(localStorage.getItem('huck-v1')).queue.length===0);stalled.release();await p.waitForTimeout(50);assert.equal(stalled.state().entries.length,1);assert.deepEqual(stalled.errors,[]);await stalled.c.close();console.log('PASS phone-resume stale request recovery and retry idempotency');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
