// ElektrUy 3D room viewer. Runs inside a WebView from bundled assets (no network).
// Flutter -> JS: window.ElektrUy.load(json), .resetView(), .setLayer(name, visible), .setTheme(dark)
// JS -> Flutter: the "ElektrUyBridge" JavaScript channel receives {type:'ready'|'tap'|'error', ...}
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
  traveller: '#111111',
};

let renderer, scene, camera, controls, root;
const layers = { cables: null, devices: null, walls: null, labels: null };
let current = null;
let dark = false;

// Room coordinates: x along wall A, y along wall B, z up. Three.js is y-up.
const v = (p) => new THREE.Vector3(p[0], p[2], p[1]);

function init() {
  const canvas = document.getElementById('c');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(50, 1, 0.05, 100);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI * 0.49;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(5, 8, 4);
  scene.add(sun);
  applyTheme();
  window.addEventListener('resize', resize);
  renderer.domElement.addEventListener('click', onTap);
  resize();
  animate();
  post({ type: 'ready' });
}

function applyTheme() {
  scene.background = new THREE.Color(dark ? 0x101418 : 0xf3f6f8);
}

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / Math.max(h, 1);
  camera.updateProjectionMatrix();
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

function labelSprite(text, color = '#263238', bg = 'rgba(255,255,255,0.85)', size = 0.35) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.beginPath();
  g.roundRect(8, 8, 240, 112, 24);
  g.fill();
  g.fillStyle = color;
  g.font = 'bold 64px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 128, 66);
  const tex = new THREE.CanvasTexture(c);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  s.scale.set(size * 2, size, 1);
  s.renderOrder = 10;
  return s;
}

function buildRoom(room, wallLabels) {
  const { length: L, width: W, height: H } = room;
  const g = new THREE.Group();
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(L, W),
    new THREE.MeshStandardMaterial({ color: dark ? 0x37474f : 0xd7ccc8, side: THREE.DoubleSide }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(L / 2, 0, W / 2);
  g.add(floor);

  const wallMat = new THREE.MeshStandardMaterial({
    color: dark ? 0x546e7a : 0xeceff1,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const walls = [
    { key: 'a', w: L, pos: [L / 2, H / 2, 0], rot: 0 },
    { key: 'b', w: W, pos: [L, H / 2, W / 2], rot: Math.PI / 2 },
    { key: 'c', w: L, pos: [L / 2, H / 2, W], rot: 0 },
    { key: 'd', w: W, pos: [0, H / 2, W / 2], rot: Math.PI / 2 },
  ];
  const wallGroup = new THREE.Group();
  const labelGroup = new THREE.Group();
  for (const wall of walls) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(wall.w, H), wallMat);
    m.position.set(...wall.pos);
    m.rotation.y = wall.rot;
    wallGroup.add(m);
    const s = labelSprite((wallLabels && wallLabels[wall.key]) || wall.key.toUpperCase(), '#1565C0');
    s.position.set(wall.pos[0], H + 0.25, wall.pos[2]);
    labelGroup.add(s);
  }
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(L, H, W)),
    new THREE.LineBasicMaterial({ color: dark ? 0x90a4ae : 0x607d8b }),
  );
  edges.position.set(L / 2, H / 2, W / 2);
  wallGroup.add(edges);
  g.add(wallGroup);
  g.add(labelGroup);
  layers.walls = wallGroup;
  layers.labels = labelGroup;
  return g;
}

/** Each cable is drawn as its conductors (L, N, PE) side by side, offset towards the room centre. */
function buildCables(room, segments, colors) {
  const group = new THREE.Group();
  const center = new THREE.Vector3(room.length / 2, room.height / 2, room.width / 2);
  for (const seg of segments) {
    const pts = seg.points.map(v);
    if (pts.length < 2) continue;
    const phaseColor = seg.purpose === 'lamp' || seg.purpose === 'switchDrop' ? colors.phase_alt : colors.phase;
    const conductors = [phaseColor, colors.neutral];
    if ((seg.cores || 3) >= 3) conductors.push(colors.pe);
    conductors.forEach((col, i) => {
      const off = pts.map((p) => {
        // On the ceiling offset downwards, on a wall offset towards the room centre.
        const onCeiling = p.y > room.height - 0.01;
        const d = onCeiling ? new THREE.Vector3(0, -1, 0) : new THREE.Vector3(center.x - p.x, 0, center.z - p.z);
        d.normalize().multiplyScalar(0.012 + i * 0.018);
        return p.clone().add(d);
      });
      const path = new THREE.CurvePath();
      for (let k = 1; k < off.length; k++) path.add(new THREE.LineCurve3(off[k - 1], off[k]));
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(path, Math.max(8, off.length * 6), 0.009, 6, false),
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.6 }),
      );
      tube.userData = { segment: seg.id };
      group.add(tube);
    });
  }
  layers.cables = group;
  return group;
}

function deviceMesh(d) {
  const g = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
  const ink = new THREE.MeshStandardMaterial({ color: 0x263238 });
  switch (d.type) {
    case 'socket': {
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.02), white));
      for (const dx of [-0.018, 0.018]) {
        const h = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.021, 10), ink);
        h.rotation.x = Math.PI / 2;
        h.position.set(dx, 0, 0.001);
        g.add(h);
      }
      break;
    }
    case 'switchSingle':
    case 'switchDouble':
    case 'switchPass': {
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.02), white));
      const keys = d.type === 'switchDouble' ? [-0.021, 0.021] : [0];
      for (const dx of keys) {
        const k = new THREE.Mesh(new THREE.BoxGeometry(keys.length > 1 ? 0.036 : 0.07, 0.07, 0.012), new THREE.MeshStandardMaterial({ color: d.type === 'switchPass' ? 0xbbdefb : 0xf5f5f5 }));
        k.position.set(dx, 0, 0.012);
        g.add(k);
      }
      break;
    }
    case 'lamp': {
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 20, 14),
        new THREE.MeshStandardMaterial({ color: 0xfff59d, emissive: 0xffeb3b, emissiveIntensity: 0.7 }),
      );
      g.add(bulb);
      break;
    }
    case 'junctionBox': {
      const box = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 20), new THREE.MeshStandardMaterial({ color: 0x9e9e9e }));
      box.rotation.x = Math.PI / 2;
      g.add(box);
      break;
    }
    default: {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.14, 16), new THREE.MeshStandardMaterial({ color: 0xff9800 }));
      g.add(cone);
    }
  }
  return g;
}

/** Orients a wall device so its face points into the room. */
function placeDevice(mesh, d, room) {
  const p = v(d.pos);
  mesh.position.copy(p);
  if (d.type === 'lamp' && !d.wall) {
    mesh.position.y -= 0.09;
    return;
  }
  const w = d.wall || 'a';
  const inset = 0.012;
  if (w === 'a') mesh.position.z += inset;
  if (w === 'c') {
    mesh.position.z -= inset;
    mesh.rotation.y = Math.PI;
  }
  if (w === 'b') {
    mesh.position.x -= inset;
    mesh.rotation.y = -Math.PI / 2;
  }
  if (w === 'd') {
    mesh.position.x += inset;
    mesh.rotation.y = Math.PI / 2;
  }
  void room;
}

function buildDevices(room, devices) {
  const group = new THREE.Group();
  for (const d of devices) {
    const m = deviceMesh(d);
    if (d.type !== 'lamp') m.scale.setScalar(1.6); // real size is too small to tap on a phone
    placeDevice(m, d, room);
    m.traverse((o) => (o.userData = { device: d.id }));
    group.add(m);
  }
  layers.devices = group;
  return group;
}

function resetView() {
  if (!current) return;
  const { length: L, width: W, height: H } = current.room;
  // Fit the room's bounding sphere into the view for both portrait and landscape screens.
  const r = 0.5 * Math.sqrt(L * L + W * W + H * H);
  const vfov = THREE.MathUtils.degToRad(camera.fov);
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
  const dist = (r / Math.sin(Math.min(vfov, hfov) / 2)) * 1.05;
  const dir = new THREE.Vector3(0.75, 0.85, 1.25).normalize();
  controls.target.set(L / 2, H * 0.45, W / 2);
  camera.position.copy(controls.target).addScaledVector(dir, dist);
  controls.minDistance = 0.5;
  controls.maxDistance = dist * 3;
  controls.update();
}

const raycaster = new THREE.Raycaster();
function onTap(ev) {
  if (!layers.devices) return;
  const rect = renderer.domElement.getBoundingClientRect();
  const ndc = new THREE.Vector2(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects([layers.devices, layers.cables].filter(Boolean), true);
  if (hits.length) post({ type: 'tap', ...hits[0].object.userData });
}

function load(input) {
  try {
    const data = typeof input === 'string' ? JSON.parse(input) : input;
    if (root) {
      scene.remove(root);
      root.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      });
    }
    if (typeof data.dark === 'boolean') {
      dark = data.dark;
      applyTheme();
    }
    current = data;
    const colors = { ...DEFAULT_COLORS, ...(data.colors || {}) };
    root = new THREE.Group();
    root.add(buildRoom(data.room, data.wall_labels));
    root.add(buildCables(data.room, data.segments || [], colors));
    root.add(buildDevices(data.room, data.devices || []));
    scene.add(root);
    resetView();
    post({ type: 'loaded', devices: (data.devices || []).length, segments: (data.segments || []).length });
  } catch (e) {
    post({ type: 'error', message: String(e && e.message ? e.message : e) });
  }
}

function setLayer(name, visible) {
  if (layers[name]) layers[name].visible = !!visible;
}

function setTheme(isDark) {
  dark = !!isDark;
  applyTheme();
  if (current) load({ ...current, dark });
}

window.ElektrUy = { load, resetView, setLayer, setTheme };
window.addEventListener('error', (e) => post({ type: 'error', message: String(e.message) }));
init();
