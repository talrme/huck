(() => {
  'use strict';
  const rowHeight=36,controllers=new WeakMap();
  function mount(field){
    if(!field||!field.getClientRects().length)return;
    if(controllers.has(field))return controllers.get(field);
    const prefix=field.dataset.timeField,date=field.querySelector('#'+prefix+'-date'),time=field.querySelector('#'+prefix+'-time'),today=field.dataset.pickerToday;
    const shift=(d,n)=>{const t=new Date(d+'T12:00:00Z');t.setUTCDate(t.getUTCDate()+n);return t.toISOString().slice(0,10);};
    const dates=Array.from({length:731},(_,i)=>shift(today,i-730));
    if(!dates.includes(date.value))dates.unshift(date.value);
    const sameYear=new Intl.DateTimeFormat('en-US',{weekday:'short',month:'numeric',day:'numeric',timeZone:'UTC'}),otherYear=new Intl.DateTimeFormat('en-US',{month:'numeric',day:'numeric',year:'2-digit',timeZone:'UTC'});
    const label=d=>d===today?'Today':d===shift(today,-1)?'Yesterday':(d.slice(0,4)===today.slice(0,4)?sameYear:otherYear).format(new Date(d+'T12:00:00Z'));
    const specs=[['day','Day',dates,dates.map(label)],['hour','Hour',Array.from({length:12},(_,i)=>String(i+1))],['minute','Minute',Array.from({length:60},(_,i)=>String(i).padStart(2,'0'))],['period','AM or PM',['AM','PM']]];
    const wheels=[];let updating=false;
    function notify(){
      const [d,h,m,p]=wheels.map(w=>w.values[w.index]);
      date.value=d;time.value=String(Number(h)%12+(p==='PM'?12:0)).padStart(2,'0')+':'+m;
      field.dispatchEvent(new Event('input',{bubbles:true}));
    }
    function paint(w){
      let position=w.el.scrollTop/rowHeight,row=Math.max(0,Math.min(w.el.children.length-1,Math.round(position)));
      const index=w.loop?row%w.values.length:row;
      // Recenter matching copies away from either end without changing the selected minute.
      if(w.loop&&(row<w.values.length||row>=w.values.length*4)){
        const centered=w.values.length*2+index;position+=centered-row;row=centered;w.el.scrollTop=position*rowHeight;
      }
      for(const node of w.visible||[])node.removeAttribute('style');
      w.visible=[];
      for(let i=Math.max(0,row-3);i<=Math.min(w.el.children.length-1,row+3);i++){
        const node=w.el.children[i],offset=i-position;
        node.style.transform=`perspective(240px) rotateX(${-offset*18}deg)`;node.style.opacity=String(Math.max(.15,1-Math.abs(offset)*.3));w.visible.push(node);
      }
      w.el.setAttribute('aria-valuenow',String(index));w.el.setAttribute('aria-valuetext',w.labels[index]);
      const changed=w.index!==index;w.index=index;w.row=row;if(changed&&!updating)notify();
    }
    for(const [kind,title,values,labels=values] of specs){
      const column=document.createElement('div');column.className='wheel-column';
      const caption=document.createElement('span');caption.className='wheel-caption';caption.textContent=title==='AM or PM'?'AM/PM':title;
      const el=document.createElement('div');el.className='time-wheel';el.dataset.wheel=kind;el.tabIndex=0;el.setAttribute('role','spinbutton');el.setAttribute('aria-label',field.dataset.title+' '+title);el.setAttribute('aria-valuemin','0');el.setAttribute('aria-valuemax',String(values.length-1));
      const loop=kind==='minute',copies=loop?5:1;
      for(let i=0;i<labels.length*copies;i++){const node=document.createElement('div');node.className='wheel-value';node.dataset.index=i;node.textContent=labels[i%labels.length];node.setAttribute('aria-hidden','true');el.append(node);}
      column.append(caption,el);field.querySelector('.wheel-picker').append(column);
      const w={el,values,labels,index:0,row:0,loop};wheels.push(w);
      const choose=(i,physical=false)=>{const row=loop&&!physical?w.row+i-w.index:i;el.scrollTop=Math.max(0,Math.min(el.children.length-1,row))*rowHeight;paint(w);};
      el.addEventListener('scroll',()=>paint(w),{passive:true});
      el.addEventListener('click',event=>{const item=event.target.closest('[data-index]');if(item)choose(Number(item.dataset.index),true);});
      el.addEventListener('keydown',event=>{
        const offsets={ArrowUp:-1,ArrowDown:1,PageUp:-5,PageDown:5};
        if(event.key in offsets){event.preventDefault();choose(w.index+offsets[event.key]);}
        else if(event.key==='Home'||event.key==='End'){event.preventDefault();choose(event.key==='Home'?0:values.length-1);}
      });
    }
    function refresh(){
      updating=true;const [hour,minute]=time.value.split(':'),values=[date.value,String(Number(hour)%12||12),minute,Number(hour)<12?'AM':'PM'];
      wheels.forEach((w,i)=>{w.index=Math.max(0,w.values.indexOf(values[i]));w.el.scrollTop=(w.index+(w.loop?w.values.length*2:0))*rowHeight;paint(w);});updating=false;
    }
    const controller={refresh,flush:()=>{updating=true;wheels.forEach(paint);updating=false;notify();}};
    controllers.set(field,controller);refresh();return controller;
  }
  window.HuckTimePicker={mount:root=>root.querySelectorAll('[data-time-field]').forEach(mount),refresh:field=>mount(field)?.refresh(),flush:root=>root.querySelectorAll('[data-time-field]').forEach(field=>{if(field.getClientRects().length)mount(field)?.flush();})};
})();
