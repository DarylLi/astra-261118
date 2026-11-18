'use strict';
(() => {
  const T=THREE,P=DigPhysics,game=P.create(),s=game.state;
  window.__GAME__={step:game.step,getState:game.getState};
  const view=document.getElementById('view'),renderer=new T.WebGLRenderer({canvas:view,antialias:false,
    alpha:false,powerPreference:'high-performance'});
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.08;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(25,1,.24,165);
  const env=Art.env();scene.environment=env;scene.background=env;scene.environmentIntensity=.63;
  scene.backgroundIntensity=1.06;scene.fog=new T.Fog(0xd6dbcc,20,64);
  scene.add(new T.HemisphereLight(0xd8eaf1,0xb7a280,1.24));
  const key=new T.DirectionalLight(0xffebc6,2.24);key.position.set(-6.8,10.5,5.7);
  key.target.position.set(-.3,.4,.25);scene.add(key,key.target);
  key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.bias=-.00036;key.shadow.normalBias=.019;
  Object.assign(key.shadow.camera,{left:-10.5,right:10.5,top:9,bottom:-9,near:.6,far:34});key.shadow.camera.updateProjectionMatrix();
  key.shadow.radius=3;
  const land=Landscape.create(scene,game),digger=Machines.excavator(scene),truck=Machines.truck(scene),prize=Machines.treasure(scene);
  // Soft contact occlusion is anchored to the tyres and tracks.
  const occlusionTex=Art.texture(64,(x,y)=>{const r=((x-32)/32)**2+((y-32)/32)**2;
    const v=Math.round(255*(Math.max(0,1-r))**2);return [v,v,v];});
  function contact(parent,x,z,rx,rz,strength){
    const m=Art.mat(0x3c3728,1,0,{transparent:true,opacity:strength,alphaMap:occlusionTex,depthWrite:false});
    const o=Art.mesh(parent,new T.PlaneGeometry(2*rx,2*rz),m,x,.008,z);
    o.rotation.x=-Math.PI/2;o.castShadow=false;o.renderOrder=1;return o;
  }
  contact(digger.base,0,0,2.02,1.36,.37);contact(truck.base,0,0,2.30,1.13,.38);
  const rng=Art.rand,grainMat=Art.mat(0xffffff,.9,.04);
  const grains=Landscape.instances(scene,new T.DodecahedronGeometry(1,0),grainMat,260);
  const motes=Landscape.instances(scene,new T.IcosahedronGeometry(1,0),
    Art.mat(0xf5e3ae,.8,0,{transparent:true,opacity:.47,depthWrite:false}),s.motes.length);
  motes.castShadow=motes.receiveShadow=false;
  const guide=Art.group(scene),ringMaterial=Art.mat(0xffdd81,.48,.16,{emissive:0xffc861,emissiveIntensity:.29,
    transparent:true,opacity:.95,depthWrite:false}),marker=Art.group(guide);
  // Each dash follows its own patch of ground around the touch point.
  const dashes=[];
  for(let i=0;i<16;i++){
    const a=i*Math.PI*2/16;
    const dash=Art.mesh(guide,new T.TorusGeometry(.43,.016,8,8,.197),ringMaterial);
    dash.rotation.set(-Math.PI/2,0,a);dash.castShadow=false;dashes.push(dash);
  }
  const diamond=Art.poly(marker,[[-.133,.068],[0,-.056],[.133,.068],[.133,.133],[0,.023],[-.133,.133]],.05,0,0,0,ringMaterial,.008);
  diamond.castShadow=false;
  const dropParticles=[];
  const waterRing=Art.mat(0xc3dfcf,.20,.26,{transparent:true,opacity:.68,depthWrite:false});
  for(let i=0;i<3;i++){const r=Art.mesh(scene,new T.TorusGeometry(1,.022,6,45),waterRing.clone());r.rotation.x=-Math.PI/2;r.castShadow=false;dropParticles.push(r);}
  const pose={x:0,y:1.45,z:.15,d:18,angle:.16,pitch:.135};
  let width=1,height=1;
  const rt=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:true,stencilBuffer:false});
  rt.depthTexture=new T.DepthTexture(1,1,T.UnsignedIntType);
  const post=new T.Scene(),postCam=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const finish=new T.ShaderMaterial({uniforms:{src:{value:rt.texture},depthMap:{value:rt.depthTexture},
    px:{value:new T.Vector2(1,1)},focus:{value:18},clip:{value:new T.Vector2(camera.near,camera.far)}},
    depthTest:false,depthWrite:false,vertexShader:'varying vec2 st; void main(){st=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`
      varying vec2 st; uniform sampler2D src,depthMap; uniform vec2 px,clip; uniform float focus;
      void main(){
        float d=texture2D(depthMap,st).r;
        float z=clip.x*clip.y/(clip.y-d*(clip.y-clip.x));
        float coc=2.9*smoothstep(2.5,6.4,focus-z)+1.0*smoothstep(8.,29.,z-focus);
        vec3 center=texture2D(src,st).rgb,blur=vec3(0.),glow=vec3(0.);
        for(int i=0;i<8;i++){
          float a=float(i)*.78539816;
          vec2 off=vec2(cos(a),sin(a))*px;
          vec3 c=texture2D(src,st+off*(.42+coc)).rgb;
          blur+=c;
          vec3 bloom=texture2D(src,st+off*3.25).rgb;
          glow+=max(vec3(0.),bloom-1.27);
        }
        vec3 c=mix(center,blur*.125,clamp(coc*.86+.15,0.,.94))+glow*.0041;
        float vig=1.-.12*pow(clamp(length((st-.5)*1.44),0.,1.),2.);
        gl_FragColor=vec4(c*vig,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        float grain=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))))-.5;
        gl_FragColor.rgb+=grain*.008;
      }`});
  post.add(new T.Mesh(new T.PlaneGeometry(2,2),finish));
  function resize(){
    width=view.clientWidth;height=view.clientHeight;
    const a=width/height,portrait=Math.max(0,Math.min(1,(1.02-a)/.51));
    camera.aspect=a;camera.updateProjectionMatrix();
    pose.angle=.15-.98*portrait;pose.pitch=.127+.102*portrait;
    const frame=11.77-3.16*portrait;
    pose.d=Math.max(12.4,frame/(2*Math.tan(12.5*Math.PI/180)*a));
    pose.x=.05-.19*portrait;pose.y=1.48-.20*portrait;pose.z=.13+.02*portrait;
    positionCamera();
    const scale=Math.min(window.devicePixelRatio||1,1.65,Math.sqrt(2400000/(width*height)));
    renderer.setPixelRatio(scale);renderer.setSize(width,height,false);
    rt.setSize(Math.round(width*scale),Math.round(height*scale));
    finish.uniforms.px.value.set(1/(width*scale),1/(height*scale));
  }
  function positionCamera(){
    const f=s.focus,k=f.amount,closeDistance=Math.max(5.9,3.35/camera.aspect);
    const d=pose.d+(closeDistance-pose.d)*k;
    const x=pose.x+(f.x-pose.x)*k, y=pose.y+(f.y-pose.y)*k, z=pose.z+(f.z-pose.z)*k;
    const angle=pose.angle+(.20-pose.angle)*k,pitch=pose.pitch+(.36-pose.pitch)*k,h=d*Math.cos(pitch);
    scene.fog.near=d+1.6;scene.fog.far=d+45;
    camera.position.set(x+Math.sin(angle)*h,y+Math.sin(pitch)*d,z+Math.cos(angle)*h);
    camera.lookAt(x,y,z);camera.updateMatrixWorld(true);finish.uniforms.focus.value=d;
  }
  const ray=new T.Raycaster(),ndc=new T.Vector2(),projected=new T.Vector3(),plane=new T.Plane(new T.Vector3(0,1,0),0);
  let finger=null;
  function cast(e){
    const r=view.getBoundingClientRect();ndc.set(2*(e.clientX-r.left)/r.width-1,1-2*(e.clientY-r.top)/r.height);
    ray.setFromCamera(ndc,camera);
    if(s.phase==='horn'||s.phase==='chest'){
      const obj=s.phase==='horn'?prize.horn:prize.base;
      const p=obj.getWorldPosition(new T.Vector3());if(s.phase==='chest')p.y+=.12;
      const hits=ray.intersectObject(obj,true);
      // A small three-dimensional pick halo keeps a fingertip from hiding a tiny object.
      if(hits.length||ray.ray.distanceToPoint(p)<(s.phase==='horn'?.72:.77))return {x:s.chest.x,z:s.chest.z,thing:s.phase};
    }
    const hits=ray.intersectObject(land.pit,false);
    if(hits.length)return {x:hits[0].point.x,z:hits[0].point.z,thing:'soil'};
    return null;
  }
  view.addEventListener('pointerdown',e=>{
    if(finger!==null)return;e.preventDefault();Interface.unlock();const hit=cast(e);
    if(hit && game.down(hit.x,hit.z,hit.thing)){finger=e.pointerId;view.setPointerCapture(finger);}
    else if(!hit){game.down(0,0,'other');}
  });
  view.addEventListener('pointermove',e=>{if(finger!==e.pointerId)return;const h=cast(e);if(h&&h.thing==='soil')game.move(h.x,h.z);});
  function release(e){if(e.pointerId!==finger)return;game.up();finger=null;}
  ['pointerup','pointercancel','lostpointercapture'].forEach(name=>view.addEventListener(name,release));
  window.addEventListener('blur',()=>{game.up();finger=null;});
  function effects(){
    const col=new T.Color();
    grains.count=Math.min(s.grains.length,260);for(let i=0;i<grains.count;i++){
      const p=s.grains[i];col.setHex(p.kind==='load'?0x866446:0xa18260).multiplyScalar(.76+((p.id*17)%37)*.012);
      const r=p.kind==='load'?p.r*1.36:p.r;
      Landscape.put(grains,i,p.x,p.y,p.z,r,r*.71,r*.88,p.spin,col,p.spin*.6);
    }grains.instanceMatrix.needsUpdate=true;if(grains.instanceColor)grains.instanceColor.needsUpdate=true;
    s.motes.forEach((p,i)=>{const r=.007+(i%7)*.0018;Landscape.put(motes,i,p.x,p.y,p.z,r,r*.69,r,0);});motes.instanceMatrix.needsUpdate=true;
    const target=s.phase==='soil'?{x:s.hint.x,z:s.hint.z}:s.chest;
    let y=game.ground(target.x,target.z);
    if(s.phase==='horn')y=s.chest.y+s.horn.height+.19;
    if(s.phase==='chest')y=s.chest.y+.40;
    guide.visible=s.action==='rest' && ['soil','chest','horn'].includes(s.phase)&&!s.chest.pull;
    guide.position.set(target.x,y+.025,target.z);
    dashes.forEach((d,i)=>{const a=i*2*Math.PI/16+.1;
      d.position.y=s.phase==='soil'?game.ground(target.x+.43*Math.cos(a),target.z-.43*Math.sin(a))-y+.018:0;});
    marker.position.y=.26+s.winds[2].bend*.7+s.hint.pressure*.06;marker.rotation.y=pose.angle;
    if(s.phase==='horn')guide.visible=false;
    dropParticles.forEach((r,i)=>{
      const wave=s.ripples[i];r.visible=!!wave && s.phase!=='reset';
      if(!r.visible)return;
      const src=s.cells[wave.i];r.position.set(src.x,src.rest-src.depth+src.water+.014,src.z);
      r.scale.setScalar(wave.r);r.material.opacity=.52*wave.energy;
    });
    projected.set(target.x,y+.09,target.z).project(camera);
    Interface.update(s,{x:(projected.x+1)*width/2,y:(1-projected.y)*height/2});
  }
  const probeTarget=new T.WebGLCubeRenderTarget(128,{type:T.HalfFloatType,generateMipmaps:true,minFilter:T.LinearMipmapLinearFilter});
  const probe=new T.CubeCamera(.15,85,probeTarget);probe.position.set(-.28,1.55,.75);
  let reflectionSite=null;
  function reflect(){
    const site=s.truck.x>8?'away':'parked';
    if(reflectionSite===site)return;
    reflectionSite=site;scene.environment=env;
    const shadows=renderer.shadowMap.autoUpdate;renderer.shadowMap.autoUpdate=false;
    probe.update(renderer,scene);renderer.shadowMap.autoUpdate=shadows;
    scene.environment=probeTarget.texture;
  }
  function draw(){
    key.intensity=2.63-.37*s.clouds[0].cover-.22*s.clouds[1].cover-.13*s.clouds[2].cover;
    positionCamera();land.update(s);digger.update(s);truck.update(s);prize.update(s);effects();reflect();
    renderer.setRenderTarget(rt);renderer.render(scene,camera);
    renderer.setRenderTarget(null);renderer.render(post,postCam);
  }
  resize();window.addEventListener('resize',resize);
  let last=performance.now();
  document.addEventListener('visibilitychange',()=>{last=performance.now();if(document.hidden){game.up();finger=null;}});
  renderer.setAnimationLoop(()=>{const now=performance.now();const dt=Math.min(.08,(now-last)/1000);
    last=now;if(!document.hidden){game.step(dt);draw();}});
})();
