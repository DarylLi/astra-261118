'use strict';
function growForest(A, land, sim) {
  const { T, V, rng, noise, geometry, mat, instance, scene } = A;
  const foliage = mat(0xffffff, 0.95, 0, 'leaf', { vertexColors: true, side: T.DoubleSide }),
    bark = mat(0xffffff, 0.94, 0, 'bark', { vertexColors: true });
  const palettes = [
    [0x98613c, 0xc7773c, 0xc98c49, 0xe2a661],
    [0x935039, 0xb15232, 0xcb6840, 0xdb7944],
    [0xb18b3c, 0xd4a84d, 0xdfb457, 0xe6c681],
    [0x847842, 0xa69743, 0xc7ac55, 0xd2b85d],
    [0x914b31, 0xad5935, 0xc87e43, 0xd59a53],
  ];
  const pack = () => ({ p: [], i: [], u: [], c: [] });
  function vert(b, v, color, u, w) {
    b.p.push(...v);
    b.c.push(color.r, color.g, color.b);
    b.u.push(u, w);
  }
  const geom = (b) => geometry(b.p, b.i, b.u, b.c);
  function stem(b, a, end, r1, r2, color) {
    const axis = V(...end)
        .sub(V(...a))
        .normalize(),
      e1 = V(0, 0, 1).cross(axis).normalize(),
      e2 = axis.clone().cross(e1);
    const k = b.p.length / 3,
      n = 7;
    for (let j = 0; j < 2; j++)
      for (let i = 0; i < n; i++) {
        const theta = (i / n) * 6.283,
          r = j ? r2 : r1,
          q = V(...(j ? end : a))
            .addScaledVector(e1, r * Math.cos(theta))
            .addScaledVector(e2, r * Math.sin(theta));
        vert(b, q.toArray(), color, i / n, j);
      }
    for (let i = 0; i < n; i++) {
      const next = (i + 1) % n;
      b.i.push(k + i, k + next, k + n + next, k + i, k + n + next, k + n + i);
    }
  }
  function tuft(b, x, y, z, wx, hy, wz, colors) {
    const k = b.p.length / 3,
      n = 8,
      m = 5,
      rotation = rng() * 6.28,
      tone = rng(),
      base = colors[tone < 0.3 ? 0 : tone < 0.76 ? 1 : 2],
      shade = new T.Color();
    for (let j = 0; j <= m; j++) {
      const lat = (j / m - 0.5) * Math.PI;
      for (let i = 0; i < n; i++) {
        const a = (i * 6.283) / n + rotation + (j % 2) * 0.3,
          scale = 0.77 + rng() * 0.47,
          cos = Math.cos(lat);
        shade
          .copy(base)
          .lerp(colors[3], (0.1 + rng() * 0.25) * (j / m))
          .multiplyScalar(0.78 + (0.2 * j) / m + rng() * 0.14);
        vert(
          b,
          [
            x + Math.cos(a) * cos * wx * scale,
            y + Math.sin(lat) * hy * (0.88 + 0.18 * rng()),
            z + Math.sin(a) * cos * wz * scale,
          ],
          shade,
          i * 0.38,
          j * 0.35,
        );
        if (j) {
          const l = k + j * n + i,
            next = k + j * n + ((i + 1) % n);
          b.i.push(l - n, l, next, l - n, next, next - n);
        }
      }
    }
    const bands = [0, 2, 4, 5];
    for (let row = 1; row < bands.length; row++)
      for (let i = 0; i < n; i += 2) {
        const lower = k + bands[row - 1] * n,
          upper = k + bands[row] * n,
          next = (i + 2) % n;
        b.far.push(lower + i, upper + i, upper + next, lower + i, upper + next, lower + next);
      }
    // Small leaf sprays interrupt the silhouette and catch direct sun individually.
    for (let j = 0; j < 31; j++) {
      const a = rng() * 6.283,
        hh = rng() * 1.8 - 0.8,
        horiz = Math.sqrt(1 - hh * hh),
        px = x + Math.cos(a) * horiz * wx * (0.89 + rng() * 0.22),
        py = y + hh * hy,
        pz = z + Math.sin(a) * horiz * wz * (0.89 + rng() * 0.22),
        w = 0.042 + rng() * 0.075,
        l = w * (1.5 + rng()),
        tilt = rng() * 6.28,
        dx = w * Math.cos(tilt),
        dz = w * Math.sin(tilt),
        off = b.p.length / 3;
      shade.copy(colors[1 + Math.floor(rng() * 3)]).multiplyScalar(0.85 + rng() * 0.25);
      vert(b, [px - dx, py, pz - dz], shade, 0, 0);
      vert(b, [px + dz * 0.8, py + l, pz - dx * 0.8], shade, 0.5, 1);
      vert(b, [px + dx, py + 0.025, pz + dz], shade, 1, 0);
      vert(b, [px - dz * 0.6, py - l * 0.35, pz + dx * 0.6], shade, 0.5, 0);
      b.i.push(off, off + 1, off + 2, off, off + 2, off + 3);
    }
  }
  function deciduous(id) {
    const t = pack(),
      l = pack(),
      colors = palettes[id].map((c) => new T.Color(c)),
      wood = new T.Color(id === 2 ? 0x898570 : 0x695e4c),
      height = 5.35 + (id === 2 ? 0.64 : 0),
      spread = id === 2 ? 0.76 : 1;
    l.far = [];
    const lean = (rng() - 0.5) * 0.54;
    stem(t, [0, -0.1, 0], [lean * 0.25, 1.87, 0.055], 0.245, 0.147, wood);
    stem(t, [lean * 0.25, 1.85, 0.055], [lean * 0.55, 3.65, -0.04], 0.15, 0.103, wood);
    stem(t, [lean * 0.55, 3.63, -0.04], [lean, height, 0.05], 0.103, 0.027, wood);
    for (let j = 0; j < 14; j++) {
      const a = j * 2.399 + rng() * 0.65,
        h = 1.65 + j * 0.208,
        length = (1.24 + 0.72 * Math.sin((j / 14) * Math.PI) + rng() * 0.47) * spread * (1 - (0.43 * j) / 14),
        x = Math.cos(a) * length,
        z = Math.sin(a) * length,
        endY = Math.min(height + 0.3, h + 0.94 + rng() * 0.61),
        fork = [(lean * h) / height + x * 0.51, h + 0.39, z * 0.52];
      stem(t, [(lean * h) / height, h, 0], fork, 0.095 * (1 - j / 24), 0.052, wood);
      stem(t, fork, [x, endY, z], 0.055, 0.021, wood);
      for (let n = 0; n < 3; n++) {
        const beta = a + (n - 1) * 0.85,
          reach = 0.31 + rng() * 0.34,
          xx = x + Math.cos(beta) * reach,
          zz = z + Math.sin(beta) * reach,
          yy = endY + 0.15 + rng() * 0.43;
        stem(t, [x, endY, z], [xx, yy, zz], 0.024, 0.006, wood);
        const size = 0.65 + rng() * 0.3;
        tuft(l, xx, yy, zz, size * (0.83 + rng() * 0.32), size * (0.56 + rng() * 0.31), size, colors);
      }
    }
    tuft(l, lean, height + 0.48, 0.06, 0.96, 0.72, 0.86, colors);
    const distant = pack(),
      used = new Map();
    for (const index of l.far) {
      if (!used.has(index)) {
        used.set(index, distant.p.length / 3);
        distant.p.push(...l.p.slice(index * 3, index * 3 + 3));
        distant.c.push(...l.c.slice(index * 3, index * 3 + 3));
        distant.u.push(...l.u.slice(index * 2, index * 2 + 2));
      }
      distant.i.push(used.get(index));
    }
    return [geom(t), geom(l), geom(distant)];
  }
  const types = palettes.map((_, i) => ({ g: deciduous(i), items: [] }));
  const { centerX, riverX } = AutumnRoad;
  function plant(x, z, size, id, angle) {
    if (z > 8 && z < 63 && Math.abs(x - (0.043 * z - 0.31)) < 3.2 * size + 1.25) return;
    if (Math.abs(x - riverX(z)) < 3.3 || Math.abs(x - centerX(z)) < (z > 61 ? 7.2 : 4.95)) return;
    types[id].items.push({
      p: [x, land.ground(x, z) - 0.02, -z],
      r: [0, angle, 0],
      s: [size * (0.9 + rng() * 0.22), size, size],
      zone: Math.max(0, Math.min(35, Math.floor((z + 10) / 3))),
    });
  }
  // Planted in groves, with clear sightlines across the stream.
  [
    [-5.9, 2, 1.38, 1],
    [5.7, 6.4, 1.18, 2],
    [-6, 13.5, 1.26, 2],
    [12.8, 18, 1.29, 1],
    [13.7, 25, 1.37, 2],
    [-3.1, 22, 1.18, 4],
    [-8.5, 43, 1.25, 1],
  ].forEach(([x, z, s, id]) => plant(x, z, s, id, rng() * 6.28));
  for (let i = 0; i < 195; i++) {
    const z = rng() * 116 - 14,
      side = rng() < 0.5 ? -1 : 1,
      off = 6.2 + rng() ** 0.76 * 43;
    const x = centerX(z) + side * off;
    if (z > 24 && z < 38 && off < 10) continue;
    if (z > 91 && Math.abs(x - 4) < 13) continue;
    const id = Math.floor(rng() * types.length);
    plant(x, z, 0.77 + rng() * 0.65, id, rng() * 6.28);
  }
  const matrix = new T.Object3D(),
    canopies = types.map((type) => {
      instance(type.g[0], bark, type.items);
      return [type.g[1], type.g[2]].map((geo) => {
        const o = instance(geo, foliage, type.items);
        o.computeBoundingSphere();
        return o;
      });
    });
  // Layered conifer boughs establish the middle distance below the ridgeline.
  const pine = pack(),
    pc = new T.Color();
  for (let k = 0; k < 8; k++) {
    const h = 0.48 + k * 0.53,
      r = 1.43 * (1 - k / 10),
      n = 13;
    for (let i = 0; i < n; i++) {
      const a = (i * 6.28) / n + k * 1.73,
        r1 = r * (0.86 + rng() * 0.22),
        k0 = pine.p.length / 3;
      pc.setHex([0x536953, 0x60735a, 0x687d64, 0x75836b][(i + k) % 4]);
      vert(pine, [0, h + 1.58, 0], pc, 0.5, 1);
      vert(pine, [r1 * Math.cos(a - 0.29), h + 0.14, r1 * Math.sin(a - 0.29)], pc, 0, 0);
      vert(pine, [r1 * 1.1 * Math.cos(a), h - 0.08, r1 * 1.1 * Math.sin(a)], pc, 0.5, 0);
      vert(pine, [r1 * Math.cos(a + 0.3), h + 0.14, r1 * Math.sin(a + 0.3)], pc, 1, 0);
      pine.i.push(k0, k0 + 2, k0 + 1, k0, k0 + 3, k0 + 2);
    }
  }
  const evergreens = [];
  for (let i = 0; i < 420; i++) {
    const z = -12 + rng() * 127,
      x = (rng() - 0.5) * 151;
    if (Math.abs(x - centerX(z)) < (z > 96 ? 11 : 19) || Math.abs(x - riverX(z)) < 3) continue;
    const s = 0.66 + rng() * 1.14;
    evergreens.push({
      p: [x, land.ground(x, z), -z],
      s: [s, s * (0.95 + rng() * 0.32), s],
      r: [0, rng() * 6.28, 0],
    });
  }
  instance(geom(pine), foliage, evergreens);
  return () => {
    const p = AutumnRoad.route(sim.st.distance);
    types.forEach((v, k) => {
      const counts = [0, 0];
      v.items.forEach((tree) => {
        const c = sim.cells[tree.zone],
          lod = (tree.p[0] - p.x) ** 2 + (tree.p[2] - p.z) ** 2 < 31 ** 2 ? 0 : 1;
        matrix.position.set(...tree.p);
        matrix.rotation.set((c.flex * 0.26) / tree.s[0], tree.r[1], (c.flex * 0.42) / tree.s[0]);
        matrix.scale.set(...tree.s);
        matrix.updateMatrix();
        canopies[k][lod].setMatrixAt(counts[lod]++, matrix.matrix);
      });
      canopies[k].forEach((o, i) => {
        o.count = counts[i];
        o.instanceMatrix.needsUpdate = true;
      });
    });
  };
}
