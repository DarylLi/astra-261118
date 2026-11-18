'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
const {createSimulation}=require('../physics.js');
const dt=.05, solve=1/120, runs=[];
const fx=n=>typeof n==='number'?Number(n.toFixed(5)):typeof n==='boolean'?Number(n):n;
const cols=['run','time_s'],rows=[];
const ambientKeys=['wind','drift','lamp','hint','lever','chamber','valve','thrust','mass','fuel','upperFuel','altitude','velocity','acceleration','tangential','orbitAngle','pitch','lowerOffset','lowerVelocity','payloadGap','busRoll','lookDown','shutter'];
function fields(s){
  const r={phase:s.phase,cycle:s.cycle,held:s.held,hold:s.hold,detached:s.detached,released:s.released};
  for(const key of ambientKeys)r[key]=s[key];
  for(const k of ['fairing','wings','wingSpeed','heat'])s[k].forEach((v,i)=>r[k+i]=v);
  for(const [key,keys] of [['waves',['h','v']],['sock',['angle','speed','flow']],['salt',['generation','x','y','vx','vy','alpha']],['mounts',['angle','speed']],['jets',['length','speed']],['vapor',['generation','x','y','z','vx','vy','vz','density','water','radius','rotation']]]){
    s[key].forEach((v,i)=>{for(const k of keys)r[key+i+'_'+k]=v[k];});
  }
  return r;
}
const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
const rms=a=>Math.sqrt(mean(a.map(v=>v*v)));
const span=a=>Math.max(...a)-Math.min(...a);
function run(name,hold){
  const sim=createSimulation();if(hold!==null){sim.step(10);assert(sim.press());}
  let previous=null, first=null, peak={},clock={},at={},events={},counts={},uniform={},maxRawReset={},last=null,rebirths=0,recyclesOpacity=0,stageMass=0;
  const amp={};let airborne=false;
  for(let i=0;i<=(hold===null?200:1250);i++){
    if(i>0){if(hold!==null&&(i-1)*dt>=hold)sim.release();sim.step(dt);}
    const t=fx(i*dt),s=sim.getState();last=s;
    if(!first)first=s;
    const f=fields(s);
    if(!cols.includes('phase'))cols.push(...Object.keys(f));
    rows.push([name,t,...Object.values(f).map(fx)].join(','));
    for(const [k,v] of Object.entries(f))if(typeof v==='number')assert(Number.isFinite(v),k);
    if(!Object.hasOwn(events,s.phase))events[s.phase]=t;
    if(s.altitude>0&&!airborne){clock.liftoff=t;airborne=true;}
    if(s.detached&&!Object.hasOwn(clock,'separation')){clock.separation=t;clock.separationHeight=fx(s.altitude);}
    if(s.hint>.001&&clock.hint===undefined)clock.hint=t;
    if(s.cloudPassed&&clock.cloud===undefined)clock.cloud=t;
    if(s.wings[0]>.001&&clock.panel===undefined)clock.panel=t;
    if(s.wings[3]>.001&&clock.outerPanel===undefined)clock.outerPanel=t;
    if(s.cycle===0){for(const k of ['thrust','altitude','velocity','acceleration','tangential','lookDown','hint','lever','pitch'])amp[k]=Math.max(amp[k]||0,s[k]);}
    if([2,5,8,10].includes(t))at[t]={altitude:fx(s.altitude),velocity:fx(s.velocity),thrust:fx(s.thrust),fuel:fx(s.fuel),mass:fx(s.mass),valve:fx(s.valve),wave:s.waves.map(w=>fx(w.h)),wind:fx(s.wind),light:fx(s.lamp),lever:fx(s.lever),jets:s.jets.map(j=>fx(j.length)),heat:s.heat.map(fx)};
    if(previous){
      const q=previous,reset=s.cycle!==q.cycle;
      function diff(label,d){peak[label]=Math.max(peak[label]||0,Math.abs(d));}
      if(reset){
        assert(q.shutter>.98 && s.shutter>.98,'reset must be behind the closed shutter');
        for(const k of ['altitude','velocity','mass','thrust'])maxRawReset[k]=fx(Math.abs(s[k]-q[k]));
      }else{
        for(const k of ambientKeys)diff(k,s[k]-q[k]);
        // Acceleration is integrated at 120 Hz. A position discontinuity would
        // exceed the speed envelope even when the nozzle changes stages.
        const dh=Math.abs(s.altitude-q.altitude);
        assert(dh<=Math.max(Math.abs(s.velocity),Math.abs(q.velocity))*dt+.012,'altitude discontinuity');
        assert(s.fuel<=q.fuel+1e-8 && s.upperFuel<=q.upperFuel+1e-8);
        if(!q.detached&&s.detached)stageMass=fx(q.mass-s.mass);
        for(const [kind,get] of [
          ['wave',a=>a.waves.map(w=>w.h)],['sock',a=>a.sock.map(c=>c.angle)],['mount',a=>a.mounts.map(m=>m.angle)],
          ['jet',a=>a.jets.map(j=>j.length)],['heat',a=>a.heat],['fairing',a=>a.fairing],['wing',a=>a.wings]
        ]){
          const b=get(q),d=get(s).map((x,j)=>x-b[j]);d.forEach(x=>diff(kind,x));
          if(Math.max(...d.map(Math.abs))>1e-6){counts[kind]=(counts[kind]||0)+1;if(span(d)<1e-9)uniform[kind]=(uniform[kind]||0)+1;}
        }
        const opacity=[];
        s.vapor.forEach((v,j)=>{
          const old=q.vapor[j];
          if(v.generation!==old.generation){rebirths++;recyclesOpacity=Math.max(recyclesOpacity,old.density,v.density);assert(Math.max(old.density,v.density)<.012);return;}
          diff('vaporX',v.x-old.x);diff('vaporRadius',v.radius-old.radius);diff('vaporWater',v.water-old.water);
          opacity.push(v.density-old.density);diff('vaporDensity',opacity.at(-1));
        });
        if(Math.max(...opacity.map(Math.abs))>1e-6){counts.vapor=(counts.vapor||0)+1;if(span(opacity)<1e-9)uniform.vapor=(uniform.vapor||0)+1;}
      }
    }
    previous=s;
    if(hold!==null&&s.cycle===1&&!s.opening){clock.ready=t;break;}
  }
  for(const [key,val] of Object.entries(peak))peak[key]=fx(val);
  for(const [key,val] of Object.entries(amp))amp[key]=fx(val);
  assert.equal(Object.values(uniform).reduce((a,b)=>a+b,0),0,'active regions are moving in lockstep');
  assert(peak.wave<.025 && peak.vaporDensity<.079);
  const ambient={waveRmsChange:fx(rms(last.waves.map((w,i)=>w.h-first.waves[i].h))),windStart:fx(first.wind),windEnd:fx(last.wind),lampStart:fx(first.lamp),lampEnd:fx(last.lamp),vapor0XStart:fx(first.vapor[0].x),vapor0XEnd:fx(last.vapor[0].x)};
  if(hold===null){
    assert.equal(last.phase,'pad');assert.equal(last.thrust,0);assert.equal(last.altitude,0);assert(ambient.waveRmsChange>.015);assert(rebirths>50);assert(clock.hint>=4&&clock.hint<4.1);
  }else{
    assert(last.cycle===1&&last.phase==='pad'&&!last.opening);
    assert(events.upper<events.deploy&&events.deploy<events.sunrise&&events.sunrise<events.return);
    assert(clock.outerPanel>clock.panel);assert(amp.lookDown>.99);
    assert(peak.altitude<5&&peak.velocity<1.9&&peak.wing<.085&&peak.fairing<.09&&peak.lever<.18);
    assert(sim.press(),'automatic return must re-arm the control');
  }
  return {name,hold,clock,events,amp,peak,stageMass,maxRawReset,counts,uniform,rebirths,recyclesOpacity:fx(recyclesOpacity),ambient,at};
}
runs.push(run('idle',null),run('short',.2),run('long',2));
const [idle,short,long]=runs;
assert(long.clock.liftoff<short.clock.liftoff);
assert(long.at[2].thrust>short.at[2].thrust*1.90);
assert(long.at[5].altitude>short.at[5].altitude+5);
assert(long.at[5].mass<short.at[5].mass);
assert(Math.abs(short.at[5].valve-.5)<.0001);
assert(Math.abs(long.amp.thrust/(1100*9.81)-1.4)<.001);
// Exact same seed, integrated using different caller frame rates.
for(const hz of [20,60,120]){
  const sim=createSimulation();for(let i=0;i<hz*10;i++)sim.step(1/hz);
  assert(Math.abs(sim.state.wind-idle.ambient.windEnd)<.00001);
  assert(sim.state.waves.every((w,i)=>Math.abs(w.h-idle.at[10].wave[i])<.00001));
}
// Captured touch may be released at any instant, including before a physics tick.
for(const h of [0,solve,.85,1.4,1.98,3]){
  const sim=createSimulation();assert(sim.press());sim.step(h);sim.release();
  for(let i=0;i<1200&&!sim.state.cycle;i++)sim.step(dt);
  assert(sim.state.cycle===1 && sim.state.hold<=2);
}
fs.writeFileSync(path.join(__dirname,'state-trace.csv.gz'),zlib.gzipSync([cols.join(','),...rows].join('\n')+'\n',{level:9}));
const summary={sampleSeconds:dt,solverSeconds:solve,samples:rows.length,runs};
fs.writeFileSync(path.join(__dirname,'measurements.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({samples:rows.length,runs:runs.map(r=>({run:r.name,events:r.events,liftoff:r.clock.liftoff,nonuniformIntervals:r.counts,maxAltitudeStep:r.peak.altitude,maxWaveStep:r.peak.wave}))},null,2));
