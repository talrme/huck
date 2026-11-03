(function(root){
  'use strict';
  function wakeIntervals(entries){
    const sleeps=entries.filter(e=>!e.deleted).slice().sort((a,b)=>a.start-b.start),gaps=[];
    for(let i=1;i<sleeps.length;i++){
      const before=sleeps[i-1],after=sleeps[i];
      if(!before.end||after.start<=before.end)continue;
      gaps.push({id:encodeURIComponent(before.id)+':'+encodeURIComponent(after.id),before:before.id,after:after.id,start:before.end,end:after.start,approximate:Boolean(before.autoEnded)});
    }
    return gaps;
  }
  root.HuckVisuals={wakeIntervals};
  if(typeof module!=='undefined')module.exports=root.HuckVisuals;
})(typeof globalThis!=='undefined'?globalThis:this);
