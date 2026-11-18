'use strict';
const assert = require('node:assert/strict');
const {createGame} = require('./simulation.js');
const H = 1 / 120;
function near(a, b, e = 1e-9) { assert.ok(Math.abs(a - b) <= e, a + ' ≠ ' + b); }
const log = (name, values) => console.log(name, JSON.stringify(values));
const idle = createGame();
const start = idle.getState();
idle.step(4 - H);
assert.equal(idle.state.guide.visible, false);
idle.step(H);
assert.equal(idle.state.guide.visible, true);
idle.step(6);
const end = idle.getState();
near(end.red.x, start.red.x); near(end.blue.x, start.blue.x);
assert.equal(end.phase, 'ready'); near(end.charge, 0);
assert.ok(end.wet.drops >= 2 && end.wet.amount < start.wet.amount);
assert.notEqual(start.air.warmth.x, end.air.warmth.x);
assert.notEqual(start.red.aerial.x, end.red.aerial.x);
assert.ok(end.dust[0].x - start.dust[0].x > .01);
log('idle 10 s', {
  dustDelta_m: end.dust[0].x - start.dust[0].x,
  air_m_s: [start.air.speed, end.air.speed],
  sunRelative: [start.air.warmth.x, end.air.warmth.x],
  aerial_rad: [start.red.aerial.x, end.red.aerial.x],
  waterFill: [start.wet.amount,end.wet.amount], drops: end.wet.drops,
  handFirst_s: 4, handPress: end.guide.pressure.x
});
// Only winding duration changes. Both runs have the same seed, start positions,
// opponent, ambient history, and absolute release time.
function trial(hold) {
  const g = createGame();
  g.step(1.5 - hold);
  assert.ok(g.press('wind'));
  g.step(hold);
  const charge = g.state.charge;
  g.release();
  const force = g.state.initialForce, before = g.state.red.x;
  g.step(H);
  const acceleration = g.state.red.v / H;
  near(acceleration, force / g.state.red.mass - .35 * 9.81);
  let maxBlue = 0, maxCounter = 0, travelled = 0, lastWheel = 0;
  let tipAngle = 0, impact = null, partCount = 0, bounces = 0, recovery = 0;
  let landedAt = 0, rewardAt = 0, error = 0, maxImpulse = 0;
  for (let i=1; i<=7/H; i++) {
    const phase = g.state.phase;
    if (phase==='push') {
      maxBlue = Math.max(maxBlue, g.state.blue.x - .12);
      travelled = g.state.red.x - before;
      lastWheel = g.state.red.wheel;
    }
    if (phase === 'tip') maxBlue = .334 - .12;
    maxCounter = Math.max(maxCounter,g.state.counter);
    g.step(H);
    const c = g.state.collision;
    if (c) {
      maxImpulse = Math.max(maxImpulse,c.impulse);
      error = Math.max(error,Math.abs(c.before-c.after));
      impact ??= c;
    }
    if (phase === 'tip' && g.state.phase === 'fall') tipAngle = g.state.tilt.x;
    if (phase === 'fall' && g.state.phase === 'recover') {
      landedAt = i*H;partCount = g.state.pieces.length;
      assert.deepEqual(g.state.pieces.map(p=>p.name), ['head','earL','earR','armL','armR']);
    }
    for (const piece of g.state.pieces) bounces = Math.max(bounces,piece.bounces);
    if (phase === 'recover' && g.state.phase === 'reward') {
      rewardAt = i*H; recovery = rewardAt - landedAt;
    }
  }
  const metrics = {hold_s:hold,charge,force_N:force,driveAcceleration_m_s2:force/.4,netAcceleration_m_s2:acceleration,
    redTravel_m:travelled,blueTravelOnPlate_m:maxBlue,wheel_rad:lastWheel,counter_N:maxCounter,
    impulse_Ns:maxImpulse,momentumError_kg_m_s:error,firstCollision:impact,tip_rad:tipAngle,
    landing_m_s:g.state.fallSpeed,cushionStroke_m:g.state.maxCompression,partCount,
    partLift_m:g.state.highestBounce,bounces,recovery_s:recovery,drawer_m:g.state.drawer.x,phase:g.state.phase};
  log('release',metrics);
  return {g,metrics};
}
const weak = trial(1.125), full = trial(1.5);
near(weak.metrics.charge,.75);near(full.metrics.charge,1);
assert.ok(weak.metrics.blueTravelOnPlate_m < full.metrics.blueTravelOnPlate_m);
assert.equal(weak.g.state.phase,'ready');
assert.equal(full.g.state.phase,'reward');
assert.ok(full.metrics.partCount===5 && full.metrics.bounces>0);
assert.ok(full.metrics.partLift_m>.02 && full.metrics.cushionStroke_m>.01);
assert.ok(full.metrics.momentumError_kg_m_s < 1e-12 && full.metrics.impulse_Ns>0);
near(full.metrics.drawer_m,.185,.00001);
const g=full.g;
for(let round=1;round<=2;round++) {
  assert.equal(g.state.part, round===1?'tracks':'arms');
  assert.equal(g.press('wind'),false);assert.equal(g.state.phase,'reward');
  assert.equal(g.press('part'),true);assert.equal(g.press('part'),false);
  g.step(3);
  assert.equal(g.state.round,round);assert.equal(g.state.phase,'ready');near(g.state.blue.x,.12);
  g.press('wind');g.step(1.5);g.release();
  log('upgrade',{round,tracks:g.state.tracks,arms:g.state.arms,redMass_kg:g.state.red.mass,blueMass_kg:g.state.blue.mass,force_N:g.state.initialForce});
  assert.ok(g.state.initialForce>3.2);g.step(7);assert.equal(g.state.phase,'reward');
}
const ratchet = createGame();
ratchet.press('wind');ratchet.step(.15);ratchet.release();near(ratchet.state.charge,.1);
ratchet.press('wind');ratchet.step(.15);ratchet.cancel();near(ratchet.state.charge,.2);
assert.equal(ratchet.state.phase,'ready');
const a=createGame(),b=createGame();a.step(10);
for(let i=0;i<600;i++)b.step(1/60);
assert.deepEqual(a.getState(),b.getState());
console.log('All state tests passed.');
