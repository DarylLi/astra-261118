'use strict';
const assert = require('node:assert/strict');
const P = require('./physics.js');
const dt = 1 / 120;
function run(seconds, fn) {
  for (let i = 0; i < Math.round(seconds / dt); i++) fn(dt, i * dt);
}
const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
const round = n => Number(n.toFixed(3));
const mixCases = [0, 4].map(force => {
  const b = P.bowl();
  run(5, (d,t) => P.mix(b, d, force, t * force));
  return {dry: round(mean(b.zones.map(z=>z.dry))), viscosity: round(b.viscosity)};
});
assert.ok(mixCases[1].dry < mixCases[0].dry * 0.1);
console.log('mix, 5 s, rest/stir', mixCases);
function pourCase(v) {
  const c = P.cake(v), l = P.ladle();
  run(1, d => { P.pour(c,l,d,true); P.spread(c,d); });
  const before = c.volume;
  run(1, d => { P.pour(c,l,d,false); P.spread(c,d); });
  return {radius: round(c.radius), tail: round(c.volume-before)};
}
const pours = [0.8, 1.8].map(pourCase);
assert.ok(pours[0].radius > pours[1].radius && pours.every(p => p.tail > 0));
console.log('pour, viscosity 0.8 / 1.8, cm and mL', pours);
function standard(v=1.2,x=0) {
  const c=P.cake(v,x);
  c.volume=54;
  c.radius=Math.sqrt(c.volume/(Math.PI*(0.44+0.16*v)));
  P.spread(c,dt);
  return c;
}
function cookCase(power=1,v=1.2,x=0) {
  const c=standard(v,x), out={};
  run(22,(d,t)=>{
    P.heat(c,d,power);
    const b=P.meanFace(c,'brown',0);
    if (!out.gold && b>=0.15) out.gold=round(t+d);
    if (!out.dark && b>=0.72) out.dark=round(t+d);
    if (Math.round(t/d)===479) out.at4=round(b);
    if (Math.round(t/d)===1199) {
      out.at10=round(b);
      out.births=c.cells.reduce((s,q)=>s+q.births,0);
      out.pops=c.cells.reduce((s,q)=>s+q.pops,0);
      out.rise=round(mean(c.cells.map(q=>q.rise)));
    }
  });
  return out;
}
const normal=cookCase(), low=cookCase(0.78), thick=cookCase(1,1.8), offset=cookCase(1,1.2,2.4);
console.log('bake, mid/low/thick/off-centre', normal,low,thick,offset);
assert.ok(normal.at10>low.at10 && normal.at10>thick.at10 && normal.at10>offset.at10);
assert.ok(normal.births>normal.pops && normal.pops>0);
assert.ok(normal.at4<0.015 && Math.abs(normal.gold-8)<1 && Math.abs(normal.dark-15)<1);
const flipped=standard();
run(9,d=>P.heat(flipped,d));
const beforeFlip=P.meanFace(flipped,'brown',0), beforeRise=mean(flipped.cells.map(q=>q.rise));
P.flip(flipped);
assert.equal(beforeFlip,P.meanFace(flipped,'brown',0));
run(5,d=>P.heat(flipped,d));
console.log('flip, face 0 before / after 5 s, face 1, rise cm before / after',
  [beforeFlip,P.meanFace(flipped,'brown',0),P.meanFace(flipped,'brown',1),beforeRise,mean(flipped.cells.map(q=>q.rise))].map(round));
assert.ok(mean(flipped.cells.map(q=>q.rise))>=beforeRise && P.meanFace(flipped,'brown',1)>0);
function meltCase(warm) {
  const c=standard(), pat=P.butter();
  if (warm) {run(12,d=>P.heat(c,d)); P.flip(c);}
  run(10,d=>{ P.heat(c,d,0,false); P.melt(pat,c,d); });
  return round(mean(pat.map(p=>p.film))*100);
}
const hot=meltCase(true),cold=meltCase(false);
console.log('butter 10 s, hot/cold %',hot,cold);
assert.ok(hot>cold && cold===0);
const syrup=P.syrup();
run(1,d=>P.drizzle(syrup,d,true,2,flipped));
const released=syrup.volume;
run(2,d=>P.drizzle(syrup,d,false,2,flipped));
console.log('syrup, tail over 2 s, rim mL',round(syrup.volume-released),round(syrup.rim.reduce((a,b)=>a+b,0)));
assert.ok(syrup.volume>released && syrup.rim[2]>0);
const createKitchen=require('./game.js');
function makeRound(under=false) {
  const game=createKitchen();
  const state=()=>game.getState();
  const tap=(x=0,z=0,object='',layer)=>{game.down(x,z,object,layer);game.up();};
  // A five-year-old can complete the entire round with holds and taps.
  game.down();game.step(4.6);game.up();
  assert.equal(state().phase,'pour');
  let s=state(), cakeIds=[],idle=null;
  for(let i=0;i<3;i++){
    const x=[0,.56,-.45][i];
    game.down(x,0);game.step(2.65);game.up();
    assert.equal(state().phase,'cook');
    const before=state();game.step(10);
    s=state();assert.ok(s.cake.cells.some(q=>q.pops>0));
    const b=P.meanFace(s.cake,'brown',0);
    if(!i)idle={before:round(P.meanFace(before.cake,'brown',0)),after:round(b),
      births:s.cake.cells.reduce((v,q)=>v+q.births,0),pops:s.cake.cells.reduce((v,q)=>v+q.pops,0)};
    tap();game.step(.7);assert.equal(state().phase,'second');
    game.step(2+i);tap(0,0,'',under?0:undefined);game.step(1);
    cakeIds.push(s.cake.id);
  }
  s=state();assert.equal(s.phase,'butter');
  const order=s.stack.map(c=>c.id);
  assert.deepEqual(order,under?cakeIds.reverse():cakeIds);
  tap();game.step(3);
  const melted=mean(state().butter.map(b=>b.film));
  game.down();game.step(1);game.up();game.step(1);
  assert.equal(state().phase,'berry');
  tap();game.step(9);assert.equal(state().phase,'wash');
  game.down();game.step(4.4);game.up();
  assert.equal(state().phase,'mix');
  return {idle,order,melted:round(melted*100)};
}
const onTop=makeRound(false),below=makeRound(true);
console.log('round trip, 10 s hands off, stack IDs, butter at 3 s (%)',onTop,below);
assert.notEqual(onTop.melted,below.melted);
const thicknessRates=[.50,1.00].map(h=>{
  const c=standard();for(const q of c.cells)q.thickness=h;
  P.heat(c,dt);return (c.cells[0].temp[0]-22)/dt;
});
assert.ok(Math.abs(thicknessRates[0]/thicknessRates[1]-4)<1e-9);
console.log('initial heating at 0.50/1.00 cm (degrees C/s)',thicknessRates.map(round));
const first=createKitchen();
first.down();first.step(4.6);first.up();first.down();
while(first.read().phase==='pour')first.step(dt);
first.up();
let liveGold,liveDark,raw;
for(let i=1;i<=20/dt;i++){
  first.step(dt);const b=P.meanFace(first.read().cake,'brown',0);
  if(i===4/dt)raw=b;
  if(b>=.15 && !liveGold)liveGold=i*dt;
  if(b>=.72 && !liveDark)liveDark=i*dt;
}
assert.ok(raw<.015 && Math.abs(liveGold-8)<1 && Math.abs(liveDark-15)<1);
console.log('normal play, raw at 4 s, gold/dark in seconds', [raw,liveGold,liveDark].map(round));
