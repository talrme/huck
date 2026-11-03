(function(root){
  'use strict';
  const labels={ambient:'Floating Zs & idle movement',counter:'Rolling timer numbers',mascotReaction:'Mascot start/end reactions',stateRipple:'Awake/sleep color ripple',iconPop:'Mascot change pop',listExpand:'Staggered entry expansion',celebration:'Nighttime sleep celebrations',arrival:'Sleep flies into recent entries'};
  const presets={off:Object.fromEntries(Object.keys(labels).map(k=>[k,false])),gentle:{ambient:true,counter:true,mascotReaction:true,stateRipple:false,iconPop:true,listExpand:true,celebration:false,arrival:true},playful:Object.fromEntries(Object.keys(labels).map(k=>[k,true]))};
  function normalize(value,legacy=true){const fallback=legacy?presets.playful:presets.off;return Object.fromEntries(Object.keys(labels).map(k=>[k,typeof value?.[k]==='boolean'?value[k]:fallback[k]]));}
  const effects=new Set();let counter=null;
  function enabled(prefs,key){return Boolean(prefs.motion&&prefs.animations?.[key]&&!root.matchMedia?.('(prefers-reduced-motion: reduce)').matches&&!root.document?.hidden);}
  function animate(node,frames,options,remove=false){
    const a=node.animate(frames,options);const stop=()=>{a.cancel();if(remove)node.remove();};effects.add(stop);
    a.finished.catch(()=>{}).finally(()=>{effects.delete(stop);if(remove)node.remove();});return a;
  }
  function stopCounter(){if(counter){cancelAnimationFrame(counter.frame);counter=null;}}
  function roll({from,to,main,seconds,format,fit,allowed}){
    stopCounter();const start=performance.now(),run={};counter=run;
    function frame(time){
      if(counter!==run)return;
      const progress=Math.min(1,Math.max(0,(time-start)/1000)),p=1-(1-progress)**3,ms=from+(to-from)*p;
      if(!allowed()){main.textContent=format(to);seconds.textContent=String(Math.floor(to/1000)%60).padStart(2,'0')+'s';stopCounter();fit();return;}
      main.textContent=format(ms);seconds.textContent=String(Math.floor(ms/1000)%60).padStart(2,'0')+'s';fit();
      if(progress<1)run.frame=requestAnimationFrame(frame);else counter=null;
    }
    run.frame=requestAnimationFrame(frame);
  }
  function mascot(node,sleeping){animate(node,sleeping?[{transform:'scale(1) rotate(0)'},{transform:'translateY(4px) scale(.92) rotate(-9deg)',offset:.5},{transform:'scale(1) rotate(0)'}]:[{transform:'scale(1)'},{transform:'translateY(-12px) rotate(-12deg) scale(1.1)',offset:.35},{transform:'translateY(-5px) rotate(12deg)',offset:.65},{transform:'scale(1)'}],{duration:sleeping?700:850,easing:'ease-out'});}
  function pop(node){animate(node,[{transform:'scale(.6) rotate(-18deg)',opacity:.4},{transform:'scale(1.18) rotate(9deg)',opacity:1,offset:.65},{transform:'scale(1) rotate(0)'}],{duration:420,easing:'ease-out'});}
  function ripple(origin,color){
    const layer=document.createElement('div');layer.className='state-ripple';layer.setAttribute('aria-hidden','true');const dot=document.createElement('i');layer.append(dot);document.body.append(layer);
    Object.assign(dot.style,{left:origin.x+'px',top:origin.y+'px',background:color});
    animate(layer,[{opacity:.16},{opacity:0}],{duration:850,easing:'ease-out'},true);animate(dot,[{transform:'translate(-50%,-50%) scale(0)'},{transform:'translate(-50%,-50%) scale('+Math.hypot(innerWidth,innerHeight)/10+')'}],{duration:850,easing:'cubic-bezier(.2,.7,.2,1)'});
  }
  function expand(nodes){nodes.forEach((node,i)=>animate(node,[{opacity:0,transform:'translateY(-8px) scale(.98)'},{opacity:1,transform:'none'}],{duration:300,delay:Math.min(i,8)*55,easing:'ease-out',fill:'backwards'}));}
  function celebrate(text){
    const layer=document.createElement('div');layer.className='celebration-confetti';layer.setAttribute('aria-hidden','true');document.body.append(layer);
    for(let i=0;i<42;i++){const bit=document.createElement('i'),side=i%2;bit.style.background=['#efbc50','#e0758c','#68b8a0','#889de9','#da8d58'][i%5];bit.style.left=(side?'85%':'15%');layer.append(bit);animate(bit,[{transform:'translate(0,0) rotate(0)',opacity:1},{transform:`translate(${(side?-1:1)*(30+Math.random()*180)}px,${-100-Math.random()*220}px) rotate(${Math.random()*500}deg)`,opacity:1,offset:.55},{transform:`translate(${(side?-1:1)*(50+Math.random()*180)}px,60px) rotate(${500+Math.random()*500}deg)`,opacity:0}],{duration:1500+Math.random()*600,easing:'ease-out'},true);}
    const message=document.createElement('div');message.className='celebration-note';message.setAttribute('role','status');message.textContent=text;document.body.append(message);
    animate(message,[{opacity:0,transform:'translate(-50%,12px)'},{opacity:1,transform:'translate(-50%,0)',offset:.1},{opacity:1,transform:'translate(-50%,0)',offset:.85},{opacity:0,transform:'translate(-50%,6px)'}],{duration:4200,fill:'both'},true);
    animate(layer,[{opacity:1},{opacity:1}],{duration:2300},true);
  }
  function clear(){stopCounter();for(const stop of effects)stop();effects.clear();}
  root.HuckMotion={labels,presets,normalize,enabled,roll,stopCounter,isRolling:()=>Boolean(counter),mascot,pop,ripple,expand,celebrate,clear};
  if(typeof module!=='undefined')module.exports=root.HuckMotion;
})(typeof globalThis!=='undefined'?globalThis:this);
