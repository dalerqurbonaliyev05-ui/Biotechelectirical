// VR matematikasi: giroskop → kamera yo‘nalishi, markazlash, sensor aniqlash.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../../laboratoriya/vendor/three/three.module.min.js';
import { qurilmaKvaternioni, yonalishBurchagi, markazlashBurchagi, sensorMalumotimi } from '../../laboratoriya/engine/vr-matematika.js';
import { sifatAniqla } from '../../laboratoriya/engine/sifat.js';

const oldinga = (q) => new THREE.Vector3(0, 0, -1).applyQuaternion(q);
const yaqin = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

test('VR: telefon tik (portret, beta=90) — kamera gorizontga, −Z ga qaraydi', () => {
  const f = oldinga(qurilmaKvaternioni(THREE, 0, 90, 0, 0));
  assert.ok(yaqin(f.x, 0) && yaqin(f.y, 0) && yaqin(f.z, -1), JSON.stringify(f));
});

test('VR: telefon landshaftda (ekran 90° burilgan, gamma=−90) — kamera gorizontga qaraydi', () => {
  const f = oldinga(qurilmaKvaternioni(THREE, 0, 0, -90, 90));
  assert.ok(yaqin(f.y, 0), `y=${f.y}`);
  assert.ok(yaqin(Math.hypot(f.x, f.z), 1));
});

test('VR: telefon stolda chalqancha (beta=0, portret) — kamera pastga qaraydi', () => {
  const f = oldinga(qurilmaKvaternioni(THREE, 0, 0, 0, 0));
  assert.ok(yaqin(f.y, -1), JSON.stringify(f));
});

test('VR: alpha (kompas) o‘zgarsa, kamera gorizontal buriladi', () => {
  const a = yonalishBurchagi(THREE, qurilmaKvaternioni(THREE, 0, 90, 0, 0));
  const b = yonalishBurchagi(THREE, qurilmaKvaternioni(THREE, 30, 90, 0, 0));
  assert.ok(yaqin(Math.abs(b - a), THREE.MathUtils.degToRad(30)));
});

test('VR: markazlash — qurilma qayerga qaramasin, natija maqsad burchakka qaraydi', () => {
  const q = qurilmaKvaternioni(THREE, 137, 80, 5, 0);
  const maqsad = 0.7;
  const off = markazlashBurchagi(THREE, q, maqsad);
  const natija = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), off).multiply(q);
  const farq = Math.atan2(Math.sin(yonalishBurchagi(THREE, natija) - maqsad), Math.cos(yonalishBurchagi(THREE, natija) - maqsad));
  assert.ok(Math.abs(farq) < 1e-6, `farq=${farq}`);
});

test('VR: sensor aniqlash — null qiymatlar sensor yo‘q degani', () => {
  assert.equal(sensorMalumotimi({ alpha: null, beta: null, gamma: null }), false);
  assert.equal(sensorMalumotimi(null), false);
  assert.equal(sensorMalumotimi({ alpha: 10, beta: 80, gamma: 0 }), true);
  assert.equal(sensorMalumotimi({ alpha: null, beta: 0, gamma: null }), true);
});

test('VR: ?rejim=vr bo‘lsa standart sifat — past (qo‘lda berilsa — o‘sha)', () => {
  assert.equal(sifatAniqla('?rejim=vr').nom, 'past');
  assert.equal(sifatAniqla('?rejim=vr&quality=orta').nom, 'orta');
  assert.equal(sifatAniqla('?rejim=3d').nom, 'yuqori');
});
