'use strict';
function makeSound(){
 let ctx,noise,filter,gain,master,active=false;
 const AC=window.AudioContext||window.webkitAudioContext;
 function awaken(){
   if(!AC)return;
   if(!ctx){
    try{
     ctx=new AC();master=ctx.createGain();master.gain.value=.23;master.connect(ctx.destination);
     const buf=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate),data=buf.getChannelData(0);
     let v=0;for(let i=0;i<data.length;i++){v=v*.67+(rand()-.5)*.54;data[i]=v;}
     noise=ctx.createBufferSource();noise.buffer=buf;noise.loop=true;filter=ctx.createBiquadFilter();filter.type='bandpass';filter.Q.value=.62;
     gain=ctx.createGain();gain.gain.value=0;noise.connect(filter);filter.connect(gain);gain.connect(master);noise.start();
    }catch{return;}
   }
   active=true;if(ctx.state!=='running')ctx.resume().catch(()=>{});
 }
 function note(freq,volume,duration,delay=0,end=freq,kind='sine'){
  if(!ctx||!active||!master)return;
  const now=ctx.currentTime+delay,o=ctx.createOscillator(),e=ctx.createGain();
  o.type=kind;o.frequency.setValueAtTime(freq,now);o.frequency.exponentialRampToValueAtTime(end,now+duration);
  e.gain.setValueAtTime(.0001,now);e.gain.exponentialRampToValueAtTime(volume,now+.025);e.gain.exponentialRampToValueAtTime(.0001,now+duration);
  o.connect(e);e.connect(master);o.onended=()=>{o.disconnect();e.disconnect();};o.start(now);o.stop(now+duration+.01);
 }
 return {awaken,contact(){note(255,.12,.14,0,176);},splash(){note(548,.080,.17,0,211);},finish(){
   [523.25,659.25,783.99].forEach((f,i)=>{note(f,.16,.96,i*.155);note(f*2.01,.043,.47,i*.155);});
 },update(s){if(active&&ctx&&gain){
   const velocity=Math.min(1,s.speed/3),flow=Math.abs(s.omega)/4.4;
   gain.gain.setTargetAtTime(.012+.23*velocity+.063*flow,ctx.currentTime,.11);
   filter.frequency.setTargetAtTime(430+480*velocity+205*flow+29*Math.sin(s.time*2.8),ctx.currentTime,.14);
 }},quiet(){active=false;if(ctx&&ctx.state!=='closed')ctx.suspend().catch(()=>{});},restore(){if(ctx)awaken();}};
}
function makeGuide(scene){
 const g=group(scene),m=mat(0xffe4b1,.65,0,{emissive:0xffe2aa,emissiveIntensity:.32});
 // A fingertip touching the spoon, with the other fingers folded into the palm.
 oval(g,m,.112,.234,.096,.117,.141,.078).rotation.z=-.5;
 line(g,m,[[.068,.205,.048],[.020,.152,.012],[.002,.083,0],[0,.023,0]],.032,12,10);
 oval(g,m,0,.023,0,.032,.036,.033);
 for(let i=0;i<3;i++)oval(g,m,.109+i*.044,.142+i*.021,.083,.029,.067,.037).rotation.z=-.26;
 oval(g,m,.018,.242,.119,.037,.079,.037).rotation.z=-.71;
 batch(g);g.name='drag-demonstration';m.transparent=true;m.depthWrite=false;g.visible=false;g.renderOrder=6;
 return (s,tip)=>{
  const time=s.idle-4,phase=((Math.max(time,0))%4.9),fade=sat(time*3)*sat(phase*4)*sat((3.25-phase)*3);
  g.visible=time>=0&&fade>.01&&s.phase==='stir';if(!g.visible)return;
  const a=sat((phase-.35)/2.52)*TAU;g.position.copy(tip);
  g.position.x+=.25*(1-Math.cos(a));g.position.z+=.36*Math.sin(a);
  g.position.y+=.13+.033*Math.cos(a);g.rotation.y=-.32;g.scale.setScalar(1.18);m.opacity=fade*.74;
 };
}
function runKitchen(){
 const canvas=document.getElementById('kitchen'),safe=document.getElementById('insets');
 const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.shadowMap.autoUpdate=false;
 const scene=new T.Scene();scene.background=new T.Color(0xe0d5bd);scene.fog=new T.FogExp2(0xe6dcca,.047);
 scene.environment=environment();scene.environmentIntensity=.48;
 scene.add(new T.HemisphereLight(0xfff6df,0xae967c,1.36));
 const sun=new T.DirectionalLight(0xffe2b2,2.65);sun.position.set(-4.7,7.4,2.1);
 sun.target.position.set(0,.3,-.65);scene.add(sun,sun.target);sun.castShadow=true;
 Object.assign(sun.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.5,far:20});sun.shadow.camera.updateProjectionMatrix();
 sun.shadow.mapSize.set(1024,1024);sun.shadow.bias=-.00038;sun.shadow.normalBias=.018;sun.shadow.radius=2.1;
 const rimLight=new T.DirectionalLight(0xe4efea,1.06);rimLight.position.set(2.6,4,-4.8);scene.add(rimLight);
 const props=kitchen(scene),animateFamily=family(scene),s=new SoupFlow(),cook=cooking(scene,s),guide=makeGuide(scene);
 const cam=new T.PerspectiveCamera(36,1,.055,48),sound=makeSound(),ray=new T.Raycaster();
 const water=new T.Plane(V(0,1,0),-level),pointer=new T.Vector2(),point=V(),offset=new T.Vector2(),a=new T.Vector2(),b=new T.Vector2();
 const project=V(),ndc=V();let width=1,height=1,safeLeft=0,safeRight=0,safeTop=0,safeBottom=0;
 let firstContact=true,owner=null,secondaryProp=null,propTime=0,last=0,raf=0,frames=0,slow=0,pixelRatio=1,shadowTime=0,lost=false;
 function release(){
  if(owner===null)return;
  const id=owner;owner=null;s.release();
  if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);
 }
 function resize(){
   const rect=canvas.getBoundingClientRect();width=rect.width||innerWidth;height=rect.height||innerHeight;
   const box=safe.getBoundingClientRect();safeLeft=box.left;safeRight=width-box.right;safeTop=box.top;safeBottom=height-box.bottom;
   const aspect=width/height,portrait=sat((1.24-aspect)/.48);
   cam.aspect=aspect;
   // Preserve the entire pot and face group on narrow devices.
   cam.fov=T.MathUtils.radToDeg(2*Math.atan(Math.max(Math.tan(39.9*Math.PI/360),Math.tan(25.8*Math.PI/360)/aspect)));
   cam.position.set(.76-.41*portrait,5.04+1.48*portrait,5.30+.60*portrait);
   cam.lookAt(0,1.67+.05*portrait,-1.02+.37*portrait);cam.zoom=1;cam.updateProjectionMatrix();cam.updateMatrixWorld();
   // Insets constrain the subjects, leaving the kitchen itself edge to edge.
   let framing=1;
   for(const [x,y,z] of [[-2.03,3.22,-2.58],[1.73,3.44,-2.71],[-1.68,1.02,0],[1.68,1.02,0],[0,.36,.97]]){
     ndc.set(x,y,z).project(cam);
     if(ndc.x<0)framing=Math.min(framing,(1-2*(safeLeft+5)/width)/-ndc.x);
     if(ndc.x>0)framing=Math.min(framing,(1-2*(safeRight+5)/width)/ndc.x);
     if(ndc.y>0)framing=Math.min(framing,(1-2*(safeTop+5)/height)/ndc.y);
     if(ndc.y<0)framing=Math.min(framing,(1-2*(safeBottom+5)/height)/-ndc.y);
   }
   cam.zoom=Math.min(1,Math.max(.5,framing));cam.updateProjectionMatrix();
   pixelRatio=Math.min(window.devicePixelRatio||1,2,Math.sqrt(1450000/(width*height)));
   renderer.setPixelRatio(pixelRatio);renderer.setSize(width,height,false);renderer.shadowMap.needsUpdate=true;
   release();
 }
 function locate(e){
  const rect=canvas.getBoundingClientRect();pointer.set((e.clientX-rect.left)/width*2-1,1-(e.clientY-rect.top)/height*2);
  ray.setFromCamera(pointer,cam);return ray.ray.intersectPlane(water,point);
 }
 function screen(vec,out){project.copy(vec).project(cam);out.set((project.x+1)*.5*width,(1-project.y)*.5*height);return out;}
 function hitsTool(e){
   screen(cook.spoonTip,a);screen(cook.gripPoint,b);
   const x=e.clientX-a.x,y=e.clientY-a.y,dx=b.x-a.x,dy=b.y-a.y,k=sat((x*dx+y*dy)/(dx*dx+dy*dy||1));
   ndc.copy(cook.spoonTip);ndc.x+=.27;ndc.project(cam);
   const bowlRadius=Math.max(24,Math.abs((ndc.x+1)*.5*width-a.x)+5);
   return Math.hypot(x,y)<bowlRadius || Math.hypot(x-dx*k,y-dy*k)<Math.max(22,bowlRadius*.63);
 }
 canvas.addEventListener('pointerdown',e=>{
  e.preventDefault();if(owner!==null||e.isPrimary===false||e.button>0)return;
  sound.awaken();const first=firstContact;firstContact=false;if(!locate(e))return;
  if(!hitsTool(e)){
    if(first)s.invite=1;
    // Only these two nearby dishes rock slightly when bumped.
    const hit=ray.intersectObjects(props,true)[0];if(hit){if(secondaryProp)secondaryProp.rotation.z=0;secondaryProp=hit.object;while(secondaryProp.parent!==scene)secondaryProp=secondaryProp.parent;propTime=0;}
    return;
  }
  owner=e.pointerId;offset.set(s.x-point.x/R,s.z-point.z/R);s.grab();sound.contact();canvas.setPointerCapture(owner);
 },{passive:false});
 canvas.addEventListener('pointermove',e=>{
   if(e.pointerId!==owner)return;e.preventDefault();if(locate(e))s.move(point.x/R+offset.x,point.z/R+offset.y);
 },{passive:false});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{
   if(e.pointerId===owner)release();
 });
 for(const name of ['contextmenu','gesturestart','gesturechange','gestureend','selectstart','dragstart','dblclick','wheel'])
    document.addEventListener(name,e=>e.preventDefault(),{passive:false});
 document.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});
 function animate(now){
  raf=0;if(document.hidden||lost)return;
  const elapsed=last?(now-last)*.001:1/60;last=now;
  const dt=Math.min(.065,Math.max(.001,elapsed)),prev=s.phase,carried=s.carried;
  const parts=Math.ceil(dt/(1/60));
  for(let i=0;i<parts;i++)s.step(dt/parts);
  if(prev!=='ready'&&s.phase==='ready')sound.finish();
  if(carried&&!s.carried&&carried.up>.35)sound.splash();
  cook.update();animateFamily(s.time,s.joy,cook.gripPoint,cook.spoonTip);guide(s,cook.spoonTip);sound.update(s);
  if(secondaryProp){propTime+=dt;secondaryProp.rotation.z=.042*Math.sin(propTime*17)*Math.exp(-propTime*5);if(propTime>1){secondaryProp.rotation.z=0;secondaryProp=null;}}
  shadowTime+=dt;
  if(shadowTime>.33){renderer.shadowMap.needsUpdate=true;shadowTime=0;}
  if(frames++>30&&elapsed>.025)slow++;else slow=Math.max(slow-1,0);
  if(slow>32&&pixelRatio>.86){pixelRatio=Math.max(.85,pixelRatio*.85);renderer.setPixelRatio(pixelRatio);slow=0;}
  renderer.render(scene,cam);raf=requestAnimationFrame(animate);
 }
 function stop(){if(raf)cancelAnimationFrame(raf);raf=0;last=0;release();sound.quiet();}
 function start(){if(!raf&&!document.hidden&&!lost){last=0;raf=requestAnimationFrame(animate);}}
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else{sound.restore();start();}});
 window.addEventListener('pagehide',stop);window.addEventListener('pageshow',()=>{if(!document.hidden){sound.restore();start();}});
 window.addEventListener('blur',release);window.addEventListener('resize',resize);
 if(window.visualViewport)visualViewport.addEventListener('resize',resize);
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;stop();});
 canvas.addEventListener('webglcontextrestored',()=>{lost=false;resize();sound.restore();start();});
 resize();cook.update();animateFamily(0,0,cook.gripPoint,cook.spoonTip);start();
}
runKitchen();
