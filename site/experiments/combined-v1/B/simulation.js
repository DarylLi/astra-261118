// Distances are cm, volumes mL, temperatures °C and time seconds.
(function (root) {
  'use strict';
  const rings = 5, sectors = 16, tau = Math.PI * 2;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  function createKitchen(options = {}) {
    let state, seed, accumulator = 0, nextBubble;
    const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
    function reset() {
      seed = options.seed ?? 91244;
      nextBubble = 0;
      state = {
        phase: 'milk', age: 0, elapsed: 0, heat: options.heat ?? 0.75,
        panTemp: 154, milk: 0, milkRate: 0, milkHeld: false, flour: 100, batterLeft: 0,
        clumps: 1, stir: 0, shear: 0, viscosity: 3.2, pourHeld: false,
        pourRate: 0, aimX: 0, aimZ: 0, cakes: [], current: -1, stack: [],
        butter: { grams: 6, melted: 0, temp: 12 }, syrup: { volume: 0, rate: 0, held: false, trails: [] },
        eaten: 0, wash: 0, scrub: 0, foam: 0, spongeX: 0, spongeZ: 0, stains: [], events: []
      };
    }
    function event(type) { state.events.push(type); if (state.events.length > 64) state.events.shift(); }
    function phase(name) { state.phase = name; state.age = 0; event(name); }
    function makeCake() {
      const cells = [];
      for (let r = 0; r < rings; r++) for (let k = 0; k < sectors; k++) {
        const face = () => ({ temp: 24, water: 0.78, brown: 0, pits: [] });
        cells.push({ r: (r + 0.5) / rings, angle: k * tau / sectors, faces: [face(), face()],
          lift: 0, reactant: 1, gas: random() * 0.085, threshold: 0.12 + random() * 0.14, bubbles: [] });
      }
      const cake = { id: state.cakes.length, volume: 0, radius: 0.2, viscosity: state.viscosity,
        x: state.aimX, z: state.aimZ, cells, contact: 0, place: 'pan', flipped: false,
        altitude: 0, vy: 0, flipAngle: 0, omega: 0, airborne: false, rest: 0, turns: 0, popped: 0, born: 0, thickness: 0, tilt: 0, slide: 0, load: 0 };
      state.cakes.push(cake); state.current = cake.id;
      return cake;
    }
    function action(kind, data = {}) {
      const s = state, p = s.phase;
      if (kind === 'release') { s.milkHeld = s.pourHeld = s.syrup.held = false; return; }
      if (kind === 'heat') { s.heat = clamp(data.value, 0.32, 1); return; }
      if (p === 'milk' && kind === 'milk') { s.milkHeld = true; s.milkRate = Math.max(112, s.milkRate); }
      if (p === 'mix' && kind === 'stir') { s.shear = Math.min(4, s.shear + Math.abs(data.force ?? 1.8)); }
      if (p === 'pour' && (kind === 'aim' || kind === 'pour')) {
        s.aimX = clamp(data.x ?? s.aimX, -4, 4); s.aimZ = clamp(data.z ?? s.aimZ, -3, 3);
        if (kind === 'pour') {
          if (s.current < 0) makeCake();
          s.pourHeld = true; s.pourRate = Math.max(29 * Math.sqrt(2 / s.viscosity), s.pourRate);
        }
      }
      if (p === 'cook' && kind === 'flip' && s.age > 0.75) {
        const c = s.cakes[s.current]; c.flipped = true; c.airborne = true; c.turns++;
        c.vy = 102 + (66-c.volume) * .22; c.omega = Math.PI * 981 / (2*c.vy);
        phase('second');
      }
      if (p === 'second' && kind === 'lift' && s.age > 0.85) {
        s.cakes[s.current].place = 'rack'; s.current = -1; phase('transfer');
      }
      if (p === 'stack' && kind === 'stack') {
        const c = s.cakes[data.id]; if (!c || c.place !== 'rack') return;
        const below = s.cakes[s.stack[s.stack.length - 1]];
        c.place = 'plate'; c.slide = below ? clamp((c.x - below.x) * 0.18, -0.75, 0.75) : 0;
        c.tilt = below ? (below.cells[0].lift - below.cells[64].lift) * 0.16 + c.slide * .035 : 0;
        for (const id of s.stack) s.cakes[id].load += c.volume;
        s.stack.push(c.id); event('place'); if (s.stack.length === 3) phase('butter');
      }
      if (p === 'butter' && kind === 'butter') phase('syrup');
      if (p === 'syrup' && kind === 'syrup') { s.syrup.held = true; s.syrup.rate = Math.max(9, s.syrup.rate); }
      if (p === 'berry' && kind === 'berry') phase('eat');
      if (p === 'eat' && kind === 'eat' && s.age > .9) {
        s.eaten++; s.age = 0; event('bite'); if (s.eaten === 3) phase('lastBite');
      }
      if (p === 'wash' && kind === 'wash') {
        s.scrub = clamp(s.scrub + (data.force ?? 1.6), 0, 4);
        s.spongeX = clamp(data.x ?? 0,-1,1); s.spongeZ = clamp(data.z ?? 0,-1,1);
      }
    }
    function updateCake(c, dt) {
      if (c.volume < .1) return;
      if (c.airborne) {
        c.altitude += c.vy * dt - 981 * dt * dt * .5;
        c.vy -= 981 * dt; c.flipAngle = Math.min(Math.PI,c.flipAngle+c.omega*dt);
        if(c.altitude<=0) { c.altitude=0; c.vy=0; c.airborne=false; c.flipAngle=Math.PI; c.contact=1; }
      }
      const s = state, onPan = c.place === 'pan' && !c.airborne, layer=s.stack.indexOf(c.id);
      const below = layer>0 ? s.cakes[s.stack[layer-1]] : null;
      const above = layer>=0 && layer+1<s.stack.length ? s.cakes[s.stack[layer+1]] : null;
      const goalRadius = Math.min(7.73, Math.sqrt(c.volume / (Math.PI * (.24 + c.viscosity * .10))));
      const wet = c.cells[0].faces[1 - c.contact].water;
      c.radius += Math.max(0, goalRadius - c.radius) * (1 - Math.exp(-dt * (0.9 + wet) / c.viscosity * 3));
      // The pan wall redirects an expanding off-centre deposit back into the basin.
      const offset = Math.hypot(c.x,c.z), clearance = 7.85 - c.radius;
      if (onPan && offset > clearance) { c.x *= clearance / offset; c.z *= clearance / offset; }
      let lift = 0; if (!onPan) c.rest += dt;
      for (let i = 0; i < c.cells.length; i++) {
        const cell = c.cells[i], r = cell.r, edge = r * r;
        const front = cell.faces[c.contact], back = cell.faces[1 - c.contact];
        const dx = c.x + r * c.radius * Math.cos(cell.angle), dz = c.z + r * c.radius * Math.sin(cell.angle);
        const localPan = s.panTemp - (dx * dx + dz * dz) * .44;
        const conduct = (front.temp - back.temp) * (.34 + .35 * edge) / (1 + c.viscosity * .12 + cell.lift * .6);
        const touchingBelow=below && Math.hypot(r*c.radius*Math.cos(cell.angle)+c.slide-below.slide,r*c.radius*Math.sin(cell.angle))<below.radius;
        const covered=above && Math.hypot(r*c.radius*Math.cos(cell.angle)+c.slide-above.slide,r*c.radius*Math.sin(cell.angle))<above.radius;
        const baseTemp = onPan ? localPan : touchingBelow ? below.cells[i].faces[1 - below.contact].temp : 24;
        const flux = (baseTemp - front.temp) * (onPan ? 1.0 + edge * .19 : touchingBelow ? .13+Math.min(.16,below.load/(Math.PI*below.radius**2)*.19) : .095);
        const exposedFlux=covered?(above.cells[i].faces[above.contact].temp-back.temp)*(.13+Math.min(.16,c.load/(Math.PI*c.radius**2)*.19)):(24-back.temp)*.050;
        const prevTop = back.temp;
        for (const f of [front, back]) {
          const exposed = f === back;
          const evap = Math.max(0, f.temp - (exposed ? 38 : 62)) * .00145 *
            (.54 + edge * .65) * (exposed ? (covered?.37:1.1) : .63) * f.water;
          f.water = Math.max(.025, f.water - evap * dt);
          const browning = Math.max(0, f.temp - 106) * .0028 * Math.pow(1 - f.water, 1.55);
          f.brown = Math.min(1, f.brown + dt * browning * (1 - f.brown));
          const sensible = dt * ((exposed ? conduct + exposedFlux : flux - conduct) - evap * 145);
          const predicted = f.temp + sensible;
          // Available latent heat holds a wet patch near boiling until its film dries.
          const latent = Math.min(Math.max(0,f.water-.025)*142,
            Math.max(0,predicted-98) * clamp((f.water-.045)/.32,0,.93));
          f.temp = predicted - latent;
          f.water -= latent / 142;
        }
        const gasRate = Math.max(0, Math.min(prevTop - 31, 72)) * .00235 * Math.max(0,back.water-.06) * cell.reactant * (1 - .25 * edge);
        cell.reactant = Math.max(0,cell.reactant-gasRate*dt*.57);
        cell.gas += gasRate * dt;
        cell.lift = Math.min(.66, cell.lift + gasRate * dt * (.42 + c.viscosity * .13) * (1 - cell.lift / .66));
        if (cell.gas > cell.threshold && onPan && cell.bubbles.length < 2) {
          cell.gas -= cell.threshold; cell.threshold = .17 + random() * .36;
          cell.bubbles.push({ id: nextBubble++, face: 1 - c.contact, size: .025, limit: .10 + random() * .17,
            dr: (random() - .5) * .1, da: (random() - .5) * .24 }); c.born++;
        }
        for (let j = cell.bubbles.length - 1; j >= 0; j--) {
          const b = cell.bubbles[j]; b.size += dt * (.055 + gasRate * 1.6) / Math.sqrt(c.viscosity);
          if (b.size >= b.limit || b.face === c.contact) {
            cell.bubbles.splice(j, 1); c.popped++;
            const pits=cell.faces[b.face].pits;
            if(pits.length<5){
              const a=cell.angle+b.da, r=cell.r+b.dr;
              pits.push({x:r*Math.cos(a), z:r*Math.sin(a), radius:b.size});
            }
          }
        }
        lift += cell.lift;
      }
      c.thickness = c.volume / (Math.PI * c.radius * c.radius) + lift / c.cells.length;
    }
    function updateToppings(dt) {
      const s = state, top = s.cakes[s.stack[s.stack.length - 1]];
      if (!top || ['butter','stack'].includes(s.phase)) return;
      const butter = s.butter, t = top.cells[0].faces[1 - top.contact].temp;
      const heatIn = (t - butter.temp) * .77 * dt;
      const capacity = 6 * 2.1;
      const predicted = butter.temp + (heatIn - (butter.temp - 22) * .08 * dt) / capacity;
      const melt = Math.min(butter.grams, Math.max(0, predicted - 31.5) * capacity / 65);
      butter.temp = predicted - melt * 65 / capacity;
      butter.grams -= melt; butter.melted += melt;
      for (let i=0; i<32; i++) top.cells[i].faces[1-top.contact].temp -= heatIn / (top.volume * .36 * 2.7);
      const syrup = s.syrup;
      syrup.rate += ((syrup.held ? 13 : 0) - syrup.rate) * (1 - Math.exp(-dt * (syrup.held ? 3 : 1.65)));
      if (syrup.volume < 22) syrup.volume = Math.min(22,syrup.volume + syrup.rate * dt);
      if (syrup.volume > .04) {
        if (!syrup.trails.length) for (let i = 0; i < 7; i++) syrup.trails.push({ angle: i * tau / 7 + random() * .42, length: 0, speed: 0, feed: .76 + random() * .50 });
        for (const tr of syrup.trails) {
          const rim = tr.length > top.radius, head = Math.max(0, syrup.volume * tr.feed - tr.length * .88);
          tr.speed += dt * (head * (rim ? .62 : .39) + Math.sin(tr.angle) * top.tilt - tr.speed * 2);
          tr.length = clamp(tr.length + Math.max(0, tr.speed) * dt, 0, top.radius + s.stack.reduce((a,id) => a+s.cakes[id].thickness,0) + .6);
        }
      }
      if (s.phase === 'syrup' && (syrup.volume >= 17 || (!syrup.held && syrup.rate < .85 && syrup.volume > 3))) {
        syrup.held = false; phase('berry');
      }
    }
    function advance(dt) {
      const s = state;
      s.age += dt; s.elapsed += dt;
      s.panTemp += ((92 + s.heat * 118) - s.panTemp) * .23 * dt;
      if (s.phase === 'milk' || s.milkRate > .01) {
        s.milkRate += ((s.milkHeld ? 104 : 0) - s.milkRate) * (1 - Math.exp(-dt * (s.milkHeld ? 2.4 : .78)));
        const previousMilk=s.milk;
        s.milk = Math.min(195, s.milk + s.milkRate * dt);
        if(s.phase!=='milk' && s.phase!=='mix')s.batterLeft+=s.milk-previousMilk;
        if(s.milk===195)s.milkRate=0;
        if (s.phase === 'milk' && (s.milk >= 185 || (!s.milkHeld && s.milkRate < 7 && s.milk > 125))) {
          s.milkHeld = false; phase('mix');
        }
      }
      if (s.phase === 'mix') {
        s.shear *= Math.exp(-dt * 2); s.stir += s.shear * dt;
        s.clumps *= Math.exp(-s.shear * dt * (.44 + s.milk / 360));
        s.viscosity = options.viscosity ?? (1.05 + 4.60 / (.15 + s.milk / s.flour)**2 + .68 * s.clumps);
        if (s.clumps < .08) { s.batterLeft=s.milk+s.flour/1.50; phase('scoop'); }
      }
      if (s.phase === 'pour' || s.pourRate > .01) {
        s.pourRate += ((s.pourHeld ? 39 * Math.sqrt(2 / s.viscosity) : 0) - s.pourRate) * (1 - Math.exp(-dt * (s.pourHeld ? 2.6 : 1.25 + .19 * s.viscosity) / Math.sqrt(s.viscosity)));
        const c = s.cakes[s.current];
        if (c && !c.flipped) {
          const dv = Math.min(66 - c.volume, s.batterLeft, s.pourRate * dt);
          if (dv > 0) { c.x += (s.aimX - c.x) * dv / (c.volume + dv); c.z += (s.aimZ - c.z) * dv / (c.volume + dv); c.volume += dv; s.batterLeft -= dv; }
          if (c.volume >= 66) s.pourRate = 0;
          if (s.phase === 'pour' && (c.volume >= 52 || (!s.pourHeld && c.volume > 9 && s.pourRate < 6))) {
            s.pourHeld = false; phase('cook');
          }
        }
      }
      for (const c of s.cakes) updateCake(c, dt);
      if (s.phase === 'transfer' && s.age >= 1.1) { s.pourRate = 0; phase(s.cakes.length === 3 ? 'stack' : 'scoop'); }
      if (s.phase === 'scoop' && s.age >= 1.05) phase('pour');
      updateToppings(dt);
      if (s.phase === 'lastBite' && s.age > 1.55) {
        for(let i=0;i<20;i++) {
          const angle=i*2.39996, radius=Math.sqrt((i+1)/21)*.81;
          s.stains.push({x:Math.cos(angle)*radius,z:Math.sin(angle)*radius,mass:.018+random()*.044});
        }
        phase('wash');
      }
      if (s.phase === 'wash') {
        s.scrub *= Math.exp(-2 * dt); s.wash += s.scrub * dt;
        s.foam = clamp(s.foam + (s.scrub * .40 - s.foam * .8) * dt, 0, 1);
        if (s.wash > 4.8) phase('drain');
      }
      if (s.phase === 'wash' || s.phase === 'drain') {
        for(const spot of s.stains) {
          const distance=(spot.x-s.spongeX)**2+(spot.z-s.spongeZ)**2;
          spot.mass *= Math.exp(-dt*(s.phase==='drain'?4:.23+s.scrub*(.42+2.3*Math.exp(-distance*4))));
        }
      }
      if (s.phase === 'drain' && s.age > 1.8) { reset(); event('reset'); }
    }
    function step(dt) {
      if (!Number.isFinite(dt) || dt < 0) throw new RangeError('dt');
      accumulator += dt;
      while (accumulator >= 1 / 60 - 1e-10) { accumulator -= 1 / 60; advance(1 / 60); }
    }
    reset();
    return { step, action, getState: () => JSON.parse(JSON.stringify(state)), read: () => state };
  }
  const api = { createKitchen, rings, sectors };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PancakeKitchen = api;
})(globalThis);
