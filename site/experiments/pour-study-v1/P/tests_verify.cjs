'use strict';
// node games/pour-study-v1/verify.cjs [output.csv]
// Scene units for length, scene units³/s for flow, normalized material parameters.
const {createStudy}=require('./simulation.js');
const {writeFileSync}=require('node:fs');
const {join}=require('node:path');
const assert=require('node:assert/strict');

const interval=0.05;
const metrics=['radius','thickness','flow','circularity','gloss','solidFraction','bubbleCount'];
const extras=['peakThickness','edgeTemp','coreTemp','centerX','centerZ','impactSpeed','breaks','pops','remaining','inFlight','atContact','deposited'];
const deltaNames=metrics.map(k=>'delta_'+k);
const rows=[['tilt','height','x','z','seconds','stage','batch','reset',...metrics,...deltaNames,...extras].join(',')];
const maxDelta=Object.fromEntries(metrics.map(k=>[k,0]));
const cases=[];
let maxBalanceError=0,maxGridError=0,reference;
function numeric(v){return typeof v==='number'?Number(v.toFixed(8)):v??'';}

for(const tilt of [0.32,0.85])for(const height of [0.15,0.85])for(const x of [-0.56,0.56]){
  const z=x*0.6,sim=createStudy(),record={tilt,height,x,z,peakFlow:0,peakBubbles:0,firstBubble:null};
  const trace=[],ref=tilt===0.85 && height===0.85 && x<0;
  let probes,localBefore,localAfter,strand,prev=sim.getState();
  sim.control({tilt,height,x,z});
  for(let tick=0;tick<=300;tick++){
    if(tick===41)sim.control({tilt:0}); // release immediately after the 2.00 s observation
    if(tick)sim.step(interval);
    const s=sim.getState(),v=sim.view(),reset=s.batch!==prev.batch;
    const deltas=metrics.map(k=>s[k]===null||prev[k]===null?null:s[k]-prev[k]);
    rows.push([tilt,height,x,z,tick*interval,s.stage,s.batch,Number(reset),...metrics.map(k=>s[k]),...deltas,...extras.map(k=>s[k])].map(numeric).join(','));
    metrics.forEach((k,i)=>{
      if(deltas[i]!==null && !reset)maxDelta[k]=Math.max(maxDelta[k],Math.abs(deltas[i]));
      assert.ok(s[k]===null||Number.isFinite(s[k]),k);
    });
    maxBalanceError=Math.max(maxBalanceError,Math.abs(s.remaining+s.inFlight+s.atContact+s.deposited-sim.LOAD));
    const gridVolume=v.h.reduce((sum,h)=>sum+h,0)*sim.DX**2;
    maxGridError=Math.max(maxGridError,Math.abs(gridVolume-s.deposited));
    assert.ok(s.solidFraction>=0 && s.solidFraction<=1 && s.gloss>=0 && s.gloss<=1);
    record.peakFlow=Math.max(record.peakFlow,s.flow);
    record.peakBubbles=Math.max(record.peakBubbles,s.bubbleCount);
    if(s.bubbleCount && record.firstBubble===null)record.firstBubble=tick*interval;
    if(tick===20 && ref){
      const sample=p=>({speed:-p.vy,radius:p.r});
      strand={lip:sample(v.particles.at(-1)),bottom:sample(v.particles[0])};
    }
    if(tick===40){
      Object.assign(record,{radius2:s.radius,impact2:s.impactSpeed,centerX:s.centerX,centerZ:s.centerZ});
      const center=Math.round(sim.MID+s.centerX/sim.DX)+sim.N*Math.round(sim.MID+s.centerZ/sim.DX);
      probes=[center,center+Math.round(s.radius*0.80/sim.DX),center+Math.round(s.radius*0.94/sim.DX)];
    }
    if(tick===40||tick===41){
      const local=probes.map(k=>({h:v.h[k],set:v.set[k],heat:v.heat[k]}));
      if(tick===40)localBefore=local;else localAfter=local;
    }
    if(tick===130)Object.assign(record,{radius:s.radius,circularity:s.circularity,solid:s.solidFraction,breaks:s.breaks});
    if(s.batch===0)record.pops=s.pops;
    trace.push(s);prev=s;
    if(s.stage==='ready' && s.batch===1){record.returnTime=tick*interval;break;}
  }
  assert.ok(record.returnTime && record.firstBubble && record.pops>0);
  assert.ok(record.radius>0.6 && record.circularity>0.65 && record.circularity<0.995);
  assert.ok(trace[42].flow>0 && trace[48].flow<trace[42].flow);
  assert.ok(trace[40].edgeTemp>trace[40].coreTemp+0.18);
  assert.ok(Math.abs(trace[130].radius-trace[120].radius)<0.003);
  if(ref)reference={record,trace,localBefore,localAfter,strand};
  cases.push(record);
}
assert.ok(maxBalanceError<1e-10 && maxGridError<1e-10);
// Limits are per 50 ms, inside one batch. Creation of a contour has no prior
// circularity. The off-camera replacement is explicitly marked in the CSV.
for(const [k,limit] of Object.entries({radius:0.16,thickness:0.05,flow:0.05,circularity:0.25,gloss:0.025,solidFraction:0.035,bubbleCount:8})){
  assert.ok(maxDelta[k]<limit,k+' delta '+maxDelta[k]);
}
for(const r of cases){
  const match=(key,value)=>cases.find(b=>b[key]===value&&['tilt','height','x'].every(k=>k===key||b[k]===r[k]));
  if(r.tilt===0.32){const fast=match('tilt',0.85);assert.ok(fast.peakFlow>r.peakFlow*1.8 && fast.radius>r.radius+0.18);}
  if(r.height===0.15){const high=match('height',0.85);assert.ok(high.impact2>r.impact2+1 && high.breaks>r.breaks);}
  if(r.x<0){const right=match('x',0.56);assert.ok(right.centerX>r.centerX+0.5 && right.centerZ>r.centerZ+0.2);}
}
const {trace,localBefore,localAfter,strand}=reference;
const relativeThickness=localAfter.map((v,i)=>(v.h-localBefore[i].h)/localBefore[i].h);
const localSetChange=localAfter.map((v,i)=>v.set-localBefore[i].set);
assert.ok(Math.max(...relativeThickness)-Math.min(...relativeThickness)>0.04);
assert.ok(Math.max(...localSetChange)-Math.min(...localSetChange)>0.002);
assert.ok(strand.bottom.speed>strand.lip.speed && strand.bottom.radius<strand.lip.radius);
const output=process.argv[2]||join(__dirname,'measurements.csv');
writeFileSync(output,rows.join('\n')+'\n');
console.table(cases.map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k,numeric(v)]))));
console.log(JSON.stringify({samples:rows.length-1,maxDelta,maxBalanceError,maxGridError,
  reference:{strand,relativeThickness,localSetChange,localBefore,localAfter,
    snapshots:[10,12,20,40,42,48,65,80,100,120,130,150].map(tick=>({s:tick/20,...Object.fromEntries([...metrics,...extras].map(k=>[k,numeric(trace[tick][k])]))}))}},null,2));
