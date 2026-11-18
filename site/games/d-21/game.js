'use strict';
(() => {
  const T=THREE,A=ArenaArt,V=A.V,pi=Math.PI,game=createBoxingGame(),s=game.state;
  window.__GAME__={step:game.step,getState:game.getState};
  const canvas=document.getElementById('arena');
  const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',alpha:false,stencil:false});
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;
  renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;renderer.shadowMap.type=T.PCFShadowMap;
  const scene=new T.Scene();scene.background=new T.Color(0xcfdbdf);scene.fog=new T.FogExp2(0xd9e2df,.031);
  const camera=new T.PerspectiveCamera(34,1,.12,72),look=V(0,1.42,0);
  const light=new T.DirectionalLight(0xffeed1,2.45);light.position.set(-5.8,9.1,4.0);light.target.position.set(0,0,-.6);scene.add(light,light.target);light.castShadow=true;
  Object.assign(light.shadow.camera,{left:-6.2,right:6.2,top:6.6,bottom:-6.6,near:.5,far:23});light.shadow.mapSize.set(2048,2048);light.shadow.normalBias=.018;light.shadow.bias=-.00028;
  scene.add(new T.HemisphereLight(0xdcedff,0xd4b181,1.29));
  // A local radiance capture of the windows and floor provides soft, spatially varied reflections.
  const studio=new T.Scene();studio.background=new T.Color(0xa7c1d4);
  const reflector=(color,strength)=>A.mat(color,.49,0,{emissive:color,emissiveIntensity:strength});
  const softbox=reflector(0xfff1d8,3.1),wallGlow=reflector(0xc2d5e3,.57);
  for(let x=-6;x<7;x+=3)A.box(studio,x,2,-5,2.61,3.22,.1,softbox);
  for(let z=-5;z<6;z+=3)A.box(studio,-5,2,z,.1,3.79,2.44,softbox);
  A.box(studio,4,2,1,.1,3.6,9,wallGlow);A.box(studio,0,-3,0,20,.1,20,reflector(0xb69b76,.73));
  const pmrem=new T.PMREMGenerator(renderer),environment=pmrem.fromScene(studio,.075,.15,40);scene.environment=environment.texture;scene.environmentIntensity=.46;pmrem.dispose();
  const room=A.group(scene),gym=A.floorAndGym(room);A.batch(room);
  const ring=A.ring(scene);A.batch(ring.base);
  const drops=A.sideline(scene);
  const hero=A.robot(scene,false),rival=A.robot(scene,true);
  hero.root.position.set(-1.32,.64,.12);hero.root.rotation.y=.765;hero.root.scale.setScalar(1.23);
  rival.root.position.set(1.39,.64,-.055);rival.root.rotation.y=-.785;rival.root.scale.setScalar(1.16);
  const reward=A.prizeBox(scene);
  const catchCoil=A.helix(scene,0,0,0,.061,1,8,.009,A.mat(0xa7b7ba,.28,.71));
  const offerings=[A.mat(0xe6b770,.51,.06),A.mat(0xb6cfdf,.47,.12),A.mat(0x799fbe,.53,.08)];
  const prizes=offerings.map((m,i)=>{const g=A.glove(reward.prize,i,m);A.batch(g);g.visible=i===0;return g;});
  const heroStyles=[hero.main.mitten,...offerings.map((m,i)=>{const g=A.glove(hero.main.grip,i,m);g.visible=false;return g;})];
  for(const robot of [hero,rival]){
    A.batch(robot.root,[robot.body]);
    A.batch(robot.body,[robot.main.grip,robot.main.frame,robot.head]);
    A.batch(robot.head,[robot.antenna,...robot.eyes]);
    A.batch(robot.antenna);
    A.contact(scene,robot.root.position.x,.652,robot.root.position.z,1.54,1.11,.32);
  }
  for(const g of heroStyles)A.batch(g);A.batch(rival.main.mitten);
  const fixture=A.fixture(scene,.47,4.61,-.56),farLamp=A.fixture(scene,-3.4,4.82,-3.78,.91);
  A.fixture(scene,4.73,5.24,-5.17,.8);
  const hand=A.gesture(scene);A.batch(hand);hand.visible=false;
  const sparks=A.group(scene),glintMat=A.mat(0xffe5a1,.32,.1,{emissive:0xffc460,emissiveIntensity:.7});
  function glint(x,y,z,r){const g=A.mesh(sparks,new T.OctahedronGeometry(r),glintMat,x,y,z);g.scale.set(.57,1.24,.42);return g;}
  glint(-.25,.29,0,.069);glint(-.36,.17,0,.036);
  // Local dust grains drift independently through the shafts of light.
  const dust=new T.InstancedMesh(new T.IcosahedronGeometry(.006,0),A.mat(0xffefc9,.65,.05,{emissive:0xffe3ae,emissiveIntensity:.35}),s.dust.length);
  const matrix=new T.Matrix4();dust.frustumCulled=false;scene.add(dust);
  // Floor reflection, projected from the reflected camera and softened over the lacquer grain.
  const reflection=new T.WebGLRenderTarget(512,384,{type:T.HalfFloatType});
  const reflected=new T.PerspectiveCamera(),mirrorVP=new T.Matrix4();
  gym.wood.onBeforeCompile=shader=>{
    shader.uniforms.floorImage={value:reflection.texture};shader.uniforms.mirrorVP={value:mirrorVP};
    shader.vertexShader='uniform mat4 mirrorVP; varying vec4 floorCoord;\n'+shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nfloorCoord=mirrorVP*modelMatrix*vec4(transformed,1.0);');
    shader.fragmentShader='uniform sampler2D floorImage; varying vec4 floorCoord;\n'+shader.fragmentShader.replace('#include <opaque_fragment>',`
      vec2 refUV=floorCoord.xy/floorCoord.w*.5+.5;
      vec2 smear=vec2(.0035,.007);
      vec3 image=texture2D(floorImage,refUV).rgb*.28;
      image+=texture2D(floorImage,refUV+smear).rgb*.18+texture2D(floorImage,refUV-smear).rgb*.18;
      image+=texture2D(floorImage,refUV+vec2(smear.x,-smear.y)).rgb*.18+texture2D(floorImage,refUV+vec2(-smear.x,smear.y)).rgb*.18;
      outgoingLight=mix(outgoingLight,image,.115);
      #include <opaque_fragment>`);
  };
  const target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:true,samples:0});
  target.depthTexture=new T.DepthTexture(1,1,T.UnsignedIntType);
  const passScene=new T.Scene(),quadCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const post=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{picture:{value:target.texture},depthMap:{value:target.depthTexture},pixel:{value:new T.Vector2()},focus:{value:10},screenHeight:{value:820}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,
    fragmentShader:`uniform sampler2D picture,depthMap;uniform vec2 pixel;uniform float focus,screenHeight;varying vec2 vUv;
    float noise(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
    void main(){
      vec2 u=vUv;float z=texture2D(depthMap,u).x;float dist=.12*72./(72.-z*(72.-.12));
      float blur=smoothstep(2.0,6.4,dist-focus)*3.45*screenHeight/820.;
      vec3 rgb=texture2D(picture,u).rgb,avg=rgb*.2,halo=vec3(0.);
      for(int i=0;i<8;i++){float a=float(i)*.785398;vec2 dir=vec2(cos(a),sin(a));
        avg+=texture2D(picture,u+dir*pixel*blur).rgb*.1;
        vec3 bright=texture2D(picture,u+dir*pixel*4.2*screenHeight/820.).rgb;
        halo+=max(bright-1.02,vec3(0.))*.006;
      }
      rgb=avg+halo;vec2 edge=(u-.5)*1.42;rgb*=1.-.089*dot(edge,edge);
      gl_FragColor=vec4(rgb,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      gl_FragColor.rgb+=(noise(gl_FragCoord.xy)-.5)*.009;
    }`});
  passScene.add(new T.Mesh(new T.PlaneGeometry(2,2),post));
  let mirrorDirty=true,frame=0,portrait=false;
  function resize(){
    const w=canvas.clientWidth,h=canvas.clientHeight,aspect=w/h;portrait=aspect<.85;
    const ratio=Math.min(window.devicePixelRatio||1,1.65,Math.sqrt(1700000/(w*h)));
    renderer.setPixelRatio(ratio);renderer.setSize(w,h,false);
    target.setSize(Math.round(w*ratio),Math.round(h*ratio));
    reflection.setSize(Math.round(470*Math.min(1.65,aspect)),470);
    camera.aspect=aspect;camera.updateProjectionMatrix();
    const dist=Math.max(10.84,7.72/aspect);
    look.set(portrait?.03:0,portrait?1.78:1.52,portrait?.13:.30);
    const axis=(portrait?V(.17,.30,.93):V(.248,.303,.922)).normalize();
    camera.position.copy(look).addScaledVector(axis,dist);camera.lookAt(look);camera.updateMatrixWorld();
    post.uniforms.focus.value=dist;post.uniforms.pixel.value.set(1/target.width,1/target.height);post.uniforms.screenHeight.value=target.height;
    reflected.copy(camera);reflected.position.y=-.024-camera.position.y;reflected.up.set(0,-1,0);reflected.lookAt(look.x,-.024-look.y,look.z);reflected.updateMatrixWorld();
    mirrorVP.multiplyMatrices(reflected.projectionMatrix,reflected.matrixWorldInverse);mirrorDirty=true;
    reward.root.position.x=portrait?1.13:2.27;
    ring.base.scale.x=portrait?.82:1;
  }
  window.addEventListener('resize',resize);resize();
  // Short synthesized notes are triggered by contacts and individual lamp filaments.
  let ctx=null,muted=false,lastEvent=-1,lastLamp=-1;
  function unlock(){if(!ctx){const Audio=window.AudioContext||window.webkitAudioContext;if(Audio)ctx=new Audio();}if(ctx?.state==='suspended')ctx.resume().catch(()=>{});}
  function note(f,delay,length,volume=.046,end=f,type='sine'){
    if(!ctx||muted||ctx.state!=='running')return;
    const at=ctx.currentTime+delay,osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(f,at);osc.frequency.exponentialRampToValueAtTime(end,at+length);
    gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(volume,at+.014);gain.gain.exponentialRampToValueAtTime(.0001,at+length);osc.connect(gain);gain.connect(ctx.destination);osc.start(at);osc.stop(at+length+.01);osc.onended=()=>{osc.disconnect();gain.disconnect();};
  }
  function sound(){
    if(s.soundEvent!==lastEvent){lastEvent=s.soundEvent;
      switch(s.soundKind){
        case 'hold':note(211,0,.13,.025,266);break;
        case 'swish':note(165,0,.16,.038,320);break;
        case 'step':note(170,0,.16,.035,105);break;
        case 'pop':note(265+42*s.impact,0,.24,.065,689);note(847,.055,.31,.025,996);break;
        case 'bounce':note(523,0,.26,.038,650);break;
        case 'box':case 'equip': [523,659,784,1046].forEach((f,i)=>note(f,i*.085,.42,.031));break;
      }
    }
    if(s.phase==='lights'){const k=Math.min(7,Math.floor(s.age/.14));if(k!==lastLamp){note([392,440,494,523,587,659,784,880][k],0,.21,.021);lastLamp=k;}}else lastLamp=-1;
  }
  const audio=document.getElementById('audio');audio.addEventListener('click',()=>{unlock();muted=!muted;audio.classList.toggle('muted',muted);audio.setAttribute('aria-pressed',String(!muted));if(!muted)note(587,0,.19);});
  const ray=new T.Raycaster(),mouse=new T.Vector2(),pos=V(),dest=V(),p0=V(),p1=V(),p2=V(),local=V(),q=new T.Quaternion();
  const gloveAnchor=A.group(hero.main.grip,0,.1,.04),blueAnchor=A.group(rival.main.grip,0,.1,.04);
  let pointer=null,equipped=-2,oldStage=-1;
  const world=(o,out)=>o.getWorldPosition(out);
  function touches(o,r){return ray.ray.distanceToPoint(world(o,pos))<=r;}
  function aim(e){const r=canvas.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);ray.setFromCamera(mouse,camera);}
  canvas.addEventListener('pointerdown',e=>{
    if(pointer!==null || (e.pointerType==='mouse'&&e.button!==0))return;aim(e);
    const glove=s.phase==='ready'&&touches(gloveAnchor,.51);
    const prize=s.phase==='reward'&&(touches(reward.prize,.42)||touches(reward.lid,.44));
    if(glove||prize){unlock();if(game.press(glove?'glove':'prize')){pointer=e.pointerId;canvas.setPointerCapture(pointer);}}
    else if(touches(reward.root,.51))game.nudge('box');
    else if(touches(blueAnchor,.4)||touches(rival.head,.75))game.nudge('rival');
    else if(touches(gloveAnchor,.45)||touches(hero.head,.75))game.nudge('player');
  });
  canvas.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'){aim(e);canvas.style.cursor=(s.phase==='ready'&&touches(gloveAnchor,.51)||s.phase==='reward'&&touches(reward.prize,.45))?'pointer':'default';}});
  function end(e,cancelled){if(pointer!==e.pointerId)return;pointer=null;if(cancelled)game.cancel();else game.release();if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);}
  canvas.addEventListener('pointerup',e=>end(e,false));canvas.addEventListener('pointercancel',e=>end(e,true));canvas.addEventListener('lostpointercapture',e=>end(e,true));
  window.addEventListener('blur',()=>{pointer=null;game.cancel();});
  const trail=Array.from(document.querySelectorAll('#trail svg'));
  let lastTrack=0;
  function drawState(){
    const track=s.tracking.x;
    if(Math.abs(track-lastTrack)>.0005){camera.lookAt(look.x,look.y+track,look.z);camera.updateMatrixWorld();lastTrack=track;
      reflected.lookAt(look.x,-.024-look.y-track,look.z);reflected.updateMatrixWorld();mirrorVP.multiplyMatrices(reflected.projectionMatrix,reflected.matrixWorldInverse);}
    drops.forEach((o,i)=>{const w=s.water[i];o.scale.y=(.014-i*.002)+w.x;o.rotation.z=w.v*6+w.x*17;});
    hero.body.rotation.z=-s.playerTilt.x+s.ripple.player.x; rival.body.rotation.z=-s.rivalTilt.x-s.ripple.rival.x;
    for(const [i,r] of [hero,rival].entries()){
      r.antenna.rotation.z=s.head[i].x*2.3;r.head.rotation.z=s.head[i].x;
      r.head.rotation.y=(i?-1:1)*(.024+(s.wind.x-.06)*.5)+(s.phase==='reward'?.19:0);
      r.head.rotation.x=s.aerial.detached && s.phase!=='reward'?-.08*Math.max(0,s.aerial.y):.015;
      for(const e of r.eyes)e.scale.y=Math.max(.09,1-s.eyes[i].blink.x);
    }
    hero.main.grip.position.copy(hero.main.hand);
    const along=s.fist.x-s.compression;
    hero.main.grip.position.x+=along*Math.cos(hero.root.rotation.y)/1.23;
    hero.main.grip.position.z+=along*Math.sin(hero.root.rotation.y)/1.23;
    hero.main.grip.rotation.z=-.19-.5*s.compression;hero.main.grip.rotation.x=-.21+s.fist.x*.37;
    const armVector=local.copy(hero.main.grip.position).sub(hero.main.elbow);armVector.y-=.20;
    hero.main.frame.quaternion.setFromUnitVectors(V(0,1,0),armVector.clone().normalize());
    hero.main.frame.scale.y=armVector.length()/hero.main.rest;
    // The blue glove separates from the wrist. The spring and wrist stay with the robot.
    const a=s.aerial,blue=rival.main.mitten;
    blue.position.set(0,0,0);blue.rotation.set(0,0,0);
    if(a.detached){rival.main.grip.getWorldQuaternion(q).invert();local.set(.057*a.y,a.y,-.02*a.y).applyQuaternion(q).multiplyScalar(1/1.16);blue.position.copy(local);blue.rotation.z=a.spin*.71;blue.rotation.y=a.spin*.61;}
    world(rival.main.grip,catchCoil.position);catchCoil.position.y-=.235;
    catchCoil.visible=a.detached && a.y>.04;catchCoil.scale.y=Math.max(.001,Math.min(s.catcher.x,a.y));
    hero.main.grip.scale.set(1-s.cushion.x*.42,1+s.cushion.x*.32,1-s.cushion.x*.39);
    if(equipped!==s.equipped){equipped=s.equipped;heroStyles.forEach((o,i)=>o.visible=i===equipped+1);}
    ring.lamps.forEach((m,i)=>m.emissiveIntensity=.058+2.6*s.lamps[i].x);
    fixture.g.rotation.z=s.pendulum.x;fixture.bulb.emissiveIntensity=.93+s.light.x*.54;
    farLamp.g.rotation.z=s.wind.x*.041;reward.lid.rotation.x=-s.lid.x-s.ripple.box.x;
    reward.prize.position.set(0,.36+s.prize.x*.93,0);reward.prize.rotation.set(-.1,s.prize.v*.075+.30,-.095+s.prize.v*.035);
    reward.prize.visible=(s.phase==='reward'&&s.lid.x>.6)||s.phase==='fitting';
    prizes.forEach((g,i)=>g.visible=i===s.offered);
    if(s.phase==='fitting'){
      world(gloveAnchor,dest);reward.root.worldToLocal(dest);const f=Math.min(1,s.fitting.x);
      reward.prize.position.lerp(dest,f);reward.prize.position.y+=.56*4*f*(1-f);
      heroStyles[equipped+1].visible=f<.83;
    }
    s.dust.forEach((d,i)=>{matrix.makeTranslation(d.x,d.y,d.z);dust.setMatrixAt(i,matrix);});dust.instanceMatrix.needsUpdate=true;
    const isReward=s.phase==='reward',waiting=isReward||s.phase==='ready',object=isReward?reward.prize:gloveAnchor;
    world(object,p0);sparks.visible=waiting||s.phase==='charging';
    sparks.position.copy(p0);sparks.position.y+=s.wind.x*.39;sparks.quaternion.copy(camera.quaternion);
    const starSize=.88+s.wind.x*1.25+s.compression*2.1;sparks.scale.setScalar(starSize);
    hand.visible=waiting&&s.idle>=4&&(!isReward||s.lid.x>.8);
    if(hand.visible){const amount=s.hint.x;local.set(.27-.089*amount,-.43+.115*amount,.38-.104*amount).applyQuaternion(camera.quaternion);hand.position.copy(p0).add(local);hand.quaternion.copy(camera.quaternion);hand.rotateZ(.34-.11*amount);}
    const idx=s.phase==='lights'||s.phase==='flight'?1:['reward','fitting','reset'].includes(s.phase)?2:0;
    if(idx!==oldStage){oldStage=idx;trail.forEach((el,i)=>el.classList.toggle('current',idx===i));}
  }
  let last=null;
  document.addEventListener('visibilitychange',()=>{last=null;if(document.hidden){game.cancel();pointer=null;}});
  function animate(now){
    requestAnimationFrame(animate);if(document.hidden)return;
    if(last!==null)game.step(Math.min(.09,(now-last)/1000));last=now;drawState();sound();frame++;
    if(frame%2===1 || mirrorDirty)renderer.shadowMap.needsUpdate=true;
    if(mirrorDirty||frame%5===0){gym.floor.visible=false;renderer.setRenderTarget(reflection);renderer.render(scene,reflected);gym.floor.visible=true;mirrorDirty=false;}
    renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(passScene,quadCamera);
  }
  requestAnimationFrame(animate);
})();
