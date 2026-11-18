(function(){
  'use strict';
  const T=THREE,F=Flight,M=Models,$=id=>document.getElementById(id);
  const canvas=$('world'),game=F.create({spread:Math.min(1,.35+innerWidth/innerHeight*.57)});
  window.__GAME__={step:game.step,getState:()=>structuredClone(game.getState())};
  const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(45,1,.24,2900);
  scene.fog=new T.FogExp2(0xd9cdca,.00091);
  const skyLight=new T.HemisphereLight(0xd5e8ff,0xc2ac85,1.37);
  const sun=new T.DirectionalLight(0xffe0b0,2.48);
  sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-67,right:67,top:62,bottom:-62,near:1,far:260});
  sun.shadow.camera.updateProjectionMatrix();sun.shadow.bias=-.00042;sun.shadow.normalBias=.033;sun.shadow.radius=2.1;
  scene.add(skyLight,sun,sun.target);sun.target.position.set(0,20,-12);
  sun.position.copy(sun.target.position).addScaledVector(Valley.sunDirection(new T.Vector3(),.076),126);
  const valley=Valley.create(scene,renderer);
  const plane=M.glider();scene.add(plane.root);
  const balloons=Array.from({length:20},(_,i)=>{const b=M.balloon(i);scene.add(b.root);return b;});
  const family=M.family();scene.add(family.group);
  const dummy=new T.Object3D(),dustM=M.mat(0xf3e4b1,.76,0,{emissive:0xf5c68b,emissiveIntensity:.21});
  const dust=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),dustM,game.getState().seeds.length);dust.frustumCulled=false;scene.add(dust);
  const risingM=M.mat(0xf5dba1,.75,0,{transparent:true,opacity:.48,emissive:0xffda83,emissiveIntensity:.34,depthWrite:false});
  const plumes=new T.InstancedMesh(new T.SphereGeometry(1,6,4),risingM,game.getState().thermals.length*24);plumes.frustumCulled=false;scene.add(plumes);
  const traceM=M.mat(0xffe1a0,.32,.2,{emissive:0xffbe5e,emissiveIntensity:.66,transparent:true,opacity:.7,depthWrite:false});
  const trails=new T.InstancedMesh(new T.SphereGeometry(1,8,6),traceM,7);trails.frustumCulled=false;scene.add(trails);
  // A little sun-warmed patch underneath each rising column, fitted to the grass.
  const patches=game.getState().thermals.map(()=>{
    const verts=[],colors=[],idx=[],segments=32;
    for(let j=0;j<4;j++)for(let i=0;i<=segments;i++){
      const a=i*Math.PI*2/segments,r=j/3;verts.push(Math.cos(a)*r,0,Math.sin(a)*r);
      colors.push(.85,.61,.25,(1-r*r)*.22);
      if(i<segments&&j<3){const k=j*(segments+1)+i;idx.push(k,k+1,k+segments+1,k+1,k+segments+2,k+segments+1);}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));
    g.setAttribute('color',new T.Float32BufferAttribute(colors,4));g.setIndex(idx);g.computeVertexNormals();
    const o=M.mesh(scene,g,M.mat(0xffffff,.96,0,{vertexColors:true,transparent:true,side:T.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));
    o.castShadow=false;return {o,coordinates:verts,lastS:NaN};
  });
  const flowers=new T.Group();scene.add(flowers);const flowerGeo=new T.IcosahedronGeometry(1,0);
  const petal=new T.InstancedMesh(flowerGeo,M.mat(0xffebbb,.85),470),stems=new T.InstancedMesh(new T.ConeGeometry(.06,.5,3),M.mat(0x889253),470);
  flowers.add(petal,stems);let lastLanding=null;
  function placeFlowers(l) {
    const r=F.random(18754);
    for(let i=0;i<petal.count;i++){
      const x=l.x+(r()-.46)*44,s=l.finish+(r()-.34)*47,h=F.terrain(x,s),sz=.026+r()*.047;
      dummy.position.set(x,h+.105+sz*1.6,-s);dummy.rotation.set(r(),r(),r());dummy.scale.set(sz,sz*.44,sz);dummy.updateMatrix();
      petal.setMatrixAt(i,dummy.matrix);petal.setColorAt(i,new T.Color(i%4?0xffefc8:0xe2b956));
      dummy.position.y=h+.076;dummy.rotation.set(0,r(),.23);dummy.scale.setScalar(.35);dummy.updateMatrix();stems.setMatrixAt(i,dummy.matrix);
    }
    for(const o of [petal,stems]){o.instanceMatrix.needsUpdate=true;o.computeBoundingSphere();}
  }
  // A small separable highlight blur feeds a linear-light full-frame composite.
  function finishPass(){
    const hdr=renderer.extensions.has('EXT_color_buffer_float')?T.HalfFloatType:T.UnsignedByteType;
    const full=new T.WebGLRenderTarget(1,1,{type:hdr,depthBuffer:true,samples:Math.min(2,renderer.capabilities.maxSamples)});
    const a=new T.WebGLRenderTarget(1,1,{type:hdr,depthBuffer:false}),b=a.clone();
    const ortho=new T.OrthographicCamera(-1,1,1,-1,0,1),layer=new T.Scene();
    const vertex='varying vec2 uv0;void main(){uv0=uv;gl_Position=vec4(position.xy,0.,1.);}';
    function make(uniforms,fragment){return new T.ShaderMaterial({uniforms,vertexShader:vertex,fragmentShader:'varying vec2 uv0;\n'+fragment,depthTest:false,depthWrite:false});}
    const hi=make({source:{value:full.texture},pixel:{value:new T.Vector2()}},`
      uniform sampler2D source;uniform vec2 pixel;void main(){
        vec3 c=(texture2D(source,uv0+pixel).rgb+texture2D(source,uv0-pixel).rgb+
        texture2D(source,uv0+vec2(pixel.x,-pixel.y)).rgb+texture2D(source,uv0+vec2(-pixel.x,pixel.y)).rgb)*.25;
        gl_FragColor=vec4(c*smoothstep(1.12,2.35,max(c.r,max(c.g,c.b))),1.);
      }`);
    const blur=make({source:{value:a.texture},axis:{value:new T.Vector2()}},`
      uniform sampler2D source;uniform vec2 axis;void main(){
        vec3 c=texture2D(source,uv0).rgb*.22703;
        c+=(texture2D(source,uv0+axis*1.3846).rgb+texture2D(source,uv0-axis*1.3846).rgb)*.316216;
        c+=(texture2D(source,uv0+axis*3.2307).rgb+texture2D(source,uv0-axis*3.2307).rgb)*.07027;
        gl_FragColor=vec4(c,1.);
      }`);
    const end=make({source:{value:full.texture},bloom:{value:a.texture}},`
      uniform sampler2D source,bloom;void main(){
        vec3 c=texture2D(source,uv0).rgb+.074*texture2D(bloom,uv0).rgb;
        vec2 q=uv0*2.-1.;c*=1.-.081*smoothstep(.31,1.63,dot(q,q));
        gl_FragColor=vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        float grain=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))))-.5;
        gl_FragColor.rgb+=grain/255.;
      }`);
    const quad=new T.Mesh(new T.PlaneGeometry(2,2),hi);quad.frustumCulled=false;layer.add(quad);
    function pass(material,target){quad.material=material;renderer.setRenderTarget(target);renderer.render(layer,ortho);}
    return {resize(w,h){full.setSize(w,h);a.setSize(Math.max(1,w>>2),Math.max(1,h>>2));b.setSize(a.width,a.height);
      hi.uniforms.pixel.value.set(1.3/w,1.3/h);},
      draw(){renderer.setRenderTarget(full);renderer.render(scene,camera);pass(hi,a);blur.uniforms.source.value=a.texture;
        blur.uniforms.axis.value.set(1.38/a.width,0);pass(blur,b);blur.uniforms.source.value=b.texture;blur.uniforms.axis.value.set(0,1.38/b.height);
        pass(blur,a);pass(end,null);}};
  }
  const post=finishPass(),pips=$('pips'),icons=[];
  for(let i=0;i<20;i++){const pip=document.createElement('i');pips.append(pip);icons.push(pip);}
  let lastCount=-1,paused=false,muted=false,lastTime=0,activePointer=null,mode='',originX=0,originY=0,frameNumber=0;
  const sound=(function(){
    let ctx,master,wind,filter,tone;
    function awaken(){
      if(!ctx){
        const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
        ctx=new C();master=ctx.createGain();master.gain.value=0;master.connect(ctx.destination);
        const n=ctx.sampleRate*3,buffer=ctx.createBuffer(1,n,ctx.sampleRate),d=buffer.getChannelData(0),r=F.random(8353);
        let prev=0;for(let i=0;i<n;i++){prev=(prev+.045*(r()*2-1))/1.04;d[i]=prev*3.3;}
        wind=ctx.createBufferSource();wind.buffer=buffer;wind.loop=true;filter=ctx.createBiquadFilter();
        filter.type='lowpass';filter.Q.value=.46;filter.frequency.value=420;wind.connect(filter);
        const g=ctx.createGain();g.gain.value=.16;filter.connect(g);g.connect(master);wind.start();
        tone=ctx.createOscillator();tone.type='sine';tone.frequency.value=196;
        const airy=ctx.createGain();airy.gain.value=.0035;tone.connect(airy);airy.connect(master);tone.start();
      }
      if(ctx.state==='suspended')ctx.resume().catch(()=>{});volume();
    }
    function volume(){if(ctx)master.gain.setTargetAtTime(muted||paused||document.hidden?0:.47,ctx.currentTime,.13);}
    function note(f,start,duration,amp){
      if(!ctx||muted)return;const t=ctx.currentTime+start;
      for(const [mult,level] of [[1,1],[2,.19],[3,.063]]){
        const osc=ctx.createOscillator(),gain=ctx.createGain();osc.frequency.value=f*mult;osc.type='sine';
        gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(amp*level,t+.065);
        gain.gain.exponentialRampToValueAtTime(.0001,t+duration);osc.connect(gain);gain.connect(master);osc.start(t);osc.stop(t+duration+.04);
        osc.onended=()=>{osc.disconnect();gain.disconnect();};
      }
    }
    function visit(count){const notes=[392,440,523.25,587.33,659.25];
      note(notes[(count-1)%5],0,1.15,.105);note(notes[(count+1)%5]*.5,.19,1.8,.064);
      if(count===20){[392,493.88,587.33,783.99].forEach((v,i)=>note(v,.4+i*.32,2.4,.1));}}
    function update(st){if(ctx){filter.frequency.setTargetAtTime(360+st.plane.speed*17+st.plane.updraft*67+Math.abs(st.plane.roll)*210,ctx.currentTime,.25);
      tone.frequency.setTargetAtTime(174+st.plane.speed*2.2+st.air.wind*1.9,ctx.currentTime,.4);}}
    return {awaken,volume,visit,update};
  })();
  const tmp=new T.Vector3(),targetPos=new T.Vector3(),planeScreen=new T.Vector3(),targetScreen=new T.Vector3(),aimDir=new T.Vector3();
  function posScreen(v,out){out.copy(v).project(camera);out.set((out.x*.5+.5)*innerWidth,(-out.y*.5+.5)*innerHeight,out.z);return out;}
  function draw(st){
    const p=st.plane,aspect=camera.aspect,back=Math.max(15.7,16.25/aspect),landing=st.phase==='landing'||st.phase==='meadow';
    const landBlend=landing?Math.min(1,st.phase==='meadow'?1:st.phaseAge/14):0;
    const distance=back*(1-landBlend*.15),viewHeading=p.heading*.48;
    const lateral=F.clamp((aspect-.46)/.97,0,1);
    const offX=distance*F.mix(.037,.166,lateral),offZ=distance;
    camera.position.set(p.x+offX*Math.cos(viewHeading)-offZ*Math.sin(viewHeading),
      p.y+distance*(.294+landBlend*.045),-p.s+offZ*Math.cos(viewHeading)+offX*Math.sin(viewHeading));
    aimDir.set(Math.sin(viewHeading)-F.mix(.034,.072,lateral), -.145+p.pitch*.22+landBlend*.063,-Math.cos(viewHeading)).normalize();
    camera.up.set(Math.sin(p.roll*.065),1,0);camera.lookAt(tmp.copy(camera.position).add(aimDir));camera.updateMatrixWorld();
    plane.root.position.set(p.x,p.y,-p.s);plane.root.rotation.order='YXZ';plane.root.rotation.set(p.pitch,-p.heading,p.roll);
    plane.flaps[0].rotation.x=p.aileron;plane.flaps[1].rotation.x=-p.aileron;plane.rudder.rotation.y=p.rudder;
    sun.target.position.set(p.x,Math.max(9,p.y-18),-p.s-16);
    sun.position.copy(sun.target.position).addScaledVector(Valley.sunDirection(tmp,st.light.elevation),126);
    sun.intensity=2.48+st.light.gold*.32;
    valley(st,camera);
    for(let i=0;i<balloons.length;i++){
      const b=st.balloons[i],o=balloons[i];o.root.visible=b.s>p.s-90 && b.s<p.s+1180;
      o.fabric.geometry=b.s-p.s>160?o.farCloth:o.nearCloth;
      o.root.position.set(b.x,b.y+b.heave,-b.s);o.root.rotation.z=b.sway;o.root.scale.setScalar(b.scale);
      o.suspension.rotation.z=b.basketTilt-b.sway;o.flame.scale.set(.22+b.heat*.1,.39+b.glow*.75,.22+b.heat*.1);
      o.hot.emissiveIntensity=.21+Math.max(0,b.glow)*2.15;o.burnerLight.value=b.glow;
    }
    let i=0;
    for(const d of st.seeds){dummy.position.set(d.x,d.y,-d.s);dummy.scale.set(d.size,d.size*.63,d.size*.78);
      dummy.rotation.set(d.vy,d.vx,d.vs);dummy.updateMatrix();dust.setMatrixAt(i++,dummy.matrix);}
    dust.instanceMatrix.needsUpdate=true;i=0;
    for(let n=0;n<st.thermals.length;n++){
      const c=st.thermals[n],s=c.centerS??c.s,x=c.centerX??Math.min(c.x,F.lakeAxis(s)-F.lakeWidth(s)-9),ground=F.terrain(x,s),patch=patches[n];
      if(s!==patch.lastS){
        const attr=patch.o.geometry.attributes.position;
        for(let k=0;k<attr.count;k++){
          const tx=x+patch.coordinates[k*3]*c.radius*.78,ts=s-patch.coordinates[k*3+2]*c.radius*.62;
          attr.setXYZ(k,tx,F.terrain(tx,ts)+.135,-ts);
        }
        attr.needsUpdate=true;patch.o.geometry.computeVertexNormals();patch.o.geometry.computeBoundingSphere();patch.lastS=s;
      }
      for(const d of c.tracers){dummy.position.set(x+d.dx,ground+d.height,-s+d.dz);dummy.scale.set(.035,.063+.014*d.vy,.035);
        dummy.rotation.set(0,0,d.dz*.035);dummy.updateMatrix();plumes.setMatrixAt(i++,dummy.matrix);}
    }
    plumes.instanceMatrix.needsUpdate=true;
    const b=st.balloons[st.active];
    trails.visible=!!b && b.s>p.s+4;
    if(b){
      targetPos.set(b.x,b.y+b.heave+6*b.scale,-b.s);
      const ax=b.x-p.x,az=b.s-p.s,ay=b.y+b.heave+1.4-p.y;
      for(let j=0;j<7;j++){
        const u=(j+.4+((st.air.gust*1.24)%1))/7.8,e=.19+.8*u;
        dummy.position.set(p.x+ax*e+Math.sin(Math.PI*e)*1.1,p.y+ay*e+.6*Math.sin(Math.PI*e),-p.s-az*e);
        const size=.025+.068*Math.sin(u*Math.PI);dummy.scale.set(size,size,size);dummy.updateMatrix();trails.setMatrixAt(j,dummy.matrix);
      }trails.instanceMatrix.needsUpdate=true;
    }
    family.group.visible=flowers.visible=!!st.landing;
    if(st.landing){
      const l=st.landing,fx=l.x+4.8,fs=l.finish+18.5;
      family.group.position.set(fx,F.terrain(fx,fs),-fs);
      family.arms.forEach((arm,j)=>arm.rotation.z=st.family.arms[j].angle);
      if(l!==lastLanding){placeFlowers(l);lastLanding=l;}
    }
    posScreen(plane.root.position,planeScreen);if(b)posScreen(targetPos,targetScreen);
    const input=st.input,guide=st.guide;
    let kx=input.held?input.x:0,ky=input.held?input.y:0;
    if(input.follow&&b){kx=F.clamp((b.x-p.x)/12,-1,1);ky=F.clamp((b.y-p.y)/12,-1,1);}
    $('knob').style.transform='translate(calc(-50% + '+(kx*17)+'px),calc(-50% - '+(ky*17)+'px))';
    if(st.count!==lastCount){
      if(lastCount>=0 && st.count>lastCount)sound.visit(st.count);lastCount=st.count;
      icons.forEach((el,j)=>el.className=j<st.count?'passed':j===st.count?'next':'');
      pips.parentNode.setAttribute('aria-valuenow',st.count);
    }
    document.body.classList.toggle('arriving',st.phase!=='flight');
    const hand=$('hand'),fraction=F.clamp((guide.stroke-.15)/.62,0,1),ease=fraction*fraction*(3-2*fraction);
    // The hand demonstrates a drag from the actual airframe towards the lit basket.
    const tx=b?F.clamp(targetScreen.x,30,innerWidth-40):planeScreen.x,ty=b?F.clamp(targetScreen.y,65,innerHeight*.64):planeScreen.y;
    hand.style.transform='translate('+(F.mix(planeScreen.x,tx,ease)-10)+'px,'+(F.mix(planeScreen.y,ty,ease)-2)+'px) rotate(-13deg)';
    hand.style.opacity=String(b?guide.amount*.83*Math.min(1,guide.stroke*9,(1-guide.stroke)*9):0);
    $('veil').style.opacity=String(st.phase==='meadow'?F.clamp((st.phaseAge-6.6)/1.4,0,1):st.cycle?Math.max(0,1-st.elapsed/.85):0);
    renderer.shadowMap.autoUpdate=(frameNumber++%2===0);sound.update(st);post.draw();
  }
  function resize(){
    const w=innerWidth,h=innerHeight,dpr=Math.min(devicePixelRatio||1,1.65,Math.sqrt(1850000/(w*h)));
    renderer.setPixelRatio(dpr);renderer.setSize(w,h,false);post.resize(Math.floor(w*dpr),Math.floor(h*dpr));
    camera.aspect=w/h;camera.updateProjectionMatrix();
  }
  const ray=new T.Raycaster(),mouse=new T.Vector2(),pad=$('steer');
  function steerAt(e){
    if(mode==='target'){game.touch(0,0,true);return;}
    const radius=mode==='pad'?pad.clientWidth*.41:Math.min(innerWidth*.31,innerHeight*.24);
    if(mode==='plane' && Math.hypot(e.clientX-targetScreen.x,e.clientY-targetScreen.y)<32 && game.getState().active>=0){
      game.touch(0,0,true);return;
    }
    game.touch((e.clientX-originX)/radius,(originY-e.clientY)/radius);
  }
  function down(e){
    if(paused || activePointer!==null || game.getState().phase!=='flight' || e.button>0)return;
    const s=game.getState();let x=e.clientX,y=e.clientY;
    if(e.currentTarget===pad){mode='pad';const r=pad.getBoundingClientRect();originX=r.left+r.width/2;originY=r.top+r.height/2;}
    else{
      mouse.set(x/innerWidth*2-1,1-y/innerHeight*2);ray.setFromCamera(mouse,camera);
      const b=balloons[s.active],bodyHit=ray.intersectObject(plane.root,true).length>0;
      const targetHit=b&&ray.intersectObject(b.root,true).length>0;
      if(targetHit){mode='target';originX=x;originY=y;}
      else if(bodyHit || Math.hypot(x-planeScreen.x,y-planeScreen.y)<28){mode='plane';originX=planeScreen.x;originY=planeScreen.y;}
      else if(b && targetScreen.z<1 && Math.hypot(x-targetScreen.x,y-targetScreen.y)<24){mode='target';originX=x;originY=y;}
      else return;
    }
    e.preventDefault();sound.awaken();activePointer=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);steerAt(e);
  }
  function move(e){
    if(e.pointerId!==activePointer)return;
    if(mode==='target'&&Math.hypot(e.clientX-originX,e.clientY-originY)>15){mode='plane';originX=planeScreen.x;originY=planeScreen.y;}
    steerAt(e);
  }
  function release(e){if(e && e.pointerId!==activePointer)return;activePointer=null;mode='';game.release();}
  for(const el of [canvas,pad]) {
    el.addEventListener('pointerdown',down);el.addEventListener('pointermove',move);el.addEventListener('pointerup',release);
    el.addEventListener('pointercancel',release);el.addEventListener('lostpointercapture',release);
  }
  function pause(value){paused=value;release();document.body.classList.toggle('rest',value);sound.volume();lastTime=0;}
  $('pause').onclick=()=>pause(true);$('resume').onclick=()=>{pause(false);sound.awaken();};
  $('sound').onclick=()=>{muted=!muted;document.body.classList.toggle('quiet',muted);$('sound').setAttribute('aria-pressed',String(!muted));sound.awaken();};
  pad.addEventListener('keydown',e=>{const inputs={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,1],ArrowDown:[0,-1]};
    if(inputs[e.key]&&!paused){e.preventDefault();game.touch(...inputs[e.key]);sound.awaken();}});
  pad.addEventListener('keyup',()=>game.release());
  document.addEventListener('visibilitychange',()=>{lastTime=0;release();sound.volume();});
  window.addEventListener('blur',()=>release());window.addEventListener('resize',resize);
  function frame(now){if(!paused&&!document.hidden){if(lastTime)game.step(Math.min((now-lastTime)*.001,.1));draw(game.getState());}
    lastTime=now;requestAnimationFrame(frame);}
  resize();requestAnimationFrame(frame);
})();
