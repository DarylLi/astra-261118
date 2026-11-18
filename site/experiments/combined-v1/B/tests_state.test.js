'use strict';
const assert = require('node:assert/strict');
const { createKitchen } = require('./simulation.js');

function until(k, condition, seconds = 12) {
  for (let i = 0; i < seconds * 60 && !condition(k.read()); i++) k.step(1 / 60);
  assert.ok(condition(k.read()), 'Timed out in ' + k.read().phase);
}
function prepared(options = {}, milkSeconds = 1.25) {
  const k = createKitchen({seed: 4242, ...options});
  k.action('milk'); k.step(milkSeconds); k.action('release');
  until(k, s => s.phase === 'mix');
  for (let i=0;i<100 && k.read().phase==='mix';i++) { k.action('stir', {force: 2}); k.step(.23); }
  until(k,s=>s.phase==='pour');
  return k;
}
function pour(k, x = 0, z = 0, hold = .60) {
  k.action('pour', {x, z}); k.step(hold); k.action('release');
  until(k, s => s.phase === 'cook');
  return k.read().cakes.at(-1);
}
function bake(k, seconds, x = 0, z = 0, hold = .60) {
  const c = pour(k, x, z, hold);
  k.step(seconds); k.action('flip'); k.step(.30); assert.equal(c.contact, 1);
  k.step(1.8); k.action('lift'); until(k,s=>s.phase==='pour'||s.phase==='stack');
  return c;
}
function near(a, b, eps = 1e-8) { assert.ok(Math.abs(a-b)<eps, a+' != '+b); }
const mean = values => values.reduce((a,b)=>a+b,0)/values.length;
const fmt = (x, n = 2) => x.toFixed(n);
const report = (name, value) => console.log(name.padEnd(23)+' ' + value);

const dry = prepared({},.05), wet = prepared({},1.80);
assert.ok(dry.read().viscosity > wet.read().viscosity);
assert.ok(wet.read().milk > dry.read().milk && wet.read().clumps < .08);
report('mix', [dry,wet].map(k=>fmt(k.read().milk)+' mL / '+fmt(k.read().viscosity)+' Pa·s').join(' → '));

const k = prepared();
k.action('pour', {x:1,z:-.5}); k.step(.42);
const beforeRelease = k.getState().cakes[0].volume;
k.action('release'); k.step(.50);
const afterRelease = k.read().cakes[0].volume;
assert.ok(afterRelease > beforeRelease);
report('pour tail, 0.50 s', fmt(beforeRelease)+' → '+fmt(afterRelease)+' mL');
until(k,s=>s.phase==='cook');
const before=k.getState().cakes[0]; k.step(10);
const c=k.read().cakes[0], center=c.cells[0],edge=c.cells[64];
assert.ok(center.faces[1].water < before.cells[0].faces[1].water);
assert.ok(c.born > before.born && c.popped > before.popped);
assert.ok(center.lift > before.cells[0].lift && center.faces[0].brown > before.cells[0].faces[0].brown);
assert.notEqual(edge.faces[1].water, center.faces[1].water);
report('idle center, 10 s',fmt(before.cells[0].faces[1].water*100,1)+' → '+fmt(center.faces[1].water*100,1)+' % water, edge '+fmt(edge.faces[1].water*100,1)+' %');
report('idle bubbles', (c.born-before.born)+' born / '+(c.popped-before.popped)+' popped in 10 s');
report('idle lift', fmt(before.cells[0].lift*10)+' → '+fmt(center.lift*10)+' mm');
const firstBrown=center.faces[0].brown, lift=center.lift;
k.action('flip');
assert.equal(c.airborne,true);near(center.faces[0].brown,firstBrown);
const otherBrown=center.faces[1].brown;
k.step(.10);const peak=c.altitude;assert.ok(peak>4);k.step(2);assert.equal(c.contact,1);k.action('lift');
const restBefore=center.faces[1].brown,restTemp=center.faces[1].temp;
k.step(10);
assert.ok(center.lift>=lift && center.faces[0].brown>=firstBrown);
assert.ok(center.faces[1].brown>restBefore && center.faces[1].temp<restTemp);
report('flip height, 0.10 s',fmt(peak)+' cm');
report('flip, face 0 / 1',fmt(firstBrown*100,1)+' / '+fmt(otherBrown*100,1)+' % browned (immediate)');
report('residual, 10 s',fmt(restTemp,1)+' → '+fmt(center.faces[1].temp,1)+' °C, '+fmt(restBefore*100,1)+' → '+fmt(center.faces[1].brown*100,1)+' % browned');

function isolated(options,x=0){
  const k=prepared(options);k.action('pour',{x,z:0});k.step(2.25);k.action('release');k.step(8);
  return k.read().cakes[0];
}
const cool=isolated({heat:.42}),hot=isolated({heat:1});
assert.ok(hot.cells[0].faces[0].brown>cool.cells[0].faces[0].brown);
near(cool.volume,hot.volume);
report('heat 42 / 100 %', [cool,hot].map(c=>fmt(c.cells[0].faces[0].temp,1)+' °C, '+fmt(c.cells[0].faces[0].brown*100,1)+' % browned').join(' / '));

const thin=isolated({viscosity:1.25}),thick=isolated({viscosity:3.20});
near(thin.volume,thick.volume);
assert.ok(thin.radius>thick.radius && thin.thickness<thick.thickness);
report('viscosity 1.25 / 3.20', [thin,thick].map(c=>fmt(c.radius*2)+' cm diameter, '+fmt(c.thickness*10)+' mm thick').join(' / '));
const durations=[4,10].map(seconds=>{
  const k=prepared();const c=pour(k);k.step(seconds);k.action('flip');
  return c.cells[0].faces[0].brown;
});
assert.ok(durations[1]>durations[0]);
report('bake 4 s / 10 s',durations.map(v=>fmt(v*100,1)+' % browned').join(' / '));
const onCenter=isolated({}),offCenter=isolated({},3.7);
const diff=c=>Math.abs(c.cells[64].faces[0].temp-c.cells[72].faces[0].temp);
assert.ok(diff(offCenter)>diff(onCenter)+.1);
report('pour position 0 / 3.7', [onCenter,offCenter].map(c=>fmt(diff(c))+' °C across rim').join(' / '));

function stackInOrder(order) {
  const k=prepared();
  bake(k,4.8,-2,.5,.43);bake(k,6.1,2,-.6,.9);bake(k,5.6,-1,.3,.68);
  assert.equal(k.read().phase,'stack');
  for(const id of order) { k.action('stack',{id}); k.step(.25); }
  assert.deepEqual(k.read().stack,order);
  const s=k.read();near(s.batterLeft+s.cakes.reduce((a,c)=>a+c.volume,0),s.milk+s.flour/1.5);
  return k;
}
const a=stackInOrder([0,1,2]),b=stackInOrder([2,1,0]);
const upper=k=>k.read().cakes[k.read().stack.at(-1)];
assert.ok(Math.abs(upper(a).slide-upper(b).slide)+Math.abs(upper(a).tilt-upper(b).tilt)>.001);
report('stack 012 / 210', [a,b].map(k=>fmt(upper(k).slide*10)+' mm offset, '+fmt(upper(k).cells[0].faces[0].temp,1)+' °C on top').join(' / '));
a.action('butter');const butter=a.read().butter;a.step(10);
assert.ok(butter.melted>0 && butter.grams<6);near(butter.grams+butter.melted,6);
report('butter idle, 10 s',fmt(butter.melted)+' g melted at '+fmt(butter.temp,1)+' °C');
a.action('syrup');a.step(.60);a.action('release');
const v=a.read().syrup.volume, l=mean(a.read().syrup.trails.map(t=>t.length));a.step(1);
assert.ok(a.read().syrup.volume>v && a.read().syrup.trails.every(t=>t.length>0));
report('syrup tail, 1 s',fmt(v)+' → '+fmt(a.read().syrup.volume)+' mL, mean trail '+fmt(l)+' → '+fmt(mean(a.read().syrup.trails.map(t=>t.length)))+' cm');
until(a,s=>s.phase==='berry');a.step(10);
const overflow=Math.max(...a.read().syrup.trails.map(t=>t.length-upper(a).radius));
assert.ok(overflow>0);
report('syrup beyond rim',fmt(overflow)+' cm after 10 s idle');
a.action('berry');
for(let i=0;i<3;i++){a.step(1.3);a.action('eat');}
until(a,s=>s.phase==='wash');const served=a.read().eaten, soilBefore=a.read().stains.reduce((a,v)=>a+v.mass,0);
for(let i=0;i<100 && a.read().phase==='wash';i++){a.action('wash');a.step(.30);}
const effort=a.read().wash;
const soilAfter=a.read().stains.reduce((a,v)=>a+v.mass,0);assert.ok(soilAfter<soilBefore*.10);
report('washing residue', fmt(soilBefore,3)+' → '+fmt(soilAfter,3)+' g');
until(a,s=>s.phase==='milk');assert.equal(a.read().cakes.length,0);
report('eat / wash / reset',served+' portions / '+fmt(effort)+' scrub units / 0 cakes');

const split=prepared(),whole=prepared();
for(const g of [split,whole])g.action('pour',{x:.3,z:.9});
for(let i=0;i<600;i++)split.step(1/60);
whole.step(10);assert.deepEqual(split.getState(),whole.getState());
const snapshot=whole.getState();snapshot.cakes[0].cells[0].lift=999;
assert.notEqual(whole.read().cakes[0].cells[0].lift,999);
assert.throws(()=>whole.step(-1));assert.throws(()=>whole.step(Infinity));
console.log('All state tests passed.');
