'use strict';
function buildValley(A, sim) {
  const {
    T,
    scene,
    rng,
    V,
    noise,
    fb,
    mat,
    mesh,
    box,
    ball,
    rod,
    tube,
    torus,
    group,
    geometry,
    instance,
    flatRibbon,
    rounded,
    batchStatic,
    unitBox,
  } = A;
  const { route, centerX, altitude, riverX, clamp, rampHeight } = AutumnRoad;
  function along(s, x = 0, y = 0) {
    const p = route(s);
    return [p.x + x * Math.cos(p.yaw), p.y + y, p.z - x * Math.sin(p.yaw)];
  }
  function aligned(s, x = 0, y = 0) {
    const p = route(s),
      obj = group();
    obj.position.set(...along(s, x, y));
    obj.rotation.y = p.yaw;
    return obj;
  }
  function ground(x, z) {
    const bank = Math.abs(x - riverX(z)),
      edge = Math.abs(x - centerX(z));
    const channel = 1.68 * (1 - clamp((bank - 1.55) / 2.25, 0, 1));
    return (
      altitude(z) -
      0.12 -
      channel +
      (fb(x * 0.27, z * 0.27) - 0.5) * 0.32 * clamp((edge - 3.25) / 3, 0, 1) +
      Math.max(0, edge - 13) *
        (0.18 + 0.62 * fb(x * 0.044, z * 0.034)) *
        (0.3 + 0.7 * clamp((bank - 3) / 8, 0, 1))
    );
  }
  const soil = mat(0xffffff, 0.98, 0, 'earth', { vertexColors: true }),
    pos = [],
    idx = [],
    uv = [],
    col = [];
  const nx = 161,
    nz = 139,
    soilA = new T.Color(0x999066),
    soilB = new T.Color(0x787d51),
    rockColor = new T.Color(0x8c8470),
    c = new T.Color();
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const x = i - 80,
        z = j - 22,
        h = ground(x, z);
      pos.push(x, h, -z);
      uv.push(x * 0.55, z * 0.55);
      c.copy(soilA)
        .lerp(soilB, fb(x * 0.13, z * 0.13))
        .lerp(rockColor, 1 - clamp((Math.abs(x - riverX(z)) - 1.5) / 3, 0, 1))
        .multiplyScalar(0.85 + 0.32 * noise(x * 0.14, z * 0.14));
      col.push(c.r, c.g, c.b);
      if (i && j) {
        const k = j * nx + i;
        idx.push(k - nx - 1, k - nx, k, k - nx - 1, k, k - 1);
      }
    }
  mesh(geometry(pos, idx, uv, col), soil).castShadow = false;
  // Layered, solid ridges surround the valley. Exposed ridgelines carry patches of pale granite.
  function mountains(far) {
    const p = [],
      u = [],
      id = [],
      co = [],
      n = 151,
      m = 29;
    const ridgePal = far ? [0x7c9190, 0xb1b8aa, 0xd3d0ba] : [0x647969, 0x82927b, 0xb0ae8e];
    const shades = ridgePal.map((k) => new T.Color(k));
    for (let j = 0; j < m; j++)
      for (let i = 0; i < n; i++) {
        const x = (i - (n - 1) / 2) * 2.7,
          z = (far ? 100 : 80) + j * (far ? 3.7 : 2.4);
        const ridge = far ? 151 + 12 * Math.sin(x * 0.039) : 122 + 13 * Math.sin(x * 0.037 + 0.3);
        const peaks = far
          ? 29 + 35 * Math.abs(Math.sin(x * 0.036 + 0.7)) ** 1.2 + 23 * noise(x * 0.055, 9)
          : 10 + 26 * Math.abs(Math.sin(x * 0.035 - 0.7)) + 11 * noise(x * 0.075, 1);
        const side = clamp(1 - Math.abs(z - ridge) / (far ? 63 : 42), 0, 1),
          rib = fb(x * 0.115 + z * 0.064, z * 0.14);
        const valley = 0.28 + 0.72 * clamp(Math.abs(x - 9) / (far ? 60 : 50), 0, 1);
        const h = peaks * valley * side + (rib - 0.51) * (far ? 19 : 13) * side - 3;
        p.push(x, h, -z);
        u.push(x * 0.09, z * 0.09);
        const shade = shades[0]
          .clone()
          .lerp(shades[1], clamp((h - 3) * 0.023 + rib * 0.27, 0, 1))
          .lerp(shades[2], clamp((h - (far ? 38 : 31)) * 0.08 + rib * 0.6 - 0.25, 0, 1));
        co.push(shade.r, shade.g, shade.b);
        if (i && j) {
          const k = j * n + i;
          id.push(k - n - 1, k - n, k, k - n - 1, k, k - 1);
        }
      }
    const o = mesh(
      geometry(p, id, u, co),
      mat(0xffffff, 1, 0, 'stone', { vertexColors: true, flatShading: true }),
    );
    o.castShadow = false;
  }
  mountains(true);
  mountains(false);
  const road = mat(0x807c70, 0.9, 0, 'road'),
    gravel = mat(0xb2a28a, 0.99, 0, 'earth'),
    white = mat(0xcfc6a8, 0.87, 0, 'road'),
    ochre = mat(0xc4aa6e, 0.87, 0, 'road');
  function strip(start, end, left, right, y, m, step = 0.6) {
    const rows = [];
    const n = Math.ceil((end - start) / step);
    for (let j = 0; j <= n; j++) {
      const s = start + ((end - start) * j) / n;
      rows.push([
        along(s, typeof left === 'function' ? left(s) : left, y),
        along(s, typeof right === 'function' ? right(s) : right, y),
        s * 0.65,
        Math.abs((typeof right === 'number' ? right : 4) - (typeof left === 'number' ? left : -4)) * 0.65,
      ]);
    }
    const o = flatRibbon(rows, m);
    o.castShadow = false;
    return o;
  }
  const width = (s) => 3.27 + clamp((s - 65) / 8, 0, 1) * 2.25;
  strip(
    -22,
    110,
    (s) => -width(s) - 0.49,
    (s) => width(s) + 0.49,
    -0.024,
    gravel,
  );
  strip(-22, 110, (s) => -width(s), width, 0, road);
  const markings = [];
  for (const sign of [-1, 1]) {
    markings.push(
      strip(
        -22,
        27.25,
        (s) => sign * width(s) - sign * 0.19 - 0.041,
        (s) => sign * width(s) - sign * 0.19 + 0.041,
        0.008,
        white,
      ),
    );
    markings.push(
      strip(
        38.0,
        105,
        (s) => sign * width(s) - sign * 0.19 - 0.041,
        (s) => sign * width(s) - sign * 0.19 + 0.041,
        0.008,
        white,
      ),
    );
  }
  for (let s = -20.7; s < 64; s += 5.35)
    if (s < 25 || s > 37.9) markings.push(strip(s, s + 1.48, -0.048, 0.048, 0.011, ochre));
  batchStatic(scene, markings);
  // Running water follows its own channel and passes beneath the bridge.
  const waterMat = mat(0x729b97, 0.17, 0.49, null, { vertexColors: true, envMapIntensity: 1.22 }),
    wp = [],
    wu = [],
    wi = [],
    wc = [],
    waterBase = [],
    wm = 10,
    wn = 205;
  const deep = new T.Color(0x94afaa),
    shallow = new T.Color(0xbac6a6);
  for (let j = 0; j < wn; j++)
    for (let i = 0; i < wm; i++) {
      const z = -22 + j * 0.66,
        u = i / (wm - 1),
        x = riverX(z) + (u - 0.5) * (5.65 + 0.42 * Math.sin(z * 0.43)),
        y = altitude(z) - 0.76;
      wp.push(x, y, -z);
      wu.push(x, z);
      waterBase.push(y);
      c.copy(deep)
        .lerp(shallow, Math.abs(u - 0.5) * 1.45)
        .multiplyScalar(0.83 + 0.35 * noise(x, z));
      wc.push(c.r, c.g, c.b);
      const k = j * wm + i;
      if (i && j) wi.push(k - wm - 1, k - wm, k, k - wm - 1, k, k - 1);
    }
  const waterGeo = geometry(wp, wi, wu, wc),
    water = mesh(waterGeo, waterMat);
  water.castShadow = false;
  const foam = mat(0xc8d1bd, 0.28, 0.37),
    glints = [];
  for (let i = 0; i < 168; i++) {
    const z = rng() * 114 - 12;
    glints.push({ z, across: (rng() - 0.5) * 3.8, l: 0.09 + rng() * 0.56 });
  }
  const rippleMesh = instance(
    unitBox,
    foam,
    glints.map(() => ({ p: [0, 0, 0] })),
    false,
  );
  const stones = [],
    grass = [];
  for (let i = 0; i < 980; i++) {
    const z = rng() * 112 - 14,
      sign = rng() < 0.5 ? -1 : 1,
      x = riverX(z) + sign * (1 + rng() * 2.45);
    if (Math.abs(x - centerX(z)) < 3.77 && !(z > 25 && z < 38)) continue;
    const size = 0.07 + rng() ** 2 * 0.58;
    stones.push({
      p: [x, Math.max(ground(x, z), altitude(z) - 0.92), -z],
      s: [size * (0.8 + rng()), size * (0.48 + rng() * 0.48), size * (0.8 + rng())],
      r: [rng() * 0.6, rng() * 6.2, rng() * 0.3],
      c: [0x9c9c89, 0x928c77, 0xaeac94, 0x737c72][i % 4],
    });
  }
  const stoneGeo = new T.IcosahedronGeometry(1, 0);
  stoneGeo.computeVertexNormals();
  instance(stoneGeo, mat(0xffffff, 0.8, 0.07, 'stone'), stones);
  const gp = [],
    gi = [],
    gu = [];
  for (let j = 0; j < 6; j++) {
    const a = j * 2.4,
      x = Math.cos(a) * rng() * 0.12,
      z = Math.sin(a) * rng() * 0.12,
      h = 0.13 + rng() * 0.17,
      k = gp.length / 3;
    gp.push(x - 0.022, 0, z, x + 0.022, 0, z, x + Math.sin(a) * 0.1, h, z + 0.045 * Math.cos(a));
    gu.push(0, 0, 1, 0, 0.5, 1);
    gi.push(k, k + 1, k + 2);
  }
  for (let i = 0; i < 5100; i++) {
    const z = rng() * 116 - 16,
      x = centerX(z) + (rng() < 0.5 ? -1 : 1) * (3.68 + rng() ** 1.4 * 20);
    if (Math.abs(x - riverX(z)) < 2.75) continue;
    const size = 0.65 + rng() * 1.4;
    grass.push({
      p: [x, ground(x, z) - 0.01, -z],
      r: [0, rng() * 6.28, 0],
      s: [size, size, size],
      c: [0x92975c, 0xa99a59, 0xb6a56e, 0x858b58][i % 4],
    });
  }
  instance(geometry(gp, gi, gu), mat(0xffffff, 0.96, 0, null, { side: T.DoubleSide }), grass, false);
  const wood = mat(0x977c52, 0.87, 0, 'wood'),
    timber = mat(0x6d5a3e, 0.9, 0, 'bark'),
    iron = mat(0x52584e, 0.45, 0.68),
    masonry = mat(0xa49a80, 0.88, 0, 'stone');
  const deck = group(),
    bridgeStart = 27.35,
    bridgeEnd = 37.75;
  for (let s = bridgeStart; s < bridgeEnd; s += 0.29) {
    const v = route(s);
    const o = box(deck, wood, v.x, v.y + 0.008, v.z, 7.02, 0.089, 0.28);
    o.rotation.y = v.yaw;
  }
  for (const sign of [-1, 1]) {
    for (let s = bridgeStart; s <= bridgeEnd + 0.04; s += 1.72) {
      const p = along(s, sign * 3.53, 0.49),
        post = box(deck, timber, ...p, 0.19, 1.19, 0.19);
      post.rotation.y = route(s).yaw;
      box(deck, iron, p[0], p[1] + 0.48, p[2], 0.202, 0.1, 0.202).rotation.y = post.rotation.y;
      if (s + 1.72 <= bridgeEnd + 0.1) {
        for (const h of [0.43, 0.91])
          rod(deck, wood, along(s, sign * 3.53, h), along(s + 1.72, sign * 3.53, h), 0.078, 0.078, 4);
      }
    }
    for (const s of [bridgeStart, bridgeEnd]) {
      const p = along(s, sign * 2.56, -0.79);
      box(deck, masonry, ...p, 1.38, 1.64, 1.18).rotation.y = route(s).yaw;
    }
  }
  batchStatic(deck, [...deck.children]);
  const ramp = group(),
    rs = [];
  for (let i = 0; i <= 16; i++) {
    const s = AutumnRoad.lip - 3 + (3 * i) / 16;
    rs.push([along(s, -1.53, rampHeight(s) + 0.016), along(s, 1.53, rampHeight(s) + 0.016), s, 2]);
  }
  flatRibbon(rs, wood, ramp);
  for (const x of [-1.53, 1.53]) rod(ramp, timber, along(39, x, 0.012), along(42, x, 0.42), 0.055);
  batchStatic(ramp, [...ramp.children]);
  const fence = group();
  function fenceRun(start, end, side) {
    for (let s = start; s <= end; s += 2.85) {
      const q = along(s, side * 3.93, 0.38);
      box(fence, timber, ...q, 0.16, 0.92, 0.16).rotation.y = route(s).yaw;
      if (s + 2.85 <= end) {
        rod(fence, wood, along(s, side * 3.93, 0.62), along(s + 2.85, side * 3.93, 0.62), 0.08, 0.08, 4);
        rod(fence, wood, along(s, side * 3.93, 0.3), along(s + 2.85, side * 3.93, 0.3), 0.043, 0.043, 4);
      }
    }
  }
  fenceRun(-9, 22, -1);
  fenceRun(46, 61, 1);
  // Limestone voussoirs and the recessed checkered fabric identify the finish.
  const arch = aligned(AutumnRoad.finish),
    archStone = [0xac9e86, 0xb7aa92, 0xb0a58f, 0xaaa08c, 0xc1b69d].map((v) => mat(v, 0.93, 0, 'stone'));
  const R = 3.8,
    r = 3.03,
    spring = 2.72,
    archDepth = 1.61;
  for (const side of [-1, 1]) {
    for (let j = 0; j < 6; j++) {
      const w = j === 0 ? 1.25 : j === 5 ? 1.12 : 0.95;
      box(
        arch,
        archStone[(j + 2) % 5],
        side * 3.45,
        ((j + 0.5) * spring) / 6,
        0,
        w,
        spring / 6 - 0.017,
        archDepth + (j === 0 || j === 5 ? 0.23 : 0),
      );
    }
    box(arch, archStone[3], side * 3.45, 0.14, 0, 1.49, 0.28, 2.02);
  }
  for (let i = 0; i < 19; i++) {
    const a = (i * Math.PI) / 19 + 0.002,
      b = ((i + 1) * Math.PI) / 19 - 0.002,
      key = i === 9,
      sh = new T.Shape();
    const outer = R + (key ? 0.15 : 0),
      inner = r - (key ? 0.07 : 0);
    sh.moveTo(Math.cos(a) * inner, spring + Math.sin(a) * inner);
    sh.lineTo(Math.cos(a) * outer, spring + Math.sin(a) * outer);
    sh.absarc(0, spring, outer, a, b, false);
    sh.lineTo(Math.cos(b) * inner, spring + Math.sin(b) * inner);
    sh.absarc(0, spring, inner, b, a, true);
    sh.closePath();
    const d = archDepth + (key ? 0.2 : 0);
    mesh(
      new T.ExtrudeGeometry(sh, {
        depth: d,
        bevelThickness: 0.018,
        bevelSize: 0.018,
        bevelSegments: 1,
        curveSegments: 4,
      }),
      archStone[(i * 7) % 5],
      arch,
      0,
      0,
      -d / 2,
    );
  }
  const canvasCream = mat(0xe8dcbc, 0.95, 0, 'cloth', { side: T.DoubleSide }),
    canvasBlack = mat(0x454a40, 0.94, 0, 'cloth', { side: T.DoubleSide });
  for (let i = 0; i < 18; i++)
    for (let j = 0; j < 2; j++) {
      const x = -2.5 + (i * 5) / 18,
        w = 5 / 18,
        drop = (x) => 4.61 + 0.045 * x * x;
      const y = drop(x) + j * 0.198;
      const g = geometry(
        [
          x,
          y,
          0.48,
          x + w,
          drop(x + w) + j * 0.198,
          0.48,
          x + w,
          drop(x + w) + (j + 1) * 0.198,
          0.49,
          x,
          y + 0.198,
          0.49,
        ],
        [0, 1, 2, 0, 2, 3],
        [0, 0, 1, 0, 1, 1, 0, 1],
      );
      mesh(g, (i + j) % 2 ? canvasCream : canvasBlack, arch);
    }
  batchStatic(arch, [...arch.children]);
  const gold = mat(0xffc64b, 0.255, 0.69, null, { emissive: 0xffac25, emissiveIntensity: 0.67 }),
    bright = mat(0xffeeb0, 0.23, 0.37, null, { emissive: 0xffd16a, emissiveIntensity: 1.5 });
  const rings = AutumnRoad.gates.map((s) => {
    const g = aligned(s, 0, 1.56);
    torus(g, gold, 0, 0, 0, 1.67, 0.073, 14, 80);
    torus(g, bright, 0, 0, 0.044, 1.665, 0.019, 8, 80);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const boss = ball(g, bright, 1.67 * Math.cos(a), 1.67 * Math.sin(a), 0.034, 0.051, 0.051, 0.038);
      boss.rotation.z = a;
    }
    batchStatic(g, [...g.children]);
    for (const part of g.children) part.material = part.material.clone();
    return g;
  });
  const gateStars = [];
  for (let i = 0; i < 3; i++) {
    const g = group(rings[i]);
    for (let j = 0; j < 3; j++) {
      const n = (j - 0.5) * 1.9;
      const star = mesh(
        new T.OctahedronGeometry(1, 0),
        bright,
        g,
        Math.cos(n) * 1.67,
        Math.sin(n) * 1.67,
        0.07,
      );
      star.scale.set(0.035, 0.12, 0.023);
    }
    gateStars.push(g);
  }
  const stoneSign = mat(0xe0b85c, 0.55, 0.13, 'metal'),
    arrow = mat(0x474a3e, 0.67, 0.19),
    signs = group();
  for (const [s, side, dir] of [
    [18, -1, 1],
    [50, 1, -1],
  ]) {
    const p = along(s, side * 4.05, 0),
      g = group(signs);
    g.position.set(...p);
    g.rotation.y = route(s).yaw;
    box(g, timber, 0, 0.74, 0, 0.1, 1.5, 0.1);
    const board = mesh(rounded(0.62, 0.62, 0.055, 0.035), stoneSign, g, 0, 1.42, 0);
    board.rotation.z = Math.PI / 4;
    for (const j of [-1, 1]) {
      const a = box(g, arrow, 0, 1.42 + j * 0.091, 0.056, 0.111, 0.31, 0.025);
      a.rotation.z = dir * j * 0.65;
    }
  }
  const signsMeshes = [];
  signs.traverse((o) => {
    if (o.isMesh) signsMeshes.push(o);
  });
  batchStatic(signs, signsMeshes);
  batchStatic(fence, [...fence.children]);
  const transform = new T.Object3D();
  return {
    along,
    ground,
    aligned,
    rings,
    update() {
      const st = sim.st,
        cells = sim.cells;
      rings.forEach((g, i) => {
        g.visible = i >= st.ringCount;
        const cell = cells[5 + i * 5];
        g.rotation.z = cell.flex * 0.1;
        gateStars[i].rotation.z = cell.offset * 0.27;
        gateStars[i].visible = i === st.ringCount;
        for (const part of g.children)
          if (part.isMesh) part.material.emissiveIntensity = (i === st.ringCount ? 1.1 : 0.17) * cell.sun;
      });
      const att = waterGeo.attributes.position;
      for (let j = 0; j < wn; j++) {
        const z = -22 + j * 0.66,
          f = clamp((z + 10) / 3, 0, 34.99),
          k = Math.floor(f),
          c = cells[k],
          d = cells[k + 1],
          phase = c.offset * (1 - f + k) + d.offset * (f - k);
        for (let i = 0; i < wm; i++) {
          const at = j * wm + i,
            x = wp[3 * at],
            wave =
              0.025 * Math.sin(z * 2.8 + phase * 2.7 + x * 2.3) +
              0.012 * Math.sin(z * 5.36 + phase * 3.6 - x * 4.5);
          att.setY(at, waterBase[at] + wave + c.ripple * 0.3);
        }
      }
      att.needsUpdate = true;
      waterGeo.computeVertexNormals();
      glints.forEach((v, i) => {
        const cell = cells[clamp(Math.floor((v.z + 10) / 3), 0, 35)],
          z = v.z - ((cell.offset * 0.5 + i * 0.7) % 2),
          x = riverX(z) + v.across;
        transform.position.set(x, altitude(z) - 0.729 + cell.ripple * 0.33, -z);
        transform.rotation.set(0, -0.2 + 0.3 * Math.sin(z) + cell.flex * 0.5, 0);
        transform.scale.set(v.l, 0.007, 0.022);
        transform.updateMatrix();
        rippleMesh.setMatrixAt(i, transform.matrix);
        c.setRGB(cell.sun, cell.sun, cell.sun);
        rippleMesh.setColorAt(i, c);
      });
      rippleMesh.instanceMatrix.needsUpdate = true;
      rippleMesh.instanceColor.needsUpdate = true;
    },
  };
}
