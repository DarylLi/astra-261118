'use strict';
// Run with node tests/state.test.cjs. Coordinates are metres, angular velocities rad/s.
// Foam and water are local film thicknesses in mm. Mud is a fraction of reference coverage.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { make, W, H } = require('../simulation.js');
const dt = .05, keys = ['mud','foam','water'], steps = {mud:0,foam:0,water:0,run:0,track:0,carZ:0,spin:0};
const trace = [], max = (s,k) => Math.max(...s.cells.map(p=>p[k]));
const avg = (s,k) => s.cells.reduce((sum,p)=>sum+p[k],0)/s.cells.length;
const round = n => Math.round(n*1e6)/1e6;
const result = {samples:0, movingCellFields:0, uniformNonzero:0, vehicleBoundaries:0};
function record(test, s, previous) {
  result.samples++;
  const row = {test,t:round(s.elapsed),vehicle:s.vehicle,phase:s.phase,held:s.press,armed:s.armed,
    cells:s.cells.map(c=>[round(c.mud),round(c.foam),round(c.water),round(c.run)]),
    shaft:[round(s.track),round(s.trackV),round(s.spin)],rings:s.rings.map(r=>[round(r.angle),round(r.omega),round(r.deflection)]),
    wind:round(s.wind),rain:s.drops.map(d=>[round(d.y),round(d.vy),d.impact,round(d.ring),round(d.wait)]),
    hoses:s.hoses.map(o=>round(o.x)),surface:[round(s.floorWet),round(s.rippleEnergy),round(s.runoff)],
    family:s.family.map(f=>[round(f.walk),round(f.seat)]),car:[round(s.carZ),round(s.carV),round(s.door)],
    spray:s.flecks.length,bubbles:s.bubbles.map(b=>[round(b.x),round(b.y),round(b.vy)]),
    windDryer:[round(s.fan),round(s.fanAngle)],glints:s.glints.length};
  trace.push(JSON.stringify(row));
  for (const c of s.cells) for(const key of [...keys,'run']) assert.ok(Number.isFinite(c[key]) && c[key]>=0);
  if (!previous) return;
  if (s.vehicle!==previous.vehicle){result.vehicleBoundaries++;return;}
  for (const key of [...keys,'run']){
    const diff=s.cells.map((c,i)=>c[key]-previous.cells[i][key]),hi=Math.max(...diff),lo=Math.min(...diff);
    const d=Math.max(Math.abs(hi),Math.abs(lo)); steps[key]=Math.max(steps[key],d);
    if(d>1e-9){result.movingCellFields++;if(hi-lo<1e-10)result.uniformNonzero++;}
  }
  for (const key of ['track','carZ','spin']) steps[key]=Math.max(steps[key], Math.abs(s[key]-previous[key]));
}
const idle=make(), start=idle.getState();let last=start;
record('idle',last);
for(let i=0;i<200;i++){idle.step(dt);const s=idle.getState();record('idle',s,last);last=s;}
assert.equal(last.phase,'foam');assert.equal(last.sinceTouch>=4,true);assert.equal(avg(last,'mud'),avg(start,'mud'));
assert.ok(last.rings[4].angle>start.rings[4].angle);assert.ok(avg(last,'water')<avg(start,'water'));
result.idle={seconds:round(last.elapsed),drops:last.drops.reduce((a,d)=>a+d.impact,0),waterStartMm:avg(start,'water'),waterEndMm:avg(last,'water'),windEnd:last.wind,umbrellaRad:last.umbrellaTilt,bubbleRiseM:last.bubbles[0].y-start.bubbles[0].y,brushAngleRad:last.rings[4].angle-start.rings[4].angle};
assert.ok(result.idle.drops>0);
const light=make({mudScale:.35}),heavy=make({mudScale:1});
for(let i=0;i<W*H;i++){
  const a={...light.getState().cells[i]},b={...heavy.getState().cells[i]};
  assert.ok(Math.abs(a.mud-b.mud*.35)<1e-12);delete a.mud;delete b.mud;assert.deepEqual(a,b);
}
// Every input, including the release, occurs at the same sample in both experiments.
const compare=[];
for(const [name,sim] of [['light',light],['heavy',heavy]]){
 let prev=sim.getState();record(name,prev);let atLift,afterLift,deposit;
 const firstMud=avg(prev,'mud');
 assert.equal(sim.touch('rinse'),false);assert.equal(sim.getState().phase,'foam');
 sim.touch('foam',.52,.69);
 for(let i=0;i<100;i++){
  if(i===14){sim.release();atLift=sim.getState();}
  if(i===24){afterLift=sim.getState();sim.touch('foam',.52,.69);}
  if(i===58){assert.equal(sim.getState().phase,'brush');deposit=avg(sim.getState(),'foam');sim.touch('brush');sim.release();}
  sim.step(dt);const s=sim.getState();record(name,s,prev);prev=s;
 }
 const after=sim.getState();
 assert.ok(afterLift.cells.some((c,i)=>Math.abs(c.foam-atLift.cells[i].foam)>.001));assert.equal(after.armed,true);
 compare.push({test:name,startMud:firstMud,remainingMud:avg(after,'mud'),removedMud:firstMud-avg(after,'mud'),foamDepositMm:deposit,runOnMm:Math.max(...afterLift.cells.map((p,i)=>p.foam-atLift.cells[i].foam))});
}
result.comparison=compare;assert.ok(compare[1].foamDepositMm>compare[0].foamDepositMm);assert.ok(compare[1].remainingMud>compare[0].remainingMud);
const game=make(), changes=[],phases=['foam','brush','rinse','dry','board','depart','arrive','foam'];
let s=game.getState(),maxFlex=0,maxSpin=0,maxFoam=0,maxSpray=0,maxDoor=0,maxCarV=0,maxGleams=0,allAboard=false;
record('cycle',s);
while(s.elapsed<90){
 if(changes.at(-1)?.phase!==s.phase){
  changes.push({phase:s.phase,t:round(s.elapsed),vehicle:s.vehicle,meanMud:avg(s,'mud'),maxMud:max(s,'mud'),meanFoamMm:avg(s,'foam'),meanWaterMm:avg(s,'water')});
  if(s.vehicle===1 && s.phase==='foam')break;
  if(['foam','brush','rinse'].includes(s.phase)){game.touch(s.phase);if(s.phase==='brush')game.release();}
 }
 const prev=s;game.step(dt);s=game.getState();record('cycle',s,prev);
 maxFlex=Math.max(maxFlex,...s.rings.map(r=>r.deflection));maxSpin=Math.max(maxSpin,s.spin);maxFoam=Math.max(maxFoam,max(s,'foam'));maxSpray=Math.max(maxSpray,s.flecks.length);
 maxDoor=Math.max(maxDoor,s.door);maxCarV=Math.max(maxCarV,s.carV);maxGleams=Math.max(maxGleams,s.glints.length);allAboard||=s.family.every(f=>f.seat===1);
}
assert.deepEqual(changes.map(c=>c.phase),phases);assert.ok(allAboard);assert.equal(s.vehicle,1);assert.equal(s.carZ,0);
assert.ok(changes.find(p=>p.phase==='dry').maxMud<.013);assert.equal(result.uniformNonzero,0);
assert.ok(steps.mud<.11 && steps.foam<.20 && steps.water<.15 && steps.track<.08 && steps.carZ<.202,'Unexpected adjacent-sample displacement');
result.cycle={changes,maxSpinRpm:maxSpin*60/(2*Math.PI),maxFlex,maxFoamMm:maxFoam,maxSpray,maxDoorDeg:maxDoor*1.14*180/Math.PI,maxCarV,maxGleams};
result.maxStep=steps;
const header={dt,grid:[W,H],cellOrder:'z row, x column',cellUnits:['mud fraction','foam mm','water mm','foam flow mm/s'],separation:'New vehicle has a new grid. Rain impacts terminate one falling drop and place the next in a waiting state.'};
fs.writeFileSync(path.join(__dirname,'state-trace.ndjson.gz'),zlib.gzipSync([JSON.stringify(header),...trace].join('\n')+'\n',{level:8}));
console.log(JSON.stringify(result,(k,v)=>typeof v==='number'?round(v):v,2));
