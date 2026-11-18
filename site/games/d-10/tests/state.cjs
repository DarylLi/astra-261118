// node games/d-10/tests/state.cjs — simulation only, no DOM, no WebGL context.
'use strict';
const fs=require('node:fs'), path=require('node:path'), vm=require('node:vm'), zlib=require('node:zlib'), assert=require('node:assert/strict');
const dir=path.resolve(__dirname,'..'),source=f=>fs.readFileSync(path.join(dir,f),'utf8'),H=.05;
function load(width,height){
 const ctx=vm.createContext({innerWidth:width,innerHeight:height});vm.runInContext(source('vendor/three.min.js'),ctx);vm.runInContext(source('simulation.js'),ctx);return ctx.ToyGarden;
}
const wide=load(1180,820),portrait=load(390,844),rows=[],summary={},max={ball:0,block:0,band:0,flag:0,bend:0,wet:0,dew:0,mote:0,balloon:0,lift:0,rotation:0};
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const peak=(key,n)=>{assert.ok(Number.isFinite(n),key);max[key]=Math.max(max[key],n);};
let uniform=0,compared=0;
function compareSections(ds){
 if(ds.some(d=>Math.abs(d)>1e-8)){compared++;if(Math.max(...ds)-Math.min(...ds)<1e-10)uniform++;}
}
function audit(before,after){
 for(const prop of ['bend','wet','drop']){
  const ds=after.cells.map((c,i)=>c[prop]-before.cells[i][prop]);ds.forEach(d=>peak(prop==='drop'?'dew':prop,Math.abs(d)));
  compareSections(ds);
 }
 const flagBefore=before.flags.flat();compareSections(after.flags.flat().map((a,i)=>a-flagBefore[i]));
 compareSections(after.motes.map((p,i)=>distance(p,before.motes[i])));
 compareSections(after.bands.flatMap((row,i)=>row.map((p,j)=>distance(p,before.bands[i][j]))));
 after.flags.forEach((row,i)=>row.forEach((a,j)=>peak('flag',Math.abs(a-before.flags[i][j]))));
 after.motes.forEach((p,i)=>peak('mote',distance(p,before.motes[i])));
 after.bands.forEach((row,i)=>row.forEach((p,j)=>peak('band',distance(p,before.bands[i][j]))));
 if(before.round!==after.round)return; // Spent bodies retire underground. New bodies have a new round id.
 const old=[before.ball,...before.spent].filter(Boolean);for(const b of [after.ball,...after.spent].filter(Boolean)){const prev=old.find(a=>a.id===b.id);if(prev)peak('ball',distance(b.p,prev.p));}
 compareSections(after.balloons.map((b,i)=>distance(b.p,before.balloons[i].p)));
 compareSections(after.blocks.map((b,i)=>distance(b.p,before.blocks[i].p)));
 after.balloons.forEach((b,i)=>peak('balloon',distance(b.p,before.balloons[i].p)));
 after.sections.forEach((s,i)=>peak('lift',Math.abs(s-before.sections[i])));
 after.blocks.forEach((b,i)=>{
  const last=before.blocks[i];peak('block',distance(b.p,last.p));const dot=Math.abs(b.q.reduce((s,q,j)=>s+q*last.q[j],0));peak('rotation',2*Math.acos(Math.min(1,dot)));
 });
}
function trial(name,config){
 const w=new config.Garden(4281);let last=w.getState();
 function record(s){rows.push(JSON.stringify({trial:name,...s},(k,v)=>typeof v==='number'?Number(v.toFixed(6)):v));}
 record(last);
 function sample(){w.step(H);const s=w.getState();audit(last,s);record(s);last=s;return s;}
 return {w,sample};
}
{
 const {w,sample}=trial('idle-10s',wide),first=w.getState();let guideAt=0;
 for(let i=0;i<200;i++){const s=sample();if(!guideAt&&s.guide.alpha>.001)guideAt=s.time;}
 const s=w.getState(),delta=(key)=>s.cells.map((c,i)=>c[key]-first.cells[i][key]);
 summary.idle={guideAt,windRange:[Math.min(...s.cells.map(c=>c.wind)),Math.max(...s.cells.map(c=>c.wind))],bendSpread:Math.max(...delta('bend'))-Math.min(...delta('bend')),moistureRange:[Math.min(...delta('wet')),Math.max(...delta('wet'))],maxFlag:Math.max(...s.flags.flat().map((a,i)=>Math.abs(a-first.flags.flat()[i]))),moteTravel:Math.max(...s.motes.map((m,i)=>distance(m,first.motes[i]))),dewSlide:Math.max(...s.cells.map(c=>c.drop))*.018};
 assert.ok(guideAt>=4&&guideAt<4.1);assert.ok(summary.idle.bendSpread>.005&&summary.idle.moteTravel>.1);assert.equal(s.stage,0);assert.equal(s.mode,'ready');assert.ok(s.blocks.every(b=>b.sleep));
}
function pull(w,sample,len){
 assert.equal(w.grab(),true);for(let i=1;i<=10;i++){w.drag(len*i/10,0);sample();}const loaded=w.pouch().toArray();assert.equal(w.release(),true);return loaded;
}
for(const length of [.12,.30]){
 const {w,sample}=trial('pull-'+length,wide),launch= pull(w,sample,length);
 const start=w.time,initial=w.getState(),speed=initial.speed;let hit=0,end=0,ringMin=0,furthest=0;
 for(let i=0;i<220;i++){
  const s=sample();ringMin=Math.min(ringMin,s.ring);if(!hit&&w.hit)hit=w.time-start;
  const ball=s.ball||s.spent[0];if(ball)furthest=Math.max(furthest,distance(ball.p,launch));
  const broken=s.blocks.slice(0,7);if(hit&&!end&&broken.every(b=>b.sleep))end=w.time-start;
 }
 const s=w.getState(),top=6;
 summary['pull'+length]={speed,impact:hit,allRest:end,travel:furthest,roofDrop:initial.blocks[top].p[1]-s.blocks[top].p[1],ringOvershoot:-ringMin,lift:s.sections[1]+.103,elasticEnergy:40*length*length};
 assert.equal(w.stage,1);assert.ok(Math.abs(speed-length*20)<1e-8);assert.ok(hit>0&&end>hit);assert.ok(s.blocks.slice(0,7).every(b=>b.sleep));assert.ok(summary['pull'+length].roofDrop>.45);
}
assert.ok(summary['pull0.12'].impact>summary['pull0.3'].impact);
function cycle(config,name,len){
 const {w,sample}=trial(name,config),release=[],base=[],climb=[],impacts=[];
 for(let stage=0;stage<3;stage++){
  assert.equal(w.stage,stage);pull(w,sample,len);const t=w.time;let hit=false;
  for(let i=0;i<300;i++){const s=sample();if(!hit&&w.hit){hit=true;impacts.push(w.time-t);}if(s.mode==='ready'||s.mode==='reward')break;}
  assert.ok(hit);assert.equal(w.mode,stage===2?'reward':'ready');
 }
 const rewardAt=w.time;let nextReady=0,peakFlag=0;
 for(let i=0;i<250;i++){
  const s=sample();if(s.round===0){s.balloons.forEach((b,j)=>{
   if(b.free&&release[j]===undefined){release[j]=w.time-rewardAt;base[j]=b.p[1];}
   if(b.free)climb[j]=b.p[1]-base[j];
  });peakFlag=Math.max(peakFlag,...s.flags.flat().map(Math.abs));}
  if(s.round===1&&s.mode==='ready'){nextReady=w.time-rewardAt;break;}
 }
 assert.equal(release.length,3);assert.ok(release[1]>release[0]&&release[2]>release[1]);assert.equal(w.stage,0);assert.ok(nextReady>6);assert.ok(w.grab());w.cancel();
 return {impacts,release,climb,nextReady,peakFlag};
}
summary.landscape=cycle(wide,'cycle-landscape',.30);
summary.portrait=cycle(portrait,'cycle-portrait',.012);
assert.equal(uniform,0);assert.ok(max.bend<.1&&max.flag<.14&&max.mote<.02);
assert.ok(max.ball<.33&&max.block<.26&&max.band<.25&&max.balloon<.09&&max.rotation<2.5,JSON.stringify(max));
summary.adjacent=max;summary.uniform={uniform,compared};summary.samples=rows.length;
fs.writeFileSync(path.join(__dirname,'state-005s.ndjson.gz'),zlib.gzipSync(rows.join('\n')+'\n',{level:9}));
console.log(JSON.stringify(summary,(k,v)=>typeof v==='number'?Number(v.toFixed(5)):v,2));
