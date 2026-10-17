"use client";

// 3D transformator (Three.js): past poligonli model — bak, radiatorlar, ventilyatorlar, kiritmalar,
// kengaytirgich, gaz relesi, havo quritgich. Qismni bosganda nomi va izohi chiqadi. Bo'lak kechiktirib yuklanadi.

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { INSPECTION_SPOTS } from "../data/minigames";
import { uz } from "../i18n/uz";
import { useSettings } from "../store/settings";

type PartId = (typeof INSPECTION_SPOTS)[number]["id"] | "tank";

export default function Transformer3D() {
  const host = useRef<HTMLDivElement>(null);
  const [part, setPart] = useState<PartId | null>(null);
  const [failed, setFailed] = useState(false);
  const animations = useSettings((s) => s.animations);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      // WebGL yo'q (eski brauzer yoki o'chirilgan) — matnli izoh ko'rsatiladi
      queueMicrotask(() => setFailed(true));
      return;
    }
    const reduce = !animations || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(7, 5, 8);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.8, 0);
    controls.enableDamping = true;
    controls.autoRotate = !reduce;
    controls.autoRotateSpeed = 0.8;
    controls.minDistance = 5;
    controls.maxDistance = 18;

    scene.add(new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(5, 8, 4);
    scene.add(sun);

    const mat = (color: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.3, ...extra });
    const steel = mat(0x6b7f95);
    const dark = mat(0x334155);
    const porcelain = mat(0xe7e5e4, { roughness: 0.3, metalness: 0 });
    const pickable: THREE.Object3D[] = [];
    const add = (geo: THREE.BufferGeometry, m: THREE.Material, pos: [number, number, number], id: PartId, rot?: [number, number, number]) => {
      const mesh = new THREE.Mesh(geo, m);
      mesh.position.set(...pos);
      if (rot) mesh.rotation.set(...rot);
      mesh.userData.part = id;
      scene.add(mesh);
      pickable.push(mesh);
      return mesh;
    };

    // asos va moy qabul qilgich
    add(new THREE.BoxGeometry(6, 0.2, 4.4), mat(0x57534e, { metalness: 0 }), [0, 0.1, 0], "pit");
    // bak
    add(new THREE.BoxGeometry(3.2, 2.4, 1.8), steel, [0, 1.6, 0], "tank");
    add(new THREE.BoxGeometry(3.4, 0.12, 2), dark, [0, 2.86, 0], "tank");
    // radiatorlar (old va orqa)
    for (const z of [-1.35, 1.35]) {
      for (let i = 0; i < 9; i++) add(new THREE.BoxGeometry(0.06, 1.9, 0.6), steel, [-1.2 + i * 0.3, 1.65, z], "radiators");
      add(new THREE.CylinderGeometry(0.06, 0.06, 2.8), dark, [0, 2.65, z], "radiators", [0, 0, Math.PI / 2]);
      add(new THREE.CylinderGeometry(0.06, 0.06, 2.8), dark, [0, 0.65, z], "radiators", [0, 0, Math.PI / 2]);
    }
    // ventilyatorlar (radiatorlar ostida)
    const fans: THREE.Mesh[] = [];
    for (const z of [-1.35, 1.35]) {
      for (const x of [-0.7, 0.7]) {
        add(new THREE.CylinderGeometry(0.32, 0.32, 0.08, 20), dark, [x, 0.35, z], "fans", [Math.PI / 2, 0, 0]);
        const blade = add(new THREE.BoxGeometry(0.56, 0.08, 0.02), mat(0xcbd5e1), [x, 0.35, z + (z > 0 ? 0.06 : -0.06)], "fans");
        fans.push(blade);
      }
    }
    // kiritmalar: YuK (baland) va PK (past)
    const bushing = (x: number, z: number, h: number, id: PartId) => {
      add(new THREE.CylinderGeometry(0.11, 0.14, h, 12), porcelain, [x, 2.92 + h / 2, z], id);
      for (let k = 0; k < Math.round(h / 0.18); k++) add(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 14), porcelain, [x, 3.0 + k * 0.18, z], id);
      add(new THREE.SphereGeometry(0.08, 10, 8), mat(0xb45309), [x, 2.95 + h, z], id);
    };
    for (const x of [-1, 0, 1]) bushing(x, -0.4, 1.6, "bushings");
    for (const x of [-0.6, 0, 0.6]) bushing(x, 0.55, 0.7, "bushings");
    // kengaytirgich, quvur, gaz relesi, moy ko'rsatkichi, havo quritgich
    add(new THREE.CylinderGeometry(0.4, 0.4, 2.2, 20), steel, [0.3, 4.6, 0.7], "gauge", [0, 0, Math.PI / 2]);
    add(new THREE.CylinderGeometry(0.06, 0.06, 1.2), dark, [1.0, 3.6, 0.7], "gasRelay");
    add(new THREE.BoxGeometry(0.3, 0.26, 0.26), mat(0x1e293b), [1.0, 3.75, 0.7], "gasRelay");
    add(new THREE.CylinderGeometry(0.18, 0.18, 0.04, 20), mat(0xf8fafc, { metalness: 0 }), [1.42, 4.6, 0.7], "gauge", [0, 0, Math.PI / 2]);
    add(new THREE.CylinderGeometry(0.12, 0.12, 0.45, 12), mat(0x60a5fa, { metalness: 0 }), [-0.6, 4.0, 0.7], "breather");
    // yerlash shinasi
    add(new THREE.BoxGeometry(0.06, 0.6, 0.04), mat(0xfacc15), [-1.65, 0.5, 0.6], "ground");

    // tanlash (bosish)
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let down = { x: 0, y: 0 };
    const onDown = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY });
    const onUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return; // aylantirish, bosish emas
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(pickable)[0];
      setPart((hit?.object.userData.part as PartId) ?? null);
      controls.autoRotate = false;
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);

    const resize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    let raf = 0;
    const loop = () => {
      if (!reduce) for (const f of fans) f.rotation.z += 0.25;
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (o.material as THREE.Material).dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [animations]);

  const info = part === "tank" ? { label: uz.view3d.tank, ok: uz.view3d.tankText } : INSPECTION_SPOTS.find((s) => s.id === part);
  return (
    <div>
      {failed ? (
        <p className="rounded-xl border border-warn/50 bg-warn/10 p-4 text-sm text-warn">{uz.view3d.noWebgl}</p>
      ) : (
        <div ref={host} className="h-[55dvh] min-h-[280px] w-full touch-none overflow-hidden rounded-xl bg-gradient-to-b from-ink-800 to-ink-950" aria-label={uz.view3d.title} role="img" />
      )}
      <p className="mt-2 text-xs text-muted">{uz.view3d.hint}</p>
      {info && (
        <div className="mt-2 rounded-xl border border-accent/50 bg-accent/5 p-3 text-sm" aria-live="polite">
          <p className="font-bold">{info.label}</p>
          <p className="mt-1 text-muted">{info.ok}</p>
        </div>
      )}
    </div>
  );
}
