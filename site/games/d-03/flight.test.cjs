'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('./flight.js');
const deg = radians => radians*180/Math.PI;
const rms = values => Math.sqrt(values.reduce((sum,v)=>sum+v*v,0)/values.length);
const meter = (name, values) => console.log(name, JSON.stringify(values));
const frame = 1/60;

test('10 seconds without a pointer advances flight, local air, water, dust and the demonstration', () => {
  const game = F.create(), st = game.getState(), originalWater = st.waves.slice();
  const originalBasket = st.balloons[1].basketTilt, originalHinge = st.plane.aileron;
  const tracer=st.thermals[0].tracers.reduce((a,b)=>a.height<b.height?a:b);
  const initialThermalHeight=tracer.height;
  const dustStart=st.seeds[0].x;
  game.step(1);
  const dustDrift=st.seeds[0].x-dustStart;
  game.step(3);
  assert.equal(st.guide.amount,0);
  game.step(frame);
  const demoStart=st.elapsed;
  assert.ok(st.guide.amount>0);
  game.step(6-frame);
  assert.ok(Math.abs(st.elapsed-10)<1e-9);
  assert.equal(st.plane.speed,12);
  assert.ok(st.plane.s>119.9 && st.plane.s<=120);
  const diff=st.waves.map((v,k)=>v-originalWater[k]);
  assert.ok(rms(diff)>.005 && rms(diff)<.08);
  assert.ok(Math.abs(st.balloons[1].basketTilt-originalBasket)>.0001);
  assert.ok(Math.abs(st.plane.aileron-originalHinge)>.001);
  assert.ok(Math.abs(dustDrift)>.001);
  assert.ok(st.guide.amount>.99 && st.guide.stroke>0);
  meter('idle',{seconds:st.elapsed,advance_m:st.plane.s,altitude_m:st.plane.y,wave_delta_rms_mm:rms(diff)*1000,
    dust_1s_x_mm:dustDrift*1000,basket_deg:deg(st.balloons[1].basketTilt),aileron_deg:deg(st.plane.aileron),
    tracer_rise_m:tracer.height-initialThermalHeight,guide_start_s:demoStart});
});

test('only the column count changes in the thermal comparison',()=>{
  const runs=[0,1,6].map(thermalCount=>F.create({seed:7031,thermalCount}));
  function comparable(g){
    const {thermals,...rest}=g.getState();
    return rest;
  }
  assert.deepEqual(comparable(runs[0]),comparable(runs[1]));
  assert.deepEqual(comparable(runs[0]),comparable(runs[2]));
  for(const g of runs)g.step(10);
  const altitudes=runs.map(g=>g.getState().plane.y);
  assert.ok(altitudes[1]>altitudes[0]+3 && altitudes[2]>altitudes[1]);
  assert.ok(runs.every(g=>g.getState().plane.s===runs[0].getState().plane.s));
  meter('thermals',{count:[0,1,6],altitude_m:altitudes,difference_6_minus_0_m:altitudes[2]-altitudes[0]});
});

test('angular speed builds with inertia, stays inside the limits and decays after release',()=>{
  const game=F.create(),p=game.getState().plane;
  game.touch(1,1);
  game.step(frame);
  const startRoll=deg(p.roll),startPitch=deg(p.pitch);
  assert.ok(Math.abs(startRoll)<4 && startPitch<.1);
  let maxRoll=0,maxPitch=0;
  for(let i=1;i<240;i++){
    game.step(frame);maxRoll=Math.max(maxRoll,Math.abs(deg(p.roll)));maxPitch=Math.max(maxPitch,Math.abs(deg(p.pitch)));
    assert.ok(Math.abs(deg(p.roll))<=35.00001 && Math.abs(deg(p.pitch))<=15.00001);
  }
  assert.ok(maxRoll>34.9 && maxPitch>14.9);
  game.release();game.step(frame);
  assert.ok(Math.abs(deg(p.roll))>33);
  game.step(3-frame);
  assert.ok(Math.abs(deg(p.roll))<.1 && Math.abs(deg(p.pitch))<.1);
  meter('inertia',{initial_frame_deg:[startRoll,startPitch],peak_deg:[maxRoll,maxPitch],
    release_after_3s_deg:[deg(p.roll),deg(p.pitch)]});
});

test('the same angle of attack gives four times the lift at double speed',()=>{
  const liftAt = v=>{
    const g=F.create();
    g.getState().plane.speed=v;g.step(frame);return g.getState().plane.lift;
  };
  const f6=liftAt(6),f12=liftAt(12);
  assert.ok(Math.abs(f12/f6-4)<1e-9);
  meter('lift',{six_mps_N:f6,twelve_mps_N:f12});
});

test('a long external step and subdivided steps produce the same history',()=>{
  const a=F.create(),b=F.create();a.step(10);
  for(let i=0;i<300;i++)b.step(1/30);
  assert.deepEqual(a.getState(),b.getState());
});

for(const [width,height] of [[390,844],[1180,820]]) {
  test('one continuous balloon touch completes the reward and reset at '+width+'×'+height,()=>{
    const game=F.create({spread:Math.min(1,.35+width/height*.57)});
    game.touch(0,0,true);
    let lastPhase='flight',peakHeat=0,peakSway=0,firstVisit=0,waveMin=Infinity,waveMax=-Infinity;
    const phases={},visited=new Set(),sunStart=game.getState().light.elevation;
    for(let i=0;i<60*200;i++){
      game.step(frame);const st=game.getState(),b=st.balloons[0];
      if(b.visited && !firstVisit)firstVisit=st.elapsed;
      if(b.visited && b.visitAge<4){peakHeat=Math.max(peakHeat,b.glow);peakSway=Math.max(peakSway,Math.abs(b.sway));}
      st.balloons.forEach(o=>{if(o.visited)visited.add(o.id);});
      if(st.phase==='meadow'){waveMin=Math.min(waveMin,st.family.arms[0].angle);waveMax=Math.max(waveMax,st.family.arms[0].angle);}
      if(st.phase!==lastPhase) {
        phases[st.phase]={time:(i+1)*frame,altitude:st.plane.y,speed:st.plane.speed,sun:deg(st.light.elevation),gold:st.light.gold};
        lastPhase=st.phase;
        if(st.phase==='sunrise')assert.equal(st.count,20);
        if(st.phase==='meadow'){
          assert.equal(st.plane.speed,0);assert.equal(st.plane.lift,0);
          assert.ok(Math.abs(st.plane.y-F.terrain(st.plane.x,st.plane.s)-.68)<1e-8);
        }
      }
      if(st.cycle>0){assert.equal(st.count,0);assert.equal(st.phase,'flight');break;}
    }
    assert.equal(visited.size,20);assert.deepEqual(Object.keys(phases),['sunrise','landing','meadow','flight']);
    assert.ok(peakHeat>1 && peakSway>.07);
    assert.ok(phases.meadow.sun>deg(sunStart)+6 && phases.meadow.gold>.99);
    assert.ok(waveMax-waveMin>.5);
    meter(width+'x'+height,{first_visit_s:firstVisit,first_burner_peak:peakHeat,first_sway_deg:deg(peakSway),
      phases,solar_start_deg:deg(sunStart),family_wave_deg:[deg(waveMin),deg(waveMax)]});
  });
}
