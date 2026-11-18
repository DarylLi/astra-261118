'use strict';
const assert = require('node:assert/strict');
const {create} = require('./simulation.js');

const wide = 1180/820, tall = 390/844;
const dt = 1/60, rms = a => Math.sqrt(a.reduce((sum,x)=>sum+x*x,0)/a.length);
const diff = (a,b) => a.map((v,i)=>v-b[i]);
const near = (x,y,tol=1e-8) => assert.ok(Math.abs(x-y)<=tol,`${x} != ${y}`);
const meters = v => Number(v.toFixed(5));

function runIdle() {
  const model=create(wide),start=model.getState();
  let firstHint=null;
  for(let i=0;i<600;i++){
    model.step(dt);
    if(model.live().guide && firstHint===null)firstHint=model.live().elapsed;
  }
  const end=model.getState();
  near(end.elapsed,10);
  assert.equal(end.collected,0);assert.equal(end.waves.length,0);
  assert.ok(end.floats.every(f=>f.status==='drift'));
  assert.ok(firstHint>=3.99 && firstHint<4.04);
  const surfaceRms=rms(diff(start.field.h,end.field.h));
  const yRms=rms(end.floats.map((f,i)=>f.y-start.floats[i].y));
  const rollRms=rms(end.floats.map(f=>f.roll));
  assert.ok(surfaceRms>.003 && yRms>.002 && rollRms>.0003);
  console.log('idle', {
    seconds:end.elapsed.toFixed(2),surfaceChange_m_RMS:meters(surfaceRms),
    cargoHeave_m_RMS:meters(yRms),cargoRoll_deg_RMS:meters(rollRms*180/Math.PI),
    localFlowChange_rad_RMS:meters(rms(diff(end.field.flow,start.field.flow))),
    dustTravel_m:meters(Math.hypot(end.dust[0].x-start.dust[0].x,end.dust[0].y-start.dust[0].y)),
    fenderAngleChange_deg:meters((end.mooring.angle-start.mooring.angle)*180/Math.PI),
    firstHint_s:meters(firstHint)
  });
  const split=create(wide);split.step(10);assert.deepEqual(split.getState(),end);
  for(const kind of ['crate','float','glass']){
    const f=start.floats.find(o=>o.kind===kind);
    near(f.submerged*1025*9.81,f.mass*9.81,.0001);
    console.log(kind,{draft_m:meters(f.draft),displaced_m3:meters(f.submerged),force_N:meters(f.submerged*1025*9.81)});
  }
}

function runStroke(speed){
  const model=create(wide), f=model.live().floats[3];
  assert.equal(model.stroke(400,350,speed),false);
  assert.equal(model.stroke(f.x-.42,f.z+.21,speed,.16,-.08),true);
  const start=model.getState(),x=start.waves[0].x,z=start.waves[0].z;
  model.step(.30);const early=model.getState(),height=model.surface(x+.34,z);
  model.step(.70);const end=model.getState();
  assert.equal(end.waves.length,1);assert.equal(end.floats[3].status,'riding');
  assert.ok(end.floats.filter(f=>f.status==='drift').length===19);
  near(end.waves[0].radius,1.2);near(end.waves[0].amp,.105*Math.exp(-.9));
  return {start,early,end,height};
}

function runWavelength(){
  const slow=runStroke(.6),fast=runStroke(5);
  const sw=slow.start.waves[0],fw=fast.start.waves[0];
  assert.deepEqual({...sw,lambda:fw.lambda},fw);
  assert.deepEqual(slow.start.floats,fast.start.floats);
  near(sw.lambda,.502);near(fw.lambda,1.25);
  const response=Math.abs(slow.early.floats[3].y-fast.early.floats[3].y);
  assert.ok(response>.001);
  console.log('finger',{speed_m_s:[.6,5],wavelength_m:[sw.lambda,fw.lambda],wavefrontAfter1s_m:meters(slow.end.waves[0].radius),
    initialAmplitude_m:sw.amp,amplitudeAfter1s_m:meters(slow.end.waves[0].amp),decay_per_s:meters(-Math.log(slow.end.waves[0].amp/sw.amp)),
    probeHeightDifferenceAt300ms_m:meters(Math.abs(slow.height-fast.height)),crateHeightDifferenceAt300ms_m:meters(response)});
}

function runHarbor(aspect){
  const model=create(aspect),control=create(aspect);
  for(const m of [model,control])for(const f of m.live().floats)assert.ok(m.stroke(f.x+.25*f.s,f.z,2));
  const phases=new Set(),bells=new Set();
  let horn=0,wakeAge=0,wakeLength=0,cargoRollDiff=0,lastBell=0,totalLoaded=0,waterDrops=0,firstBell=0;
  for(let i=0;i<6000;i++){
    // Matched control with just the returning vessel's wave packets removed.
    const packets=control.live().waves;
    for(let j=packets.length-1;j>=0;j--)if(packets[j].source==='ship')packets.splice(j,1);
    model.step(dt);control.step(dt);control.drain();
    const s=model.live(),ref=control.live();phases.add(s.phase);
    for(const event of model.drain()){
      if(event.type==='bell'){
        assert.ok(!bells.has(event.id));bells.add(event.id);lastBell=s.elapsed;
        if(!firstBell)firstBell=s.elapsed;
        assert.ok(s.drops.length>=28);waterDrops+=28;
      }else if(event.type==='horn')horn++;
    }
    totalLoaded=Math.max(totalLoaded,s.boat.loaded);
    if(s.phase!=='collect')assert.equal(model.stroke(s.floats[0].x,s.floats[0].z,2),false);
    for(const w of s.wakes)if(w.strength===.8){
      wakeAge=Math.max(wakeAge,w.age);
      wakeLength=Math.max(wakeLength,Math.hypot(w.x-s.boat.x,w.z-s.boat.z));
    }
    if(s.boat.fresh)for(const f of s.floats)if(f.status==='drift'){
      cargoRollDiff=Math.max(cargoRollDiff,Math.abs(f.roll-ref.floats[f.id].roll));
    }
    if(s.cycle===1)break;
  }
  const end=model.getState();assert.equal(end.cycle,1);assert.equal(end.phase,'collect');
  assert.deepEqual([...phases],['collect','arrival','loading','departure']);
  assert.equal(end.collected,0);assert.equal(end.floats.length,20);
  assert.ok(end.floats.every(f=>f.status==='drift'));assert.equal(horn,1);assert.equal(totalLoaded,20);
  assert.equal(bells.size,20);assert.ok(wakeAge>10 && wakeLength>10 && end.wakes.length>0);
  assert.ok(cargoRollDiff>.00003);
  console.log(aspect===wide?'1180x820':'390x844',{firstBell_s:meters(firstBell),allBells_s:meters(lastBell),bells:bells.size,
    drops:waterDrops,arrivalHorns:horn,loaded:totalLoaded,nextRound_s:meters(end.elapsed),
    remainingWakePatches:end.wakes.length,longestWakeAge_s:meters(wakeAge),wakeExtent_m:meters(wakeLength),
    newCargoRollFromWake_deg:meters(cargoRollDiff*180/Math.PI)});
}

runIdle();runWavelength();runHarbor(tall);runHarbor(wide);
const rotated=create(wide);rotated.resize(tall);
for(const f of rotated.live().floats){
  const ref=create(tall).live().floats[f.id];
  near(f.x,ref.x);near(f.z,ref.z);near(f.s,ref.s);near(f.mass,ref.mass);
}
console.log('All state checks passed.');
