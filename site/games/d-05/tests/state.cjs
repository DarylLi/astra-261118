// node games/d-05/tests/state.cjs
// The compressed JSONL is a replayable record of continuous state, sampled every 50 ms.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const {createGame}=require('../sim.js');
const dt=.05,records=[],max={},uniform={},counts={},metrics={};
let worstBalance=0,resetCount=0;
const sum=a=>a.reduce((v,x)=>v+x,0);
const largest=a=>Math.max(...a.map(Math.abs));
const peak=(key,val)=>{max[key]=Math.max(max[key]||0,Math.abs(val));};
function channels(s){
  return {
    jet:s.jet.slice(),wave:s.surface.map(p=>p.h),waveVelocity:s.surface.map(p=>p.v),
    floating:s.bodies.map(p=>p.y),horizontal:s.bodies.flatMap(b=>[b.x,b.z]),
    tilt:s.bodies.map(b=>b.roll),displacement:s.bodies.map(b=>b.volume),
    crest:s.rim.map(r=>r.crest),overEdge:s.rim.map(r=>r.q),sheet:s.rim.flatMap(r=>r.slices),
    floor:s.floor.map(p=>p.litres),wet:s.floor.map(p=>p.wet),draft:s.air.map(p=>p.v)
  };
}
function snapshot(s){
  return {stage:s.stage,next:s.next,cycle:s.cycle,discharge:s.discharge,litres:s.litres,level:s.level,
    valve:s.valve,drained:s.waste,delivered:s.delivered,overflow:s.overflow,floorWaste:s.floorWaste,
    drainFlow:s.drainFlow,vortex:s.vortex,angle:s.vortexAngle,hinge:s.hinge,light:s.light,
    bead:s.beadSway,stretch:s.beadStretch,guide:s.guide,guideOpacity:s.guideOpacity,exchange:s.exchange,
    cells:channels(s),
    airParticles:s.motes.map(m=>[m.birth,m.x,m.y,m.z,m.fade]),
    spray:s.drops.map(d=>d.active?[d.birth,d.x,d.y,d.z,d.r]:null)};
}
function observe(group,old,sample){
  for(const v of ['level','litres','valve','discharge','drainFlow','vortex','hinge','light','bead','stretch','guide','guideOpacity','exchange','angle']){
    peak(v,sample[v]-old[v]);
  }
  for(const [name,values] of Object.entries(sample.cells)){
    const delta=values.map((v,i)=>v-old.cells[name][i]);
    peak(name,largest(delta));
    if(largest(delta)>1e-8){
      counts[name]=(counts[name]||0)+1;
      if(Math.max(...delta)-Math.min(...delta)<1e-11)uniform[name]=(uniform[name]||0)+1;
    }
  }
  sample.airParticles.forEach(([birth,x,y,z,fade],i)=>{
    const a=old.airParticles[i];
    if(birth!==a[0]){resetCount++;assert(fade<.08 && a[4]<.08,'air particle recycled in view');}
    else peak('airMotion',Math.hypot((x-a[1])*(i<14?3.25:3.75)/7.4,(y-a[2])*(i<14?.94:2.24)/7.4,(z-a[3])*(i<14?1.05:2.62)/7.4));
  });
  sample.spray.forEach((p,i)=>{const a=old.spray[i];if(a&&p&&p[0]===a[0])peak('dropMotion',Math.hypot(p[1]-a[1],p[2]-a[2],p[3]-a[3]));});
}
function recorder(group,g){
  let old=null,index=0;
  const sample=()=>{
    const s=g.state,p=snapshot(s);
    if(old)observe(group,old,p);
    const mass=s.litres+sum(s.jet)+sum(s.rim.map(r=>r.film))+sum(s.floor.map(c=>c.litres))+s.waste+s.floorWaste;
    worstBalance=Math.max(worstBalance,Math.abs(s.delivered-mass));
    assert(Math.abs(s.delivered-mass)<.000002,'liquid inventory does not balance');
    if(s.stage!=='exchange')for(const b of s.bodies)assert(b.y>=0 && b.volume>=0);
    records.push(JSON.stringify({group,t:index*dt,...p},(_,v)=>typeof v==='number'?Number(v.toFixed(9)):v));
    index++;old=p;
  };
  sample();
  return ()=>{g.step(dt);sample();};
}
{
  const g=createGame(),s=g.state,tick=recorder('idle',g),start=g.getState();
  assert(!createGame().touch('bucket'),'inactive bucket received full interaction');
  for(let i=0;i<80;i++)tick();
  assert(s.guideOpacity<.05);tick();assert(s.guideOpacity>.05);
  for(let i=81;i<200;i++)tick();
  assert.equal(s.litres,0);assert.equal(s.stage,'fill');assert(s.guideOpacity>.9);
  const dis=s.motes.map((p,i)=>p.birth===start.motes[i].birth?
    Math.hypot((p.x-start.motes[i].x)*(p.steam?3.25:3.75)/7.4,(p.y-start.motes[i].y)*(p.steam?.94:2.24)/7.4):0);
  metrics.idle={seconds:s.time,driftM:Math.max(...dis),lightChange:s.light-start.light,beadM:s.beadSway,hingeChange:s.hinge-start.hinge};
  assert(metrics.idle.driftM>.02);
}
for(const flow of [.8,.4]){
  const g=createGame({flow}),s=g.state,tick=recorder('tap-'+flow,g);
  assert(g.touch('tap'));
  for(let i=0;i<200;i++)tick();
  metrics['flow'+flow]={tapLs:s.discharge,deliveredL:s.delivered,basinL:s.litres,levelM:s.level,buoyancyN:s.bodies.map(b=>b.buoyancy),floatM:s.bodies.map(b=>b.y)};
  g.release();for(let i=0;i<50;i++)tick();
  assert(s.discharge<1e-4);assert(s.litres>metrics['flow'+flow].basinL);
}
assert(Math.abs(metrics['flow0.8'].deliveredL/metrics['flow0.4'].deliveredL-2)<1e-9);
assert(metrics['flow0.8'].levelM>metrics['flow0.4'].levelM+.015);
{
  const g=createGame(),s=g.state,tick=recorder('two-buckets',g);
  for(let cycle=0;cycle<2;cycle++){
    assert.equal(s.big,!!cycle);assert(g.touch('tap'));
    for(let i=0;i<500 && s.next!=='bucket';i++)tick();
    assert.equal(s.next,'bucket');g.release();assert(g.touch('bucket'));
    const start=g.getState();let maxCrest=0,maxLevel=s.level,maxFlow=0,maxVortex=0,maxPush=0,surgeAt=null,floorAt=null,firstWet=null,drainPeak=0;
    const bucket=s.bodies[2];let minFreeboard=1;
    for(let i=0;i<160 && s.next!=='plug';i++){
      tick();maxCrest=Math.max(maxCrest,...s.rim.map(r=>r.crest));
      maxLevel=Math.max(maxLevel,s.level);maxFlow=Math.max(maxFlow,sum(s.rim.map(r=>r.q)));maxPush=Math.max(maxPush,bucket.volume-start.bodies[2].volume);
      minFreeboard=Math.min(minFreeboard,bucket.y+bucket.height-s.level);
      if(s.stage==='reward' && surgeAt===null)surgeAt=s.time;
      if(s.floor[0].litres>.001 && firstWet===null)firstWet=s.time;
      if(s.floorWaste-start.floorWaste>.001 && floorAt===null)floorAt=s.time;
    }
    assert(surgeAt!==null && floorAt>firstWet && firstWet>=surgeAt);
    assert(minFreeboard>0,'pail filled over its open lip');assert(maxCrest>.0009);
    assert.equal(s.next,'plug');const spill=s.overflow-start.overflow;
    g.release();assert(g.touch('plug'));
    let maxLanding=0,grounded=[false,false,false];
    for(let i=0;i<600 && s.stage!=='fill';i++){
      const priorSpeed=s.bodies.map(b=>b.vy);
      tick();maxVortex=Math.max(maxVortex,s.vortex);drainPeak=Math.max(drainPeak,s.drainFlow);
      s.bodies.forEach((b,i)=>{if(b.y===0&&!grounded[i]){maxLanding=Math.max(maxLanding,Math.abs(priorSpeed[i]));grounded[i]=true;}});
    }
    assert.equal(s.stage,'fill');assert.equal(s.cycle,cycle+1);assert(s.litres<1e-6 && s.bodies.every(b=>b.y===0));
    assert(maxVortex>.05 && grounded.every(Boolean));
    metrics['cycle'+cycle]={crestM:maxCrest,spillL:spill,peakSpillLs:maxFlow,riseM:maxLevel-start.level,
      displacementL:maxPush*1000,wetDelayS:floorAt-firstWet,vortexRadS:maxVortex,drainLs:drainPeak,landingMS:maxLanding,endTime:s.time};
  }
  assert(metrics.cycle1.spillL>metrics.cycle0.spillL);
}
{
  const g=createGame(),s=g.state,tick=recorder('held-tap',g);g.touch('tap');
  for(let i=0;i<480;i++)tick();
  assert.equal(s.stage,'reward');assert.equal(s.next,'plug');
  const out=sum(s.rim.map(r=>r.q));assert(Math.abs(out-.8)<.03);
  metrics.continuous={tapLs:s.discharge,spillLs:out};
  g.release();g.touch('plug');for(let i=0;i<450 && s.stage!=='fill';i++)tick();
  assert.equal(s.stage,'fill');
}
// A child can keep the tap open through the second overflow and press the larger pail later.
{
  const g=createGame(),s=g.state;
  const tick=recorder('late-bucket',g), advance=t=>{for(let i=0;i<Math.round(t/dt);i++)tick();};
  g.touch('tap');advance(24);g.release();assert(g.touch('plug'));advance(28);
  assert(s.big && s.stage==='fill');g.touch('tap');advance(25);g.release();advance(8);
  assert.equal(s.next,'bucket');assert(g.touch('bucket'));const before=s.overflow;
  advance(3.5);g.release();assert.equal(s.next,'plug');
  metrics.lateBucketExtraL=s.overflow-before;assert(metrics.lateBucketExtraL>.6);
}
// Bounds apply to adjacent 50-ms observations. Birth/death, valve input and stage flags are events.
const bounds={level:.006,litres:.13,floating:.032,horizontal:.003,tilt:.08,crest:.0015,
  wave:.0018,jet:.01,floor:.04,overEdge:.14,discharge:.3,valve:.31,vortex:1.6,exchange:.11,guide:.10,
  airMotion:.009,dropMotion:.06,light:.004,hinge:.04};
for(const [k,v] of Object.entries(bounds))assert(max[k]<v,k+' sample jump '+max[k]+' >= '+v);
assert.deepEqual(uniform,{},'all active cells received the same nonzero increment');
const out=path.join(__dirname,'state-trace.jsonl.gz');
fs.writeFileSync(out,zlib.gzipSync(records.join('\n')+'\n',{level:8}));
console.log(JSON.stringify({records:records.length,intervalS:dt,metrics,max,activeComparisons:counts,
  uniformSteps:uniform,recycledAirParticles:resetCount,maxBalanceErrorL:worstBalance},null,2));
