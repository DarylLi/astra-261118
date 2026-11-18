(() => {
  'use strict';
  const T=THREE,M=PortModels,P=PortPhysics,sim=P.create();
  window.__GAME__={step:sim.step,getState:sim.getState};
  const canvas=document.querySelector('#port'), hand=document.querySelector('#hand'), soundButton=document.querySelector('#sound');
  const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',alpha:false});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(26,1,.25,420);
  scene.fog=new T.FogExp2(0xb6c2c1,.0123);
  function hash(x,y,z){let n=Math.imul(x,374761393)+Math.imul(y,668265263)+Math.imul(z,69069)|0;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;}
  function noise(x,y,z){
    const a=Math.floor(x),b=Math.floor(y),c=Math.floor(z);
    const q=t=>t*t*(3-2*t),u=q(x-a),v=q(y-b),w=q(z-c),mix=(a,b,t)=>a+(b-a)*t;
    const layer=k=>mix(mix(hash(a,b,k),hash(a+1,b,k),u),mix(hash(a,b+1,k),hash(a+1,b+1,k),u),v);
    return mix(layer(c),layer(c+1),w);
  }
  function overcast(){
    const w=768,h=384,c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d'),im=ctx.createImageData(w,h);
    for(let j=0;j<h;j++)for(let i=0;i<w;i++){
      const lon=(i/w-.5)*Math.PI*2,lat=(.5-j/h)*Math.PI,yy=Math.sin(lat),xx=Math.cos(lat)*Math.cos(lon),zz=Math.cos(lat)*Math.sin(lon);
      const altitude=Math.max(-.05,yy),scale=1/(.24+Math.max(0,yy));
      const x=xx*scale*1.8,z=zz*scale*1.8;
      const clouds=.54*noise(x,1.25,z)+.27*noise(x*2,3.8,z*2)+.13*noise(x*4.1,2,z*4.1)+.06*noise(x*9,7,z*9);
      const veil=Math.min(1,Math.max(0,(altitude+.07)*6)),soft=Math.exp(-7*((xx+.55)**2+(zz-.65)**2+(yy-.52)**2));
      let l=202+veil*(clouds-.49)*79+soft*27-yy*7;
      if(yy<-.055)l-=Math.min(1,(-yy-.055)*5)*83;
      im.data.set([l-7+soft*7,l+1,l+3+yy*6,255],(j*w+i)*4);
    }
    ctx.putImageData(im,0,0);const map=new T.CanvasTexture(c);map.mapping=T.EquirectangularReflectionMapping;map.colorSpace=T.SRGBColorSpace;return map;
  }
  scene.background=overcast();scene.backgroundBlurriness=.02;
  const pmrem=new T.PMREMGenerator(renderer),environment=pmrem.fromEquirectangular(scene.background);scene.environment=environment.texture;scene.environmentIntensity=.75;pmrem.dispose();
  const sky=new T.HemisphereLight(0xdceaf3,0x9d9987,1.58),sun=new T.DirectionalLight(0xfff0d4,2.28);
  scene.add(sky,sun);sun.position.set(-18,34,16);sun.target.position.set(0,2,-2);scene.add(sun.target);
  sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-26,right:26,top:24,bottom:-22,near:1,far:87});sun.shadow.camera.updateProjectionMatrix();sun.shadow.normalBias=.033;sun.shadow.bias=-.00019;sun.shadow.radius=3.4;
  M.quay(scene);M.distance(scene);
  const crane=M.crane(scene),boats=new Map(),loads=new Map(),dollies=new Map();
  const shadows=sim.live().fenders.map(b=>{
    const o=M.fender(scene);o.position.set(b.x,1.45,.15);return o;
  });
  const glows=P.homes.map(()=>M.guides(scene,4.64,2.13)),deckGuide=M.guides(scene,4.57,2.27);
  const amber=M.mat(0xffc05b,.18,.36,{emissive:0xffaf38,emissiveIntensity:.7}), beacon=M.cyl(crane.spreader,0,.48,0,.097,.097,.19,amber,12);
  M.cyl(crane.spreader,0,.39,0,.11,.11,.042,M.mat(0x465155,.57,.54));
  function dolly(){
    const g=M.group(scene),steel=M.mat(0x5e6257,.59,.45),band=M.mat(0xba914d,.59,.4);
    M.box(g,0,1.81,0,4.44,.095,1.93,steel);
    for(const x of [-1.7,1.7])for(const z of [-.94,.94])M.box(g,x,1.82,z,.53,.08,.055,band);
    return M.batch(g);
  }
  const reflTarget=new T.WebGLRenderTarget(600,400,{type:T.UnsignedByteType,depthBuffer:true}),mirrorCam=new T.PerspectiveCamera();
  const mirrorVP=new T.Matrix4(),quayClip=new T.Plane(new T.Vector3(0,1,0),-.035);
  // A simulated near-water patch joins a broad expanse at its absorbing boundary.
  const wx=[-190,...Array.from({length:P.nx},(_,i)=>P.x0+i*P.cell),190],wz=[-.12,...Array.from({length:P.nz},(_,j)=>P.z0+j*P.cell),125,280];
  const wn=wx.length,verts=[],indices=[],uv=[],froth=[],normals=[],mapIndex=[],windUV=[];
  for(let j=0;j<wz.length;j++)for(let i=0;i<wn;i++){
    verts.push(wx[i],0,wz[j]);uv.push(wx[i]*.26,wz[j]*.26);normals.push(0,1,0);froth.push(0);windUV.push(0,0);
    mapIndex.push(Math.min(P.nx-1,Math.max(0,i-1))+P.nx*Math.min(P.nz-1,Math.max(0,j-1)));
    const k=j*wn+i;if(i&&j)indices.push(k-wn-1,k-1,k,k-wn-1,k,k-wn);
  }
  const wg=new T.BufferGeometry(),attr=(a,n)=>new T.Float32BufferAttribute(a,n);
  wg.setAttribute('position',attr(verts,3).setUsage(T.DynamicDrawUsage));wg.setAttribute('normal',attr(normals,3).setUsage(T.DynamicDrawUsage));wg.setAttribute('uv',attr(uv,2));
  wg.setAttribute('froth',attr(froth,1).setUsage(T.DynamicDrawUsage));wg.setAttribute('windUV',attr(windUV,2).setUsage(T.DynamicDrawUsage));wg.setIndex(indices);
  const nmSize=256,normalData=new Uint8Array(nmSize*nmSize*4),height=new Float32Array(nmSize*nmSize);
  for(let i=0;i<height.length;i++){
    const u=(i%nmSize)/nmSize*Math.PI*2,v=Math.floor(i/nmSize)/nmSize*Math.PI*2;
    height[i]=Math.sin(9*v+1.5*Math.sin(4*u+v)+Math.sin(3*u-2*v+1.4))*.36+Math.sin(16*v+2*Math.sin(3*u-2*v)+Math.sin(5*u))*.21+Math.sin(7*u+6*v+Math.sin(4*v))*.16+Math.sin(24*v+Math.sin(5*u+2*v))*.10;
  }
  for(let j=0;j<nmSize;j++)for(let i=0;i<nmSize;i++){
    const k=i+j*nmSize,a=height[(i+1)%nmSize+j*nmSize]-height[(i+nmSize-1)%nmSize+j*nmSize],
      b=height[i+(j+1)%nmSize*nmSize]-height[i+(j+nmSize-1)%nmSize*nmSize];
    normalData.set([128+a*133,128+b*133,250,255],k*4);
  }
  const nm=new T.DataTexture(normalData,nmSize,nmSize);nm.wrapS=nm.wrapT=T.RepeatWrapping;nm.minFilter=T.LinearMipmapLinearFilter;nm.magFilter=T.LinearFilter;nm.generateMipmaps=true;nm.needsUpdate=true;
  const wm=M.mat(0x416c70,.26,.39).clone();wm.normalMap=nm;wm.normalScale.set(.56,.56);wm.envMapIntensity=.65;
  wm.onBeforeCompile=sh=>{
    sh.uniforms.mirrorVP={value:mirrorVP};sh.uniforms.seaMirror={value:reflTarget.texture};
    sh.vertexShader='attribute float froth; attribute vec2 windUV; uniform mat4 mirrorVP; varying vec4 reflectUV;varying float seaFoam;\n'+sh.vertexShader;
    sh.vertexShader=sh.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\n vNormalMapUv+=windUV;');
    sh.vertexShader=sh.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\n reflectUV=mirrorVP*modelMatrix*vec4(transformed,1.); seaFoam=froth;');
    sh.fragmentShader='uniform sampler2D seaMirror; varying vec4 reflectUV;varying float seaFoam;\n'+sh.fragmentShader;
    sh.fragmentShader=sh.fragmentShader.replace('#include <opaque_fragment>',`
      vec2 muv=reflectUV.xy/reflectUV.w*.5+.5;
      vec2 rip=texture2D(normalMap,vNormalMapUv).rg-.5;
      vec3 reflectCol=texture2D(seaMirror,clamp(muv+rip*vec2(.036,.048)+normal.xy*.001,.002,.998)).rgb;
      float fres=pow(1.-clamp(dot(normal,normalize(vViewPosition)),0.,1.),2.);
      outgoingLight=mix(outgoingLight,reflectCol,.24+.42*fres);
      outgoingLight=mix(outgoingLight,vec3(.69,.77,.74),clamp(seaFoam*(.75+2.*rip.y),0.,.83));
      #include <opaque_fragment>`);
  };
  const sea=new T.Mesh(wg,wm);sea.receiveShadow=true;scene.add(sea);
  const dustGeo=new T.IcosahedronGeometry(.012,0),dust=new T.InstancedMesh(dustGeo,M.mat(0xbcb9a3,.9,.01),sim.live().motes.length);scene.add(dust);
  const dustMatrix=new T.Matrix4(),vec=new T.Vector3(),endA=new T.Vector3(),endB=new T.Vector3(),axis=new T.Vector3(0,1,0);
  const camCenter=new T.Vector3(),camDir=new T.Vector3(),right=new T.Vector3(),camUp=new T.Vector3();
  function frame(){
    const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);
    camera.aspect=w/h;camera.updateProjectionMatrix();
    const portrait=T.MathUtils.clamp((1.05-w/h)/.60,0,1);
    camDir.set(.37+.47*portrait,.45+.17*portrait,.90-.53*portrait).normalize();
    right.crossVectors(axis,camDir).normalize();camUp.crossVectors(camDir,right).normalize();
    camCenter.set(0,7.45,.5);let distance=48;
    const points=[[-11.8,2.37,5.8],[-10.2,6,5.6],[-8.1,7.9,3.9],[12.38,2.9,3.9],[9.8,.1,5.5],[-10.8,.1,5.9],[-7.9,21.1,-2.05],[-11.15,17.9,-.88],[7.6,18.7,-5.8],[8.7,1.82,-4.6],[-5.8,1.82,-4.6]];
    for(let pass=0;pass<12;pass++){
      camera.position.copy(camCenter).addScaledVector(camDir,distance);camera.lookAt(camCenter);camera.updateMatrixWorld();
      const pts=points.map(a=>new T.Vector3(...a).project(camera)),xs=pts.map(p=>p.x),ys=pts.map(p=>p.y);
      const lo=Math.min(...xs),hi=Math.max(...xs),bot=Math.min(...ys),top=Math.max(...ys);
      const halfHeight=distance*Math.tan(Math.PI*13/180);
      camCenter.addScaledVector(right,(lo+hi)*.5*halfHeight*camera.aspect*.82);
      camCenter.addScaledVector(camUp,((top+bot)*.5+.005)*halfHeight*.82);
      distance*=Math.pow(Math.max((hi-lo)/(portrait?1.85:1.83),(top-bot)/(portrait?1.64:1.66)),.76);
    }
    camera.position.copy(camCenter).addScaledVector(camDir,distance);camera.lookAt(camCenter);camera.updateMatrixWorld();
    mirrorCam.copy(camera);mirrorCam.position.y*=-1;mirrorCam.up.set(0,-1,0);mirrorCam.lookAt(camCenter.x,-camCenter.y,camCenter.z);mirrorCam.updateMatrixWorld();
    mirrorVP.multiplyMatrices(mirrorCam.projectionMatrix,mirrorCam.matrixWorldInverse);
    const pixels=renderer.getDrawingBufferSize(new T.Vector2());reflTarget.setSize(Math.ceil(pixels.x*.48),Math.ceil(pixels.y*.48));output.setSize(pixels.x,pixels.y);
  }
  // HDR scene pass and a small, local bright-pass halo. Grain is fixed to the film plane.
  const output=new T.WebGLRenderTarget(4,4,{type:renderer.extensions.has('EXT_color_buffer_float')?T.HalfFloatType:T.UnsignedByteType,minFilter:T.LinearMipmapLinearFilter,generateMipmaps:true,depthBuffer:true});
  output.texture.generateMipmaps=true;
  output.samples=Math.min(2,renderer.capabilities.maxSamples);
  const postScene=new T.Scene(),postCam=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const postMat=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{frameMap:{value:output.texture}},vertexShader:'varying vec2 p;void main(){p=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`
    varying vec2 p;uniform sampler2D frameMap;
    void main(){
      vec3 c=texture2D(frameMap,p).rgb;
      vec3 b=textureLod(frameMap,p,3.).rgb;
      c+=max(b-vec3(.94),vec3(0.))*.085;
      c*=1.-.12*pow(clamp(length((p-.5)*1.32),0.,1.),2.);
      gl_FragColor=vec4(c,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5;
      gl_FragColor.rgb+=grain*.009;
    }`});
  postScene.add(new T.Mesh(new T.PlaneGeometry(2,2),postMat));
  const tokenEls=[...document.querySelectorAll('.token')];
  function sync(s){
    const h=s.hook,t=s.tip,dx=h.x-crane.base.position.x,dz=h.z-crane.base.position.z,angle=Math.atan2(-dz,dx);
    crane.head.rotation.y=angle;crane.cart.position.x=Math.hypot(dx,dz);crane.drum.rotation.y=h.spool;
    crane.spreader.position.set(t.x,t.y,t.z);crane.spreader.rotation.set(h.az*.36,0,-h.ax*.36);
    for(let i=0;i<4;i++){
      const sx=(i&1)?1:-1,sz=(i&2)?1:-1;
      endA.set(h.x+sx*.35*Math.cos(angle)+sz*.44*Math.sin(angle),17.60,h.z-sx*.35*Math.sin(angle)+sz*.44*Math.cos(angle));
      endB.set(sx*.40,1.1,sz*.19).applyEuler(crane.spreader.rotation).add(crane.spreader.position);
      const line=crane.lines[i];line.position.copy(endA).add(endB).multiplyScalar(.5);vec.subVectors(endA,endB);
      line.scale.y=vec.length();line.quaternion.setFromUnitVectors(axis,vec.normalize());
      crane.pins[i].rotation.y=h.lock*Math.PI*.5;crane.pins[i].position.y=.07-h.lock*.09;
    }
    amber.emissiveIntensity=.65+.65*Math.max(0,Math.cos(h.beacon))**4;
    for(const b of s.ships){
      if(!boats.has(b.id))boats.set(b.id,M.vessel(scene));
      const o=boats.get(b.id);o.position.set(b.x,b.heave,P.deckZ);o.rotation.set(b.roll,0,b.trim,'ZXY');
    }
    for(const [id,o] of boats)if(!s.ships.some(b=>b.id===id)){o.removeFromParent();o.traverse(p=>{if(p.isMesh)p.geometry.dispose();});boats.delete(id);}
    for(const c of s.cargo){
      if(!loads.has(c.id))loads.set(c.id,M.container(scene,c.kind));
      const o=loads.get(c.id);o.position.set(c.x,c.y,c.z);o.rotation.set(c.roll,0,c.trim+c.shake,'ZXY');
    }
    for(const sled of s.sleds){
      if(!dollies.has(sled.kind))dollies.set(sled.kind,dolly());
      dollies.get(sled.kind).position.set(sled.x,0,sled.z);
    }
    for(const [id,o] of loads)if(!s.cargo.some(c=>c.id===id)){o.removeFromParent();loads.delete(id);}
    for(let i=0;i<3;i++){
      const c=s.cargo.find(c=>c.mode==='yard'&&c.kind===i);
      const guide=glows[i];guide.g.visible=!!c && s.phase==='pick'&&c.id===s.candidate;
      if(guide.g.visible){guide.g.position.set(c.x,1.835,c.z);guide.finish.emissiveIntensity=1.0+.4*s.winds[i].light;}
      tokenEls[i].classList.toggle('loaded',s.cargo.some(c=>c.kind===i&&c.carrier===s.shipId));
    }
    const boat=s.ships.find(b=>b.id===s.shipId);
    deckGuide.g.visible=['carry','alignDrop','lowerDrop','unlock'].includes(s.phase);
    if(deckGuide.g.visible){
      deckGuide.g.position.set(boat.x+P.slots[s.dropSlot],2.12+boat.heave+P.slots[s.dropSlot]*boat.trim,P.deckZ);
      deckGuide.g.rotation.set(boat.roll,0,boat.trim);deckGuide.finish.emissiveIntensity=1.6+s.winds[5].light*.45;
    }
    for(let i=0;i<s.fenders.length;i++)shadows[i].rotation.x=s.fenders[i].angle;
    for(let i=0;i<s.motes.length;i++){const p=s.motes[i];dustMatrix.makeTranslation(p.x,p.y,p.z);dust.setMatrixAt(i,dustMatrix);}dust.instanceMatrix.needsUpdate=true;
    sun.intensity=2.05+s.winds[4].light*.48;
    const a=wg.attributes,seaState=s.water;
    for(let k=0;k<mapIndex.length;k++){
      const n=mapIndex[k],i=n%P.nx,j=Math.floor(n/P.nx),left=n-(i>0?1:0),rt=n+(i<P.nx-1?1:0),front=n-(j>0?P.nx:0),back=n+(j<P.nz-1?P.nx:0);
      const nx=(seaState.h[left]-seaState.h[rt])/(2*P.cell),nz=(seaState.h[front]-seaState.h[back])/(2*P.cell),mag=Math.hypot(nx,1,nz);
      a.position.setY(k,seaState.h[n]);a.normal.setXYZ(k,nx/mag,1/mag,nz/mag);a.froth.setX(k,seaState.foam[n]);
      const wind=s.winds[Math.min(8,Math.floor(i/6.2))];
      a.windUV.setXY(k,wind.u*.10+seaState.h[n]*.32,wind.v*.07+seaState.v[n]*.52);
    }
    for(const key of ['position','normal','froth','windUV'])a[key].needsUpdate=true;
    guideHand(s);
  }
  const smooth=x=>{x=T.MathUtils.clamp(x,0,1);return x*x*(3-2*x);};
  function guideHand(s){
    if(!s.hintActive){hand.style.opacity=0;return;}
    const obj=s.phase==='pick'?s.cargo.find(c=>c.id===s.candidate):null;
    const phase=(s.idle-4)%4.8,boat=s.ships.find(b=>b.id===s.shipId);
    const from=new T.Vector3(s.tip.x,s.tip.y+.25,s.tip.z),to=obj?new T.Vector3(obj.x,obj.y+P.boxH+.13,obj.z):new T.Vector3(P.slots[s.dropSlot]+boat.x,2.15+boat.heave,P.deckZ);
    const progress=smooth((phase-.65)/1.60);from.lerp(to,progress);from.y+=.36*Math.sin(progress*Math.PI);from.project(camera);
    const scale=1-.15*smooth((phase-.27)/.28)+.15*smooth((phase-2.50)/.25);
    hand.style.transform='translate('+((from.x*.5+.5)*innerWidth-8)+'px,'+((-from.y*.5+.5)*innerHeight-7)+'px) rotate(-10deg) scale('+scale+')';
    hand.style.opacity=.90*smooth(phase/.3)*(1-smooth((phase-2.95)/.65));
  }
  function draw(){
    const s=sim.live();sync(s);
    renderer.setRenderTarget(reflTarget);sea.visible=false;renderer.clippingPlanes=[quayClip];
    // The direct pass updates the common shadow map. Reuse it for the water reflection.
    renderer.shadowMap.autoUpdate=false;renderer.render(scene,mirrorCam);
    sea.visible=true;renderer.clippingPlanes=[];renderer.shadowMap.autoUpdate=true;
    renderer.setRenderTarget(output);renderer.render(scene,camera);
    renderer.setRenderTarget(null);renderer.render(postScene,postCam);
  }
  const sound=(()=>{
    let ctx,bus,hum,gain,windGain,enabled=true,lastEvent=-1;
    function unlock(){
      if(!ctx){
        const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
        ctx=new Audio();bus=ctx.createGain();bus.gain.value=enabled?.69:0;
        const limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-13;limiter.ratio.value=4;bus.connect(limiter);limiter.connect(ctx.destination);
        hum=ctx.createOscillator();hum.type='triangle';hum.frequency.value=59;gain=ctx.createGain();gain.gain.value=0;hum.connect(gain);gain.connect(bus);hum.start();
        const noiseBuffer=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate),samples=noiseBuffer.getChannelData(0);
        let last=0;for(let i=0;i<samples.length;i++){last=.92*last+(Math.random()-.5)*.16;samples[i]=last;}
        const breeze=ctx.createBufferSource(),filter=ctx.createBiquadFilter();breeze.buffer=noiseBuffer;breeze.loop=true;filter.type='lowpass';filter.frequency.value=1100;windGain=ctx.createGain();windGain.gain.value=.028;breeze.connect(filter);filter.connect(windGain);windGain.connect(bus);breeze.start();lastEvent=sim.live().elapsed;
      }
      if(ctx.state==='suspended')ctx.resume().catch(()=>{});
    }
    function tone(f,end,volume,decay,type='sine',attack=.012,delay=0){
      const osc=ctx.createOscillator(),amp=ctx.createGain(),now=ctx.currentTime+delay;osc.type=type;
      osc.frequency.setValueAtTime(f,now);osc.frequency.exponentialRampToValueAtTime(end,now+decay);
      amp.gain.setValueAtTime(.00001,now);amp.gain.exponentialRampToValueAtTime(volume,now+attack);amp.gain.exponentialRampToValueAtTime(.00001,now+decay);
      osc.connect(amp);amp.connect(bus);osc.start(now);osc.stop(now+decay+.015);osc.onended=()=>{osc.disconnect();amp.disconnect();};
    }
    function update(s){
      if(!ctx)return;const h=s.hook,speed=Math.hypot(h.vx,h.vz,h.vy);
      hum.frequency.setTargetAtTime(49+speed*22,ctx.currentTime,.13);gain.gain.setTargetAtTime(.0018+speed*.019,ctx.currentTime,.1);
      windGain.gain.setTargetAtTime(.032+Math.abs(s.winds[5].u)*.053+Math.min(1,s.ships[0].speed)*.10,ctx.currentTime,.3);
      for(const e of sim.events){
        if(e.time<=lastEvent)continue;
        if(e.type==='latch'){tone(513,394,.13,.17,'triangle');tone(840,691,.048,.31,'sine',.009,.065);}
        if(e.type==='impact'){
          const energy=Math.min(1,.69+e.power*.36);
          for(const [f,amp,decay] of [[92,.58,.8],[173,.24,1.2],[328,.19,1.5],[557,.10,.89],[931,.055,.61]])tone(f*1.06,f,amp*energy,decay);
        }
        if(e.type==='horn'){for(const [f,amp] of [[130.81,.38],[164.81,.20],[196,.13],[261.62,.068]])tone(f*.982,f,amp,2.8,'triangle',.24);}
        if(e.type==='ready'){tone(493.88,493.88,.07,.68);tone(659.25,659.25,.062,.9,'sine',.018,.17);}
        lastEvent=e.time;
      }
    }
    function toggle(){unlock();enabled=!enabled;if(bus)bus.gain.setTargetAtTime(enabled?.69:0,ctx.currentTime,.07);soundButton.classList.toggle('off',!enabled);soundButton.setAttribute('aria-pressed',String(enabled));soundButton.setAttribute('aria-label',enabled?'音を切る':'音を出す');}
    return {unlock,update,toggle,pause(){if(ctx)ctx.suspend().catch(()=>{});}};
  })();
  soundButton.addEventListener('click',sound.toggle);
  const ray=new T.Raycaster(),ndc=new T.Vector2(),plane=new T.Plane(new T.Vector3(0,1,0),0);
  function setRay(e){const r=canvas.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);ray.setFromCamera(ndc,camera);}
  function hit(e){
    setRay(e);const s=sim.live(),choices=[];
    const test=(center,half,data)=>{
      const a=new T.Vector3(...center),b=new T.Vector3(...half);
      const contact=ray.ray.intersectBox(new T.Box3(a.clone().sub(b),a.clone().add(b)),new T.Vector3());
      if(contact)choices.push({distance:contact.distanceTo(ray.ray.origin),...data,x:data.x??contact.x});
    };
    if(s.phase==='pick')for(const c of s.cargo)if(c.mode==='yard')test([c.x,c.y+P.boxH/2,c.z],[2.29,1.07,1.05],{type:'cargo',id:c.id,x:c.x});
    if(s.phase==='carry'||s.phase==='pick'){
      test([s.tip.x,s.tip.y+.36,s.tip.z],[2.13,.59,1.02],{type:'hook'});
      if(s.phase==='carry'){
        test([s.tip.x,s.tip.y-.88,s.tip.z],[2.28,1.08,1.04],{type:'hook'});
        const b=s.ships.find(b=>b.id===s.shipId);
        test([b.x-.05,1.5+b.heave,P.deckZ],[11.8,1.02,2.36],{type:'deck'});
      }
    }
    return choices.sort((a,b)=>a.distance-b.distance)[0]||null;
  }
  let pointerId=null,downX=0,downY=0,startHit=null,dragged=false;
  canvas.addEventListener('pointerdown',e=>{
    if(pointerId!==null||e.button!==0)return;
    const obj=hit(e);if(!sim.press(obj))return;
    sound.unlock();pointerId=e.pointerId;startHit=obj;dragged=false;downX=e.clientX;downY=e.clientY;canvas.setPointerCapture(e.pointerId);e.preventDefault();
  });
  canvas.addEventListener('pointermove',e=>{
    if(pointerId!==e.pointerId)return;
    if(!dragged&&Math.hypot(e.clientX-downX,e.clientY-downY)<4)return;
    dragged=true;setRay(e);const s=sim.live();plane.constant=-(s.phase==='carry'?2:3.7);
    const p=ray.ray.intersectPlane(plane,vec);if(p)sim.move(p.x,p.z);
  });
  canvas.addEventListener('pointerup',e=>{
    if(pointerId!==e.pointerId)return;
    let obj=dragged?hit(e):startHit;
    if(dragged&&sim.live().phase==='carry'&&obj?.type==='hook'){
      plane.constant=-2;const p=ray.ray.intersectPlane(plane,vec);if(p && p.z>=1.55&&p.z<=6.27&&Math.abs(p.x)<11.8)obj={type:'deck',x:p.x};
    }
    sim.release(obj);pointerId=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
  });
  function cancel(){if(pointerId!==null){sim.cancel();pointerId=null;}}
  canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('lostpointercapture',cancel);
  window.addEventListener('resize',frame);frame();let prev=performance.now();
  document.addEventListener('visibilitychange',()=>{prev=performance.now();if(document.hidden){cancel();sound.pause();}});
  function loop(now){
    if(!document.hidden){sim.step(Math.min(.08,Math.max(0,(now-prev)/1000)));sound.update(sim.live());draw();}
    prev=now;requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
