// VR rejimi: telefon VR ko‘zoynak (Shinecon turi) ichida — split-screen stereo, giroskop bilan qarash,
// ekran markazidagi nishon bilan tanlash. Mavjud 3D sahna (View3D) ustida ishlaydi: mantiq (Lab) o‘zgarmaydi.
//
// Boshqaruv:
//   qarash      — bosh (giroskop). Sensor yo‘q bo‘lsa — ekranni barmoq/sichqoncha bilan surish.
//   tanlash     — ekranga qisqa tegish (yoki ko‘zoynak tugmasi), pultda A (KeyE / KeyO).
//   markazlash  — ekranni uzoq bosib turish, pultda Menyu (KeyG / KeyM).
//   yurish      — pult joystick'i: W/S, I/K — oldinga/orqaga; A/D — yon qadam; J/L — yon qadam (giroskop yo‘q bo‘lsa burilish).
//   maslahat    — pultda C (KeyT / KeyH).   chiqish — «×» tugmasi yoki Esc.
// Tugma kodlari: docs/vr-pult-spec.md, 4-bo‘lim (KeyboardEvent.code).
import * as THREE from 'three';
import { t } from './i18n.js';
import { qurilmaKvaternioni, yonalishBurchagi, markazlashBurchagi, sensorMalumotimi } from './vr-matematika.js';

const IPD_KEY = 'energyvibe-vr-ipd';
const Y = new THREE.Vector3(0, 1, 0);
const KALIT = {
  oldinga: ['KeyW', 'KeyI'], orqaga: ['KeyS', 'KeyK'], chap: ['KeyA'], ong: ['KeyD'], chap2: ['KeyJ'], ong2: ['KeyL'],
  tanla: ['KeyE', 'KeyO'], maslahat: ['KeyT', 'KeyH'], markaz: ['KeyG', 'KeyM'],
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class VRRejim {
  constructor(v3d) {
    this.v = v3d;
    this.lab = v3d.lab;
    this.faol = false;
    this.stereo = new THREE.StereoCamera();
    this.fov = parseFloat(new URLSearchParams(location.search).get('vrfov')) || 80;
    let mm = 64;
    try { mm = parseFloat(localStorage.getItem(IPD_KEY)) || 64; } catch (e) { /* e’tiborsiz */ }
    this.ipdMm = Math.min(75, Math.max(55, mm));
    this.bosilgan = new Set();
    this._q = new THREE.Quaternion();
    this._yq = new THREE.Quaternion();
    this._v = new THREE.Vector3();
    this._v2 = new THREE.Vector2();
    this.qur();
    v3d.vr = this;
  }

  // ---------- DOM ----------
  qur() {
    const ota = this.v.root.querySelector('.v3d');
    this.kirish = document.createElement('div');
    this.kirish.className = 'vr-kirish';
    this.kirish.hidden = true;
    ota.appendChild(this.kirish);
    this.qatlam = document.createElement('div');
    this.qatlam.className = 'vr-qatlam';
    this.qatlam.hidden = true;
    this.qatlam.innerHTML = `
      <div class="vr-orta"></div>
      <i class="vr-nishon chap"></i><i class="vr-nishon ong"></i>
      <p class="vr-xabar chap"></p><p class="vr-xabar ong"></p>
      <button type="button" class="vr-chiq" aria-label="×">×</button>`;
    ota.appendChild(this.qatlam);
    this.nishonlar = this.qatlam.querySelectorAll('.vr-nishon');
    this.xabarlar = this.qatlam.querySelectorAll('.vr-xabar');
    this.qatlam.querySelector('.vr-chiq').addEventListener('click', (e) => { e.stopPropagation(); this.chiq(); });
    this.matnlar();
    this.ochir = this.lab.on((tur, d) => { if (tur === 'xabar' && this.faol) this.xabar(d.matn); });
    this.qatlamHodisalari();
  }

  matnlar() {
    this.kirish.innerHTML = `
      <div class="vr-karta">
        <span class="eyebrow acc">// VR</span>
        <h3>${esc(t('vr.sarlavha'))}</h3>
        <button type="button" class="btn yashil vr-kir">${esc(t('vr.kirish'))}</button>
        <p>${esc(t('vr.matn'))}</p>
        <ul>
          <li>${esc(t('vr.q1'))}</li><li>${esc(t('vr.q2'))}</li><li>${esc(t('vr.q3'))}</li><li>${esc(t('vr.q4'))}</li>
        </ul>
        <label class="vr-ipd">${esc(t('vr.ipd'))}: <b>${this.ipdMm}</b> mm
          <input type="range" min="55" max="75" step="1" value="${this.ipdMm}">
        </label>
      </div>`;
    const inp = this.kirish.querySelector('input');
    inp.addEventListener('input', () => {
      this.ipdMm = +inp.value;
      this.kirish.querySelector('.vr-ipd b').textContent = String(this.ipdMm);
      try { localStorage.setItem(IPD_KEY, String(this.ipdMm)); } catch (e) { /* e’tiborsiz */ }
    });
    this.kirish.querySelector('.vr-kir').addEventListener('click', () => this.kir());
  }

  /** VR rejimi tanlanganda kirish oynasini ko‘rsatish (hali stereo emas). */
  korsat(on) {
    if (!on && this.faol) this.chiq();
    this.kirish.hidden = !on || this.faol;
  }

  xabar(matn) {
    this.xabarlar.forEach((x) => { x.textContent = matn; });
    clearTimeout(this._xt);
    this._xt = setTimeout(() => this.xabarlar.forEach((x) => { x.textContent = ''; }), 3500);
  }

  // ---------- kirish / chiqish ----------
  async kir() {
    // 1) iPhone: harakat sensoriga ruxsat — faqat tugma bosilganda va birinchi bo‘lib so‘raladi
    let ruxsat = true;
    const DOE = window.DeviceOrientationEvent;
    if (DOE && typeof DOE.requestPermission === 'function') {
      try { ruxsat = (await DOE.requestPermission()) === 'granted'; } catch (e) { ruxsat = false; }
    }
    // 2) Sahna to‘liq ekranga, landshaftga qulflash, ekran o‘chmasin (har biri ishlamasa ham davom etamiz)
    document.body.classList.add('vr-faol');
    this.fsHaqiqiy = false;
    try {
      const el = document.documentElement;
      const req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (req && !(document.fullscreenElement || document.webkitFullscreenElement)) { await req.call(el); this.fsHaqiqiy = true; }
    } catch (e) { /* iPhone: to‘liq ekransiz ishlaymiz */ }
    try { await screen.orientation?.lock?.('landscape'); } catch (e) { /* qo‘llab-quvvatlanmasa — e’tiborsiz */ }
    try { this.wake = await navigator.wakeLock?.request('screen'); } catch (e) { this.wake = null; }

    const cam = this.v.camera;
    this.eskiFov = cam.fov;
    cam.fov = this.fov;
    this.boshYaw = yonalishBurchagi(THREE, cam.quaternion);
    const eu = new THREE.Euler().setFromQuaternion(cam.quaternion, 'YXZ');
    this.yaw = eu.y; this.pitch = eu.x; // sensor yo‘q bo‘lsa — surish bilan qarash shu nuqtadan boshlanadi
    this.markazlashKerak = true;
    this.sensor = ruxsat ? 'kutilmoqda' : 'yoq';
    this.oxirgi = null;
    this.v.controls.enabled = false;
    this.v.tween = null;
    this.faol = true;
    this.kirish.hidden = true;
    this.qatlam.hidden = false;

    this._ori = (e) => { if (sensorMalumotimi(e)) { this.oxirgi = { a: e.alpha, b: e.beta, g: e.gamma }; this.sensor = 'bor'; } };
    window.addEventListener('deviceorientation', this._ori);
    clearTimeout(this._st);
    this._st = setTimeout(() => {
      if (this.faol && this.sensor !== 'bor') { this.sensor = 'yoq'; this.xabar(t(ruxsat ? 'vr.sensor_yoq' : 'vr.ruxsat_yoq')); }
    }, 1200);
    this._kd = (e) => this.tugma(e, true);
    this._ku = (e) => this.tugma(e, false);
    document.addEventListener('keydown', this._kd);
    document.addEventListener('keyup', this._ku);
    this._fs = () => { if (this.faol && this.fsHaqiqiy && !(document.fullscreenElement || document.webkitFullscreenElement)) this.chiq(); };
    document.addEventListener('fullscreenchange', this._fs);
    document.addEventListener('webkitfullscreenchange', this._fs);
    this.v.olcham();
    this.xabar(t('vr.boshlandi'));
  }

  chiq() {
    if (!this.faol) return;
    this.faol = false;
    window.removeEventListener('deviceorientation', this._ori);
    document.removeEventListener('keydown', this._kd);
    document.removeEventListener('keyup', this._ku);
    document.removeEventListener('fullscreenchange', this._fs);
    document.removeEventListener('webkitfullscreenchange', this._fs);
    clearTimeout(this._st);
    this.bosilgan.clear();
    try { screen.orientation?.unlock?.(); } catch (e) { /* e’tiborsiz */ }
    try { this.wake?.release?.(); } catch (e) { /* e’tiborsiz */ }
    if (this.fsHaqiqiy && (document.fullscreenElement || document.webkitFullscreenElement)) {
      try { (document.exitFullscreen || document.webkitExitFullscreen).call(document)?.catch?.(() => {}); } catch (e) { /* e’tiborsiz */ }
    }
    document.body.classList.remove('vr-faol');
    const cam = this.v.camera;
    cam.fov = this.eskiFov || 48;
    // OrbitControls kamera qarab turgan nuqtadan davom etsin (sakrab ketmasin)
    this.v.controls.target.copy(cam.position).add(this._v.set(0, 0, -1).applyQuaternion(cam.quaternion).multiplyScalar(0.6));
    this.v.controls.enabled = true;
    this.v.hover = null;
    this.v.holatYangila();
    this.qatlam.hidden = true;
    this.kirish.hidden = false;
    this.v.olcham();
  }

  // ---------- kiritish ----------
  tugma(e, bosildi) {
    const k = e.code;
    const bor = Object.values(KALIT).some((x) => x.includes(k));
    if (k === 'Escape' && bosildi) { this.chiq(); return; }
    if (!bor) return;
    e.preventDefault();
    e.stopPropagation();
    if (bosildi) {
      if (this.bosilgan.has(k)) return; // avtomatik takrorlash
      this.bosilgan.add(k);
      if (KALIT.tanla.includes(k)) this.tanla();
      else if (KALIT.maslahat.includes(k)) this.xabar(this.lab.maslahat().matn);
      else if (KALIT.markaz.includes(k)) this.markazla();
    } else this.bosilgan.delete(k);
  }

  qatlamHodisalari() {
    let bosh = null;
    this.qatlam.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.vr-chiq')) return; // «×» — o‘z bosilishi bilan ishlaydi, qatlam ushlab olmasin
      bosh = { x: e.clientX, y: e.clientY, t: performance.now(), yaw: this.yaw, pitch: this.pitch };
      this.qatlam.setPointerCapture?.(e.pointerId);
    });
    this.qatlam.addEventListener('pointermove', (e) => {
      if (!bosh || this.sensor === 'bor') return;
      // Sensor yo‘q: surish bilan qarash
      const k = 0.005;
      this.yaw = bosh.yaw + (e.clientX - bosh.x) * k;
      this.pitch = Math.max(-1.45, Math.min(1.45, bosh.pitch + (e.clientY - bosh.y) * k));
    });
    const tugat = (e) => {
      if (!bosh) return;
      const siljish = Math.hypot(e.clientX - bosh.x, e.clientY - bosh.y), vaqt = performance.now() - bosh.t;
      bosh = null;
      if (siljish > 10) return;
      if (vaqt > 700) this.markazla();
      else this.tanla();
    };
    this.qatlam.addEventListener('pointerup', tugat);
    this.qatlam.addEventListener('pointercancel', () => { bosh = null; });
  }

  tanla() { this.v.markazniBos(); }

  markazla() {
    if (this.sensor === 'bor') { this.markazlashKerak = true; }
    else { this.yaw = this.boshYaw; this.pitch = 0; }
    this.xabar(t('vr.markazlandi'));
  }

  // ---------- har kadr ----------
  yangila(dt) {
    const cam = this.v.camera;
    if (this.sensor === 'bor' && this.oxirgi) {
      const orient = screen.orientation?.angle ?? window.orientation ?? 0;
      qurilmaKvaternioni(THREE, this.oxirgi.a, this.oxirgi.b, this.oxirgi.g, orient, this._q);
      if (this.markazlashKerak) { this.yawOff = markazlashBurchagi(THREE, this._q, this.boshYaw); this.markazlashKerak = false; }
      this._yq.setFromAxisAngle(Y, this.yawOff || 0);
      cam.quaternion.copy(this._yq).multiply(this._q);
    } else {
      cam.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
    }
    // Yurish (pult joystick'i — klaviatura rejimi)
    const b = this.bosilgan;
    const has = (nom) => KALIT[nom].some((k) => b.has(k));
    let old = 0, yon = 0;
    if (has('oldinga')) old += 1;
    if (has('orqaga')) old -= 1;
    if (has('chap')) yon -= 1;
    if (has('ong')) yon += 1;
    if (has('chap2') || has('ong2')) {
      const s = has('chap2') ? -1 : 1;
      if (this.sensor === 'bor') yon += s;
      else this.yaw -= s * 1.6 * dt; // giroskopsiz — burilish
    }
    if (old || yon) {
      const yaw = yonalishBurchagi(THREE, cam.quaternion);
      const tez = 1.1 * dt;
      cam.position.x += (-Math.sin(yaw) * old + Math.cos(yaw) * yon) * tez;
      cam.position.z += (-Math.cos(yaw) * old - Math.sin(yaw) * yon) * tez;
      this.v.chegarala();
    }
    // Nishon ostidagi klemmani yoritish (har ~100 ms)
    this._ht = (this._ht || 0) + dt;
    if (this._ht > 0.1) {
      this._ht = 0;
      const u = this.v.tanlaNdc(0, 0);
      const yangi = u && u.tur === 'kl' ? u.full : null;
      this.nishonlar.forEach((n) => n.classList.toggle('faol', !!u));
      if (yangi !== this.v.hover) { this.v.hover = yangi; this.v.holatYangila(); }
    }
  }

  chiz() {
    const r = this.v.renderer, cam = this.v.camera, sah = this.v.scene;
    cam.updateMatrixWorld();
    this.stereo.eyeSep = this.ipdMm / 1000;
    this.stereo.update(cam);
    const s = r.getSize(this._v2);
    const w = Math.floor(s.x / 2), h = s.y;
    r.setScissorTest(true);
    r.setScissor(0, 0, w, h); r.setViewport(0, 0, w, h);
    r.render(sah, this.stereo.cameraL);
    r.setScissor(w, 0, s.x - w, h); r.setViewport(w, 0, s.x - w, h);
    r.render(sah, this.stereo.cameraR);
    r.setScissorTest(false);
    r.setViewport(0, 0, s.x, s.y);
  }

  yoqot() {
    this.chiq();
    this.ochir?.();
    this.kirish.remove();
    this.qatlam.remove();
    this.v.vr = null;
  }
}
