'use strict';
(() => {
  const T = THREE,
    road = AutumnRoad,
    sim = road.create(),
    st = sim.st;
  window.__GAME__ = { step: (dt) => sim.step(dt), getState: () => sim.getState() };
  const $ = (id) => document.getElementById(id),
    canvas = $('scene');
  const renderer = new T.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFShadowMap;
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.98;
  const scene = new T.Scene(),
    camera = new T.PerspectiveCamera(40, 1, 0.09, 390),
    A = makeStudio(renderer, scene);
  const { mat, mesh, ball, box, rod, group, torus, instance, geometry, rounded, batchStatic } = A;
  const land = buildValley(A, sim),
    forest = growForest(A, land, sim),
    kart = buildKart(A, scene, 0xb53729, true);
  kart.root.scale.setScalar(1.12);
  // Soft ambient contact beneath the vehicle complements the directional wheel shadows.
  const contact = A.canvas(96, 96, (c, w, h) => {
    const g = c.createRadialGradient(48, 48, 4, 48, 48, 48);
    g.addColorStop(0, 'rgba(40,32,23,.44)');
    g.addColorStop(0.52, 'rgba(42,35,22,.27)');
    g.addColorStop(1, 'rgba(46,40,26,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  });
  const shadow = mesh(
    new T.PlaneGeometry(3.4, 4.25),
    mat(0x5d5344, 1, 0, null, {
      map: contact,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    }),
    scene,
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.castShadow = false;
  // Parked touring cars face the road in the arrival meadow.
  const family = [],
    carColors = [0x78948b, 0xbb914c, 0x6b818d, 0xb66c4c],
    familyLights = [];
  function familyCar(i, s, side) {
    const anchor = land.aligned(s, side * (i % 2 === 0 ? 2.55 : 2.9)),
      g = group(anchor);
    g.rotation.y = side * 0.24;
    const paint = mat(carColors[i], 0.32, 0.41),
      ivory = mat(0xd8cbb1, 0.38, 0.34),
      tyre = mat(0x323733, 0.87),
      rim = mat(0xb1b7ab, 0.24, 0.85),
      glass = mat(0x91b0ad, 0.13, 0.48),
      seat = mat(0x64533e, 0.85, 0, 'cloth');
    mesh(rounded(1.56, 0.43, 2.66, 0.16), paint, g, 0, 0.6, 0);
    mesh(rounded(1.25, 0.22, 0.74, 0.13), paint, g, 0, 0.84, -0.72);
    const wind = box(g, glass, 0, 1.105, -0.275, 1.28, 0.44, 0.035);
    wind.rotation.x = -0.23;
    for (const side of [-1, 1]) {
      rod(g, rim, [side * 0.65, 0.9, -0.23], [side * 0.65, 1.33, -0.335], 0.028);
      for (const z of [-0.85, 0.85]) {
        const o = A.cylinder(g, tyre, side * 0.8, 0.34, z, 0.335, 0.2);
        o.rotation.z = Math.PI / 2;
        const hub = A.cylinder(g, ivory, side * 0.919, 0.34, z, 0.197, 0.028);
        hub.rotation.z = Math.PI / 2;
      }
    }
    box(g, rim, 0, 1.328, -0.331, 1.35, 0.035, 0.045);
    const coat = mat([0x9e7051, 0x738274, 0xa98b68, 0x7b6f69][i], 0.9, 0, 'cloth'),
      hat = mat([0x615347, 0xa98c67, 0x625848, 0x9b7354][i], 0.81, 0, 'cloth');
    ball(g, coat, -0.27, 1.045, 0.06, 0.238, 0.3, 0.19);
    ball(g, hat, -0.27, 1.408, 0.042, 0.16, 0.19, 0.15);
    const brim = ball(g, hat, -0.27, 1.44, 0.035, 0.207, 0.033, 0.195);
    brim.rotation.z = -0.06;
    mesh(rounded(1.27, 0.39, 0.13, 0.1), seat, g, 0, 0.942, 0.51);
    box(g, rim, 0, 0.41, 1.38, 1.56, 0.081, 0.1);
    const lamp = mat(0xffce83, 0.2, 0.31, null, { emissive: 0xe79e3d, emissiveIntensity: 0.25 });
    familyLights.push(lamp);
    for (const a of [-1, 1]) {
      ball(g, rim, a * 0.57, 0.69, 1.332, 0.12, 0.12, 0.051);
      ball(g, lamp, a * 0.57, 0.69, 1.379, 0.082, 0.083, 0.031);
    }
    const geom = geometry([0, 0, 0, 0, 0.34, 0, 0.46, 0.25, 0.03], [0, 1, 2], [0, 0, 0, 1, 1, 0.7]);
    rod(g, rim, [side * 0.63, 0.81, 0.7], [side * 0.63, 1.87, 0.7], 0.013);
    mesh(
      geom,
      mat(i % 2 ? 0xdfb563 : 0xb35b3d, 0.96, 0, 'cloth', { side: T.DoubleSide }),
      g,
      side * 0.63,
      1.55,
      0.7,
    );
    batchStatic(g, [...g.children]);
    family.push({ anchor, g, s });
  }
  [
    [81, -1],
    [84.7, 1],
    [88, -1],
    [92, 1],
  ].forEach(([s, side], i) => familyCar(i, s, side));
  const leafShape = new T.Shape();
  const leafOutline = [
    [0, -0.65],
    [0.096, -0.28],
    [0.45, -0.21],
    [0.39, -0.07],
    [0.71, 0.12],
    [0.46, 0.17],
    [0.48, 0.41],
    [0.22, 0.3],
    [0.22, 0.55],
    [0.085, 0.49],
    [0, 0.96],
    [-0.12, 0.46],
    [-0.27, 0.64],
    [-0.25, 0.27],
    [-0.52, 0.41],
    [-0.45, 0.16],
    [-0.72, 0.12],
    [-0.4, -0.07],
    [-0.47, -0.21],
    [-0.04, -0.29],
    [-0.025, -0.65],
  ];
  leafOutline.forEach(([x, y], i) => (i ? leafShape.lineTo(x, y) : leafShape.moveTo(x, y)));
  leafShape.closePath();
  const leafGeo = new T.ShapeGeometry(leafShape),
    leafMat = mat(0xffffff, 0.89, 0, 'leaf', { side: T.DoubleSide });
  leafGeo.rotateX(-Math.PI / 2);
  const lp = leafGeo.attributes.position;
  for (let i = 0; i < lp.count; i++) lp.setY(i, 0.18 * Math.abs(lp.getX(i)) + 0.07 * lp.getZ(i) ** 2);
  leafGeo.computeVertexNormals();
  const leaves = new T.InstancedMesh(leafGeo, leafMat, 680);
  leaves.castShadow = false;
  leaves.receiveShadow = true;
  leaves.frustumCulled = false;
  scene.add(leaves);
  const airborneLeaves = new T.InstancedMesh(leafGeo, leafMat, 60);
  airborneLeaves.frustumCulled = false;
  scene.add(airborneLeaves);
  const dustMat = mat(0xf3e7bc, 0.91, 0, null, { emissive: 0xcdba84, emissiveIntensity: 0.18 });
  const mote = new T.InstancedMesh(new T.OctahedronGeometry(1), dustMat, 60);
  mote.frustumCulled = false;
  scene.add(mote);
  const starMat = mat(0xffe7a1, 0.31, 0.52, null, { emissive: 0xffc25e, emissiveIntensity: 1.5 }),
    sparks = new T.InstancedMesh(new T.OctahedronGeometry(1), starMat, 80);
  sparks.frustumCulled = false;
  scene.add(sparks);
  const layout = new T.Object3D(),
    leafTones = [0xaa4a2c, 0xc7853c, 0xb89950, 0x9c6238, 0xd09b4c].map((c) => new T.Color(c));
  let leafLap = 0;
  function particles() {
    const colorChanged = leafLap !== st.lap;
    leaves.count = sim.leaves.length;
    sim.leaves.forEach((v, i) => {
      const s = v.s;
      layout.position.set(
        ...land.along(
          s,
          v.x,
          v.h + (s > 27.3 && s < 37.8 ? 0.056 : 0) + road.rampHeight(s) * (Math.abs(v.x) < 1.52 ? 1 : 0),
        ),
      );
      layout.rotation.set(v.flying ? v.angle * 0.63 : 0, v.angle, v.flying ? v.angle * 0.31 : 0);
      layout.scale.setScalar(v.size);
      layout.updateMatrix();
      leaves.setMatrixAt(i, layout.matrix);
      if (colorChanged) leaves.setColorAt(i, leafTones[v.kind]);
    });
    if (colorChanged) {
      leaves.instanceColor.needsUpdate = true;
      leafLap = st.lap;
    }
    leaves.instanceMatrix.needsUpdate = true;
    let n = 0,
      m = 0;
    sim.dust.forEach((v, i) => {
      layout.position.set(...land.along(v.s, v.x, v.y));
      layout.rotation.set(v.spin, v.spin * 0.41, v.spin * 0.18);
      layout.scale.setScalar(v.leaf ? 0.092 : 0.012 + (i % 4) * 0.001);
      layout.updateMatrix();
      if (v.leaf) {
        airborneLeaves.setMatrixAt(n, layout.matrix);
        airborneLeaves.setColorAt(n++, leafTones[i % 5]);
      } else mote.setMatrixAt(m++, layout.matrix);
    });
    airborneLeaves.count = n;
    airborneLeaves.instanceMatrix.needsUpdate = true;
    if (n) airborneLeaves.instanceColor.needsUpdate = true;
    mote.count = m;
    mote.instanceMatrix.needsUpdate = true;
    sim.sparks.forEach((v, i) => {
      layout.position.set(...land.along(v.s, v.x, v.y));
      layout.scale.set(0.027, 0.068, 0.026).multiplyScalar(Math.min(1, v.life * 4));
      layout.updateMatrix();
      sparks.setMatrixAt(i, layout.matrix);
    });
    sparks.count = sim.sparks.length;
    sparks.instanceMatrix.needsUpdate = true;
  }
  // Audio is synthesized after the first gesture, including the low engine and family horns.
  let audio = null,
    master,
    engineOsc,
    engineGain,
    engineFilter,
    muted = false;
  function awaken() {
    if (!audio) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      audio = new Audio();
      master = audio.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(audio.destination);
      engineOsc = audio.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 35;
      engineFilter = audio.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 180;
      engineGain = audio.createGain();
      engineGain.gain.value = 0.017;
      engineOsc.connect(engineFilter).connect(engineGain).connect(master);
      engineOsc.start();
    }
    if (audio.state === 'suspended') audio.resume().catch(() => {});
  }
  function tone(freq, delay, duration, vol, type = 'sine') {
    if (!audio || muted) return;
    const now = audio.currentTime + delay,
      o = audio.createOscillator(),
      g = audio.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(vol, now + 0.035);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    o.connect(g).connect(master);
    o.start(now);
    o.stop(now + duration + 0.01);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }
  function sounds() {
    if (audio) {
      const now = audio.currentTime;
      engineOsc.frequency.setTargetAtTime(30 + st.speed * 2.8 + st.engine * 4 + st.boost * 7, now, 0.08);
      engineFilter.frequency.setTargetAtTime(114 + st.speed * 14, now, 0.12);
      engineGain.gain.setTargetAtTime(0.019 + st.engine * 0.031, now, 0.11);
    }
    for (const ev of sim.events.splice(0)) {
      if (ev.kind === 'gate') {
        tone([523.25, 587.33, 659.25][ev.n], 0, 0.35, 0.12);
        tone([783.99, 880, 987.77][ev.n], 0.075, 0.66, 0.084);
      }
      if (ev.kind === 'horn') {
        const f = [349.23, 392, 440, 523.25][ev.n];
        tone(f, 0, 0.49, 0.115, 'triangle');
        tone(f * 1.25, 0.016, 0.44, 0.056, 'triangle');
      }
      if (ev.kind === 'finish') {
        [523.25, 659.25, 783.99].forEach((f, i) => tone(f, i * 0.13, 0.72, 0.102));
      }
      if (ev.kind === 'land') tone(78, 0, 0.17, 0.068);
    }
  }
  const pedal = $('pedal'),
    sound = $('sound'),
    hand = $('hand');
  let active = null;
  function release(e) {
    if (e && e.pointerId !== active) return;
    sim.press(false);
    if (active !== null && pedal.hasPointerCapture(active)) pedal.releasePointerCapture(active);
    active = null;
  }
  pedal.addEventListener('pointerdown', (e) => {
    if (active !== null || !e.isPrimary || e.button !== 0) return;
    e.preventDefault();
    awaken();
    active = e.pointerId;
    pedal.setPointerCapture(active);
    if (st.phase === 'drive') sim.press(true);
    else sim.horn();
  });
  pedal.addEventListener('pointerup', release);
  pedal.addEventListener('pointercancel', release);
  pedal.addEventListener('lostpointercapture', release);
  window.addEventListener('blur', () => release());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      release();
      if (audio) audio.suspend();
    }
    last = 0;
  });
  sound.addEventListener('click', () => {
    muted = !muted;
    awaken();
    if (audio) master.gain.setTargetAtTime(muted ? 0 : 0.5, audio.currentTime, 0.06);
    sound.classList.toggle('muted', muted);
    sound.setAttribute('aria-pressed', String(!muted));
  });
  const picker = new T.Raycaster(),
    ndc = new T.Vector2(),
    groundPlane = new T.Plane(new T.Vector3(0, 1, 0), 0),
    hit = new T.Vector3();
  canvas.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary || e.button !== 0) return;
    awaken();
    ndc.set((e.clientX / innerWidth) * 2 - 1, 1 - (e.clientY / innerHeight) * 2);
    picker.setFromCamera(ndc, camera);
    if (st.phase === 'welcome') {
      const match = picker.intersectObjects(
        family.map((v) => v.anchor),
        true,
      )[0];
      if (match) {
        sim.horn(family.findIndex((v) => v.anchor.getObjectById(match.object.id)));
        return;
      }
    }
    if (picker.ray.intersectPlane(groundPlane, hit)) {
      const n = road.clamp(Math.floor((-hit.z + 10) / 3), 0, 35);
      sim.cells[n].gust += 0.13;
    }
  });
  const dial = $('dial').getContext('2d'),
    plate = document.createElement('canvas');
  plate.width = plate.height = 288;
  function dialFace() {
    const c = plate.getContext('2d');
    c.translate(144, 144);
    function disc(r, fill) {
      c.beginPath();
      c.arc(0, 0, r, 0, Math.PI * 2);
      c.fillStyle = fill;
      c.fill();
    }
    const bezel = c.createLinearGradient(-80, -115, 80, 115);
    [
      [0, '#fcf0c7'],
      [0.23, '#c4b38a'],
      [0.49, '#776e52'],
      [0.7, '#c5b18a'],
      [1, '#534f3c'],
    ].forEach(([k, v]) => bezel.addColorStop(k, v));
    disc(138, 'rgba(58,60,48,.82)');
    disc(134, bezel);
    disc(128, '#494b3e');
    disc(124, '#d7c7a3');
    const face = c.createLinearGradient(-80, -100, 50, 122);
    face.addColorStop(0, '#565a4a');
    face.addColorStop(0.52, '#393e35');
    face.addColorStop(1, '#30352e');
    disc(120, face);
    for (let i = 0; i <= 36; i++) {
      const a = ((145 + (250 * i) / 36) * Math.PI) / 180,
        r = i % 6 === 0 ? 79 : i % 3 === 0 ? 89 : 96;
      c.beginPath();
      c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      c.lineTo(Math.cos(a) * 105, Math.sin(a) * 105);
      c.strokeStyle = i >= 31 ? '#d69b71' : i % 3 === 0 ? '#eadcbb' : '#a9aa8e';
      c.lineWidth = i % 6 === 0 ? 5 : 2.4;
      c.lineCap = 'round';
      c.stroke();
    }
    c.strokeStyle = '#988c6b';
    c.lineWidth = 1.3;
    c.beginPath();
    c.arc(0, 0, 111, 2.42, 6.99);
    c.stroke();
    // A small winged wheel at the foot of the dial is cast into the bezel.
    c.save();
    c.translate(0, 60);
    c.strokeStyle = '#c2ae82';
    c.lineWidth = 2.8;
    c.beginPath();
    c.arc(0, 0, 9, 0, 6.283);
    c.stroke();
    for (const s of [-1, 1])
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.moveTo(s * 11, i * 4 - 5);
        c.lineTo(s * (31 - i * 6), i * 4 - 8);
        c.stroke();
      }
    c.restore();
    for (const x of [-69, 69]) {
      c.beginPath();
      c.arc(x, 80, 3.2, 0, 6.283);
      c.fillStyle = '#c8b68e';
      c.fill();
    }
  }
  dialFace();
  let lastNeedle = -1;
  function drawDial() {
    if (Math.abs(st.speed - lastNeedle) < 0.018) return;
    lastNeedle = st.speed;
    dial.clearRect(0, 0, 288, 288);
    dial.drawImage(plate, 0, 0);
    dial.save();
    dial.translate(144, 144);
    dial.rotate(((145 + (250 * st.speed) / 18) * Math.PI) / 180);
    dial.shadowColor = '#151811';
    dial.shadowBlur = 5;
    dial.shadowOffsetY = 3;
    dial.beginPath();
    dial.moveTo(-20, -4);
    dial.lineTo(96, 0);
    dial.lineTo(-20, 4);
    dial.closePath();
    dial.fillStyle = '#ecc075';
    dial.fill();
    dial.shadowBlur = 0;
    dial.shadowOffsetY = 0;
    for (const [r, color] of [
      [13, '#302e24'],
      [10, '#d7c18a'],
      [6, '#827351'],
    ]) {
      dial.beginPath();
      dial.arc(0, 0, r, 0, 6.284);
      dial.fillStyle = color;
      dial.fill();
    }
    dial.restore();
  }
  const gateIcons = [...document.querySelectorAll('.gate')];
  let previousPhase = '';
  function controls() {
    drawDial();
    const u = road.clamp(st.distance / road.finish, 0, 1),
      cx = 17 + 147 * u;
    $('pin').setAttribute('cx', cx);
    $('trail').setAttribute('d', 'M17 18H' + cx);
    gateIcons.forEach((v, i) => v.setAttribute('fill', i < st.ringCount ? '#f0ce8e' : '#514d3d'));
    pedal.style.setProperty('--sink', st.pedal * 4 + 'px');
    pedal.style.setProperty('--scale', 1 - 0.047 * st.pedal);
    if (st.phase !== previousPhase) {
      document.body.classList.toggle('welcome', st.phase === 'welcome');
      pedal.setAttribute('aria-label', st.phase === 'welcome' ? 'クラクション' : '押してアクセル');
      previousPhase = st.phase;
    }
    if (st.hint > 0) {
      const h = st.hint % 3.55,
        down = road.clamp((h - 0.35) / 0.64, 0, 1) * (1 - road.clamp((h - 2.34) / 0.44, 0, 1));
      hand.style.opacity = String(Math.min(1, h / 0.38, Math.max(0, (3.45 - h) / 0.45)) * 0.91);
      hand.style.transform =
        'translate(' +
        ((1 - down) * 11 - 6) +
        'px,' +
        ((1 - down) * 14 - 20) +
        'px) rotate(-16deg) scale(' +
        (1 - 0.07 * down) +
        ')';
    } else hand.style.opacity = 0;
    $('veil').style.opacity = st.fade;
  }
  // Downsample bright reflections, blur them, then composite in linear light.
  const hdr = renderer.extensions.has('EXT_color_buffer_float');
  const rtOpts = {
    type: hdr ? T.HalfFloatType : T.UnsignedByteType,
    format: T.RGBAFormat,
    depthBuffer: false,
    generateMipmaps: false,
  };
  const screen = new T.WebGLRenderTarget(1, 1, {
      ...rtOpts,
      depthBuffer: true,
      samples: Math.min(2, renderer.capabilities.maxSamples),
    }),
    glow = new T.WebGLRenderTarget(1, 1, rtOpts),
    blur = new T.WebGLRenderTarget(1, 1, rtOpts);
  const passScene = new T.Scene(),
    ortho = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1),
    quad = new T.Mesh(new T.PlaneGeometry(2, 2));
  quad.frustumCulled = false;
  passScene.add(quad);
  const vertex = 'varying vec2 p;void main(){p=uv;gl_Position=vec4(position.xy,0.,1.);}';
  const pass = (fragment, uniforms) =>
    new T.ShaderMaterial({
      uniforms,
      vertexShader: vertex,
      fragmentShader: 'varying vec2 p;\n' + fragment,
      depthWrite: false,
      depthTest: false,
    });
  const bloom = pass(
    'uniform sampler2D src; uniform vec2 delta; uniform float threshold; vec3 tap(vec2 uv){vec3 v=texture2D(src,uv).rgb;return v*max(0.,1.-threshold/max(max(max(v.r,v.g),v.b),.001));} void main(){gl_FragColor=vec4(.4*tap(p)+.24*(tap(p+delta)+tap(p-delta))+.06*(tap(p+2.3*delta)+tap(p-2.3*delta)),1.);}',
    { src: { value: null }, delta: { value: new T.Vector2() }, threshold: { value: 0 } },
  );
  const composite = pass(
    `uniform sampler2D src;uniform sampler2D glow;void main(){vec3 v=texture2D(src,p).rgb+.073*texture2D(glow,p).rgb;vec2 q=(p-.5)*2.;v*=1.-.055*dot(q,q);gl_FragColor=vec4(v,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
float gr=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));gl_FragColor.rgb+=(gr-.5)*.008;}`,
    { src: { value: screen.texture }, glow: { value: blur.texture } },
  );
  function resize() {
    const w = innerWidth,
      h = innerHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.65, Math.sqrt(1900000 / (w * h))));
    renderer.setSize(w, h, false);
    const size = renderer.getDrawingBufferSize(new T.Vector2());
    screen.setSize(size.x, size.y);
    glow.setSize(Math.max(1, size.x >> 2), Math.max(1, size.y >> 2));
    blur.setSize(glow.width, glow.height);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();
  function draw() {
    const q = road.route(st.distance),
      height = st.airborne ? st.airHeight : road.rampHeight(st.distance),
      deck = st.distance >= 27.35 && st.distance <= 37.75 ? 0.056 : 0;
    kart.root.position.set(q.x, q.y + height + deck, q.z);
    kart.root.rotation.y = q.yaw;
    kart.chassis.position.set(0, st.heave, -st.surge);
    kart.chassis.rotation.z = st.roll;
    kart.chassis.rotation.x = st.pitch;
    kart.head.rotation.z = -st.roll * 0.34 + st.heave * 0.23;
    kart.steering.rotation.z = -q.curvature * 4.8;
    kart.wheels.forEach((w, i) => {
      w.rotation.x = -st.wheelAngle;
      w.rotation.y = i % 2 === 0 ? -q.curvature * 1.8 : 0;
    });
    shadow.position.set(q.x, q.y + deck + 0.024, q.z);
    shadow.rotation.order = 'YXZ';
    shadow.rotation.y = q.yaw;
    shadow.material.opacity = 1 / (1 + st.airHeight * 0.9);
    const greeting = st.phase === 'welcome' ? Math.min(1, st.rewardTime * 0.83) : 0;
    const back = (camera.aspect < 0.8 ? 8.95 : 8.05) + greeting * 2.45,
      forward = road.route(st.distance + 10.5),
      past = road.route(st.distance - 3.8);
    const yaw = Math.atan2(forward.x - past.x, past.z - forward.z),
      dirX = Math.sin(yaw),
      dirZ = -Math.cos(yaw);
    camera.position.set(q.x - dirX * back, q.y + 4 + height * 0.25 + greeting * 0.45, q.z - dirZ * back);
    const pitch = (((camera.aspect < 0.8 ? 10.45 : 11.85) - greeting * 1.6) * Math.PI) / 180;
    camera.lookAt(
      camera.position.x + dirX * 18,
      camera.position.y - 18 * Math.tan(pitch),
      camera.position.z + dirZ * 18,
    );
    camera.fov = st.fov;
    camera.updateProjectionMatrix();
    A.sun.target.position.set(q.x + 1, q.y, q.z - 9);
    A.sun.position.copy(A.sun.target.position).add(new T.Vector3(-28, 34, 16));
    land.update();
    forest();
    particles();
    family.forEach((v, i) => {
      const h = sim.salutes[i];
      v.g.position.y = h ? h.lift : 0;
      v.g.rotation.z = h ? h.lift * 0.32 : 0;
      familyLights[i].emissiveIntensity = 0.25 + (h ? h.glow * 3 : 0);
    });
    controls();
    renderer.setRenderTarget(screen);
    renderer.render(scene, camera);
    quad.material = bloom;
    bloom.uniforms.src.value = screen.texture;
    bloom.uniforms.threshold.value = hdr ? 1.48 : 0.82;
    bloom.uniforms.delta.value.set(1.38 / glow.width, 0);
    renderer.setRenderTarget(glow);
    renderer.render(passScene, ortho);
    bloom.uniforms.src.value = glow.texture;
    bloom.uniforms.threshold.value = 0;
    bloom.uniforms.delta.value.set(0, 1.38 / glow.height);
    renderer.setRenderTarget(blur);
    renderer.render(passScene, ortho);
    quad.material = composite;
    renderer.setRenderTarget(null);
    renderer.render(passScene, ortho);
  }
  let last = 0;
  function frame(now) {
    if (!document.hidden) {
      const dt = last ? Math.min(0.085, (now - last) * 0.001) : 0;
      sim.step(dt);
      sounds();
      draw();
    }
    last = now;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
