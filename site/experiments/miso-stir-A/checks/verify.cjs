// Node-only exercise of the actual entry point. No browser, GPU or loudspeaker.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const dir=path.resolve(__dirname,'..');
class Events {
  listeners=new Map();
  addEventListener(name,fn){if(!this.listeners.has(name))this.listeners.set(name,[]);this.listeners.get(name).push(fn);}
  fire(name,fields={}){const e={preventDefault(){e.prevented=true;},...fields};for(const f of this.listeners.get(name)||[])f(e);return e;}
}
const doc=new Events(),win=new Events(),canvas=new Events(),insets={};
let w=390,h=844,now=0,rafId=0,captured=null,pixelRatio=0,soundStarts=0,notes=0,suspends=0,resumes=0,audio=null;
let top=47,bottom=34;
canvas.getBoundingClientRect=()=>({width:w,height:h,left:0,top:0});
insets.getBoundingClientRect=()=>({left:0,right:w,top,bottom:h-bottom});
canvas.setPointerCapture=id=>{captured=id;};canvas.hasPointerCapture=id=>id===captured;
canvas.releasePointerCapture=()=>{captured=null;};
doc.getElementById=id=>id==='kitchen'?canvas:insets;
const queue=new Map();
function requestAnimationFrame(fn){queue.set(++rafId,fn);return rafId;}
function cancelAnimationFrame(id){queue.delete(id);}
function tick(duration=1/60){
 now+=duration*1000;const list=[...queue.values()];queue.clear();for(const f of list)f(now);
}
const param=()=>({setValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(){}});
const node=()=>({connect(){},disconnect(){},frequency:param(),Q:param(),gain:param(),start(){},stop(){}});
class AudioMock{
 constructor(){audio=this;this.state='suspended';this.sampleRate=8000;this.destination={};}
 get currentTime(){return now/1000;}
 createGain(){return node();}createBiquadFilter(){return node();}
 createBuffer(_,size){return {getChannelData(){return new Float32Array(size);}};}
 createBufferSource(){soundStarts++;return node();}createOscillator(){notes++;return node();}
 resume(){resumes++;this.state='running';return Promise.resolve();}
 suspend(){suspends++;this.state='suspended';return Promise.resolve();}
}
const renderStats={};
class RendererMock{
 constructor(){this.shadowMap={};}
 setPixelRatio(x){pixelRatio=x;}
 setSize(){}
 render(scene,cam){scene.updateMatrixWorld();cam.updateMatrixWorld();renderStats.calls=(renderStats.calls||0)+1;}
}
win.AudioContext=AudioMock;win.devicePixelRatio=3;win.visualViewport=new Events();
const ctx=vm.createContext({console,document:doc,window:win,visualViewport:win.visualViewport,requestAnimationFrame,cancelAnimationFrame,RendererMock});
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
for(const [,file] of html.matchAll(/<script src="([^"]+)"/g)){
 let code=fs.readFileSync(path.join(dir,file),'utf8');
 if(file==='three.min.js')code+=';THREE={...THREE,WebGLRenderer:RendererMock};';
 // Read-only probes, only in this headless test copy of the entry.
 if(file==='play.js')code=code.replace('resize();cook.update();','globalThis.lab={scene,cam,s,cook,props,guide,screen,ray,pointer};resize();cook.update();');
 vm.runInContext(code,ctx,{filename:file});
}
const {s,scene,cam,cook,props}=ctx.lab,T=ctx.THREE;
const vec=(x,y,z)=>new T.Vector3(x,y,z);
function project(v){const p=v.clone().project(cam);return {x:(p.x+1)*w/2,y:(1-p.y)*h/2};}
function event(n,p,id=1,primary=true){return canvas.fire(n,{clientX:p.x,clientY:p.y,pointerId:id,isPrimary:primary,button:0});}
function down(){return event('pointerdown',project(cook.spoonTip));}
function move(x,z){return event('pointermove',project(vec(x*1.17,1.105,z*1.17)));}
function up(){canvas.fire('pointerup',{pointerId:1});}
function frames(n){while(n--)tick();}
function cameraCheck(){
 for(const [x,y,z] of [[-1.68,3.23,-2.58],[1.33,3.49,-2.71],[-.69,2.79,-1.53],[-1.24,1.17,0],[1.24,1.17,0]]){
   const p=project(vec(x,y,z));assert(p.x>0&&p.x<w&&p.y>=top&&p.y<h-bottom,JSON.stringify(p));
 }
 const spoon=project(cook.spoonTip);assert(spoon.y<h-bottom&&spoon.y>top);
 return {bowl:[Math.round(spoon.x),Math.round(spoon.y)],potWidth:Math.round(project(vec(1.24,1.17,0)).x-project(vec(-1.24,1.17,0)).x)};
}
tick();const phone=cameraCheck();assert(pixelRatio<=2);assert.equal(soundStarts,0);
const snapshot=[s.x,s.z,s.mix];
event('pointerdown',{x:3,y:5});move(.7,.7);tick();
assert.deepEqual([s.x,s.z,s.mix],snapshot);assert.equal(s.down,false);assert.equal(soundStarts,1);assert.equal(audio.state,'running');
down();assert(s.down&&captured===1&&s.ripple===1);const prior=notes;
event('pointerdown',{x:1,y:1},2,false);event('pointermove',{x:w,y:h},2,false);canvas.fire('pointerup',{pointerId:2});
assert(s.down&&notes===prior);move(.7,.26);frames(30);assert(s.x>.4);up();assert(!s.down&&captured===null);
down();canvas.fire('pointercancel',{pointerId:1});assert(!s.down);
down();const then=s.time;doc.hidden=true;doc.fire('visibilitychange');tick(30);
assert.equal(s.time,then);assert.equal(queue.size,0);assert.equal(audio.state,'suspended');assert(!s.down);
doc.hidden=false;doc.fire('visibilitychange');tick();assert(s.time-then<.02);assert.equal(queue.size,1);assert.equal(audio.state,'running');
down();w=1180;h=820;top=0;bottom=20;win.fire('resize');assert(!s.down);tick();const tablet=cameraCheck();
assert(doc.fire('contextmenu').prevented&&doc.fire('touchmove').prevented&&doc.fire('gesturestart').prevented);
assert(html.includes('touch-action:none')&&html.includes('user-scalable=no')&&html.includes('viewport-fit=cover'));
canvas.fire('webglcontextlost');assert.equal(queue.size,0);canvas.fire('webglcontextrestored');assert.equal(queue.size,1);tick();
const stats={mesh:0,triangles:0,vertices:0,materials:new Set()};
scene.traverse(o=>{if(!o.isMesh)return;stats.mesh++;stats.materials.add(o.material.uuid);const p=o.geometry.attributes.position;
 for(const v of p.array)assert(Number.isFinite(v));
 stats.vertices+=p.count;stats.triangles+=(o.geometry.index?.count||p.count)/3*(o.count||1);
});
const before=s.cycle,results=[],peak={};let op='',pick=null,oldphase=s.phase,maxDye=0,maxLift=0,readyNotes=0,joy=0,restored=0;
let worstMassError=0;
let drawn=0,wakeMin=1,wakeStart=0,wakeDistance=0,activeWake=null,kelp;
const populations=[scene.children.length,s.food.length,s.lumps.length];
const realTime=process.argv.includes('--realtime'),began=performance.now();
function sample(n){
 const t=n/60,k=t%60;
 const next=k<4.5?'idle':k<8?'follow tofu':k<12?'lift':k<14?'drop':k<22?'rub paste':k<28?'slow orbit':k<36?'fast orbit':k<40?'coast':k<46?'reverse':(Math.floor(t/60)%2 && k<52)?'find leaf':(Math.floor(t/60)%2 && k<54)?'pull leaf':'cross pot';
 if(next!==op){
   if(s.down)up();
   if(!['idle','coast','drop'].includes(next))down();
   if(next==='find leaf')kelp=s.food.filter(f=>f.kind===1).sort((a,b)=>Math.hypot(b.x,b.z)-Math.hypot(a.x,a.z))[0];
   if(next==='follow tofu')pick=s.food.filter(f=>f.kind===0).sort((a,b)=>Math.hypot(a.x-s.x,a.z-s.z)-Math.hypot(b.x-s.x,b.z-s.z))[0];
   op=next;
 }
 if(op==='follow tofu')move(pick.x,pick.z);
 if(op==='find leaf')move(kelp.x,kelp.z);
 if(op==='pull leaf'){const r=Math.max(.001,Math.hypot(s.x,s.z)),len=Math.max(.05,r-.012);move(len*s.x/r,len*s.z/r);}
 if(op==='lift'){const a=Math.atan2(s.z,s.x);move(.87*Math.cos(a),.87*Math.sin(a));}
 if(op==='rub paste'){const l=s.lumps.reduce((a,b)=>a.m>b.m?a:b);move(l.x+.14*Math.sin(t*9),l.z+.14*Math.cos(t*9));}
 if(op.endsWith('orbit')||op==='reverse'){const a=k*({'slow orbit':.7,'fast orbit':4,reverse:-3.7}[op]);move(.74*Math.cos(a),.74*Math.sin(a));}
 if(op==='cross pot')move(.70*Math.sin(t*3.2),.65*Math.sin(t*2.1));
 const oldNotes=notes;tick();
 if(s.wakeLeaf){
  if(activeWake!==s.wakeLeaf){activeWake=s.wakeLeaf;wakeStart=Math.hypot(activeWake.x,activeWake.z);}
  wakeDistance=Math.max(wakeDistance,wakeStart-Math.hypot(activeWake.x,activeWake.z));
  drawn=Math.max(drawn,activeWake.unfold);wakeMin=Math.min(wakeMin,Math.hypot(activeWake.x,activeWake.z));
 }else activeWake=null;
 if(s.phase==='ready'&&oldphase!=='ready'){readyNotes+=notes-oldNotes;}
 if(oldphase==='refill'&&s.phase==='stir')restored++;
 peak[op]=Math.max(peak[op]||0,Math.abs(s.omega));maxDye=Math.max(maxDye,...s.lumps.map(l=>l.dye));
 maxLift=Math.max(maxLift,...s.food.map(f=>f.up));joy=Math.max(joy,s.joy);oldphase=s.phase;
 const err=Math.abs(1-s.mix-s.lumps.reduce((a,l)=>a+l.m,0));worstMassError=Math.max(err,worstMassError);
 assert(s.food.every(f=>Number.isFinite(f.x+f.z+f.up)&&Math.hypot(f.x,f.z)<.96));
 if(n%60===59&&t<60)results.push([Math.round(t),op,+s.mix.toFixed(3),+s.omega.toFixed(3),+(s.carried?.up||0).toFixed(2)]);
}
async function audit(){
 for(let n=0;n<36000;n++){
   if(realTime&&n%6===0){const due=began+n*1000/60-performance.now();if(due>0)await new Promise(resolve=>setTimeout(resolve,due));}
   sample(n);
 }
assert(drawn>.5&&wakeDistance>.15);
assert(s.cycle>before+5&&maxLift>.8&&s.brakes>0&&maxDye>.08&&readyNotes>=6&&joy>.95&&restored>=6);
assert(worstMassError<.00001);assert.equal(soundStarts,1);
assert.deepEqual([scene.children.length,s.food.length,s.lumps.length],populations);
up();const demo=scene.getObjectByName('drag-demonstration');s.release();
while(s.phase!=='stir')tick();
s.idle=0;frames(236);assert(!demo.visible);frames(23);assert(demo.visible);down();tick();assert(!demo.visible);
canvas.fire('lostpointercapture',{pointerId:1});assert(!s.down);
const handle=project(cook.gripPoint);event('pointerdown',{x:handle.x+18,y:handle.y});assert(s.down);up();
const originalRatio=pixelRatio;for(let i=0;i<95;i++)tick(.036);assert(pixelRatio<originalRatio&&pixelRatio<=2);
const isolation=vm.runInContext(`(()=>{
 const test=(x,z)=>{
  const model=new SoupFlow(),dye=dyeField();model.x=model.tx=x;model.z=model.tz=z;model.grab();
  for(let i=0;i<180;i++){model.move(x+.13*Math.sin(i/7),z);model.step(1/60);dye.update(model);}
  return {localMassLost:.31-model.lumps[0].m,pigmentCells:dye.field.image.data.filter(x=>x>6).length};
 };
 const near=test(-.56,.07),far=test(.56,-.07);
 const model=new SoupFlow();model.omega=2;
 const response=[model.food[0],model.food[11],model.food[23]];for(const f of response){f.x=.6;f.z=0;}
 model.step(1/60);
 return {near,far,tangential:response.map(f=>f.vz)};
})()`,ctx);
assert(isolation.near.localMassLost>isolation.far.localMassLost*3);
assert(isolation.near.pigmentCells>0);
assert(isolation.tangential[2]>isolation.tangential[1]&&isolation.tangential[1]>isolation.tangential[0]);
console.log(JSON.stringify({phone,tablet,pixelRatio:originalRatio,adaptiveRatio:pixelRatio,isolation,scene:{...stats,materials:stats.materials.size},simulatedSeconds:600,elapsedSeconds:(performance.now()-began)/1000,realTime,drawn,wakeDistance,wakeMin,frames:36000,cycles:s.cycle-before,maxDye,maxLift,readyNotes,joy,restored,worstMassError,peak,soundStarts,suspends,resumes,results},null,2));

}
audit().catch(e=>{console.error(e);process.exitCode=1;});
