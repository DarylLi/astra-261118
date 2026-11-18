'use strict';
(function(){
  const portrait=innerWidth/innerHeight<.84,model=AlpineFlight.create({portrait}),S=model.state,map=S.map,canvas=document.getElementById('view');
  window.__GAME__={step:model.step,getState:model.getState};
  const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',alpha:false});
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.96;
  const camera=new T.PerspectiveCamera(42,1,.15,260);
  sky(renderer);mountains();field(map);forest(map);const grass=meadow(map),water=river();
  fence(map);const family=cabin(map),sock=windsock(map),heli=helicopter(),crates=map.boxes.map((_,i)=>makeCrate(i)),air=atmosphere(map);
  const postScene=new T.Scene(),postCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const rtType=renderer.extensions.has('EXT_color_buffer_float')?T.HalfFloatType:T.UnsignedByteType;
  const source=new T.WebGLRenderTarget(1,1,{type:rtType,minFilter:T.LinearFilter,magFilter:T.LinearFilter,samples:Math.min(2,renderer.capabilities.maxSamples)}),
    blurA=new T.WebGLRenderTarget(1,1,{type:rtType,depthBuffer:false}),blurB=blurA.clone();
  const vertexShader='varying vec2 coord; void main(){coord=uv;gl_Position=vec4(position.xy,0.,1.);}';
  const blur=new T.ShaderMaterial({uniforms:{picture:{value:source.texture},axis:{value:new T.Vector2()},extract:{value:1}},vertexShader,fragmentShader:`
    uniform sampler2D picture;uniform vec2 axis;uniform float extract;varying vec2 coord;
    vec3 tap(vec2 uv){vec3 c=texture2D(picture,uv).rgb;float y=dot(c,vec3(.21,.72,.07));return c*mix(1.,smoothstep(1.04,2.4,y),extract);}
    void main(){vec3 c=tap(coord)*.24;for(int i=1;i<=3;i++){float n=float(i),w=(4.-n)*.063333;c+=(tap(coord+axis*n)+tap(coord-axis*n))*w;}gl_FragColor=vec4(c,1.);}`});
  const finish=new T.ShaderMaterial({uniforms:{picture:{value:source.texture},glow:{value:blurB.texture}},vertexShader,fragmentShader:`
    varying vec2 coord;uniform sampler2D picture;uniform sampler2D glow;
    void main(){vec3 col=texture2D(picture,coord).rgb+texture2D(glow,coord).rgb*.052;
      vec2 edge=coord*2.-1.;col*=1.-.078*pow(dot(edge,edge)*.5,1.35);gl_FragColor=vec4(col,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      float grain=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))))-.5;
      gl_FragColor.rgb+=grain*.006;
    }`});
  const quad=new T.Mesh(new T.PlaneGeometry(2,2),blur);quad.frustumCulled=false;postScene.add(quad);
  let width=0,height=0,dpr=1;
  function resize(){
    width=canvas.clientWidth;height=canvas.clientHeight;dpr=Math.min(devicePixelRatio||1,1.55,1500/Math.max(width,height));renderer.setPixelRatio(dpr);renderer.setSize(width,height,false);
    source.setSize(Math.round(width*dpr),Math.round(height*dpr));blurA.setSize(Math.max(2,Math.round(width*dpr/4)),Math.max(2,Math.round(height*dpr/4)));blurB.setSize(blurA.width,blurA.height);
    camera.aspect=width/height;const narrow=camera.aspect<.84;
    const distance=narrow?Math.max(30.8,30.8*(.462/camera.aspect)):27.4;
    // Keep the entire playable area in frame even when rotating mid-delivery.
    const extra=narrow&&!portrait?12:0;
    camera.position.set(narrow?-1.16:0,narrow?13.5+extra*.13:12.4,distance+extra);
    camera.lookAt(narrow?-.50:0,6.85,-4);camera.updateProjectionMatrix();camera.updateMatrixWorld();
  }
  resize();window.addEventListener('resize',resize);
  function post(){
    renderer.setRenderTarget(source);renderer.render(scene,camera);
    quad.material=blur;blur.uniforms.picture.value=source.texture;blur.uniforms.extract.value=1;blur.uniforms.axis.value.set(1.3/blurA.width,0);
    renderer.setRenderTarget(blurA);renderer.render(postScene,postCamera);
    blur.uniforms.picture.value=blurA.texture;blur.uniforms.extract.value=0;blur.uniforms.axis.value.set(0,1.3/blurA.height);
    renderer.setRenderTarget(blurB);renderer.render(postScene,postCamera);
    quad.material=finish;renderer.setRenderTarget(null);renderer.render(postScene,postCamera);
  }
  function paper(canvas,scale){const c=canvas.getContext('2d');c.setTransform(scale,0,0,scale,0,0);c.lineJoin='round';c.lineCap='round';return c;}
  function polygon(c,p,fill,stroke){c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}}
  function stroke(c,points,color,w){c.beginPath();c.strokeStyle=color;c.lineWidth=w;points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
  const manifest=document.querySelector('#manifest canvas'),ledger=paper(manifest,3);
  function progress(){const c=ledger;c.clearRect(0,0,153,44);
    c.save();c.translate(20,22);c.beginPath();c.arc(0,0,16.7,0,tau);c.fillStyle='#4f695c';c.fill();
    c.beginPath();c.arc(0,0,14.1,0,tau);c.lineWidth=.7;c.strokeStyle='#b4bba0';c.stroke();
    for(let i=0;i<7;i++){c.save();c.rotate(tau*i/7);c.fillStyle='#f8ecd0';c.beginPath();c.ellipse(0,-5,2.2,4.1,.12,0,tau);c.fill();c.restore();}
    c.fillStyle='#d3a153';c.beginPath();c.arc(0,0,3.1,0,tau);c.fill();c.restore();
    stroke(c,[[43,10],[43,34]],'#cecbb3',1);
    for(let i=0;i<3;i++){const complete=i<S.delivered,active=i===S.delivered;
      c.save();c.translate(63+i*34,21);c.lineWidth=1.05;
      const outline=complete?'#51735c':active?'#9c713f':'#a8a58b';
      polygon(c,[[-10,-5],[0,-10],[10,-5],[0,.6]],complete?'#a5b894':active?'#f2ce87':'#dedcc2',outline);
      polygon(c,[[-10,-5],[0,.6],[0,11],[-10,5]],complete?'#91a47e':active?'#cea467':'#ceceb3',outline);
      polygon(c,[[0,.6],[10,-5],[10,5],[0,11]],complete?'#6f906f':active?'#c09057':'#bdc2a8',outline);
      stroke(c,[[-5,-7.3],[5,-2.5],[5,1.3]],complete?'#dae4c6':active?'#ffebba':'#edecd6',2.4);
      if(complete)stroke(c,[[-6,1],[-4,4],[.4,-1]],'#fff9dc',1.9);
      c.restore();}
  }
  progress();
  const button=document.getElementById('sound'),speaker=paper(button.firstElementChild,3);let enabled=true,ctx,master,motor,motorGain,windGain,windFilter;
  function soundIcon(){const c=speaker;c.clearRect(0,0,28,28);polygon(c,[[3,11],[8,11],[14,6],[14,22],[8,17],[3,17]],'#52685a');
    if(enabled){for(const r of [4.5,8.2]){c.beginPath();c.arc(13.5,14,r,-.87,.87);c.strokeStyle='#52685a';c.lineWidth=2.1;c.stroke();}}
    else{stroke(c,[[18,11],[24,17]],'#52685a',2);stroke(c,[[24,11],[18,17]],'#52685a',2);}button.setAttribute('aria-pressed',String(enabled));}
  soundIcon();
  function audioStart(){
    if(!ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;ctx=new AC();master=ctx.createGain();master.gain.value=enabled?.22:0;master.connect(ctx.destination);
      motor=ctx.createOscillator();motor.type='triangle';motor.frequency.value=38;motorGain=ctx.createGain();motorGain.gain.value=.043;motor.connect(motorGain);motorGain.connect(master);motor.start();
      const buf=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate),a=buf.getChannelData(0);let memory=0;const rand=AlpineFlight.random(82);for(let i=0;i<a.length;i++){memory=(memory+.11*(rand()*2-1))*.975;a[i]=memory;}
      const breeze=ctx.createBufferSource();breeze.buffer=buf;breeze.loop=true;windFilter=ctx.createBiquadFilter();windFilter.type='lowpass';windFilter.frequency.value=700;windGain=ctx.createGain();windGain.gain.value=.17;breeze.connect(windFilter);windFilter.connect(windGain);windGain.connect(master);breeze.start();
    }
    if(ctx.state==='suspended')ctx.resume().catch(()=>{});
  }
  function note(hz,offset,duration,amp=.17){
    if(!ctx||!enabled)return;const start=ctx.currentTime+offset;
    for(const [factor,intensity] of [[1,1],[2.73,.20],[4.12,.060]]){
      const osc=ctx.createOscillator(),gain=ctx.createGain();osc.frequency.value=hz*factor;gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(amp*intensity,start+.018);gain.gain.exponentialRampToValueAtTime(.0001,start+duration/factor**.32);
      osc.connect(gain);gain.connect(master);osc.start(start);osc.stop(start+duration+.02);osc.onended=()=>{osc.disconnect();gain.disconnect();};
    }
  }
  button.addEventListener('click',()=>{enabled=!enabled;audioStart();if(ctx)master.gain.setTargetAtTime(enabled?.22:0,ctx.currentTime,.06);soundIcon();if(enabled)note(880,0,.45,.09);});
  function soundState(){if(!ctx)return;motor.frequency.setTargetAtTime(29+S.rotor.speed*.61,ctx.currentTime,.12);motorGain.gain.setTargetAtTime(.032+Math.abs(S.h.vy)*.006,ctx.currentTime,.12);windFilter.frequency.setTargetAtTime(630+S.breeze[8].u*380,ctx.currentTime,.18);}
  const finger=document.getElementById('finger'),f=paper(finger,3);
  f.fillStyle='#fff5d7';f.strokeStyle='#837457';f.lineWidth=1.5;
  f.beginPath();f.moveTo(14,33);f.lineTo(5,12);f.bezierCurveTo(2,4,11,2,14,8);f.lineTo(22,24);
  f.bezierCurveTo(20,18,26,15,30,21);f.bezierCurveTo(30,16,36,17,38,22);f.bezierCurveTo(40,18,44,20,46,25);f.lineTo(51,37);f.bezierCurveTo(54,47,46,53,45,58);f.lineTo(28,64);
  f.bezierCurveTo(25,59,19,56,15,52);f.lineTo(4,41);f.bezierCurveTo(-1,35,4,30,9,34);f.lineTo(17,41);f.closePath();f.fill();f.stroke();
  f.fillStyle='#d8a254';f.beginPath();f.moveTo(26,59);f.lineTo(46,52);f.lineTo(49,58);f.lineTo(29,66);f.closePath();f.fill();
  function project(x,y,z){const p=V(x,y,z).project(camera);return {x:(p.x+1)*width*.5,y:(1-p.y)*height*.5};}
  const veil=document.getElementById('veil');
  function helper(){const g=S.guide;finger.style.opacity=(g.alpha*.91).toFixed(3);veil.style.opacity=S.cover.toFixed(3);if(g.alpha<.007)return;
    const pick=S.phase==='pickup',crate=S.crates[S.index],pad=map.pads[S.index],a=pick?project(crate.x+.1,crate.y+1.14,crate.z):project(S.h.x+.25,S.h.y+1.4,S.h.z);
    const b=pick?project(crate.x,crate.y+1.28,crate.z):project(pad.x,1.20,pad.z),u=smooth(.10,.84,g.travel);
    const x=mix(a.x,b.x,u)+15*(1-u),y=mix(a.y,b.y,u)+13*(1-u)-Math.sin(u*Math.PI)*(pick?10:29);
    finger.style.transform='translate('+Math.round(x-8)+'px,'+Math.round(y-8)+'px) scale('+(1-g.down*.13)+') rotate(-7deg)';
  }
  // Screen-space picking follows projected 3D targets, with a fingertip-sized allowance.
  function hit(px,py){
    const inOval=(p,rx,ry)=>((px-p.x)/rx)**2+((py-p.y)/ry)**2<=1;
    const pad=map.pads[S.index],c=S.crates[S.index],p=project(c.x,c.y+.66,c.z),p1=project(c.x+.80,c.y+.66,c.z);
    if(S.phase==='pickup'&&inOval(p,Math.max(24,p1.x-p.x),Math.max(25,(p1.x-p.x)*.97)))return 'crate';
    if(S.phase==='carry'){
      const a=project(map.cx,S.map.deck+.72,map.cz+2.80),b=project(map.cx+3.20,S.map.deck,map.cz+3.8),top=project(map.cx,4.6,map.cz);
      if(Math.abs(px-a.x)<Math.max(30,Math.abs(b.x-a.x))&&py>top.y-8&&py<b.y+18)return 'mat';
    }
    const body=project(S.h.x,S.h.y+1.48,S.h.z),end=project(S.h.x+2.0,S.h.y+1.48,S.h.z);
    if(inOval(body,Math.max(38,end.x-body.x),Math.max(24,(end.x-body.x)*.62)))return 'heli';
    return '';
  }
  let pointer=null,startXY=null,initialKind='',planeY=0,anchorDelta=V();
  const ray=new T.Raycaster(),plane=new T.Plane(V(0,1,0),0);
  function onPlane(x,y,h){ray.setFromCamera(new T.Vector2(x/width*2-1,1-y/height*2),camera);plane.constant=-h;return ray.ray.intersectPlane(plane,V());}
  canvas.addEventListener('pointerdown',e=>{
    if(pointer!==null||!e.isPrimary||e.button!==0)return;audioStart();const kind=hit(e.clientX,e.clientY);
    if(!model.press(kind)){S.crates.forEach((c,i)=>{const pos=project(c.x,c.y+.55,c.z);if(Math.hypot(e.clientX-pos.x,e.clientY-pos.y)<27)model.nudge(i);});return;}
    pointer=e.pointerId;initialKind=kind;startXY=[e.clientX,e.clientY];canvas.setPointerCapture(pointer);
    planeY=kind==='heli'?S.h.y+1.35:kind==='mat'?map.deck:.67;
    const point=onPlane(...startXY,planeY);anchorDelta.set(0,0,0);if(point)anchorDelta.set(S.touchX-point.x,0,S.touchZ-point.z);
  });
  canvas.addEventListener('pointermove',e=>{
    if(e.pointerId!==pointer||Math.hypot(e.clientX-startXY[0],e.clientY-startXY[1])<4)return;
    const kind=hit(e.clientX,e.clientY);
    if(kind==='mat'){const p=map.pads[S.index];model.move(p.x,p.z);return;}
    if(kind==='crate'){const c=S.crates[S.index];model.move(c.x,c.z);return;}
    // When dragging the aircraft through the sky, project onto its altitude.
    // Over the ground, the receiver itself takes over the last few metres.
    let p=onPlane(e.clientX,e.clientY,planeY);
    if(initialKind==='heli'&&e.clientY>project(S.h.x,S.h.y-3,S.h.z).y){
      p=onPlane(e.clientX,e.clientY,map.deck);if(p)model.move(p.x,p.z);
    }else if(p)model.move(p.x+anchorDelta.x,p.z+anchorDelta.z);
  });
  function lift(e){if(pointer===null||e&&e.pointerId!==undefined&&e.pointerId!==pointer)return;pointer=null;model.release();}
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(ev,lift);
  window.addEventListener('blur',()=>lift());document.addEventListener('visibilitychange',()=>{if(document.hidden){lift();if(ctx)ctx.suspend().catch(()=>{});}else if(ctx&&enabled)ctx.resume().catch(()=>{});});
  let last=0,oldPhase=S.phase,oldCount=0,oldRing=[0,0,0];
  function frame(now){
    const dt=last?Math.min((now-last)/1000,.075):0;last=now;
    if(!document.hidden){model.step(dt);heli.update(S);crates.forEach((crate,i)=>crate.update(S.crates[i]));family(S);sock(S);grass(S);water(S);air(S);helper();soundState();
      if(oldPhase!==S.phase){
        if(S.phase==='carry')note(660,0,.50,.082);
        if(S.phase==='chime'){note(784,0,1.3);note(988,.20,1.4);note(1175,.49,1.7);}
        if(S.phase==='finale')[784,988,1175,1568].forEach((hz,i)=>note(hz,i*.25,2,.12));oldPhase=S.phase;
      }
      S.crates.forEach((c,i)=>{if(c.ring>oldRing[i]+.1)note([1046,1175,1318][i],0,.9,.075);oldRing[i]=c.ring;});
      if(S.delivered!==oldCount){progress();oldCount=S.delivered;}post();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
