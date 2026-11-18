'use strict';
(()=>{
  const T=THREE,{group,mat,lathe}=Art,smooth=RocketFlight.smooth;
  const sim=RocketFlight.createSimulation();
  window.__GAME__={step:sim.step,getState:sim.getState,pressLever:sim.press,releaseLever:sim.release};
  const renderer=new T.WebGLRenderer({canvas:document.getElementById('world'),antialias:false,powerPreference:'high-performance',alpha:false,stencil:false});
  renderer.autoClear=false;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;
  const scene=new T.Scene(),cam=new T.PerspectiveCamera(40,1,.28,8500);
  const env=environmentMap(),pmrem=new T.PMREMGenerator(renderer);
  const reflection=pmrem.fromEquirectangular(env);scene.environment=reflection.texture;scene.environmentIntensity=.66;
  env.dispose();pmrem.dispose();
  const fill=new T.HemisphereLight(0xd4e4ff,0x52555a,1.67);
  const key=new T.DirectionalLight(0xffe0b7,2.75);key.castShadow=true;
  key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-19,right:19,top:22,bottom:-21,near:.5,far:100});key.shadow.camera.updateProjectionMatrix();
  key.shadow.normalBias=.024;key.shadow.bias=-.00027;scene.add(fill,key,key.target);
  const air=buildAtmosphere(scene),pad=buildSite(scene),ship=Art.rocket(scene),control=buildConsole(reflection.texture),meters=instruments();
  const nozzles=[];
  function jet(parent,x,y,z,r,i) {
    const g=group(parent,x,y,z);
    const glow=mat(0xffbb61,.59,.04,{emissive:0xff852e,emissiveIntensity:2.2,transparent:true,depthWrite:false,side:T.DoubleSide});
    glow.onBeforeCompile=sh=>{
      sh.vertexShader='varying vec3 jetPoint;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\njetPoint=position;');
      sh.fragmentShader='varying vec3 jetPoint;\n'+SkyNoise+sh.fragmentShader.replace('#include <opaque_fragment>',`
        float along=clamp(-jetPoint.y,0.,1.);
        float n=field(jetPoint*8.);
        outgoingLight=mix(vec3(3.2,2.95,2.4),mix(vec3(2.95,1.17,.36),vec3(1.7,.31,.055),along),smoothstep(.02,.42,along));
        diffuseColor.a=(1.-smoothstep(.16,1.,along))*(.4+.6*n)*opacity;
        #include <opaque_fragment>`);
    };
    lathe(g,[[.002,-1],[r*.30,-.72],[r*.86,-.34],[r*.87,-.13],[r,0]],glow,32);
    const hot=mat(0xd18a56,.44,.45,{emissive:0xff7736,emissiveIntensity:0});
    const rim=Art.ring(parent,y+.04,r*.96,.036,hot,x,z);
    g.traverse(o=>{o.castShadow=o.receiveShadow=false;});g.renderOrder=3;return {g,glow,hot,rim,i};
  }
  ship.nozzles.forEach(([x,y,z],i)=>nozzles.push(jet(ship.lower,x,y,z,i===0?.71:i<3?.40:.31,i)));
  const upperPlume=jet(ship.core,0,10.67,0,.63,5);
  const target=new T.Vector3(),up=new T.Vector3(),right=new T.Vector3(),offset=new T.Vector3();
  function layout(s){
    const aspect=cam.aspect,narrow=aspect<.8;
    const flight=smooth(0,58,s.altitude),orbit=smooth(76,1220,s.altitude),reveal=smooth(.03,5.8,s.payloadGap);
    const focus=11.85+(17.05+2.86-11.85)*reveal;
    const yaw=.208*(1-orbit)+.094*orbit+.085*s.lookDown;
    const limb=Math.acos(1260/(1260+Math.max(0,s.altitude)+20));
    const pitch=-.139+.12*flight+(limb-.16)*orbit+.19*s.lookDown;
    const startDist=narrow?45.1:44.5,deploymentDist=narrow?Math.max(24,10.8/(aspect*.725)):17.8;
    const distance=startDist+(deploymentDist-startDist)*reveal+(narrow?11:15)*s.lookDown;
    offset.set(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch));
    right.set(Math.cos(yaw),0,-Math.sin(yaw));up.crossVectors(offset,right).normalize();
    target.set((narrow?.10:1.0)*(1-reveal),focus+s.altitude,0);
    target.addScaledVector(right,Math.min(4.2,distance*.09*aspect)*s.lookDown);
    target.addScaledVector(up,-distance*.137*s.lookDown);
    cam.position.copy(target).addScaledVector(offset,distance);cam.lookAt(target);cam.updateMatrixWorld();
    ship.vehicle.position.y=2.86+s.altitude;
    ship.lower.position.set(s.detached?Math.min(41,s.separation*s.separation*.17):0,s.lowerOffset,0);
    ship.lower.rotation.z=-s.lowerRoll;
    ship.lower.visible=ship.lower.position.y+s.altitude>-22;
    ship.upperBody.rotation.z=-s.pitch;
    ship.core.position.y=-17.05-s.payloadGap*.89;
    ship.covers.forEach((m,i)=>{m.position.y=16.19-17.05-s.payloadGap*.89;m.rotation.z=(i?1:-1)*s.fairing[i];});
    ship.satellite.visible=s.released;
    ship.satellite.rotation.y=.08+.45*smooth(0,16,s.payloadGap);ship.satellite.rotation.z=s.busRoll;
    for(let i=0;i<4;i++){let sign=i%2?1:-1;ship.panels[i].rotation.z=i<2?-sign*(Math.PI/2-s.wings[i]):sign*(Math.PI-2*s.wings[i]);}
    pad.mounts.forEach((m,i)=>m.rotation.x=s.mounts[i].angle);
    pad.site.visible=s.altitude<740;if(pad.site.visible)pad.updateWind(s);
    Art.M.light.emissiveIntensity=2.45+s.lamp*.6;
    for(const j of [...nozzles,upperPlume]){
      const length=s.jets[j.i].length;j.g.visible=length>.012;j.g.scale.y=Math.max(.001,length);
      j.hot.emissiveIntensity=s.heat[j.i]*3.6;j.glow.opacity=Math.min(.87,.26+s.heat[j.i]);
    }
    key.target.position.set(0,8+s.altitude,0);key.position.set(24,38+s.altitude,-14);
    fill.intensity=1.67-.83*orbit;key.intensity=2.75+.31*orbit;
    air.update(s,cam,aspect);
  }
  // HDR composite. Small highlight-only bloom, optical edge falloff and fixed grain.
  const hdr=renderer.extensions.has('EXT_color_buffer_float');
  const rt=new T.WebGLRenderTarget(1,1,{type:hdr?T.HalfFloatType:T.UnsignedByteType,format:T.RGBAFormat,depthBuffer:true,magFilter:T.LinearFilter,minFilter:T.LinearFilter});
  rt.samples=Math.min(2,renderer.capabilities.maxSamples);
  const finish=new T.ShaderMaterial({
    uniforms:{frame:{value:rt.texture},pixel:{value:new T.Vector2(1,1)}},depthWrite:false,depthTest:false,
    vertexShader:'varying vec2 screenUv;void main(){screenUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`uniform sampler2D frame;uniform vec2 pixel;varying vec2 screenUv;
    vec3 lightSample(vec2 p){vec3 c=texture2D(frame,p).rgb;float l=dot(c,vec3(.2126,.7152,.0722));return c*smoothstep(.95,2.35,l);}
    void main(){vec2 uv=screenUv;vec3 col=texture2D(frame,uv).rgb;
      vec3 halo=vec3(0.);for(int i=0;i<6;i++){float a=float(i)*1.04719755;vec2 v=vec2(cos(a),sin(a))*pixel;halo+=lightSample(uv+v*3.)+.45*lightSample(uv-v*7.);}
      col+=halo*.014;vec2 e=(uv-.5)*1.41;col*=1.-.135*dot(e,e);
      gl_FragColor=vec4(col,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      float grain=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));
      gl_FragColor.rgb+=(grain-.5)*.008;
    }`
  });
  const screen=new T.Scene(),screenCam=new T.OrthographicCamera(-1,1,1,-1,.1,2);screenCam.position.z=1;screen.add(new T.Mesh(new T.PlaneGeometry(2,2),finish));
  let W,H,pixelRatio;
  function size(){
    W=window.innerWidth;H=window.innerHeight;pixelRatio=Math.min(window.devicePixelRatio||1,1.65,Math.sqrt(1650000/(W*H)));
    const w=Math.max(1,Math.round(W*pixelRatio)),h=Math.max(1,Math.round(H*pixelRatio));
    renderer.setSize(w,h,false);rt.setSize(w,h);finish.uniforms.pixel.value.set(1/w,1/h);
    cam.aspect=W/H;cam.updateProjectionMatrix();
  }
  window.addEventListener('resize',size);size();
  const audio=(()=>{
    let ac,master,rumble,breeze,filter,oscGain,muted=false,spoken=false,lastCycle=-1,lastWing=-1;
    function start(){
      if(!ac){
        const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
        ac=new C();master=ac.createGain();master.gain.value=muted?0:.44;master.connect(ac.destination);
        const b=ac.createBuffer(1,ac.sampleRate*3,ac.sampleRate),a=b.getChannelData(0);
        let p=0;for(let i=0;i<a.length;i++){p=.969*p+(Math.random()-.5)*.19;a[i]=p;}
        const noise=ac.createBufferSource();noise.buffer=b;noise.loop=true;
        filter=ac.createBiquadFilter();filter.type='lowpass';filter.frequency.value=340;
        rumble=ac.createGain();rumble.gain.value=.001;noise.connect(filter);filter.connect(rumble);rumble.connect(master);
        breeze=ac.createGain();breeze.gain.value=.033;noise.connect(breeze);breeze.connect(master);noise.start();
        const hum=ac.createOscillator();hum.type='sine';hum.frequency.value=55;oscGain=ac.createGain();oscGain.gain.value=0;hum.connect(oscGain);oscGain.connect(master);hum.start();
      }
      if(ac.state==='suspended')ac.resume().catch(()=>{});
    }
    function note(hz,level,dur){
      if(!ac||muted)return;let o=ac.createOscillator(),g=ac.createGain(),n=ac.currentTime;o.type='sine';o.frequency.value=hz;
      g.gain.setValueAtTime(.0001,n);g.gain.exponentialRampToValueAtTime(level,n+.045);g.gain.exponentialRampToValueAtTime(.0001,n+dur);
      o.connect(g);g.connect(master);o.start(n);o.stop(n+dur+.02);o.onended=()=>{o.disconnect();g.disconnect();};
    }
    function update(s){
      if(!ac)return;const n=ac.currentTime;if(lastCycle!==s.cycle){lastCycle=s.cycle;spoken=false;lastWing=-1;}
      const f=s.thrust/(1100*9.81*1.4);
      rumble.gain.setTargetAtTime(f*.91,n,.16);oscGain.gain.setTargetAtTime(f*.059,n,.15);filter.frequency.setTargetAtTime(205+470*f,n,.28);
      breeze.gain.setTargetAtTime((.029+.012*s.wind)*(1-smooth(45,590,s.altitude)),n,.65);
      const wing=s.wings.filter(w=>w>1.46).length;
      if(s.released&&wing>lastWing){note([329.63,392,440,493.88,587.33][wing],.048,1.4);lastWing=wing;}
      if(s.phase==='sunrise'&&!spoken){note(659.25,.033,2.4);note(392,.022,2.7);spoken=true;}
    }
    function toggle(){start();muted=!muted;if(master)master.gain.setTargetAtTime(muted?0:.44,ac.currentTime,.09);return muted;}
    return {start,note,update,toggle};
  })();
  let pointer=null;
  const button=document.getElementById('control'),sound=document.getElementById('sound');
  function end(e){if(e.pointerId!==pointer)return;sim.release();pointer=null;}
  button.addEventListener('pointerdown',e=>{
    if(pointer!==null||!e.isPrimary||e.button!==0||!sim.press())return;
    e.preventDefault();pointer=e.pointerId;button.setPointerCapture(pointer);audio.start();audio.note(153,.047,.14);
  });
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(ev,end);
  button.addEventListener('keydown',e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat&&sim.press()){e.preventDefault();audio.start();}});
  button.addEventListener('keyup',e=>{if(e.key===' '||e.key==='Enter')sim.release();});
  sound.addEventListener('click',()=>{const muted=audio.toggle();sound.classList.toggle('off',muted);sound.setAttribute('aria-pressed',String(!muted));});
  window.addEventListener('blur',()=>{sim.release();pointer=null;});
  let last=null;
  document.addEventListener('visibilitychange',()=>{last=null;if(document.hidden){sim.release();pointer=null;}});
  function frame(now){
    const dt=last===null?0:Math.max(0,Math.min((now-last)/1000,.1));last=now;
    sim.step(dt);const s=sim.state;layout(s);audio.update(s);
    renderer.setRenderTarget(rt);renderer.setViewport(0,0,rt.width,rt.height);renderer.clear();
    renderer.render(scene,cam);control.draw(renderer,s,W,H,pixelRatio);
    renderer.setRenderTarget(null);renderer.setViewport(0,0,rt.width,rt.height);renderer.render(screen,screenCam);
    meters.draw(s);requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
