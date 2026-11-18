// Run with node games/d-06/tests/state.test.cjs. No browser or WebGL context.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const {make,spacing,lap}=require('../simulation.js');
const dt=.05,tolerance=1e-8,records=[],max={},range={};
let unison=0,activeBeds=0,respawns=0,checks=0;
const difference=(a,b)=>Math.abs(a-b);
const near=(a,b,t=1e-7)=>assert.ok(difference(a,b)<t,`${a} ≠ ${b}`);
function measure(key,a,b){
  assert.ok(Number.isFinite(a)&&Number.isFinite(b),key);
  max[key]=Math.max(max[key]||0,difference(a,b));
  const r=range[key]||(range[key]=[Infinity,-Infinity]);
  r[0]=Math.min(r[0],a,b);r[1]=Math.max(r[1],a,b);
}
function check(a,b){
  checks++;
  near(b.time-a.time,dt);
  measure('camera_m',a.district*spacing+a.pan.x,b.district*spacing+b.pan.x);
  // Identity changes when the camera arrives at the adjacent physical board.
  if(a.district!==b.district)return;
  for(const k of ['x','trolley','hook','sling','swing','yaw','hatch'])measure('crane_'+k,a.crane[k].x,b.crane[k].x);
  measure('bridge_m',4.106*a.bridge.x,4.106*b.bridge.x);
  measure('hint_travel',a.cueDepth.x,b.cueDepth.x);
  const movement=b.lots.map((p,i)=>p.bed.x-a.lots[i].bed.x);
  if(movement.some(v=>Math.abs(v)>1e-9))activeBeds++;
  if(Math.max(...movement)-Math.min(...movement)<1e-9 && Math.max(...movement.map(Math.abs))>1e-9)unison++;
  for(let i=0;i<6;i++){
    const p=a.lots[i],q=b.lots[i];
    for(const k of ['bed','tilt','pitch','ridge'])measure(k,p[k].x,q[k].x);
    for(const k of ['charge','window'])measure(k,p[k],q[k]);
    for(let j=0;j<2;j++)measure('pot_m',p.pots[j].x,q.pots[j].x);
    measure('lamp_heat',a.lamps[i].heat,b.lamps[i].heat);
    q.layers.forEach((v,j)=>{
      const u=p.layers[j];
      for(const k of ['x','y','z'])measure('layer_'+k,u[k],v[k]);
      measure('layer_angle',u.angle.x,v.angle.x);
    });
  }
  b.water.forEach((v,i)=>measure('water_h',a.water[i].h,v.h));
  b.cars.forEach((c,i)=>{const p=a.cars[i];
    measure('car_s',p.s,c.s);measure('car_speed',p.v,c.v);measure('car_bounce',p.bounce.x,c.bounce.x);
  });
  b.dust.forEach((d,i)=>{
    const p=a.dust[i];
    // A grain returns to the emitter only after it is completely invisible.
    if(d.age<p.age){assert.ok(p.age>=p.life && d.age<0);respawns++;return;}
    measure('dust_m',0,Math.hypot(d.x-p.x,d.y-p.y,d.z-p.z));
  });
}
function rounded(k,v){return typeof v==='number'?Number(v.toFixed(5)):v;}
function record(name,s){
  // Every local state is retained. Events are recorded once in the sample in which they occur.
  const {events,...state}=s;
  records.push(JSON.stringify({run:name,...state,events:events.filter(e=>e.time>s.time-dt+tolerance)},rounded));
}
function scenario(name,model){
  let prev=model.getState();record(name,prev);
  return ()=>{model.step(dt);const s=model.getState();record(name,s);check(prev,s);prev=s;return s;};
}

const idle=make(),initial=idle.getState(),tickIdle=scenario('idle_10s',idle);
let firstHint=null,idleWaterPeak=0,idleHook=0,idleSwingPeak=0,chargeSpread=0,stillIdentical=0;
for(let n=1;n<=200;n++){
  const before=idle.getState(),s=tickIdle();
  if(s.cuePhase==='point' && firstHint===null)firstHint=s.time;
  idleWaterPeak=Math.max(idleWaterPeak,...s.water.map(w=>Math.abs(w.h)));
  idleHook=Math.max(idleHook,...s.dust.map((p,i)=>{const old=before.dust[i];return old.age>p.age?0:Math.hypot(p.x-old.x,p.y-old.y,p.z-old.z);}));
  idleSwingPeak=Math.max(idleSwingPeak,Math.abs(s.crane.swing.x));
  const deltas=s.lots.map((p,i)=>p.charge-before.lots[i].charge);
  const spread=Math.max(...deltas)-Math.min(...deltas);chargeSpread=Math.max(chargeSpread,spread);
  if(spread<1e-7)stillIdentical++;
}
const idleEnd=idle.getState();
assert.ok(firstHint>=4 && firstHint<=4.05+tolerance);
assert.ok(idleWaterPeak>.002 && idleSwingPeak>.001 && idleHook>.001);
assert.ok(idleEnd.lots.every(p=>p.status==='empty'));
assert.ok(idleEnd.lots.every((p,i)=>Math.abs(p.charge-initial.lots[i].charge)>.001));
assert.equal(stillIdentical,0);
const results=[];
for(let count=1;count<=2;count++){
  const m=make(),advance=scenario('same_plot_'+count+'_tap',m);
  for(let n=0;n<400;n++){
    if(n===20 || (count===2 && n===340))assert.ok(m.tap(0));
    advance();
  }
  results.push(m.getState());
}
const [once,twice]=results;
assert.equal(once.lots[0].taps,1);assert.equal(twice.lots[0].taps,2);
near(once.lots[0].pitch.x,.62);near(twice.lots[0].pitch.x,.87,.00001);
assert.deepEqual(once.lots.slice(1),twice.lots.slice(1));
assert.deepEqual(once.cars,twice.cars);
const variantModel=make();variantModel.tap(0);variantModel.step(17);
for(const expected of [1,2,3,0]){assert.ok(variantModel.tap(0));variantModel.step(2);assert.equal(variantModel.getState().lots[0].variant,expected);}

const all=make(),advance=scenario('complete_cycle',all),phases=[],events=[];
let previousPhase=null,priorTime=-1,station=null,highestSpeed=0,resetTime=0;
for(let n=0;n<3500;n++){
  if(n%12===0 && n<72)assert.ok(all.tap(n/12));
  const s=advance();
  for(const e of s.events)if(e.time>priorTime+tolerance)events.push(e);
  if(s.events.length)priorTime=s.events.at(-1).time;
  if(s.phase!==previousPhase){phases.push(s.phase);previousPhase=s.phase;}
  highestSpeed=Math.max(highestSpeed,s.cars[0].v);
  if(s.phase==='station' && !station)station=s;
  if(s.district===1){resetTime=s.time;assert.equal(s.lots.filter(p=>p.status==='empty').length,6);break;}
}
assert.deepEqual(phases,['build','lamps','train','station','expand','build']);
assert.ok(resetTime>0);
const lampEvents=events.filter(e=>e.name==='lamp'),landings=events.filter(e=>e.name==='land');
assert.deepEqual(lampEvents.map(e=>e.i),[0,1,2,3,4,5]);
assert.equal(landings.length,24);
for(let i=0;i<6;i++){
  const group=landings.filter(e=>e.i===i);assert.equal(group.length,4);
  for(let j=1;j<4;j++)near(group[j].time-group[j-1].time,.8);
}
assert.equal(station.cars[0].v,0);
near(station.cars[0].s-station.trainStart,lap,.01);
assert.ok(station.lots.every(p=>p.window>.99));
assert.equal(unison,0);
for(const [key,bound] of Object.entries({
  layer_x:.16,layer_y:.20,layer_z:.14,crane_x:.14,crane_trolley:.12,crane_swing:.008,
  bed:.008,pitch:.04,ridge:.04,pot_m:.06,water_h:.018,dust_m:.02,
  car_s:.16,car_speed:.064,car_bounce:.009,charge:.14,lamp_heat:.24,window:.13,
  camera_m:.5,bridge_m:.27
}))assert.ok(max[key]<bound,`${key}: ${max[key]} / ${bound}`);
// Fresh town accepts another construction without a page reload.
assert.ok(all.tap(5));all.step(18);assert.equal(all.getState().lots[5].status,'done');
// An invalid target has no side effects, and the fixed substep is batching-independent.
const a=make(),b=make();assert.equal(a.tap(7),false);a.tap(3);b.tap(3);
a.step(4);for(let i=0;i<80;i++)b.step(.05);assert.deepEqual(a.getState(),b.getState());
fs.writeFileSync(path.join(__dirname,'state-0.05s.ndjson.gz'),zlib.gzipSync(records.join('\n')+'\n',{level:8}));
const out={samples:records.length,intervals:checks,firstHint_s:firstHint,idleWaterPeak_m:idleWaterPeak,
  idleSwingPeak_rad:idleSwingPeak,idleDustStep_m:idleHook,idleChargeSpread:chargeSpread,
  idleChargeRange:idleEnd.lots.map(p=>p.charge),uniformGlowIntervals:stillIdentical,
  movingBedIntervals:activeBeds,uniformMovingBedIntervals:unison,invisibleEmissionEvents:respawns,
  roofHeights_m:results.map(r=>r.lots[0].pitch.x),potHeights_m:results.map(r=>r.lots[0].pots.map(p=>p.x)),
  windowAtStation:station.lots.map(p=>p.window),highestSpeed_mps:highestSpeed,
  trainTravel_m:station.cars[0].s-station.trainStart,stationError_m:lap-(station.cars[0].s-station.trainStart),
  lampTimes_s:lampEvents.map(e=>e.time),resetTime_s:resetTime,maxAdjacent:max,range};
console.log(JSON.stringify(out,rounded,2));
