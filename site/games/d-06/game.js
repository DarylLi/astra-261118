(()=>{
  'use strict';
  const T=THREE,M=TownModel,model=M.make(),canvas=document.querySelector('#world');
  window.__GAME__={step:model.step,getState:model.getState,tap:model.tap};
  const renderer=new T.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.03;
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.autoClear=false;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(28,1,.1,180);
  const hemi=new T.HemisphereLight('#d9dcff','#b09584',1.40);scene.add(hemi);
  const sun=new T.DirectionalLight('#ffdcab',2.92);
  sun.position.set(-9,16,-7);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-12,right:12,top:11,bottom:-11,near:.1,far:50});
  sun.shadow.bias=-.00027;sun.shadow.normalBias=.018;sun.shadow.radius=2.5;
  scene.add(sun,sun.target);
  // A local sky dome for the varnish; the pond also captures its actual bank and buildings.
  function skyEnv(){
    const faces=[];
    for(let face=0;face<6;face++){
      const c=document.createElement('canvas');c.width=c.height=96;
      const ctx=c.getContext('2d'),im=ctx.createImageData(96,96);
      for(let j=0;j<96;j++)for(let i=0;i<96;i++){
        const u=(i+.5)/48-1,v=(j+.5)/48-1,d=[[1,-v,-u],[-1,-v,u],[u,1,v],[u,-1,-v],[u,-v,1],[-u,-v,-1]][face],len=Math.hypot(...d),y=d[1]/len;
        const horizon=[242,187,153],zenith=[119,139,190],ground=[110,94,104],base=y<0?ground:zenith,w=Math.min(1,Math.abs(y)*1.8);
        const fire=Math.pow(Math.max(0,(-.6*d[0]+.64*d[1]-.48*d[2])/len),55)*.68,k=(j*96+i)*4;
        for(let ch=0;ch<3;ch++)im.data[k+ch]=horizon[ch]*(1-w)+base[ch]*w+fire*91;im.data[k+3]=255;
      }
      ctx.putImageData(im,0,0);faces.push(c);
    }
    const cube=new T.CubeTexture(faces);cube.colorSpace=T.SRGBColorSpace;cube.needsUpdate=true;return cube;
  }
  const sky=skyEnv();scene.environment=sky;
  let board=TownArt.create(model.read()),other=null,lastDistrict=0;
  scene.add(board.root);TownArt.update(board,model.read());
  function contactShadow(){
    const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),im=ctx.createImageData(128,128);
    for(let y=0;y<128;y++)for(let x=0;x<128;x++){
      const a=Math.pow(Math.abs((x-63.5)/64),3.2)+Math.pow(Math.abs((y-63.5)/64),3.2),k=(y*128+x)*4;
      const val=255*Math.exp(-a*4.0)*Math.max(0,1-a);
      im.data.set([val,val,val,255],k);
    }
    ctx.putImageData(im,0,0);const alpha=new T.CanvasTexture(c);
    const material=Craft.mat('#382a46','rock').clone();material.transparent=true;material.alphaMap=alpha;material.opacity=.73;material.depthWrite=false;
    const ground=new T.Mesh(new T.PlaneGeometry(25,16.1),material);
    ground.rotation.x=-Math.PI/2;ground.position.set(.45,-1.085,.0);ground.receiveShadow=true;ground.renderOrder=-1;return ground;
  }
  const ground=contactShadow();board.root.add(ground);
  const pondCapture=new T.WebGLCubeRenderTarget(64,{type:T.HalfFloatType,generateMipmaps:true,minFilter:T.LinearMipmapLinearFilter});
  const cubeCam=new T.CubeCamera(.08,47,pondCapture);let reflectDirty=true;
  function reflect(){
    const w=board.water;w.visible=false;w.getWorldPosition(cubeCam.position);cubeCam.position.y+=.08;
    scene.background=sky;renderer.autoClear=true;cubeCam.update(renderer,scene);renderer.autoClear=false;scene.background=null;w.visible=true;
    if(!w.material.userData.localReflection){w.material=w.material.clone();w.material.envMap=pondCapture.texture;w.material.envMapIntensity=.86;w.material.userData.localReflection=true;}
    reflectDirty=false;
  }
  const screenCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const passVertex='varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
  function pass(fragment,uniforms={}){
    const scene=new T.Scene(),m=new T.ShaderMaterial({vertexShader:passVertex,fragmentShader:fragment,uniforms,depthTest:false,depthWrite:false});
    scene.add(new T.Mesh(new T.PlaneGeometry(2,2),m));return scene;
  }
  const skyUniform={aspect:{value:1}};
  const backdrop=pass(`
    varying vec2 vUv;uniform float aspect;
    float hash(vec2 n){return fract(sin(dot(n,vec2(12.9898,78.233)))*43758.5453);}
    float noise2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
    vec3 lin(vec3 s){return pow(s,vec3(2.2));}
    void main(){
      vec2 p=vUv;float y=p.y;
      vec3 floorCol=mix(vec3(.36,.255,.354),vec3(.68,.505,.522),smoothstep(-.14,.62,y));
      vec3 sunset=mix(vec3(.97,.698,.530),vec3(.86,.60,.565),p.x);
      vec3 dusk=mix(vec3(.51,.456,.593),vec3(.32,.322,.48),p.x);
      vec3 col=mix(floorCol,sunset,smoothstep(.42,.73,y));
      col=mix(col,dusk,smoothstep(.70,1.07,y));
      float n=noise2(vec2(p.x*5.,y*36.))*.6+noise2(vec2(p.x*10.+23.,y*77.))*.4;
      col+=vec3(.090,.052,.035)*(n-.42)*smoothstep(.70,.87,y);
      vec2 q=(p-vec2(.216,.802))*vec2(aspect,1.);float r=length(q);
      col+=vec3(.12,.091,.051)*exp(-r*12.);
      col=mix(col,vec3(1.,.846,.63),1.-smoothstep(.018,.0195,r));
      vec2 st=p*vec2(179.*aspect,179.);float star=hash(floor(st));
      col+=vec3(.34,.31,.24)*step(.996,star)*(1.-smoothstep(.035,.16,length(fract(st)-.5)))*smoothstep(.8,.98,y);
      col+=(noise2(p*vec2(52.,86.))-.5)*.006;
      gl_FragColor=vec4(lin(col),1.);
    }`,skyUniform);
  // Separate perspective landscape far beyond the worktable, with atmospheric layers.
  const beyond=new T.Scene(),farCamera=new T.PerspectiveCamera(28,1,.1,350);
  beyond.add(new T.HemisphereLight('#ffe4d3','#d6bece',1.9));
  const farSun=new T.DirectionalLight('#ffdfbd',1.1);farSun.position.set(-12,9,4);beyond.add(farSun);
  for(let g=0;g<3;g++){
    const p=[],color=[],idx=[],D=95-g*16,N=320,alpha=[.78,.75,.64][g],shade=['#ad919c','#938092','#827589'][g];
    const base=new T.Color(shade);
    for(let i=0;i<=N;i++){
      const x=(i/N-.5)*390,k=x*.062+g*2.65;
      const h=.119-.022*g+.021*Math.sin(k)+.011*Math.cos(k*2.62)+.0039*Math.sin(k*5.03)+.0015*Math.cos(k*16.2);
      for(let j=0;j<3;j++){
        p.push(x,j===0?h*D:j===1?(h-.021)*D:.019*D,-D+j*1.7);
        color.push(base.r,base.g,base.b,j===0?alpha:j===1?alpha*.72:0);
        if(j<2&&i<N){const n=i*3+j;idx.push(n,n+1,n+3,n+1,n+4,n+3);}
      }
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setAttribute('color',new T.Float32BufferAttribute(color,4));geo.setIndex(idx);geo.computeVertexNormals();
    const m=new T.MeshStandardMaterial({vertexColors:true,roughness:.96,roughnessMap:Craft.rough,transparent:true,depthWrite:false,side:T.DoubleSide});
    beyond.add(new T.Mesh(geo,m));
  }
  // Small actual conifers break up the near ridge. Haze keeps their silhouette behind the worktable.
  const ridgeTrees=new T.InstancedMesh(new T.ConeGeometry(1,1,5),new T.MeshStandardMaterial({
    color:'#8f8192',roughness:.92,roughnessMap:Craft.rough,transparent:true,opacity:.38,depthWrite:false}),320);
  const treeMatrix=new T.Object3D();
  for(let i=0;i<320;i++){
    const x=(i-160)*.52+(Craft.noise()-.5)*.42,k=x*.062+5.30;
    const ridge=.075+.021*Math.sin(k)+.011*Math.cos(k*2.62)+.0039*Math.sin(k*5.03)+.0015*Math.cos(k*16.2);
    const h=.18+Craft.noise()*.56;
    treeMatrix.position.set(x,63*ridge+h*.31,-63);treeMatrix.scale.set(h*.23,h,h*.23);
    treeMatrix.rotation.y=Craft.noise()*4;treeMatrix.updateMatrix();ridgeTrees.setMatrixAt(i,treeMatrix.matrix);
  }
  beyond.add(ridgeTrees);
  const target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:true,samples:Math.min(4,renderer.capabilities.maxSamples)});
  const finalUniform={frame:{value:target.texture},pixel:{value:new T.Vector2(1,1)}};
  const finish=pass(`
    varying vec2 vUv;uniform sampler2D frame;uniform vec2 pixel;
    vec3 bright(vec2 p){vec3 c=texture2D(frame,p).rgb;return c*smoothstep(.86,2.2,dot(c,vec3(.27,.61,.12)));}
    void main(){
      vec2 p=vUv;vec3 c=texture2D(frame,p).rgb;vec3 glow=vec3(0.);
      for(int j=0;j<8;j++){float a=float(j)*.7853982;vec2 dir=vec2(cos(a),sin(a))*pixel;glow+=bright(p+dir*3.)+.58*bright(p+dir*7.);}
      c+=glow*.0055;
      float edge=dot((p-.5)*1.32,(p-.5)*1.32);c*=1.-.125*edge;
      gl_FragColor=vec4(c,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      float grain=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))))-.5;
      gl_FragColor.rgb+=grain*.009;
    }`,finalUniform);
  const eye=new T.Vector3(),aim=new T.Vector3(),temp=new T.Vector3();
  let width=1,height=1,distance=1,pan=0,lastAspect=1;
  function positionCamera(){
    aim.set(pan,.67,-.20);
    camera.position.copy(aim).addScaledVector(eye,distance);camera.lookAt(aim);camera.updateMatrixWorld();
    sun.position.set(pan-9,16,-7);sun.target.position.set(pan,0,0);
    farCamera.position.x=pan*.15;farCamera.updateMatrixWorld();
  }
  function resize(){
    width=window.innerWidth;height=window.innerHeight;lastAspect=width/height;
    renderer.setSize(width,height,false);
    const size=new T.Vector2();renderer.getDrawingBufferSize(size);
    target.setSize(size.x,size.y);finalUniform.pixel.value.set(1/size.x,1/size.y);
    camera.aspect=farCamera.aspect=lastAspect;camera.updateProjectionMatrix();farCamera.updateProjectionMatrix();skyUniform.aspect.value=lastAspect;
    const w=Math.max(0,Math.min(1,(lastAspect-.54)/.62)),angle=(82-57*w*w*(3-2*w))*Math.PI/180;
    eye.set(Math.sin(angle)*Math.SQRT1_2,Math.SQRT1_2,Math.cos(angle)*Math.SQRT1_2);
    const points=[];for(const x of [-8.52,8.52])for(const z of [-5.26,4.73])for(const y of [-1.07,.13])points.push([x,y,z]);
    points.push([-6.69,2.85,-1.68],[5.67,2.81,-2.04],[4.87,5.32,-4.50],[1.33,4.91,-2.60],[6.20,4.90,-5.12]);
    let lo=12,hi=110,centerX=0,centerY=0;
    for(let i=0;i<29;i++){
      distance=(lo+hi)/2;positionCamera();
      let left=Infinity,right=-Infinity,bottom=Infinity,top=-Infinity;
      for(const [x,y,z] of points){
        temp.set(x+pan,y,z).project(camera);
        left=Math.min(left,temp.x);right=Math.max(right,temp.x);
        bottom=Math.min(bottom,temp.y);top=Math.max(top,temp.y);
      }
      centerX=(left+right)/2;centerY=(bottom+top)/2;
      if(right-left<1.87 && top-bottom<1.48)hi=distance;else lo=distance;
    }
    distance=hi;
    // Shift the lens to frame the asymmetric skyline while retaining the 45° camera angle.
    camera.projectionMatrix.elements[8]+=centerX;
    camera.projectionMatrix.elements[9]+=centerY+.045;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();positionCamera();
  }
  addEventListener('resize',resize);resize();
  const ray=new T.Raycaster(),pointer=new T.Vector2(),hit=new T.Vector3(),groundPlane=new T.Plane(new T.Vector3(0,1,0),-.27);
  function pick(e){
    const s=model.read();if(s.phase!=='build')return;
    pointer.set(e.clientX/width*2-1,1-e.clientY/height*2);ray.setFromCamera(pointer,camera);
    // First intersect the actual built pieces, then the bounded top face of each pad.
    const built=[];
    for(const p of s.lots)if(p.status==='done')built.push(...board.plots[p.i].layers);
    if(built.length){
      const it=ray.intersectObjects(built,true)[0];
      if(it){let parent=it.object;while(parent&&!built.includes(parent))parent=parent.parent;
        const i=board.plots.findIndex(p=>p.layers.includes(parent));if(i>=0){model.tap(i);return;}}
    }
    if(!ray.ray.intersectPlane(groundPlane,hit))return;
    const lot=s.lots.find(p=>Math.abs(hit.x-p.x)<1.245&&Math.abs(hit.z-p.z)<1.025);
    if(lot)model.tap(lot.i);
  }
  let ac=null,master=null,enabled=true,heard=0,trackBeat=-1;
  function unlock(){
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
    if(!ac){ac=new AC();master=ac.createGain();master.gain.value=enabled?.34:0;master.connect(ac.destination);}
    if(ac.state==='suspended')ac.resume().catch(()=>{});
  }
  function tone(freq,duration,volume,type='sine',when=0,endFreq=freq){
    if(!ac||!enabled||ac.state!=='running')return;
    const o=ac.createOscillator(),en=ac.createGain(),start=ac.currentTime+when;
    o.type=type;o.frequency.setValueAtTime(freq,start);o.frequency.exponentialRampToValueAtTime(endFreq,start+duration*.85);
    en.gain.setValueAtTime(.0001,start);en.gain.exponentialRampToValueAtTime(volume,start+Math.min(.018,duration*.18));
    en.gain.exponentialRampToValueAtTime(.0001,start+duration);
    o.connect(en);en.connect(master);o.start(start);o.stop(start+duration+.018);o.onended=()=>{o.disconnect();en.disconnect();};
  }
  const scale=[261.63,329.63,392,440,523.25,659.25];
  function music(s){
    for(const e of s.events)if(e.time>heard){
      const f=scale[e.i%6];
      if(e.name==='tap'){tone(f,.24,.16);tone(f*2.48,.075,.08);}
      if(e.name==='land'){tone(190+e.i*11,.095,.31,'triangle',0,83);tone(f*1.5,.19,.09);}
      if(e.name==='roof'){tone(f*1.25,.32,.14);tone(f*1.875,.27,.13,'sine',.11);}
      if(e.name==='built'){tone(f,.4,.20);tone(f*1.25,.44,.14,'sine',.09);tone(f*1.5,.48,.12,'sine',.20);}
      if(e.name==='lamp'){tone(f*1.5,.69,.15);tone(f*3,.27,.045);}
      if(e.name==='train'||e.name==='station'){tone(590,.59,.11,'sine',0,651);tone(781,.69,.081,'sine',.07,844);}
      if(e.name==='expand')for(let i=0;i<4;i++)tone(scale[i],.50,.12,'sine',i*.15);
    }
    if(s.events.length)heard=Math.max(heard,s.events[s.events.length-1].time);
    const beat=Math.floor(s.cars[0].s/.48);
    if(s.phase==='train'&&beat!==trackBeat){tone(118,.065,.13,'triangle',0,64);tone(149,.043,.079,'triangle',.063,71);}
    trackBeat=beat;
  }
  const sound=document.querySelector('#sound');
  sound.addEventListener('click',()=>{enabled=!enabled;unlock();if(master)master.gain.setTargetAtTime(enabled?.34:0,ac.currentTime,.035);
    sound.classList.toggle('muted',!enabled);sound.setAttribute('aria-pressed',String(enabled));});
  let tracking=null;
  canvas.addEventListener('pointerdown',e=>{
    if(!e.isPrimary||e.button!==0||tracking)return;
    unlock();tracking={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointerup',e=>{
    if(!tracking||e.pointerId!==tracking.id)return;
    const tap=Math.hypot(e.clientX-tracking.x,e.clientY-tracking.y)<23;tracking=null;if(tap)pick(e);
  });
  canvas.addEventListener('pointercancel',()=>tracking=null);
  const pips=[...document.querySelectorAll('#dots i')],stages=[...document.querySelectorAll('.stage')],hand=document.querySelector('#hand');
  let oldStage=-1;
  function hud(s){
    pips.forEach((p,i)=>p.classList.toggle('on',s.lots[i].status==='done'));
    const stage=s.phase==='build'?0:s.phase==='lamps'?1:2;
    if(oldStage!==stage){stages.forEach((a,i)=>a.classList.toggle('active',stage===i));oldStage=stage;if(stage===2)reflectDirty=true;}
    const p=s.lots[s.hint];temp.set(p.x,.36,p.z).project(camera);
    const lift=(1-s.cueDepth.x)*17;
    hand.style.transform='translate('+((temp.x*.5+.5)*width+lift*.34-4)+'px,'+((-.5*temp.y+.5)*height-lift-6)+'px) rotate('+(-9-s.cueDepth.x*7)+'deg) scale('+(1-s.cueDepth.x*.10)+')';
    hand.style.opacity=String(s.cue*.87);
  }
  let previous=performance.now();
  document.addEventListener('visibilitychange',()=>{previous=performance.now();});
  function frame(now){
    requestAnimationFrame(frame);if(document.hidden)return;
    const dt=Math.min(.12,Math.max(0,(now-previous)/1000));previous=now;
    model.step(dt);const s=model.read();
    if(s.district!==lastDistrict){
      const recycled=board;board=other||TownArt.create(s,recycled.terrain);other=recycled;
      scene.add(board.root);board.root.position.set(0,0,0);other.root.position.x=-M.spacing;lastDistrict=s.district;reflectDirty=true;
    }
    pan=s.pan.x;positionCamera();TownArt.update(board,s);
    if(s.phase==='expand'){
      if(!other){other=TownArt.create(model.preview(),board.terrain);other.root.add(ground.clone());}
      if(!other.root.parent)scene.add(other.root);
      other.root.visible=true;
      other.root.position.set(M.spacing+13*(1-s.bridge.x),-1.9*(1-s.bridge.x),0);
      TownArt.update(other,model.preview());
    }else if(other){
      other.root.position.x=-M.spacing-s.retire.x*40;other.root.visible=s.retire.x<.999;
    }
    if(reflectDirty)reflect();
    hud(s);music(s);
    renderer.setRenderTarget(target);renderer.clear();renderer.render(backdrop,screenCamera);
    renderer.render(beyond,farCamera);renderer.clearDepth();renderer.render(scene,camera);
    renderer.setRenderTarget(null);renderer.render(finish,screenCamera);
  }
  requestAnimationFrame(frame);
})();
