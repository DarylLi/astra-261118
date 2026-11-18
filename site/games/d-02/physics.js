(function (root) {
  'use strict';
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  function randomSource(seed) {
    return () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }
  const centerX = (z) => 4.1 * (1 - Math.cos(z / 10.8)) + 0.018 * z;
  const slope = (z) => (4.1 / 10.8) * Math.sin(z / 10.8) + 0.018;
  const altitude = (z) => 0.008 * z + 0.15 * Math.sin(z / 13);
  const riverX = (z) => centerX(z) + 9.2 * Math.tanh((z - 32) / 5.2) + 1.15 * Math.sin((z - 32) / 7.5);
  const arc = [0];
  for (let i = 1; i < 1401; i++) arc[i] = arc[i - 1] + 0.1 * Math.hypot(1, slope((i - 0.5) * 0.1));
  function route(s) {
    let a = 0,
      b = arc.length - 1;
    while (b - a > 1) {
      const m = (a + b) >> 1;
      if (arc[m] <= s) a = m;
      else b = m;
    }
    const z = 0.1 * (a + (s - arc[a]) / (arc[b] - arc[a]));
    const d = slope(z);
    return {
      x: centerX(z),
      y: altitude(z),
      z: -z,
      yaw: -Math.atan(d),
      curvature: ((4.1 / 10.8 ** 2) * Math.cos(z / 10.8)) / (1 + d * d) ** 1.5,
    };
  }
  const gates = [12, 26, 47],
    finish = 64,
    lip = 42;
  const rampHeight = (s) => (s > lip - 3 && s <= lip ? 0.42 * ((s - lip + 3) / 3) ** 1.3 : 0);
  function create(seed = 12706) {
    const rand = randomSource(seed);
    const cells = Array.from({ length: 36 }, (_, i) => ({
      wind: 0.1 + rand() * 0.2,
      gust: 0,
      gustLife: rand(),
      ripple: rand() * 0.016,
      flow: 0,
      flex: 0,
      flexRate: 0,
      current: 0.46 + rand() * 0.35,
      offset: rand(),
      sun: 1,
      depth: 0.38 + 0.3 * rand(),
      i,
    }));
    const dust = Array.from({ length: 60 }, () => ({
      s: rand() * 86 - 5,
      x: (rand() - 0.5) * 26,
      y: 0.3 + rand() * 7,
      vx: 0,
      vy: 0,
      spin: rand() * 6.28,
      drag: 0.6 + rand(),
      leaf: rand() < 0.27,
    }));
    const salutes = [],
      leaves = [],
      events = [],
      sparks = [];
    const st = {
      phase: 'drive',
      lap: 1,
      speed: 0,
      distance: 0,
      pressed: false,
      idle: 0,
      hint: 0,
      wheelAngle: 0,
      travel: 0,
      heave: 0,
      heaveRate: 0,
      surge: 0,
      surgeRate: 0,
      roll: 0,
      rollRate: 0,
      pitch: 0,
      pitchRate: 0,
      airHeight: 0,
      airSpeed: 0,
      airborne: false,
      takeoffSpeed: 0,
      flightDistance: 0,
      ringCount: 0,
      boost: 0,
      engine: 0,
      pedal: 0,
      pedalRate: 0,
      rewardTime: 0,
      lifted: 0,
      groundLeaves: 0,
      nextHorn: 0,
      hornCount: 0,
      fade: 0,
      fov: 40,
      shimmer: 0,
    };
    function seedRoad() {
      leaves.length = 0;
      const count = Math.min(680, 225 + 92 * (st.lap - 1));
      for (let i = 0; i < count; i++) {
        const edge = rand() < 0.5,
          sign = rand() < 0.5 ? -1 : 1;
        leaves.push({
          s: rand() * 83 - 7,
          x: sign * (edge ? 2 + rand() * 1.24 : rand() * 2),
          h: 0.012,
          vx: 0,
          vs: 0,
          vy: 0,
          angle: rand() * 6.28,
          spin: 0,
          size: 0.065 + rand() * 0.085,
          flying: false,
          kind: Math.floor(rand() * 5),
        });
      }
      st.groundLeaves = count;
    }
    seedRoad();
    function press(on) {
      st.pressed = !!on && st.phase === 'drive';
      if (on && st.pressed) {
        st.idle = 0;
        st.hint = 0;
      }
    }
    function emit(kind, n = 0) {
      if (kind === 'gate')
        for (let i = 0; i < 26; i++) {
          const a = rand() * 6.283;
          sparks.push({
            s: gates[n],
            x: 1.65 * Math.cos(a),
            y: 1.56 + 1.65 * Math.sin(a),
            vx: 0.75 * Math.cos(a),
            vy: 0.7 + 0.7 * Math.sin(a),
            vs: rand() * 2.2,
            life: 0.53 + rand() * 0.48,
          });
        }
      if (kind === 'lap') sparks.length = 0;
      events.push({ kind, n });
      if (events.length > 48) events.shift();
    }
    function horn(index, automatic = false) {
      if (st.phase !== 'welcome') return;
      const n = Number.isInteger(index) && index >= 0 && index < 4 ? index : st.hornCount % 4;
      st.hornCount++;
      if (!automatic) {
        st.idle = 0;
        st.hint = 0;
      }
      salutes[n] = { lift: 0.005, velocity: 0.64, glow: 1 };
      emit('horn', n);
    }
    function nextLap() {
      Object.assign(st, {
        phase: 'drive',
        lap: st.lap + 1,
        distance: 0,
        speed: 0,
        pressed: false,
        idle: 0,
        ringCount: 0,
        airborne: false,
        airHeight: 0,
        boost: 0,
        roll: 0,
        rollRate: 0,
        pitch: 0,
        pitchRate: 0,
        heave: 0,
        heaveRate: 0,
        surge: 0,
        surgeRate: 0,
        rewardTime: 0,
        nextHorn: 0,
        hornCount: 0,
        fade: 1,
        hint: 0,
      });
      salutes.length = 0;
      seedRoad();
      emit('lap');
    }
    function integrate(dt) {
      const before = st.distance;
      if (st.phase === 'drive') {
        st.idle = st.pressed ? 0 : st.idle + dt;
        st.hint = st.idle > 4 ? st.idle - 4 : 0;
        const oldSpeed = st.speed;
        st.speed = clamp(st.speed + (st.pressed ? 6 : -2) * dt, 0, 18);
        st.distance += (oldSpeed + st.speed) * 0.5 * dt;
        if (st.ringCount < gates.length && st.distance >= gates[st.ringCount]) {
          st.speed = Math.min(18, st.speed + 1.45);
          st.boost = 1;
          st.heaveRate += 0.68;
          st.surgeRate += 1.05;
          st.pitchRate += 0.18;
          emit('gate', st.ringCount++);
        }
        if (before < lip && st.distance >= lip) {
          st.airborne = true;
          st.airHeight = 0.42;
          st.airSpeed = 1.45;
          st.takeoffSpeed = st.speed;
          st.flightDistance = 0;
          emit('launch');
        }
        if (st.distance >= finish) {
          st.phase = 'welcome';
          st.pressed = false;
          st.idle = 0;
          st.hint = 0;
          st.rewardTime = 0;
          st.nextHorn = 0.38;
          emit('finish');
        }
      } else {
        st.rewardTime += dt;
        const oldSpeed = st.speed;
        const remaining = Math.max(0, 76.5 - st.distance),
          arrivalSpeed = Math.min(18, Math.sqrt(26 * remaining));
        st.speed += clamp(arrivalSpeed - st.speed, -13 * dt, 5 * dt);
        const moved = (oldSpeed + st.speed) * 0.5 * dt;
        st.distance += Math.min(remaining, moved);
        if (moved >= remaining) st.speed = 0;
        st.idle += dt;
        st.hint = Math.max(0, st.idle - 4);
        if (st.rewardTime >= st.nextHorn && st.nextHorn < 3.1) {
          horn(undefined, true);
          st.nextHorn += 0.85;
        }
        if (st.rewardTime > 5.8) st.fade = Math.min(1, (st.rewardTime - 5.8) / 0.65);
        if (st.rewardTime >= 6.55) nextLap();
      }
      if (st.phase === 'drive') st.fade = Math.max(0, st.fade - 1.7 * dt);
      const moved = Math.max(0, st.distance - before),
        p = route(st.distance);
      st.travel += moved;
      st.wheelAngle = (st.wheelAngle + moved / 0.27) % (Math.PI * 2);
      st.boost *= Math.exp(-3.4 * dt);
      for (const c of cells) {
        c.gustLife -= dt;
        if (c.gustLife <= 0) {
          c.gust = (rand() - 0.37) * 1.55;
          c.gustLife = 0.34 + rand() * 1.9;
        }
        const upstream = cells[Math.max(0, c.i - 1)];
        c.wind += ((c.gust - c.wind) * 0.95 + (upstream.wind - c.wind) * 0.4) * dt;
        c.flexRate += (c.wind * 0.48 - c.flex * 8 - c.flexRate * 2.1) * dt;
        c.flex += c.flexRate * dt;
        c.flow += ((upstream.ripple - c.ripple) * 14 - c.ripple * 3.5 - c.flow * 2.7 + c.wind * 0.11) * dt;
        c.ripple += c.flow * dt;
        c.offset += (c.current + 0.16 * c.wind) * dt;
        c.sun += (1 - 0.18 * Math.abs(c.flex) - c.sun) * 2.4 * dt;
      }
      const local = cells[clamp(Math.floor((st.distance + 6) / 3), 0, 35)];
      st.engine += (0.12 + (st.pressed ? 0.36 : 0) + st.speed / 30 - st.engine) * dt * 6;
      const contact =
        (0.007 * Math.sin(st.distance * 3.2) + 0.003 * Math.sin(st.distance * 13.1)) *
        Math.min(st.speed, 4) *
        0.25;
      st.heaveRate +=
        (108 * (contact - st.heave) -
          9.2 * st.heaveRate +
          local.wind * 0.045 +
          (rand() - 0.5) * st.engine * 1.4) *
        dt;
      st.heave += st.heaveRate * dt;
      st.surgeRate += (-88 * st.surge - 9 * st.surgeRate) * dt;
      st.surge += st.surgeRate * dt;
      const lean = clamp(p.curvature * st.speed * st.speed * 0.016, -0.139626, 0.139626);
      st.rollRate += (32 * (lean - st.roll) - 10 * st.rollRate) * dt;
      st.roll = clamp(st.roll + st.rollRate * dt, -0.139626, 0.139626);
      const pitchTarget = st.airborne ? st.airSpeed * 0.035 : rampHeight(st.distance) > 0 ? 0.12 : 0;
      st.pitchRate += (46 * (pitchTarget - st.pitch) - 9 * st.pitchRate) * dt;
      st.pitch += st.pitchRate * dt;
      if (st.airborne && before >= lip) {
        st.airSpeed -= 9.81 * dt;
        st.airHeight += st.airSpeed * dt;
        st.flightDistance += moved;
        if (st.airHeight <= 0) {
          st.airHeight = 0;
          st.airborne = false;
          st.heaveRate -= 0.9;
          emit('land');
        }
      }
      st.pedalRate += (95 * ((st.pressed ? 1 : 0) - st.pedal) - 15 * st.pedalRate) * dt;
      st.pedal += st.pedalRate * dt;
      st.fov = 40 + (8 * st.speed) / 18;
      st.shimmer = local.sun;
      for (const v of dust) {
        const c = cells[clamp(Math.floor((v.s + 6) / 3), 0, 35)],
          wake = Math.exp(-Math.abs(v.s - st.distance) / 2) * st.speed * 0.12;
        v.vx += (c.wind * 0.68 + wake * Math.sign(v.x) - v.vx) * v.drag * dt;
        v.vy += ((v.leaf ? -0.22 : -0.045) + Math.abs(c.wind) * 0.16 + wake * 0.7 - v.vy) * dt;
        v.x += v.vx * dt;
        v.y += v.vy * dt;
        v.s += c.current * 0.12 * dt;
        v.spin += (v.vx + 0.2) * dt;
        if (v.y < 0.04 || Math.abs(v.x) > 16 || v.s > 89) {
          v.y = 3 + rand() * 4;
          v.x = (rand() - 0.5) * 21;
          v.s = rand() * 88 - 4;
        }
      }
      for (const v of leaves) {
        if (
          !v.flying &&
          moved > 0 &&
          !st.airborne &&
          v.s >= before - 1.1 &&
          v.s < st.distance - 0.42 &&
          Math.abs(Math.abs(v.x) - 0.89) < 0.44
        ) {
          v.flying = true;
          v.vy = 0.7 + st.speed * (0.06 + rand() * 0.13);
          v.vx = Math.sign(v.x) * (0.35 + rand() * st.speed * 0.11);
          v.vs = -st.speed * 0.16;
          v.spin = 2 + rand() * 8;
          st.lifted++;
        }
        if (v.flying) {
          v.vy -= 4.7 * dt;
          v.h += v.vy * dt;
          v.x += v.vx * dt;
          v.s += v.vs * dt;
          v.angle += v.spin * dt;
          v.vx += (local.wind * 0.6 - v.vx) * dt;
          v.vs *= Math.exp(-dt);
          if (v.h < 0.012) {
            v.h = 0.012;
            v.flying = false;
            v.spin = 0;
          }
        }
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const g = sparks[i];
        g.life -= dt;
        if (g.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        g.x += g.vx * dt;
        g.y += g.vy * dt;
        g.s += g.vs * dt;
        g.vy -= 2.1 * dt;
      }
      for (const h of salutes)
        if (h) {
          h.velocity += (-44 * h.lift - 6 * h.velocity) * dt;
          h.lift += h.velocity * dt;
          h.glow *= Math.exp(-2.1 * dt);
        }
    }
    return {
      st,
      cells,
      dust,
      leaves,
      salutes,
      sparks,
      press,
      horn,
      events,
      step(dt) {
        if (!Number.isFinite(dt) || dt <= 0) return;
        while (dt > 1e-9) {
          const h = Math.min(dt, 1 / 120);
          integrate(h);
          dt -= h;
        }
      },
      getState() {
        return {
          ...st,
          waterOffset: cells[7].offset,
          waterRipple: cells[7].ripple,
          branchFlex: cells[7].flex,
          canopyLight: cells[7].sun,
          dustHeight: dust[0].y,
          rollDegrees: (st.roll * 180) / Math.PI,
        };
      },
    };
  }
  const api = {
    create,
    route,
    altitude,
    riverX,
    centerX,
    slope,
    rampHeight,
    gates,
    finish,
    lip,
    randomSource,
    clamp,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AutumnRoad = api;
})(globalThis);
