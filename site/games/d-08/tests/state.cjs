'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const P=require('../physics.js'),dt=.05,out=__dirname;
const max={},stats={},records=[],zones=P.nx*P.nz,probes=[8,22,27,33,48,114,132,141,246,417,709,1257];
const round=n=>+n.toFixed(6);
const peak=(k,v)=>{assert.ok(Number.isFinite(v),k);max[k]=Math.max(max[k]??0,Math.abs(v));};
function quantities(s){
  const values={hook:{p:[s.tip.x,s.tip.z],height:[s.tip.y],swing:[s.hook.ax,s.hook.az],lock:[s.hook.lock],spool:[s.hook.spool],lampAngle:[s.hook.beacon]}};
  for(const b of s.ships)values['ship'+b.id]={travel:[b.x],heave:[b.heave],roll:[b.roll],trim:[b.trim]};
  for(const c of s.cargo)values['cargo'+c.id]={cargoPosition:[c.x,c.y,c.z],cargoAngle:[c.roll,c.trim+c.shake]};
  for(const b of s.fenders)values['fender'+b.x]={rubberAngle:[b.angle]};
  for(const p of s.motes)values['mote'+p.home]={dust:[p.x,p.y,p.z]};
  for(const w of s.winds.entries())values['wind'+w[0]]={windSpeed:[w[1].u],skyLight:[w[1].light]};
  for(const d of s.sleds)values['sled'+d.kind]={sled:[d.z]};
  return values;
}
function snapshot(s){
  return {values:quantities(s),h:Float64Array.from(s.water.h),v:Float64Array.from(s.water.v),foam:Float64Array.from(s.water.foam)};
}
function audit(a,b){
  for(const [id,qs] of Object.entries(b.values)){
    if(!a.values[id])continue; // Newly arriving bodies have their own ID at the source.
    for(const [q,v] of Object.entries(qs))peak(q,Math.hypot(...v.map((x,i)=>x-a.values[id][q][i])));
  }
  const uniform=(field,ds)=>{
    const lo=Math.min(...ds),hi=Math.max(...ds);
    if(hi-lo<1e-10 && Math.max(Math.abs(lo),Math.abs(hi))>1e-9)stats.uniformActive[field]++;
  };
  for(const field of ['rubberAngle','dust','windSpeed','skyLight']){
    const ds=Object.keys(b.values).filter(id=>a.values[id]&&b.values[id][field]).map(id=>b.values[id][field][0]-a.values[id][field][0]);
    uniform(field,ds);
  }
  uniform('foam',b.foam.map((v,i)=>v-a.foam[i]));
  let lo=Infinity,hi=-Infinity;
  for(let i=0;i<zones;i++){
    const dh=b.h[i]-a.h[i];peak('water',dh);peak('waterVelocity',b.v[i]-a.v[i]);peak('foam',b.foam[i]-a.foam[i]);
    lo=Math.min(lo,dh);hi=Math.max(hi,dh);
  }
  stats.uniformWaterSteps+=(hi-lo<1e-10?1:0);stats.checkedPairs++;
}
function recorder(name,sim){
  let old;
  return ()=>{
    const s=sim.live(),snap=snapshot(s);
    if(old)audit(old,snap);old=snap;
    // Trace core bodies and spatial probes. The extrema above use every grid cell.
    records.push(JSON.stringify({run:name,t:round(s.elapsed),phase:s.phase,round:s.round,tip:s.tip,hook:s.hook,
      ships:s.ships,cargo:s.cargo,winds:s.winds.map(w=>[w.u,w.light]),fenders:s.fenders.map(b=>b.angle),
      motes:s.motes.map(p=>[p.x,p.y]),sleds:s.sleds,
      water:probes.map(i=>[s.water.h[i],s.water.v[i],s.water.foam[i]])},(k,v)=>typeof v==='number'?round(v):v));
  };
}
stats.checkedPairs=0;stats.uniformWaterSteps=0;stats.uniformActive={rubberAngle:0,dust:0,windSpeed:0,skyLight:0,foam:0};
const idle=P.create(),initial=idle.getState(),idleRecord=recorder('idle',idle);
assert.equal(idle.press({type:'deck',x:0}),false);assert.equal(idle.press(null),false);
idleRecord();for(let i=0;i<200;i++){idle.step(dt);idleRecord();if(idle.live().hintActive&&stats.hintSeconds===undefined)stats.hintSeconds=round(idle.live().elapsed);}
const after=idle.getState(),delta=(a,b)=>Math.max(...a.map((v,i)=>Math.abs(v-b[i])));
stats.idleWater=delta(after.water.h,initial.water.h);
stats.idleFender=delta(after.fenders.map(v=>v.angle),initial.fenders.map(v=>v.angle));
stats.idleDust=delta(after.motes.map(v=>v.x),initial.motes.map(v=>v.x));
stats.idleLight=delta(after.winds.map(w=>w.light),initial.winds.map(w=>w.light));
assert.equal(stats.hintSeconds,4);assert.equal(after.phase,'pick');assert.equal(after.ships[0].load,0);assert.ok(after.idle>=9.99);
for(const k of ['idleWater','idleFender','idleDust','idleLight'])assert.ok(stats[k]>.0001,k);
assert.deepEqual(idle.getState(),after);
const sim=P.create(),record=recorder('voyage',sim);
let lastPhase='',hold=0,first=true,done=false;
let impactCount=0,preY=0,preLoad=0,impactTime=-10,impactShip;
stats.sink=[];stats.maxPendulum=0;stats.shoreWave=0;stats.shoreFoam=0;stats.sailingSpeed=0;stats.maxLock=0;stats.maxTrolleySpeed=0;
record();
for(let i=0;i<5000;i++){
  const s=sim.live();
  if(lastPhase!==s.phase){hold=0;lastPhase=s.phase;if(s.phase==='lowerDrop'){preY=s.ships[0].heave;preLoad=s.ships[0].load;}}
  if(s.round===1&&s.phase==='pick'){done=true;stats.returnTime=round(s.elapsed);break;}
  if(s.phase==='pick'){
    const c=s.cargo.find(c=>c.mode==='yard');const hit={type:'cargo',id:c.id};
    if(hold===0){assert.equal(sim.press(hit),true);assert.equal(sim.press(hit),false);}
    if(hold>=.85){sim.release(hit);hold=0;}
  }
  if(s.phase==='carry'){
    const hit={type:'deck',x:P.slots[s.cargo.find(c=>c.id===s.selected).kind]};
    if(hold===0){const start=first?{type:'hook'}:hit;assert.equal(sim.press(start),true);}
    if(first&&hold>.20)sim.move(hit.x,P.deckZ);
    if(hold>=(first?4.25:1.2)){sim.release(hit);first=false;hold=0;}
  }
  if(s.phase==='unlock'&&s.ships[0].load!==preLoad){
    impactShip=s.ships[0].id;impactTime=s.elapsed;impactCount++;preLoad=s.ships[0].load;
  }
  if(impactTime>0&&s.elapsed-impactTime>=2.30){
    stats.sink.push(preY-s.ships.find(b=>b.id===impactShip).heave);impactTime=-10;
  }
  stats.maxPendulum=Math.max(stats.maxPendulum,Math.hypot(s.hook.ax,s.hook.az));
  stats.maxLock=Math.max(stats.maxLock,s.hook.lock);stats.maxTrolleySpeed=Math.max(stats.maxTrolleySpeed,Math.hypot(s.hook.vx,s.hook.vz));
  if(['arrival','sail'].includes(s.phase)){
    for(let k=0;k<P.nx;k++){stats.shoreWave=Math.max(stats.shoreWave,Math.abs(s.water.h[k]));stats.shoreFoam=Math.max(stats.shoreFoam,s.water.foam[k]);}
    stats.sailingSpeed=Math.max(stats.sailingSpeed,...s.ships.map(b=>b.speed));
  }
  hold+=dt;sim.step(dt);record();
}
stats.impactEvents=sim.events.filter(e=>e.type==='impact').length;stats.hornEvents=sim.events.filter(e=>e.type==='horn').length;
assert.ok(done,'next ship berths');assert.equal(impactCount,3);assert.equal(sim.events.filter(e=>e.type==='impact').length,3);
assert.equal(sim.events.filter(e=>e.type==='horn').length,1);assert.equal(sim.live().cargo.filter(c=>c.mode==='yard').length,3);
assert.ok(stats.sink.every(s=>s>.07&&s<.18));assert.equal(stats.sink.length,3);
assert.ok(stats.shoreWave>.01);assert.ok(stats.shoreFoam>.01);assert.ok(stats.maxLock>1.01);
assert.ok(stats.maxTrolleySpeed<=1.500001);assert.ok(max.p/dt<=1.500001);
assert.ok(max.height<.09&&max.cargoPosition<.24&&max.travel<.23&&max.heave<.015&&max.sled<.095);
assert.ok(max.water<.035&&max.rubberAngle<.009);
assert.equal(stats.uniformWaterSteps,0);
// Same controller, seed, event sequence and fixed step; only rope length differs.
// Compare the loaded pendulums with guidance disengaged, during travel and free decay.
// Start the experiments at the same physical instant, with the same full input history.
const pair=[12,6].map(length=>P.create({ropeLength:length}));
const logs=pair.map((s,i)=>recorder('rope'+[12,6][i],s));logs.forEach(r=>r());
const trace=[];
for(let i=0;i<440;i++){
  pair.forEach((s,j)=>{
    if(i===0){s.press({type:'cargo',id:0});s.release({type:'cargo',id:0});}
    if(i===190){assert.equal(s.live().phase,'carry');s.press({type:'hook'});s.move(.8,-3.5);}
    if(i===230)s.release(null);
    s.step(dt);logs[j]();
  });
  if(i>=190)trace.push(pair.map(s=>({angle:s.live().hook.ax,x:s.live().tip.x})));
}
stats.ropeMaxAngleDifference=Math.max(...trace.map(r=>Math.abs(r[0].angle-r[1].angle)));
stats.ropeMaxTipDifference=Math.max(...trace.map(r=>Math.abs(r[0].x-r[1].x)));
stats.ropeAt4s=trace[79].map(v=>v.angle*180/Math.PI);
assert.ok(stats.ropeMaxAngleDifference>.005);assert.ok(stats.ropeMaxTipDifference>.04);assert.equal(stats.uniformWaterSteps,0);
// The public snapshot is detached. Equivalent subdivisions produce the same state.
const one=P.create(),many=P.create();one.step(1);for(let i=0;i<20;i++)many.step(dt);
assert.deepEqual(one.getState(),many.getState());const copy=one.getState();copy.water.h.fill(450);assert.notEqual(one.live().water.h[0],450);
assert.equal(max.p<=dt*1.5+1e-9,true);
assert.ok(Object.values(stats.uniformActive).every(count=>count===0));
fs.writeFileSync(path.join(out,'state-trace.ndjson.gz'),zlib.gzipSync(records.join('\n')+'\n',{level:9}));
fs.writeFileSync(path.join(out,'measurements.json'),JSON.stringify({stepSeconds:dt,waterCells:zones,probeIndices:probes,records:records.length,stats,maxDelta:max},null,2)+'\n');
console.log(JSON.stringify({records:records.length,stats,maxDelta:max},null,2));
