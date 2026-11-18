'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createGzip}=require('node:zlib');
const {once}=require('node:events');
const {pipeline}=require('node:stream/promises');
const {create,roadX,DX,DS,NX,NS,END}=require('../simulation.js');

const dt=.05, round=(v,d=5)=>+v.toFixed(d);
const sum=a=>a.reduce((x,y)=>x+y,0),maximum=a=>Math.max(...a);
const maxDelta=(a,b)=>maximum(a.map((v,i)=>Math.abs(v-b[i])));
const maxSpread=a=>maximum(a)-Math.min(...a);
const out=__dirname,zip=createGzip({level:6});
const writing=pipeline(zip,fs.createWriteStream(path.join(out,'samples.ndjson.gz')));
const csv=['trial,time_s,phase,car_s_m,car_speed_m_s,load_kg_m2,snow_volume_m3,largest_bank_m,clods,wettest_film_mm,umbrella_rad,hand_opacity,bus_s_m,lit_windows,max_cell_change_mm,changed_cells'];
const report={step_s:dt,grid_cells:NX*NS,trials:{},max:{},events:[],samples:0,particle_respawns:0,uniform_nonzero_snow_steps:0};
async function line(obj){if(!zip.write(JSON.stringify(obj)+'\n'))await once(zip,'drain');}
function peak(k,v){assert.ok(Number.isFinite(v),k);report.max[k]=Math.max(report.max[k]||0,v);}
function compact(array,scale,old){
  const a=Int32Array.from(array,x=>Math.round(x*scale));
  const diff=Array.from(a,(n,i)=>n-(old?old[i]:0));
  // Consecutive equal deltas encoded as [run, delta], preserving every grid location.
  const runs=[];let i=0;
  while(i<diff.length){let j=i+1;while(j<diff.length&&diff[j]===diff[i])j++;runs.push(j-i,diff[i]);i=j;}
  return {a,runs};
}
async function trial(name,depth,steps,control,inspect=()=>{}){
  const g=create({depth}),first=g.getState();let prev=null;
  const lastArrays={},hist=[];
  const initVol=sum(first.snow)*DX*DS;
  const stats={frames:0,peakBank_m:0,peakClods:0,peakVolume_m3:0,peakClodHeight_m:0,peakLamp:0,peakPitch_rad:0,peakWheel_rad:0,
    maxMassError_m3:0,litAt_s:null,hintAt_s:null,allWindowsAt_s:null};
  for(let i=0;i<=steps;i++){
    if(i){control(g,i);g.step(dt);}
    const s=g.getState(),v=s.car,t=round(s.time,2);
    let change=0,changed=0;
    if(prev){
      const diff=s.snow.map((h,j)=>h-prev.snow[j]);change=maximum(diff.map(Math.abs));changed=diff.filter(x=>x!==0).length;
      if(change>1e-12&&maxSpread(diff)<1e-12)report.uniform_nonzero_snow_steps++;
      peak('snow_m',change);peak('bank_m',maxDelta(s.piles,prev.piles));peak('water_mm',maxDelta(s.water,prev.water));
      peak('temperature_C',maxDelta(s.heat,prev.heat));peak('window_fraction',maxDelta(s.lamps,prev.lamps));
      peak('suspension_m',maxDelta(v.mounts,prev.car.mounts));peak('wheel_rad',maxDelta(v.wheels,prev.car.wheels));
      peak('hand_m',Math.abs(s.hand.s-prev.hand.s));peak('flex_rad',maxDelta(s.flex,prev.flex));
      peak('car_m',Math.hypot(v.s-prev.car.s,v.x-prev.car.x+roadX(v.s)-roadX(prev.car.s)));
      peak('car_speed_m_s',Math.abs(v.v-prev.car.v));peak('car_pitch_rad',Math.abs(v.pitch-prev.car.pitch));
      peak('bus_m',Math.hypot(s.bus.s-prev.bus.s,s.bus.x-prev.bus.x));
      peak('bus_turn_rad',Math.abs(s.bus.turn-prev.bus.turn));
      peak('wind_m_s',Math.abs(s.weather.wind-prev.weather.wind));peak('blade_m',Math.abs(v.blade-prev.car.blade));
      for(let j=0;j<s.flakes.length;j++){const a=s.flakes[j],b=prev.flakes[j];
        if(a.id===b.id)peak('flake_m',Math.hypot(a.x-b.x,a.y-b.y,a.s-b.s));else report.particle_respawns++;}
      const prevClods=new Map(prev.clods.map(c=>[c.id,c]));
      for(const a of s.clods){const b=prevClods.get(a.id);if(b)peak('clod_m',Math.hypot(a.x-b.x,a.y-b.y,a.s-b.s));}
      if(s.phase!==prev.phase)report.events.push([name,t,s.phase]);
      assert.ok(change<.102,'blade displacement exceeds local cut rate');
      assert.ok(maxDelta(s.water,prev.water)<.0022,'film discontinuity');
    }
    assert.ok(s.snow.every(h=>Number.isFinite(h)&&h>=0));
    assert.ok(s.water.every(w=>w>=0&&w<=.48));
    const volume=sum(s.volume),bank=maximum(s.piles),lit=s.lamps.filter(v=>v>.50).length;
    if(s.cycle===0){
      const error=Math.abs(initVol-sum(s.snow)*DX*DS-volume-sum(s.clods.map(c=>c.volume))-s.bladeCarry);
      assert.ok(error<1e-8,'snow mass balance');stats.maxMassError_m3=Math.max(stats.maxMassError_m3,error);
    }
    stats.peakBank_m=Math.max(stats.peakBank_m,bank);stats.peakClods=Math.max(stats.peakClods,s.clods.length);
    stats.peakVolume_m3=Math.max(stats.peakVolume_m3,volume);stats.peakLamp=Math.max(stats.peakLamp,...s.lamps);
    stats.peakClodHeight_m=Math.max(stats.peakClodHeight_m,...s.clods.map(c=>c.y));stats.peakPitch_rad=Math.max(stats.peakPitch_rad,Math.abs(v.pitch));
    stats.peakWheel_rad=Math.max(stats.peakWheel_rad,...v.wheels.map(Math.abs));
    if(lit&&stats.litAt_s===null)stats.litAt_s=t;
    if(lit===12&&stats.allWindowsAt_s===null)stats.allWindowsAt_s=t;
    if(s.hand.alpha>0&&stats.hintAt_s===null)stats.hintAt_s=t;
    const record={trial:name,t,phase:s.phase,cycle:s.cycle,depth:s.depth,car:v,bus:s.bus,view:s.view,weather:s.weather,hand:s.hand,
      flex:s.flex,lamps:s.lamps,clods:s.clods,bladeCarry:s.bladeCarry,flakes:s.flakes.map(f=>[f.id,Math.round(f.x*1000),Math.round(f.y*1000),Math.round(f.s*1000)])};
    for(const [key,scale] of [['snow',10000],['water',1000],['heat',100],['piles',10000],['volume',100000]]){
      const encoded=compact(s[key],scale,lastArrays[key]);record[key]=encoded.runs;lastArrays[key]=encoded.a;
    }
    await line(record);
    csv.push([name,t,s.phase,v.s,v.v,v.load,sum(s.snow)*DX*DS,bank,s.clods.length,maximum(s.water),s.flex[2],s.hand.alpha,s.bus.s,lit,change*1000,changed].map(x=>typeof x==='number'?round(x):x).join(','));
    stats.frames++;report.samples++;
    hist.push({t,s:v.s,v:v.v,load:v.load,wind:s.weather.wind,phase:s.phase,hand:s.hand.alpha});
    inspect(s,prev,first,stats);
    prev=s;
  }
  report.trials[name]=stats;return {g,hist,stats,first,end:prev};
}
async function main(){
  await line({format:'Samples every 0.05 s. Each trial starts with zero baselines. Snow, water, heat, piles and volume are run-length encoded successive integer deltas [length,value,...]. Other fields are absolute. Flakes are [id,x_mm,y_mm,s_mm].',units:{snow:'0.1 mm',water:'0.001 mm',heat:'0.01 C',piles:'0.1 mm',volume:'0.00001 m3'},NX,NS,DX,DS});
  const idle=await trial('idle',.20,200,()=>{});
  assert.equal(idle.end.car.s,0);assert.equal(maxDelta(idle.end.snow,idle.first.snow),0);
  assert.ok(maxDelta(idle.end.water,idle.first.water)>.03);
  assert.ok(maxSpread(idle.end.flex)>.001);assert.equal(idle.stats.hintAt_s,4.05);
  assert.ok(idle.hist.filter(s=>s.t<4).every(s=>s.hand===0));
  report.idle={film_growth_mm:maxDelta(idle.end.water,idle.first.water),umbrella_rad:idle.end.flex[2],wind_m_s:idle.end.weather.wind,
    flake_fall_m:idle.first.flakes[10].y-idle.end.flakes[10].y,hintAt_s:idle.stats.hintAt_s};
  const input=(g,i)=>{if(i===1)g.aim(END);if(i===81)g.release();};
  const a=await trial('20cm',.20,200,input),b=await trial('40cm',.40,200,input);
  assert.ok(a.hist[60].v>b.hist[60].v+.2);assert.ok(a.hist[60].s>b.hist[60].s+.25);
  assert.ok(a.hist.every((r,i)=>r.wind===b.hist[i].wind));
  assert.ok(a.hist[81].v>0 && a.end.car.v===0);
  report.depth_comparison=[a,b].map(r=>({...r.hist[60],coast_m:r.end.car.s-r.hist[80].s}));
  const journey=await trial('journey',.20,1000,(g,i)=>{if(i===109)g.aim(END);});
  assert.deepEqual(report.events.filter(e=>e[0]==='journey').map(e=>e[2]),['shine','bus','arrival','refill','plow']);
  assert.ok(journey.end.depth>.2&&journey.end.cycle===1);assert.equal(journey.end.phase,'plow');
  assert.ok(journey.stats.allWindowsAt_s>journey.stats.litAt_s);assert.ok(journey.stats.peakClods>3&&journey.stats.peakBank_m>.20);
  report.next_depth_m=journey.end.depth;
  assert.equal(report.uniform_nonzero_snow_steps,0);
  assert.ok(report.max.car_m<.15001&&report.max.car_speed_m_s<=.130001);
  assert.ok(report.max.bus_m<.256&&report.max.bus_turn_rad<.059);
  assert.ok(report.max.bank_m<.08&&report.max.flake_m<.1&&report.max.clod_m<.23);
  assert.ok(report.max.suspension_m<.02&&report.max.hand_m<.32&&report.max.window_fraction<.18);
  // Extremal steering must also leave a passable central corridor in later rounds.
  for(const depth of [.20,.40,.52])for(const x of [-.36,.36]){
    const sim=create({depth});sim.aim(END,x);sim.step(14);assert.equal(sim.phase,'bus');
  }
  const split=create(),single=create();split.step(.017);split.step(.033);single.step(.05);
  assert.deepEqual(split.getState(),single.getState());
  zip.end();await writing;
  fs.writeFileSync(path.join(out,'samples.csv'),csv.join('\n')+'\n');
  fs.writeFileSync(path.join(out,'measurements.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}
main().catch(async e=>{zip.destroy();await writing.catch(()=>{});console.error(e);process.exitCode=1;});
