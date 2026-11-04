const {chromium}=require('playwright');
const fs=require('node:fs');
const LIVE=process.env.HUCK_BENCH_URL||'https://talrme.github.io/huck/';
const OUTPUT=process.env.HUCK_BENCH_OUTPUT||'/private/tmp/huck-sheets-refresh-benchmark.json';
const runs=[];
async function instrument(){
  const b=window.__refreshBench={initialRenderMs:null,cachedAtStart:false,syncDomMs:null,freshPaintMs:null,requests:[],errors:[]};
  const storageKey=location.pathname.includes('/staging/firebase/')?'huck-firestore-staging-v1':'huck-v1';
  try{const saved=JSON.parse(localStorage.getItem(storageKey)||'{}');b.cachedAtStart=Boolean(saved.base?.entries?.length);}catch{}
  window.addEventListener('huck-backend-timing',event=>{
    const d=event.detail;
    if(d.phase==='start')b.requests.push({action:d.action,startMs:d.at,backend:'firestore'});
    else if(d.phase==='server'){const r=b.requests.find(r=>r.backend==='firestore'&&r.action===d.action&&r.responseMs===undefined);if(r){r.responseMs=d.at;r.durationMs=d.at-r.startMs;r.responseSource='server-snapshot';}}
    else{const r=b.requests.find(r=>r.backend==='firestore'&&r.startMs===d.startedAt);if(r){if(r.responseMs===undefined){r.responseMs=d.at;r.durationMs=d.at-r.startMs;r.responseSource='request-completed';}r.ok=d.ok;}}
  });
  const observed=new WeakSet();
  function check(){
    const action=document.querySelector('#actions .primary');
    if(b.initialRenderMs===null&&action?.getClientRects().length)b.initialRenderMs=performance.now();
    if(b.syncDomMs===null&&document.querySelector('#connection')?.textContent.startsWith('Synced ')){
      b.syncDomMs=performance.now();requestAnimationFrame(()=>requestAnimationFrame(()=>b.freshPaintMs=performance.now()));
    }
    document.querySelectorAll('script[src]').forEach(script=>{
      if(observed.has(script))return;observed.add(script);
      const url=new URL(script.src);if(url.hostname!=='script.google.com'||!url.searchParams.has('callback'))return;
      const callback=url.searchParams.get('callback'),original=window[callback];
      const request={action:url.searchParams.get('action'),startMs:performance.now()};b.requests.push(request);
      if(typeof original!=='function'){request.instrumentationError='callback missing';return;}
      window[callback]=data=>{
        request.responseMs=performance.now();request.durationMs=request.responseMs-request.startMs;request.ok=data.ok;request.code=data.code||null;request.backendVersion=data.backendVersion||null;
        if(data.state){request.entryCount=data.state.entries.length;request.childCount=data.state.children.length;request.revision=data.state.revision;}
        if(!data.ok)request.error=data.error;return original(data);
      };
    });
  }
  new MutationObserver(check).observe(document,{subtree:true,childList:true,characterData:true});
  window.addEventListener('error',event=>b.errors.push(event.message));
}
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 let context,page;
 try{
  for(let i=0;i<16;i++){
   const cold=i<4;
   if(cold){if(context)await context.close();context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'America/Los_Angeles',locale:'en-US'});await context.addInitScript(instrument);page=await context.newPage();}
   const started=new Date().toISOString();
   let failure=null;
   try{
    if(cold)await page.goto(LIVE,{waitUntil:'domcontentloaded',timeout:60000});else await page.reload({waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForFunction(()=>window.__refreshBench?.freshPaintMs!==null,{},{timeout:80000});
   }catch(error){failure=error.message.split('\n')[0];}
   const measurements=await page.evaluate(()=>{const b=window.__refreshBench;if(window.HUCK_CONFIG?.firestore&&window.HuckTest){const state=HuckTest.getState();for(const r of b.requests){r.entryCount=state.entries.length;r.childCount=state.children.length;r.revision=state.revision;r.backendVersion='firestore-staging-v1';}}return {...b,pageUrl:location.href,assetCount:performance.getEntriesByType('resource').length,transferredBytes:performance.getEntriesByType('resource').reduce((sum,e)=>sum+e.transferSize,0)};});
   const row={run:i+1,type:cold?'fresh browser':'cached reload',started,failure,...measurements};runs.push(row);
   fs.writeFileSync(OUTPUT,JSON.stringify({url:LIVE,method:'Unthrottled desktop Chrome, 390x844 viewport, serial runs, no user commands, clean isolated browser storage, durations from navigation start; Sheets request measured script insertion to JSONP callback; Firestore request measured adapter start to server snapshot before decoding/rendering, including SDK initialization',runs},null,2));
   console.log(JSON.stringify({run:row.run,type:row.type,cached:row.cachedAtStart,initialMs:Math.round(row.initialRenderMs),freshMs:Math.round(row.freshPaintMs),requests:row.requests.map(r=>({action:r.action,ms:Math.round(r.durationMs),ok:r.ok,code:r.code})),failure}));
  }
 }finally{await browser.close();}
 console.log('Results: '+OUTPUT);
})().catch(error=>{console.error(error);process.exitCode=1;});
