'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {gzipSync}=require('node:zlib');
const {create,field}=require('../physics.js');
const DT=.05, runs=[], deltas={part:0,magnet:0,can:0,robot:0,arm:0,dust:0,leaf:0,water:0,guide:0,tab:0};
let uniform=0, comparisons=0;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const max=(list,fn)=>Math.max(...list.map(fn));
function trace(name,model=create()){
  const frames=[model.getState()],events=[];
  const r={name,frames,events};runs.push(r);
  function advance(steps){
    for(let i=0;i<steps;i++){
      model.step(DT);const s=model.getState();frames.push(s);
      assert(Math.abs(s.time-(frames.length-1)*DT)<1e-9);
      events.push(...model.drainEvents().map(e=>({...e,time:s.time})));
    }
  }
  return {model,frames,advance,events};
}
function inspect(t){
  const high=(key,v)=>{assert(Number.isFinite(v));deltas[key]=Math.max(deltas[key],Math.abs(v));};
  for(let i=1;i<t.frames.length;i++){
    const a=t.frames[i-1],b=t.frames[i];
    high('magnet',dist(a.magnet,b.magnet));high('guide',dist(a.guide,b.guide));high('robot',b.robot.x-a.robot.x);
    for(const [key,prop,fn] of [
      ['part','parts',dist],['can','cans',(a,b)=>b.depth-a.depth],['tab','cans',(a,b)=>b.tabAngle-a.tabAngle],
      ['dust','dust',dist],['leaf','leaves',(a,b)=>b.a-a.a],['water','water',(a,b)=>b.h-a.h],
      ['arm','joints',(a,b)=>b.a-a.a],['tilt','parts',(a,b)=>b.tilt-a.tilt]]){
      const src=prop==='joints'?a.robot:a,dst=prop==='joints'?b.robot:b;
      const changes=src[prop].map((p,j)=>fn(p,dst[prop][j]));
      if(key!=='tilt')changes.forEach(d=>high(key,d));
      // Ignore settled groups. Equal non-zero changes across every section are suspect.
      if(changes.length>1&&max(changes,Math.abs)>1e-8){
        comparisons++;
        if(Math.max(...changes)-Math.min(...changes)<1e-11)uniform++;
      }
    }
  }
}
const idle=trace('idle-10s');idle.advance(200);
const first=idle.frames[0],last=idle.frames.at(-1);
const dustTravel=max(last.dust,(p,i)=>dist(p,first.dust[i]));
const water=max(idle.frames,s=>max(s.water,p=>Math.abs(p.h)));
const leaf=max(idle.frames,s=>max(s.leaves,p=>Math.abs(p.a)));
const tilt=max(idle.frames,s=>max(s.parts,p=>Math.abs(p.tilt)));
const sway=max(idle.frames,s=>Math.abs(s.magnet.x-first.magnet.x));
const hint=idle.frames.find(s=>s.guide.visible>0);
assert(dustTravel>.005&&water>.00005&&leaf>.01&&tilt>.0001&&sway>.0001);
assert(hint.time>=3.99&&hint.time<4.06);
assert(last.parts.every(p=>p.mode==='table')&&last.phase==='collect');
function pull(strength){
  const t=trace('field-'+strength,create({strength}));
  t.model.grab();t.advance(20);return t;
}
const weak=pull(.10),normal=pull(.20);
assert.deepEqual({...weak.frames[0],strength:.20},normal.frames[0]);
assert.equal(field(.02,.2),field(.04,.2));assert(Math.abs(field(.08,.2)*4-field(.04,.2))<1e-10);
const latch=t=>t.events.find(e=>e.type==='attach').time;
assert(latch(normal)<latch(weak));
const pair=max(normal.frames,(s,i)=>max(s.parts,(p,j)=>dist(p,weak.frames[i].parts[j])));
assert(pair>.008);
function weigh(mass){
  const m=create(),p=m.state.parts[8];p.id=0;p.mass=mass;p.x=m.state.magnet.x-.045;p.z=m.state.magnet.z;
  m.state.parts=[p];
  const t=trace('matched-mass-'+mass,m);m.grab();t.advance(24);return t;
}
const light=weigh(.004),heavy=weigh(.012);assert(latch(light)<latch(heavy));
const play=trace('collect-reward-restart');
for(let trip=0;trip<2;trip++){
  assert(play.model.grab());
  play.model.point(trip===0?-.043:.106,trip===0?-.035:-.05);play.advance(35);
  // The first release happens while the magnet is still travelling to the can.
  play.model.point(0,.17);play.advance(trip===0?1:16);play.model.release();play.advance(30);
}
play.advance(240);
const stages=[...new Set(play.frames.map(s=>s.phase))];
assert.deepEqual(stages,['collect','receive','walk','reset']);
const settled=play.frames.at(-1);
assert.equal(settled.cycle,1);assert.equal(settled.phase,'collect');
assert(settled.cans.every(c=>c.count===0));assert(settled.parts.every(p=>p.mode==='table'));
const clanks=play.events.filter(e=>e.type==='clank');
assert.equal(clanks.length,4);assert.equal(play.events.filter(e=>e.type==='receive').length,4);
const canDepth=max(play.frames,s=>s.cans[1].depth);
const stride=max(play.frames,s=>s.robot.x);
const arm=max(play.frames,s=>Math.abs(s.robot.joints[3].a));
const tab=max(play.frames,s=>s.cans[1].tabAngle);
const dropHeight=max(play.frames,s=>max(s.parts,p=>p.mode==='drop'?p.y:0));
assert(canDepth>.003&&stride>.045&&arm>.40&&tab>.30&&dropHeight>.05);
const quiet=trace('release-over-wood');
quiet.model.grab();quiet.advance(20);quiet.model.release();quiet.advance(40);
assert.equal(quiet.frames.at(-1).parts.filter(p=>p.mode==='held').length,2);
assert.equal(quiet.events.filter(e=>e.type==='clank').length,0);
for(const run of runs)inspect(run);
assert.equal(uniform,0);
for(const [key,limit] of Object.entries({part:.10,magnet:.035,can:.009,robot:.004,arm:.51,dust:.002,leaf:.035,water:.0004,guide:.035,tab:.40})){
  assert(deltas[key]<limit,key+' jumped by '+deltas[key]);
}
// Integration must agree for the same inputs split across different render rates.
const a=create(),b=create();a.grab();b.grab();a.step(1);for(let i=0;i<120;i++)b.step(1/120);
assert.deepEqual(a.getState(),b.getState());
const file=path.join(__dirname,'samples.ndjson.gz');
const lines=runs.flatMap(t=>t.frames.map((s,i)=>JSON.stringify({run:t.name,sample:i,state:s})));
fs.writeFileSync(file,gzipSync(lines.join('\n')+'\n',{level:9}));
console.log(JSON.stringify({sampleInterval_s:DT,frames:lines.length,comparisons,uniform,guideStart_s:hint.time,
  idleDust_m:dustTravel,idleWater_m:water,idleLeaf_rad:leaf,idleTilt_rad:tilt,idleSway_m:sway,
  firstLatch_s:{weak:latch(weak),normal:latch(normal),light:latch(light),heavy:latch(heavy)},fieldDifference_m:pair,
  dropHeight_m:dropHeight,clanks:clanks.length,canDepth_m:canDepth,tab_rad:tab,robotTravel_m:stride,robotArm_rad:arm,
  reset_s:play.frames.find(s=>s.cycle===1).time,maxDelta:deltas},null,2));
