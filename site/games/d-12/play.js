'use strict';
const physics=WashPhysics.make();
const ray=new T.Raycaster(),mouse=new T.Vector2(),dummy=new T.Object3D();
let portrait=false,held=null,lastPhase='foam',frame=0,previous=performance.now(),soundOn=true,audioSys;
let width=1,height=1,current=physics.getState(),layoutMix=0;
const badgeNodes=Array.from(document.querySelectorAll('.badge')),links=Array.from(document.querySelectorAll('.link')),guide=document.getElementById('hand');
const shimmer=new T.MeshPhysicalMaterial({color:0xe1f8ef,roughness:.14,roughnessMap:roughNoise,metalness:.18,clearcoat:1,iridescence:.93,iridescenceIOR:1.31,iridescenceThicknessMinimum:120,iridescenceThicknessMaximum:380,transparent:true,opacity:.45,depthWrite:false,envMapIntensity:1.4});
const froth=mat(0xe5f3e9,.30,.09),aqua=mat(0xb8e3e6,.13,.38,{transparent:true,opacity:.71});
function instances(g,m,count){const a=new T.InstancedMesh(g,m,count);a.instanceMatrix.setUsage(T.DynamicDrawUsage);a.frustumCulled=false;a.count=0;scene.add(a);return a;}
function put(a,x,y,z,sx,sy=sx,sz=sx,rx=0,ry=0,rz=0){
 if(a.count>=a.instanceMatrix.count)return;
 dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(rx,ry,rz);dummy.updateMatrix();a.setMatrixAt(a.count++,dummy.matrix);
}
const bubbleLayer=instances(smallSph,shimmer,32),whitecaps=instances(smallSph,M.white,40);
const foamLayer=instances(smallSph,froth,530),waterLayer=instances(smallSph,aqua,180);
const glintShape=new T.Shape();[[0,.99],[.16,.18],[.75,0],[.14,-.14],[0,-1],[-.14,-.16],[-.76,0],[-.14,.16]].forEach(([x,y],i)=>i?glintShape.lineTo(x,y):glintShape.moveTo(x,y));glintShape.closePath();
const shineLayer=instances(new T.ExtrudeGeometry(glintShape,{depth:.01,bevelEnabled:false}),M.lit,12);
const dustLayer=instances(smallSph,mat(0xf8efd3,.58,.05,{transparent:true,opacity:.38,depthWrite:false}),30);
const particleLayers=[dustLayer,bubbleLayer,whitecaps,foamLayer,waterLayer,shineLayer];
const beads=Array.from({length:460},()=>({u:rng(),v:rng(),size:.026+rng()*.039,at:rng()*.59}));
const exposedMeshes=[false,true].map(truck=>beads.map(b=>WashPhysics.exposed(b.u,b.v,truck)));
const hoseGeo=new T.CylinderGeometry(1,1,1,10),liveHoses=equipment.map(()=>instances(hoseGeo,M.deep,23));
const sceneColor=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,samples:Math.min(4,renderer.capabilities.maxSamples)});
const finishScene=new T.Scene(),flatCam=new T.OrthographicCamera(-1,1,1,-1,0,1);
const finishMat=new T.ShaderMaterial({uniforms:{beauty:{value:sceneColor.texture},px:{value:new T.Vector2()}},vertexShader:'varying vec2 st;void main(){st=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`
uniform sampler2D beauty;uniform vec2 px;varying vec2 st;
vec3 bright(vec2 uv){vec3 c=texture2D(beauty,uv).rgb;return c*max(0.,1.-1.3/max(1.301,dot(c,vec3(.24,.64,.12))));}
void main(){vec3 c=texture2D(beauty,st).rgb;vec3 b=vec3(0.);for(int i=0;i<8;i++){float a=float(i)*2.39996;vec2 d=vec2(cos(a),sin(a))*(2.+float(i)*1.05)*px;b+=bright(st+d);}c+=b*.010;gl_FragColor=vec4(c,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
float grain=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));gl_FragColor.rgb+=(grain-.5)*.008;}
`,depthTest:false,depthWrite:false});
finishScene.add(new T.Mesh(new T.PlaneGeometry(2,2),finishMat));
function resize(){
 width=canvas.clientWidth;height=canvas.clientHeight;const a=width/Math.max(1,height);portrait=a<.82;
 layoutMix=WashPhysics.clamp((1.16-a)/.64);const compact=1-.245*layoutMix;
 renderer.setSize(width,height,false);const dpr=renderer.getPixelRatio();sceneColor.setSize(Math.round(width*dpr),Math.round(height*dpr));finishMat.uniforms.px.value.set(1/width,1/height);
 reflection.setSize(Math.max(64,Math.round(width*.52)),Math.max(64,Math.round(height*.52)));
 architecture.scale.x=compact;
 carriage.scale.x=1-layoutMix*.12;
 for(let j=0;j<2;j++)for(const o of pillars[j])o.position.x=(j?1:-1)*2.28*compact;
 // Both docked tools and the family stay within thumb reach in the narrow framing.
 foamStation.position.set(-2.07+layoutMix*.70,0,1.86-layoutMix*.24);waterStation.position.set(2.69-layoutMix*.99,0,-.63+layoutMix*.91);
 const tips=equipment.map((eq,i)=>{const t=V(.434,.014,0).applyAxisAngle(V(0,0,1),.21);if(i)t.x=-t.x;return t.add(eq.base).add(eq.root.position);});
 physics.setDocks(tips[0],tips[1]);
 const lensScale=Math.max(1,1.13/a*(1-layoutMix*.245));
 camera.aspect=a;look.set(.04,1.48+layoutMix*.04,-.52+layoutMix*.26);
 const d=V(4.15-layoutMix*1.65,2.03+layoutMix*1.55,9.28).multiplyScalar(lensScale);
 camera.position.copy(look).add(d);camera.lookAt(look);camera.updateProjectionMatrix();camera.updateMatrixWorld();
}
window.addEventListener('resize',resize);resize();
function familyPositions(s){
 const anchors=[[3.22,-1.75],[3.64,-1.87],[3.03,-1.29]],mobile=[[1.72,-.73],[2.08,-.85],[1.55,-.43]];
 const starts=anchors.map(([x,z],i)=>V(mixR(x,mobile[i][0],layoutMix),0,mixR(z,mobile[i][1],layoutMix)));
 const positions=[];
 people.forEach((person,i)=>{
  const f=s.family[i],start=starts[i],end=V(1.00,0,-.08-i*.16);
  const t=f.walk,here=start.clone().lerp(end,t);here.z+=Math.sin(t*PI)*.52;
  here.x-=f.seat*.79;here.y+=f.seat*.45;
  person.root.position.copy(here);person.root.rotation.y=.64+t*.72;person.root.visible=f.seat<.98;
  for(let j=0;j<2;j++)person.legs[j].rotation.x=Math.sin(f.gait+j*PI)*Math.min(.45,f.v)*.8;
  person.body.rotation.z=s.umbrellaTilt*(i===2?.45:.18);
  positions.push(here);
 });
 umbrella.position.copy(positions[0]);umbrella.position.x+=.16;umbrella.position.y+=1.68;umbrella.position.z+=.014;
 umbrella.rotation.z=-.095+s.umbrellaTilt-s.family[0].walk*.15;
 const fold=1-s.family[0].seat*.89;umbrella.scale.set(fold,.70+fold*.30,fold);umbrella.visible=s.family[0].seat<.97;
}
// Capture the actual bay once for the paint, glass and metal. Road reflections keep updating as the car moves.
let capturePending=true;
function captureBay(){
 const target=new T.WebGLCubeRenderTarget(128,{type:T.HalfFloatType});
 const probe=new T.CubeCamera(.08,96,target);probe.position.set(0,1.37,.24);
 const old=ground.material;ground.material=mat(0x9cabaa,.35,.27);
 const visible=cars.map(c=>c.p.visible);cars.forEach(c=>c.p.visible=false);
 probe.update(renderer,scene);const pm=new T.PMREMGenerator(renderer);scene.environment=pm.fromCubemap(target.texture).texture;
 pm.dispose();target.dispose();ground.material.dispose();ground.material=old;cars.forEach((c,i)=>c.p.visible=visible[i]);capturePending=false;
}
function reflect(){
 const pos=camera.position;reflectCam.copy(camera);reflectCam.position.set(pos.x,-pos.y+.008,pos.z);reflectCam.lookAt(look.x,-look.y+.008,look.z);reflectCam.updateMatrixWorld();
 reflectionMatrix.multiplyMatrices(reflectCam.projectionMatrix,reflectCam.matrixWorldInverse);
 ground.visible=false;renderer.shadowMap.autoUpdate=false;renderer.setRenderTarget(reflection);renderer.render(scene,reflectCam);ground.visible=true;renderer.shadowMap.autoUpdate=true;
}
function toolView(s){
 const hit=WashPhysics.exposed(s.wand.u,s.wand.v,!!(s.vehicle%2));
 for(let i=0;i<equipment.length;i++){
  const eq=equipment[i],foam=i===0,active=s.phase===eq.type,lift=(active||s.wand.lift>.01&&lastSprayer===eq.type)?s.wand.lift:0;
  const start=eq.root.localToWorld(eq.base.clone()),dest=V(hit.x+(foam?-.62:.64),hit.y+.76,hit.z+.62);
  const dir=V(hit.x,hit.y,hit.z).sub(dest).normalize();dest.addScaledVector(dir,-.43);
  eq.nozzle.position.copy(eq.root.worldToLocal(start.clone().lerp(dest,lift)));eq.nozzle.position.y+=Math.sin(eq.mast.rotation.z)*.25;
  eq.wand.rotation.z=.21;eq.nozzle.rotation.set(0,foam?0:PI,0);
  const orientation=new T.Quaternion().setFromUnitVectors(V(1,0,0),dir);
  orientation.multiply(new T.Quaternion().setFromAxisAngle(V(0,0,1),-.21));
  eq.nozzle.quaternion.slerp(orientation,lift);
  const localTip=V(.434,.014,0).applyAxisAngle(V(0,0,1),.21);
  const dockTip=localTip.clone();if(!foam)dockTip.x=-dockTip.x;
  const wantedTip=start.clone().add(dockTip).lerp(V(hit.x+(foam?-.62:.64),hit.y+.76,hit.z+.62),lift);
  eq.nozzle.position.copy(eq.root.worldToLocal(wantedTip)).sub(localTip.applyQuaternion(eq.nozzle.quaternion));
  eq.mast.rotation.z=s.hoses[i].x;eq.lamp.emissiveIntensity=active?.7+.24*Math.sin(s.bubbles[1].y*4):.07;
  const hose=liveHoses[i];hose.count=0;const end=eq.nozzle.localToWorld(V(-.11,-.24,0)),base=eq.root.localToWorld(V(-.10,.60,.035));
  const mid=base.clone().lerp(end,.5);mid.y=Math.max(.11,Math.min(base.y,end.y)-.47);mid.x-=.11+s.hoses[i].x*.8;mid.z+=.25;
  const spline=new T.QuadraticBezierCurve3(base,mid,end);let old=base;
  for(let k=1;k<=16;k++){const to=spline.getPoint(k/16),d=to.clone().sub(old);dummy.position.copy(old).lerp(to,.5);dummy.quaternion.setFromUnitVectors(V(0,1,0),d.clone().normalize());dummy.scale.set(.034,d.length()+.007,.034);dummy.updateMatrix();hose.setMatrixAt(hose.count++,dummy.matrix);old=to;}
  hose.instanceMatrix.needsUpdate=true;
 }
}
let lastSprayer='foam';
function renderState(s){
 const car=cars[s.vehicle%2],truck=car.truck;cars[0].p.visible=!truck;cars[1].p.visible=truck;
 car.p.position.z=s.carZ;car.p.position.y=.007*Math.min(1,s.carV)*Math.sin(s.wheelAngle*2.13);car.p.rotation.x=s.carV*.004;
 for(const w of car.wheels)w.rotation.x=s.wheelAngle;
 car.hinge.rotation.y=-s.door*1.14;car.leaf.visible=true;
 s.cells.forEach((p,i)=>{fieldData[4*i]=Math.round(p.mud*255);fieldData[4*i+1]=Math.min(255,Math.round(p.foam*127.5));fieldData[4*i+2]=Math.min(255,Math.round(p.water*255));fieldData[4*i+3]=255;});field.needsUpdate=true;
 brushPilot.emissiveIntensity=s.phase==='brush'?.83+.25*Math.sin(s.rings[2].angle):.025;
 carriage.position.z=s.track;
 const dz=s.track/(truck?1.18:1),cabHeight=Math.exp(-Math.pow((dz+(truck?-.39:.39))/(truck?.80:1.05),4));
 const engage=WashPhysics.clamp((s.spin-.23)/7);
 drum.position.y=2.37+engage*((1.57+.64*cabHeight)*(truck?1.15:1)-2.37);
 for(let i=0;i<ringMeshes.length;i++){
  const r=s.rings[i];ringMeshes[i].rotation.x=r.angle;ringMeshes[i].scale.y=1-r.deflection*.13;ringMeshes[i].position.y=.016*Math.sin(r.angle+i)*r.deflection;
 }
 for(let j=0;j<2;j++)for(let i=0;i<13;i++){
  const o=pillars[j][i],r=s.rings[(i+(j?2:0))%15],sign=j?1:-1;
  o.rotation.x=.012*r.deflection;o.rotation.y=sign*r.angle;o.position.x=sign*mixR(2.28*(1-.245*layoutMix),truck?1.51:1.38,engage);
  o.position.z=mixR(-1.62,s.track,engage);
 }
 for(const f of fans)f.rotation.z=s.fanAngle;
 if(s.press&&s.phase!=='brush')lastSprayer=s.phase;
 toolView(s);familyPositions(s);
 for(const a of particleLayers)a.count=0;
 for(const m of s.motes)put(dustLayer,m.x,m.y,m.z,m.r);
 for(const b of s.bubbles){
  const station=s.phase==='rinse'?waterStation:foamStation,show=s.phase==='foam'?1:.39;
  const k=Math.min(1,b.y/.12,(1.28-b.y)/.18),size=b.r*show*k;
  const x=station.position.x+b.x+.17,y=1.37+b.y,z=station.position.z+b.z+.02;
  put(bubbleLayer,x,y,z,size);put(whitecaps,x-size*.27,y+size*.51,z+size*.76,size*.23,size*.13,size*.1);
 }
 for(let i=0;i<beads.length;i++){
  const b=beads[i],j=Math.round(b.u*(WashPhysics.W-1))+WashPhysics.W*Math.round(b.v*(WashPhysics.H-1)),c=s.cells[j];
  if(i%3===0&&c.water>.075&&c.foam<.05&&c.mud<.69){
   const p=exposedMeshes[s.vehicle%2][i],r=.006+Math.min(.018,c.water*.035);
   put(waterLayer,p.x*1.002,p.y+.006,p.z+s.carZ,r,r*.65,r);
  }
  if(c.foam<=b.at+.018)continue;
  const p=exposedMeshes[s.vehicle%2][i],a=WashPhysics.clamp((c.foam-b.at)*3),size=b.size*a;
  const side=Math.abs(p.x)>.90;put(foamLayer,p.x+(side?Math.sign(p.x)*.016:0),p.y+.014,p.z+s.carZ,size,side?size*(1+c.run*2):size*.67,size);
 }
 for(const d of s.flecks){if(d.foam)put(foamLayer,d.x,d.y,d.z,d.r);else put(waterLayer,d.x,d.y,d.z,d.r,d.r*3.1,d.r,Math.atan2(d.vz,d.vy),0,-Math.atan2(d.vx,Math.abs(d.vy)+.1));}
 s.drops.forEach((d,i)=>{
  const x=d.x*(1-.245*layoutMix);if(d.wait<=0)put(waterLayer,x,d.y,d.z,.016,.026+Math.abs(d.vy)*.0025,.016);
  groundUniforms.stirs.value[i].set(x,d.z,d.ring,0);
 });
 for(const g of s.glints){const p=WashPhysics.exposed(g.u,g.v,truck),r=.123*Math.sin(PI*g.life/.62);put(shineLayer,p.x,p.y+.046,p.z+.055,r,r,r,-.09,.39,.19);}
 groundUniforms.carContactZ.value=s.carZ;groundUniforms.floorWet.value=s.floorWet;for(const a of particleLayers)a.instanceMatrix.needsUpdate=true;
 if(s.phase!==lastPhase){if(audioSys&&soundOn)audioSys.chime(s.phase);lastPhase=s.phase;}
 const active=['foam','brush','rinse'].indexOf(s.phase);
 badgeNodes.forEach((b,i)=>{b.classList.toggle('active',i===active);b.classList.toggle('done',active<0||i<active);});links.forEach((b,i)=>b.classList.toggle('on',active<0||i<active));
 guidance(s);if(audioSys)audioSys.update(s);
}
function project(v){const p=v.clone().project(camera);return {x:(p.x*.5+.5)*width,y:(.5-p.y*.5)*height};}
function guidance(s){
 const stage=s.phase;
 if(s.sinceTouch<4||!['foam','brush','rinse'].includes(stage)||s.armed&&stage==='brush'){guide.style.opacity=0;return;}
 const u=(s.sinceTouch-4)%3.35,alpha=WashPhysics.clamp(u/.32)*WashPhysics.clamp((3.20-u)/.36);
 let from=stage==='brush'?ringMeshes[10].getWorldPosition(V()):equipment[stage==='foam'?0:1].nozzle.getWorldPosition(V());
 const to=stage==='brush'?from.clone().add(V(.25,0,.31)):V(.0,1.36,1.15);
 const move=WashPhysics.clamp((u-.74)/1.55);from.lerp(to,move*move*(3-2*move));const screen=project(from);
 const size=u<.5?1-.12*Math.sin(u*PI/.5):.94;
 guide.style.opacity=String(.86*alpha);guide.style.transform='translate('+Math.round(screen.x-5)+'px,'+Math.round(screen.y-3)+'px) rotate(-13deg) scale('+size+')';
}
function cast(e){const r=canvas.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(mouse,camera);}
function pickTool(e){
 cast(e);const hits=[];
 for(const k of ['foam','brush','rinse']){const hit=ray.intersectObjects(toolTargets[k],true)[0];if(hit)hits.push({key:k,d:hit.distance});}
 if(hits.length){
  hits.sort((a,b)=>a.d-b.d);
  if(e.type==='pointerdown'){
   const obstacle=ray.intersectObjects([architecture,cars[current.vehicle%2].p,umbrella,...people.map(p=>p.root)],true)[0];
   if(obstacle&&obstacle.distance+.018<hits[0].d)return null;
  }
  return hits[0].key;
 }
 // Small near misses still catch the grip. All other pavement remains inert.
 for(let i=0;i<2;i++){const at=project(equipment[i].nozzle.getWorldPosition(V()));if(Math.hypot(at.x-e.clientX,at.y-e.clientY)<Math.max(24,width*.019))return equipment[i].type;}
 return null;
}
function aimAt(e){
 cast(e);
 const car=cars[current.vehicle%2],hit=ray.intersectObject(car.p,true)[0];if(!hit)return;
 const p=car.p.worldToLocal(hit.point.clone());let best=Infinity,idx=null;
 for(const c of current.cells){const q=WashPhysics.exposed(c.u,c.v,car.truck),d=(q.x-p.x)**2+(q.z-p.z)**2+.35*(q.y-p.y)**2;if(d<best){best=d;idx=c;}}
 if(idx)physics.move(idx.u,idx.v);
}
function unlock(){
 if(!audioSys){
 const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;
 const ctx=new Context(),main=ctx.createGain();main.gain.value=soundOn?.47:0;main.connect(ctx.destination);
 const noise=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),ch=noise.getChannelData(0);let prev=0;
 for(let i=0;i<ch.length;i++){prev=(prev+.17*(Math.random()*2-1))/.99;prev=Math.max(-1,Math.min(1,prev));ch[i]=.3*prev+.7*(Math.random()*2-1);}
 const src=ctx.createBufferSource();src.buffer=noise;src.loop=true;const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=700;
 const wash=ctx.createGain();wash.gain.value=.0001;src.connect(filter).connect(wash).connect(main);src.start();
 const motor=ctx.createOscillator(),hum=ctx.createGain();motor.type='sine';motor.frequency.value=72;hum.gain.value=.0001;motor.connect(hum).connect(main);motor.start();
 function bell(f,at,g=.09,len=.50){const o=ctx.createOscillator(),v=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(f*1.008,at);o.frequency.exponentialRampToValueAtTime(f,at+.10);v.gain.setValueAtTime(.0001,at);v.gain.exponentialRampToValueAtTime(g,at+.014);v.gain.exponentialRampToValueAtTime(.0001,at+len);o.connect(v).connect(main);o.start(at);o.stop(at+len+.02);}
 let nextPop=0,lastHits=0;
 audioSys={ctx,mute(){main.gain.setTargetAtTime(soundOn?.47:0,ctx.currentTime,.06);},chime(phase){const seq=phase==='dry'||phase==='board'?[523.25,659.25,783.99,1046.50]:[523.25,698.46];seq.forEach((f,i)=>bell(f,ctx.currentTime+i*.12,.095,.72));},update(s){
 const now=ctx.currentTime,spray=s.press&&(s.phase==='foam'||s.phase==='rinse');
 wash.gain.setTargetAtTime(spray?(s.phase==='foam'?.075:.135):.004+s.fan*.095,now,.09);
 filter.frequency.setTargetAtTime(s.phase==='rinse'?3300:670+s.wind*450,now,.13);
 hum.gain.setTargetAtTime(s.spin*.006+s.carV*.009+.001,now,.14);motor.frequency.setTargetAtTime(49+s.spin*7.2+s.carV*12,now,.16);
 if(spray&&s.phase==='foam'&&now>nextPop){bell(520+Math.random()*660,now,.028,.075);nextPop=now+.09+Math.random()*.22;}
 const hits=s.drops.reduce((a,b)=>a+b.impact,0);if(hits>lastHits)bell(1030+s.wind*600,now,.010,.085);lastHits=hits;
 }};
 }
 if(audioSys.ctx.state==='suspended')audioSys.ctx.resume().catch(()=>{});
}
document.getElementById('sound').addEventListener('click',e=>{soundOn=!soundOn;unlock();e.currentTarget.classList.toggle('muted',!soundOn);e.currentTarget.setAttribute('aria-pressed',String(!soundOn));audioSys?.mute();});
canvas.addEventListener('pointerdown',e=>{
 if(held!==null)return;unlock();const tool=pickTool(e);if(!tool)return;
 if(physics.touch(tool)){held=e.pointerId;canvas.setPointerCapture(held);}
});
canvas.addEventListener('pointermove',e=>{if(e.pointerId===held){if(current.press&&current.phase!=='brush')aimAt(e);}else if(e.pointerType==='mouse')canvas.style.cursor=pickTool(e)?'grab':'default';});
function lift(e){if(held===e.pointerId){physics.release();held=null;canvas.style.cursor='default';}}
for(const ev of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(ev,lift);
window.addEventListener('blur',()=>{physics.release();held=null;});
document.addEventListener('visibilitychange',()=>{previous=performance.now();if(document.hidden){physics.release();held=null;if(audioSys)audioSys.ctx.suspend();}});
window.__GAME__={step:dt=>physics.step(dt),getState:()=>physics.getState()};
function tick(now){
 const dt=Math.min(.065,Math.max(0,(now-previous)/1000));previous=now;physics.step(dt);current=physics.getState();
 renderState(current);scene.updateMatrixWorld();
 if(capturePending)captureBay();
 if(frame%3===0)reflect();
 renderer.setRenderTarget(sceneColor);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(finishScene,flatCam);
 frame++;requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
