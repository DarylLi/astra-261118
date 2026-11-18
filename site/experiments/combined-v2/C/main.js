(() => {
  'use strict';
  const {T,PI,TAU,rand,group,mat,glaze,mesh,ball,box,lathe,rounded,ring,rod,tube,texture,M}=Studio;
  const P=PancakePhysics, C=Cooking, sim=createKitchen();
  window.step=sim.step;window.getState=sim.getState;
  const canvas=document.getElementById('kitchen');
  const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.14;
  const scene=new T.Scene();scene.background=new T.Color(0xe1d1b7);
  const camera=new T.PerspectiveCamera(36,1,.12,42);
  Studio.env(scene,renderer);
  const sunlight=new T.DirectionalLight(0xffe5ce,2.65);
  sunlight.position.set(-3.3,6.5,-2.7);sunlight.target.position.set(0,.18,.95);
  sunlight.castShadow=true;sunlight.shadow.mapSize.set(2048,2048);
  Object.assign(sunlight.shadow.camera,{left:-4.5,right:4.5,top:4.5,bottom:-4.5,near:.5,far:17});
  sunlight.shadow.normalBias=.012;sunlight.shadow.bias=-.00021;
  scene.add(sunlight,sunlight.target,new T.HemisphereLight(0xdce6f4,0xc49b72,.31));
  const room=group(scene);Studio.room(room);
  const actors=[0,1,2].map(i=>Family.person(scene,i));
  actors.forEach(p=>{
    const fork=group(p.arms[1].palm,0,-.027,.019);fork.rotation.x=.79;
    rod(fork,[0,0,0],[0,-.219,.026],.008,M.steel,.005);
    for(let j=-1;j<=1;j++)rod(fork,[0,-.19,.026],[j*.012,-.259,.047],.003,M.steel,.002);
    p.morsel=ball(fork,0,-.233,.048,.041,.022,.041,mat(0xca975c,.73));p.fork=fork;fork.visible=false;
  });
  const bowl=C.bowl(scene),milk=C.jug(scene),pan=C.pan(scene),plate=C.plate(scene);
  const ladle=C.spoon(scene,false),spatula=C.spoon(scene,true),syrupJug=C.jug(scene,true);
  const ladleFood=ball(ladle,0,-.018,0,.127,.018,.127,C.dough);
  const staging=group(scene),dish=C.plate(staging,.285),patDish=C.butter(dish);
  patDish.position.set(0,.16,0);patDish.scale.setScalar(1.9);
  const berryDish=C.plate(staging,.33);
  const berry=C.berry(scene);berry.scale.setScalar(1.26);
  const stackModels=Array.from({length:3},()=>C.cakeModel(scene));
  const pat=C.butter(scene),butterVertices=pat.geometry.attributes.position.array.slice();
  const filmMat=glaze(0xe0b44e,.12,.64),films=[];
  for(let i=0;i<9;i++)films.push(ball(scene,0,0,0,.01,.002,.01,filmMat));
  const syrupG=group(scene);
  const syrupMat=glaze(0xbe6c25,.12,.72,{metalness:.025});
  const slick=mesh(syrupG,new T.CircleGeometry(1,80),syrupMat);slick.geometry.rotateX(-PI/2);slick.frustumCulled=false;
  const rivulets=Array.from({length:8},()=>ball(syrupG,0,0,0,.02,.03,.02,syrupMat));
  const batterStream=ball(scene,0,0,0,.027,.24,.027,C.dough);
  const milkStream=ball(scene,0,0,0,.012,.12,.012,C.milk);
  const syrupStream=ball(scene,0,0,0,.011,.24,.011,C.honey);
  const wash=C.basin(scene),sponge=rounded(scene,0,0,0,.245,.073,.154,.028,mat(0xc6a352,.93,0,{bumpMap:Studio.grain,bumpScale:.006}));
  const water=lathe(wash,0,0,0,[[.0001,.107],[.661,.108],[.669,.114],[.0001,.113]],glaze(0xaac2b6,.14,.45,{transparent:true,opacity:.61,depthWrite:false}));
  const ripple=ring(wash,0,.115,0,.32,.0025,M.white);
  const crumbs=Array.from({length:20},(_,i)=>{
    const a=i*2.4,r=.12+rand()*.42;
    const o=ball(plate,r*Math.cos(a),.062,r*Math.sin(a),.009+rand()*.022,.005,.008+rand()*.021,i%3?C.dough:C.honey);
    o.visible=false;return o;
  });
  // Eggs, flour crock and a folded napkin remain in the kitchen between steps.
  const extras=group(scene);
  const eggDish=C.plate(extras,.346);eggDish.position.set(-1.36,.012,.36);
  const eggMap=texture(192,192,(c,w,h)=>{
    c.fillStyle='#edc6a1';c.fillRect(0,0,w,h);
    for(let i=0;i<710;i++){const x=rand()*w,y=rand()*h;c.fillStyle='rgba(114,71,41,'+rand()*.23+')';c.fillRect(x,y,.4+rand()*1.4,.7);}
  });
  const eggMat=mat(0xffffff,.57,0,{map:eggMap});
  for(let i=0;i<3;i++){
    const e=ball(extras,-1.37+.14*Math.cos(i*2.3),.150,.36+.124*Math.sin(i*2.3),.097,.136,.10,eggMat);
    e.rotation.z=-.44+i*.44;
  }
  const crock=group(extras,1.68,.006,-.03);
  lathe(crock,0,0,0,[[.168,.003],[.194,.02],[.196,.37],[.176,.406],[.17,.442],[.159,.446],[.147,.429],[.15,.375]],mat(0xcaac80,.39));
  ring(crock,0,.342,0,.196,.004,M.walnut);ring(crock,0,.327,0,.196,.003,M.walnut);
  ball(crock,0,.402,0,.151,.035,.151,C.flourMat);
  const scoop=rod(crock,[.037,.4,0],[.181,.72,.02],.022,M.oak,.027);
  const board=rounded(extras,1.61,.034,1.12,.63,.046,1.02,.076,M.wood);board.rotation.y=.32;
  const folded=rounded(extras,-1.95,.045,1.81,.78,.07,.63,.021,Studio.cloth('#d7bc99','#a65e4c','check'));folded.rotation.y=.17;
  const salt=lathe(extras,-2.15,.09,1.76,[[.065,0],[.084,.028],[.075,.176],[.064,.199],[.064,.211],[.073,.222],[.067,.237],[.002,.24]],M.porcelain,40);
  // Batch fixed geometry by material within each rigid object. Articulated parts keep their pivots.
  function batchRigid(g) {
    const bins=new Map();
    g.children.slice().forEach(o=>{
      if(!o.isMesh || o.isInstancedMesh || Array.isArray(o.material))return;
      if(!bins.has(o.material))bins.set(o.material,[]);
      bins.get(o.material).push(o);
    });
    bins.forEach((set,m)=>{
      if(set.length<2)return;
      const pos=[],norm=[],uv=[],indices=[];
      for(const o of set){
        o.updateMatrix();const geo=o.geometry,pa=geo.attributes.position,na=geo.attributes.normal,ua=geo.attributes.uv;
        const off=pos.length/3,nm=new T.Matrix3().getNormalMatrix(o.matrix),v=new T.Vector3();
        for(let i=0;i<pa.count;i++){
          v.fromBufferAttribute(pa,i).applyMatrix4(o.matrix);pos.push(v.x,v.y,v.z);
          if(na){v.fromBufferAttribute(na,i).applyNormalMatrix(nm);norm.push(v.x,v.y,v.z);}else norm.push(0,1,0);
          if(ua)uv.push(ua.getX(i),ua.getY(i));else uv.push(0,0);
        }
        if(geo.index){for(const k of geo.index.array)indices.push(off+k);}else for(let k=0;k<pa.count;k++)indices.push(off+k);
        g.remove(o);
      }
      const out=new T.BufferGeometry();out.setAttribute('position',new T.Float32BufferAttribute(pos,3));out.setAttribute('normal',new T.Float32BufferAttribute(norm,3));
      out.setAttribute('uv',new T.Float32BufferAttribute(uv,2));out.setIndex(indices);mesh(g,out,m);
    });
  }
  room.traverse(o=>{if(o.isGroup)batchRigid(o);});
  for(const p of actors){
    [p.figure,p.head,...p.arms.flatMap(a=>[a.shoulder,a.elbow,a.palm])].forEach(batchRigid);
  }
  batchRigid(extras);batchRigid(bowl.whisk);batchRigid(pan.root);
  // Linear HDR colour and per-pixel perspective depth feed a small aperture gather.
  const target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,minFilter:T.LinearFilter,magFilter:T.LinearFilter,depthBuffer:true});
  target.depthTexture=new T.DepthTexture(1,1,T.UnsignedIntType);
  const post=new T.Scene(),screenCam=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const uniforms={
    source:{value:target.texture},depthMap:{value:target.depthTexture},res:{value:new T.Vector2(1,1)},
    toneMappingExposure:{value:renderer.toneMappingExposure},meter:{value:0},chroma:{value:1},
    focus:{value:4.1},znear:{value:camera.near},zfar:{value:camera.far}
  };
  const finish=new T.ShaderMaterial({uniforms,depthTest:false,depthWrite:false,toneMapped:false,
    vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`
    #include <tonemapping_pars_fragment>
    uniform sampler2D source,depthMap;
    uniform vec2 res;
    uniform float focus,znear,zfar,meter,chroma;
    varying vec2 vUv;
    float distAt(vec2 uv){float d=texture2D(depthMap,uv).x;return znear*zfar/(zfar-d*(zfar-znear));}
    void main(){
      float d=distAt(vUv);
      float blur=min(6.,abs(1./max(d,.1)-1./focus)*39.)*min(res.y/770.,1.7);
      vec3 base=texture2D(source,vUv).rgb, sum=base*2.,glow=vec3(0.);float weight=2.;
      for(int i=0;i<14;i++){
        float a=float(i)*2.39996;
        vec2 dir=vec2(cos(a),sin(a))*sqrt((float(i)+.5)/14.);
        vec2 uv=clamp(vUv+dir*blur/res,vec2(.0001),vec2(.9999));
        float w=smoothstep(-.65,-.02,distAt(uv)-d)+.06;
        vec3 sampleCol=texture2D(source,uv).rgb;sum+=sampleCol*w;weight+=w;
        glow+=max(texture2D(source,clamp(vUv+dir*4.5/res,0.,1.)).rgb-1.1,0.);
      }
      vec3 c=sum/weight+.024*glow/14.;
      vec2 v=(vUv-.5)*2.;c*=1.-.043*dot(v,v);
      vec3 rgb=sRGBTransferOETF(vec4(ACESFilmicToneMapping(c),1.)).rgb;
      float peak=max(rgb.r,max(rgb.g,rgb.b));
      float sat=1.-min(rgb.r,min(rgb.g,rgb.b))/max(peak,.0001);
      if(meter>.5){gl_FragColor=vec4(sat,0.,0.,1.);return;}
      float corrected=1.-pow(max(0.,1.-sat),chroma);
      gl_FragColor=vec4(vec3(peak)-(vec3(peak)-rgb)*corrected/max(sat,.0001),1.);

      float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.545);
      gl_FragColor.rgb+=(grain-.5)*.006;
    }`});
  post.add(new T.Mesh(new T.PlaneGeometry(2,2),finish));
  let narrow=false,aspect=1,initial=true,focus=new T.Vector3(),baseZ=1.07,hx=-.08;
  function resize(){
    const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight);aspect=w/h;narrow=aspect<.86;
    const ratio=Math.min(devicePixelRatio||1,1.65,Math.sqrt(1600000/(w*h)));
    renderer.setPixelRatio(ratio);renderer.setSize(w,h,false);
    const size=renderer.getDrawingBufferSize(new T.Vector2());target.setSize(size.x,size.y);uniforms.res.value.copy(size);
    camera.aspect=aspect;const extra=narrow?Math.max(0,.445/aspect-1)*4.8:0;
    camera.position.set(0,narrow?3.43+extra*.42:2.60,narrow?5.55+extra:4.78);
    camera.lookAt(0,narrow?.79:.82,0);camera.updateProjectionMatrix();camera.updateMatrixWorld();
    Family.layout(actors,narrow);
    hx=narrow?-.018:-.115;baseZ=narrow?.99:1.05;
  }
  resize();window.addEventListener('resize',resize);
  if(window.visualViewport)visualViewport.addEventListener('resize',resize);
  const ray=new T.Raycaster(),ground=new T.Plane(new T.Vector3(0,1,0),-.28);
  let immersiveTried=false;
  let pointer=null,mouse={x:0,z:0},sound=null;
  function input(e){
    const r=canvas.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),camera);
    const world=ray.ray.intersectPlane(ground,new T.Vector3())||focus;
    mouse={x:P.clamp((world.x-hx)/.71,-1,1),z:P.clamp((world.z-baseZ)/.61,-1,1)};
  }
  function audioStart(){
    if(!sound){const AC=window.AudioContext||window.webkitAudioContext;if(AC)try{sound=new AC();}catch{}}
    if(sound&&sound.state==='suspended')sound.resume().catch(()=>{});
  }
  function note(hz,life,gain=.03,noise=false){
    if(!sound||sound.state!=='running')return;
    const now=sound.currentTime,env=sound.createGain();let src;
    if(noise){
      const length=Math.max(1,Math.ceil(sound.sampleRate*life)),buffer=sound.createBuffer(1,length,sound.sampleRate),dst=buffer.getChannelData(0);
      for(let i=0;i<length;i++)dst[i]=Math.random()*2-1;
      src=sound.createBufferSource();src.buffer=buffer;
      const filt=sound.createBiquadFilter();filt.type='bandpass';filt.frequency.value=hz;filt.Q.value=.75;src.connect(filt);filt.connect(env);
    }else{
      src=sound.createOscillator();src.type='sine';src.frequency.setValueAtTime(hz,now);src.frequency.exponentialRampToValueAtTime(hz*.73,now+life);src.connect(env);
    }
    env.gain.setValueAtTime(.0001,now);env.gain.exponentialRampToValueAtTime(gain,now+.009);env.gain.exponentialRampToValueAtTime(.0001,now+life);
    env.connect(sound.destination);src.start(now);src.stop(now+life+.01);
  }
  function hit(g){return g.visible&&ray.intersectObject(g,true).length>0;}
  canvas.addEventListener('pointerdown',e=>{
    if(pointer!==null)return;pointer=e.pointerId;canvas.setPointerCapture(pointer);audioStart();input(e);
    if(!immersiveTried){
      immersiveTried=true;
      if(document.fullscreenEnabled && !document.fullscreenElement)
        document.documentElement.requestFullscreen({navigationUI:'hide'}).catch(()=>{});
    }
    const s=sim.read();let object='',layer;
    if(s.phase==='mix'){object=hit(milk)?'milk':hit(ladle)?'ladle':'';}
    if(['pour','cook','second'].includes(s.phase)&&hit(pan.knob))object='dial';
    if(s.phase==='second')for(let i=s.stack.length-1;i>=0;i--){
      const model=stackModels.find(m=>m.id===s.stack[i].id);
      if(model&&hit(model.root)){layer=i;break;}
    }
    sim.down(mouse.x,mouse.z,object,layer);
    if(object==='milk')note(340,.28,.036,true);
    else if(object==='dial')note(970,.055,.033);
    else if(s.phase==='wash')note(1320,.25,.04,true);
    else note(s.phase==='mix'?740:430,.09,.018);
    e.preventDefault();
  });
  canvas.addEventListener('pointermove',e=>{if(e.pointerId===pointer){input(e);sim.move(mouse.x,mouse.z);e.preventDefault();}});
  function release(e){if(e.pointerId===pointer){pointer=null;sim.up();}}
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,release);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){pointer=null;sim.up();}});
  const rest=new T.Vector3();
  function place(o,x,y,z,dt,speed=5.8){
    rest.set(x,y,z);if(initial)o.position.copy(rest);else o.position.lerp(rest,1-Math.exp(-speed*dt));
  }
  let lastPhase='',hintWait=1.5,hint=0,hintV=0,audioWait=0,geomTime=0,prevPops=0,washWave=0;
  const extent=new T.Vector3();
  function animate(dt){
    const s=sim.read(),p=s.phase;
    const mixing=p==='mix',cooking=['pour','cook','flip','second','stack'].includes(p),
      serving=['butter','syrup','berry','eat'].includes(p),washing=p==='wash';
    if(lastPhase!==p){
      hintWait=.38;
      if(p==='second')note(1440,.16,.052,true);
      if(p==='stack'||p==='butter')note(620,.24,.026);
      if(p==='berry')note(580,.09,.018);
      if(p==='wash')washWave=0;
      lastPhase=p;
    }
    hintWait-=dt;
    if(pointer===null&&hintWait<=0){hintV+=.43;hintWait=2.7+rand()*2.4;}
    hintV+=(-20*hint-6*hintV)*dt;hint+=hintV*dt;
    const mx=hx,mz=baseZ,shelfX=narrow?-.78:-1.23;
    place(bowl.root,mixing?mx:narrow?-1.32:-1.65,.018,mixing?mz:-.19,dt);
    const br=s.bowl,ratio=br.zones.reduce((a,q)=>a+q.dry,0)/12;
    bowl.food.rotation.y=-br.angle*.24;bowl.food.position.y=.308+(br.milk-156)*.00068;
    bowl.heap.scale.set(.385*(.13+.87*ratio),.147*ratio+.003,.348*(.11+.89*ratio));
    bowl.heap.position.y=.012*ratio;
    if(mixing)C.mixSurface(bowl,br);
    bowl.clumps.forEach((o,i)=>{o.visible=br.zones[i%12].dry>.028;o.position.y=.005*br.zones[i%12].dry;});
    bowl.swirls.forEach(o=>{o.visible=br.work>.6;});
    const stirring=Math.min(1,Math.abs(br.swirl)/3);
    bowl.whisk.position.set(.10+stirring*.158*Math.cos(br.angle),.426+hint*.12,.012+stirring*.116*Math.sin(br.angle));
    bowl.whisk.rotation.set(.19+.16*stirring*Math.cos(br.angle),.07,-.72-hint*.67+.13*stirring*Math.sin(br.angle));
    const adding=mixing&&br.milkPending>.01;
    place(milk,mixing?mx-(adding?.49:narrow?.49:.86):-1.18,adding?.37:.019,mixing?mz-(adding?.20:.48):-.52,dt,9);
    milk.rotation.y=PI+.26;milk.rotation.z=P.relax(milk.rotation.z,adding?-.89:0,8,dt);
    milkStream.visible=adding&&milk.rotation.z<-.36;
    if(milkStream.visible){
      const lip=milk.localToWorld(new T.Vector3(-.22,.455,0));
      const bottom=bowl.root.position.y+bowl.food.position.y;
      milkStream.position.set(lip.x,(lip.y+bottom)/2,lip.z);milkStream.scale.set(.012,Math.max(.002,(lip.y-bottom)/2),.012);
    }
    const plateX=serving||washing?mx:shelfX,plateZ=serving||washing?mz:.06;
    place(plate,plateX,washing?.15:.022,plateZ,dt);
    const plateScale=serving||washing?1:narrow?.66:.78;
    plate.scale.setScalar(P.relax(plate.scale.x,plateScale,5,dt));plate.visible=!mixing;
    place(pan.root,cooking?mx:narrow?1.67:2.19,.016,cooking?mz:-.28,dt);
    pan.knob.rotation.z=s.power===1?0:s.power<1?-.7:.7;
    const panY=pan.root.position.y+.203, ladleOn=p==='pour';
    const lx=pan.root.position.x+(pointer!==null?mouse.x*.22:0);
    const lz=pan.root.position.z+(pointer!==null?mouse.z*.21:0);
    place(ladle,ladleOn?lx+.07:mixing?mx+(narrow?.46:.83):mx+.94,
      ladleOn?panY+.40+hint*.29:mixing?.097:.16,
      ladleOn?lz-.03:mixing?mz+.035:mz-.36,dt);
    ladle.rotation.z=P.relax(ladle.rotation.z,ladleOn?Math.min(.84,s.stream*.025)+hint:mixing?-1.22:-1.49,5,dt);
    ladleFood.visible=ladleOn&&s.ladle.left>1;
    batterStream.visible=ladleOn&&s.stream>.3;
    if(batterStream.visible){
      batterStream.position.set(ladle.position.x-.07,panY+.205,ladle.position.z);
      const w=.012+.00068*s.stream;batterStream.scale.set(w,.205,w*.89);
    }
    const ready=sim.readyToFlip();
    const showSpat=p==='cook'||p==='flip'||p==='second'||p==='stack';
    const lifting=p==='flip'?Math.sin(s.flight*PI):0;
    place(spatula,showSpat?mx+(ready?.35:.61):1.68,showSpat?panY+.056+hint*(ready?1.6:.1)+lifting*.35:.085,
      showSpat?mz+.226:.56,dt);
    spatula.rotation.y=showSpat?-2.03:-.4;spatula.rotation.z=-lifting*.43;
    // Model selection follows cake identity when a new layer is inserted underneath another one.
    const active=[...s.stack,...(s.cake?[s.cake]:[])];
    const used=new Set(active.map(c=>c.id));
    stackModels.forEach(m=>{if(!used.has(m.id)){m.id=null;m.root.visible=false;}});
    const refresh=(geomTime-=dt)<=0;
    if(refresh)geomTime=1/22;
    let stackH=.043*plate.scale.x,insertY=stackH;
    const gap=p==='stack'?C.surfaceHeight(s.cake,0,0)*.91*plate.scale.x*T.MathUtils.smoothstep(s.transfer,.1,.73):0;
    for(let i=0;i<active.length;i++){
      const c=active[i];let m=stackModels.find(m=>m.id===c.id),fresh=!m;
      if(fresh){m=stackModels.find(m=>m.id==null);m.id=c.id;}
      const isStack=i<s.stack.length;
      m.root.visible=!washing && c.volume>.15;
      if((refresh||fresh)&&m.root.visible)C.updateCake(m,c,p==='eat'?s.servings:0);
      if(isStack){
        const sc=plate.scale.x,dx=c.x*.019+(c.id%3-1)*.012,dz=c.z*.019;
        if(i===s.placeAt)insertY=stackH;
        const raised=p==='stack'&&i>=s.placeAt?gap:0;
        m.root.position.set(plate.position.x+dx*sc,plate.position.y+stackH+raised,plate.position.z+dz*sc);
        m.root.scale.setScalar(sc);m.root.rotation.set(0,0,0);stackH+=m.height*.91*sc;
      }else{
        m.root.scale.setScalar(1);const r=p==='stack'?s.transfer:0;
        const tx=pan.root.position.x+c.x*.115,tz=pan.root.position.z+c.z*.115;
        const f=p==='flip'?s.flight:0;
        // Face data swaps at the apex, so the geometry rotates the remaining half-turn from its new orientation.
        m.root.rotation.z=(f<(0.5)?f:f-1)*PI;
        const landing=s.placeAt<s.stack.length?insertY:stackH;
        m.root.position.set(tx+(plate.position.x-tx)*r,panY+(plate.position.y+landing-panY)*r+lifting*.52+Math.sin(r*PI)*.23,tz+(plate.position.z-tz)*r);
      }
    }
    const top=s.stack[s.stack.length-1],topY=plate.position.y+stackH,px=plate.position.x,pz=plate.position.z;
    const sx=narrow?.55:.89;
    dish.position.set(mx-sx,.025,mz-.165);dish.visible=p==='butter';
    patDish.rotation.z=hint*1.4;
    patDish.position.y=.16+hint*.9;
    berryDish.position.set(mx+sx,.028,mz-.15);berryDish.visible=serving&&!s.berry;
    berry.visible=serving;
    const berryPlaced=s.berry&&p==='eat';
    place(berry,berryPlaced?px+.16:mx+sx,berryPlaced?topY+.018:.081+(p==='berry'?hint*.64:0),berryPlaced?pz+.032:mz-.15,dt,5.8);
    berry.rotation.z=-.24;berry.visible=berry.visible&&s.servings===0;
    const pouringSyrup=p==='syrup'||(p==='berry'&&s.syrup.flow>.12);
    place(syrupJug,pouringSyrup?px-.162:mx-(narrow?.65:1.0),pouringSyrup?topY+.44:.031,pouringSyrup?pz-.057:mz-.32,dt);
    syrupJug.rotation.y=PI-.32;
    syrupJug.rotation.z=P.relax(syrupJug.rotation.z,pouringSyrup?-.12-s.syrup.flow*.165-hint*.7:0,4,dt);
    syrupJug.visible=serving;
    pat.visible=!!s.butter&&serving&&s.servings<2;
    films.forEach((o,i)=>{
      o.visible=pat.visible&&s.butter[i].film>.002;
      if(!o.visible)return;
      const q=s.butter[i],a=TAU*i/9,r=.065+q.film*.073;
      o.position.set(px-.082+Math.cos(a)*r*.61,topY+.006,pz+Math.sin(a)*r*.50);
      o.scale.set(.018+.084*q.film,.0022,.015+.064*q.film);o.rotation.y=-a;
    });
    if(pat.visible){
      const pa=pat.geometry.attributes.position;let max=0;
      for(let i=0;i<pa.count;i++){
        const x=butterVertices[i*3],y=butterVertices[i*3+1],z=butterVertices[i*3+2];
        const idx=P.clamp(Math.floor((x+.14)/.28*3),0,2)+3*P.clamp(Math.floor((z+.12)/.24*3),0,2);
        const solid=s.butter[idx].solid,sz=Math.sqrt(solid);
        max=Math.max(max,solid);
        pa.setXYZ(i,x*(.38+.62*sz),(.042+y)*solid,z*(.38+.62*sz));
      }
      pa.needsUpdate=true;pat.geometry.computeVertexNormals();
      const carry=p==='syrup'?T.MathUtils.smoothstep(s.stageTime,0,.48):1;
      pat.position.set((mx-sx)*(1-carry)+(px-.096)*carry,.074*(1-carry)+(topY+.008)*carry+.18*Math.sin(carry*PI),
        (mz-.165)*(1-carry)+(pz+.013)*carry);
      pat.visible=max>.012;
    }
    syrupG.visible=serving&&s.syrup.volume>.01&&s.servings<2;
    if(syrupG.visible&&top){
      syrupG.position.set(px,plate.position.y+stackH,pz);
      const radius=top.radius*.115,pa=slick.geometry.attributes.position,drawn=s.syrup;
      function poolR(a){
        const u=((a/TAU*8)%8+8)%8,i=Math.floor(u),v=u-i;
        const amount=drawn.pools[i]*(1-v)+drawn.pools[(i+1)%8]*v;
        return radius*Math.min(.99,.018+Math.sqrt(Math.max(0,amount))*.80);
      }
      pa.setXYZ(0,0,.004,0);
      for(let i=0;i<=80;i++){
        const a=TAU*i/80,r=poolR(a);pa.setXYZ(i+1,r*Math.cos(a),C.surfaceHeight(top,r/radius,a)-C.surfaceHeight(top,0,0)+.014,r*Math.sin(a));
      }
      pa.needsUpdate=true;slick.geometry.computeVertexNormals();slick.material.side=T.DoubleSide;
      rivulets.forEach((o,i)=>{
        const amt=drawn.rim[i];o.visible=amt>.025;
        const a=TAU*i/8,len=Math.min(stackH+.004,amt*.13);
        o.position.set(Math.cos(a)*radius*.982,-.021-len/2,Math.sin(a)*radius*.982);
        o.scale.set(.017+Math.min(.029,amt*.014),.015+len/2,.021);
      });
    }
    syrupStream.visible=pouringSyrup&&s.syrup.flow>.12;
    if(syrupStream.visible){
      const spout=syrupJug.localToWorld(new T.Vector3(-.22,.445,0)), end=new T.Vector3(px+.052,topY+.012,pz+.012);
      const delta=spout.clone().sub(end);syrupStream.position.copy(spout.add(end).multiplyScalar(.5));
      syrupStream.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize());syrupStream.scale.set(.005+s.syrup.flow*.0012,delta.length()*.51,.010);
    }
    wash.visible=sponge.visible=washing;
    if(washing){
      wash.position.set(mx,.01,mz);wash.scale.setScalar(1.22);
      place(sponge,px+(pointer!==null?mouse.x*.5:.24),.22+hint*.4,pz+(pointer!==null?mouse.z*.45:.22),dt,16);
      sponge.rotation.y=pointer!==null?mouse.x*.4:-.2;
      washWave+=s.splash*dt*1.6;ripple.visible=s.splash>.09;ripple.scale.setScalar(.51+(washWave%1));
    }
    crumbs.forEach((o,i)=>{o.visible=washing&&i/20<s.dirt;});
    actors.forEach(a=>{a.morsel.visible=s.biteTime<1.03;});
    extent.set(mx,mixing?.38:cooking?panY+.07:topY+.07,mz);
    if(mixing)bowl.whisk.localToWorld(extent.set(0,-.15,0));
    else if(p==='pour'&&s.stream>.5)extent.set(ladle.position.x,panY+.1,ladle.position.z);
    else if(p==='flip')extent.y+=lifting*.48;
    else if(p==='butter')dish.localToWorld(extent.set(0,.16,0));
    else if(p==='berry')extent.copy(berry.position);
    else if(washing)extent.copy(sponge.position);
    focus.lerp(extent,initial?1:1-Math.exp(-dt*6));
    const eyeSpace=focus.clone().applyMatrix4(camera.matrixWorldInverse);
    uniforms.focus.value=-eyeSpace.z;
    Family.act(actors,s,dt,focus);
    audioWait-=dt;
    if(audioWait<=0){
      if(mixing&&Math.abs(br.swirl)>1.1){note(1100+rand()*660,.1+rand()*.07,.019,true);audioWait=.21+rand()*.11;}
      else if(s.stream>1||s.syrup.flow>1){note(380+rand()*210,.115,.019,true);audioWait=.09+rand()*.09;}
      else if(p==='cook'||p==='second'){
        const pops=s.cake.cells.reduce((v,q)=>v+q.pops,0);
        if(pops>prevPops){note(1700+rand()*1700,.059,.012,true);audioWait=.12;}prevPops=pops;
      }else if(washing&&pointer!==null){note(1240+rand()*800,.14,.019,true);audioWait=.13;}
    }
    initial=false;
  }
  // Sample the whole composition at low resolution after depth blur and tone mapping.
  // An HSV curve keeps achromatic porcelain and silver neutral.
  const meterTarget=new T.WebGLRenderTarget(37,29,{depthBuffer:false});
  const sampleBytes=new Uint8Array(37*29*4),satSamples=new Uint8Array(37*29);
  let meterIn=0,grade=1,reading=false;
  function measureColour() {
    reading=true;uniforms.meter.value=1;
    renderer.setRenderTarget(meterTarget);renderer.render(post,screenCam);uniforms.meter.value=0;
    renderer.readRenderTargetPixelsAsync(meterTarget,0,0,37,29,sampleBytes).then(()=>{
      for(let i=0;i<satSamples.length;i++)satSamples[i]=sampleBytes[i*4];
      satSamples.sort();
      const median=satSamples[(satSamples.length-1)/2]/255;
      grade=P.clamp(Math.log(.75)/Math.log(1-P.clamp(median,.015,.95)),.48,4);
    }).catch(()=>{}).finally(()=>{reading=false;});
  }
  let previous=performance.now();
  function frame(now){
    const dt=Math.min(.09,Math.max(0,(now-previous)/1000));previous=now;
    if(!document.hidden){
      sim.step(dt);animate(dt);
      renderer.setRenderTarget(target);renderer.render(scene,camera);
      meterIn-=dt;
      if(meterIn<=0&&!reading){measureColour();meterIn=3.5;}
      uniforms.chroma.value=P.relax(uniforms.chroma.value,grade,2.5,dt);
      renderer.setRenderTarget(null);renderer.render(post,screenCam);
    }
    requestAnimationFrame(frame);
  }
  animate(0);requestAnimationFrame(frame);
})();
