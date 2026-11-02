(() => {
  'use strict';
  const C = HuckCore, $ = s => document.querySelector(s), esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const demo = new URL(location.href).searchParams.get('demo') === '1';
  const key = demo ? 'huck-sample-v1' : 'huck-v1';
  const root = new URL('../', document.currentScript.src);
  let saved; try { saved = JSON.parse(localStorage.getItem(key) || '{}'); } catch { saved = {}; }
  if(!demo && HUCK_CONFIG.backendUrl && saved.localOnly && saved.base?.entries?.length) {
    localStorage.setItem('huck-local-backup-v1', JSON.stringify(saved.base));
  }
  let base = saved.base || C.initial(), queue = saved.queue || [], prefs = { child: 'avi', theme: 'original', style: 'daybook', wakeInfo: true, motion: true, ...saved.prefs };
  if(!['daybook','orbit','compact'].includes(prefs.style))prefs.style='daybook';
  let busy = false, message = '', lastChecked = 0, editor = null, days = 30, rendered = false, expandedNaps = '';
  let retryAt=0,retryFailures=0,retryTimer=null,pendingRequest=null;
  function temporaryError(error){return Boolean(error?.retryable)||/lock timeout|could not acquire.*lock|unable to acquire.*lock|timed out.*lock|lock.*timed out|another process was holding the lock|service invoked too many times|too many (?:simultaneous|requests)|temporarily unavailable|server error occurred|service timed out|try again later/i.test(String(error?.error||error?.message||error||''));}
  // Older versions mistakenly persisted temporary lock failures as edit conflicts.
  for(const command of queue)if(command.blocked&&temporaryError(command.blocked))delete command.blocked;
  let historyChild=null,selectedSleep=null;
  let arrival=null,endReceipt=null,receiptTimer=null,receiptHideTimer=null;
  const formatters=new Map(),entryLists=new WeakMap();let projectionCache=null,chartCache=null,lastPersisted=localStorage.getItem(key)||'';
  function formatter(kind,timezone=base.settings.timezone){
    const id=kind+':'+timezone;if(!formatters.has(id))formatters.set(id,new Intl.DateTimeFormat(kind==='parts'?'en-CA':'en-US',kind==='parts'?{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}:{timeZone:timezone,hour:'numeric',minute:'2-digit'}));return formatters.get(id);
  }
  const uuid = () => crypto.randomUUID();
  function parts(at) { return Object.fromEntries(formatter('parts').formatToParts(new Date(at)).map(p=>[p.type,p.value])); }
  function wallTime(date, hour = base.settings.dayStart, minute = 0) {
    let target = Date.parse(date + 'T' + String(hour).padStart(2,'0') + ':' + String(minute).padStart(2,'0') + ':00Z'), t = target;
    for (let i=0;i<3;i++) { const p=parts(t); const asUTC=Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:00Z`); t += target-asUTC; }
    return t;
  }
  function dateKey(at) { const p=parts(at); return `${p.year}-${p.month}-${p.day}`; }
  function shiftDate(date,n) { const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10); }
  function periodDate(at) { const date=dateKey(at);return at<wallTime(date)?shiftDate(date,-1):date; }
  function duration(ms) { const m=Math.max(0,Math.floor(ms/60000));return m>=60?`${Math.floor(m/60)}h${m%60?' '+m%60+'m':''}`:`${m}m`; }
  function sleepName(at,s=projected()){return C.isNight(at,s.settings)?'sleep':'nap';}
  function longDuration(ms){const m=Math.max(0,Math.floor(ms/60000)),h=Math.floor(m/60);return h?`${h} ${h===1?'hour':'hours'}${m%60?` ${m%60} ${m%60===1?'minute':'minutes'}`:''}`:`${m} ${m===1?'minute':'minutes'}`;}
  function clock(t) { return formatter('clock').format(new Date(t)); }
  function inputTime(t) { const p=parts(t);return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`; }
  function parseInput(s) { const [date,time] = s.split('T');if(!time)return NaN;const [h,m]=time.split(':').map(Number);return wallTime(date,h,m); }
  function sample() {
    const s=C.initial(), today=periodDate(Date.now());
    for(let d=-6;d<=0;d++) for(const [hour,minute,length] of [[8,20,45],[11,10,80],[14,30,55],[17,0,35],[21,10,130],[2,15,100]]) {
      const date=shiftDate(today,d+(hour<7?1:0)),start=wallTime(date,hour,minute);
      if(start+length*60000<Date.now())s.entries.push({id:uuid(),childId:'avi',start,end:start+length*60000,rev:1,deleted:false,autoEnded:false});
    }
    return s;
  }
  if(demo && !saved.base)base=sample();
  let baseSignature=JSON.stringify(base);
  function acceptSnapshot(state){const signature=JSON.stringify(state);if(signature===baseSignature)return false;base=state;baseSignature=signature;return true;}
  function persist(){const encoded=JSON.stringify({base,queue,prefs,localOnly:!HUCK_CONFIG.backendUrl});if(encoded!==lastPersisted){localStorage.setItem(key,encoded);lastPersisted=encoded;}}
  function projected(){
    const now=Date.now(),pending=queue.map(c=>c.id+':'+(c.blocked||'')).join('|');
    if(projectionCache&&projectionCache.base===base&&projectionCache.pending===pending&&now>=projectionCache.at&&now<projectionCache.expires)return projectionCache.state;
    let s=JSON.parse(JSON.stringify(base));for(const cmd of queue.filter(c=>!c.blocked)){try{s=C.apply(s,cmd,cmd.createdAt);}catch{}}C.settle(s,now);
    let expires=Infinity;for(const e of s.entries){if(!e.end&&!e.deleted)expires=Math.min(expires,e.start+Number(C.isNight(e.start,s.settings)?s.settings.nightLimit:s.settings.dayLimit)*60000);}
    projectionCache={base,pending,at:now,expires,state:s};return s;
  }
  function child(s=projected()){return s.children.find(c=>c.id===prefs.child&&!c.archived)||s.children.find(c=>!c.archived);}
  function entries(s=projected()){const id=child(s)?.id;if(!entryLists.has(s))entryLists.set(s,new Map());const lists=entryLists.get(s);if(!lists.has(id))lists.set(id,s.entries.filter(e=>e.childId===id&&!e.deleted).sort((a,b)=>b.start-a.start));return lists.get(id);}
  const icon=(name)=>`<i data-lucide="${name}" aria-hidden="true"></i>`;
  function icons(){window.lucide?.createIcons();}
  function stateLabel(){return demo?'Sample data · this browser only':!HUCK_CONFIG.backendUrl?'This device only · Sheet not connected':queue.some(c=>c.blocked)?'Sync needs review':queue.length?'Saved here · sync pending':busy?'Syncing…':message?'Connection unavailable · showing saved data':lastChecked?'Synced '+clock(lastChecked):'Connecting…';}
  function renderSyncActivity(){$('#sync-activity').hidden=!busy;}
  function render(){
    renderSyncActivity();
    const s=projected(), c=child(s);prefs.child=c.id;
    document.body.dataset.theme=prefs.theme;document.body.dataset.style=prefs.style;document.body.classList.toggle('reduce-motion',!prefs.motion);
    $('#child-name').textContent=c.name;$('#sample-note').hidden=!demo;$('#connection').textContent=stateLabel();
    $('#review').hidden=!queue.some(c=>c.blocked);
    const running=C.active(s,c.id), list=entries(s), last=list.find(e=>e.end), today=periodDate(Date.now()), start=wallTime(today), end=wallTime(shiftDate(today,1));
    const todaysNaps=list.filter(e=>e.end&&e.start<end&&e.end>start),napKey=c.id+':'+today,showAll=expandedNaps===napKey;
    $('#today-naps').innerHTML=`<h2>Recent naps</h2>${todaysNaps.length?(showAll?todaysNaps:todaysNaps.slice(0,3)).map(e=>`<button class="nap-entry" data-edit="${esc(e.id)}"><span class="nap-duration"><strong>${duration((e.end||Date.now())-e.start)}</strong>${!e.end?'<small>Sleeping</small>':e.autoEnded?'<small>Auto-ended</small>':''}</span><span class="nap-times">${clock(e.start)}–${e.end?clock(e.end):'now'}</span>${icon('pencil')}</button>`).join(''):'<p class="fine">No naps yet today.</p>'}${todaysNaps.length>3?`<button class="text-link nap-more" data-more-naps aria-expanded="${showAll}">${showAll?'Show fewer':'Show all of today’s naps'} ${icon(showAll?'chevron-up':'chevron-down')}</button>`:''}<button class="text-link nap-add" data-add>${icon('plus')} Add sleep</button>`;
    $('#timer').dataset.asleep=Boolean(running);
    $('#timer-status').textContent=running?'Sleeping':'Awake';
    const lastLabel=last&&C.isNight(last.start,s.settings)?'Last sleep':'Last nap';
    $('#timer-detail').innerHTML=running?`<div class="session-time"><button class="text-link" data-edit="${esc(running.id)}" data-open-start aria-label="Edit start time, ${clock(running.start)}">${clock(running.start)}</button><span class="time-separator">to</span><button id="session-ending" class="text-link manual-time" data-open-end="${esc(running.id)}" aria-label="End time not set. Enter end time">Enter end time</button></div>`:last?`<button class="last-duration text-link" data-edit="${esc(last.id)}" aria-label="Edit ${lastLabel.toLowerCase()}, ${clock(last.start)} to ${clock(last.end)}"><span class="last-entry-label">${lastLabel}:</span> <strong>${last.autoEnded?'~':''}${longDuration(last.end-last.start)} long</strong> <span class="last-time-range">(${clock(last.start)}–${clock(last.end)})</span></button>${last.autoEnded?'<small class="estimate-note">auto-ended</small>':''}`:'No sleep logged yet';
    $('#timer-art').src=new URL(running?'shared/sleeping.png':'shared/awake.png',root);
    $('#timer-art').alt='';
    renderActions(s,running);
    renderEndConfirmation(s);renderChart(s);tick();icons();persist();animateArrival();
  }
  function renderActions(s,running){
    const box=$('#actions'),mode=running?'end':'start',context=child(s).id+':'+(running?.id||'awake');
    if(box.dataset.context!==context){
      box.dataset.context=context;
      box.innerHTML=`<div class="action-main"><button class="primary" data-${mode}="0">${running?'':icon('play')}<span id="primary-action"></span></button>${running?'':`<button class="manual-start manual-time" data-custom-start>${icon('clock-3')}<span id="manual-action"></span></button>`}</div>`;
    }
    updateActionLabels(s,running);
  }
  function updateActionLabels(s=projected(),running=C.active(s,child(s).id)){
    const noun=sleepName(running?running.start:Date.now(),s);
    $('#primary-action').textContent=running?'End '+(noun==='nap'?'Nap':'Sleep'):'Start '+noun+' now';
    if($('#manual-action'))$('#manual-action').textContent='Enter '+noun+' manually';
  }
  function dismissEndConfirmation(animate=true){
    clearTimeout(receiptTimer);clearTimeout(receiptHideTimer);endReceipt=null;
    const box=$('#end-confirmation');
    box.getAnimations({subtree:true}).forEach(a=>a.cancel());
    if(animate&&prefs.motion&&!matchMedia('(prefers-reduced-motion: reduce)').matches){box.classList.add('is-closing');receiptHideTimer=setTimeout(()=>{box.hidden=true;box.classList.remove('is-closing');},180);}
    else{box.hidden=true;box.classList.remove('is-closing');}
  }
  function renderEndConfirmation(s=projected()){
    if(!endReceipt)return;
    const entry=entries(s).find(e=>e.id===endReceipt.id);
    const starting=endReceipt.kind==='start',active=C.active(s,child(s).id);
    if(endReceipt.childId!==child(s).id||!entry||(starting?entry.end||active?.id!==entry.id:!entry.end||active)){dismissEndConfirmation(false);return;}
    if(!endReceipt.pausedAt&&Date.now()>=endReceipt.until){dismissEndConfirmation();return;}
    const noun=sleepName(entry.start,s);
    $('#end-confirmation-label').textContent=(noun==='nap'?'Nap':'Sleep')+(starting?' started at':' ended at');
    $('[data-resume-ended]').textContent=starting?'Still awake?':noun==='nap'?'Still napping?':'Still sleeping?';
    $('#end-confirmation').setAttribute('aria-label',(noun==='nap'?'Nap':'Sleep')+(starting?' started':' ended'));
    $('#end-confirmation-time').textContent=clock(starting?entry.start:entry.end);
  }
  function showEndConfirmation(id,kind='end'){
    dismissEndConfirmation(false);const s=projected(),entry=entries(s).find(e=>e.id===id);if(!entry||(kind==='end'?!entry.end:entry.end||C.active(s,entry.childId)?.id!==id))return;
    const lifetime=8000;
    endReceipt={id,kind,childId:entry.childId,until:Date.now()+lifetime};
    const box=$('#end-confirmation');box.hidden=false;renderEndConfirmation(s);
    const meter=$('.end-confirmation-progress');meter.getAnimations().forEach(a=>a.cancel());
    if(prefs.motion&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
      meter.animate([{transform:'scaleX(1)'},{transform:'scaleX(0)'}],{duration:lifetime,easing:'linear',fill:'forwards'});
      box.animate([{opacity:1},{opacity:.55}],{duration:lifetime,easing:'linear',fill:'forwards'});
    }
    receiptTimer=setTimeout(()=>dismissEndConfirmation(),lifetime);
  }
  function pauseEndConfirmation(paused){
    if(!endReceipt||Boolean(endReceipt.pausedAt)===paused)return;
    const box=$('#end-confirmation');
    if(paused){endReceipt.pausedAt=Date.now();clearTimeout(receiptTimer);box.getAnimations({subtree:true}).forEach(a=>a.pause());}
    else{endReceipt.until+=Date.now()-endReceipt.pausedAt;delete endReceipt.pausedAt;box.getAnimations({subtree:true}).forEach(a=>a.play());receiptTimer=setTimeout(()=>dismissEndConfirmation(),Math.max(0,endReceipt.until-Date.now()));}
  }
  const receiptBox=$('#end-confirmation');
  let receiptHover=false;
  const updateReceiptPause=()=>pauseEndConfirmation(receiptHover||receiptBox.contains(document.activeElement));
  receiptBox.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'){receiptHover=true;updateReceiptPause();}});
  receiptBox.addEventListener('pointerleave',()=>{receiptHover=false;updateReceiptPause();});
  receiptBox.addEventListener('focusin',updateReceiptPause);
  receiptBox.addEventListener('focusout',()=>queueMicrotask(updateReceiptPause));
  function confirmResumeEnded(){
    const s=projected(),e=entries(s).find(e=>e.id===endReceipt?.id);if(!e?.end||C.active(s,e.childId))return;
    const noun=sleepName(e.start,s);
    editor={kind:'resume',id:e.id,childId:e.childId,start:e.start,rev:e.rev};dismissEndConfirmation(false);
    modal(noun==='nap'?'Still napping?':'Still sleeping?',`<p>Remove the end time and continue the same ${noun} from ${esc(clock(e.start))}?</p>`,`<button data-close>End ${noun}</button><button class="primary" data-confirm-resume>Resume ${noun}</button>`);
  }
  function confirmCancelStarted(){
    const s=projected(),e=entries(s).find(e=>e.id===endReceipt?.id);if(!e||e.end||C.active(s,e.childId)?.id!==e.id)return;
    const noun=sleepName(e.start,s);
    editor={kind:'cancel-start',id:e.id,childId:e.childId,rev:e.rev};dismissEndConfirmation(false);
    modal('Still awake?',`<p>Cancel the ${noun} started at ${esc(clock(e.start))}? The previous awake timer will continue.</p>`,`<button data-close>Keep ${noun==='nap'?'napping':'sleeping'}</button><button class="primary" data-confirm-cancel-start>Cancel ${noun}</button>`);
  }
  function animateArrival(){
    if(!arrival)return;const effect=arrival;arrival=null;
    const target=[...document.querySelectorAll('.nap-entry')].find(row=>row.dataset.edit===effect.id);
    if(!target)return;
    if(!prefs.motion||matchMedia('(prefers-reduced-motion: reduce)').matches){notice(duration(effect.duration)+' saved to Recent naps.');return;}
    const end=target.getBoundingClientRect(),from=effect.from;
    const ghost=document.createElement('div');ghost.className='sleep-transfer';ghost.setAttribute('aria-hidden','true');ghost.textContent=duration(effect.duration);ghost.style.left=from.left+'px';ghost.style.top=from.top+'px';document.body.append(ghost);
    const x=end.left-from.left,y=end.top-from.top;
    const motion=ghost.animate([{transform:'translate(0,0) scale(.85) rotate(-4deg)',opacity:0},{transform:'translate(18px,-24px) scale(1.15) rotate(-7deg)',opacity:1,offset:.16},{transform:`translate(${x*.7+25}px,${y*.5}px) scale(1.05) rotate(7deg)`,opacity:1,offset:.55},{transform:`translate(${x}px,${y-12}px) scale(.9) rotate(0)`,opacity:1,offset:.84},{transform:`translate(${x}px,${y}px) scale(.8)`,opacity:0}],{duration:1050,easing:'cubic-bezier(.22,.7,.3,1)'});
    motion.finished.then(()=>{
      if(!prefs.motion||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
      const row=[...document.querySelectorAll('.nap-entry')].find(row=>row.dataset.edit===effect.id);
      row?.animate([{background:'var(--soft)',transform:'translateY(7px) scale(.98)'},{background:'var(--soft)',transform:'translateY(-5px) scale(1.02)',offset:.35},{background:'transparent',transform:'translateY(0) scale(1)'}],{duration:850,easing:'ease-out'});
    }).catch(()=>{}).finally(()=>ghost.remove());
  }
  function tick(){
    const s=projected(),r=C.active(s,child(s).id),last=entries(s).find(e=>e.end),elapsed=$('#elapsed');
    const info=r?null:wakeState(s,last),counting=Boolean(r)||info.quality==='recorded';
    elapsed.classList.toggle('has-seconds',counting);
    elapsed.setAttribute('role','timer');elapsed.setAttribute('aria-live','off');
    if(counting){
      const ms=Math.max(0,r?Date.now()-r.start:info.elapsed),seconds=Math.floor(ms/1000)%60;
      if(!$('#elapsed-main'))elapsed.innerHTML='<span id="elapsed-main"></span><small class="timer-seconds" id="elapsed-seconds"></small>';
      $('#elapsed-main').textContent=duration(ms);
      $('#elapsed-seconds').textContent=String(seconds).padStart(2,'0')+'s';
      elapsed.setAttribute('aria-label',`${duration(ms)} ${seconds} seconds ${r?'asleep':'awake'}`);
    }else{
      elapsed.textContent=info.quality==='unknown'||info.quality==='stale'?'—':(info.quality==='estimated'?'~':'')+duration(info.elapsed);
      elapsed.removeAttribute('aria-label');
    }
    if(!r)$('#timer-status').textContent=info.quality==='unknown'||info.quality==='stale'?'Wake time unknown':info.quality==='estimated'?'Awake · estimated':'Awake';
    renderWakeCue(s,r,last);
    renderHistoryDetails(s);renderEndConfirmation(s);
    updateActionLabels(s,r);
    requestAnimationFrame(fitElapsed);
  }
  function fitElapsed(){
    const main=$('#elapsed-main'),seconds=$('#elapsed-seconds'),box=$('#elapsed');if(!main||!seconds||!box.clientWidth)return;
    main.style.fontSize='';const size=parseFloat(getComputedStyle(box).fontSize),available=box.clientWidth-seconds.getBoundingClientRect().width-6,width=main.getBoundingClientRect().width;
    if(width>available)main.style.fontSize=Math.max(18,Math.floor(size*available/width))+'px';
  }
  function wakeState(s,last){return HuckWake.assess(last,s.settings.wakeProfiles?.[child(s).id],Date.now(),dateKey(Date.now()),C.isNight(Date.now(),s.settings));}
  function renderWakeCue(s,running,last){
    const box=$('#wake-window'),info=wakeState(s,last),cue=HuckWake.cue(info);
    box.dataset.phase=info.phase;box.hidden=Boolean(running)||!prefs.wakeInfo||!cue;if(box.hidden)return;
    const markup=`<button class="wake-info" data-wake-details><span class="wake-caption"><span class="wake-dot" aria-hidden="true"></span><span>Target wake window <span class="wake-range">${cue.min}–${cue.max} min</span></span>${icon('circle-help')}</span></button>`;
    if(box._markup!==markup){box._markup=markup;box.innerHTML=markup;icons();}
  }
  function wakeDetails(){
    const s=projected(),info=wakeState(s,entries(s).find(e=>e.end));
    modal('Wake-window guide',`<p class="callout">Broad ranges, not deadlines. Follow sleepy and hunger cues; don’t keep baby awake to reach a number.</p>${info.age?`<p>${esc(child(s).name)} · ${esc(info.age.label)}${info.window?` · ${duration(info.window.min*60000)}–${duration(info.window.max*60000)}`:''}</p>`:'<p>Add a birthday in Settings to use the age-based guide.</p>'}<p class="fine">Based on the last recorded sleep, not a prediction. Missing entries and auto-ended timers make wake time uncertain. For premature babies or individual sleep concerns, ask your pediatrician which timing to use.</p><table class="wake-ranges"><thead><tr><th>Age</th><th>Approximate range</th></tr></thead><tbody>${HuckWake.configuredRanges(s.settings.wakeProfiles?.[child(s).id]).map(r=>`<tr><td>${r.label}</td><td>${duration(r.min*60000)}–${duration(r.max*60000)}</td></tr>`).join('')}</tbody></table><a href="https://health.clevelandclinic.org/wake-windows-by-age" target="_blank" rel="noreferrer">Source: Cleveland Clinic</a><a href="https://www.healthychildren.org/English/ages-stages/baby/sleep/Pages/getting-your-baby-to-sleep.aspx" target="_blank" rel="noreferrer">AAP: infant sleep guidance</a>`, '<button class="primary" data-settings>Settings</button>');editor=null;
  }
  function renderChart(s){
    const id=child(s).id;
    if(historyChild!==id){historyChild=id;days=30;selectedSleep=null;rendered=false;}
    const period=periodDate(Date.now()),key=id+'|'+days+'|'+period+'|'+prefs.style+'|'+(C.active(s,id)?Math.floor(Date.now()/60000):'');
    if(chartCache?.state===s&&chartCache.key===key)return;chartCache={state:s,key};
    const scroller=$('#chart-scroll'),previous=scroller.scrollLeft,atEnd=!rendered||previous+scroller.clientWidth>=scroller.scrollWidth-8;
    const oldFirst=$('.day-column')?.dataset.date,oldMarker=Boolean($('[data-older]')),history=entries(s),today=period;
    const first=history.length?periodDate(history[history.length-1].start):shiftDate(today,-6);
    const total=Math.max(1,Math.round((Date.parse(today+'T12:00:00Z')-Date.parse(first+'T12:00:00Z'))/86400000)+1),count=Math.min(days,total),hasOlder=count<total;
    const dates=Array.from({length:count},(_,i)=>shiftDate(today,i-count+1));
    const nightOffset=(Number(s.settings.nightStart)-Number(s.settings.dayStart)+24)%24;
    $('#time-axis').innerHTML='<div class="axis-top"></div>'+Array.from({length:25},(_,i)=>`<span style="top:${40+i*24}px">${(Number(s.settings.dayStart)+i)%12||12}${(Number(s.settings.dayStart)+i)%24<12?'a':'p'}</span>`).join('');
    $('#chart-days').style.width=`${(dates.length+(hasOlder?1:0))*94}px`;
    $('#chart-days').innerHTML=(hasOlder?`<section class="older-column"><header>Earlier</header><button data-older>${icon('arrow-left')}<span>Show older days</span></button></section>`:'')+dates.map(date=>{
      const lo=wallTime(date),hi=wallTime(shiftDate(date,1)),list=history.filter(e=>e.start<hi&&(e.end||Date.now())>lo);
      const p=new Date(date+'T12:00:00Z');
      return `<section class="day-column ${date===today?'is-today':''}" data-date="${date}" ${date===today?'aria-current="date"':''}><header>${date===today?'Today':new Intl.DateTimeFormat('en-US',{weekday:'short',timeZone:'UTC'}).format(p)}<strong>${Number(date.slice(5,7))}/${Number(date.slice(8))}</strong></header><div class="day-track"><div class="night-zone" style="top:${nightOffset*24}px;height:${576-nightOffset*24}px"></div>${list.map(e=>{const a=Math.max(lo,e.start),b=Math.min(hi,e.end||Date.now()),top=(a-lo)/(hi-lo)*576,h=Math.max(e.end?14:18,(b-a)/(hi-lo)*576);return `<button class="sleep-block ${!e.end?'running':''} ${e.autoEnded?'auto-ended':''}" style="top:${top}px;height:${h}px" data-history-entry="${esc(e.id)}" aria-pressed="${selectedSleep===e.id}" title="${clock(e.start)} to ${e.end?clock(e.end):'now'} · ${duration((e.end||Date.now())-e.start)}${e.autoEnded?' · Auto-ended':''}" aria-label="View ${sleepName(e.start,s)}, ${date}, ${clock(e.start)}, ${duration((e.end||Date.now())-e.start)}${!e.end?', in progress':''}"><span>${duration((e.end||Date.now())-e.start)}</span>${!e.end?'<small>Now</small><span class="history-zs" aria-hidden="true"><i>z</i><i>Z</i><i>z</i><i>Z</i></span>':e.autoEnded?'<small>Auto</small>':''}</button>`;}).join('')}</div></section>`;
    }).join('');
    const dateShift=oldFirst?Math.round((Date.parse(oldFirst+'T12:00:00Z')-Date.parse(dates[0]+'T12:00:00Z'))/86400000):0;
    scroller.scrollLeft=atEnd?scroller.scrollWidth:Math.max(0,previous+(dateShift+Number(hasOlder)-Number(oldMarker))*94);rendered=true;
    $('#chart-date').textContent=`${Number(today.slice(5,7))}/${Number(today.slice(8))} · ${s.settings.dayStart%12||12}${s.settings.dayStart<12?'am':'pm'}–${s.settings.dayStart%12||12}${s.settings.dayStart<12?'am':'pm'}`;
  }
  function renderHistoryDetails(s=projected()){
    const box=$('#history-details'),entry=entries(s).find(e=>e.id===selectedSleep);box.hidden=!entry;
    if(!entry){selectedSleep=null;return;}
    const startDate=dateKey(entry.start),endDate=dateKey(entry.end||Date.now());
    const short=date=>`${Number(date.slice(5,7))}/${Number(date.slice(8))}/${date.slice(0,4)}`;
    const timeRange=(startDate!==endDate?short(startDate)+' ':'')+clock(entry.start)+' – '+(entry.end?(startDate!==endDate?short(endDate)+' ':'')+clock(entry.end):'now');
    const noun=sleepName(entry.start,s),markup=`<div class="history-detail-head"><span>${short(startDate)} · ${noun==='nap'?'Nap':'Sleep'}</span><button class="detail-close" data-clear-history aria-label="Close sleep details" title="Close details">${icon('x')}</button></div><div class="history-detail-body"><div><strong>${longDuration((entry.end||Date.now())-entry.start)}</strong><p>${timeRange}</p>${!entry.end?'<small class="active-label">In progress</small>':entry.autoEnded?'<small>Auto-ended · approximate</small>':''}</div><button class="text-link" data-edit="${esc(entry.id)}">${icon('pencil')}Edit</button></div>`;
    if(box._markup!==markup){box._markup=markup;box.innerHTML=markup;icons();}
  }
  function selectHistory(id){
    selectedSleep=id||null;renderHistoryDetails();
    document.querySelectorAll('[data-history-entry]').forEach(block=>block.setAttribute('aria-pressed',String(block.dataset.historyEntry===selectedSleep)));
    if(id)$('#history-details').scrollIntoView({block:'nearest',behavior:prefs.motion&&!matchMedia('(prefers-reduced-motion: reduce)').matches?'smooth':'instant'});
  }
  function loadOlderHistory(){
    if(!rendered||!$('[data-older]'))return;days+=30;renderChart(projected());icons();
  }
  function enqueue(type,payload){
    if(queue.some(c=>c.blocked)){reviewSyncIssue();return false;}
    const command={id:uuid(),type,payload,createdAt:Date.now()};
    try{C.apply(projected(),command,Date.now());}catch(e){
      let detail=e.message;
      if(/overlaps another sleep/.test(detail)){
        const s=projected(),original=s.entries.find(e=>e.id===payload.id),start=payload.start??original?.start,end=payload.end===undefined?original?.end:payload.end;
        const other=s.entries.find(e=>!e.deleted&&e.id!==payload.id&&e.childId===payload.childId&&start<(e.end||Infinity)&&(end||Infinity)>e.start);
        if(other)detail=`This overlaps the sleep on ${dateKey(other.start).slice(5).replace('-','/')} from ${clock(other.start)} to ${other.end?clock(other.end):'still sleeping'}. Remove the accidental entry using its Delete button, or adjust the times, then try again. Only one sleep can be running.`;
      }
      notice(detail,true);return false;
    }
    const old=projected().entries.find(e=>e.id===payload.id&&!e.end&&!e.deleted);
    if(old&&payload.end&&(type==='end'||type==='edit'))arrival={id:old.id,duration:payload.end-old.start,from:$('#elapsed').getBoundingClientRect()};
    if(demo||!HUCK_CONFIG.backendUrl){base=C.apply(projected(),command,Date.now());persist();render();}
    else{queue.push(command);persist();render();sync();}return true;
  }
  function request(action,payload){return new Promise((resolve,reject)=>{
    const callback='huck_'+uuid().replaceAll('-',''),url=new URL(HUCK_CONFIG.backendUrl);url.searchParams.set('action',action);url.searchParams.set('callback',callback);url.searchParams.set('_',Date.now());if(payload)url.searchParams.set('payload',JSON.stringify(payload));
    const script=document.createElement('script');let finished=false;
    const done=(late=false)=>{if(finished)return false;finished=true;clearTimeout(timer);pendingRequest=null;script.remove();if(late){window[callback]=()=>{};setTimeout(()=>delete window[callback],60000);}else delete window[callback];return true;};
    const fail=text=>{if(done(true))reject(Object.assign(Error(text),{retryable:true}));};
    const timer=setTimeout(()=>fail('Connection timed out. Saved changes will retry.'),35000);
    pendingRequest={startedAt:Date.now(),cancel:()=>fail('Connection paused. Saved changes will retry.')};
    window[callback]=data=>{if(done())resolve(data);};script.onerror=()=>fail('Offline. Saved changes will retry.');script.src=url;document.body.append(script);
  });}
  function scheduleRetry(){
    clearTimeout(retryTimer);retryTimer=null;
    if(document.hidden||!retryAt)return;
    retryTimer=setTimeout(()=>{retryTimer=null;sync();},Math.max(0,retryAt-Date.now()));
  }
  async function sync(force=false){
    if(demo||!HUCK_CONFIG.backendUrl||document.hidden)return;
    if(busy){if(pendingRequest&&Date.now()-pendingRequest.startedAt>40000){pendingRequest.cancel();setTimeout(sync,0);}return;}
    if(force===true)retryAt=0;
    if(Date.now()<retryAt){scheduleRetry();return;}
    clearTimeout(retryTimer);retryTimer=null;
    let changed=false;
    busy=true;renderSyncActivity();$('#connection').textContent=stateLabel();
    try{
      // Commands already return authoritative state; do not delay saves with a preliminary read.
      if(!queue.length||queue[0].blocked){const result=await request('snapshot');if(!result.ok)throw Object.assign(Error(result.error),{retryable:temporaryError(result)});changed=acceptSnapshot(result.state)||changed;}
      while(queue.length&&!queue[0].blocked){
        const cmd=queue[0],response=await request('command',cmd);
        if(!response.ok){if(temporaryError(response))throw Object.assign(Error(response.error),{retryable:true});cmd.blocked=response.error;changed=true;notice(response.error);persist();const fresh=await request('snapshot');if(fresh.ok)acceptSnapshot(fresh.state);break;}
        acceptSnapshot(response.state);changed=true;queue.shift();persist();
      }
      lastChecked=Date.now();message='';retryAt=0;retryFailures=0;
    }catch(e){message=e.message;if(temporaryError(e)){retryFailures++;retryAt=Date.now()+Math.min(45000,5000*2**Math.min(retryFailures-1,4))+Math.floor(Math.random()*1500);scheduleRetry();if(retryFailures===1)notice(/lock/i.test(e.message)?'Connection is busy. Saved changes will retry automatically.':message);}else notice(message);}finally{busy=false;persist();if(changed)render();else{renderSyncActivity();$('#connection').textContent=stateLabel();tick();}}
  }
  function notice(text,isError=false){
    clearTimeout(notice.timeout);
    if($('#modal').open&&$('#modal-notice')){
      $('#toast').hidden=true;const message=$('#modal-notice');message.textContent=text;message.classList.toggle('is-error',isError);message.setAttribute('role',isError?'alert':'status');message.hidden=false;message.scrollIntoView({block:'nearest',behavior:'instant'});return;
    }
    $('#toast').textContent=text;$('#toast').hidden=false;notice.timeout=setTimeout(()=>$('#toast').hidden=true,6500);
  }
  function reviewSyncIssue(){
    const cmd=queue.find(c=>c.blocked);if(!cmd)return;
    const detail=`An earlier ${cmd.type} change was rejected: ${cmd.blocked}`;
    const explanation='Saved sleep history is unchanged. Discard only this rejected change to unblock syncing; other pending changes are kept.';
    if($('#modal').open){
      notice(detail+' '+explanation+' Your current draft stays here.',true);
      const button=document.createElement('button');button.className='text-link';button.dataset.discard=cmd.id;button.textContent='Discard rejected change';$('#modal-notice').append(document.createElement('br'),button);
    }else{modal('Sync needs review',`<p>${esc(detail)}</p><p>${explanation}</p>`,`<button data-close>Cancel</button><button class="primary" data-discard="${esc(cmd.id)}">Discard rejected change</button>`);$('#modal').dataset.syncReview='true';}
  }
  function discardRejectedChange(id){
    const cmd=queue.find(c=>c.id===id&&c.blocked);if(!cmd)return;
    // Preserve a local recovery copy before explicitly removing a rejected command.
    try{const backup=JSON.parse(localStorage.getItem('huck-discarded-changes-v1')||'[]');backup.push({discardedAt:Date.now(),command:cmd});localStorage.setItem('huck-discarded-changes-v1',JSON.stringify(backup));}
    catch{return notice('Could not back up the rejected change. Nothing was discarded.',true);}
    queue=queue.filter(c=>c.id!==id);persist();
    const editing=$('#modal').open&&!$('#modal').dataset.syncReview;
    if(!editing)close();render();sync(true);
    notice(editing?'Rejected change removed. Your draft is still here; try Save again. If the entry changed on the other phone, close and reopen it before editing.':'Rejected change removed. Other pending changes will sync normally.');
  }
  function modal(title,body,footer=''){
    delete $('#modal').dataset.syncReview;
    $('#modal-footer').classList.remove('entry-footer');
    $('#modal-title').textContent=title;$('#modal-body').innerHTML=body;$('#modal-footer').innerHTML='<p id="modal-notice" class="modal-notice" role="alert" hidden></p>'+footer;$('#toast').hidden=true;
    if(title==='Settings'&&!demo&&HUCK_CONFIG.backendUrl&&localStorage.getItem('huck-local-backup-v1')){
      $('#modal-body').insertAdjacentHTML('beforeend','<details><summary>Earlier local records</summary><button data-import-local>Import local sleep records</button><button class="text-link" data-download-local>Download backup</button></details>');
    }
    if(title==='Settings'){
      editor.wakeChild=$('#child-select').value;editor.wakeDrafts={};
      $('#child-select').closest('label').insertAdjacentHTML('afterend',`<section class="wake-settings"><details><summary>Wake-window settings</summary><label class="toggle">Show wake-window info<input id="show-wake-info" type="checkbox" ${prefs.wakeInfo?'checked':''}></label><div id="wake-fields"></div></details></section>`);
      renderWakeFields();
    }
    $('#modal').showModal();icons();
  }
  const close=()=>$('#modal').close();
  function nowButton(prefix,title){return `<button type="button" class="time-now" data-now="${prefix}" aria-label="${title}: set to now">${icon('rotate-ccw')}Now</button>`;}
  function timeField(prefix,title,at,showHeader=true){
    return `<fieldset class="time-field" data-time-field="${prefix}" data-title="${title}" data-picker-today="${dateKey(Date.now())}"><legend class="sr-only">${title}</legend>${showHeader?`<div class="time-field-head"><span>${title}</span>${nowButton(prefix,title)}</div>`:''}<input id="${prefix}-date" type="hidden" value="${dateKey(at)}"><input id="${prefix}-time" type="hidden" value="${inputTime(at).split('T')[1]}"><div class="wheel-picker"></div></fieldset>`;
  }
  function entryTime(prefix){
    const date=$('#'+prefix+'-date')?.value,time=$('#'+prefix+'-time')?.value;
    if(!date||!time)return NaN;
    const original=editor?.original?.[prefix];
    return original&&inputTime(original)===`${date}T${time}`?original:parseInput(`${date}T${time}`);
  }
  function setEntryTime(prefix,at){
    $('#'+prefix+'-date').value=dateKey(at);$('#'+prefix+'-time').value=inputTime(at).split('T')[1];
    HuckTimePicker.refresh($(`[data-time-field="${prefix}"]`));updateTimePreview();
  }
  function updateTimePreview(){
    if(editor?.kind!=='entry'||!$('#modal').open||!$('#time-preview'))return;
    $('#modal-notice').hidden=true;
    const start=entryTime('start'),end=editor.hasEnd?entryTime('end'):null;
    let error='';if(!Number.isFinite(start)||(!end&&end!==null))error='Choose a date and time.';
    else if(start>Date.now()||end>Date.now())error='Choose a time in the past or now.';
    else if(end!==null&&end<=start)error='End must be after start.';
    const noun=Number.isFinite(start)?sleepName(start):'sleep';
    $('#time-preview').textContent=error||(end?`${duration(end-start)} ${noun}`:`${duration(Date.now()-start)} so far`);
    const summary=$('#start-summary-value');if(summary&&Number.isFinite(start))summary.textContent=(dateKey(start)===dateKey(Date.now())?'':dateKey(start).slice(5).replace('-','/')+' · ')+clock(start);
    const state=$('.end-state');state.dataset.ended=String(editor.hasEnd);
    state.querySelectorAll('[data-end-state]').forEach(button=>{
      button.setAttribute('aria-pressed',String((button.dataset.endState==='ended')===editor.hasEnd));
      button.textContent=button.dataset.endState==='ended'?(noun==='nap'?'Nap ended':'Sleep ended'):(noun==='nap'?'Still napping':'Still sleeping');
    });
    $('#modal-title').textContent=(editor.id?'Edit ':'Add ')+noun;
    $('#time-preview').classList.toggle('time-invalid',Boolean(error));
    $('[data-save-entry]').disabled=Boolean(error);
  }
  function pastDefaults(s){
    const list=[...entries(s)].sort((a,b)=>a.start-b.start),now=Date.now();let finish=now;
    for(let i=list.length-1;i>=0;i--){const e=list[i];if(e.end&&finish-e.end>=5*60000)return {start:Math.max(e.end,finish-45*60000),end:finish};finish=e.start;}
    return {start:finish-45*60000,end:finish};
  }
  function setEndState(hasEnd,at){
    if(editor.hasEnd&&!hasEnd)editor.endDraft=entryTime('end');
    editor.hasEnd=hasEnd;$('#end-fields').hidden=!hasEnd;
    if(hasEnd)setEntryTime('end',at||editor.endDraft||editor.original?.end||Date.now());
    updateTimePreview();
  }
  function setStartExpanded(expanded){
    const fields=$('#start-fields'),button=$('[data-toggle-start]');fields.hidden=!expanded;$('.start-now').hidden=!expanded;
    button.setAttribute('aria-expanded',String(expanded));button.setAttribute('aria-label',expanded?'Collapse start time':'Edit start time');button.title=expanded?'Collapse start time':'Edit start time';button.innerHTML=icon(expanded?'chevron-up':'pencil');
    if(expanded)HuckTimePicker.mount(fields);icons();
  }
  function openEntry(id,mode){
    if(id&&endReceipt?.id===id)dismissEndConfirmation(false);
    const s=projected(),e=s.entries.find(e=>e.id===id),defaults=mode==='start'?{start:Date.now()-5*60000,end:null}:pastDefaults(s);
    editor={kind:'entry',id,mode,rev:e?.rev,childId:child(s).id,original:e?{start:e.start,end:e.end}:null,hasEnd:Boolean(e?e.end:defaults.end)};
    modal(e?'Edit sleep':'Add sleep',`${e?.autoEnded?'<p class="callout">Auto-ended after a forgotten timer. Adjust the times below.</p>':''}<section class="start-section"><div class="start-summary" ${e?'':'hidden'}><span>Start</span><span id="start-summary-value"></span><button class="start-edit" data-toggle-start aria-expanded="false" aria-controls="start-fields" aria-label="Edit start time" title="Edit start time">${icon('pencil')}</button><span class="start-now" hidden>${e?nowButton('start','Start'):''}</span></div><div id="start-fields" ${e?'hidden':''}>${timeField('start','Start',e?.start||defaults.start,!e)}</div></section><section id="end-section"><div class="time-field-head"><span>End</span><div class="end-state" data-ended="${editor.hasEnd}" role="group" aria-label="Sleep status"><span class="end-state-thumb" aria-hidden="true"></span><button data-end-state="running" aria-pressed="${!editor.hasEnd}" aria-controls="end-fields">Still napping</button><button data-end-state="ended" aria-pressed="${editor.hasEnd}" aria-controls="end-fields">Nap ended</button></div>${nowButton('end','End')}</div><div id="end-fields" ${editor.hasEnd?'':'hidden'}>${timeField('end','End',e?.end||defaults.end||Date.now(),false)}</div></section>`,
      `<p id="time-preview" class="time-preview" role="status"></p><div class="entry-footer-actions"><button class="primary" data-save-entry>${icon('check')}Save</button><button class="entry-cancel" data-close>Cancel</button>${e?`<button class="danger entry-delete" data-delete-entry aria-label="Delete sleep" title="Delete sleep">${icon('trash-2')}</button>`:''}</div>`);
    $('#modal-footer').classList.add('entry-footer');HuckTimePicker.mount($('#modal-body'));
    editor.initial={start:entryTime('start'),end:editor.hasEnd?entryTime('end'):null};
    updateTimePreview();
  }
  function saveEntry(){
    HuckTimePicker.flush($('#modal-body'));
    if($('[data-save-entry]').disabled)return;
    const p={id:editor.id||uuid(),childId:editor.childId,start:entryTime('start'),end:editor.hasEnd?entryTime('end'):null,expectedRev:editor.rev};
    const unchanged=p.start===editor.initial.start&&p.end===editor.initial.end;
    if(unchanged&&editor.id){$('#modal').close();return;}
    if(enqueue(editor.id?'edit':editor.hasEnd?'add':'start',p))$('#modal').close();
  }
  function settings(){
    const s=projected();editor={settingsRevision:s.revision};
    modal('Settings',`<fieldset><legend>Style</legend><div class="style-options">${[['daybook','Daybook','notebook-pen'],['orbit','Orbit','circle'],['compact','Compact','columns-2']].map(([id,label,glyph])=>`<button class="style-option" data-style="${id}" aria-pressed="${prefs.style===id}">${icon(glyph)}<span>${label}</span></button>`).join('')}</div></fieldset><fieldset><legend>Color theme</legend><div class="swatches">${['original','night','berry','mint'].map(t=>`<button class="swatch ${prefs.theme===t?'chosen':''}" data-theme="${t}" title="${t}" aria-label="${t}" aria-pressed="${prefs.theme===t}"><span></span></button>`).join('')}</div></fieldset><label class="toggle">Animations<input type="checkbox" id="motion" ${prefs.motion?'checked':''}></label><label>Child<select id="child-select">${s.children.filter(c=>!c.archived).map(c=>`<option value="${esc(c.id)}" ${c.id===prefs.child?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label><details><summary>Sleep schedule & timer cleanup</summary><div class="field-grid"><label>Day starts<select id="dayStart">${hours(s.settings.dayStart)}</select></label><label>Night starts<select id="nightStart">${hours(s.settings.nightStart)}</select></label>${[['dayLimit','Day cutoff (min)'],['dayReplace','Day replacement (min)'],['nightLimit','Night cutoff (min)'],['nightReplace','Night replacement (min)']].map(([key,label])=>`<label>${label}<input type="number" id="${key}" min="15" max="1440" value="${s.settings[key]}"></label>`).join('')}</div><p class="fine">Shared across phones. Cleanup corrects forgotten logs, not how long your baby should sleep. Uses ${esc(s.settings.timezone)}.</p></details><details><summary>Advanced settings</summary><label>New child<input id="new-child" maxlength="60" autocomplete="off"></label><button data-add-child>${icon('plus')} Add child</button>${s.children.map(c=>`<div class="child-row"><span>${esc(c.name)}</span><button class="text-link" data-archive="${esc(c.id)}" data-archived="${!c.archived}">${c.archived?'Restore':'Archive'}</button></div>`).join('')}<a class="text-link" data-sandbox-link href="${new URL(demo?'./':'?demo=1',root)}" target="_blank" rel="noopener">${demo?'Open real tracker':'Open testing sandbox'}</a><p class="fine">Sandbox uses sample data on this device only. It never changes shared logs.</p><a class="text-link" href="${HUCK_CONFIG.sheetUrl}" target="_blank" rel="noreferrer">Backend spreadsheet</a><button class="text-link" data-sync>Check connection</button>${!demo&&!HUCK_CONFIG.backendUrl?'<p class="fine">Sheet not connected. Records currently stay on this browser. See README for setup.</p>':''}${demo?'<button class="text-link" data-reset-demo>Reset sample history</button>':''}</details>`, '<button class="primary" data-save-settings>Save</button>');
  }
  function hours(selected){return Array.from({length:24},(_,h)=>`<option value="${h}" ${Number(selected)===h?'selected':''}>${h%12||12}:00 ${h<12?'AM':'PM'}</option>`).join('');}
  function wakeProfile(s,id){const p=s.settings.wakeProfiles?.[id]||{};return {birthday:typeof p.birthday==='string'?p.birthday:'',...(p.ranges?{ranges:p.ranges}:{})};}
  function wakeFormProfile(){
    const ranges={};document.querySelectorAll('[data-wake-age]').forEach(row=>{const key=row.dataset.wakeAge,min=Number(row.querySelector('[data-range-min]').value),max=Number(row.querySelector('[data-range-max]').value),original=HuckWake.ranges.find(r=>String(r.before)===key);if(min!==original.min||max!==original.max)ranges[key]={min,max};});
    return {birthday:$('#wake-birthday').value,...(Object.keys(ranges).length?{ranges}:{})};
  }
  function captureWakeDraft(){if($('#wake-birthday'))editor.wakeDrafts[editor.wakeChild]=wakeFormProfile();}
  function ageRangeFields(p){return `<div class="wake-age-heading"><h4>Age ranges</h4><button type="button" class="text-link wake-reset" data-reset-wake-ranges>Reset to defaults</button></div><table class="wake-age-table"><thead><tr><th>Age</th><th>Min · minutes</th><th>Max · minutes</th></tr></thead><tbody>${HuckWake.configuredRanges(p).map(r=>`<tr data-wake-age="${r.before}"><td>${r.label}</td><td><input type="number" inputmode="numeric" min="5" max="720" data-range-min aria-label="${r.label} minimum minutes" value="${r.min}"></td><td><input type="number" inputmode="numeric" min="5" max="720" data-range-max aria-label="${r.label} maximum minutes" value="${r.max}"></td></tr>`).join('')}</tbody></table>`;}
  function renderWakeFields(){
    const s=projected(),p=editor.wakeDrafts[editor.wakeChild]||wakeProfile(s,editor.wakeChild);
    $('#wake-fields').innerHTML=`<label>Birthday<input id="wake-birthday" type="date" data-native-picker max="${dateKey(Date.now())}" value="${esc(p.birthday)}" aria-describedby="wake-birthday-error"></label><p id="wake-birthday-error" class="wake-error" role="status" hidden></p>${ageRangeFields(p)}<p id="wake-profile-preview" class="fine"></p><p class="fine">Birthday and age ranges are shared across phones.</p><p class="fine">Approximate cues, not deadlines. Follow baby’s sleepy and hunger cues.</p><a class="text-link" href="https://health.clevelandclinic.org/wake-windows-by-age" target="_blank" rel="noreferrer">Age ranges & source</a>`;
    updateWakeProfilePreview();
  }
  function updateWakeProfilePreview(){
    if(!$('#wake-birthday'))return;
    const p=wakeFormProfile(),a=HuckWake.age(p.birthday,dateKey(Date.now())),r=HuckWake.range(p,dateKey(Date.now()));
    document.querySelectorAll('[data-wake-age]').forEach(row=>row.classList.toggle('is-current',Number(row.dataset.wakeAge)===r?.before));
    const needsBirthday=$('#show-wake-info').checked&&!a,error=$('#wake-birthday-error');
    error.hidden=!needsBirthday;error.textContent=p.birthday?'Choose a valid birthday in the past or today.':'Birthday required to use wake-window info.';
    $('#wake-birthday').setAttribute('aria-invalid',String(needsBirthday));$('#wake-birthday').setAttribute('aria-required',String($('#show-wake-info').checked));
    $('#wake-profile-preview').textContent=a?a.label+' · '+(r?`${duration(r.min*60000)}–${duration(r.max*60000)}`:'No wake-window range available for this age.') : '';
  }
  function saveSettings(){
    const s=projected(),settings={...s.settings};captureWakeDraft();
    for(const k of ['dayStart','nightStart','dayLimit','dayReplace','nightLimit','nightReplace'])settings[k]=Number($('#'+k).value);
    for(const [id,p] of Object.entries(editor.wakeDrafts)){
      if(p.birthday&&(!HuckWake.validDate(p.birthday)||p.birthday>dateKey(Date.now())))return notice('Choose a birthday in the past or today.');
      if(Object.values(p.ranges||{}).some(r=>!HuckWake.validRange(r)))return notice('Each age range needs 5–720 minutes, with maximum at least minimum.');
      if(JSON.stringify(p)!==JSON.stringify(wakeProfile(s,id)))settings.wakeProfiles={...(settings.wakeProfiles||{}),[id]:p};
    }
    if(JSON.stringify(settings)!==JSON.stringify(s.settings)){if(!enqueue('settings',{settings,expectedRevision:editor.settingsRevision}))return;}
    prefs.child=$('#child-select').value;prefs.motion=$('#motion').checked;prefs.wakeInfo=$('#show-wake-info').checked;persist();close();render();
  }
  function share(){const url=new URL(location.href);url.search='';url.searchParams.set('child',prefs.child);modal('Save / Share',`<div class="install-heading"><img src="${new URL('shared/app-icon.png?v=20261030-pacifier',root)}" width="50" height="50" alt=""><div><h3>Save Huck to your phone</h3><small>${esc(child().name)}’s sleep, one tap away.</small></div></div><h4>iPhone</h4><p>Open in Safari. Tap Share, then Add to Home Screen.</p><h4>Android</h4><p>Open in Chrome. Tap ⋮, then Add to Home screen or Install app.</p><hr><label>Share ${esc(child().name)}’s tracker<input id="share-url" readonly value="${esc(url.href)}"></label>`,'<button class="primary" data-copy>Copy link</button>');}
  document.addEventListener('click',event=>{
    const t=event.target.closest('button,a');if(!t)return;
    if(t.matches('[data-toggle-start]'))setStartExpanded($('#start-fields').hidden);
    if(t.matches('[data-adjust-ended]')){const id=endReceipt?.id,starting=endReceipt?.kind==='start';dismissEndConfirmation(false);if(id){openEntry(id);if(starting)setStartExpanded(true);}}
    if(t.matches('[data-resume-ended]')){if(endReceipt?.kind==='start')confirmCancelStarted();else confirmResumeEnded();}
    if(t.matches('[data-confirm-resume]')&&editor.kind==='resume'){if(enqueue('edit',{id:editor.id,childId:editor.childId,start:editor.start,end:null,expectedRev:editor.rev}))close();}
    if(t.matches('[data-confirm-cancel-start]')&&editor.kind==='cancel-start'){if(enqueue('delete',{id:editor.id,childId:editor.childId,expectedRev:editor.rev}))close();}
    if(t.matches('[data-dismiss-ended]'))dismissEndConfirmation();
    if(t.matches('[data-end-state]'))setEndState(t.dataset.endState==='ended');
    if(t.matches('[data-now]')){if(t.dataset.now==='end')setEndState(true,Date.now());else setEntryTime(t.dataset.now,Date.now());}
    if(t.matches('[data-start]')){const id=uuid();if(enqueue('start',{id,childId:child().id,start:Date.now()-Number(t.dataset.start)*60000}))showEndConfirmation(id,'start');}
    if(t.matches('[data-end]')){const r=C.active(projected(),child().id);if(r&&enqueue('end',{id:r.id,childId:r.childId,end:Date.now()-Number(t.dataset.end)*60000,expectedRev:r.rev}))showEndConfirmation(r.id);}
    if(t.matches('[data-edit],[data-open-end]')){openEntry(t.dataset.edit||t.dataset.openEnd);if(t.hasAttribute('data-open-start'))setStartExpanded(true);if(t.hasAttribute('data-open-end')&&!editor.hasEnd)setEndState(true,Date.now());}
    if(t.matches('[data-custom-start]'))openEntry(null,'start');
    if(t.matches('[data-add]'))openEntry();
    if(t.matches('[data-more-naps]')){const napKey=child().id+':'+periodDate(Date.now());expandedNaps=expandedNaps===napKey?'':napKey;render();}
    if(t.matches('[data-close]'))close();
    if(t.matches('[data-save-entry]'))saveEntry();
    if(t.matches('[data-delete-entry]')){const entry={...editor,kind:'delete'};modal('Delete this sleep?','<p>This removes the sleep from the chart. Its history remains in the Sheet.</p>','<button data-close>Keep sleep</button><button class="danger" data-confirm-delete>Delete sleep</button>');editor=entry;}
    if(t.matches('[data-confirm-delete]')){if(enqueue('delete',{id:editor.id,childId:editor.childId,expectedRev:editor.rev}))close();}
    if(t.matches('[data-settings]'))settings();
    if(t.matches('[data-wake-details]'))wakeDetails();
    if(t.matches('[data-reset-wake-ranges]')){document.querySelectorAll('[data-wake-age]').forEach(row=>{const r=HuckWake.ranges.find(r=>r.before===Number(row.dataset.wakeAge));row.querySelector('[data-range-min]').value=r.min;row.querySelector('[data-range-max]').value=r.max;});updateWakeProfilePreview();}
    if(t.matches('[data-save-settings]'))saveSettings();
    if(t.matches('[data-theme]')){prefs.theme=t.dataset.theme;persist();render();document.querySelectorAll('button[data-theme]').forEach(b=>{b.classList.toggle('chosen',b===t);b.setAttribute('aria-pressed',b===t);});}
    if(t.matches('[data-style]')){prefs.style=t.dataset.style;persist();render();document.querySelectorAll('button[data-style]').forEach(b=>b.setAttribute('aria-pressed',String(b===t)));}
    if(t.matches('[data-add-child]')){const name=$('#new-child').value;if(enqueue('child',{id:'child-'+uuid(),name}))settings();}
    if(t.matches('[data-archive]')){const id=t.dataset.archive, archived=t.dataset.archived==='true';modal(archived?'Archive child?':'Restore child?',`<p>${archived?'Sleep history will be kept.':'This child will be available again.'}</p>`,`<button data-close>Cancel</button><button class="primary" data-confirm-archive="${esc(id)}" data-archived="${archived}">${archived?'Archive':'Restore'}</button>`);}
    if(t.matches('[data-confirm-archive]')){if(enqueue('archive',{childId:t.dataset.confirmArchive,archived:t.dataset.archived==='true'}))settings();}
    if(t.matches('[data-share]'))share();
    if(t.matches('[data-copy]')){const input=$('#share-url');navigator.clipboard?.writeText(input.value).then(()=>notice('Link copied.')).catch(()=>{input.select();notice('Select and copy the link.');});}
    if(t.matches('[data-sync]')){sync(true);notice(HUCK_CONFIG.backendUrl?'Checking connection…':'Backend not connected yet.');}
    if(t.matches('[data-older]'))loadOlderHistory();
    if(t.matches('[data-history-entry]'))selectHistory(t.dataset.historyEntry);
    if(t.matches('[data-clear-history]'))selectHistory(null);
    if(t.matches('[data-today]')){$('#chart-scroll').scrollLeft=$('#chart-scroll').scrollWidth;}
    if(t.matches('[data-review]'))reviewSyncIssue();
    if(t.matches('[data-discard]'))discardRejectedChange(t.dataset.discard);
    if(t.matches('[data-reset-demo]')){base=sample();queue=[];persist();close();render();}
    if(t.matches('[data-download-local]')){const blob=new Blob([localStorage.getItem('huck-local-backup-v1')],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='huck-local-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
    if(t.matches('[data-import-local]')){
      try{
        const backup=JSON.parse(localStorage.getItem('huck-local-backup-v1'));let next=projected();const commands=[];
        for(const c of backup.children.filter(c=>!c.archived)){if(!next.children.some(other=>other.id===c.id)){const cmd={id:uuid(),type:'child',payload:{id:c.id,name:c.name},createdAt:Date.now()};next=C.apply(next,cmd,Date.now());commands.push(cmd);}}
        for(const e of backup.entries.filter(e=>!e.deleted).sort((a,b)=>a.start-b.start)){
          if(next.entries.some(other=>other.id===e.id))continue;
          const cmd={id:uuid(),type:e.end?'add':'start',payload:{id:e.id,childId:e.childId,start:e.start,end:e.end},createdAt:Date.now()};next=C.apply(next,cmd,Date.now());commands.push(cmd);
        }
        queue.push(...commands);persist();close();render();sync();notice(commands.length?'Import queued. Backup is kept.':'All local entries are already present.');
      }catch(e){notice('Import stopped; backup kept. '+e.message);}
    }
  });
  $('#modal').addEventListener('click',e=>{if(e.target===$('#modal')){const b=e.target.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)close();}});
  $('#modal').addEventListener('close',()=>editor=null);
  $('#modal').addEventListener('cancel',event=>{event.preventDefault();close();});
  $('#modal').addEventListener('change',event=>{
    const t=event.target;
    if(t.id==='child-select'&&editor?.wakeDrafts){captureWakeDraft();editor.wakeChild=t.value;renderWakeFields();}
    if(t.id==='show-wake-info'){prefs.wakeInfo=t.checked;persist();render();updateWakeProfilePreview();}
    updateTimePreview();
  });
  $('#modal').addEventListener('input',()=>{updateTimePreview();updateWakeProfilePreview();});
  function reopenAtTop(){
    const reset=()=>window.scrollTo({top:0,left:0,behavior:'instant'});
    reset();requestAnimationFrame(reset);
  }
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){sync();render();reopenAtTop();}else{clearTimeout(retryTimer);retryTimer=null;}});
  $('#chart-scroll').addEventListener('scroll',()=>{if($('#chart-scroll').scrollLeft<60)loadOlderHistory();},{passive:true});
  window.addEventListener('focus',()=>{if(Date.now()-lastChecked>5000)sync();});
  window.addEventListener('online',()=>sync(true));
  window.addEventListener('resize',()=>requestAnimationFrame(fitElapsed));
  window.addEventListener('pageshow',e=>{reopenAtTop();if(e.persisted)sync();});
  window.addEventListener('load',reopenAtTop,{once:true});
  const requested=new URL(location.href).searchParams.get('child');if(requested)prefs.child=requested;
  render();reopenAtTop();sync();
  setInterval(()=>{if(!document.hidden)tick();},1000);
  setInterval(()=>{if(!document.hidden){if(!$('#modal').open)render();sync();}},15000);
  window.HuckTest={getState:projected,enqueue,sync,periodDate,wallTime,parseInput};
})();
