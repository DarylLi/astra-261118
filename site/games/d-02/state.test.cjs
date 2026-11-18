'use strict';
const assert = require('node:assert/strict');
const { create, finish } = require('./physics.js');
const dt = 1 / 120,
  near = (a, b, eps = 1e-7) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);
function advance(game, n, observe) {
  for (let i = 0; i < n; i++) {
    game.step(dt);
    if (observe) observe(game.getState(), i);
  }
}
const resting = create(),
  start = resting.getState();
let hintOnset;
advance(resting, 1200, (s, i) => {
  if (s.hint > 0 && hintOnset === undefined) hintOnset = (i + 1) * dt;
});
const idle = resting.getState();
near(idle.speed, 0);
near(idle.distance, 0);
near(hintOnset, 4, dt + 0.00001);
for (const key of ['waterOffset', 'waterRipple', 'branchFlex', 'canopyLight', 'dustHeight', 'heave'])
  assert.notEqual(idle[key], start[key], key);
assert.ok(Math.abs(resting.cells[6].flex - resting.cells[7].flex) > 0.001);
const same = create();
same.step(10);
for (const key of ['waterRipple', 'branchFlex', 'heave'])
  near(same.st[key] ?? same.getState()[key], idle[key]);
function gesture(held) {
  const g = create();
  g.press(true);
  g.step(held);
  const peak = g.st.speed;
  g.press(false);
  g.step(2 - held);
  return { ...g.getState(), peak };
}
const short = gesture(0.5),
  long = gesture(1.5);
near(short.peak, 3);
near(short.speed, 0);
near(short.distance, 3);
near(long.peak, 9);
near(long.speed, 8);
near(long.distance, 11);
const coast = create();
coast.press(true);
coast.step(1);
coast.press(false);
coast.step(1);
near(coast.st.speed, 4);
const race = create();
race.press(true);
let clock = 0,
  maxSpeed = 0,
  maxRoll = 0,
  maxHeave = 0,
  maxFov = 0,
  maxAir = 0,
  finishAt = 0,
  horns = 0,
  firstBoost = 0,
  after,
  fastFlight,
  fastTakeoff,
  maxPedal = 0;
const beforeLeaves = race.leaves.length,
  events = [];
while (clock < 20 && race.st.lap === 1) {
  const v = race.st.speed;
  race.step(dt);
  clock += dt;
  const s = race.getState();
  maxSpeed = Math.max(maxSpeed, s.speed);
  maxRoll = Math.max(maxRoll, Math.abs(s.rollDegrees));
  maxHeave = Math.max(maxHeave, Math.abs(s.heave));
  maxAir = Math.max(maxAir, s.airHeight);
  maxFov = Math.max(maxFov, s.fov);
  maxPedal = Math.max(maxPedal, s.pedal);
  for (const e of race.events.splice(0)) {
    events.push(e.kind);
    if (e.kind === 'gate' && e.n === 0) firstBoost = s.speed - v - 6 * dt;
    if (e.kind === 'finish') {
      finishAt = clock;
      assert.equal(s.phase, 'welcome');
      assert.equal(s.pressed, false);
      race.press(true);
      assert.equal(race.st.pressed, false);
    }
    if (e.kind === 'land') {
      fastFlight = s.flightDistance;
      fastTakeoff = s.takeoffSpeed;
    }
    if (e.kind === 'horn') horns++;
    if (e.kind === 'lap') after = s;
  }
}
assert.deepEqual(
  events.filter((k) => k === 'gate'),
  ['gate', 'gate', 'gate'],
);
near(firstBoost, 1.45);
near(maxSpeed, 18);
near(maxPedal, 1, 0.025);
near(maxFov, 48);
assert.ok(maxRoll > 6 && maxRoll <= 8);
assert.ok(maxHeave > 0.025 && maxHeave < 0.13);
assert.ok(maxAir > 0.42);
assert.ok(fastFlight > 7);
assert.equal(horns, 4);
assert.ok(after);
assert.equal(after.lap, 2);
assert.equal(after.phase, 'drive');
near(after.distance, 0);
near(after.speed, 0);
near(clock - finishAt, 6.55, 0.02);
assert.ok(after.lifted > 0);
assert.ok(after.groundLeaves > beforeLeaves);
// Change takeoff speed on the same ramp. Both trajectories must land without input timing checks.
const slow = create();
let slowFlight, slowTakeoff;
for (let i = 0; i < 2000 && slowFlight === undefined; i++) {
  slow.press(slow.st.speed < 8);
  slow.step(dt);
  for (const e of slow.events.splice(0))
    if (e.kind === 'land') {
      slowFlight = slow.st.flightDistance;
      slowTakeoff = slow.st.takeoffSpeed;
    }
}
assert.ok(slowFlight > 0);
near(fastFlight / fastTakeoff, slowFlight / slowTakeoff, 0.015);
assert.ok(clock > finishAt && finish > 0);
const r = (n) => +n.toFixed(5);
console.log(
  JSON.stringify(
    {
      idleSeconds: 10,
      hintOnset_s: r(hintOnset),
      waterTravel_m: r(idle.waterOffset - start.waterOffset),
      rippleChange_mm: r((idle.waterRipple - start.waterRipple) * 1000),
      branchChange_deg: r(((idle.branchFlex - start.branchFlex) * 180) / Math.PI),
      lightChange_pct: r((idle.canopyLight - start.canopyLight) * 100),
      dustHeightChange_m: r(idle.dustHeight - start.dustHeight),
      idleSuspension_mm: r(idle.heave * 1000),
      gestures: [short, long].map((s, i) => ({
        held_s: i ? 1.5 : 0.5,
        elapsed_s: 2,
        peak_mps: r(s.peak),
        final_mps: r(s.speed),
        distance_m: r(s.distance),
      })),
      max_mps: maxSpeed,
      boost_mps: r(firstBoost),
      maxRoll_deg: r(maxRoll),
      maxHeave_mm: r(maxHeave * 1000),
      maxFov_deg: maxFov,
      fastJump: { speed_mps: r(fastTakeoff), range_m: r(fastFlight), peak_m: r(maxAir) },
      slowJump: { speed_mps: r(slowTakeoff), range_m: r(slowFlight) },
      gates: 3,
      horns,
      reward_s: r(clock - finishAt),
      laps: after.lap,
      leaves: [beforeLeaves, after.groundLeaves],
      leavesLifted: after.lifted,
    },
    null,
    2,
  ),
);
