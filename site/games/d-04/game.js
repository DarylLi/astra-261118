(() => {
  'use strict';
  const T=THREE, canvas=document.getElementById('harbor'), aspect=()=>canvas.clientWidth/canvas.clientHeight;
  const sim=Harbor.create(aspect()), audio=HarborAudio();
  window.__GAME__={step:sim.step,getState:sim.getState};
  const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',alpha:false});
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.98;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(35,aspect(),.12,370);
  scene.fog=new T.FogExp2(0xc7d3ce,.0058);
  const sky=new T.HemisphereLight(0xdceaf5,0xa39c7b,1.47);scene.add(sky);
  const sun=new T.DirectionalLight(0xffe6bc,2.29);
  sun.position.set(-23,29,-15);sun.target.position.set(-1,0,-6);scene.add(sun,sun.target);
  sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-19,right:19,top:21,bottom:-21,near:1,far:88});
  sun.shadow.normalBias=.014;sun.shadow.bias=-.00025;sun.shadow.radius=2;
  const models=HarborModels(T),sea=HarborWater(T,scene,renderer,camera,models);
  const pier=models.dock(),basket=models.basket(),trawler=models.fishingBoat(),hand=models.hand();
  scene.add(pier,basket,trawler,hand);
  const cargo=sim.live().floats.map(f=>{
    const o=f.kind==='boat'?models.dinghy(f.id):f.kind==='crate'?models.crate(f.id):models.fishingFloat(f.kind,f.id);
    scene.add(o);return o;
  });
  const hold=models.group(),aboard=cargo.map(model=>model.clone());
  aboard.forEach(o=>hold.add(o));trawler.add(hold);hold.visible=false;
  // The bell swings from its hanger, using the mooring spring struck on delivery.
  const fitting=models.group(),bell=models.group(),metal=models.M.brass;
  models.rod(fitting,[-.69,.77,-.47],[-.69,2.07,-.47],.047,0x8d8770,models.M.metal);
  models.cord(fitting,[[-.69,1.98,-.47],[-.68,2.10,-.47],[-.61,2.14,-.47],[-.40,2.14,-.47],[-.38,2.09,-.47]],.025,0xa89570,metal,7);
  models.cyl(bell,.041,.083,.097,20,0,-.062,0,0xd6b481,metal);
  models.cyl(bell,.079,.105,.097,20,0,-.143,0,0xc9a56a,metal);
  models.cyl(bell,.10,.143,.062,24,0,-.210,0,0xd5b078,metal);
  models.cyl(bell,.147,.146,.022,24,0,-.244,0,0xdcb77d,metal);
  models.ball(bell,.033,.052,.033,0,-.244,0,0x92764f,metal);
  models.cord(bell,[[0,-.25,0],[0,-.32,.006],[.011,-.40,.020]],.010,0xc4ad85);
  models.pack(fitting);models.pack(bell);fitting.add(bell);bell.position.set(-.38,2.086,-.47);scene.add(fitting);
  // A suspended fender at the edge of the foreground pier.
  const fender=models.group();
  models.ball(fender,.124,.38,.124,0,-.25,0,0xe7e1c8,models.M.paint);
  models.cyl(fender,.113,.115,.123,20,0,-.37,0,0x528180,models.M.paint);
  models.cord(fender,[[0,.58,-.04],[-.06,.45,0],[-.04,.30,.015],[0,.09,0]],.020,0x99876a);
  models.pack(fender);scene.add(fender);
  let scenery;
  function disposeGroup(root){
    root.traverse(o=>{if(o.isMesh)o.geometry.dispose();});root.removeFromParent();
  }
  const v=new T.Vector3();
  function stage(){
    const f=sim.live().frame,goal=f.goal;
    camera.position.set(0,f.height,f.eyeZ);camera.rotation.set(-f.pitch,0,0);camera.aspect=f.aspect;
    camera.updateProjectionMatrix();camera.updateMatrixWorld();
    pier.position.set(goal.x,0,goal.z+.09*f.scale);pier.rotation.y=-.42+.24*f.narrow;pier.scale.setScalar(f.scale);
    basket.position.set(goal.x,.722*f.scale,goal.z);basket.rotation.y=-.04;basket.scale.setScalar(f.scale);
    fitting.position.copy(pier.position);fitting.rotation.copy(pier.rotation);fitting.scale.copy(pier.scale);
    pier.updateMatrixWorld();fender.position.copy(pier.localToWorld(v.set(1.46,.565,2.44)));fender.scale.setScalar(f.scale);
    if(scenery)disposeGroup(scenery);scenery=models.world(f);scene.add(scenery);
  }
  // One transparent PBR mesh carries the thin glancing crests and the dispersing foam.
  const maxVertices=57000,foamG=new T.BufferGeometry(),foamP=new T.Float32BufferAttribute(new Float32Array(maxVertices*3),3);
  const foamC=new T.Float32BufferAttribute(new Float32Array(maxVertices*4),4),foamN=new Float32Array(maxVertices*3);
  for(let i=1;i<foamN.length;i+=3)foamN[i]=1;
  foamP.setUsage(T.DynamicDrawUsage);foamC.setUsage(T.DynamicDrawUsage);
  foamG.setAttribute('position',foamP);foamG.setAttribute('normal',new T.BufferAttribute(foamN,3));foamG.setAttribute('color',foamC);
  const foamMat=new T.MeshStandardMaterial({vertexColors:true,transparent:true,opacity:.87,depthWrite:false,side:T.DoubleSide,roughness:.32,roughnessMap:models.M.rope.roughnessMap,metalness:.08});
  const foam=new T.Mesh(foamG,foamMat);foam.frustumCulled=false;foam.renderOrder=3;scene.add(foam);
  const silver=new T.Color(0xb8d5ca),cream=new T.Color(0xe8e2bb),white=new T.Color(0xe0efe5);
  let cursor=0;
  function arc(x,y,z,rx,rz,rot,start,length,width,alpha,color,seed,segments){
    if(cursor+segments*6>=maxVertices)return;
    const sn=Math.sin(rot),cs=Math.cos(rot);
    function edge(i,outer){
      const u=i/segments,a=start+length*u,rough=1+.018*Math.sin(5*a+seed)+.010*Math.sin(9*a-seed*.6);
      const fade=Math.max(0,Math.sin(u*Math.PI)),thick=outer*width*(.3+.7*fade);
      const xx=(rx*rough+thick)*Math.cos(a),zz=(rz*rough+thick)*Math.sin(a);
      foamP.setXYZ(cursor,x+xx*cs+zz*sn,y+.009*Math.sin(a*4+seed),z-xx*sn+zz*cs);
      foamC.setXYZW(cursor,color.r,color.g,color.b,alpha*fade*(.77+.23*Math.cos(6*a+seed)));cursor++;
    }
    for(let i=0;i<segments;i++){edge(i,0);edge(i,1);edge(i+1,0);edge(i+1,0);edge(i,1);edge(i+1,1);}
  }
  function drawFoam(s){
    cursor=0;
    for(const f of s.floats){
      if(f.status!=='drift'&&f.status!=='riding')continue;
      const level=sim.surface(f.x,f.z)+.025,local=f.salt+f.roll*4+f.y*2;
      const rx=(f.kind==='boat'?.58:f.kind==='crate'?.55:.375)*f.s,rz=(f.kind==='boat'?1.34:f.kind==='crate'?.52:.38)*f.s;
      arc(f.x,level,f.z,rx,rz,f.yaw,.21+local,3.7,.023,.47,silver,local,25);
      arc(f.x,level+.004,f.z,rx+.11,rz+.08,f.yaw,3.02+local,2.70,.010,.31,white,local+.8,18);
      if(f.id===s.active && f.status==='drift'){
        const size=.28+.09*Math.sin(s.field.flow[(f.id*21+2)%s.field.h.length]);
        arc(f.x,level+.014,f.z,rx+size,rz+size,f.yaw,local-.9,3.65,.033,.64,cream,local,38);
      }
    }
    for(const w of s.waves){
      if(w.age>.01&&w.age<3.8 && w.source!=='ship'){
        const y=sim.surface(w.x,w.z)+.033+w.amp*.38;
        arc(w.x,y,w.z,w.radius+.04,w.radius+.04,0,w.id*.89,5.59,.021+w.amp*.26,Math.min(.89,w.amp*8),white,w.id,50);
      }
    }
    const hint=s.guide;
    if(hint){
      const r=.13+.32*hint.t;
      arc(hint.x,sim.surface(hint.x,hint.z)+.04,hint.z,r,r,0,.3,5.70,.028,hint.alpha*.8,cream,1.1,32);
    }
    for(const w of s.wakes){
      const fade=Math.pow(Math.max(0,1-w.age/w.life),1.5)*w.strength;
      const a=Math.atan2(w.vx,w.vz),r=w.width;
      arc(w.x,.045,w.z,r*1.42,r*.76,a,.06,3.29,.029+r*.07,fade*.85,white,w.z*.17+w.age*.12,12);
    }
    foamG.setDrawRange(0,cursor);foamP.clearUpdateRanges();foamC.clearUpdateRanges();
    foamP.addUpdateRange(0,cursor*3);foamC.addUpdateRange(0,cursor*4);foamP.needsUpdate=foamC.needsUpdate=true;
  }
  const beads=new T.InstancedMesh(new T.SphereGeometry(1,7,5),new T.MeshPhysicalMaterial({color:0xc8ece8,roughness:.15,roughnessMap:models.M.glass.roughnessMap,metalness:.31}),512);
  beads.frustumCulled=false;scene.add(beads);
  const motes=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),new T.MeshStandardMaterial({color:0xe6dfb9,emissive:0xb1a67c,emissiveIntensity:.2,roughness:.82,roughnessMap:models.M.rope.roughnessMap,transparent:true,opacity:.44}),30);
  motes.frustumCulled=false;scene.add(motes);
  const dummy=new T.Object3D(),cargoPos=new T.Vector3(),shipPos=new T.Vector3();
  function sceneState(s){
    const scale=s.frame.scale;
    trawler.position.set(s.boat.x,s.boat.y+.008,s.boat.z);trawler.rotation.set(0,s.boat.yaw,s.boat.roll,'YXZ');
    trawler.scale.setScalar(scale);trawler.updateMatrixWorld();
    hold.visible=s.boat.fresh;
    if(hold.visible)for(const item of s.boat.manifest){
      const j=item.slot,o=aboard[item.id];
      o.position.set((j%3-1)*.34,.52+Math.floor(j/9)*.15,-1.72+Math.floor(j/3)%3*.4);
      o.rotation.set(.03*Math.sin(j*2.39996),j*2.39996,.12*Math.cos(j*2.39996));
      o.scale.setScalar(item.s*.39/scale);
    }
    for(const f of s.floats){
      const o=cargo[f.id];let size=f.s;
      if(f.status==='stowed'||f.status==='aboard'){
        const j=f.packed,a=j*2.39996,r=(.21+.36*Math.sqrt((j%7)/7))*scale;
        cargoPos.set(s.frame.goal.x+r*Math.cos(a),(.92+.21*Math.floor(j/6))*scale,s.frame.goal.z+r*Math.sin(a));
        const col=j%3,row=Math.floor(j/3)%3,layer=Math.floor(j/9);
        shipPos.set((col-1)*.34,.52+layer*.15,-1.72+row*.4);trawler.localToWorld(shipPos);
        const t=Math.max(0,Math.min(1,s.boat.transfer-j));o.position.lerpVectors(cargoPos,shipPos,t);
        o.position.y+=Math.sin(t*Math.PI)*1.45*scale;o.rotation.set(.03*Math.sin(a),a+s.boat.yaw*t,.12*Math.cos(a));
        size*=.39;
      }else{
        o.position.set(f.x,f.y,f.z);o.rotation.set(f.pitch,f.yaw,f.roll,'YXZ');
        if(f.status==='lifting')size*=1-.61*f.travel;
      }
      o.scale.setScalar(size);
    }
    bell.rotation.z=s.mooring.angle;fender.rotation.z=-.06+s.mooring.angle*.74;
    hand.visible=!!s.guide;
    if(s.guide){
      const h=s.guide;hand.position.set(h.x,sim.surface(h.x,h.z)+h.y,h.z);
      hand.quaternion.copy(camera.quaternion);hand.scale.setScalar((.65+.54*s.frame.narrow)*scale);
      hand.children[0].material.opacity=h.alpha;
    }
    beads.count=Math.min(beads.instanceMatrix.count,s.drops.length);
    for(let i=0;i<beads.count;i++){
      const p=s.drops[i];dummy.position.set(p.x,p.y,p.z);dummy.scale.set(p.r,p.r*(1+.17*Math.abs(p.vy)),p.r);
      dummy.updateMatrix();beads.setMatrixAt(i,dummy.matrix);
    }
    beads.instanceMatrix.needsUpdate=true;
    s.dust.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.scale.setScalar(.0037+(i%4)*.0008);dummy.updateMatrix();motes.setMatrixAt(i,dummy.matrix);});
    motes.instanceMatrix.needsUpdate=true;
    drawFoam(s);sea.update(s);
  }
  // Isolate the hint's fade from the opaque painted boats and buildings.
  for(const child of hand.children){child.material=child.material.clone();child.material.transparent=true;child.material.depthWrite=false;child.material.emissive.set(0xd3bd84);child.material.emissiveIntensity=.29;}
  const sceneRT=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:true,samples:2});
  const postScene=new T.Scene(),postCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const post=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{frame:{value:sceneRT.texture},pixel:{value:new T.Vector2()}},
    vertexShader:'varying vec2 pos;void main(){pos=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`uniform sampler2D frame;uniform vec2 pixel;varying vec2 pos;
      float hash(vec2 p){return fract(52.9829189*fract(dot(p,vec2(.06711056,.00583715))));}
      vec3 glow(vec2 offset){vec3 c=texture2D(frame,pos+offset*pixel).rgb;return c*smoothstep(.9,2.,max(c.r,max(c.g,c.b)));}
      void main(){
        vec3 c=texture2D(frame,pos).rgb;
        vec3 bloom=glow(vec2(3,2))+glow(vec2(-2,3))+glow(vec2(-3,-2))+glow(vec2(2,-3));
        c+=.014*bloom;
        vec2 q=(pos-.5)*2.;c*=1.-.056*dot(q*q,q*q);
        gl_FragColor=vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        gl_FragColor.rgb+=(hash(gl_FragCoord.xy)-.5)*.006;
      }`});
  postScene.add(new T.Mesh(new T.PlaneGeometry(2,2),post));
  let needsMirror=true;
  function resize(){
    const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;
    sim.resize(w/h);stage();
    const ratio=Math.min(devicePixelRatio||1,1.65,Math.sqrt(2160000/(w*h)));
    renderer.setPixelRatio(ratio);renderer.setSize(w,h,false);
    const W=Math.max(1,Math.round(w*ratio)),H=Math.max(1,Math.round(h*ratio));
    sceneRT.setSize(W,H);post.uniforms.pixel.value.set(1/W,1/H);sea.resize(W,H);needsMirror=true;
  }
  window.addEventListener('resize',resize);resize();
  const ray=new T.Raycaster(),plane=new T.Plane(new T.Vector3(0,1,0),0),deckPlane=plane.clone();
  const pointer=new T.Vector2(),hit=new T.Vector3(),deckHit=new T.Vector3();
  let contact=null;
  function point(e){
    const rect=canvas.getBoundingClientRect();
    pointer.set((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2);
    ray.setFromCamera(pointer,camera);
    if(!ray.ray.intersectPlane(plane,hit))return null;
    const f=sim.live().frame;deckPlane.constant=-.726*f.scale;
    if(ray.ray.intersectPlane(deckPlane,deckHit)){
      pier.worldToLocal(deckHit);
      if(Math.abs(deckHit.x)<1.44 && deckHit.z>-.83&&deckHit.z<8.8)return null;
    }
    // Sky, land, the basket, and the pier never generate touch waves.
    if(hit.z<f.waterAt(.5,.347).z ||ray.ray.intersectsSphere(new T.Sphere(v.copy(basket.position).addScaledVector(plane.normal,.56*f.scale),.87*f.scale)))return null;
    return {x:hit.x,z:hit.z};
  }
  function begin(e){
    if(contact || (e.pointerType==='mouse'&&e.button!==0))return;
    audio.unlock();const p=point(e);
    contact={id:e.pointerId,p,at:e.timeStamp,sent:e.timeStamp};
    canvas.setPointerCapture(e.pointerId);
    if(p&&sim.stroke(p.x,p.z,0))audio.play({type:'water'});
  }
  function move(e){
    if(!contact){if(e.pointerType==='mouse'){const p=point(e);canvas.style.cursor=p&&sim.candidate(p.x,p.z)?'grab':'default';}return;}
    if(e.pointerId!==contact.id)return;
    const p=point(e);if(!p){contact.p=null;return;}
    if(!contact.p){contact.p=p;contact.at=e.timeStamp;return;}
    const dt=Math.max(.008,(e.timeStamp-contact.at)*.001),dx=p.x-contact.p.x,dz=p.z-contact.p.z;
    if(Math.hypot(dx,dz)<.029||e.timeStamp-contact.sent<55)return;
    if(sim.stroke(p.x,p.z,Math.hypot(dx,dz)/dt,dx,dz))audio.play({type:'water'});
    contact.p=p;contact.at=contact.sent=e.timeStamp;
  }
  function end(e){if(contact&&contact.id===e.pointerId)contact=null;}
  canvas.addEventListener('pointerdown',begin);canvas.addEventListener('pointermove',move);
  for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,end);
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  const sound=document.getElementById('sound');sound.addEventListener('click',()=>sound.setAttribute('aria-pressed',String(audio.toggle())));
  let last=0,frames=0;
  function draw(now){
    const dt=last?Math.min(.12,(now-last)/1000):0;last=now;
    sim.step(dt);const s=sim.live();sceneState(s);for(const event of sim.drain())audio.play(event);
    if(frames%16===0)audio.breeze(s.wind);
    if(needsMirror||frames%3===0){sea.reflect([foam,hand,motes,beads]);needsMirror=false;}
    renderer.setRenderTarget(sceneRT);renderer.render(scene,camera);
    renderer.setRenderTarget(null);renderer.render(postScene,postCamera);frames++;
    requestAnimationFrame(draw);
  }
  document.addEventListener('visibilitychange',()=>{last=0;contact=null;});
  requestAnimationFrame(draw);
})();
