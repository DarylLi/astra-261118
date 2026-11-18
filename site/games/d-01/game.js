'use strict';
(() => {
  const {T,PI,group,mat,mesh,box,cyl,ring,sphere,M,batch}=Craft;
  const game=SumoSimulation.createGame(), s=game.state;
  window.__GAME__={step:game.step,getState:game.getState};
  const canvas=document.querySelector('canvas');
  const renderer=new T.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:'high-performance'});
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
  const scene=new T.Scene();scene.background=new T.Color(0xb6b3a4);scene.fog=new T.Fog(0xbcb09a,14,34);
  const camera=new T.PerspectiveCamera(30,1,.13,85);
  const hemi=new T.HemisphereLight(0xc3d5e0,0xb99a78,1.23);scene.add(hemi);
  const sun=new T.DirectionalLight(0xffdfab,3.1);
  sun.position.set(-8.2,5.4,-5.5);sun.target.position.set(0,0,.1);scene.add(sun,sun.target);
  sun.castShadow=true;sun.shadow.mapSize.set(1536,1536);
  Object.assign(sun.shadow.camera,{left:-7.5,right:7.5,top:7.7,bottom:-6.5,near:.3,far:22});
  sun.shadow.camera.updateProjectionMatrix();sun.shadow.normalBias=.009;sun.shadow.bias=-.00016;
  const shop=makeWorkshop(scene);
  // Capture the actual sash, bench, walls and low sky in the metal and glass.
  const pmrem=new T.PMREMGenerator(renderer);
  const reflection=pmrem.fromScene(scene,.035,.12,45,{size:128,position:new T.Vector3(0,1.94,.42)});
  scene.environment=reflection.texture;scene.environmentIntensity=.85;pmrem.dispose();
  const red=Toys.robot(scene,true),blue=Toys.robot(scene,false),next=Toys.robot(scene,false);
  next.root.visible=false;
  const ghost=Toys.guide(scene);
  const redShadow=shop.shadow(scene,1.98,1.34,0,.363,0,.83);
  const blueShadow=shop.shadow(scene,1.9,1.30,0,.364,0,.81);
  const installSpot=group(red.frame,0,.46,.24);
  const tray=group(shop.drawer,0,.15,-.79);
  cyl(tray,.65,.72,.11,M.iron,0,.05,0,56);ring(tray,.61,.022,M.brass,0,.11,0);
  cyl(tray,.27,.36,.27,M.brass,0,.22,0);cyl(tray,.50,.31,.073,M.dark,0,.39,0);
  batch(tray);
  const socketGlow=mat(0xf6ca74,.39,.26,{emissive:0xffb84e,emissiveIntensity:.4});
  ring(tray,.472,.023,socketGlow,0,.43,0);
  const reward=group(scene), prizeTracks=Toys.tracks(reward),prizeArms=Toys.bigArms(reward);
  const buttonCenter=group(reward);
  // Polished fittings catch a warm glow from the little socket under the part.
  const prizeMetals=new Map();
  reward.traverse(o=>{
    if(!o.isMesh || o.material.metalness<.48)return;
    const source=o.material;
    if(!prizeMetals.has(source)){
      const lit=source.clone();lit.emissive.setHex(0xd89a41);prizeMetals.set(source,lit);
    }
    o.material=prizeMetals.get(source);
  });
  const grit=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),mat(0xf9dfb3,.04,.81,{transparent:true,opacity:.39,depthWrite:false,emissive:0xd6b78b,emissiveIntensity:.16}),s.dust.length);
  grit.instanceMatrix.setUsage(T.DynamicDrawUsage);grit.frustumCulled=false;scene.add(grit);
  const proxy=new T.Object3D(),p=new T.Vector3(),q=new T.Vector3();
  const rest=new WeakMap();
  for(const toy of [blue,next]) for(const o of [toy.head,...toy.ears,...toy.arms])rest.set(o,o.position.clone());

  // Mild optical bloom and film grain, all in linear light before the display transform.
  const hdr=renderer.extensions.has('EXT_color_buffer_float');
  const target=new T.WebGLRenderTarget(1,1,{type:hdr?T.HalfFloatType:T.UnsignedByteType,samples:Math.min(4,renderer.capabilities.maxSamples),depthBuffer:true});
  target.depthTexture=new T.DepthTexture(1,1,T.UnsignedIntType);
  const post=new T.Scene(), ortho=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const film=new T.ShaderMaterial({
    depthTest:false,depthWrite:false,
    uniforms:{photo:{value:target.texture},depthMap:{value:target.depthTexture},pixel:{value:new T.Vector2()},focus:{value:10},nearP:{value:camera.near},farP:{value:camera.far}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`
      varying vec2 vUv;
      uniform sampler2D photo,depthMap;
      uniform vec2 pixel;
      uniform float focus,nearP,farP;
      float hash(vec2 p){return fract(52.9829189*fract(dot(p,vec2(.06711056,.00583715))));}
      void main(){
        float depth=texture2D(depthMap,vUv).r;
        float dist=nearP*farP/(farP-depth*(farP-nearP));
        float coc=smoothstep(2.7,7.6,dist-focus)*2.0;
        vec3 src=texture2D(photo,vUv).rgb, soft=src*2., bloom=vec3(0.);
        for(int i=0;i<8;i++){
          float a=(float(i)+.5)*.78539816;vec2 d=vec2(cos(a),sin(a))*pixel;
          soft+=texture2D(photo,vUv+d*coc).rgb;
          vec3 bright=texture2D(photo,vUv+d*(5.+3.*mod(float(i),2.))).rgb;
          bloom+=max(bright-vec3(1.25),vec3(0.));
        }
        vec3 c=soft*.1+bloom*.009;
        vec2 lens=vUv*2.-1.;c*=1.-.092*dot(lens,lens)*.5;
        gl_FragColor=vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        gl_FragColor.rgb+=(hash(gl_FragCoord.xy)-.5)*.010;
      }`
  });
  post.add(new T.Mesh(new T.PlaneGeometry(2,2),film));
  let dist=10,portrait=false,frameWidth=1,frameHeight=1;
  function resize(){
    const rect=canvas.getBoundingClientRect();frameWidth=rect.width;frameHeight=rect.height;
    camera.aspect=frameWidth/Math.max(1,frameHeight);portrait=camera.aspect<.85;
    const height=Math.max(6.68, (portrait?6.35:9.73)/camera.aspect);
    dist=height/(2*Math.tan(PI/12));
    camera.updateProjectionMatrix();
    const dpr=Math.min(window.devicePixelRatio||1,1.65,1850/Math.max(frameWidth,frameHeight));
    renderer.setPixelRatio(dpr);renderer.setSize(frameWidth,frameHeight,false);
    const sz=renderer.getDrawingBufferSize(new T.Vector2());target.setSize(sz.x,sz.y);
    film.uniforms.pixel.value.set(1/sz.x,1/sz.y);film.uniforms.focus.value=dist;
    scene.fog.near=dist+2.1;scene.fog.far=dist+21;
  }
  resize();window.addEventListener('resize',resize);
  const observer=new ResizeObserver(resize);observer.observe(canvas);

  const smooth=v=>{v=Math.min(1,Math.max(0,v));return v*v*(3-2*v);};
  function positionCamera(){
    const drawer=Math.min(1,s.focus.front.x/.248),side=portrait?.391:.364;
    const tilt=(portrait?.260:.290)+drawer*.095;
    // Shift the optical centre towards the active mechanism; the lens stays at 30 degrees.
    const aim=new T.Vector3(s.focus.x.x*10+(portrait?.38:.34), (portrait?.93:.77)-s.focus.down.x*10,s.focus.front.x*10+.46);
    const v=new T.Vector3(side,tilt,Math.sqrt(1-side*side-tilt*tilt));
    camera.position.copy(aim).addScaledVector(v,dist);camera.lookAt(aim);camera.updateMatrixWorld();
  }
  function pose(toy,r,player) {
    const trade=s.phase==='exchange',u=trade?smooth(s.exchange):0;
    let x=r.x*10,y=r.y*10+.358,z=player?.16:-.15;
    if(player) x+=( -1.22-x)*u;
    else if(trade) { x+=u*4.6;z-=u*2.9; }
    let scale=player?1:1+.21*(1-Math.exp(-.58*(s.round-(trade?1:0))));
    toy.root.position.set(x,y,z);
    toy.root.rotation.y=player?.86:-.77;toy.root.scale.setScalar(scale);
    const c=r.lean.x,lean=player?s.recoil.x:0;
    toy.frame.rotation.z=-c+(player?lean*.40:-s.tilt.x*.67);
    toy.frame.rotation.x=c*.42+(player?lean*.54:s.tilt.x*.45);
    toy.frame.position.y=player?.014*s.tracks/(1+s.tracks)+s.socket.x*.16:0;
    if(!player && r.y<-.20)toy.root.position.y-=s.cushion.x*10;
    const lookAtKey=player && (s.phase==='ready'||s.phase==='winding');
    toy.head.rotation.y=player ? (lookAtKey?-.21-s.guide.pressure.x*.19:-.04):.25;
    toy.head.rotation.x=r.head.x+(player?.035:0);toy.head.rotation.z=r.head.x*.88;
    toy.aerial.rotation.z=r.aerial.x+(player?s.tap.red.x:s.tap.blue.x);
    for(let i=0;i<2;i++){
      const eye=toy.eyes[i];eye.scale.y=Math.max(.06,1-r.blink.x*3.2);
      eye.rotation.y=lookAtKey?-.23:0;
      // The loose elbows, unlike the aerial, also follow the local wheel crank.
      toy.arms[i].rotation.x=-.32-Math.min(.47,Math.abs(r.v))*.8+Math.sin(r.wheel+i*PI)*Math.min(.24,Math.abs(r.v))+.05*r.aerial.x;
      toy.arms[i].rotation.z=(i?1:-1)*(.092+.21*c);
    }
    const treaded=player && s.tracks>0;
    toy.base.visible=!treaded;
    for(const wheel of toy.wheels){wheel.visible=!treaded;wheel.rotation.x=r.wheel;}
    if(player){
      toy.key.rotor.rotation.y=s.key.x;
      toy.key.m.emissiveIntensity=lookAtKey?.15+s.guide.pressure.x*.13:0.036;
      toy.needle.rotation.z=1.27-2.55*(s.charge+s.drive);
      toy.upgradeTracks.visible=s.tracks>0;toy.upgradeArms.visible=s.arms>0;
      if(s.tracks){
        toy.upgradeTracks.scale.setScalar(1+.1*(1-Math.exp(1-s.tracks)));
        toy.upgradeTracks.userData.drive(r.wheel*.34);
      }
      if(s.arms)toy.upgradeArms.scale.setScalar(1+.1*(1-Math.exp(1-s.arms)));
    }else{
      for(const [i,o] of [toy.head,...toy.ears,...toy.arms].entries()){
        o.position.copy(rest.get(o));
        if(i===1||i===2)o.rotation.z=0;
        const part=s.pieces[i];
        if(part){
          // Ears have their own sockets and trajectories even while the head is loose.
          const head=i===1||i===2 ?s.pieces[0]:null;
          o.position.x+=(part.x-(head?head.x:0))*10;
          o.position.y+=(part.y-(head?head.y:0))*10;
          o.position.z+=(part.z-(head?head.z:0))*10;
          o.rotation.z+=part.angle;
        }else if(i===1||i===2)o.rotation.z=0;
      }
      if(s.phase==='reward'||s.phase==='install'){
        toy.arms[1].rotation.z=-.85-r.aerial.x*2;toy.head.rotation.y=.54;
      }
    }
    const contact=player?redShadow:blueShadow;
    contact.position.x=x;contact.position.z=z;
    contact.position.y=.364;contact.visible=player||r.y>-.025;
    contact.material.opacity=player?.81:Math.max(0,.8-r.v*.12);
  }
  function showNext(){
    next.root.visible=s.phase==='exchange';
    if(!next.root.visible)return;
    const u=smooth(s.exchange), amount=1+.21*(1-Math.exp(-.58*s.round));
    // A fresh, larger opponent rolls from behind the plate as its predecessor leaves the pad.
    next.root.position.set(1.2+(1-u)*.98,.358-(1-u)*.34,-.15-(1-u)*4.65);
    next.root.rotation.y=-.77-(1-u)*.7;
    next.root.scale.setScalar(amount);next.head.rotation.y=.25;
    for(const wheel of next.wheels)wheel.rotation.x=s.exchange*11.2;
  }
  function updateWorld(){
    positionCamera();pose(red,s.red,true);pose(blue,s.blue,false);showNext();
    sun.intensity=3.10*s.air.warmth.x;
    shop.drawer.position.z=shop.front+s.drawer.x*10+0.32*s.tap.drawer.x;
    shop.pressPad(s.blue.x*10,-.15,s.cushion.x*10);
    shop.water.scale.y=s.wet.amount;shop.water.rotation.z=s.wet.surface.x*3.1;
    shop.ripple.scale.setScalar(.86+s.wet.surface.x*90);shop.ripple.position.y=.147+s.wet.surface.x*2;
    shop.drop.visible=s.wet.dripIn<.32;
    if(shop.drop.visible){const t=1-s.wet.dripIn/.32;shop.drop.position.y=1.03-.88*t*t;shop.drop.scale.y=.036+.038*t;}
    s.dust.forEach((d,i)=>{
      proxy.position.set(d.x*10,d.y*10,d.z*10);proxy.scale.setScalar(d.radius*10);
      proxy.updateMatrix();grit.setMatrixAt(i,proxy.matrix);
    });grit.instanceMatrix.needsUpdate=true;
    const opened=s.drawer.x>.025;
    reward.visible=(s.phase==='reward'||s.phase==='install')&&opened;
    tray.visible=opened;
    if(reward.visible){
      tray.getWorldPosition(p);p.y+=.655;
      const u=s.phase==='install'?smooth(s.install):0;
      installSpot.position.y=s.part==='tracks'?.24:.87;
      installSpot.getWorldPosition(q);
      reward.position.copy(p).lerp(q,u);reward.position.y+=Math.sin(u*PI)*1.29;
      reward.rotation.y=-.69+(red.root.rotation.y+.69)*u;
      prizeTracks.visible=s.part==='tracks';prizeArms.visible=!prizeTracks.visible;
      socketGlow.emissiveIntensity=.47+s.guide.pressure.x*.36;
      for(const metal of prizeMetals.values())metal.emissiveIntensity=(.16+.10*s.guide.pressure.x)*(1-u);
    }
    ghost.visible=s.guide.visible&&(!reward.visible||s.drawer.x>.12);
    if(ghost.visible){
      const d=s.guide.pressure.x;
      if(s.phase==='reward')buttonCenter.getWorldPosition(p);else red.key.tip.getWorldPosition(p);
      ghost.position.copy(p);ghost.position.x-=.28*(1-d);
      ghost.position.y+=.08+.48*(1-d);ghost.position.z+=.20;
      ghost.quaternion.copy(camera.quaternion);ghost.rotateZ(.50-.13*d);ghost.scale.setScalar(portrait?1.04:.94);
    }
  }
  // The audio engine is opened by a pointer gesture and has no file dependencies.
  let context,master,noiseBuffer;
  function unlock(){
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio)return;
    if(!context){
      context=new Audio();
      master=context.createGain();master.gain.value=.14;master.connect(context.destination);
      noiseBuffer=context.createBuffer(1,Math.floor(context.sampleRate*.32),context.sampleRate);
      const data=noiseBuffer.getChannelData(0);let previous=0;
      for(let i=0;i<data.length;i++){previous=(previous+(Math.random()*2-1)*.3)/1.2;data[i]=previous;}
    }
    if(context.state==='suspended')context.resume().catch(()=>{});
  }
  function note(freq,length,loud,delay=0,slide=1,type='sine'){
    const start=context.currentTime+delay,o=context.createOscillator(),g=context.createGain();
    o.type=type;o.frequency.setValueAtTime(freq,start);o.frequency.exponentialRampToValueAtTime(freq*slide,start+length);
    g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(Math.max(.001,loud),start+.009);
    g.gain.exponentialRampToValueAtTime(.0001,start+length);o.connect(g);g.connect(master);o.start(start);o.stop(start+length+.01);
  }
  function hush(frequency,volume,len){
    const src=context.createBufferSource(),f=context.createBiquadFilter(),g=context.createGain();
    const t=context.currentTime;src.buffer=noiseBuffer;f.type='lowpass';f.frequency.value=frequency;
    g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.001,t+len);
    src.connect(f);f.connect(g);g.connect(master);src.start(t);src.stop(t+len);
  }
  function sounds(){
    for(const e of game.takeSounds()){
      if(!context||context.state!=='running')continue;
      switch(e.name){
        case 'engage':note(342,.09,.18);break;
        case 'pawl':note(465+e.value*205,.073,.13,0,.84,'triangle');note(1043,.047,.045);if(e.value===1)note(932,.33,.21,.05);break;
        case 'release':note(225,.25,.23,0,1.85,'triangle');hush(900,.4,.16);break;
        case 'bump':note(156,.17,.41,0,.75);note(398,.14,.13,.01);break;
        case 'tip':note(495,.26,.18,0,.88);break;
        case 'puff':hush(720,.9,.26);note(183,.20,.27,0,.7);note(698,.27,.17,.14);note(880,.3,.13,.26);break;
        case 'drawer':hush(900,.45,.24);note(523,.43,.19,.12);note(659,.52,.18,.23);note(784,.48,.17,.37);break;
        case 'pick':note(660,.31,.22);note(988,.34,.17,.10);break;
        case 'snap':hush(1400,.32,.07);note(784,.33,.21);note(1046,.5,.16,.13);break;
      }
    }
  }
  const ray=new T.Raycaster(),ndc=new T.Vector2();
  function hitAt(clientX,clientY){
    const rect=canvas.getBoundingClientRect(),x=clientX-rect.left,y=clientY-rect.top;
    ndc.set(x/rect.width*2-1,1-y/rect.height*2);ray.setFromCamera(ndc,camera);
    let obj,spot,name;
    if(s.phase==='ready'){obj=red.root;spot=red.key.tip;name='wind';}
    else if(s.phase==='reward'&&reward.visible){obj=reward;spot=buttonCenter;name='part';}
    else return null;
    const hits=ray.intersectObject(obj,true);
    if(hits.some(h=>{let a=h.object;while(a){if(!a.visible)return false;a=a.parent;}return true;}))return name;
    spot.getWorldPosition(p).project(camera);
    // A finger-sized tolerance around the small brass handle and the exposed prize.
    if(Math.hypot(x-(p.x+1)*rect.width/2,y-(1-p.y)*rect.height/2)<Math.max(23,Math.min(36,rect.width*.032)))return name;
    return null;
  }
  let pointer=null;
  canvas.addEventListener('pointerdown',e=>{
    if(pointer!==null||e.button!==0||!e.isPrimary)return;
    e.preventDefault();unlock();
    const hit=hitAt(e.clientX,e.clientY);
    if(hit){pointer=e.pointerId;canvas.setPointerCapture(pointer);game.press(hit);}
    else {
      // Only another visible fitting answers a misplaced touch, with a tiny rattle.
      const inactive=ray.intersectObjects([blue.root,shop.drawer,red.root],true);
      if(inactive.length){
        let obj=inactive[0].object;
        while(obj && obj!==blue.root && obj!==red.root && obj!==shop.drawer)obj=obj.parent;
        game.press(obj===blue.root?'blue':obj===red.root?'red':'drawer');
      }
    }
  });
  function finish(e,cancelled){
    if(e.pointerId!==pointer)return;
    pointer=null;if(cancelled)game.cancel();else game.release();
    if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
  }
  canvas.addEventListener('pointerup',e=>finish(e,false));
  canvas.addEventListener('pointercancel',e=>finish(e,true));
  canvas.addEventListener('lostpointercapture',e=>finish(e,true));
  canvas.addEventListener('pointermove',e=>{
    if(e.pointerType==='mouse'&&pointer===null)canvas.style.cursor=hitAt(e.clientX,e.clientY)?'pointer':'default';
  });
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  let last=null;
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){game.cancel();pointer=null;if(context)context.suspend().catch(()=>{});}
    last=null;
  });
  function frame(now){
    if(!document.hidden){
      if(last!==null)game.step(Math.min(.1,(now-last)/1000));
      updateWorld();sounds();
      renderer.setRenderTarget(target);renderer.render(scene,camera);
      renderer.setRenderTarget(null);renderer.render(post,ortho);
    }
    last=now;requestAnimationFrame(frame);
  }
  updateWorld();scene.updateMatrixWorld(true);requestAnimationFrame(frame);
})();
