'use strict';
(() => {
  const {T,group,mesh,mat,lathe,ball,rounded,ring,TAU}=Kitchen;
  const sim=createPourStudy(),canvas=document.querySelector('canvas');
  const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(32,1,0.19,48);
  scene.background=new T.Color(0xc5c6b9);
  Kitchen.environment(renderer,scene);
  const sun=new T.DirectionalLight(0xffefd8,3.1);
  sun.position.set(-4.2,7.7,-3.25);sun.target.position.set(0,0,0);
  sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-5.8,right:5.8,top:5.8,bottom:-5.8,near:1,far:21});
  sun.shadow.normalBias=0.009;sun.shadow.bias=-0.00023;sun.shadow.radius=3.1;
  scene.add(sun,sun.target);
  const wood=Kitchen.countertop(scene),pan=Kitchen.cookware(scene,wood);
  const saucer=group(scene);saucer.position.set(3.18,-0.915,1.75);saucer.rotation.y=-0.31;
  const dish=Kitchen.enamel(0xe2d5bb);
  lathe(saucer,[[0.001,0.013],[0.38,0.013],[0.42,0.052],[0.62,0.095],[0.81,0.178],[0.835,0.21],[0.817,0.227],[0.76,0.218],[0.58,0.145],[0.38,0.10],[0.001,0.10]],dish);
  ring(saucer,Kitchen.enamel(0xa89c7a),0,0.212,0,0.802,0.009);
  const butter=mat(0xefce7c,0.4);
  rounded(saucer,0.66,0.155,0.42,0.047,butter,0,0.187,0);
  const slice=rounded(saucer,0.40,0.072,0.37,0.032,butter,0.10,0.296,0);slice.rotation.y=0.23;

  const carry=group(scene),orientation=group(carry),ladle=group(orientation);
  orientation.rotation.y=sim.YAW;
  const steel=new T.MeshPhysicalMaterial({color:0xdce0de,metalness:0.98,roughness:0.15,clearcoat:0.12,clearcoatRoughness:0.16});
  const brushed=mat(0xcad0ce,0.247,0.94);
  const bowlProfile=[];
  for(let i=0;i<=36;i++){const a=Math.PI*0.5*i/36;bowlProfile.push([Math.max(0.0001,0.551*Math.sin(a)),-0.607*Math.cos(a)-0.004]);}
  bowlProfile.push([0.552,0.004],[0.545,0.01]);
  for(let i=36;i>=0;i--){const a=Math.PI*0.5*i/36;bowlProfile.push([Math.max(0.0001,0.54*Math.sin(a)),-0.59*Math.cos(a)]);}
  const bowl=lathe(ladle,bowlProfile,steel);bowl.scale.x=1.155;
  const lip=ring(ladle,steel,0,0.001,0,0.548,0.013);lip.scale.x=1.155;
  // Forged handle with a rounded, asymmetric flattened cross section.
  const path=[
    [0.48,-0.076,0.113,0.023],[0.605,-0.014,0.115,0.025],[0.73,0.065,0.094,0.026],
    [0.91,0.141,0.071,0.025],[1.18,0.212,0.064,0.024],[1.55,0.282,0.075,0.026],
    [1.95,0.349,0.090,0.026],[2.28,0.395,0.105,0.028],[2.54,0.421,0.116,0.032],
    [2.70,0.440,0.088,0.028],[2.752,0.446,0.002,0.004]];
  const hpos=[],hind=[];
  for(let i=0;i<path.length;i++)for(let j=0;j<20;j++){
    const a=TAU*j/20,[x,y,w,d]=path[i];hpos.push(x,y+d*Math.cos(a)+0.009*Math.cos(a*2),w*Math.sin(a));
    if(i){const n=(i-1)*20+j,m=(i-1)*20+(j+1)%20;hind.push(n,m,n+20,m,m+20,n+20);}
  }
  const handleGeometry=new T.BufferGeometry();
  handleGeometry.setAttribute('position',new T.Float32BufferAttribute(hpos,3));handleGeometry.setIndex(hind);
  handleGeometry.computeVertexNormals();mesh(ladle,handleGeometry,brushed);childGrip(ladle);

  function dynamicGeometry(capacity,indices) {
    const g=new T.BufferGeometry();
    g.setAttribute('position',new T.BufferAttribute(new Float32Array(capacity*3),3).setUsage(T.DynamicDrawUsage));
    if(indices)g.setIndex(indices);
    return g;
  }
  const wet=new T.MeshPhysicalMaterial({color:0xe5bd76,roughness:0.123,metalness:0,clearcoat:0.72,clearcoatRoughness:0.083,ior:1.42});
  const sides=72,rings=12,topIndex=[];
  for(let r=0;r<rings;r++)for(let i=0;i<sides;i++){const a=r*sides+i,b=r*sides+(i+1)%sides;topIndex.push(a,b,a+sides,b,b+sides,a+sides);}
  const poolGeometry=dynamicGeometry((rings+1)*sides,topIndex),pool=mesh(ladle,poolGeometry,wet);
  pool.frustumCulled=false;
  const volumeSamples=[];
  for(let z=-0.975;z<1;z+=0.05)for(let x=-0.975;x<1;x+=0.05){
    const shape=1-x*x-z*z;if(shape>0)volumeSamples.push([z*0.54,-0.59*Math.sqrt(shape)]);
  }
  const bowlVolume=volumeSamples.reduce((v,p)=>v-p[1],0);
  function fillBowl(amount,angle){
    pool.visible=amount>0.0003;if(!pool.visible)return;
    const rx=0.624,rz=0.54,depth=0.59,cs=Math.cos(angle),sn=Math.sin(angle);
    let low=-0.75,high=0.58;
    for(let it=0;it<13;it++){
      const level=(low+high)/2;let v=0;
      for(const p of volumeSamples)v+=Math.max(0,Math.min(-0.008,(level+p[0]*sn)/cs)-p[1]);
      if(v/bowlVolume<amount/sim.LOAD*0.948)low=level;else high=level;
    }
    const level=(low+high)/2,zc=rz*rz*sn/Math.hypot(depth*cs,rz*sn);
    const pos=poolGeometry.attributes.position;
    for(let j=0;j<sides;j++){
      const a=TAU*j/sides,vx=Math.cos(a),vz=Math.sin(a);
      let left=0,right=1.3;
      for(let n=0;n<13;n++){
        const r=(left+right)/2,x=vx*r,z=zc+vz*r,k=1-(x/rx)**2-(z/rz)**2;
        if(k>=0 && -depth*Math.sqrt(k)<Math.min(-0.006,(level+z*sn)/cs))left=r;else right=r;
      }
      for(let i=0;i<=rings;i++){
        const f=i/rings,r=left*f,x=vx*r,z=zc+vz*r;
        const y=Math.min(-0.005,(level+z*sn)/cs)+0.006*f**9;
        pos.setXYZ(i*sides+j,x,y,z);
      }
    }
    pos.needsUpdate=true;poolGeometry.computeVertexNormals();
  }

  const size=sim.N,count=size*size,gridIndices=[];
  for(let j=0;j<size-1;j++)for(let i=0;i<size-1;i++){
    const k=i+j*size;gridIndices.push(k,k+size,k+1,k+1,k+size,k+size+1);
  }
  const field=dynamicGeometry(count,gridIndices),fp=field.attributes.position;
  const normals=new T.BufferAttribute(new Float32Array(count*3),3),state=new T.BufferAttribute(new Float32Array(count*3),3);
  field.setAttribute('normal',normals);field.setAttribute('cell',state);
  for(let j=0;j<size;j++)for(let i=0;i<size;i++)fp.setXYZ(i+j*size,(i-sim.MID)*sim.DX,0,(j-sim.MID)*sim.DX);
  const cakeMaterial=new T.MeshPhysicalMaterial({color:0xffffff,roughness:0.1,clearcoat:0.45,clearcoatRoughness:0.1,ior:1.42});
  cakeMaterial.onBeforeCompile=sh=>{
    sh.vertexShader='attribute vec3 cell; varying vec3 pancake; varying vec2 panPoint;\n'+sh.vertexShader;
    sh.vertexShader=sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n pancake=cell;panPoint=position.xz;');
    sh.fragmentShader='varying vec3 pancake; varying vec2 panPoint;\n'+sh.fragmentShader;
    sh.fragmentShader=sh.fragmentShader.replace('#include <color_fragment>',`
      #include <color_fragment>
      if(pancake.x<0.003)discard;
      float dry=clamp(pancake.y,0.,1.);
      float edge=(1.-smoothstep(.012,.072,pancake.x))*dry;
      vec2 cellId=floor(panPoint*175.);
      float crumb=fract(sin(dot(cellId,vec2(19.43,47.21)))*1153.8);
      vec3 batter=mix(vec3(.802,.566,.271),vec3(.899,.731,.451),dry);
      batter=mix(batter,vec3(.60,.338,.133),edge*.50);
      diffuseColor.rgb=batter*(1.+(crumb-.5)*(.016+.052*dry))*(1.-.18*pancake.z);
    `).replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\n roughnessFactor=.08+.73*dry;')
      .replace('#include <lights_physical_fragment>','#include <lights_physical_fragment>\n material.clearcoat*=pow(1.-dry,2.);material.clearcoatRoughness=.085+.61*dry;');
  };
  const cake=mesh(pan,field,cakeMaterial);cake.castShadow=false;cake.frustumCulled=false;
  function surfaceY(v){return v+0.0032+0.012*(1-Math.exp(-v*95))*Math.exp(-v*18);}
  function updateCake(data){
    const {h,set,skin,bounds}=data;cake.visible=bounds.x1>=bounds.x0;
    if(!cake.visible)return;
    let lo=Math.max(1,bounds.z0-1),hi=Math.min(size-2,bounds.z1+1);
    // Rows beyond the wet region are omitted from the draw call.
    field.setDrawRange(lo*(size-1)*6,(hi-lo)*(size-1)*6);
    for(let j=lo;j<=hi;j++)for(let i=1;i<size-1;i++){
      const k=j*size+i,v=h[k],scar=skin[k]===2?1:0;
      fp.setY(k,data.floor[k]+surfaceY(v)-scar*Math.min(0.008,v*0.10));
      const ax=(surfaceY(h[k-1])-surfaceY(h[k+1]))/(2*sim.DX),az=(surfaceY(h[k-size])-surfaceY(h[k+size]))/(2*sim.DX),len=Math.hypot(ax,1,az);
      normals.setXYZ(k,ax/len,1/len,az/len);state.setXYZ(k,v,set[k],scar);
    }
    fp.needsUpdate=normals.needsUpdate=state.needsUpdate=true;
  }
  const dropGeometry=new T.SphereGeometry(1,14,12),drops=new T.InstancedMesh(dropGeometry,wet,150);
  drops.frustumCulled=false;drops.castShadow=true;scene.add(drops);
  const tubeSides=12,tubeIndices=[];
  for(let n=0;n<145;n++)for(let i=0;i<tubeSides;i++){
    const k=n*tubeSides+i,b=n*tubeSides+(i+1)%tubeSides;tubeIndices.push(k,k+tubeSides,b,b,k+tubeSides,b+tubeSides);
  }
  const threadGeo=dynamicGeometry(146*tubeSides,tubeIndices),thread=mesh(scene,threadGeo,wet);
  thread.frustumCulled=false;
  const scratch=new T.Object3D();
  function instance(obj,index,x,y,z,rx,ry,rz){
    scratch.position.set(x,y,z);scratch.scale.set(rx,ry,rz);scratch.updateMatrix();obj.setMatrixAt(index,scratch.matrix);
  }
  function stream(data){
    const {particles,pose,flow,lipStore}=data;let dropletCount=0,ringsUsed=0,indexCount=0;
    const pos=threadGeo.attributes.position,indices=threadGeo.index.array;
    function section(p) {
      const offset=ringsUsed++*tubeSides;
      for(let i=0;i<tubeSides;i++){
        const a=TAU*i/tubeSides;pos.setXYZ(offset+i,p.x+p.r*Math.cos(a),p.y,p.z+p.r*Math.sin(a));
      }
      return offset;
    }
    let previous=-1;
    for(let n=0;n<particles.length;n++){
      const p=particles[n],next=particles[n+1];
      if(!p.connected && !(next&&next.connected) && (n!==particles.length-1||flow<0.019)){
        const r=Math.cbrt(p.v*3/(4*Math.PI));instance(drops,dropletCount++,p.x,p.y,p.z,r*0.89,r*1.26,r*0.89);previous=-1;continue;
      }
      const offset=section(p);
      if(p.connected && previous>=0)join(previous,offset);
      else instance(drops,dropletCount++,p.x,p.y,p.z,p.r,p.r*0.94,p.r);
      previous=offset;
    }
    function join(a,b){
      for(let i=0;i<tubeSides;i++){
        const j=(i+1)%tubeSides;
        for(const v of [a+i,b+i,a+j,a+j,b+i,b+j])indices[indexCount++]=v;
      }
    }
    if(previous>=0 && flow>0.019)join(previous,section({...pose,r:Math.sqrt(flow/(Math.PI*(0.26+2.9*Math.sqrt(flow))))}));
    if(lipStore>0.000003){
      const r=Math.cbrt(lipStore*3/(4*Math.PI));instance(drops,dropletCount++,pose.x,pose.y-r*0.65,pose.z,r,r*1.18,r);
    }
    drops.count=dropletCount;drops.instanceMatrix.needsUpdate=true;
    // Normals on the live portion only. A radial normal avoids end-cap seams.
    let nrm=threadGeo.attributes.normal;
    if(!nrm){nrm=new T.BufferAttribute(new Float32Array(pos.array.length),3);threadGeo.setAttribute('normal',nrm);}
    for(let n=0;n<ringsUsed;n++)for(let j=0;j<tubeSides;j++){
      const a=TAU*j/tubeSides;nrm.setXYZ(n*tubeSides+j,Math.cos(a),0,Math.sin(a));
    }
    threadGeo.setDrawRange(0,indexCount);thread.visible=indexCount>0;
    nrm.needsUpdate=pos.needsUpdate=threadGeo.index.needsUpdate=true;
  }
  const blisterMat=new T.MeshPhysicalMaterial({color:0xebce91,roughness:0.37,clearcoat:0.25,clearcoatRoughness:0.28});
  const blisters=new T.InstancedMesh(new T.SphereGeometry(1,18,12),blisterMat,256);
  const craterMat=mat(0xb19361,0.77),craters=new T.InstancedMesh(new T.SphereGeometry(1,16,8),craterMat,256);
  pan.add(blisters,craters);blisters.frustumCulled=craters.frustumCulled=false;blisters.castShadow=true;
  function bubbleSurface(data){
    let n=0,m=0;
    for(const b of data.bubbles){
      const s=data.floor[b.k]+surfaceY(data.h[b.k]);
      if(!b.burst)instance(blisters,n++,b.x,s-0.001,b.z,b.r,b.r*(0.41+0.39*b.r/b.limit),b.r);
      else{
        const r=b.r*(0.70-0.48*b.opening);
        instance(craters,m++,b.x,s+0.001,b.z,r,0.0017,r*0.93);
      }
    }
    blisters.count=n;craters.count=m;blisters.instanceMatrix.needsUpdate=craters.instanceMatrix.needsUpdate=true;
  }

  const target=new T.WebGLRenderTarget(1,1,{
    type:renderer.extensions.has('EXT_color_buffer_float')?T.HalfFloatType:T.UnsignedByteType,
    depthBuffer:true,samples:0
  });
  target.depthTexture=new T.DepthTexture(1,1,T.UnsignedIntType);
  const postScene=new T.Scene(),postCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const optics=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{
    picture:{value:target.texture},depthMap:{value:target.depthTexture},pixel:{value:new T.Vector2()},
    focus:{value:9},near:{value:camera.near},far:{value:camera.far},blurPixels:{value:8}
  },vertexShader:'varying vec2 coord;void main(){coord=uv;gl_Position=vec4(position.xy,0.,1.);}',
  fragmentShader:`uniform sampler2D picture,depthMap;uniform vec2 pixel;
    uniform float focus,near,far,blurPixels;varying vec2 coord;
    float distanceAt(vec2 uv){return near*far/(far-texture2D(depthMap,uv).r*(far-near));}
    void main(){
      float d=distanceAt(coord);
      float blur=clamp((d-focus-.78)*.39,0.,1.)+clamp((focus-d-1.6)*.27,0.,.45);
      vec3 sum=texture2D(picture,coord).rgb;float weights=1.;
      if(blur>.018){
        for(int i=0;i<24;i++){
          float n=float(i)+.5,a=n*2.3999632;
          vec2 q=clamp(coord+vec2(cos(a),sin(a))*sqrt(n/24.)*pixel*blurPixels*blur,vec2(0.),vec2(1.));
          float w=smoothstep(-.47,.03,distanceAt(q)-d+.17);
          sum+=texture2D(picture,q).rgb*w;weights+=w;
        }
      }
      gl_FragColor=vec4(sum/weights,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`
  });
  postScene.add(new T.Mesh(new T.PlaneGeometry(2,2),optics));
  let travelWidth=8.5;
  function resize(){
    const width=canvas.clientWidth||innerWidth,height=canvas.clientHeight||innerHeight,aspect=width/height;
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.65,Math.sqrt(2400000/(width*height))));
    renderer.setSize(width,height,false);
    const screen=renderer.getDrawingBufferSize(new T.Vector2());target.setSize(screen.x,screen.y);
    optics.uniforms.pixel.value.set(1/screen.x,1/screen.y);optics.uniforms.blurPixels.value=Math.max(5,screen.y*0.009);
    camera.aspect=aspect;
    const portrait=aspect<0.84,aim=new T.Vector3(portrait?0.03:0.02,portrait?0.34:0.29,portrait?-0.28:-0.55);
    camera.position.copy(aim).add(new T.Vector3(portrait?0.48:0.62,portrait?6.45:6.05,7.45));
    const distance=camera.position.distanceTo(aim),visibleHeight=Math.max(4.85, (portrait?4.72:6.8)/aspect);
    travelWidth=Math.max(8.5,visibleHeight*aspect*0.66+2.7);
    camera.fov=T.MathUtils.radToDeg(2*Math.atan(visibleHeight/(2*distance)));camera.lookAt(aim);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
    optics.uniforms.focus.value=-new T.Vector3(0.50,0.89,-0.08).applyMatrix4(camera.matrixWorldInverse).z;
  }
  let pointer=null,originX=0,originY=0,startTilt=0;
  function control(input){sim.control(input);}
  canvas.addEventListener('pointerdown',event=>{
    if(pointer!==null)return;
    pointer=event.pointerId;originX=event.clientX;originY=event.clientY;
    startTilt=sim.view().goal.tilt;canvas.setPointerCapture(pointer);
  });
  canvas.addEventListener('pointermove',event=>{
    if(event.pointerId!==pointer)return;
    const w=canvas.clientWidth,h=canvas.clientHeight,span=Math.min(w,h),
      dx=(event.clientX-originX)/span,dz=(event.clientY-originY)/span;
    control({tilt:Math.min(1,startTilt+Math.hypot(dx,dz)*3.7),x:Math.max(-1,Math.min(1,(event.clientX/w-0.5)*2.4)),
      z:Math.max(-1,Math.min(1,dz*3)),height:Math.max(0,Math.min(1,1-event.clientY/h))});
  });
  function release(e){if(e.pointerId!==pointer)return;pointer=null;control({tilt:0});}
  for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,release);
  window.addEventListener('blur',()=>{pointer=null;control({tilt:0});});
  // A small wrist adjustment catches the window on the full bowl when it rests.
  // Each impulse settles under damping; touch takes over the same grip immediately.
  let rest=0.75,hint=0,hintV=0,lastAmount=-1,lastAngle=-1;
  function draw(dt){
    const data=sim.view(),p=data.pose;
    if(data.stage==='ready' && pointer===null){rest-=dt;if(rest<=0){hintV+=0.66;rest=3+Math.random()*3.2;}}
    hintV+=(-31*hint-7.8*hintV)*dt;hint+=hintV*dt;
    const angle=p.angle+hint;
    ladle.rotation.x=angle;carry.position.set(p.bx+travelWidth*data.ladleTravel,p.by+0.8*data.ladleTravel,p.bz-1.1*data.ladleTravel);
    pan.position.set(-travelWidth*data.panTravel,0.22*Math.sin(data.panTravel*Math.PI),1.8*data.panTravel);pan.rotation.z=-0.075*data.panTravel;
    if(Math.abs(data.remaining-lastAmount)>0.00004||Math.abs(angle-lastAngle)>0.00032){
      fillBowl(data.remaining,angle);lastAmount=data.remaining;lastAngle=angle;
    }
    updateCake(data);bubbleSurface(data);stream(data);
    renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(postScene,postCamera);
  }
  let last=null;
  function advance(dt){sim.step(dt);}
  function frame(now){const dt=last===null?0:Math.min(0.05,(now-last)/1000);last=now;advance(dt);draw(dt);requestAnimationFrame(frame);}
  window.addEventListener('resize',resize);
  document.addEventListener('visibilitychange',()=>{last=null;if(document.hidden){pointer=null;control({tilt:0});}});
  window.step=advance;window.getState=sim.getState;window.control=control;
  resize();requestAnimationFrame(frame);
})();
