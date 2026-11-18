/* Units are seconds, centimetres, millilitres and degrees Celsius. */
(function (root) {
  'use strict';
  const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
  const relax = (a, b, rate, dt) => a + (b - a) * -Math.expm1(-rate * dt);
  function bowl() {
    return {milk: 156, milkPending: 0, flour: 112, swirl: 0, angle: 0, work: 0, viscosity: 2.5,
      zones: Array.from({length: 12}, () => ({dry: 1, shear: 0, surface: 0, surfaceSpeed: 0}))};
  }
  function mix(b, dt, force = 0, angle = 0) {
    b.swirl = relax(b.swirl, force, force ? 4.8 : 1.5, dt);
    b.angle += b.swirl * dt;
    b.work += Math.abs(b.swirl) * dt;
    const addedMilk=Math.min(b.milkPending,dt*26);
    b.milkPending-=addedMilk; b.milk+=addedMilk;
    const heights=b.zones.map(z=>z.surface);
    let dry = 0;
    b.zones.forEach((z, i) => {
      const near = (1 + Math.cos(angle - i * Math.PI / 6)) / 2;
      z.shear = relax(z.shear, Math.abs(b.swirl) * (0.38 + near * 0.62), 4, dt);
      // A moving whisk displaces fluid locally. Neighbouring sectors exchange height.
      const push=(near-.5)*b.swirl*.035;
      const neighbours=heights[(i+11)%12]+heights[(i+1)%12]-2*heights[i];
      z.surfaceSpeed+=dt*(push+neighbours*18-heights[i]*12-z.surfaceSpeed*(1.7+b.viscosity));
      z.surface+=dt*z.surfaceSpeed;
      z.dry *= Math.exp(-(0.004 + 0.34 * z.shear) * dt);
      dry += z.dry / 12;
    });
    b.viscosity = (0.88 + 1.62 * dry + 0.42 * Math.min(1, b.work / 60)) * (156 / b.milk) ** 1.8;
  }
  function cake(viscosity = 1.2, x = 0, z = 0) {
    return {viscosity, x, z, volume: 0, radius: 0.5, radialSpeed: 0, contact: 0, flips: 0,
      cells: Array.from({length: 24}, (_, i) => {
        const ring = Math.floor(i / 8);
        return {ring, theta: (i % 8) * Math.PI / 4, r: [0.22, 0.62, 0.9][ring],
          thickness: 0.64, massBias: 1, temp: [22,22], water: [1,1], brown: [0,0], rise: 0,
          gas: 0, bubble: 0, births: 0, pops: 0};
      })};
  }
  function ladle(amount = 56) { return {left: amount, flow: 0, afterRelease: 0}; }
  function pour(c, l, dt, tilted, x = c.x, z = c.z) {
    l.flow = relax(l.flow, tilted && l.left > 0 ? 35 / Math.sqrt(c.viscosity) : 0,
      tilted ? 6 : 3.6 / Math.sqrt(c.viscosity), dt);
    const added = Math.min(l.left, l.flow * dt);
    l.left -= added;
    if (!tilted) l.afterRelease += added;
    if (added > 0) {
      const old = c.volume;
      c.volume += added;
      c.x += (x - c.x) * added / c.volume;
      c.z += (z - c.z) * added / c.volume;
      c.cells.forEach(q => {
        const bias = 1 + 0.12 * q.r * (Math.cos(q.theta) * x + Math.sin(q.theta) * z);
        q.massBias = (q.massBias * old + added * clamp(bias,0.65,1.35)) / c.volume;
      });
    }
  }
  function spread(c, dt) {
    const target = Math.max(0.5, Math.sqrt(c.volume / (Math.PI * (0.44 + 0.16 * c.viscosity))));
    const set = c.cells.reduce((s,q) => s + q.rise, 0) / 24;
    const pressure = Math.max(0, target - c.radius) / (c.viscosity + 0.3);
    c.radialSpeed = relax(c.radialSpeed, pressure * 3 * Math.exp(-12 * set), 5, dt);
    c.radius += dt * c.radialSpeed;
    c.cells.forEach(q => {
      q.thickness = Math.max(0.12, c.volume / (Math.PI*c.radius*c.radius) *
        (1.17 - 0.34 * q.r*q.r) * q.massBias);
    });
  }
  function heat(c, dt, power = 1, onPan = true, supportTemp = 26) {
    const bottom = c.contact, top = 1 - bottom;
    for (const q of c.cells) {
      const thick = q.thickness + q.rise * 0.35;
      const tau = 2.55 * (thick / 0.64) ** 2;
      const px = c.x + c.radius * q.r * Math.cos(q.theta);
      const pz = c.z + c.radius * q.r * Math.sin(q.theta);
      const metal = 24 + 174 * power * Math.max(0.65, 1 - 0.002 * (px*px + pz*pz));
      const a = q.temp[bottom], b = q.temp[top];
      const conduction = (a-b) / (tau*2.6);
      const coupling = onPan ? (metal-a) / tau : (supportTemp-a) * 0.043;
      q.temp[bottom] += dt * (coupling - 0.21 * conduction);
      q.temp[top] += dt * (conduction + (24-b)*0.036 - 0.13*Math.max(0,b-90)*q.water[top]);
      for (let face=0; face<2; face++) {
        const degrees = q.temp[face];
        q.water[face] *= Math.exp(-dt * Math.max(0,degrees-73) * (0.0018 + 0.0005*q.r));
        q.brown[face] = Math.min(1,q.brown[face] + dt * Math.max(0,degrees-139) *
          (1-q.water[face]) * 0.0022);
      }
      const gasRate = Math.max(0,q.temp[top]-48) * q.water[top] * 0.043 / Math.sqrt(c.viscosity);
      const threshold = 0.76 + 0.3*Math.sin(q.theta*3+q.r*9+q.births*2.43);
      if (!q.bubble) q.gas += dt*gasRate*0.38;
      if (!q.bubble && q.gas >= threshold) {
        q.gas = 0; q.bubble = 0.006; q.births++;
      }
      if (q.bubble) {
        q.bubble += dt * (0.036 + gasRate*0.084);
        if (q.bubble >= 0.09 + threshold*0.06) { q.bubble = 0; q.pops++; }
      }
      q.rise += dt * gasRate * 0.024 * Math.max(0,1-q.rise/0.23);
    }
  }
  function meanFace(c, field, face) {
    return c.cells.reduce((sum,q) => sum + q[field][face],0)/c.cells.length;
  }
  function flip(c) {
    c.contact = 1 - c.contact;
    c.flips++;
    for (const q of c.cells) {
      if (q.bubble) q.pops++;
      q.bubble = 0;
      q.gas *= 0.22;
    }
  }
  function butter() {
    return Array.from({length: 9}, (_,i) => ({temp: 12, solid: 1, film: 0, cell: (i*7)%17}));
  }
  function melt(pat,c,dt) {
    for (let i=0;i<pat.length;i++) {
      const p = pat[i], q = c.cells[p.cell], f = 1-c.contact;
      const rate = i===4 ? 0.16 : 0.23;
      const flux = (q.temp[f]-p.temp)*rate;
      p.temp += dt*(flux - (p.temp-22)*0.035);
      const loss = Math.min(p.solid,dt*Math.max(0,p.temp-29)*0.008);
      p.solid -= loss;
      p.temp -= loss*20;
      p.film += loss;
      q.temp[f] -= dt*flux*0.035;
    }
  }
  function syrup() { return {flow: 0, volume: 0, pools: Array(8).fill(0), rim: Array(8).fill(0)}; }
  function drizzle(s,dt,tilt,sector,c) {
    s.flow = relax(s.flow,tilt ? 5.2 : 0,tilt ? 3.1 : 2.4,dt);
    const drop=s.flow*dt;
    s.volume += drop;
    s.pools[sector] += drop;
    const old=s.pools.slice();
    for (let i=0;i<8;i++) {
      const j=(i+1)%8;
      const mobile=(old[i]-old[j])*dt*0.48;
      s.pools[i]-=mobile;
      s.pools[j]+=mobile;
      const runoff=Math.max(0,old[i] - (0.9+c.cells[16+i].rise*2))*dt*0.56;
      s.rim[i]+=runoff;
      s.pools[i]-=runoff;
    }
  }
  const api = {clamp, relax, bowl, mix, cake, ladle, pour, spread, heat, meanFace, flip, butter, melt, syrup, drizzle};
  root.PancakePhysics = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
