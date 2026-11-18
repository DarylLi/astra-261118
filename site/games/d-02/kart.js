'use strict';
function buildKart(A, parent, paint, driver) {
  const { T, mat, mesh, box, ball, cylinder, rod, tube, torus, group, geometry, rounded, batchStatic } = A;
  const root = group(parent),
    chassis = group(root),
    wheels = [],
    body = group(chassis);
  const red = mat(paint, 0.29, 0.47),
    cream = mat(0xf1dfaf, 0.38, 0.27),
    chrome = mat(0xbec2b7, 0.24, 0.91, 'metal'),
    gold = mat(0xb69c5f, 0.29, 0.79, 'metal'),
    steel = mat(0x42494a, 0.4, 0.73, 'metal'),
    black = mat(0x262926, 0.83, 0.04, 'micro'),
    tread = mat(0x343734, 0.81, 0.03),
    leather = mat(0x79452d, 0.58, 0.09, 'cloth'),
    dark = mat(0x302b24, 0.57, 0.09),
    rearLens = mat(0xa5241b, 0.18, 0.34, null, { emissive: 0x650c03, emissiveIntensity: 0.4 });
  const piece = (p, m, x, y, z, w, h, l, r) => mesh(rounded(w, h, l, r), m, p, x, y, z);
  function loft(p, m, sections) {
    const pos = [],
      idx = [],
      uv = [];
    const count = 24;
    sections.forEach(([z, w, h, b, cx = 0], j) => {
      for (let i = 0; i < count; i++) {
        const a = (i / count) * 2 * Math.PI;
        const sx = Math.sign(Math.cos(a)) * Math.abs(Math.cos(a)) ** 0.65,
          sy = Math.sign(Math.sin(a)) * Math.abs(Math.sin(a)) ** 0.8;
        pos.push(cx + sx * w, b + h * sy, z);
        uv.push(i / count, j / sections.length);
        if (j) {
          const k = j * count + i,
            l = j * count + ((i + 1) % count);
          idx.push(k - count, l - count, l, k - count, l, k);
        }
      }
    });
    for (let i = 1; i < count - 1; i++) {
      const j = (sections.length - 1) * count;
      idx.push(0, i + 1, i, j, j + i, j + i + 1);
    }
    return mesh(geometry(pos, idx, uv), m, p);
  }
  // A steel perimeter frame supports four independent wheels and a sprung tub.
  rod(root, steel, [-0.99, 0.31, 0.7], [0.99, 0.31, 0.7], 0.074);
  rod(root, steel, [-0.9, 0.3, -0.86], [0.9, 0.3, -0.86], 0.052);
  for (const side of [-1, 1])
    for (const fore of [-1, 1]) {
      const wheel = group(root);
      wheel.position.set(
        side * (fore === 1 ? 0.92 : 0.86),
        fore === 1 ? 0.32 : 0.285,
        fore === 1 ? 0.72 : -0.88,
      );
      wheels.push(wheel);
      const profile =
        fore === 1
          ? [
              [0.0, -0.15],
              [0.2, -0.16],
              [0.275, -0.152],
              [0.313, -0.118],
              [0.324, -0.076],
              [0.324, 0.076],
              [0.313, 0.118],
              [0.275, 0.152],
              [0.2, 0.16],
              [0.0, 0.15],
            ]
          : [
              [0, -0.112],
              [0.209, -0.116],
              [0.269, -0.1],
              [0.284, -0.065],
              [0.284, 0.065],
              [0.269, 0.1],
              [0.209, 0.116],
              [0, 0.112],
            ];
      const tire = mesh(
        new T.LatheGeometry(
          profile.map(([r, y]) => new T.Vector2(r, y)),
          40,
        ),
        black,
        wheel,
      );
      tire.rotation.z = Math.PI / 2;
      const R = fore === 1 ? 0.323 : 0.282;
      for (const dx of [-0.064, 0, 0.064]) {
        const ridge = torus(wheel, tread, dx, 0, 0, R, 0.0045, 5, 40);
        ridge.rotation.y = Math.PI / 2;
      }
      const rim = fore === 1 ? 0.158 : 0.119,
        capX = side * rim;
      const disc = cylinder(wheel, chrome, capX, 0, 0, 0.176, 0.018);
      disc.rotation.z = Math.PI / 2;
      const hub = cylinder(wheel, steel, capX + side * 0.013, 0, 0, 0.142, 0.019);
      hub.rotation.z = Math.PI / 2;
      const rimlip = torus(wheel, chrome, capX + side * 0.023, 0, 0, 0.162, 0.014, 8, 32);
      rimlip.rotation.y = Math.PI / 2;
      for (let j = 0; j < 6; j++) {
        const a = (j / 6) * Math.PI * 2;
        rod(
          wheel,
          gold,
          [capX + side * 0.026, 0.04 * Math.sin(a), 0.04 * Math.cos(a)],
          [capX + side * 0.026, 0.136 * Math.sin(a + 0.12), 0.136 * Math.cos(a + 0.12)],
          0.016,
          0.021,
          6,
        );
      }
      ball(wheel, chrome, capX + side * 0.033, 0, 0, 0.028, 0.051, 0.051);
      batchStatic(wheel, [...wheel.children]);
    }
  piece(body, steel, 0, 0.31, 0, 1.52, 0.12, 2.11, 0.055);
  loft(body, red, [
    [-1.43, 0.41, 0.042, 0.43],
    [-1.35, 0.62, 0.095, 0.44],
    [-1.16, 0.69, 0.16, 0.47],
    [-0.83, 0.56, 0.19, 0.49],
    [-0.41, 0.49, 0.125, 0.38],
    [0.59, 0.55, 0.16, 0.42],
    [0.97, 0.65, 0.17, 0.47],
    [1.11, 0.58, 0.11, 0.46],
  ]);
  // Hand-painted ivory stripes continue down the bonnet.
  for (const side of [-1, 1]) {
    tube(
      body,
      cream,
      [
        [side * 0.115, 0.481, -1.425],
        [side * 0.12, 0.54, -1.342],
        [side * 0.125, 0.625, -1.16],
        [side * 0.129, 0.685, -0.83],
        [side * 0.13, 0.63, -0.66],
      ],
      0.023,
    );
    loft(body, red, [
      [-0.57, 0.075, 0.08, 0.39, side * 0.64],
      [-0.32, 0.135, 0.17, 0.41, side * 0.66],
      [0.26, 0.16, 0.2, 0.45, side * 0.67],
      [0.57, 0.135, 0.23, 0.55, side * 0.69],
      [0.76, 0.13, 0.197, 0.6, side * 0.705],
      [1.13, 0.125, 0.16, 0.52, side * 0.7],
      [1.25, 0.087, 0.094, 0.48, side * 0.67],
    ]);
    tube(
      body,
      cream,
      [
        [side * 0.65, 0.497, -0.55],
        [side * 0.66, 0.589, -0.32],
        [side * 0.67, 0.658, 0.26],
        [side * 0.69, 0.788, 0.58],
        [side * 0.705, 0.808, 0.76],
        [side * 0.7, 0.688, 1.13],
        [side * 0.67, 0.579, 1.23],
      ],
      0.018,
    );
    tube(
      body,
      chrome,
      [
        [side * 0.8, 0.332, -0.77],
        [side * 0.875, 0.295, -0.53],
        [side * 0.897, 0.28, 0.35],
        [side * 0.832, 0.32, 0.53],
      ],
      0.029,
    );
  }
  tube(
    body,
    chrome,
    [
      [-0.82, 0.43, 1.01],
      [-0.834, 0.42, 1.27],
      [-0.68, 0.411, 1.36],
      [0, 0.405, 1.375],
      [0.68, 0.411, 1.36],
      [0.834, 0.42, 1.27],
      [0.82, 0.43, 1.01],
    ],
    0.043,
  );
  tube(
    body,
    chrome,
    [
      [-0.65, 0.44, -1.07],
      [-0.69, 0.405, -1.38],
      [-0.47, 0.41, -1.5],
      [0.47, 0.41, -1.5],
      [0.69, 0.405, -1.38],
      [0.65, 0.44, -1.07],
    ],
    0.025,
  );
  piece(body, leather, 0, 0.535, -0.02, 0.79, 0.17, 0.81, 0.066);
  const seat = piece(body, leather, 0, 0.79, 0.35, 0.84, 0.61, 0.13, 0.11);
  seat.rotation.x = -0.13;
  tube(
    body,
    gold,
    [
      [-0.39, 0.62, 0.449],
      [-0.4, 0.95, 0.4],
      [-0.31, 1.07, 0.394],
      [0.31, 1.07, 0.394],
      [0.4, 0.95, 0.4],
      [0.39, 0.62, 0.449],
    ],
    0.014,
  );
  // Finned rear motor, exhaust, and a small enamel maple-leaf plate.
  piece(body, black, 0, 0.62, 0.76, 0.64, 0.26, 0.49, 0.042);
  for (let i = 0; i < 8; i++) piece(body, steel, 0, 0.685, 0.554 + i * 0.054, 0.71, 0.18, 0.019, 0.012);
  const cap = piece(body, red, 0, 0.795, 0.746, 0.54, 0.07, 0.31, 0.035);
  for (const side of [-1, 1])
    for (const z of [0.66, 0.83]) ball(body, chrome, side * 0.226, 0.833, z, 0.014, 0.01, 0.014);
  tube(
    body,
    steel,
    [
      [0.24, 0.57, 0.74],
      [0.43, 0.5, 0.89],
      [0.42, 0.47, 1.14],
      [0.37, 0.48, 1.27],
    ],
    0.061,
  );
  const muffler = cylinder(body, chrome, 0.38, 0.47, 1.15, 0.082, 0.34);
  muffler.rotation.x = Math.PI / 2;
  const pipe = cylinder(body, dark, 0.38, 0.47, 1.326, 0.062, 0.015);
  pipe.rotation.x = Math.PI / 2;
  for (const side of [-1, 1]) {
    const o = cylinder(body, gold, side * 0.679, 0.5, 1.238, 0.079, 0.041);
    o.rotation.x = Math.PI / 2;
    ball(body, rearLens, side * 0.679, 0.5, 1.261, 0.061, 0.061, 0.022);
  }
  piece(body, cream, 0, 0.466, 1.149, 0.43, 0.196, 0.035, 0.035);
  const leaf = new T.Shape();
  const poly = [
    [0, -0.077],
    [0.008, -0.024],
    [0.065, -0.014],
    [0.053, 0.001],
    [0.079, 0.038],
    [0.046, 0.032],
    [0.039, 0.053],
    [0.016, 0.029],
    [0, 0.087],
    [-0.016, 0.03],
    [-0.043, 0.052],
    [-0.048, 0.031],
    [-0.077, 0.039],
    [-0.056, 0.001],
    [-0.068, -0.013],
    [-0.009, -0.026],
  ];
  poly.forEach(([x, y], i) => (i ? leaf.lineTo(x, y) : leaf.moveTo(x, y)));
  leaf.closePath();
  mesh(new T.ShapeGeometry(leaf), mat(0x994332, 0.55, 0.15), body, 0, 0.466, 1.172);
  rod(body, steel, [0, 0.39, -0.74], [0, 0.864, -0.46], 0.041);
  const steering = group(body);
  steering.position.set(0, 0.87, -0.45);
  steering.rotation.x = -0.63;
  torus(steering, dark, 0, 0, 0, 0.254, 0.031);
  for (let j = 0; j < 3; j++) {
    const a = j * 2.094 + 0.5;
    rod(steering, chrome, [0, 0, 0], [Math.cos(a) * 0.24, Math.sin(a) * 0.24, 0], 0.013);
  }
  ball(steering, gold, 0, 0, 0.015, 0.052, 0.052, 0.025);
  const head = group(body);
  head.position.set(0, 1.47, -0.07);
  if (driver) {
    const knit = mat(0xe8cda0, 0.96, 0, 'cloth'),
      scarf = mat(0xa34a2b, 0.84, 0, 'cloth'),
      skin = mat(0xd6a67e, 0.84),
      hair = mat(0x4a2c20, 0.52, 0.06, 'wood'),
      strand = mat(0x613a27, 0.58, 0.035),
      ribbon = mat(0xd4a437, 0.65, 0, 'cloth'),
      mitt = mat(0xb18350, 0.78);
    ball(body, knit, 0, 1.055, -0.06, 0.299, 0.384, 0.234);
    for (const side of [-1, 1]) {
      tube(
        body,
        knit,
        [
          [side * 0.205, 1.233, -0.1],
          [side * 0.3, 1.16, -0.15],
          [side * 0.32, 1.01, -0.25],
          [side * 0.248, 0.978, -0.47],
        ],
        0.097,
      );
      ball(body, mitt, side * 0.23, 0.976, -0.493, 0.08, 0.074, 0.077);
    }
    const collar = torus(body, scarf, 0, 1.346, -0.06, 0.155, 0.065);
    collar.rotation.x = Math.PI / 2;
    const scarfEnd = piece(body, scarf, -0.155, 1.215, 0.147, 0.087, 0.29, 0.024, 0.02);
    scarfEnd.rotation.z = -0.33;
    ball(head, skin, 0, 0.064, -0.057, 0.222, 0.26, 0.199);
    // The hair covers the whole back of the head, including the nape.
    ball(head, hair, 0, 0.093, 0.009, 0.248, 0.276, 0.226);
    for (let j = 0; j < 22; j++) {
      const a = (j / 21 - 0.5) * 2.97,
        pts = [];
      for (let k = 0; k < 8; k++) {
        const u = 0.13 + k * 0.315,
          angle = a + 0.15 * Math.cos(u);
        pts.push([
          0.2475 * Math.sin(u) * Math.sin(angle),
          0.093 + 0.277 * Math.cos(u),
          0.009 + 0.2265 * Math.sin(u) * Math.cos(angle),
        ]);
      }
      tube(head, j % 3 === 0 ? strand : hair, pts, j % 3 === 0 ? 0.0035 : 0.005, 12);
    }
    for (const side of [-1, 1]) {
      const positions = [
        [0.21, 0.04, 0.064],
        [0.265, -0.025, 0.1],
        [0.284, -0.093, 0.114],
        [0.31, -0.158, 0.12],
      ];
      positions.forEach(([x, y, z], i) => {
        const o = ball(
          head,
          i % 2 === 0 ? hair : strand,
          side * x,
          y,
          z,
          0.081 - i * 0.009,
          0.087 - i * 0.008,
          0.082 - i * 0.009,
        );
        o.rotation.z = side * -0.36;
      });
      ball(head, ribbon, side * 0.239, 0.014, 0.096, 0.039, 0.065, 0.067);
      for (const sign of [-1, 1]) {
        const loop = ball(head, ribbon, side * 0.25 + sign * 0.039, 0.04, 0.144, 0.045, 0.022, 0.024);
        loop.rotation.z = sign * 0.48;
      }
      ball(head, hair, side * 0.321, -0.22, 0.127, 0.034, 0.065, 0.036);
    }
  }
  const dec = [];
  body.traverse((o) => {
    if (o.isMesh && !head.getObjectById(o.id) && !steering.getObjectById(o.id)) dec.push(o);
  });
  batchStatic(body, dec);
  batchStatic(head, [...head.children]);
  batchStatic(steering, [...steering.children]);
  return { root, chassis, head, wheels, steering };
}
