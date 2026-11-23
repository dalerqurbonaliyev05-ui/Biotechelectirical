// ElektrUy 3D room viewer. Runs inside a WebView from bundled assets (no network).
//
// Flutter -> JS:
//   window.ElektrUy.load(json)   room + plan (+ optional `steps` for the installation guide, `labels`)
//   window.ElektrUy.step(i)      show installation step i (camera flies there, the room is built up to it)
//   window.ElektrUy.replay()     replay the current step's animation
//   window.ElektrUy.resetView(), .setLayer(name, visible), .setTheme(dark)
// JS -> Flutter (JavaScript channel "ElektrUyBridge"): {type:'ready'|'loaded'|'tap'|'error', ...}
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const post = (msg) => {
  try {
    if (window.ElektrUyBridge) window.ElektrUyBridge.postMessage(JSON.stringify(msg));
  } catch (_) {
    /* channel not available in a plain browser */
  }
};

const DEFAULT_COLORS = {
  phase: '#8B4513',
  phase_alt: '#D32F2F',
  neutral: '#1E63D6',
  pe: '#9ACD32',
  pe_stripe: '#F2C200',
  traveller: '#111111',
};
// Real core colours used in the close-ups (switch lines use brown/black/grey cores).
const CORE = { brown: 0x7a4a26, blue: 0x1f5fd1, yg: 0x8cc63f, black: 0x1c1c1c, grey: 0x8f959b, copper: 0xd08a4a, brass: 0xc9a227 };

let renderer, scene, camera, controls, root, clock;
const layers = { cables: null, devices: null, walls: null, labels: null };
let current = null;
let dark = false;
let colors = { ...DEFAULT_COLORS };
let steps = [];
let stepIndex = -1;
let labels = {};
let tween = null;
let anim = null; // {start, update(t)} for the current step
const tickers = new Set();

// Room coordinates: x along wall A, y along wall B, z up. Three.js is y-up.
const v = (p) => new THREE.Vector3(p[0], p[2], p[1]);
const NORMAL = { a: new THREE.Vector3(0, 0, 1), b: new THREE.Vector3(-1, 0, 0), c: new THREE.Vector3(0, 0, -1), d: new THREE.Vector3(1, 0, 0) };
const TANGENT = { a: new THREE.Vector3(1, 0, 0), b: new THREE.Vector3(0, 0, 1), c: new THREE.Vector3(-1, 0, 0), d: new THREE.Vector3(0, 0, -1) };
const UP = new THREE.Vector3(0, 1, 0);

// ------------------------------------------------------------------ setup
function init() {
  const canvas = document.getElementById('c');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.autoRotateSpeed = 0.7;
  controls.addEventListener('start', () => {
    controls.autoRotate = false;
    tween = null;
  });
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb8a990, 1.25));
  const sun = new THREE.DirectionalLight(0xfff4e5, 1.4);
  sun.position.set(6, 9, 5);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xdfe8ff, 0.5);
  fill.position.set(-5, 4, -3);
  scene.add(fill);
  const headLamp = new THREE.PointLight(0xffffff, 0.6, 3, 1.2);
  camera.add(headLamp);
  scene.add(camera);
  clock = new THREE.Clock();
  applyTheme();
  window.addEventListener('resize', resize);
  renderer.domElement.addEventListener('click', onTap);
  resize();
  animate();
  post({ type: 'ready' });
}

function applyTheme() {
  scene.background = new THREE.Color(dark ? 0x12161c : 0xeef2f7);
}

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / Math.max(h, 1);
  camera.updateProjectionMatrix();
  if (stepIndex >= 0 && !tween) aimCamera(true);
}

function animate() {
  requestAnimationFrame(animate);
  const now = clock.getElapsedTime();
  if (tween) {
    const k = Math.min(1, (now - tween.t0) / tween.dur);
    const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    camera.position.lerpVectors(tween.p0, tween.p1, e);
    controls.target.lerpVectors(tween.q0, tween.q1, e);
    if (k >= 1) tween = null;
  }
  if (anim) anim.update(now - anim.start);
  for (const f of tickers) f(now);
  controls.update();
  renderer.render(scene, camera);
}

// ------------------------------------------------------------------ textures & materials
function canvasTex(w, h, draw, repeat = [1, 1]) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 4;
  return t;
}

let rnd = 1;
const rand = () => {
  rnd = (rnd * 16807) % 2147483647;
  return rnd / 2147483647;
};

function noiseFill(g, w, h, base, spread, count, size = 2) {
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < count; i++) {
    const l = Math.floor(rand() * spread * 2 - spread);
    g.fillStyle = l > 0 ? `rgba(255,255,255,${l / 255})` : `rgba(0,0,0,${-l / 255})`;
    g.fillRect(rand() * w, rand() * h, size * rand() + 0.6, size * rand() + 0.6);
  }
}

const TEX = {};
function textures() {
  if (TEX.plaster) return TEX;
  rnd = 7;
  TEX.plaster = canvasTex(256, 256, (g, w, h) => noiseFill(g, w, h, '#efebe4', 10, 5000));
  TEX.ceiling = canvasTex(256, 256, (g, w, h) => noiseFill(g, w, h, '#f7f6f3', 6, 3000));
  TEX.concrete = canvasTex(128, 128, (g, w, h) => noiseFill(g, w, h, '#8d8a85', 28, 2500, 3));
  TEX.patch = canvasTex(128, 128, (g, w, h) => noiseFill(g, w, h, '#f6f3ee', 8, 1200));
  TEX.wood = canvasTex(512, 512, (g, w, h) => {
    const planks = 6;
    const ph = h / planks;
    for (let i = 0; i < planks; i++) {
      const tone = 150 + Math.floor(rand() * 30);
      g.fillStyle = `rgb(${tone + 40},${tone + 5},${tone - 45})`;
      g.fillRect(0, i * ph, w, ph);
      for (let k = 0; k < 18; k++) {
        g.strokeStyle = `rgba(90,55,25,${0.08 + rand() * 0.12})`;
        g.lineWidth = 1 + rand() * 1.5;
        g.beginPath();
        const y = i * ph + rand() * ph;
        g.moveTo(0, y);
        g.bezierCurveTo(w * 0.3, y + rand() * 6 - 3, w * 0.7, y + rand() * 6 - 3, w, y + rand() * 4 - 2);
        g.stroke();
      }
      g.fillStyle = 'rgba(60,35,15,0.55)';
      g.fillRect(0, i * ph, w, 2);
      g.fillRect(((i * 0.37) % 1) * w, i * ph, 2, ph);
    }
  });
  return TEX;
}

const MAT = {};
function mats() {
  if (MAT.white) return MAT;
  const t = textures();
  MAT.wall = new THREE.MeshStandardMaterial({ map: t.plaster, roughness: 0.95 });
  MAT.ceiling = new THREE.MeshStandardMaterial({ map: t.ceiling, roughness: 0.95 });
  MAT.floor = new THREE.MeshStandardMaterial({ map: t.wood, roughness: 0.7 });
  MAT.skirting = new THREE.MeshStandardMaterial({ color: 0xf4f1ec, roughness: 0.6 });
  MAT.chase = new THREE.MeshStandardMaterial({ map: t.concrete, roughness: 1 });
  MAT.patch = new THREE.MeshStandardMaterial({ map: t.patch, roughness: 0.9 });
  MAT.channel = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.45 });
  MAT.mark = new THREE.MeshBasicMaterial({ color: 0x1d4ed8 });
  MAT.boxHole = new THREE.MeshStandardMaterial({ color: 0x2f3236, roughness: 0.9 });
  MAT.boxRim = new THREE.MeshStandardMaterial({ color: 0x5b6067, roughness: 0.7 });
  MAT.sheath = new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.55 });
  MAT.white = new THREE.MeshStandardMaterial({ color: 0xfbfbfa, roughness: 0.35 });
  MAT.offwhite = new THREE.MeshStandardMaterial({ color: 0xeceae6, roughness: 0.5 });
  MAT.dark = new THREE.MeshStandardMaterial({ color: 0x24272b, roughness: 0.6 });
  MAT.brass = new THREE.MeshStandardMaterial({ color: CORE.brass, metalness: 0.85, roughness: 0.3 });
  MAT.steel = new THREE.MeshStandardMaterial({ color: 0xb9bec4, metalness: 0.9, roughness: 0.25 });
  MAT.copper = new THREE.MeshStandardMaterial({ color: CORE.copper, metalness: 0.9, roughness: 0.3 });
  MAT.wago = new THREE.MeshStandardMaterial({ color: 0xe8eaec, roughness: 0.3, transparent: true, opacity: 0.85 });
  MAT.lever = new THREE.MeshStandardMaterial({ color: 0xf28c1b, roughness: 0.45 });
  MAT.tape = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.8 });
  MAT.panel = new THREE.MeshStandardMaterial({ color: 0xd9dde2, roughness: 0.5, metalness: 0.2 });
  MAT.highlight = new THREE.MeshStandardMaterial({ color: 0xffc107, emissive: 0xffa000, emissiveIntensity: 0.6, roughness: 0.4 });
  return MAT;
}

const coreMat = (hex) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.45 });

function labelSprite(text, color = '#1f2a37', bg = 'rgba(255,255,255,0.92)', size = 0.35) {
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  g.font = 'bold 64px sans-serif';
  const tw = Math.max(128, g.measureText(text).width + 64);
  c.width = Math.ceil(tw);
  c.height = 128;
  g.font = 'bold 64px sans-serif';
  g.fillStyle = bg;
  g.beginPath();
  g.roundRect(6, 8, c.width - 12, 112, 30);
  g.fill();
  g.fillStyle = color;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, c.width / 2, 68);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  s.scale.set((size * c.width) / 128, size, 1);
  s.renderOrder = 10;
  return s;
}

// ------------------------------------------------------------------ geometry helpers
/** Which room surfaces a point lies on: 'a'..'d' walls and 'ceil'. */
function surfacesOf(p, room) {
  const eps = 1e-3;
  const out = [];
  if (Math.abs(p[2] - room.height) < eps) out.push('ceil');
  if (Math.abs(p[1]) < eps) out.push('a');
  if (Math.abs(p[0] - room.length) < eps) out.push('b');
  if (Math.abs(p[1] - room.width) < eps) out.push('c');
  if (Math.abs(p[0]) < eps) out.push('d');
  return out;
}
const surfNormal = (s) => (s === 'ceil' ? new THREE.Vector3(0, -1, 0) : NORMAL[s]);

/** Offsets a polyline off the walls/ceiling into the room by [d]. */
function offsetPath(points, room, d) {
  return points.map((p) => {
    const n = new THREE.Vector3();
    for (const s of surfacesOf(p, room)) n.add(surfNormal(s));
    if (n.lengthSq() > 0) n.normalize();
    return v(p).addScaledVector(n, d);
  });
}

/** Thin box lying on a surface between a and b (room coords), used for chases, channels and marks. */
function stripBetween(a, b, room, width, thick, mat, lift) {
  const sa = surfacesOf(a, room);
  const sb = surfacesOf(b, room);
  const common = sa.find((s) => sb.includes(s)) || sa[0] || sb[0] || 'a';
  const n = surfNormal(common);
  const pa = v(a);
  const pb = v(b);
  const len = pa.distanceTo(pb);
  if (len < 1e-4) return null;
  const geo = new THREE.BoxGeometry(width, len + width, thick);
  const m = new THREE.Mesh(geo, mat);
  const dir = pb.clone().sub(pa).normalize();
  const side = new THREE.Vector3().crossVectors(dir, n).normalize();
  m.matrixAutoUpdate = false;
  const mid = pa.clone().add(pb).multiplyScalar(0.5).addScaledVector(n, lift + thick / 2);
  m.matrix.makeBasis(side, dir, n).setPosition(mid);
  return m;
}

/** Group whose local axes are (right, up, out of the surface) at a device position. */
function mountFrame(d) {
  const g = new THREE.Group();
  g.matrixAutoUpdate = false;
  const p = v(d.pos);
  if (d.type === 'lamp' && !d.wall) {
    g.matrix.makeBasis(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, -1, 0)).setPosition(p);
  } else {
    const w = d.wall || 'a';
    g.matrix.makeBasis(TANGENT[w], UP, NORMAL[w]).setPosition(p);
  }
  g.updateMatrixWorld(true);
  return g;
}

function frameAxes(d) {
  if (d.type === 'lamp' && !d.wall) return { right: new THREE.Vector3(1, 0, 0), up: new THREE.Vector3(0, 0, 1), out: new THREE.Vector3(0, -1, 0) };
  const w = d.wall || 'a';
  return { right: TANGENT[w].clone(), up: UP.clone(), out: NORMAL[w].clone() };
}

function tube(points, radius, mat, closed = false) {
  const curve = points.length > 2 ? new THREE.CatmullRomCurve3(points, closed, 'centripetal') : new THREE.LineCurve3(points[0], points[1]);
  const geo = new THREE.TubeGeometry(curve, Math.max(12, points.length * 10), radius, 8, closed);
  return new THREE.Mesh(geo, mat);
}

function polyTube(points, radius, mat) {
  const path = new THREE.CurvePath();
  for (let k = 1; k < points.length; k++) path.add(new THREE.LineCurve3(points[k - 1], points[k]));
  const geo = new THREE.TubeGeometry(path, Math.max(16, points.length * 12), radius, 8, false);
  return new THREE.Mesh(geo, mat);
}

/** Reveals a tube from its start: k in [0, 1]. */
function growTube(mesh, k) {
  const total = mesh.geometry.index ? mesh.geometry.index.count : mesh.geometry.attributes.position.count;
  const n = Math.floor((total * Math.max(0, Math.min(1, k))) / 6) * 6;
  mesh.geometry.setDrawRange(0, n);
  mesh.visible = n > 0;
}

function roundedPlate(w, h, depth, r, mat) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: depth * 0.3, bevelSize: r * 0.25, bevelSegments: 3 });
  return new THREE.Mesh(geo, mat);
}

// ------------------------------------------------------------------ room
function buildRoom(room, wallLabels) {
  const { length: L, width: W, height: H } = room;
  const m = mats();
  const g = new THREE.Group();
  const floorTex = textures().wood.clone();
  floorTex.needsUpdate = true;
  floorTex.repeat.set(L / 1.2, W / 1.2);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(L, W), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.7 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(L / 2, 0, W / 2);
  g.add(floor);
  // Ceiling faces down: visible from inside, invisible from above (dollhouse view).
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(L, W), m.ceiling);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(L / 2, H, W / 2);
  g.add(ceil);

  // Walls face into the room, so the ones between the camera and the room disappear when looking from outside.
  const walls = [
    { key: 'a', w: L, pos: [L / 2, H / 2, 0], rot: 0 },
    { key: 'b', w: W, pos: [L, H / 2, W / 2], rot: -Math.PI / 2 },
    { key: 'c', w: L, pos: [L / 2, H / 2, W], rot: Math.PI },
    { key: 'd', w: W, pos: [0, H / 2, W / 2], rot: Math.PI / 2 },
  ];
  const wallGroup = new THREE.Group();
  const labelGroup = new THREE.Group();
  for (const wall of walls) {
    const tex = textures().plaster.clone();
    tex.needsUpdate = true;
    tex.repeat.set(wall.w / 1.5, H / 1.5);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(wall.w, H), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
    mesh.position.set(...wall.pos);
    mesh.rotation.y = wall.rot;
    wallGroup.add(mesh);
    const sk = new THREE.Mesh(new THREE.BoxGeometry(wall.w, 0.07, 0.012), m.skirting);
    sk.position.set(...wall.pos);
    sk.position.y = 0.035;
    sk.rotation.y = wall.rot;
    sk.translateZ(0.006);
    wallGroup.add(sk);
    const s = labelSprite((wallLabels && wallLabels[wall.key]) || wall.key.toUpperCase(), '#1565C0', 'rgba(255,255,255,0.92)', 0.32);
    s.position.set(wall.pos[0], H + 0.28, wall.pos[2]);
    labelGroup.add(s);
  }
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(L, H, W)),
    new THREE.LineBasicMaterial({ color: dark ? 0x8fa3b8 : 0x9aa7b5, transparent: true, opacity: 0.6 }),
  );
  edges.position.set(L / 2, H / 2, W / 2);
  g.add(edges);
  g.add(wallGroup);
  g.add(labelGroup);
  layers.walls = wallGroup;
  layers.labels = labelGroup;
  return g;
}

// ------------------------------------------------------------------ installation layers
function buildMarks(room, segments, devices) {
  const g = new THREE.Group();
  const m = mats();
  for (const seg of segments) {
    for (let k = 1; k < seg.points.length; k++) {
      const a = seg.points[k - 1];
      const b = seg.points[k];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      const dash = 0.07;
      const gap = 0.045;
      for (let s = 0; s < len; s += dash + gap) {
        const e = Math.min(len, s + dash);
        const pa = a.map((x, i) => x + ((b[i] - x) * s) / len);
        const pb = a.map((x, i) => x + ((b[i] - x) * e) / len);
        const strip = stripBetween(pa, pb, room, 0.014, 0.001, m.mark, 0.0015);
        if (strip) g.add(strip);
      }
    }
  }
  for (const d of devices) {
    if (d.type === 'input') continue;
    const f = mountFrame(d);
    for (const rot of [Math.PI / 4, -Math.PI / 4]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.014, 0.001), m.mark);
      bar.rotation.z = rot;
      bar.position.z = 0.002;
      f.add(bar);
    }
    g.add(f);
  }
  return g;
}

function buildChases(room, segments, open) {
  const g = new THREE.Group();
  const m = mats();
  for (const seg of segments) {
    for (let k = 1; k < seg.points.length; k++) {
      const strip = open
        ? stripBetween(seg.points[k - 1], seg.points[k], room, 0.03, 0.018, m.channel, 0)
        : stripBetween(seg.points[k - 1], seg.points[k], room, 0.045, 0.0015, m.chase, 0.0004);
      if (strip) {
        strip.userData = { segment: seg.id };
        g.add(strip);
      }
    }
  }
  return g;
}

function buildPatches(room, segments) {
  const g = new THREE.Group();
  for (const seg of segments) {
    for (let k = 1; k < seg.points.length; k++) {
      const strip = stripBetween(seg.points[k - 1], seg.points[k], room, 0.04, 0.0012, mats().patch, 0.0005);
      if (strip) g.add(strip);
    }
  }
  return g;
}

function buildBoxes(devices, open) {
  const g = new THREE.Group();
  const m = mats();
  for (const d of devices) {
    if (!['socket', 'switchSingle', 'switchDouble', 'switchPass', 'junctionBox'].includes(d.type)) continue;
    const f = mountFrame(d);
    const r = d.type === 'junctionBox' ? 0.05 : 0.034;
    if (open) {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.03, 32), m.white);
      body.rotation.x = Math.PI / 2;
      body.position.z = 0.015;
      f.add(body);
    } else {
      const hole = new THREE.Mesh(new THREE.CircleGeometry(r, 40), m.boxHole);
      hole.position.z = 0.0012;
      f.add(hole);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.0025, 8, 40), m.boxRim);
      rim.position.z = 0.0015;
      f.add(rim);
    }
    f.userData = { device: d.id };
    g.add(f);
  }
  return g;
}

/** Short cable tails with stripped coloured cores sticking out of a box, ready to connect. */
function buildTails(d, pe) {
  const f = mountFrame(d);
  const cores = d.type.startsWith('switch') ? [CORE.brown, CORE.black, CORE.grey] : pe ? [CORE.brown, CORE.blue, CORE.yg] : [CORE.brown, CORE.blue];
  const base = new THREE.Vector3(0, 0.012, 0.004);
  cores.forEach((c, i) => {
    const ang = -0.5 + i * 0.5;
    const end = new THREE.Vector3(Math.sin(ang) * 0.035, 0.012 - Math.cos(ang) * 0.02, 0.06);
    const mid = new THREE.Vector3(Math.sin(ang) * 0.015, 0.02, 0.035);
    f.add(tube([base, mid, end], 0.0018, coreMat(c)));
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.0008, 0.0008, 0.01, 6), mats().copper);
    tip.position.copy(end);
    tip.lookAt(end.clone().add(end.clone().sub(mid)));
    tip.rotateX(Math.PI / 2);
    f.add(tip);
  });
  return f;
}

function buildCables(room, segments) {
  const group = new THREE.Group();
  const bySeg = {};
  for (const seg of segments) {
    if (seg.points.length < 2) continue;
    const pts = offsetPath(seg.points, room, 0.008);
    const mesh = polyTube(pts, 0.0065, mats().sheath.clone());
    mesh.userData = { segment: seg.id };
    group.add(mesh);
    bySeg[seg.id] = mesh;
  }
  layers.cables = group;
  return { group, bySeg };
}

// ------------------------------------------------------------------ finished devices
function socketMesh() {
  const m = mats();
  const g = new THREE.Group();
  const plate = roundedPlate(0.082, 0.082, 0.007, 0.01, m.white);
  g.add(plate);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.006, 40), m.offwhite);
  cup.rotation.x = Math.PI / 2;
  cup.position.z = 0.008;
  g.add(cup);
  for (const dx of [-0.0095, 0.0095]) {
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.0028, 0.0028, 0.004, 12), m.dark);
    h.rotation.x = Math.PI / 2;
    h.position.set(dx, 0, 0.0115);
    g.add(h);
  }
  for (const dy of [-0.019, 0.019]) {
    const clip = new THREE.Mesh(new THREE.BoxGeometry(0.009, 0.004, 0.003), m.steel);
    clip.position.set(0, dy, 0.011);
    g.add(clip);
  }
  return g;
}

function switchMesh(type) {
  const m = mats();
  const g = new THREE.Group();
  g.add(roundedPlate(0.082, 0.082, 0.007, 0.01, m.white));
  const keys = type === 'switchDouble' ? [-0.0145, 0.0145] : [0];
  for (const dx of keys) {
    const key = roundedPlate(keys.length > 1 ? 0.027 : 0.058, 0.058, 0.005, 0.005, m.offwhite);
    key.position.set(dx, 0, 0.009);
    key.rotation.x = -0.06;
    g.add(key);
  }
  if (type === 'switchPass') {
    const arrow = labelSprite('⇅', '#1565C0', 'rgba(0,0,0,0)', 0.02);
    arrow.position.set(0, 0, 0.017);
    g.add(arrow);
  }
  return g;
}

function lampMesh() {
  const m = mats();
  const g = new THREE.Group();
  const canopy = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.02, 32), m.white);
  canopy.rotation.x = Math.PI / 2;
  canopy.position.z = 0.01;
  g.add(canopy);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.42, 8), m.dark);
  cord.rotation.x = Math.PI / 2;
  cord.position.z = 0.23;
  g.add(cord);
  const profile = [
    new THREE.Vector2(0.018, 0),
    new THREE.Vector2(0.03, 0.02),
    new THREE.Vector2(0.11, 0.12),
    new THREE.Vector2(0.135, 0.17),
  ];
  const shade = new THREE.Mesh(new THREE.LatheGeometry(profile, 40), new THREE.MeshStandardMaterial({ color: 0xf3f1ed, roughness: 0.5, side: THREE.DoubleSide }));
  shade.rotation.x = Math.PI / 2;
  shade.position.z = 0.44;
  g.add(shade);
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 24, 16),
    new THREE.MeshStandardMaterial({ color: 0xfff8e1, emissive: 0xffe08a, emissiveIntensity: 0.15 }),
  );
  bulb.position.z = 0.58;
  bulb.userData.bulb = true;
  g.add(bulb);
  return g;
}

function deviceMesh(d) {
  switch (d.type) {
    case 'socket':
      return socketMesh();
    case 'switchSingle':
    case 'switchDouble':
    case 'switchPass':
      return switchMesh(d.type);
    case 'lamp':
      return d.wall ? wallLampMesh() : lampMesh();
    case 'junctionBox': {
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.006, 40), mats().white);
      lid.rotation.x = Math.PI / 2;
      lid.position.z = 0.004;
      const g = new THREE.Group();
      g.add(lid);
      return g;
    }
    default: {
      // Cable entry from the panel: a small grommet with an arrow-like marker.
      const g = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.006, 8, 24), new THREE.MeshStandardMaterial({ color: 0xff8f00, roughness: 0.5 }));
      g.add(ring);
      return g;
    }
  }
}

function wallLampMesh() {
  const g = new THREE.Group();
  g.add(roundedPlate(0.1, 0.1, 0.01, 0.02, mats().white));
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xfff8e1, emissive: 0xffe08a, emissiveIntensity: 0.15 }),
  );
  bulb.rotation.x = Math.PI / 2;
  bulb.position.z = 0.012;
  bulb.userData.bulb = true;
  g.add(bulb);
  return g;
}

function buildDevices(devices) {
  const group = new THREE.Group();
  const byId = {};
  for (const d of devices) {
    const f = mountFrame(d);
    const mesh = deviceMesh(d);
    f.add(mesh);
    f.userData = { device: d.id };
    f.traverse((o) => {
      if (!o.userData.bulb) o.userData = { ...o.userData, device: d.id };
      else o.userData.device = d.id;
    });
    group.add(f);
    byId[d.id] = f;
  }
  layers.devices = group;
  return { group, byId };
}

// ------------------------------------------------------------------ close-ups
function terminal(x, y, z, text, color) {
  const m = mats();
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.009, 0.007, 0.007), m.brass);
  g.add(body);
  const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.0028, 0.0028, 0.002, 16), m.steel);
  screw.rotation.x = Math.PI / 2;
  screw.position.z = 0.0045;
  g.add(screw);
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.0045, 0.0007, 0.0006), m.dark);
  slot.position.z = 0.0056;
  screw.add(slot);
  slot.position.set(0, 0.0011, 0);
  const lab = labelSprite(text, '#fff', color, 0.011);
  lab.position.set(0, -0.011, 0.006);
  g.add(lab);
  g.position.set(x, y, z);
  g.userData.screw = screw;
  return g;
}

/** A wire from a cable mouth to a terminal; grows in during the animation. */
function wire(points, color, opts = {}) {
  const g = new THREE.Group();
  const ins = tube(points, opts.r || 0.0017, coreMat(color));
  g.add(ins);
  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.0008, 0.0008, 0.009, 8), mats().copper);
  tip.position.copy(last.clone().add(last.clone().sub(prev).normalize().multiplyScalar(0.004)));
  tip.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), last.clone().sub(prev).normalize());
  tip.visible = false;
  g.add(tip);
  if (opts.sleeve) {
    const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.012, 10), coreMat(opts.sleeve));
    const p = points[Math.max(0, points.length - 2)];
    sl.position.copy(p);
    sl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), last.clone().sub(p).normalize());
    g.add(sl);
  }
  return { group: g, ins, tip };
}

function sheathEnd(from, dir) {
  const end = from.clone().addScaledVector(dir, 0.03);
  const m = tube([from.clone().addScaledVector(dir, -0.05), from, end], 0.0062, mats().sheath);
  return { mesh: m, mouth: end };
}

/** Builds the close-up for a connection step. Returns {group, play(t)}; coordinates are in the device frame. */
function buildDetail(kind, d, params) {
  const g = mountFrame(d);
  const pe = params.pe !== false;
  const wires = [];
  const terms = [];
  const holder = new THREE.Group();
  g.add(holder);
  const m = mats();
  const addWire = (pts, color, term, opts) => {
    const w = wire(pts, color, opts);
    holder.add(w.group);
    wires.push({ ...w, term });
  };

  if (kind === 'socket' || kind === 'switchSingle' || kind === 'switchDouble' || kind === 'switchPass') {
    // Cable comes down the chase into the top of the box; the mechanism is pulled out in front of it.
    const sh = sheathEnd(new THREE.Vector3(0, 0.03, 0.006), new THREE.Vector3(0, -1, 0.35).normalize());
    holder.add(sh.mesh);
    const mech = new THREE.Group();
    mech.position.set(0, -0.004, 0.045);
    holder.add(mech);
    mech.add(roundedPlate(0.07, 0.07, 0.008, 0.006, m.offwhite));
    const z = 0.012;
    const mouth = sh.mouth;
    const toMech = (x, y) => new THREE.Vector3(x, y - 0.004, 0.045 + z);
    const route = (x, y, bend) => [mouth.clone(), mouth.clone().add(new THREE.Vector3(x * 0.4, -0.006, 0.02 + bend)), toMech(x, y + 0.014), toMech(x, y + 0.004)];
    if (kind === 'socket') {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.005, 32), m.white);
      cup.rotation.x = Math.PI / 2;
      cup.position.z = 0.011;
      mech.add(cup);
      terms.push(terminal(-0.024, -0.02, z, 'L', '#7a4a26'));
      terms.push(terminal(0.024, -0.02, z, 'N', '#1f5fd1'));
      if (pe) terms.push(terminal(0, 0.026, z, 'PE', '#5f8f1f'));
      terms.forEach((t) => mech.add(t));
      addWire(route(-0.024, -0.02, 0.006), CORE.brown, terms[0]);
      addWire(route(0.024, -0.02, 0.012), CORE.blue, terms[1]);
      if (pe) addWire([mouth.clone(), mouth.clone().add(new THREE.Vector3(0, 0.004, 0.02)), toMech(0, 0.04), toMech(0, 0.03)], CORE.yg, terms[2]);
    } else {
      const keys = kind === 'switchDouble' ? ['L', 'L1', 'L2'] : kind === 'switchPass' ? ['COM', 'L1', 'L2'] : ['L', 'L1'];
      const xs = keys.length === 2 ? [-0.02, 0.02] : [-0.024, 0, 0.024];
      const ys = kind === 'switchSingle' ? [-0.022, -0.022] : [-0.022, 0.024, 0.024];
      const cols = [CORE.brown, CORE.black, CORE.grey];
      keys.forEach((k, i) => {
        const t = terminal(kind === 'switchSingle' ? xs[i] : i === 0 ? 0 : xs[i === 1 ? 0 : 2], ys[i], z, k, i === 0 ? '#7a4a26' : '#333');
        terms.push(t);
        mech.add(t);
      });
      terms.forEach((t, i) => {
        const p = t.position;
        addWire(route(p.x, p.y, 0.004 + i * 0.006), cols[i], t);
      });
      if (kind === 'switchSingle') {
        // Spare grey core: folded back and capped with tape.
        const end = mouth.clone().add(new THREE.Vector3(0.022, 0.004, 0.022));
        const w = wire([mouth.clone(), mouth.clone().add(new THREE.Vector3(0.012, 0.008, 0.012)), end], CORE.grey);
        w.tip.visible = false;
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.0026, 0.0026, 0.01, 10), m.tape);
        cap.position.copy(end);
        w.group.add(cap);
        holder.add(w.group);
        wires.push({ ...w, term: null, cap });
      }
    }
  } else if (kind === 'lamp') {
    // Ceiling: the cable comes out of the ceiling; a terminal block hangs below it.
    const mouth = new THREE.Vector3(0, 0, 0.004);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.016, 24), m.boxHole);
    hole.position.z = 0.0012;
    holder.add(hole);
    const block = new THREE.Group();
    block.position.set(0, 0, 0.07);
    holder.add(block);
    block.add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.016, 0.012), m.white));
    const keys = pe ? [['L', '#7a4a26', CORE.brown], ['N', '#1f5fd1', CORE.blue], ['PE', '#5f8f1f', CORE.yg]] : [['L', '#7a4a26', CORE.brown], ['N', '#1f5fd1', CORE.blue]];
    keys.forEach(([k, c, core], i) => {
      const x = (i - (keys.length - 1) / 2) * 0.016;
      const t = terminal(x, 0, 0.008, k, c);
      t.position.set(x, 0, 0.008);
      block.add(t);
      terms.push(t);
      addWire([mouth.clone(), new THREE.Vector3(x * 0.4, -0.012, 0.03), new THREE.Vector3(x, -0.006, 0.07), new THREE.Vector3(x, 0, 0.0755)], core, t);
    });
    const canopy = lampMesh();
    canopy.position.z = 0.0;
    canopy.traverse((o) => {
      if (o.material) {
        o.material = o.material.clone();
        o.material.transparent = true;
        o.material.opacity = 0.18;
        o.material.depthWrite = false;
      }
    });
    canopy.userData.ghost = true;
    holder.add(canopy);
  } else if (kind === 'junction') {
    const lamps = Math.min(3, Math.max(1, params.lamps || 1));
    // Three cables enter the open box: feed (top left), lamp (top right), switch (bottom).
    const feed = sheathEnd(new THREE.Vector3(-0.026, 0.044, 0.004), new THREE.Vector3(0.15, -1, 0.12).normalize());
    const lamp = sheathEnd(new THREE.Vector3(0.026, 0.044, 0.004), new THREE.Vector3(-0.15, -1, 0.12).normalize());
    const sw = sheathEnd(new THREE.Vector3(0, -0.046, 0.004), new THREE.Vector3(0, 1, 0.12).normalize());
    [feed, lamp, sw].forEach((s) => holder.add(s.mesh));
    const wagoY = [0.012, -0.012];
    const wagoX = [-0.016, 0.016];
    // L (feed brown + switch brown), S (switch black + lamp brown), N (feed blue + lamp blue), PE.
    const groups = [
      { name: 'L', x: wagoX[0], y: wagoY[0], wires: [[feed, CORE.brown], [sw, CORE.brown]], color: '#7a4a26' },
      { name: 'L1', x: wagoX[1], y: wagoY[0], wires: [[sw, CORE.black], ...Array.from({ length: lamps }, () => [lamp, CORE.brown])], color: '#333' },
      { name: 'N', x: wagoX[0], y: wagoY[1], wires: [[feed, CORE.blue], ...Array.from({ length: lamps }, () => [lamp, CORE.blue])], color: '#1f5fd1' },
    ];
    if (params.pe !== false) groups.push({ name: 'PE', x: wagoX[1], y: wagoY[1], wires: [[feed, CORE.yg], ...Array.from({ length: lamps }, () => [lamp, CORE.yg])], color: '#5f8f1f' });
    for (const grp of groups) {
      const n = grp.wires.length;
      const w = 0.0062 * n + 0.004;
      const wago = new THREE.Group();
      wago.position.set(grp.x, grp.y, 0.028);
      wago.add(new THREE.Mesh(new THREE.BoxGeometry(w, 0.013, 0.012), m.wago));
      for (let i = 0; i < n; i++) {
        const lever = new THREE.Mesh(new THREE.BoxGeometry(0.0045, 0.009, 0.003), m.lever);
        lever.position.set(-w / 2 + 0.0052 + i * 0.0062, 0.001, 0.0072);
        wago.add(lever);
      }
      const lab = labelSprite(grp.name, '#fff', grp.color, 0.009);
      lab.position.set(0, 0.0115, 0.008);
      wago.add(lab);
      holder.add(wago);
      grp.wires.forEach(([cable, color], i) => {
        const port = new THREE.Vector3(grp.x - w / 2 + 0.0052 + i * 0.0062, grp.y - 0.0065, 0.028);
        const pts = [cable.mouth.clone(), cable.mouth.clone().lerp(port, 0.5).add(new THREE.Vector3(0, 0, 0.022)), port.clone().add(new THREE.Vector3(0, -0.008, 0)), port];
        addWire(pts, color, { userData: { screw: lab }, position: port }, { r: 0.0015 });
      });
    }
  } else if (kind === 'panel') {
    // Distribution board with a row of breakers; the room's breaker flips down and gets a tag.
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.2, 0.05), m.panel);
    box.position.z = 0.025;
    holder.add(box);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.035, 0.008), m.steel);
    rail.position.set(0, 0, 0.052);
    holder.add(rail);
    const levers = [];
    for (let i = 0; i < 6; i++) {
      const br = new THREE.Mesh(new THREE.BoxGeometry(0.0175, 0.07, 0.045), m.white);
      br.position.set(-0.09 + i * 0.036, 0, 0.065);
      holder.add(br);
      const lv = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.016, 0.01), i === 2 ? m.lever : m.dark);
      lv.geometry.translate(0, 0.008, 0);
      lv.position.set(-0.09 + i * 0.036, 0, 0.09);
      holder.add(lv);
      levers.push(lv);
    }
    const tag = labelSprite(labels.sign || 'Do not switch on!', '#fff', '#c62828', 0.028);
    tag.position.set(-0.018, -0.07, 0.1);
    tag.visible = false;
    holder.add(tag);
    return {
      group: g,
      play(t) {
        const k = Math.min(1, Math.max(0, (t - 0.6) / 0.6));
        levers[2].rotation.x = -k * 2.4;
        tag.visible = t > 1.4;
      },
      camera: { dist: 0.55, up: 0.06 },
    };
  }

  terms.forEach(() => {});
  // Animation: wires grow in one after another, then the terminal screw turns.
  const per = 0.9;
  return {
    group: g,
    play(t) {
      wires.forEach((w, i) => {
        const k = (t - 0.3 - i * per) / (per * 0.7);
        growTube(w.ins, k);
        w.tip.visible = k >= 1 && w.term !== null;
        if (w.cap) w.cap.visible = k >= 1;
        const screw = w.term && w.term.userData && w.term.userData.screw;
        if (screw && screw.rotation !== undefined && k >= 1) screw.rotation.z = Math.min(1, (t - 0.3 - i * per - per * 0.7) / 0.25) * Math.PI;
      });
    },
    camera: kind === 'junction' ? { dist: 0.26, up: 0.02 } : kind === 'lamp' ? { dist: 0.26, up: 0.0 } : { dist: 0.24, up: 0.02 },
  };
}

/** Pulsing yellow rings that point out where the current step happens in the overview. */
function buildPins(devs) {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0xffb300, transparent: true, opacity: 0.9, depthTest: false });
  const rings = [];
  for (const d of devs) {
    const f = mountFrame(d);
    const r = new THREE.Mesh(new THREE.RingGeometry(0.075, 0.1, 40), mat);
    r.position.z = 0.01;
    r.renderOrder = 5;
    f.add(r);
    rings.push(r);
    g.add(f);
  }
  tickers.add((now) => {
    const k = 1 + 0.35 * Math.sin(now * 4);
    rings.forEach((r) => r.scale.set(k, k, 1));
    mat.opacity = 0.55 + 0.35 * Math.sin(now * 4 + 1);
  });
  return g;
}

// ------------------------------------------------------------------ scene state per step
const built = {};

function load(input) {
  try {
    const data = typeof input === 'string' ? JSON.parse(input) : input;
    if (root) {
      scene.remove(root);
      root.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
      });
    }
    tickers.clear();
    anim = null;
    if (typeof data.dark === 'boolean') {
      dark = data.dark;
      applyTheme();
    }
    current = data;
    colors = { ...DEFAULT_COLORS, ...(data.colors || {}) };
    labels = data.labels || {};
    steps = Array.isArray(data.steps) ? data.steps : [];
    const open = data.wiring === 'open';
    const devices = data.devices || [];
    const segments = data.segments || [];
    root = new THREE.Group();
    root.add(buildRoom(data.room, data.wall_labels));
    built.marks = buildMarks(data.room, segments, devices);
    built.chases = buildChases(data.room, segments, open);
    built.patches = buildPatches(data.room, segments);
    built.boxes = buildBoxes(devices, open);
    const cables = buildCables(data.room, segments);
    built.cables = cables;
    const devs = buildDevices(devices);
    built.devices = devs;
    built.tails = {};
    for (const d of devices) {
      if (['socket', 'switchSingle', 'switchDouble', 'switchPass', 'lamp', 'junctionBox'].includes(d.type)) {
        built.tails[d.id] = buildTails(d, data.pe !== false);
        root.add(built.tails[d.id]);
      }
    }
    built.lights = new THREE.Group();
    for (const d of devices.filter((x) => x.type === 'lamp')) {
      const l = new THREE.PointLight(0xffe0a3, 0, 4, 1.6);
      const p = v(d.pos);
      if (!d.wall) p.y -= 0.6;
      l.position.copy(p);
      built.lights.add(l);
    }
    built.open = open;
    [built.marks, built.chases, built.patches, built.boxes, cables.group, devs.group, built.lights].forEach((x) => root.add(x));
    scene.add(root);
    stepIndex = -1;
    if (steps.length) step(0, true);
    else showAll();
    post({ type: 'loaded', devices: devices.length, segments: segments.length, steps: steps.length });
  } catch (e) {
    post({ type: 'error', message: String(e && e.message ? e.message : e) });
  }
}

/** Free view without the guide: finished room with cables visible. */
function showAll() {
  built.marks.visible = false;
  built.patches.visible = false;
  built.chases.visible = true;
  built.boxes.visible = true;
  built.cables.group.visible = true;
  Object.values(built.cables.bySeg).forEach((m) => growTube(m, 1));
  Object.values(built.tails).forEach((t) => (t.visible = false));
  built.devices.group.visible = true;
  setLamps(false);
  overview();
}

function setLamps(on) {
  built.lights.children.forEach((l) => (l.intensity = on ? 2.2 : 0));
  built.devices.group.traverse((o) => {
    if (o.userData.bulb) o.material.emissiveIntensity = on ? 2.4 : 0.15;
  });
}

const ORDER = ['safety', 'mark', 'chase', 'channel', 'boxes', 'cable', 'junction', 'socket', 'switchSingle', 'switchDouble', 'switchPass', 'lamp', 'finish'];
const rank = (stage) => ORDER.indexOf(stage);
const DEVICE_STAGE = { socket: 'socket', switchSingle: 'switchSingle', switchDouble: 'switchDouble', switchPass: 'switchPass', lamp: 'lamp', junctionBox: 'junction' };

function step(i, instant = false) {
  if (!steps.length || !current) return;
  stepIndex = Math.max(0, Math.min(steps.length - 1, i));
  const s = steps[stepIndex];
  const r = rank(s.stage);
  const devices = current.devices || [];
  const segById = Object.fromEntries((current.segments || []).map((x) => [x.id, x]));
  for (const k of ['detail', 'pins']) {
    if (built[k]) {
      root.remove(built[k]);
      built[k] = null;
    }
  }
  anim = null;
  tickers.clear();

  // What exists in the room at this point of the job.
  const finished = s.stage === 'finish';
  built.marks.visible = r >= rank('mark') && r < rank('chase');
  built.chases.visible = r >= rank('chase') && !(finished && !built.open);
  built.patches.visible = finished && !built.open;
  built.boxes.visible = r >= rank('boxes');
  layers.labels.visible = ['mark', 'chase', 'channel', 'boxes', 'cable', 'finish', 'safety'].includes(s.stage);

  // Cables: everything laid in earlier cable steps, the current one grows in.
  const laid = new Set();
  for (let k = 0; k < stepIndex; k++) if (steps[k].stage === 'cable') steps[k].segments.forEach((id) => laid.add(id));
  const growing = s.stage === 'cable' ? new Set(s.segments) : new Set();
  for (const [id, mesh] of Object.entries(built.cables.bySeg)) {
    const show = !finished || built.open ? laid.has(id) || growing.has(id) || r > rank('cable') : false;
    mesh.visible = show;
    growTube(mesh, show ? 1 : 0);
    mesh.material.color.set(growing.has(id) ? 0xffd54f : 0xf2f2ee);
    mesh.material.emissive = new THREE.Color(growing.has(id) ? 0x8a6d00 : 0x000000);
    if (finished && built.open) mesh.visible = false;
  }
  if (growing.size) {
    const list = [...growing].map((id) => built.cables.bySeg[id]).filter(Boolean);
    anim = {
      start: clock.getElapsedTime(),
      update(t) {
        list.forEach((m, k) => growTube(m, (t - 0.4 - k * 0.5) / 1.4));
      },
    };
  }

  // Devices are mounted after their connection step; until then the box shows cable tails.
  for (const d of devices) {
    const f = built.devices.byId[d.id];
    if (!f) continue;
    const st = DEVICE_STAGE[d.type];
    const mountedAt = st ? steps.findIndex((x) => x.stage === st) : -1;
    const isDetail = s.detail && (s.devices || []).concat(s.focus ? [s.focus] : []).includes(d.id);
    f.visible = d.type === 'input' ? true : mountedAt >= 0 && stepIndex > mountedAt && !isDetail;
    if (finished) f.visible = true;
    const tails = built.tails[d.id];
    if (tails) {
      const cableIdx = steps.findIndex((x) => x.stage === 'cable' && (x.devices || []).includes(d.id));
      tails.visible = cableIdx >= 0 && stepIndex >= cableIdx && !f.visible && !(s.focus === d.id && s.detail);
    }
  }
  setLamps(finished);
  const close = !!s.detail || s.stage === 'safety';
  if (close) Object.values(built.cables.bySeg).forEach((m) => (m.visible = false));
  const pinIds = s.stage === 'mark' || s.stage === 'boxes' ? s.devices || [] : s.stage === 'cable' ? (s.devices || []) : [];
  const pinDevs = devices.filter((d) => pinIds.includes(d.id) && d.type !== 'input');
  if (pinDevs.length) {
    built.pins = buildPins(pinDevs);
    root.add(built.pins);
  }

  // Close-up for connection steps and the panel at the start.
  const focusDev = devices.find((d) => d.id === s.focus);
  if (s.detail && focusDev) {
    const det = buildDetail(s.detail, focusDev, s.params || {});
    built.detail = det.group;
    root.add(det.group);
    anim = { start: clock.getElapsedTime(), update: det.play };
    built.view = { kind: 'close', dev: focusDev, ...det.camera };
  } else if (s.stage === 'safety') {
    const panelDev = panelPlacement(focusDev);
    const det = buildDetail('panel', panelDev, {});
    built.detail = det.group;
    root.add(det.group);
    anim = { start: clock.getElapsedTime(), update: det.play };
    built.view = { kind: 'close', dev: panelDev, ...det.camera };
  } else if (s.stage === 'cable') {
    const pts = s.segments.flatMap((id) => (segById[id] ? segById[id].points : []));
    built.view = { kind: 'outside', focus: centroid(pts), rotate: false };
  } else {
    built.view = { kind: 'outside', focus: null, rotate: true };
  }
  aimCamera(instant);
}

/** The panel sketch goes on the input wall at chest height (the real panel may be elsewhere). */
function panelPlacement(input) {
  const room = current.room;
  const w = (input && input.wall) || 'a';
  const u = input ? input.u : 0.6;
  const len = w === 'a' || w === 'c' ? room.length : room.width;
  const uu = Math.min(Math.max(u, 0.25), len - 0.25);
  const z = 1.5;
  const pos = { a: [uu, 0, z], b: [room.length, uu, z], c: [room.length - uu, room.width, z], d: [0, room.width - uu, z] }[w];
  return { id: 'panel', type: 'panel', wall: w, u: uu, z, pos };
}

function centroid(points) {
  if (!points.length) return null;
  const c = [0, 0, 0];
  points.forEach((p) => {
    c[0] += p[0];
    c[1] += p[1];
    c[2] += p[2];
  });
  return c.map((x) => x / points.length);
}

function aimCamera(instant) {
  const view = built.view;
  if (!view || !current) return;
  const { length: L, width: W, height: H } = current.room;
  let pos;
  let target;
  if (view.kind === 'close') {
    const d = view.dev;
    const ax = frameAxes(d);
    target = v(d.pos).addScaledVector(ax.out, 0.035);
    pos = target.clone().addScaledVector(ax.out, view.dist).addScaledVector(ax.up, view.up).addScaledVector(ax.right, view.dist * 0.18);
    if (d.type === 'lamp' && !d.wall) {
      target = v(d.pos).add(new THREE.Vector3(0, -0.05, 0));
      pos = target.clone().add(new THREE.Vector3(0.1, -view.dist * 0.75, 0.2));
    }
    controls.minDistance = 0.08;
    controls.maxDistance = 1.5;
    controls.autoRotate = false;
  } else {
    // Dollhouse view from outside: the walls facing the camera are invisible.
    const r = 0.5 * Math.sqrt(L * L + W * W + H * H);
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    const dist = (r / Math.sin(Math.min(vfov, hfov) / 2)) * 1.02;
    target = new THREE.Vector3(L / 2, H * 0.42, W / 2);
    let dir = new THREE.Vector3(0.75, 0.95, 1.25);
    if (view.focus) {
      const f = v(view.focus);
      dir = new THREE.Vector3(L / 2 - f.x, 0, W / 2 - f.z);
      if (dir.lengthSq() < 1e-4) dir.set(0.75, 0, 1.25);
      dir.normalize();
      dir.y = 0.95;
    }
    dir.normalize();
    pos = target.clone().addScaledVector(dir, dist);
    controls.minDistance = 0.5;
    controls.maxDistance = dist * 3;
    controls.autoRotate = !!view.rotate;
  }
  if (instant) {
    camera.position.copy(pos);
    controls.target.copy(target);
    tween = null;
  } else {
    tween = { t0: clock.getElapsedTime(), dur: 1.1, p0: camera.position.clone(), p1: pos, q0: controls.target.clone(), q1: target };
  }
  controls.update();
}

function overview() {
  built.view = { kind: 'outside', focus: null, rotate: false };
  aimCamera(true);
}

function resetView() {
  if (!current) return;
  aimCamera(false);
}

function replay() {
  if (stepIndex >= 0) step(stepIndex);
}

// ------------------------------------------------------------------ interaction
const raycaster = new THREE.Raycaster();
function onTap(ev) {
  if (!layers.devices) return;
  const rect = renderer.domElement.getBoundingClientRect();
  const ndc = new THREE.Vector2(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects([layers.devices, layers.cables].filter(Boolean), true).filter((h) => h.object.visible);
  if (hits.length) post({ type: 'tap', ...hits[0].object.userData });
}

function setLayer(name, visible) {
  if (layers[name]) layers[name].visible = !!visible;
}

function setTheme(isDark) {
  dark = !!isDark;
  applyTheme();
}

window.ElektrUy = { load, step, replay, resetView, setLayer, setTheme };
window.addEventListener('error', (e) => post({ type: 'error', message: String(e.message) }));
init();
