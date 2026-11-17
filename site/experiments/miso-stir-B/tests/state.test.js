'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'), path=require('node:path'), vm=require('node:vm');
const {createSim,surface,rim,radiusLimit}=require('../sim.js');
const dir=path.resolve(__dirname,'..');
const dt=1/60;
const near=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<=tol,`${a} differs from ${b} by more than ${tol}`);
const tick=(sim,n)=>{for(let i=0;i<n;i++)sim.step(dt);};
const round=x=>Number(x.toFixed(4));
function circle(sim,t,rate=3.7){
  sim.move(.84*Math.cos(t*rate),.84*Math.sin(t*rate));sim.step(dt);
}
function checkContents(s) {
  assert.ok(Math.hypot(s.ladle.x,s.ladle.z)<=radiusLimit+.001);
  for(const [i,f] of s.foods.entries()){
    assert.ok(Number.isFinite(f.angle+f.vx+f.vz+f.rock));
    const extent=f.kind==='negi'?.098:f.kind==='tofu'?.225:.258;
    assert.ok(Math.hypot(f.x,f.z)+extent<=rim+.001);
    near(f.y,surface(f.x,f.z,s)+.019*Math.sin(s.heatPhase*(.8+.02*i)+i));
  }
}
// Use the real scene graph, matrices, profiles and camera. No WebGL context or browser.
function read(file){return fs.readFileSync(path.resolve(dir,file),'utf8');}
function loadScene() {
  const context=vm.createContext({console,performance});
  for(const file of ['../../vendor/three.min.js','sim.js','models.js','family.js','soup.js','view.js','audio.js']){
    vm.runInContext(read(file),context,{filename:file});
  }
  return context;
}
const world=loadScene(), scene=new world.THREE.Scene(), initial=createSim().getState();
const family=world.MisoFamily.build(scene,initial), drawSoup=world.MisoSoup.build(scene,initial);
const brothShader={vertexShader:'#include <beginnormal_vertex>\n#include <begin_vertex>',fragmentShader:'#include <color_fragment>',uniforms:{}};
scene.getObjectByName('broth').material.onBeforeCompile(brothShader);
function checkPose(s){
  const pose=family.update(s), p=pose.stirring;
  near(p.elbow.distanceTo(p.shoulder),p.upper);near(p.wrist.distanceTo(p.elbow),p.lower);
  const shaftPoint=family.shaft.localToWorld(new world.THREE.Vector3(0,1.60,0));
  near(shaftPoint.distanceTo(family.gripHand.position),0);
  near(family.bowlRoot.position.y,surface(s.ladle.x,s.ladle.z,s)+.047);
  near(family.bowlRoot.position.x,s.ladle.x);near(family.bowlRoot.position.z,s.ladle.z);
  return pose;
}
function sceneSample(s){
  checkPose(s);drawSoup(s);
  near(scene.getObjectByName('miso').scale.x,Math.max(.00001,s.lump.radius));
  near(brothShader.uniforms.brothColor.value.r,s.broth.color[0]);
  near(brothShader.uniforms.swirl.value,s.whirl);near(brothShader.uniforms.contrast.value,s.broth.contrast);
  for(const [i,f] of s.foods.entries()){
    const ob=scene.getObjectByName('floating-'+i);
    near(ob.position.x,f.x);near(ob.position.z,f.z);near(ob.position.y,f.y+(f.kind==='tofu'?.025:.011));
  }
  near(scene.getObjectByName('bubble-0').scale.x,Math.max(.0001,s.bubbles[0].size));
  return scene.getObjectByName('steam-0').position.y;
}
test('無操作 0・3・6・10秒。対流と加熱は続き、味噌はそのまま',()=>{
  const sim=createSim(),samples=[];
  for(let i=0;i<=600;i++){
    if([0,180,360,600].includes(i)){
      const s=sim.getState();near(s.time,i/60);checkContents(s);
      const height=sceneSample(s);
      samples.push({秒:i/60,泡の半径:round(s.bubbles[0].size),湯気の高さ:round(height),豆腐の高さ:round(s.foods[0].y),誘導のおたまX:round(s.ladle.x)});
      near(s.progress,0);near(s.whirl,0);assert.deepEqual(s.people,initial.people);
    }
    sim.step(dt);
  }
  for(const name of ['泡の半径','湯気の高さ','豆腐の高さ','誘導のおたまX']){
    assert.equal(new Set(samples.map(s=>s[name])).size,4,name);
  }
  console.table(samples);
});
test('攪拌の 0・25・50・75・100%。全フレームの連続性と実モデルへの反映',()=>{
  const sim=createSim(),marks=[0,.25,.5,.75,1],samples=[];
  let prev=sim.getState(),mark=0,maxJump=0;
  function sample(s){
    sceneSample(s);near(s.progress,marks[mark],.005);
    samples.push({目標:marks[mark],進行:round(s.progress),経過秒:round(s.time),味噌半径:round(s.lump.radius),汁の赤成分:round(s.broth.color[0]),濃淡:round(s.broth.contrast),豆腐X:round(s.foods[0].x),渦:round(s.whirl),湯気量:round(s.steam)});
    mark++;
  }
  sample(prev);sim.press();
  let seenPlume=false,seenWallWave=false;
  for(let i=0;i<720 && mark<marks.length;i++){
    circle(sim,i*dt);const s=sim.getState();checkContents(s);checkPose(s);
    const delta=s.progress-prev.progress;assert.ok(delta>=0 && delta<.005);
    maxJump=Math.max(maxJump,delta);
    assert.ok(s.lump.radius<=prev.lump.radius && prev.lump.radius-s.lump.radius<.003);
    for(let k=0;k<3;k++)assert.ok(s.broth.color[k]>=prev.broth.color[k] && s.broth.color[k]-prev.broth.color[k]<.002);
    for(const [i,f] of s.foods.entries())assert.ok(Math.hypot(f.x-prev.foods[i].x,f.z-prev.foods[i].z)<.13);
    if(s.plumes.some(p=>p.strength>.15 && p.age>.6 && Math.hypot(p.x-s.lump.x,p.z-s.lump.z)>.06))seenPlume=true;
    if(Math.abs(s.wallWave)>.08)seenWallWave=true;
    if(s.progress>=marks[mark])sample(s);
    prev=s;
  }
  assert.equal(mark,5);assert.equal(prev.phase,'savor');near(prev.lump.radius,0);near(prev.broth.contrast,0);
  assert.ok(seenPlume && seenWallWave);assert.ok(maxJump>0);
  console.table(samples);
});
test('接触の即時反応、先端の追従時間、具への遅れ',()=>{
  const sim=createSim(),before=sim.getState();sim.press();let s=sim.getState();
  near(s.time,0);assert.ok(s.ladle.tilt-before.ladle.tilt>.09);
  checkPose(before);const rot=family.bowlRoot.quaternion.clone();checkPose(s);
  assert.ok(rot.angleTo(family.bowlRoot.quaternion)>.09);
  sim.move(.87,-.22);let response=0;
  for(let i=1;i<=20;i++){
    sim.step(dt);s=sim.getState();
    if(i===1){assert.ok(s.ladle.speed>1);assert.ok(Math.abs(s.whirl)<.4);assert.ok(Math.hypot(s.foods[0].vx,s.foods[0].vz)<s.ladle.speed*.1);}
    if(!response && s.ladle.x>=before.ladle.x+.5*.75)response=i*dt;
  }
  assert.ok(response>=.08 && response<=.18);
});
test('速さと回転方向。離した後の秒単位の減衰と具材の余韻',()=>{
  function spin(rate){
    const sim=createSim();sim.press();
    for(let i=0;i<180;i++)circle(sim,i*dt,rate);
    return sim;
  }
  const slow=spin(.85),fast=spin(3.7),reverse=spin(-3.7);
  assert.ok(fast.getState().whirl>slow.getState().whirl*2.5);
  assert.ok(reverse.getState().whirl<-3);
  const s=fast.getState(),start=s.whirl;fast.release();tick(fast,1);
  assert.ok(fast.getState().whirl>start*.97);
  tick(fast,59);const coast=fast.getState();assert.ok(coast.whirl>start*.4 && coast.whirl<start*.55);
  assert.ok(Math.hypot(coast.foods[0].x-s.foods[0].x,coast.foods[0].z-s.foods[0].z)>.35);
  tick(fast,180);assert.ok(fast.getState().whirl<start*.08);
  console.log('離した瞬間・1秒後・4秒後の渦',...[start,coast.whirl,fast.getState().whirl].map(round));
});
test('完成、家族の喜び、連続した復帰、次の一杯',()=>{
  const sim=createSim(),roots=family.actors.map(a=>a.g);
  for(let cycle=0;cycle<2;cycle++){
    sim.press();
    for(let i=0;i<800 && sim.getState().phase==='mix';i++)circle(sim,i*dt);
    let s=sim.getState();assert.equal(s.phase,'savor');sim.release(true);
    family.update(s);const bowl=scene.getObjectByName('mama-bowl'),beforeLift=bowl.position.y;
    const steamAtFinish=s.steam;tick(sim,90);s=sim.getState();family.update(s);
    assert.ok(s.joy>.9 && s.steam>steamAtFinish+.25);assert.ok(bowl.position.y>beforeLift+.1);
    let mid=false,prev=s;
    for(let i=0;i<430 && s.round===cycle;i++){
      sim.step(dt);s=sim.getState();assert.ok(Math.abs(s.progress-prev.progress)<.008);checkPose(s);
      assert.deepEqual(s.people,initial.people);
      roots.forEach((g,j)=>{assert.equal(scene.getObjectByName(s.people[j].id),g);near(g.position.x,s.people[j].x);near(g.position.z,s.people[j].z);});
      if(s.phase==='renew' && s.progress>.35 && s.progress<.65)mid=true;
      prev=s;
    }
    assert.ok(mid);assert.equal(s.round,cycle+1);near(s.progress,0);near(s.lump.radius,initial.lump.radius);
    tick(sim,180);near(sim.getState().progress,0);assert.ok(sim.getState().joy<.001);
  }
});
test('タップ補助と短い往復ドラッグ、鍋の外、キャンセル、経過時間上限',()=>{
  const tap=createSim();tap.press();tap.release();tick(tap,60);assert.ok(tap.getState().progress>.0005);
  const sim=createSim();sim.press();sim.move(100,-1e3);tick(sim,90);checkContents(sim.getState());
  sim.release(true);tick(sim,300);assert.equal(sim.getState().down,false);sim.press();
  for(let i=0;i<420;i++){sim.move(.25+.3*Math.sin(i*.13),.02);sim.step(dt);}
  assert.ok(sim.getState().progress>.035);
  const fresh=createSim();fresh.step(15);near(fresh.getState().time,.08);
  fresh.step(-1);fresh.step(NaN);near(fresh.getState().time,.08);
  const copy=fresh.getState();copy.foods[0].x=200;assert.ok(Math.abs(fresh.getState().foods[0].x)<2);
  const a=createSim(),b=createSim();tick(a,120);for(let i=0;i<60;i++)b.step(1/30);
  near(a.getState().foods[2].y,b.getState().foods[2].y);
});
test('固定透視カメラ、実寸96pxの柄の判定と鍋内の射影、全可動域の腕と手',()=>{
  for(const [width,height] of [[360,780],[768,1024],[1366,768],[844,390]]){
    const rect={width,height,left:0,top:0}, camera=world.MisoView.cameraFor(width,height);
    assert.ok(camera.isPerspectiveCamera);
    const s=createSim().getState(),cameraPose=camera.matrixWorld.toArray();
    checkPose(s);
    const project=p=>world.MisoView.screen(camera,rect,p);
    const middle=project(family.bowlRoot.position);
    assert.ok(Math.abs(middle.x/width-.5)<.13 && Math.abs(middle.y/height-.5)<.13);
    for(let i=0;i<64;i++){
      const a=i*Math.PI/32,p=project(new world.THREE.Vector3(1.54*Math.cos(a),1.35,1.54*Math.sin(a)));
      assert.ok(p.x>0 && p.x<width && p.y>0 && p.y<height);
    }
    for(const actor of family.actors){
      const crown=project(actor.head.localToWorld(new world.THREE.Vector3(0,.51*actor.s,0)));
      const chin=project(actor.head.localToWorld(new world.THREE.Vector3(0,-.45*actor.s,0)));
      assert.ok(Math.min(height,chin.y)-Math.max(0,crown.y)<height*.15);
    }
    for(let i=0;i<96;i++){
      const a=i*2*Math.PI/96;s.ladle.x=radiusLimit*Math.cos(a);s.ladle.z=radiusLimit*Math.sin(a);
      const pose=checkPose(s), point=world.MisoView.screen(camera,rect,family.bowlRoot.position);
      for(const pos of [point,world.MisoView.screen(camera,rect,pose.grip)]){
        assert.ok(pos.x>0 && pos.x<width && pos.y>0 && pos.y<height);
      }
      const grip=world.MisoView.screen(camera,rect,pose.grip);
      assert.ok(world.MisoView.hit(camera,rect,grip.x+47,grip.y,pose));
      assert.ok(world.MisoView.hit(camera,rect,grip.x-47,grip.y,pose));
      const p=new world.THREE.Vector3(s.ladle.x,world.MisoSim.soupY,s.ladle.z);
      const q=world.MisoView.screen(camera,rect,p),back=world.MisoView.onSoup(camera,rect,q.x,q.y);
      near(back.distanceTo(p),0);
    }
    assert.deepEqual(camera.matrixWorld.toArray(),cameraPose);
  }
});
test('鍋縁に対する柄の余白。回転中の液面とおたまの傾きも含める',()=>{
  const s=createSim().getState();
  for(let k=0;k<16;k++){
    s.heatPhase=k*1.7;s.flowAngle=k*2;s.whirl=4*Math.cos(k);s.wallWave=.6*Math.sin(k*3);s.ladle.tilt=.115*Math.cos(k);
    for(let i=0;i<120;i++){
      const a=i*2*Math.PI/120;s.ladle.x=radiusLimit*Math.sin(a);s.ladle.z=radiusLimit*Math.cos(a);
      const pose=checkPose(s),axis=pose.grip.clone().sub(pose.start).normalize();
      const point=pose.start.clone().addScaledVector(axis,(1.36-pose.start.y)/axis.y);
      assert.ok(Math.hypot(point.x,point.z)+.056<rim);
    }
  }
});
test('入口からの一指入力、即時描画、無音動作、領域外へのドラッグと復帰',()=>{
  const ctx=loadScene(),handlers={},frames=[],captures=new Set(),rect={width:900,height:650,left:0,top:0};
  const canvas={
    addEventListener:(type,fn)=>{handlers[type]=fn;},getBoundingClientRect:()=>rect,
    setPointerCapture:id=>captures.add(id),hasPointerCapture:id=>captures.has(id),releasePointerCapture:id=>captures.delete(id)
  };
  ctx.document={querySelector:()=>canvas,addEventListener:()=>{}};
  ctx.window={devicePixelRatio:1,addEventListener:()=>{}};
  ctx.requestAnimationFrame=fn=>frames.push(fn);
  let renders=0,sim,camera,graph;
  class StateRenderer{
    constructor(){this.shadowMap={};} setPixelRatio(){} setSize(){}
    render(scene,cam){renders++;camera=cam;graph=scene;}
  }
  ctx.THREE={...ctx.THREE,WebGLRenderer:StateRenderer};
  const make=ctx.MisoSim.createSim;
  ctx.MisoSim.createSim=()=>{sim=make();return sim;};
  vm.runInContext(read('game.js'),ctx);
  const cast=initial.people.map(p=>graph.getObjectByName(p.id));
  const center=ctx.MisoView.screen(camera,rect,new ctx.THREE.Vector3(.37,ctx.MisoSim.soupY,-.22));
  function event(type,id,x,y){handlers[type]({pointerId:id,button:0,clientX:x,clientY:y});}
  function advance(i){assert.equal(frames.length,1);frames.shift()(i*1000/60);}
  advance(0);const count=renders;
  event('pointerdown',7,center.x,center.y);
  assert.equal(captures.size,1);assert.equal(sim.getState().down,true);assert.equal(renders,count+1);
  event('pointerdown',8,center.x,center.y);event('pointermove',8,1500,1500);event('pointerup',8,0,0);
  assert.deepEqual([...captures],[7]);assert.equal(sim.getState().down,true);
  for(let i=1;i<=150;i++){
    event('pointermove',7,center.x+93*Math.sin(i*.055),center.y+61*Math.cos(i*.055));advance(i);
  }
  assert.ok(sim.getState().progress>.02);event('pointermove',7,-1500,1200);advance(151);checkContents(sim.getState());
  event('pointercancel',7,0,0);assert.equal(sim.getState().down,false);assert.equal(captures.size,0);
  for(let i=152;i<=330;i++)advance(i);
  assert.equal(renders,count+331);cast.forEach((person,i)=>assert.equal(graph.getObjectByName(initial.people[i].id),person));
  const html=read('index.html');
  for(const match of html.matchAll(/<script defer src="([^"]+)"/g))assert.ok(fs.existsSync(path.resolve(dir,match[1])));
  assert.doesNotMatch(html,/(https?:\/\/|<button|<img)/);
});
test('初回の音声再開、接触と同じ音声時刻の予約、遅延時の抑制、速度で変わる水音',async()=>{
  const c=world, starts=[],resumes=[],ramps=[];
  let audioTime=4,wallTime=100,delay=0;
  const node=()=>({connect(o){return o;},disconnect(){},start(t){starts.push(t);},stop(){}});
  const param=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(x,t){ramps.push([x,t]);}});
  class Audio{
    constructor(){this.state='suspended';this.sampleRate=8000;this.destination={};}
    get currentTime(){return audioTime;}
    resume(){resumes.push(wallTime);this.state='running';wallTime+=delay;return Promise.resolve();}
    createBuffer(_,n){return {getChannelData:()=>new Float32Array(n)};}
    createBufferSource(){return node();}
    createGain(){return {...node(),gain:param()};}
    createOscillator(){return {...node(),frequency:param()};}
    createBiquadFilter(){return {...node(),Q:param(),frequency:param()};}
  }
  c.AudioContext=Audio;c.performance={now:()=>wallTime};
  const audio=c.MisoAudio.sound();assert.equal(starts.length,0);audio.start();await Promise.resolve();
  assert.deepEqual(resumes,[100]);assert.equal(starts.filter(Number.isFinite).length,1);near(starts.at(-1),audioTime);
  const s=createSim().getState();audio.update(s);s.whirl=3;audio.update(s);
  assert.ok(ramps[2][0]>ramps[0][0] && ramps[3][0]>ramps[1][0]);
  delay=100;audioTime=5;c.MisoAudio.sound().start();await Promise.resolve();
  assert.equal(starts.filter(Number.isFinite).length,1);
});
