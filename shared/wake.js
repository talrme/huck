(function(root){
  'use strict';
  const legacyRanges=[
    {before:1,min:30,max:60,label:'Under 1 month'},
    {before:3,min:60,max:120,label:'1–2 months'},
    {before:5,min:75,max:150,label:'3–4 months'},
    {before:7,min:120,max:240,label:'5–6 months'},
    {before:10,min:150,max:270,label:'7–9 months'},
    {before:12,min:180,max:360,label:'10–11 months'}
  ];
  const ranges=[
    {before:1,beforeDays:28,min:45,max:60,label:'0–4 weeks'},
    {before:2,beforeDays:56,min:60,max:75,label:'4–8 weeks'},
    {before:4,min:75,max:90,label:'2–3 months'},
    {before:5,min:90,max:120,label:'4 months'},
    {before:7,min:120,max:150,label:'5–6 months'},
    {before:9,min:150,max:180,label:'7–8 months'},
    {before:13,min:180,max:240,label:'9–12 months'}
  ];
  const guideUrl='https://docs.google.com/document/d/1qQL-HxmINgJCCvArtJ-SCII5kObWh8WlR1K6LfQDQXg/edit?tab=t.0#heading=h.xsxr01xg3wdc';
  function validDate(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;}
  function age(birthday,today){
    if(!validDate(birthday)||!validDate(today)||birthday>today)return null;
    const [y,m,d]=birthday.split('-').map(Number),[ty,tm,td]=today.split('-').map(Number);
    const days=Math.floor((Date.parse(today+'T12:00:00Z')-Date.parse(birthday+'T12:00:00Z'))/86400000);
    const anniversary=Math.min(d,new Date(Date.UTC(ty,tm,0)).getUTCDate());
    const months=(ty-y)*12+tm-m-(td<anniversary?1:0);
    return {days,months,weeks:Math.floor(days/7),label:days<91?`${Math.floor(days/7)} weeks`:`${months} months`};
  }
  function validRange(r){return Number.isFinite(r?.min)&&Number.isFinite(r?.max)&&r.min>=5&&r.max>=r.min&&r.max<=720;}
  // Keep existing customized age bands intact until the owner explicitly resets them.
  function version(profile){return profile?.rangesVersion===2||!Object.keys(profile?.ranges||{}).length?2:1;}
  function defaults(v=2){return v===1?legacyRanges:ranges;}
  function configuredRanges(profile){return defaults(version(profile)).map(r=>{const edit=profile?.ranges?.[r.before];return validRange(edit)?{...r,min:edit.min,max:edit.max}:r;});}
  function range(profile,today){
    const a=age(profile?.birthday,today);return a?configuredRanges(profile).find(r=>r.beforeDays?a.days<r.beforeDays:a.months<r.before)||null:null;
  }
  function assess(last,profile,now,today,night=false){
    const window=range(profile,today),childAge=age(profile?.birthday,today);
    if(!last||!Number.isFinite(last.end)||last.end>now||last.end<=last.start)return {quality:'unknown',phase:'unknown',label:'Wake time unknown',window,age:childAge};
    const elapsed=Math.max(0,now-last.end),staleAfter=Math.max(180,2*(window?.max||180))*60000;
    if(elapsed>=staleAfter)return {quality:'stale',phase:'unknown',label:'Logs may be missing',elapsed,window,age:childAge};
    if(last.autoEnded)return {quality:'estimated',phase:'unknown',label:'Estimated wake time',elapsed,window,age:childAge};
    if(night)return {quality:'recorded',phase:'night',label:'Nighttime',elapsed,window,age:childAge};
    if(!window)return {quality:'recorded',phase:'unconfigured',label:childAge?'No age range available':'Birthday required for wake cues',elapsed,window,age:childAge};
    const minutes=elapsed/60000,phase=minutes<window.min?'early':minutes<=window.max?'range':'past';
    return {quality:'recorded',phase,label:{early:'Recently awake',range:'Within usual nap range',past:'Beyond usual range'}[phase],elapsed,window,age:childAge,percent:Math.min(100,Math.round(minutes/window.max*100))};
  }
  function cue(info){
    if(info.quality!=='recorded'||!info.window||!['early','range','past'].includes(info.phase)||info.elapsed<Math.max(0,info.window.min-15)*60000)return null;
    return {min:info.window.min,max:info.window.max,phase:info.phase};
  }
  root.HuckWake={ranges,defaults,version,guideUrl,configuredRanges,validRange,validDate,age,range,assess,cue};
  if(typeof module!=='undefined')module.exports=root.HuckWake;
})(typeof globalThis!=='undefined'?globalThis:this);
