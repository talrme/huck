const {chromium}=require('playwright'),assert=require('node:assert/strict'),C=require('../shared/core.js');
const now=Date.parse('2026-11-01T20:00:00Z');
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  async function open(style='daybook',time=now,options={}){
   const state=C.initial();state.settings.wakeProfiles={avi:{birthday:options.noBirthday?'':'2026-09-18',ranges:{3:{min:60,max:75}}}};if(!options.missing)state.entries=[{id:'last',childId:'avi',start:time-90*60000,end:time-45*60000,rev:1,deleted:false,autoEnded:Boolean(options.autoEnded)}];
   const c=await b.newContext({viewport:{width:390,height:844},timezoneId:'America/Los_Angeles',reducedMotion:'reduce'}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.clock.setFixedTime(time);await p.addInitScript(({base,style})=>localStorage.setItem('huck-sample-v1',JSON.stringify({base,prefs:{style,motion:false,wakeInfo:true},queue:[]})),{base:state,style});await p.goto('http://127.0.0.1:5190/?demo=1');return {p,c,errors};
  }
  for(const style of ['daybook']){
   const {p,c,errors}=await open(style);
   for(const [minutes,phase] of [[0,null],[44,null],[45,'early'],[59,'early'],[60,'range'],[75,'range'],[76,'past'],[180,null]]){
    await p.clock.setFixedTime(now+(minutes-45)*60000);await p.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));assert.equal(await p.locator('#wake-window').isVisible(),Boolean(phase),minutes+' minute visibility');assert.equal(await p.locator('#sleep-delay,.delay-row,.wake-meter').count(),0);
    if(phase){assert.equal(await p.locator('#wake-window').getAttribute('data-phase'),phase);assert.equal(await p.locator('[data-wake-details]').innerText(),'Target wake window 60–75 min');const cue=await p.locator('#wake-window').boundingBox(),actions=await p.locator('#actions').boundingBox();assert(cue.y>=actions.y+actions.height,'Cue is below buttons');assert(cue.height<=40);}
   }
   await p.clock.setFixedTime(now+31*60000);await p.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
   const colors=[];for(const theme of ['original','night','berry','mint']){
    await p.evaluate(theme=>document.body.dataset.theme=theme,theme);
    for(const width of [320,390,1280]){await p.setViewportSize({width,height:844});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert(await p.locator('.wake-info').evaluate(e=>e.scrollWidth<=e.clientWidth));}
    await p.setViewportSize({width:390,height:844});await p.screenshot({path:`/tmp/huck-quiet-awake-${style}-${theme}.png`});
   }
   for(const minutes of [45,60,76]){await p.clock.setFixedTime(now+(minutes-45)*60000);await p.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));colors.push(await p.locator('.wake-range').evaluate(e=>getComputedStyle(e).color));}assert.equal(new Set(colors).size,3);
   await p.locator('[data-wake-details]').click();assert(await p.getByRole('heading',{name:'Wake-window guide'}).isVisible());await p.locator('[data-close]').click();await p.locator('[data-start="0"]').click();assert(!(await p.locator('#wake-window').isVisible()));assert.deepEqual(errors,[]);await c.close();console.log('PASS '+style+': 45/60/75min boundaries, hidden early/stale, no sliders/meter, below buttons, subtle colors, all themes/widths');
  }
  for(const [time,options] of [[Date.parse('2026-11-02T05:00:00Z'),{}],[now,{autoEnded:true}],[now,{missing:true}],[now,{noBirthday:true}]]){const {p,c}=await open('daybook',time,options);assert(!(await p.locator('#wake-window').isVisible()));await c.close();}
  console.log('PASS night, estimated, missing and birthday-required suppression');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
