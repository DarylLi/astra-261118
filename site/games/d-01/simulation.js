/* Lengths are metres, masses kilograms, time seconds. The renderer uses decimetres. */
(function (root) {
  'use strict';
  const H = 1 / 120, G = 9.81, MU = 0.35, EDGE = 0.334, LAND = -0.2093;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  function createGame(seed = 1927) {
    function noise() {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    }
    const joint = (x = 0) => ({ x, v: 0 });
    function spring(j, goal, k, damping) {
      j.v += ((goal - j.x) * k - damping * j.v) * H;
      j.x += j.v * H;
    }
    const robot = (x) => ({ x, v: 0, y: 0, vy: 0, mass: 0.4, wheel: 0, lean: joint(), head: joint(), aerial: joint(), blink: joint(), eyeWait: 2 + noise() * 3 });
    const s = {
      phase: 'ready', round: 0, tracks: 0, arms: 0, part: 'tracks',
      red: robot(-0.122), blue: robot(0.12), charge: 0, held: false, drive: 0,
      driveForce: 0, initialForce: 0, key: joint(), recoil: joint(), counter: 0,
      tilt: joint(), drawer: joint(), cushion: joint(), socket: joint(), install: 0, exchange: 0,
      guide: { idle: 0, stroke: 0, pressure: joint(), down: false, visible: false },
      air: { speed: 0.017, target: 0.024, gustIn: 0.8, warmth: joint(0.92) },
      wet: { amount: 0.97, surface: joint(0.0003), dripIn: 2.15, drops: 0 },
      dust: [], pieces: [], tap: { red: joint(), blue: joint(), drawer: joint() }, timer: 0, collision: null, impacts: 0,
      focus: { x: joint(), front: joint(), down: joint() }, fallSpeed: 0, highestBounce: 0, maxCompression: 0, events: []
    };
    for (let i = 0; i < 65; i++) s.dust.push({ x: noise() * 1.6 - 0.8, y: noise() * 0.8, z: noise() * 1.1 - 0.8, v: 0, radius: 0.00035 + noise() * 0.00085, seed: noise() });
    let accumulator = 0;
    function sound(name, value = 1) {
      if (s.events.length === 32) s.events.shift();
      s.events.push({ name, value });
    }
    function input() {
      s.guide.idle = 0; s.guide.visible = false; s.guide.stroke = 0; s.guide.down = false;
    }
    function press(target) {
      input();
      if (s.phase === 'ready' && target === 'wind') {
        s.held = true; s.phase = 'winding'; sound('engage'); return true;
      }
      if (s.phase === 'reward' && target === 'part' && s.drawer.x > 0.105) {
        s.phase = 'install'; s.install = 0; sound('pick'); return true;
      }
      if (Object.hasOwn(s.tap, target)) s.tap[target].v += 0.14;
      return false;
    }
    function release() {
      if (!s.held) return;
      s.held = false; input();
      if (s.charge <= MU * G / (8 * power())) {
        // The pawl holds a partial turn until there is enough torque to start sliding.
        s.phase = 'ready'; s.recoil.v += s.charge * 0.6; sound('pawl', 0.35); return;
      }
      s.drive = s.charge; s.charge = 0; s.phase = 'push'; s.timer = 0; s.counter = 0;
      s.initialForce = 0.4 * 8 * power() * s.drive;
      s.recoil.v -= 1.1 * s.drive; sound('release', s.drive);
    }
    function cancel() { if (s.held) { s.held = false; s.phase = 'ready'; input(); } }
    function power() { return (s.red.mass / 0.4) * (1 + 0.24 * (1 - Math.exp(-0.65 * s.round))); }
    function ambient() {
      const a = s.air, w = s.wet;
      a.gustIn -= H;
      if (a.gustIn <= 0) { a.target = -0.007 + noise() * 0.042; a.gustIn = 0.6 + noise() * 2.9; }
      a.speed += (a.target - a.speed) * H * 1.4;
      spring(a.warmth, 0.91 + 2.2 * a.speed, 2.3, 2.4);
      for (const d of s.dust) {
        d.v += (a.speed * (0.45 + d.seed) - d.v) * H * (1.1 + d.seed);
        d.x += d.v * H; d.y += (0.003 + d.seed * a.speed * 0.7) * H;
        if (d.x > 0.86) d.x -= 1.72;
        if (d.y > 0.83) d.y -= 0.83;
      }
      w.amount = Math.max(0.25, w.amount - H * a.warmth.x * 0.00055);
      w.dripIn -= H;
      if (w.dripIn <= 0) { w.surface.v += 0.025; w.amount = Math.min(1, w.amount + 0.0009); w.drops++; w.dripIn = 2.9 + noise() * 2.8; }
      spring(w.surface, 0, 170, 5);
      for (const [i, r] of [s.red, s.blue].entries()) {
        r.eyeWait -= H;
        if (r.eyeWait < 0) { r.blink.v = 10; r.eyeWait = 2.7 + noise() * 3; }
        spring(r.blink, 0, 180, 13);
        spring(r.lean, clamp(r.v * 0.16, -0.2, 0.2), 92, 12);
        spring(r.head, -r.lean.x * 0.62 + a.speed * (i ? 0.18 : -0.3), 76, 8);
        spring(r.aerial, r.head.x * 0.8 + a.speed * (i ? 1.9 : 2.7), 36 + 8 * i, 3.2);
        r.wheel += r.v / 0.034 * H;
      }
      for (const fitting of Object.values(s.tap)) spring(fitting, 0, 80, 6);
      spring(s.recoil, 0, 104, 8);
      spring(s.cushion, 0, 168, 8);
      s.maxCompression = Math.max(s.maxCompression, s.cushion.x);
      const g = s.guide;
      if (s.phase === 'ready' || s.phase === 'reward') {
        g.idle += H; g.visible = g.idle >= 4 - 1e-9;
        if (g.visible) {
          g.stroke += H; g.down = g.stroke > 0.55 && g.stroke < (s.phase === 'ready' ? 2.18 : 0.96);
          if (g.stroke > (s.phase === 'ready' ? 3.5 : 2.4)) g.stroke = -0.15 - Math.abs(a.speed) * 6;
        }
      } else { g.visible = false; g.idle = 0; g.down = false; }
      spring(g.pressure, g.down ? 1 : 0, 54, 12);
    }
    function advance(r, applied, grip) {
      const before = r.v;
      const free = before + applied / r.mass * H;
      const v = Math.sign(free) * Math.max(0, Math.abs(free) - MU * G * grip * H);
      r.v = v; r.x += (before + v) * 0.5 * H;
    }
    function pushPhysics() {
      const r = s.red, b = s.blue;
      s.timer += H;
      s.driveForce = 3.2 * power() * s.drive;
      advance(r, s.driveForce, 1);
      // The opponent engages its resisting motor only under contact pressure.
      const counterForce = b.v > 0.001 ? Math.min(b.v * b.mass / H, s.counter) : 0;
      advance(b, -counterForce, 1);
      const distance = 0.121 + 0.009 * (1 - Math.exp(-s.round));
      if (b.x - r.x <= distance) {
        const overlap = distance - (b.x - r.x), total = r.mass + b.mass;
        r.x -= overlap * b.mass / total; b.x += overlap * r.mass / total;
        if (r.v > b.v) {
          const approach = r.v - b.v, pre = r.mass * r.v + b.mass * b.v;
          const impulse = 1.08 * approach / (1 / r.mass + 1 / b.mass);
          r.v -= impulse / r.mass; b.v += impulse / b.mass;
          if (approach > 0.07) {
            s.collision = { before: pre, after: r.mass * r.v + b.mass * b.v, impulse };
            s.impacts++; r.head.v -= approach * 1.4; b.aerial.v += approach * 3.2;
            s.wet.surface.v += Math.min(0.014, approach * 0.02); sound('bump', Math.min(1, approach));
          }
        }
        s.counter = Math.min(0.62 * b.mass / 0.4, s.counter + H * 2.8);
      }
      // The gear train pays out spring travel while driving, including a small unloaded tick.
      s.drive = Math.max(0, s.drive - H * (0.15 + Math.abs(r.v) * 0.38));
      if (b.x >= EDGE) {
        b.x = EDGE; b.v = 0; r.v *= 0.18; s.drive = 0; s.driveForce = 0;
        s.phase = 'tip'; s.timer = 0; s.tilt.v = 0.32; sound('tip');
      } else if (s.timer > 0.09 && Math.abs(r.v) + Math.abs(b.v) < 0.001) {
        s.charge = s.drive; s.drive = 0; s.phase = 'ready'; s.driveForce = 0; input();
      }
    }
    function land() {
      const b = s.blue;
      s.fallSpeed = -b.vy; b.y = LAND; b.v = b.vy = 0;
      s.cushion.v += s.fallSpeed * 0.27;
      s.phase = 'recover'; s.timer = 0; sound('puff', s.fallSpeed / 2);
      // Five captive fittings pop on impact. Distances are relative to each socket.
      s.pieces = ['head', 'earL', 'earR', 'armL', 'armR'].map((name, i) => {
        const mass = [0.065,0.014,0.015,0.032,0.035][i], k = [390,105,118,198,230][i];
        const compression = Math.min(0.015, s.fallSpeed * (0.0062 + 0.00047*i));
        const launch = compression * Math.sqrt(k / mass);
        return {
          name, mass, k, compression, x: 0, y: 0, z: 0,
          vx: (i % 2 ? -1 : 1) * (0.13 + noise()*0.055), vy: launch,
          vz: (i===0 ? 0.16 : (noise()-0.4)*0.16), angle: 0, omega: (noise()-0.5)*8, bounces: 0
        };
      });
    }
    function recover() {
      const returning = s.timer > 0.88;
      spring(s.tilt, 0, 64, 8.5);
      for (const p of s.pieces) {
        if (returning) {
          for (const [pos, vel] of [['x','vx'], ['y','vy'], ['z','vz']]) p[vel] += (-p[pos] * 115 - 15 * p[vel]) * H;
          p.omega += (-p.angle * 115 - 15 * p.omega) * H;
        } else {
          p.vy -= G * H;
          const floor = p.name === 'head' ? -0.150 : p.name.startsWith('ear') ? -0.174 : -0.084;
          if (p.y <= floor && p.vy < 0) {
            p.y = floor; p.vy *= -0.51; p.vx *= 0.84; p.vz *= 0.88; p.omega += (p.vx / 0.022 - p.omega)*0.22; p.bounces++;
          }
        }
        p.x += p.vx * H; p.y += p.vy * H; p.z += p.vz * H; p.angle += p.omega * H;
        s.highestBounce = Math.max(s.highestBounce, p.y);
      }
      if (s.timer > 1.85) { s.phase = 'reward'; s.pieces = []; s.part = s.round % 2 ? 'arms' : 'tracks'; input(); sound('drawer'); }
    }
    function tick() {
      ambient();
      if (s.held) {
        const old = s.charge; s.charge = Math.min(1, s.charge + H / 1.5);
        if (s.charge > 1 - 1e-9) s.charge = 1;
        if (Math.floor(old * 12) < Math.floor(s.charge * 12)) { sound('pawl', s.charge); s.red.aerial.v += 0.18; }
      }
      spring(s.key, (s.charge + s.drive) * Math.PI * 3, 240, 23);
      if (s.phase === 'push') pushPhysics();
      if (s.phase === 'tip' || s.phase === 'fall') {
        accelerateStopRed();
        if (s.phase === 'tip') {
          s.timer += H;
          s.tilt.v += (0.7 + 7 * Math.sin(s.tilt.x) - s.tilt.v * 0.8) * H; s.tilt.x += s.tilt.v * H;
          if (s.tilt.x > 0.34) { s.phase = 'fall'; s.blue.v = 0.23; s.blue.vy = 0.07; }
        } else {
          s.blue.vy -= G * H; s.blue.y += s.blue.vy * H; s.blue.x += s.blue.v * H;
          s.tilt.v += -s.tilt.v * H; s.tilt.x += s.tilt.v * H;
          if (s.blue.y <= LAND) land();
        }
      } else if (s.phase === 'recover') { s.timer += H; recover(); }
      spring(s.drawer, ['reward','install'].includes(s.phase) ? 0.185 : 0, 42, 10);
      if (s.phase === 'install') {
        s.install = Math.min(1, s.install + H / 0.86);
        if (s.install === 1) {
          if (s.part === 'tracks') s.tracks++; else s.arms++;
          s.round++; s.red.mass = 0.4 + 0.16 * (1 - Math.exp(-0.6 * s.round));
          s.socket.v = 0.85; sound('snap'); s.phase = 'exchange'; s.exchange = 0;
        }
      } else if (s.phase === 'exchange') {
        s.exchange += H / 1.65;
        if (s.exchange >= 1) {
          s.red.x = -0.122; s.red.v = 0; s.blue = robot(0.12);
          s.blue.mass = 0.4 + 0.19 * (1 - Math.exp(-0.49 * s.round));
          s.phase = 'ready'; s.exchange = 1; s.tilt = joint(); s.counter = 0; input();
        }
      }
      spring(s.socket, 0, 120, 8);
      const onPad = ['tip','fall','recover'].includes(s.phase), atDrawer = ['reward','install'].includes(s.phase);
      spring(s.focus.x, onPad ? 0.235 : (atDrawer ? 0.035 : Math.max(0,s.red.x + .122)*.32), 8, 5);
      spring(s.focus.front, atDrawer ? 0.248 : (onPad ? 0.022 : 0), 9, 5.8);
      spring(s.focus.down, atDrawer ? 0.146 : (onPad ? 0.105 : 0), 9, 5.8);
    }
    function accelerateStopRed() { advance(s.red, 0, 1); }
    function step(dt) {
      if (!Number.isFinite(dt) || dt <= 0) return;
      accumulator += dt;
      const count = Math.floor((accumulator + 1e-10) / H);
      for (let i = 0; i < count; i++) tick();
      accumulator = Math.max(0, accumulator - count * H);
    }
    return { step, press, release, cancel, state: s, getState: () => JSON.parse(JSON.stringify(s)), takeSounds: () => s.events.splice(0) };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { createGame };
  else root.SumoSimulation = { createGame };
})(typeof window === 'undefined' ? globalThis : window);
