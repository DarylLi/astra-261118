'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const Toy=require('../physics.js'), dt=.05, samples=[];
const report={stepSeconds:dt}, maxima={ballM:0,leverM:0,pinM:0,dustM:0,clothM:0,guideFraction:0,
  wheelRad:0,basketRad:0,windmillRad:0,bellRad:0,lidRad:0,lipRad:0,ballSpinRad:0};
let movingCloth=0,uniformCloth=0,movingDust=0,uniformDust=0,pinEvents=0,uniformPins=0;
const micro={maxBallTravelM:0,maxLeverTravelM:0};
const allEqualChanges={windmills:0,bells:0,gates:0,baskets:0};
const span=a=>Math.max(...a)-Math.min(...a);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
function max(key,v){assert.ok(Number.isFinite(v),key);maxima[key]=Math.max(maxima[key],Math.abs(v));}
function record(run,s,prev){
  samples.push(JSON.stringify({run,...s}));
  if(!prev)return;
  assert.ok(Math.abs((s.time-prev.time)-dt)<1e-9);
  max('leverM',s.lever.q-prev.lever.q);max('guideFraction',s.guide.q-prev.guide.q);
  max('wheelRad',s.wheel.angle-prev.wheel.angle);max('lidRad',s.lid.q-prev.lid.q);
  assert.ok(s.lever.q>=0&&s.lever.q<=.04);
  const diffCloth=s.cloth.map((x,i)=>x.q-prev.cloth[i].q),diffDust=s.dust.map((x,i)=>dist(x,prev.dust[i]));
  if(diffCloth.some(x=>Math.abs(x)>1e-12)){movingCloth++;if(span(diffCloth)<1e-13)uniformCloth++;}
  if(diffDust.some(x=>x>1e-12)){movingDust++;if(span(diffDust)<1e-13)uniformDust++;}
  diffCloth.forEach(x=>max('clothM',x));diffDust.forEach(x=>max('dustM',x));
  const dp=s.pins.map((p,i)=>p.q-prev.pins[i].q);
  if(dp.some(x=>Math.abs(x)>1e-9)){pinEvents++;if(dp.every(x=>Math.abs(x)>1e-9))uniformPins++;}
  dp.forEach(x=>max('pinM',x));
  s.baskets.forEach((p,i)=>max('basketRad',p.q-prev.baskets[i].q));
  s.cups.forEach((p,i)=>{max('windmillRad',p.wing-prev.cups[i].wing);max('bellRad',p.bell.q-prev.cups[i].bell.q);max('lipRad',p.lip.q-prev.cups[i].lip.q);});
  for(const [name,diff] of Object.entries({
    windmills:s.cups.map((p,i)=>p.wing-prev.cups[i].wing),
    bells:s.cups.map((p,i)=>p.bell.q-prev.cups[i].bell.q),
    gates:s.cups.map((p,i)=>p.lip.q-prev.cups[i].lip.q),
    baskets:s.baskets.map((p,i)=>p.q-prev.baskets[i].q)})){
    if(diff.every(v=>Math.abs(v)>1e-8)&&span(diff)<1e-12)allEqualChanges[name]++;
  }
  for(const b of s.balls){
    assert.ok(Math.abs(Math.hypot(...b.rotation)-1)<1e-8);
    const old=prev.balls.find(x=>x.id===b.id);
    if(old){max('ballM',dist(b,old));max('ballSpinRad',b.spin-old.spin);}
    else assert.ok(b.mode==='feed'||b.mode==='seat','new ball emerges in the feeder');
  }
}
function begin(name,sim){let last=sim.getState();record(name,last);return ()=>{
  for(let i=0;i<24;i++){
    const before=sim.state.balls.map(b=>({id:b.id,x:b.x,y:b.y,z:b.z})),q=sim.state.lever.q;
    sim.step(1/480);
    for(const b of sim.state.balls){
      const previous=before.find(p=>p.id===b.id);
      if(previous)micro.maxBallTravelM=Math.max(micro.maxBallTravelM,dist(b,previous));
    }
    micro.maxLeverTravelM=Math.max(micro.maxLeverTravelM,Math.abs(sim.state.lever.q-q));
  }
  const s=sim.getState();record(name,s,last);last=s;return s;
};}
{
 const sim=Toy.create(),next=begin('idle',sim),start=sim.getState();let demoAt=0,travel=0,clothPeak=0,bellPeak=0;
 for(let n=1;n<=200;n++){const s=next();
   if(s.guide.reach>0&&!demoAt)demoAt=n*dt;
   travel=Math.max(travel,...s.dust.map((p,i)=>dist(p,start.dust[i])));
   clothPeak=Math.max(clothPeak,...s.cloth.map(c=>Math.abs(c.q)));
   bellPeak=Math.max(bellPeak,...s.cups.map(c=>Math.abs(c.bell.q)));
 }
 assert.equal(sim.state.phase,'ready');assert.equal(sim.state.balls.length,1);
 assert.ok(demoAt>=4&&demoAt<=4.05+1e-8);assert.ok(travel>.004&&clothPeak>.0001&&bellPeak>0);
 report.idle={durationS:10,firstGuideS:demoAt,peakDustDriftM:travel,peakHemDeflectionM:clothPeak,peakBellRad:bellPeak};
}
// Matched initial conditions with a fixture holding the spring at rest.
// Identical seed, time, peg states, feed angle, ball and release action.
report.comparison=[];
for(const compression of [.01,.04]){
 const sim=Toy.create();sim.press();sim.state.lever.q=compression;sim.state.lever.v=0;sim.state.springForce=200*compression;
 sim.release();const next=begin('release-'+compression,sim);let s,peakPinM=0;
 for(let i=0;i<120;i++){s=next();peakPinM=Math.max(peakPinM,...s.pins.map(p=>Math.abs(p.q)));if(s.phase==='chime')break;}
 const b=s.balls[0];assert.equal(b.mode,'pocket');assert.ok(b.hits>0);
 report.comparison.push({compressionM:compression,forceN:compression*200,speedMps:s.releaseSpeed,contacts:b.hits,cup:b.cup,timeToCupS:s.time,peakPinM});
}
assert.ok(report.comparison[1].speedMps>report.comparison[0].speedMps);
assert.notDeepEqual(report.comparison.map(r=>r.contacts),[0,0]);
assert.notEqual(report.comparison[0].contacts+':'+report.comparison[0].cup,report.comparison[1].contacts+':'+report.comparison[1].cup);
// An isolated vertical contact verifies the normal speed ratio including the gravitational substep.
{
 const sim=Toy.create(),pin=Toy.pins[0],b=sim.state.balls[0],step=1/480;
 Object.assign(b,{x:pin.x,y:pin.y+Toy.R+.0047+.0001,vx:0,vy:-.4,mode:'fall'});sim.state.phase='rolling';
 const incoming=.4+9.80665*Math.cos(Toy.TILT)*5/7*step;sim.step(step);
 report.restitution=b.vy/incoming;assert.ok(Math.abs(report.restitution-.55)<1e-9);
}
{
 const sim=Toy.create(),next=begin('two-rounds',sim);let holds=0,hold=0,chimes=0,rounds=0,wasMusic=false;
 let starts=[],loaded=[],allLoads=[],firstResetS=0,omega=0,bell=0,lid=0,basket=0,pin=0,force=0,opening=0;
 const durations=[.05,.15,.40,.10,.20,.30],postRelease={};
 for(let i=0;i<2000;i++){
   const pre=sim.state;
   if(pre.phase==='ready'&&!pre.held){
     if(rounds===2)break;
     assert.ok(sim.press());assert.equal(sim.press(),false);hold=durations[holds++];
   }
   if(pre.held&&hold<1e-8){assert.ok(sim.release());assert.equal(sim.release(),false);assert.equal(sim.press(),false);}
   const s=next();if(s.held)hold-=dt;
   const events=sim.drain();for(const e of events)if(e.kind==='chime')chimes++;
   if(s.phase==='music'&&!wasMusic){opening=s.time;starts.push(s.wheel.angle);loaded=[];wasMusic=true;}
   for(const b of s.balls)if(b.mode==='basket'&&!loaded.includes(b.id)){loaded.push(b.id);}
   if(wasMusic&&s.phase==='closing'){
     assert.equal(loaded.length,3);allLoads.push(loaded.slice());wasMusic=false;
     assert.ok(s.wheel.angle-starts.at(-1)>Math.PI*2.95);
     rounds++;
     if(rounds===1)Object.assign(postRelease,{rewardSeconds:s.time-opening,wheelTravelRad:s.wheel.angle-starts[0]});
   }
   if(rounds===1&&!firstResetS&&s.phase==='ready')firstResetS=s.time;
   omega=Math.max(omega,...s.cups.map(c=>c.omega));bell=Math.max(bell,...s.cups.map(c=>Math.abs(c.bell.q)));
   force=Math.max(force,s.springForce);lid=Math.max(lid,s.lid.q);basket=Math.max(basket,...s.baskets.map(c=>Math.abs(c.q)));
   pin=Math.max(pin,...s.pins.map(c=>Math.abs(c.q)));
 }
 assert.equal(rounds,2);assert.equal(chimes,6);assert.equal(holds,6);assert.ok(force===8);assert.equal(sim.state.phase,'ready');
 report.cycle={rounds,chimes,loadOrder:allLoads,firstResetS,peakForceN:force,peakWindmillRadS:omega,peakBellRad:bell,
 peakLidRad:lid,peakBasketRad:basket,peakPinM:pin,...postRelease};
}
assert.ok(movingCloth>200&&movingDust>200&&pinEvents>0);
assert.equal(uniformPins,0);assert.equal(uniformDust,0);assert.equal(uniformCloth,0);
// Bounds are per 50 ms. Contacts may change velocity impulsively, while positions remain continuous.
const bounds={ballM:.12,leverM:.04,pinM:.004,dustM:.003,clothM:.001,guideFraction:.4,
 wheelRad:.09,basketRad:.06,windmillRad:.57,bellRad:.055,lidRad:.20,lipRad:.07,ballSpinRad:16};
for(const [key,limit] of Object.entries(bounds))assert.ok(maxima[key]<=limit,key+' '+maxima[key]+' > '+limit);
report.maxAdjacent=maxima;report.uniformity={movingCloth,uniformCloth,movingDust,uniformDust,pinEvents,framesWithAllPinsDisplaced:uniformPins};
assert.ok(Object.values(allEqualChanges).every(n=>n===0));
report.uniformity.allEqualChanges=allEqualChanges;
assert.ok(micro.maxBallTravelM<.006&&micro.maxLeverTravelM<.003);
report.substep=micro;
report.sampleCount=samples.length;
fs.writeFileSync(path.join(__dirname,'trace.jsonl.gz'),zlib.gzipSync(samples.join('\n')+'\n',{level:9}));
fs.writeFileSync(path.join(__dirname,'measurements.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
