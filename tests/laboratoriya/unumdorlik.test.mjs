// 3D unumdorlik yordamchilari: sifat darajasi va statik mesh birlashtirish (DOM/WebGL'siz).
// Ishga tushirish: node --test tests/laboratoriya/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../../laboratoriya/vendor/three/three.module.min.js';
import { sifatAniqla, SIFAT } from '../../laboratoriya/engine/sifat.js';
import { statikBirlashtir } from '../../laboratoriya/engine/birlash.js';

// ---------- sifat darajasi ----------
test('sifat: ?quality bo‘yicha daraja tanlanadi, noma’lum qiymat — qurilmaga ko‘ra standart (kompyuter: yuqori)', () => {
  assert.equal(sifatAniqla('?quality=past').nom, 'past');
  assert.equal(sifatAniqla('?quality=orta').nom, 'orta');
  assert.equal(sifatAniqla('?quality=yuqori').nom, 'yuqori');
  assert.equal(sifatAniqla('?quality=low').nom, 'past'); // taxallus
  assert.equal(sifatAniqla('').nom, 'yuqori'); // matchMedia yo‘q — kompyuter deb olinadi
  assert.equal(sifatAniqla('?quality=xyz').nom, 'yuqori');
});

test('sifat: yuqori daraja avvalgi (o‘zgarmagan) sozlamalar bilan mos', () => {
  const y = SIFAT.yuqori;
  assert.equal(y.soya, true);
  assert.equal(y.soyaXarita, null); // eski qoida: window.innerWidth ga qarab 1024/2048
  assert.equal(y.soyaStatik, false);
  assert.equal(y.lampaSoya, true);
  assert.equal(y.birlash, false);
});

test('sifat: past darajada dinamik soya ham, lampa kub soyasi ham yo‘q', () => {
  const p = sifatAniqla('?quality=past');
  assert.equal(p.soya, false);
  assert.equal(p.lampaSoya, false);
  assert.equal(p.glow, true);
  assert.equal(p.birlash, true);
});

test('sifat: pr, aa, merge, debug parametrlari', () => {
  const s = sifatAniqla('?quality=past&pr=1&aa=0&merge=0&debug=1');
  assert.equal(s.pr, 1);
  assert.equal(s.aa, false);
  assert.equal(s.birlash, false);
  assert.equal(s.debug, true);
  assert.equal(sifatAniqla('?pr=9').pr, SIFAT.yuqori.pr); // chegaradan tashqari — e’tiborsiz
  assert.equal(sifatAniqla('').aa, true);
  assert.equal(sifatAniqla('').debug, false);
});

// ---------- statik birlashtirish ----------
const mat = () => new THREE.MeshStandardMaterial({ color: 0x888888 });
function quti(material, x, extra = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
  m.position.set(x, 0, 0);
  Object.assign(m, extra);
  return m;
}
function sahna(...meshlar) {
  const s = new THREE.Scene();
  s.add(...meshlar);
  s.updateMatrixWorld(true);
  return s;
}
const meshlar = (s) => { const r = []; s.traverse((o) => { if (o.isMesh) r.push(o); }); return r; };
const uchburchak = (m) => (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3;

test('birlashtirish: bir xil materialli mesh‘lar bitta mesh‘ga yig‘iladi, uchburchak soni saqlanadi', () => {
  const m = mat();
  const s = sahna(quti(m, 0), quti(m, 2), quti(m, 4));
  const oldin = meshlar(s).reduce((a, o) => a + uchburchak(o), 0);
  const r = statikBirlashtir(THREE, meshlar(s), s);
  const keyin = meshlar(s);
  assert.equal(keyin.length, 1);
  assert.equal(r.oldin, 3);
  assert.equal(r.keyin, 1);
  assert.equal(uchburchak(keyin[0]), oldin);
  assert.equal(keyin[0].material, m); // material umumiy qoladi (emissive va h.k. o‘zgarsa — hammasiga ta’sir qiladi)
});

test('birlashtirish: tepaliklar jahon koordinatasiga o‘tkaziladi', () => {
  const m = mat();
  const s = sahna(quti(m, 10), quti(m, 20));
  statikBirlashtir(THREE, meshlar(s), s);
  const g = meshlar(s)[0].geometry;
  g.computeBoundingBox();
  assert.ok(Math.abs(g.boundingBox.min.x - 9.5) < 1e-5);
  assert.ok(Math.abs(g.boundingBox.max.x - 20.5) < 1e-5);
});

test('birlashtirish: material yoki soya bayrog‘i boshqa bo‘lsa alohida guruh', () => {
  const a = mat(), b = mat();
  const s = sahna(quti(a, 0), quti(a, 2), quti(b, 4), quti(b, 6, { castShadow: true }));
  statikBirlashtir(THREE, meshlar(s), s);
  // a: 1 ta (2 tasi birlashgan); b: castShadow farqli — ikkisi yolg‘iz qoladi
  assert.equal(meshlar(s).length, 3);
});

test('birlashtirish: shaffof, userData.tur li, boshqa qatlamdagi, istisno va yolg‘iz mesh‘lar tegilmaydi', () => {
  const m = mat();
  const shaffof = new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.5 });
  const hit = quti(m, 4); hit.userData.tur = 'kl';
  const qatlam = quti(m, 6); qatlam.layers.set(1);
  const istisno = quti(m, 8);
  const s = sahna(quti(shaffof, 0), quti(shaffof, 2), hit, qatlam, istisno, quti(m, 10), quti(m, 12));
  const r = statikBirlashtir(THREE, meshlar(s), s, new Set([istisno]));
  const qolgan = meshlar(s);
  // shaffof 2 + hit + qatlam + istisno saqlanadi; oddiy 2 ta birlashadi → 1; jami 6
  assert.equal(qolgan.length, 6);
  assert.equal(r.keyin, 1);
  assert.ok(qolgan.includes(hit) && qolgan.includes(qatlam) && qolgan.includes(istisno));
});

test('birlashtirish: ko‘zguli (manfiy masshtab) mesh uchburchak yo‘nalishi to‘g‘ri qoladi', () => {
  const m = mat();
  const oddiy = quti(m, 0);
  const kozgu = quti(m, 3); kozgu.scale.x = -1;
  const s = sahna(oddiy, kozgu);
  statikBirlashtir(THREE, meshlar(s), s);
  const g = meshlar(s)[0].geometry;
  const P = g.attributes.position, N = g.attributes.normal;
  // har uchburchakning geometrik normali (tepalik tartibidan) berilgan normal bilan bir tomonga qaragan bo‘lishi kerak
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  let notogri = 0;
  for (let i = 0; i < P.count; i += 3) {
    a.fromBufferAttribute(P, i); b.fromBufferAttribute(P, i + 1); c.fromBufferAttribute(P, i + 2);
    const geo = b.sub(a).cross(c.sub(a)).normalize();
    n.fromBufferAttribute(N, i);
    if (geo.dot(n) < 0.9) notogri++;
  }
  assert.equal(notogri, 0);
});

test('birlashtirish: soya bayroqlari birlashgan mesh‘ga o‘tadi', () => {
  const m = mat();
  const s = sahna(quti(m, 0, { castShadow: true, receiveShadow: true }), quti(m, 2, { castShadow: true, receiveShadow: true }));
  statikBirlashtir(THREE, meshlar(s), s);
  const r = meshlar(s)[0];
  assert.equal(r.castShadow, true);
  assert.equal(r.receiveShadow, true);
});
