'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const P = require('./simulation.js');
const dt = .05;
const trace = [], maxima = {}, local = {}, phases = {}, events = {};
const samples = new Set();
const abs = Math.abs;
const max = a => Math.max(...a);
const count = (a, key, eps=1e-9) => a.filter(c=>Math.abs(c[key])>eps).length;
const peak = (key,n) => { assert(Number.isFinite(n), key); maxima[key] = Math.max(maxima[key]||0,n); };
const metric = (a,b,prop) => max(a.map((v,i)=>abs(v[prop]-b[i][prop])));
const volume = (list,key) => list.reduce((r,c)=>r+c[key]*P.area,0);
function audit(name, game) {
  let previous=game.getState(),steps=0;
  const p0=previous;
  function sample() {
    const s=game.getState(),p=previous;
    if(steps) {
      peak('soilDepth_m',metric(s.cells,p.cells,'depth'));
      peak('waterDepth_m',metric(s.cells,p.cells,'water'));
      peak('moisture_fraction',metric(s.cells,p.cells,'moisture'));
      peak('grassBend_rad',metric(s.winds,p.winds,'bend'));
      peak('pollenDistance_m',max(s.motes.map((v,i)=>Math.hypot(v.x-p.motes[i].x,v.y-p.motes[i].y,v.z-p.motes[i].z))));
      peak('puddleHeight_m',max(s.puddles.flatMap((v,i)=>v.h.map((h,j)=>abs(h-p.puddles[i].h[j])))));
      peak('cloudCover_fraction',metric(s.clouds,p.clouds,'cover'));
      peak('engineTravel_m',abs(s.engine.p-p.engine.p));
      peak('toolDistance_m',Math.hypot(s.tip.x-p.tip.x,s.tip.y-p.tip.y,s.tip.z-p.tip.z));
      peak('bucketCurl_rad',abs(s.tip.curl-p.tip.curl));
      peak('truckTravel_m',abs(s.truck.x-p.truck.x));
      peak('onTruck_m3',abs(s.truck.load-p.truck.load));
      if(s.phase!=='reset'&&p.phase!=='reset')peak('deposited_m3',abs(s.truck.load-p.truck.load));
      peak('bedCompartment_m3',max(s.truck.bins.map((v,i)=>abs(v-p.truck.bins[i]))));
      peak('suspension_m',Math.max(abs(s.truck.rear-p.truck.rear),abs(s.truck.front-p.truck.front)));
      peak('chestTravel_m',abs(s.chest.y-p.chest.y));
      peak('lid_rad',abs(s.chest.lid-p.chest.lid));
      peak('hornLift_m',abs(s.horn.height-p.horn.height));
      peak('hornRock_rad',abs(s.horn.ring-p.horn.ring));
      peak('focus_fraction',abs(s.focus.amount-p.focus.amount));
      const oldGrains=new Map(p.grains.map(g=>[g.id,g]));
      for(const g of s.grains){const old=oldGrains.get(g.id);if(old)
        peak('grainTravel_m',Math.hypot(g.x-old.x,g.y-old.y,g.z-old.z));}
      const groups=[
        ['earth',s.cells.map((c,i)=>c.depth-p.cells[i].depth)],
        ['water',s.cells.map((c,i)=>c.water-p.cells[i].water)],
        ['bed',s.truck.bins.map((v,i)=>v-p.truck.bins[i])],
        ['grass',s.winds.map((w,i)=>w.bend-p.winds[i].bend)],
        ['pollen',s.motes.map((v,i)=>v.x-p.motes[i].x)],
        ['puddle',s.puddles.flatMap((v,i)=>v.h.map((h,j)=>h-p.puddles[i].h[j]))],
        ['cloud',s.clouds.map((v,i)=>v.cover-p.clouds[i].cover)],
      ];
      for(const [label,changes] of groups){
        const active=changes.filter(v=>abs(v)>1e-10).length;
        if(!active)continue;
        const stats=local[label]||(local[label]={moving:0,uniform:0,maxActive:0});
        stats.moving++;stats.maxActive=Math.max(stats.maxActive,active);
        if(max(changes)-Math.min(...changes)<1e-11)stats.uniform++;
      }
      // The tracked material in flight and in the bed is conserved between collisions.
      assert(abs(s.activeMass-s.grains.reduce((v,g)=>v+g.m,0))<1e-8);
      assert(abs(s.truck.bins.reduce((v,m)=>v+m,0)-s.truck.load)<1e-8);
      assert(s.cells.every(c=>c.depth>=0&&c.water>=0));
      assert(s.truck.bins.every(x=>x>=0));
      if(s.phase==='soil' && s.cycle===0)
        assert(abs(volume(s.cells,'depth')-s.truck.load-s.activeMass-s.scoop)<1e-7);
    }
    if(!samples.has(name)){samples.add(name);phases[name]=[];}
    if(!phases[name].length||phases[name].at(-1).phase!==s.phase)phases[name].push({phase:s.phase,time_s:s.time});
    const deep=max(s.cells.map(c=>c.depth)), water=max(s.cells.map(c=>c.water));
    const row=[name,s.time,s.phase,s.action,s.held?1:0,s.tip.x,s.tip.y,s.tip.z,s.tip.curl,
      s.scoop,s.activeMass,s.truck.load,s.truck.x,s.truck.front,s.truck.rear,deep,volume(s.cells,'depth'),
      count(s.cells,'depth'),water,volume(s.cells,'water'),count(s.cells,'water'),s.waterIn,
      s.chest.y,s.chest.exposed,s.chest.lid,s.horn.height,s.horn.ring,s.horn.plays,s.engine.p,
      s.winds[0].bend,s.winds[7].bend,s.motes[0].x,s.motes[17].x,s.clouds[0].cover,
      max(s.puddles[0].h),s.hint.pressure,s.focus.amount,...s.truck.bins,s.cycle];
    trace.push(row.map(x=>typeof x==='number'?+x.toFixed(7):x).join(','));
    steps++;previous=s;return s;
  }
  sample();
  return {p0,tick(){game.step(dt);return sample();}};
}
const idleGame=P.create(),idle=audit('idle',idleGame);
let end;
for(let i=0;i<200;i++){end=idle.tick();if(end.hint.pressure>.002&&!events.demo_s)events.demo_s=end.time;}
assert.equal(end.time.toFixed(2),'10.00');
assert.equal(end.phase,'soil');assert.equal(end.action,'rest');assert.equal(end.scoop,0);
events.idle={pollen_m:Math.hypot(end.motes[0].x-idle.p0.motes[0].x,end.motes[0].y-idle.p0.motes[0].y,end.motes[0].z-idle.p0.motes[0].z),
  windDifference_rad:metric(end.winds,idle.p0.winds,'bend'),cloudDifference:metric(end.clouds,idle.p0.clouds,'cover'),
  waterDisplacement_m:max(end.puddles.flatMap(p=>p.h.map(abs))),engine_m:end.engine.p};
assert(events.idle.pollen_m>.2&&events.idle.windDifference_rad>.01&&events.idle.waterDisplacement_m>0);
assert(events.demo_s>=4&&events.demo_s<4.2);
const softness=[];
function digCase(name,hardness,seconds){
  const g=P.create({hardness}),a=audit(name,g),start=g.getState();
  assert(g.down(P.home.x,P.home.z));let s;
  for(let i=0;i<Math.round(seconds/dt);i++)s=a.tick();
  const result={hardness,press_s:seconds,volume_m3:s.scoop,depth_m:max(s.cells.map(c=>c.depth)),activeCells:count(s.cells,'depth')};
  g.up();for(let i=0;i<8;i++)a.tick();
  return {start,result};
}
const soft=digCase('soft',.7,.95),hard=digCase('hard',1.4,.95),short=digCase('short',.7,.75);
for(const c of soft.start.cells)c.hardness=1.4;
assert.deepEqual(soft.start,hard.start,'only soil hardness differs');
assert(soft.result.volume_m3>hard.result.volume_m3*1.8);
assert(soft.result.depth_m>hard.result.depth_m*1.6);
assert(soft.result.volume_m3>short.result.volume_m3);
softness.push(soft.result,hard.result,short.result);
const play=P.create(),session=audit('cycle',play),s=play.state;
let sawReleaseMoving=false,returned=false,strokes=0,sounded=false;
for(let i=0;i<1900;i++){
  if(s.phase==='soil'&&s.action==='rest'){
    assert(!play.down(s.aim.x,s.aim.z,'other'));assert.equal(s.action,'rest');
    assert(play.down(s.hint.x,s.hint.z));strokes++;
  }
  if(s.phase==='soil'&&s.held&&s.cutAge>=1.35)play.up();
  if(s.phase==='chest'&&!s.held&&s.phaseAge>=1.4)assert(play.down(s.chest.x,s.chest.z,'chest'));
  if(s.phase==='horn'&&!sounded&&s.phaseAge>=4.1){
    assert(!play.down(0,0,'other'));assert(play.down(s.chest.x,s.chest.z,'horn'));sounded=true;
  }
  session.tick();
  if(s.phase==='soil'&&!s.held&&s.action==='swing'&&abs(s.tip.vx)>.2)sawReleaseMoving=true;
  for(const [key,val] of Object.entries({load_m3:s.truck.load,rear_m:s.truck.rear,front_m:s.truck.front,truckSpeed_mps:s.truck.v,
    water_m3:volume(s.cells,'water'),wetCells:count(s.cells,'water'),waterDepth_m:max(s.cells.map(c=>c.water)),
    lid_rad:s.chest.lid,trumpetLift_m:s.horn.height,trumpetSwing_rad:abs(s.horn.ring),
    loadedCompartments:s.truck.bins.filter(m=>m>1e-6).length}))
    events[key]=Math.max(events[key]||0,val);
  if(s.cycle===1){returned=true;events.return_s=s.time;break;}
}
events.strokes=strokes;
assert(returned&&sawReleaseMoving&&sounded);
assert.deepEqual(phases.cycle.map(p=>p.phase),['soil','spring','chest','opening','horn','reset','soil']);
assert(events.wetCells>1&&events.loadedCompartments>2&&events.trumpetSwing_rad>.01);
assert.equal(s.truck.load,0);assert.equal(count(s.cells,'depth'),0);
assert(play.down(P.home.x,P.home.z));play.up();for(let i=0;i<140;i++)session.tick();
assert(s.truck.load>0,'a short tap works on the next round');
assert(Object.values(local).every(g=>g.moving>0&&g.uniform===0),'no uniformly translating set');
const bounds={soilDepth_m:.075,waterDepth_m:.04,puddleHeight_m:.003,toolDistance_m:.43,
  truckTravel_m:.29,suspension_m:.035,lid_rad:.24,hornLift_m:.15,focus_fraction:.055,
  deposited_m3:.14,grassBend_rad:.03,chestTravel_m:.16,hornRock_rad:.095};
for(const [key,limit] of Object.entries(bounds))assert(maxima[key]<limit,key+' '+maxima[key]+' >= '+limit);
const header='case,time_s,phase,action,held,tip_x_m,tip_y_m,tip_z_m,bucket_rad,bucket_m3,inflight_m3,load_m3,truck_x_m,front_m,rear_m,max_depth_m,dug_m3,dug_cells,max_water_m,water_m3,wet_cells,inflow_m3,chest_y_m,exposed,lid_rad,horn_height_m,horn_rock_rad,plays,engine_m,grass_0_rad,grass_7_rad,pollen_0_x_m,pollen_17_x_m,cloud_0,puddle_peak_m,guide_pressure,focus,'+
  Array.from({length:P.binX*P.binZ},(_,i)=>'bed_'+i+'_m3').join(',')+',cycle';
fs.writeFileSync(path.join(__dirname,'state-trace.csv'),header+'\n'+trace.join('\n')+'\n');
const results={interval_s:dt,rows:trace.length,cells:P.NX*P.NZ,events,hardness:softness,maxAdjacentDeltas:maxima,
  sectionChanges:local,phases,bounds};
fs.writeFileSync(path.join(__dirname,'measurements.json'),JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results,null,2));
