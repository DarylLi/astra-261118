'use strict';
function makeStudio(renderer, scene) {
  const T = THREE,
    rng = AutumnRoad.randomSource(8819),
    V = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
  const mix = (a, b, t) => a + (b - a) * t;
  function hash(a, b) {
    const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
    return n - Math.floor(n);
  }
  function noise(x, y) {
    const a = Math.floor(x),
      b = Math.floor(y);
    let u = x - a,
      v = y - b;
    u = u * u * (3 - 2 * u);
    v = v * v * (3 - 2 * v);
    return mix(mix(hash(a, b), hash(a + 1, b), u), mix(hash(a, b + 1), hash(a + 1, b + 1), u), v);
  }
  function fb(x, y) {
    return (
      noise(x, y) * 0.55 +
      noise(x * 2.1, y * 2.1) * 0.27 +
      noise(x * 4.3, y * 4.3) * 0.13 +
      noise(x * 9, y * 9) * 0.05
    );
  }
  function canvas(w, h, paint) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    paint(ctx, w, h);
    const t = new T.CanvasTexture(c);
    t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return t;
  }
  const textures = {};
  function grain(kind) {
    if (textures[kind]) return textures[kind];
    const tx = canvas(256, 256, (c, w, h) => {
      const im = c.createImageData(w, h),
        data = im.data;
      for (let j = 0; j < h; j++)
        for (let i = 0; i < w; i++) {
          let v = 230;
          if (kind === 'road') v = 192 + 31 * noise(i / 24, j / 24) + 27 * rng() + (rng() < 0.03 ? -44 : 0);
          if (kind === 'earth') v = 166 + 58 * fb(i / 24, j / 24) + 26 * rng();
          if (kind === 'stone') v = 157 + 86 * fb(i / 25, j / 18) + 23 * rng() + (rng() < 0.03 ? -26 : 0);
          if (kind === 'bark' || kind === 'wood')
            v = 140 + 96 * fb(i / (kind === 'bark' ? 6 : 3), j / 63) + 17 * rng();
          if (kind === 'leaf') v = 165 + 65 * fb(i / 12, j / 11) + 30 * rng();
          if (kind === 'cloth') v = 198 + 18 * Math.cos(i * 1.55) + 9 * Math.sin(j * 1.55) + 15 * rng();
          if (kind === 'metal') v = 219 + 10 * noise(i / 50, j) + 12 * rng();
          if (kind === 'micro') v = 202 + 37 * noise(i / 8, j / 8) + 12 * rng();
          let k = 4 * (j * w + i);
          data[k] = data[k + 1] = data[k + 2] = v;
          data[k + 3] = 255;
        }
      c.putImageData(im, 0, 0);
    });
    tx.wrapS = tx.wrapT = T.RepeatWrapping;
    textures[kind] = tx;
    return tx;
  }
  const rough = grain('micro').clone();
  rough.colorSpace = T.NoColorSpace;
  rough.needsUpdate = true;
  function mat(color, roughness = 0.8, metalness = 0, kind, opts = {}) {
    return new T.MeshStandardMaterial({
      color,
      roughness,
      metalness,
      roughnessMap: rough,
      ...(kind ? { map: grain(kind) } : {}),
      ...opts,
    });
  }
  const sky = canvas(1024, 512, (ctx, w, h) => {
    const im = ctx.createImageData(w, h),
      data = im.data;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const e = (0.5 - y / h) * Math.PI,
          k = Math.min(1, Math.max(0, e * 1.75)),
          zen = Math.sqrt(k);
        const cloud =
          e > 0 ? Math.min(0.72, Math.max(0, (fb(x / 59, y / 10) - 0.53) * 3)) * Math.min(1, e * 8) : 0;
        const earth = e < 0 ? Math.min(1, -e * 1.9) : 0;
        const rgb = [mix(229, 127, zen), mix(228, 178, zen), mix(209, 204, zen)];
        for (let i = 0; i < 3; i++)
          data[(y * w + x) * 4 + i] = mix(mix(rgb[i], [250, 244, 224][i], cloud), [108, 103, 76][i], earth);
        data[(y * w + x) * 4 + 3] = 255;
      }
    ctx.putImageData(im, 0, 0);
  });
  sky.mapping = T.EquirectangularReflectionMapping;
  scene.background = sky;
  const pm = new T.PMREMGenerator(renderer);
  scene.environment = pm.fromEquirectangular(sky).texture;
  pm.dispose();
  scene.environmentIntensity = 0.58;
  scene.fog = new T.FogExp2(0xd8d9c7, 0.0068);
  const sun = new T.DirectionalLight(0xffe3b2, 2.25);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 25, bottom: -25, near: 0.5, far: 112 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.normalBias = 0.023;
  sun.shadow.bias = -0.00016;
  scene.add(sun, sun.target);
  scene.add(new T.HemisphereLight(0xd7eaff, 0xbca078, 1.45));
  const unitBox = new T.BoxGeometry(1, 1, 1),
    sphere = new T.SphereGeometry(1, 24, 16),
    cyl = new T.CylinderGeometry(1, 1, 1, 28);
  function mesh(g, m, parent = scene, x = 0, y = 0, z = 0) {
    const o = new T.Mesh(g, m);
    o.position.set(x, y, z);
    o.castShadow = o.receiveShadow = true;
    parent.add(o);
    return o;
  }
  function box(p, m, x, y, z, w, h, l) {
    const o = mesh(unitBox, m, p, x, y, z);
    o.scale.set(w, h, l);
    return o;
  }
  function ball(p, m, x, y, z, w, h, l) {
    const o = mesh(sphere, m, p, x, y, z);
    o.scale.set(w, h, l);
    return o;
  }
  function cylinder(p, m, x, y, z, r, h) {
    const o = mesh(cyl, m, p, x, y, z);
    o.scale.set(r, h, r);
    return o;
  }
  function rod(p, m, a, b, r, r2 = r, segments = 10) {
    const va = V(...a),
      vb = V(...b),
      delta = vb.clone().sub(va);
    const o = mesh(new T.CylinderGeometry(r2, r, delta.length(), segments), m, p);
    o.position.copy(va.add(vb).multiplyScalar(0.5));
    o.quaternion.setFromUnitVectors(V(0, 1, 0), delta.normalize());
    return o;
  }
  function tube(p, m, points, r, segments = 30) {
    return mesh(
      new T.TubeGeometry(new T.CatmullRomCurve3(points.map((v) => V(...v))), segments, r, 10, false),
      m,
      p,
    );
  }
  function torus(p, m, x, y, z, r, tubeRadius, radial = 10, tubular = 60) {
    return mesh(new T.TorusGeometry(r, tubeRadius, radial, tubular), m, p, x, y, z);
  }
  function group(parent = scene) {
    const g = new T.Group();
    parent.add(g);
    return g;
  }
  function geometry(pos, idx, uv, colors) {
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    if (uv) g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    if (colors) g.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }
  function instance(g, m, items, cast = true, parent = scene) {
    const o = new T.InstancedMesh(g, m, items.length);
    const d = new T.Object3D();
    items.forEach((v, i) => {
      d.position.set(...v.p);
      d.rotation.set(...(v.r || [0, 0, 0]));
      d.scale.set(...(v.s || [1, 1, 1]));
      d.updateMatrix();
      o.setMatrixAt(i, d.matrix);
      if (v.c) o.setColorAt(i, new T.Color(v.c));
    });
    o.castShadow = cast;
    o.receiveShadow = true;
    parent.add(o);
    return o;
  }
  function flatRibbon(rows, material, parent = scene) {
    const pos = [],
      uv = [],
      idx = [];
    rows.forEach(([a, b, d, w], i) => {
      pos.push(...a, ...b);
      uv.push(0, d, w ?? 1, d);
      if (i) {
        const j = i * 2;
        idx.push(j - 2, j - 1, j, j - 1, j + 1, j);
      }
    });
    return mesh(geometry(pos, idx, uv), material, parent);
  }
  function rounded(w, h, d, r) {
    const s = new T.Shape();
    const a = -w / 2,
      b = -h / 2;
    s.moveTo(a + r, b);
    s.lineTo(-a - r, b);
    s.quadraticCurveTo(-a, b, -a, b + r);
    s.lineTo(-a, -b - r);
    s.quadraticCurveTo(-a, -b, -a - r, -b);
    s.lineTo(a + r, -b);
    s.quadraticCurveTo(a, -b, a, -b - r);
    s.lineTo(a, b + r);
    s.quadraticCurveTo(a, b, a + r, b);
    const g = new T.ExtrudeGeometry(s, {
      depth: d,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: r * 0.32,
      bevelThickness: r * 0.32,
      curveSegments: 5,
    });
    g.translate(0, 0, -d / 2);
    return g;
  }
  // Batch fixed meshes without losing their material, normals, or lighting.
  function batchStatic(parent, children) {
    parent.updateWorldMatrix(true, true);
    const inverse = parent.matrixWorld.clone().invert(),
      sets = new Map();
    for (const o of children) {
      if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material)) continue;
      let set = sets.get(o.material);
      if (!set) {
        set = { pos: [], norm: [], uv: [], idx: [] };
        sets.set(o.material, set);
      }
      const g = o.geometry,
        p = g.attributes.position,
        n = g.attributes.normal,
        uv = g.attributes.uv,
        m = new T.Matrix4().multiplyMatrices(inverse, o.matrixWorld),
        nm = new T.Matrix3().getNormalMatrix(m),
        v = V(),
        base = set.pos.length / 3;
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i).applyMatrix4(m);
        set.pos.push(v.x, v.y, v.z);
        v.fromBufferAttribute(n, i).applyNormalMatrix(nm);
        set.norm.push(v.x, v.y, v.z);
        set.uv.push(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0);
      }
      if (g.index) for (let i = 0; i < g.index.count; i++) set.idx.push(base + g.index.getX(i));
      else for (let i = 0; i < p.count; i++) set.idx.push(base + i);
      o.removeFromParent();
    }
    for (const [m, v] of sets) {
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(v.pos, 3));
      g.setAttribute('normal', new T.Float32BufferAttribute(v.norm, 3));
      g.setAttribute('uv', new T.Float32BufferAttribute(v.uv, 2));
      g.setIndex(v.idx);
      mesh(g, m, parent);
    }
  }
  return {
    T,
    scene,
    sun,
    rng,
    V,
    noise,
    fb,
    mat,
    canvas,
    mesh,
    box,
    ball,
    cylinder,
    rod,
    tube,
    torus,
    group,
    geometry,
    instance,
    flatRibbon,
    rounded,
    batchStatic,
    sphere,
    unitBox,
  };
}
