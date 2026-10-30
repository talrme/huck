(function(root){
  'use strict';
  const ranges=[
    {before:1,min:30,max:60,label:'Under 1 month'},
    {before:3,min:60,max:120,label:'1–2 months'},
    {before:5,min:75,max:150,label:'3–4 months'},
    {before:7,min:120,max:240,label:'5–6 months'},
    {before:10,min:150,max:270,label:'7–9 months'},
    {before:12,min:180,max:360,label:'10–11 months'}
  ];
  function validDate(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;}
  function age(birthday,today){
    if(!validDate(birthday)||!validDate(today)||birthday>today)return null;
    const [y,m,d]=birthday.split('-').map(Number),[ty,tm,td]=today.split('-').map(Number);
    const days=Math.floor((Date.parse(today+'T12:00:00Z')-Date.parse(birthday+'T12:00:00Z'))/86400000);
    const anniversary=Math.min(d,new Date(Date.UTC(ty,tm,0)).getUTCDate());
    const months=(ty-y)*12+tm-m-(td<anniversary?1:0);
    return {days,months,weeks:Math.floor(days/7),label:days<91?`${Math.floor(days/7)} weeks`:`${months} months`};
  }
  function range(profile,today){
    if(profile?.mode==='custom'){
      const min=Number(profile.min),max=Number(profile.max);
      return Number.isFinite(min)&&Number.isFinite(max)&&min>=5&&max>=min&&max<=720?{min,max,label:'Custom range',custom:true}:null;
    }
    const a=age(profile?.birthday,today);return a?ranges.find(r=>a.months<r.before)||null:null;
  }
  function assess(last,profile,now,today,night=false){
    const window=range(profile,today),childAge=age(profile?.birthday,today);
    if(!last||!Number.isFinite(last.end)||last.end>now||last.end<=last.start)return {quality:'unknown',phase:'unknown',label:'Wake time unknown',window,age:childAge};
    const elapsed=Math.max(0,now-last.end),staleAfter=Math.max(180,2*(window?.max||180))*60000;
    if(elapsed>=staleAfter)return {quality:'stale',phase:'unknown',label:'Logs may be missing',elapsed,window,age:childAge};
    if(last.autoEnded)return {quality:'estimated',phase:'unknown',label:'Estimated wake time',elapsed,window,age:childAge};
    if(night)return {quality:'recorded',phase:'night',label:'Nighttime',elapsed,window,age:childAge};
    if(!window)return {quality:'recorded',phase:'unconfigured',label:childAge?'Set a custom wake range':'Add birthday for wake cues',elapsed,window,age:childAge};
    const minutes=elapsed/60000,phase=minutes<window.min?'early':minutes<=window.max?'range':'past';
    return {quality:'recorded',phase,label:{early:'Recently awake',range:'Within usual nap range',past:'Beyond usual range'}[phase],elapsed,window,age:childAge,percent:Math.min(100,Math.round(minutes/window.max*100))};
  }
  root.HuckWake={ranges,validDate,age,range,assess};
  if(typeof module!=='undefined')module.exports=root.HuckWake;
})(typeof globalThis!=='undefined'?globalThis:this);
