(()=>{
'use strict';
const T=THREE,canvas=document.getElementById('workbench'),model=Workshop.create(),state=model.state;
const scene=new T.Scene();scene.background=new T.Color(0xc0c9b6);
const camera=new T.PerspectiveCamera(32,1,.12,65);
const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;
const view=makeWorkshop(scene,renderer,state,innerWidth<innerHeight*.8);
const target=new T.WebGLRenderTarget(2,2,{type:T.HalfFloatType,minFilter:T.LinearFilter,magFilter:T.LinearFilter,
  depthBuffer:true,stencilBuffer:false,samples:Math.min(2,renderer.capabilities.maxSamples)});
target.depthTexture=new T.DepthTexture(2,2,T.UnsignedIntType);
const screen=new T.Scene(),screenCam=new T.OrthographicCamera(-1,1,1,-1,0,1);
const uniforms={frame:{value:target.texture},depthMap:{value:target.depthTexture},
  pixel:{value:new T.Vector2()},nearFar:{value:new T.Vector2(camera.near,camera.far)},
  viewZ:{value:0},pitch:{value:0},dpr:{value:1}};
const finish=new T.ShaderMaterial({uniforms,depthWrite:false,depthTest:false,
  vertexShader:'varying vec2 st; void main(){st=uv;gl_Position=vec4(position.xy,0.,1.);}',
  fragmentShader:`
    uniform sampler2D frame,depthMap;
    uniform vec2 pixel,nearFar;
    uniform float viewZ,pitch,dpr;
    varying vec2 st;
    float depthAt(vec2 at){
      float q=texture2D(depthMap,at).r,n=nearFar.x,f=nearFar.y;
      return n*f/(f-q*(f-n));
    }
    void main(){
      float d=depthAt(st);
      float z=viewZ-d*(cos(pitch)+(2.*st.y-1.)*.286745*sin(pitch));
      float coc=3.65*smoothstep(1.99,2.78,z)+.85*(1.-smoothstep(-3.82,-3.27,z));
      vec3 base=texture2D(frame,st).rgb;
      vec3 blurred=base*2.,glow=vec3(0.);float occ=0.;
      for(int i=0;i<10;i++){
        float a=(float(i)+.31)*2.399963;vec2 v=vec2(cos(a),sin(a));
        float r=sqrt((float(i)+.5)*.1);
        blurred+=texture2D(frame,st+pixel*v*coc*dpr*r).rgb;
        vec3 bright=texture2D(frame,st+pixel*v*(2.+5.*r)*dpr).rgb;
        glow+=max(vec3(0.),bright-vec3(1.48));
        float delta=d-depthAt(st+pixel*v*(2.+3.*r)*dpr);
        occ+=smoothstep(.015,.09,delta)*(1.-smoothstep(.1,.42,delta));
      }
      vec3 color=blurred/12.*(1.-occ*.017)+glow*.0038;
      float vignette=dot(st-.5,st-.5);
      color*=1.-.20*vignette;
      gl_FragColor=vec4(color,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      float noise=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));
      gl_FragColor.rgb+=(noise-.5)*.0065;
    }`});
screen.add(new T.Mesh(new T.PlaneGeometry(2,2),finish));
const marks=[...document.querySelectorAll('.lamp')];
function draw(){
  view.draw(camera);
  renderer.setRenderTarget(target);renderer.render(scene,camera);
  renderer.setRenderTarget(null);renderer.render(screen,screenCam);
  const n=state.phase==='collect'?Math.max(...state.cans.map(c=>c.count)):Workshop.CAPACITY;
  marks.forEach((lamp,i)=>lamp.classList.toggle('on',i<n));
}
function resize(){
  const w=canvas.clientWidth,h=canvas.clientHeight,aspect=w/h,portrait=aspect<.8;
  const dpr=Math.min(devicePixelRatio||1,1.65);
  renderer.setPixelRatio(dpr);renderer.setSize(w,h,false);
  const size=renderer.getDrawingBufferSize(new T.Vector2());target.setSize(size.x,size.y);
  uniforms.pixel.value.set(1/size.x,1/size.y);uniforms.dpr.value=dpr;
  const pitch=portrait?.64:.59;
  const distance=Math.max(10.2,4.88/(2*Math.tan(16*Math.PI/180)*aspect));
  const y=portrait?.99:1.19,z=-.08;
  camera.aspect=aspect;camera.position.set(0,y+distance*Math.sin(pitch),z+distance*Math.cos(pitch));
  camera.lookAt(0,y,z);camera.updateProjectionMatrix();camera.updateMatrixWorld();
  uniforms.pitch.value=pitch;uniforms.viewZ.value=camera.position.z;
  view.resize(portrait);view.draw(camera);scene.updateMatrixWorld(true);
}
window.addEventListener('resize',resize);resize();

// Sound is synthesised from damped resonant modes and a short contact transient.
let audio=null,master=null,muted=false;
function awaken(){
  const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
  if(!audio){audio=new C();master=audio.createGain();master.gain.value=muted?0:.42;master.connect(audio.destination);}
  if(audio.state==='suspended')audio.resume().catch(()=>{});
}
function strike(freq,amplitude,decay,delay=0,type='sine'){
  if(!audio||muted||audio.state!=='running')return;
  const start=audio.currentTime+delay,osc=audio.createOscillator(),gain=audio.createGain();
  osc.type=type;osc.frequency.value=freq;
  gain.gain.setValueAtTime(.00001,start);gain.gain.exponentialRampToValueAtTime(amplitude,start+.0035);
  gain.gain.exponentialRampToValueAtTime(.00001,start+decay);
  osc.connect(gain);gain.connect(master);osc.start(start);osc.stop(start+decay+.009);
  osc.onended=()=>{gain.disconnect();osc.disconnect();};
}
function play(e){
  if(e.type==='clank'){
    const f=(338+e.bin*28)/(1+e.mass*8);
    [1,1.58,2.41,3.86].forEach((mul,i)=>strike(f*mul,.27/(1+i*1.2),.66-i*.09,i*.001));
    strike(f*.58,.12,.17,.060);
  } else if(e.type==='attach') {strike(960-e.mass*8000,.055,.11);strike(1390,.023,.09);}
  else if(e.type==='receive'){strike(785,.07,.29);strike(1176,.04,.25,.045);}
  else if(e.type==='wind'){[523.25,659.25,783.99].forEach((f,i)=>strike(f,.10,.62,i*.136));}
  else if(e.type==='step')strike(e.foot?195:216,.075,.104,0,'triangle');
}
const audioButton=document.getElementById('audio');
audioButton.addEventListener('click',()=>{
  awaken();muted=!muted;audioButton.classList.toggle('muted',muted);audioButton.setAttribute('aria-pressed',String(!muted));
  if(master)master.gain.setTargetAtTime(muted?0:.42,audio.currentTime,.018);
  if(!muted)strike(660,.075,.20);
});

const ray=new T.Raycaster(),uv=new T.Vector2(),plane=new T.Plane(new T.Vector3(0,1,0),0),hit=new T.Vector3();
let finger=null,dx=0,dz=0,dragHeight=0;
function cast(e){
  const box=canvas.getBoundingClientRect();
  uv.set((e.clientX-box.left)/box.width*2-1,1-(e.clientY-box.top)/box.height*2);
  ray.setFromCamera(uv,camera);
}
function onPlane(h){
  plane.constant=-h;
  return ray.ray.intersectPlane(plane,hit)?{x:hit.x/10,z:hit.z/10}:null;
}
function screenLocation(x,y,z){
  const v=new T.Vector3(x,y,z).project(camera);
  return {x:(v.x+1)*canvas.clientWidth/2,y:(1-v.y)*canvas.clientHeight/2};
}
function nearMagnet(e){
  if(ray.intersectObject(view.magnet,true).length)return true;
  // The hollow and a finger-width border count as part of the handle.
  const m=state.magnet,c=screenLocation(m.x*10,m.y*10+.67,m.z*10);
  const edge=screenLocation(m.x*10+.68,m.y*10+.67,m.z*10);
  const r=Math.max(24,Math.abs(edge.x-c.x)+8);
  return ((e.clientX-c.x)/r)**2+((e.clientY-c.y)/(r*1.18))**2<=1;
}
function binUnderFinger(e){
  const hit=ray.intersectObjects(view.cans,true)[0];
  if(hit){let g=hit.object;while(g && !view.cans.includes(g))g=g.parent;return view.cans.indexOf(g);}
  const rim=onPlane(.89);return rim?model.overCan(rim.x,rim.z,.053):-1;
}
function move(e){
  if(e.pointerId!==finger||!state.magnet.drag)return;
  cast(e);const held=state.parts.some(p=>p.mode==='held'||p.mode==='flying');
  if(held){
    const bin=binUnderFinger(e);
    if(bin>=0){const c=state.cans[bin];model.point(c.x,c.z);return;}
  }
  const pos=onPlane(dragHeight);if(!pos)return;
  // When a bare fingertip covers a loose part, guide the nearer pole to it.
  if(!held){
    const low=onPlane(.10);
    if(low){const p=state.parts.find(p=>p.mode==='table'&&Math.hypot(p.x-low.x,p.z-low.z)<.023);
      if(p){model.point(p.x+(state.magnet.x<p.x?-.042:.042),p.z);return;}}
  }
  model.point(pos.x+dx,pos.z+dz);
}
canvas.addEventListener('pointerdown',e=>{
  if(finger!==null||e.button!==0)return;
  cast(e);
  const m=state.magnet;
  if(!nearMagnet(e))return;
  if(!model.grab())return;
  awaken();canvas.setPointerCapture(e.pointerId);finger=e.pointerId;
  dragHeight=m.y*10+.62;const pos=onPlane(dragHeight);
  dx=pos?m.x-pos.x:0;dz=pos?m.z-pos.z:0;canvas.style.cursor='grabbing';e.preventDefault();
});
canvas.addEventListener('pointermove',e=>{
  if(finger!==null){move(e);return;}
  if(e.pointerType==='mouse'){cast(e);canvas.style.cursor=state.phase==='collect'&&nearMagnet(e)?'grab':'default';}
});
function end(e,cancel){
  if(e.pointerId!==finger)return;
  if(!cancel)move(e);
  finger=null;model.release(cancel);canvas.style.cursor='default';
  if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
}
canvas.addEventListener('pointerup',e=>end(e,false));
canvas.addEventListener('pointercancel',e=>end(e,true));
canvas.addEventListener('lostpointercapture',e=>end(e,true));
let previous=0;
function frame(now){
  const dt=previous?Math.min((now-previous)/1000,.075):0;previous=now;
  model.step(dt);model.drainEvents().forEach(play);draw();requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange',()=>{previous=0;
  if(document.hidden&&finger!==null){const id=finger;finger=null;model.release(true);if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);}
});
window.__GAME__=Object.freeze({step:model.step,getState:model.getState});
requestAnimationFrame(frame);
})();
