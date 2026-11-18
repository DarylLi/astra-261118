(() => {
  'use strict';
  const T=THREE,{clamp,roadX,smooth}=SnowRoad;
  const sim=SnowRoad.create(),audio=snowSound(sim);
  window.__GAME__={step:sim.step,getState:sim.getState};
  const canvas=document.getElementById('valley'),renderer=new T.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:'high-performance'});
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(38,1,.11,330);
  scene.fog=new T.FogExp2(0xd8dad3,.0086);
  const skyFill=new T.HemisphereLight(0xb1cfe9,0x9db6c5,1.78);scene.add(skyFill);
  const sun=new T.DirectionalLight(0xffe1b7,2.82);scene.add(sun,sun.target);sun.castShadow=true;
  Object.assign(sun.shadow.camera,{left:-23,right:23,top:24,bottom:-24,near:.4,far:130});sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.00022;sun.shadow.normalBias=.019;
  const skyDir=new T.Vector3();
  const disc=Art.mesh(scene,new T.SphereGeometry(1,32,24),Art.mat(0xffedd0,.78,0,{emissive:0xffe2a5,emissiveIntensity:3.2,fog:false}));
  disc.castShadow=false;disc.receiveShadow=false;disc.scale.setScalar(2.65);
  let skyMap;
  const skyCanvas=document.createElement('canvas');skyCanvas.width=640;skyCanvas.height=320;
  const sc=skyCanvas.getContext('2d'),skyPixels=sc.createImageData(640,320);
  // Analytic sky gradients, sun aureole and thin wind-streaked cloud banks.
  function morningSky(){
    const sunX=skyDir.x,sunY=skyDir.y,sunZ=skyDir.z,blend=(a,b,t)=>a+(b-a)*t;
    const data=skyPixels.data;
    for(let y=0;y<320;y++){
      const lat=(.5-(y+.5)/320)*Math.PI,h=Math.sin(lat),cos=Math.cos(lat),alt=smooth((h+.04)/.66);
      for(let x=0;x<640;x++){
        const a=((x+.5)/640-.5)*Math.PI*2,dx=cos*Math.cos(a),dz=cos*Math.sin(a);
        const dot=Math.max(0,dx*sunX+h*sunY+dz*sunZ);
        const aureole=.48*Math.pow(dot,19)+.30*Math.pow(dot,210)+.46*Math.pow(dot,2200);
        let r=blend(222,111,alt),g=blend(226,153,alt),b=blend(223,184,alt);
        const wav=h+.019*Math.sin(a*6+.4)+.006*Math.sin(a*31)+.004*Math.cos(a*59);
        const cloud=(.49*Math.exp(-Math.pow((wav-.134)/.016,2))+.21*Math.exp(-Math.pow((wav-.186)/.009,2))+.26*Math.exp(-Math.pow((wav-.286)/.012,2)))*(.48+.41*Math.cos(a*3-1.1)+.09*Math.sin(a*12));
        r=blend(r,239,cloud);g=blend(g,233,cloud);b=blend(b,217,cloud);
        const w=clamp(aureole,0,1),i=4*(640*y+x);
        data[i]=blend(r,255,w);data[i+1]=blend(g,223,w);data[i+2]=blend(b,171,w);data[i+3]=255;
      }
    }
    sc.putImageData(skyPixels,0,0);
    if(!skyMap){skyMap=new T.CanvasTexture(skyCanvas);skyMap.mapping=T.EquirectangularReflectionMapping;skyMap.colorSpace=T.SRGBColorSpace;scene.background=skyMap;}
    skyMap.needsUpdate=true;
  }
  const town=Landscape.build(scene),road=RoadView.build(scene,sim),plow=Vehicles.plow(scene),bus=Vehicles.bus(scene),hand=RoadView.makeHand(scene);
  let wide=0,carYaw=0,surfaceClock=0;
  function roadAngle(s){return -Math.atan((roadX(s+.08)-roadX(s-.08))/.16);}
  function syncModels(){
    const c=sim.car,q=sim.bus;
    plow.root.position.set(roadX(c.s)+c.x,0,-c.s);
    carYaw=c.yaw;plow.root.rotation.y=carYaw;
    plow.body.position.y=(c.mounts[0]+c.mounts[1]+c.mounts[2]+c.mounts[3])*.23;
    plow.body.rotation.set(c.pitch,0,c.roll);
    for(let i=0;i<4;i++){
      // Wheel model traversal is left front, left rear, right front, right rear.
      const k=[0,2,1,3][i];plow.wheels[i].rotation.x=-c.wheels[k];plow.wheels[i].position.y=.434+c.mounts[k];
    }
    plow.blade.position.y=.085+c.blade;plow.blade.rotation.z=-c.roll*.65;
    Art.C.beacon.emissiveIntensity=.46+.60*Math.pow(Math.max(0,Math.cos(c.beacon-carYaw)),4);
    bus.root.position.set(roadX(q.s)+q.x,.027,-q.s);bus.root.rotation.y=roadAngle(q.s)+q.turn;
    for(const wheel of bus.wheels)wheel.rotation.x=-q.wheel;
    for(let i=0;i<town.lamps.length;i++){
      const h=sim.lamps[i].heat,m=town.lamps[i];m.emissiveIntensity=h*1.43;
      m.color.setRGB(.18+h*.39,.27+h*.145,.31-h*.15);
    }
    town.umbrella.rotation.z=-.105+sim.flex[2].a;town.umbrella.rotation.x=sim.flex[6].a*.46;
    const hint=sim.hand,travel=smooth((hint.s-c.s-.1)/3.1);
    hand.g.visible=hint.alpha>.005;
    if(hand.g.visible){
      hand.g.position.set(roadX(hint.s)+c.x+.85+.31*travel,1.69-travel*1.18+hint.ext*.18,-hint.s);
      hand.g.scale.setScalar(1.30+.14*wide);hand.g.rotation.copy(camera.rotation);
      hand.g.rotateZ(-.31-.16*hint.ext);hand.m.opacity=hint.alpha*.88;hand.cuff.opacity=hint.alpha*.91;
    }
    road.particles();
  }
  function cameraPose(){
    const follow=sim.view.follow;
    const baseX=roadX(follow);
    camera.position.set(baseX+2.35+3.45*wide,5.25-.60*wide,12.40-3.70*wide-follow);
    camera.lookAt(baseX-.25+.25*wide,2.10-.20*wide,-5.8-follow);
    camera.updateMatrixWorld();
  }
  // Bloom is extracted from the linear scene at quarter resolution before tone mapping.
  const hdr=renderer.extensions.has('EXT_color_buffer_float');
  const target=new T.WebGLRenderTarget(1,1,{type:hdr?T.HalfFloatType:T.UnsignedByteType,depthBuffer:true});
  target.samples=hdr?Math.min(2,renderer.capabilities.maxSamples):0;
  const glow=new T.WebGLRenderTarget(1,1,{type:hdr?T.HalfFloatType:T.UnsignedByteType,depthBuffer:false});
  const quadGeo=new T.PlaneGeometry(2,2),screenCam=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const vert='varying vec2 coord; void main(){coord=uv; gl_Position=vec4(position.xy,0.,1.);}';
  const glowScene=new T.Scene(),postScene=new T.Scene();
  const bloom=new T.ShaderMaterial({uniforms:{source:{value:target.texture},pixel:{value:new T.Vector2()},threshold:{value:hdr?1.04:.85}},vertexShader:vert,
    fragmentShader:'varying vec2 coord; uniform sampler2D source; uniform vec2 pixel; uniform float threshold; void main(){vec3 light=vec3(0.); for(int j=-2;j<=2;j++){for(int i=-2;i<=2;i++){vec2 k=vec2(float(i),float(j));vec3 c=texture2D(source,coord+k*pixel*2.).rgb;light+=max(c-vec3(threshold),0.)*exp(-dot(k,k)*.28);}}gl_FragColor=vec4(light*.103,1.);}',depthTest:false,depthWrite:false});
  glowScene.add(new T.Mesh(quadGeo,bloom));
  const finish=new T.ShaderMaterial({uniforms:{source:{value:target.texture},glow:{value:glow.texture},pitch:{value:new T.Vector2()}},vertexShader:vert,
    fragmentShader:`varying vec2 coord;uniform sampler2D source;uniform sampler2D glow;uniform vec2 pitch;
    void main(){vec3 c=texture2D(source,coord).rgb;vec3 b=vec3(0.);for(int j=-1;j<=1;j++){for(int i=-1;i<=1;i++){b+=texture2D(glow,coord+vec2(float(i),float(j))*pitch*1.7).rgb;}}
    vec2 p=(coord-.5)*2.;c=(c+b*.009)*(1.-.065*smoothstep(.18,1.7,dot(p,p)));gl_FragColor=vec4(c,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5;
    gl_FragColor.rgb+=grain*.0028;}`,depthTest:false,depthWrite:false});
  postScene.add(new T.Mesh(quadGeo,finish));
  let shape=-10;
  function resize(){
    const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight);
    camera.aspect=w/h;camera.updateProjectionMatrix();wide=smooth((w/h-.48)/.89);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));renderer.setSize(w,h,false);
    const size=renderer.getDrawingBufferSize(new T.Vector2());target.setSize(size.x,size.y);
    glow.setSize(Math.max(1,Math.ceil(size.x/4)),Math.max(1,Math.ceil(size.y/4)));bloom.uniforms.pixel.value.set(1/size.x,1/size.y);
    finish.uniforms.pitch.value.set(1/glow.width,1/glow.height);cameraPose();
    if(Math.abs(shape-wide)>.03){shape=wide;
      skyDir.set(-.235-.39*wide,.144,-1).normalize();morningSky();
      sun.target.position.set(-1,0,-10);sun.position.copy(sun.target.position).addScaledVector(skyDir,70);
      disc.position.copy(camera.position).addScaledVector(skyDir,239);
    }
  }
  resize();syncModels();
  // Capture real sky, peaks, trees and village for the glass, wet asphalt and metal.
  const environmentTarget=new T.WebGLCubeRenderTarget(128,{type:hdr?T.HalfFloatType:T.UnsignedByteType});
  const capture=new T.CubeCamera(.3,260,environmentTarget);capture.position.set(0,2.18,-6);
  capture.update(renderer,scene);
  const pmrem=new T.PMREMGenerator(renderer),reflection=pmrem.fromCubemap(environmentTarget.texture);
  scene.environment=reflection.texture;scene.environmentIntensity=.42;environmentTarget.dispose();pmrem.dispose();
  window.addEventListener('resize',resize);
  const ray=new T.Raycaster(),ndc=new T.Vector2(),ground=new T.Plane(new T.Vector3(0,1,0),-.14),hit=new T.Vector3();
  let pointer=null,startX=0,startY=0,distance=0,downAt=0;
  function pick(e){
    const rect=canvas.getBoundingClientRect();
    ndc.set((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2);
    ray.setFromCamera(ndc,camera);return ray.ray.intersectPlane(ground,hit);
  }
  function onRoad(){
    const s=-hit.z,l=hit.x-roadX(s);return s>=-.85&&s<=SnowRoad.END+3.8&&Math.abs(l)<2.60;
  }
  canvas.addEventListener('pointerdown',e=>{
    if(pointer!==null||!e.isPrimary||e.button!==0)return;
    audio.start();const land=pick(e);
    let accepted=false;
    if(sim.phase==='plow'){
      if(ray.intersectObject(plow.root,true).length){
        accepted=sim.aim(SnowRoad.END,sim.car.x);
      }else if(land&&onRoad()){
        accepted=sim.aim(-hit.z,hit.x-roadX(-hit.z));
      }
    }
    if(!accepted){
      // Only the umbrella gives a small mechanical response to an incidental touch.
      if(ray.intersectObject(town.umbrella,true).length)sim.touchScenery(2);return;
    }
    pointer=e.pointerId;downAt=performance.now();distance=0;startX=e.clientX;startY=e.clientY;
    canvas.setPointerCapture(pointer);
  });
  canvas.addEventListener('pointermove',e=>{
    if(e.pointerId!==pointer)return;
    distance=Math.max(distance,Math.hypot(e.clientX-startX,e.clientY-startY));
    if(distance>8&&pick(e)&&onRoad()){sim.aim(-hit.z,hit.x-roadX(-hit.z));}
  });
  function lift(e){
    if(e.pointerId!==pointer)return;pointer=null;
    sim.release(e.type==='pointerup' && distance<10 && performance.now()-downAt<450);
    if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
  }
  for(const evt of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(evt,lift);
  const soundButton=document.getElementById('sound');
  soundButton.addEventListener('click',()=>{const mute=audio.toggle();soundButton.setAttribute('aria-pressed',String(mute));soundButton.setAttribute('aria-label',mute?'音を出す':'消音');});
  let last=performance.now();
  document.addEventListener('visibilitychange',()=>{last=performance.now();if(document.hidden){sim.release();pointer=null;}});
  renderer.setAnimationLoop(now=>{
    const dt=clamp((now-last)/1000,0,.1);last=now;
    sim.step(dt);cameraPose();syncModels();surfaceClock+=dt;
    if(surfaceClock>=1/24){road.surface();surfaceClock=0;}
    audio.sync();renderer.setRenderTarget(target);renderer.render(scene,camera);
    renderer.setRenderTarget(glow);renderer.render(glowScene,screenCam);
    renderer.setRenderTarget(null);renderer.render(postScene,screenCam);
  });
})();
