'use strict';
let audio=null,master=null,pinTime=-1,score=0,tooth=0;
function wakeSound(){
 if(!audio){
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  audio=new AC();master=audio.createGain();master.gain.value=.39;master.connect(audio.destination);
 }
 if(audio.state==='suspended')audio.resume().catch(()=>{});
}
function tone(freq,vol,decay,type='sine',delay=0,bend=1){
 if(!audio||audio.state!=='running')return;
 const when=audio.currentTime+delay,osc=audio.createOscillator(),amp=audio.createGain();
 osc.type=type;osc.frequency.setValueAtTime(freq,when);
 osc.frequency.exponentialRampToValueAtTime(freq*bend,when+decay);
 amp.gain.setValueAtTime(.00001,when);amp.gain.exponentialRampToValueAtTime(Math.max(.00002,vol),when+.004);
 amp.gain.exponentialRampToValueAtTime(.00001,when+decay+.005);
 osc.connect(amp);amp.connect(master);osc.start(when);osc.stop(when+decay+.02);
 osc.onended=()=>{osc.disconnect();amp.disconnect();};
}
function chime(f,amp){
 tone(f,amp,1.05);tone(f*2.76,amp*.19,.53);tone(f*4.08,amp*.06,.22);
}
const melody=[0,4,7,12,9,7,4,2,0,4,7,9,7,4,2,-3,0,2,4,7,4,2,0,-5];
function sound(){
 for(const e of model.drain()){
  if(e.kind==='pin'&&S.time-pinTime>.035){const f=435+(e.pin%8)*43;
   tone(f,Math.min(.11,.02+e.strength*.068),.075,'sine',0,.78);tone(f*2.7,.018,.032);pinTime=S.time;}
  if(e.kind==='pop'){tone(210,.11,.115,'sine',0,.54);tone(1080,.027,.055);}
  if(e.kind==='chime')chime([659.26,783.99,987.77][e.cup],.14);
  if(e.kind==='overture'){score=0;tooth=Math.floor(S.wheel.angle/.265);[523.25,659.26,783.99].forEach((f,i)=>tone(f,.095,.85,'sine',i*.1));}
  if(e.kind==='music')chime(523.25*2**([0,4,7][e.note-4]/12),.08);
 }
 if(S.phase==='music'){
  const current=Math.floor(S.wheel.angle/.265);
  if(current>tooth){
   const f=523.25*2**(melody[score++%melody.length]/12);
   tone(f,.099,.83);tone(f*2,.031,.44);tone(f*4.12,.014,.18);tooth=current;
  }
 }
}
const ray=new T.Raycaster(),pointer=new T.Vector2();let captured=null;
function aim(e){
 const rect=canvas.getBoundingClientRect();
 pointer.set((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2);
 ray.setFromCamera(pointer,camera);
}
function overLever(){return ray.intersectObject(touchTarget,false).length>0;}
canvas.addEventListener('pointerdown',e=>{
 if(captured!==null||!e.isPrimary||e.button!==0)return;
 aim(e);wakeSound();
 if(overLever()&&model.press()){
  captured=e.pointerId;canvas.setPointerCapture(captured);canvas.style.cursor='grabbing';e.preventDefault();return;
 }
 const hit=new T.Vector3(),localPlane=new T.Plane(new T.Vector3(0,0,1),-.013).applyMatrix4(board.matrixWorld);
 if(ray.ray.intersectPlane(localPlane,hit)){
  board.worldToLocal(hit);
  const j=MarbleToy.pins.findIndex(p=>Math.hypot(p.x-hit.x,p.y-hit.y)<.011);
  if(j>=0)model.nudge(j,.004);
 }
});
canvas.addEventListener('pointermove',e=>{if(captured===null&&e.pointerType==='mouse'){aim(e);canvas.style.cursor=S.phase==='ready'&&overLever()?'pointer':'default';}});
function lift(e){
 if(captured===null||(e&&e.pointerId!==undefined&&e.pointerId!==captured))return;
 const id=captured;captured=null;model.release();
 if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);canvas.style.cursor='default';
}
for(const evt of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(evt,lift);
window.addEventListener('blur',()=>lift());
document.addEventListener('visibilitychange',()=>{if(document.hidden){lift();if(audio)audio.suspend().catch(()=>{});}last=0;});
// Focus stays on the whole toy. Only nearer objects and the distant room receive optical softening.
const target=new T.WebGLRenderTarget(2,2,{type:renderer.extensions.has('EXT_color_buffer_float')?T.HalfFloatType:T.UnsignedByteType,depthBuffer:true});
target.depthTexture=new T.DepthTexture(2,2,T.UnsignedIntType);
target.samples=Math.min(2,renderer.capabilities.maxSamples);
const postScene=new T.Scene(),screenCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
const finish=new T.ShaderMaterial({
 uniforms:{frame:{value:target.texture},zbuffer:{value:target.depthTexture},pixel:{value:new T.Vector2()},focus:{value:1.6},grainSeed:{value:.381}},
 vertexShader:'varying vec2 st;void main(){st=uv;gl_Position=vec4(position.xy,0.,1.);}',
 fragmentShader:`varying vec2 st;
 uniform sampler2D frame,zbuffer;uniform vec2 pixel;uniform float focus,grainSeed;
 float depthAt(vec2 uv){float z=texture2D(zbuffer,uv).x;return .045*12./(12.-z*(12.-.045));}
 float blur(float d){return min(4.1,max(0.,abs(d-focus)-.19)*(d<focus?21.:8.));}
 void main(){
  vec3 mid=texture2D(frame,st).rgb,col=mid*2.,glow=vec3(0.);
  float d=depthAt(st),b=blur(d),total=2.;
  for(int i=0;i<12;i++){
   float k=float(i)+.5,a=k*2.399963;vec2 dir=vec2(cos(a),sin(a))*sqrt(k/12.);
   vec2 q=st+dir*pixel*b;vec3 sampleColor=texture2D(frame,q).rgb;
   float w=1.-.88*smoothstep(.10,.24,d-depthAt(q));col+=sampleColor*w;total+=w;
   vec3 light=texture2D(frame,st+dir*pixel*5.2).rgb;glow+=max(light-1.35,vec3(0.));
  }
  col=col/total+glow*.0028;
  vec2 v=(st-.5)*1.36;col*=1.-.115*dot(v,v);
  gl_FragColor=vec4(col,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  float n=fract(sin(dot(gl_FragCoord.xy+grainSeed,vec2(12.9898,78.233)))*43758.5453)-.5;
  gl_FragColor.rgb+=n*.005;
 }`,depthTest:false,depthWrite:false
});
postScene.add(new T.Mesh(new T.PlaneGeometry(2,2),finish));
function floorPoint(x,y,height){
 const v=new T.Vector3(x,y,.5).unproject(camera).sub(camera.position).normalize();
 return camera.position.clone().addScaledVector(v,(height-camera.position.y)/v.y);
}
function resize(){
 const w=canvas.clientWidth,h=canvas.clientHeight,ratio=Math.min(window.devicePixelRatio||1,1.85,Math.sqrt(2400000/(w*h)));
 renderer.setPixelRatio(ratio);renderer.setSize(w,h,false);
 const size=renderer.getDrawingBufferSize(new T.Vector2());target.setSize(size.x,size.y);
 finish.uniforms.pixel.value.set(1/size.x,1/size.y);
 camera.aspect=w/h;
 const dist=Math.max(.842,.504/camera.aspect)/(2*Math.tan(Math.PI/12)),look=new T.Vector3(0,.371,-.009);
 camera.position.copy(look).add(new T.Vector3(.066,.236,.9695).normalize().multiplyScalar(dist));
 camera.lookAt(look);camera.updateProjectionMatrix();camera.updateMatrixWorld();finish.uniforms.focus.value=dist;
 const b=floorPoint(-.85,-.86,.035);block.position.set(b.x,0,b.z);block.rotation.y=-.39;
 const f=floorPoint(.94,-1.042,.019);sock.position.set(f.x,0,f.z);sock.rotation.y=-.23;
}
window.addEventListener('resize',resize);resize();
let last=0;
function frame(now){
 const dt=last?Math.min(.068,(now-last)/1000):0;last=now;
 model.step(dt);updateToy();updateDust();updateCurtains();sound();
 renderer.setRenderTarget(target);renderer.render(scene,camera);
 renderer.setRenderTarget(null);renderer.render(postScene,screenCamera);
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
