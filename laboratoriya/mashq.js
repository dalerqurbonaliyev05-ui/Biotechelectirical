// Mashq sahifasi: /laboratoriya/<sxema-id>. Har qanday sxema JSON'i shu umumiy ish maydonida ishlaydi.
import { sahifaBoshlash } from './engine/sahifa.js';
import { t, tx, tilniKuzat } from './engine/i18n.js';
import { Lab, JARIMA } from './engine/state.js';
import { View2D } from './engine/view2d.js';
import { RANGLAR } from './engine/ranglar.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const REJIM_KEY = 'energyvibe-lab-rejim';

function sxemaId() {
  const q = new URLSearchParams(location.search).get('id');
  if (q) return q;
  const qism = location.pathname.replace(/\/+$/, '').split('/');
  return qism[qism.length - 1];
}

const vaqtMatn = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const darajaHtml = (n) => `<span class="daraja" title="${esc(t('karta.daraja', { n }))}" aria-label="${esc(t('karta.daraja', { n }))}">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;

let lab, v2d, v3d = null, v3dYuklanmoqda = null, rejim = '2d';
let oxirgiTekshiruv = null;

function holatXabari(matn, daraja = 'info') {
  $('holat').textContent = matn;
  $('m-bar').dataset.daraja = daraja;
}

function parametr(p) {
  const res = {};
  for (const [k, v] of Object.entries(p || {})) {
    if (v && typeof v === 'object') {
      if (v.k) res[k] = lab.klemmaNomi(v.k);
      else if (v.kl) res[k] = v.kl.map((x) => lab.klemmaNomi(x)).join(', ');
      else if (v.sl) res[k] = v.sl.map((x) => lab.simNomi(x)).join('; ');
      else if (v.tx) res[k] = tx(v.tx);
      else if (v.st) res[k] = t(`st.${v.st}`);
      else if (v.stl) res[k] = v.stl.length ? v.stl.map((x) => t(`st.${x}`)).join(', ') : '—';
    } else res[k] = v;
  }
  return res;
}

function panelniOch(och = true) {
  $('side').classList.toggle('open', och);
  $('ws').classList.toggle('yon-ochiq', och);
  $('b-topshiriq').setAttribute('aria-pressed', String(och));
  // Keng ekranda panel kanvasni toraytiradi — sxemani qayta sig‘diramiz
  if (v2d && window.innerWidth > 1100) requestAnimationFrame(() => v2d.sigdir());
}

function natijalarniChiz() {
  const r = oxirgiTekshiruv;
  $('p-natija').hidden = !r;
  if (!r) return;
  if (r.togri) { $('natijalar').innerHTML = `<li class="xabar ok">${esc(t('chk.togri'))}</li>`; return; }
  $('natijalar').innerHTML = r.xatolar.map((x) => {
    const sub = x.joy ? t(x.joy.kalit, parametr(x.joy.p)) : x.qoshimcha ? t(x.qoshimcha) : '';
    return `<li class="xabar ${x.daraja}">${esc(t(x.kalit, parametr(x.p)))}${sub ? `<small>${esc(sub)}</small>` : ''}</li>`;
  }).join('') + (r.xatolar[0]?.tur !== 'bosh' && !lab.ball.tugadi ? `<li class="xabar ogoh"><small>${esc(t('chk.minus'))}</small></li>` : '');
}

function panelniYangila() {
  $('st-ball').textContent = lab.ballHisob();
  $('st-xato').textContent = lab.ball.xato;
  const q = lab.quvvatBormi();
  const b = $('b-quvvat');
  b.setAttribute('aria-pressed', String(q));
  b.innerHTML = `${q ? '■' : '▶'} <span data-i18n="${q ? 'btn.sim_off' : 'btn.sim_on'}">${esc(t(q ? 'btn.sim_off' : 'btn.sim_on'))}</span>`;
  $('ranglar').querySelectorAll('[data-rang]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.rang === lab.rang)));
  $('tb-del').disabled = !lab.tanlanganSim;
  $('tb-undo').disabled = !lab.tarix.orqa.length;
  $('tb-redo').disabled = !lab.tarix.oldinga.length;
  const ON = ['yonadi', 'ishlaydi', 'tortilgan', 'yoqilgan', 'ochiq', 'kuchlanish_bor', 'tok_bor', 'bosilgan', 'karta_bor', 'suv_yuqori'];
  $('el-holat').innerHTML = lab.els.map((e) => {
    let hol = lab.sim.natija[e.id]?.holatlar;
    if (!hol && 'yoqilgan' in (lab.holat[e.id] || {})) hol = [lab.holat[e.id].yoqilgan ? 'yoqilgan' : 'ochgan'];
    if (!hol?.length) return '';
    const on = ON.includes(hol[0]);
    const xato = hol.includes('kuydi') || hol.includes('faza_yetishmaydi') || hol.includes('ishladi');
    const qoldi = lab.sim.natija[e.id]?.kutmoqda ? ` ${lab.sim.natija[e.id].qoldi.toFixed(1)} s` : '';
    return `<li class="${on ? 'on' : ''}${xato ? ' xato' : ''}${hol[0] === 'yonadi' ? ' yonadi' : ''}"><span>${esc(e.id)} · ${esc(tx(e.def.nomi))}</span><span>${esc(hol.map((x) => t(`st.${x}`)).join(', '))}${qoldi}</span></li>`;
  }).join('');
  const list = lab.maslahatlarRoyxati();
  $('p-maslahat').hidden = !list.length;
  $('maslahatlar').innerHTML = list.map((m) => `<li>${esc(m)}</li>`).join('');
}

function matnlarniYangila() {
  const s = lab.sxema;
  $('m-nomi').textContent = tx(s.nomi);
  $('m-sarlavha').textContent = tx(s.nomi);
  document.title = `${tx(s.nomi)} | EnergyVibe`;
  $('m-topshiriq').textContent = tx(s.topshiriq);
  $('m-meta').innerHTML = `<span class="tag acc">${esc(t(`yon.${s.yonalish}`))}</span>${darajaHtml(s.daraja)}<span class="tag">${esc(t('karta.vaqt', { n: s.vaqt_min }))}</span>`;
  $('ranglar').innerHTML = `<span class="bb-lbl">${esc(t('bar.rang'))}</span>` + Object.entries(RANGLAR).map(([id, r]) => {
    const fon = r.hex2 ? `repeating-linear-gradient(135deg, ${r.hex} 0 4px, ${r.hex2} 4px 8px)` : r.hex;
    return `<button type="button" class="rang-btn" data-rang="${id}" aria-pressed="${lab.rang === id}"><i style="background:${fon}"></i>${esc(tx(r.nomi))}</button>`;
  }).join('');
  $('el-chips').innerHTML = `<span class="bb-lbl">${esc(t('bar.el'))}</span>` + lab.els.map((e) => `<button type="button" class="el-chip" data-fokus="${e.id}">${esc(e.id)}<small>${esc(tx(e.def.nomi))}</small></button>`).join('');
  panelniYangila();
  natijalarniChiz();
}

function sora(matn) {
  const d = $('dlg-tasdiq');
  $('tasdiq-matn').textContent = matn;
  return new Promise((res) => {
    d.addEventListener('close', () => res(d.returnValue === 'ha'), { once: true });
    d.returnValue = '';
    d.showModal();
  });
}

function natijaniKorsat(n) {
  $('n-ball').textContent = n.ball;
  const qator = (k, v) => `<div><span>${esc(t(k))}</span><span>${esc(v)}</span></div>`;
  $('n-jadval').innerHTML = qator('natija.vaqt', vaqtMatn(n.vaqt)) + qator('natija.xatolar', `${n.xatolar} (−${n.xatolar * JARIMA.xato})`) +
    qator('natija.maslahat', `${n.maslahat} (−${n.maslahat * JARIMA.maslahat})`) + (n.javob ? qator('natija.javob', `−${JARIMA.javob}`) : '');
  $('dlg-natija').showModal();
}

async function rejimniOrnat(r) {
  if (!(lab.sxema.rejimlar || ['2d']).includes(r)) r = '2d';
  rejim = r;
  try { localStorage.setItem(REJIM_KEY, r); } catch (e) { /* e’tiborsiz */ }
  document.querySelectorAll('#rejim [data-rejim]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.rejim === r)));
  $('stage-2d').hidden = r !== '2d';
  $('stage-3d').hidden = r !== '3d';
  ['tb-zoomout', 'tb-zoomin', 'tb-fit', 'tb-joy'].forEach((id) => { $(id).disabled = r !== '2d'; });
  v2d.korinsin(r === '2d');
  if (r === '3d') {
    if (!v3d) await uchOlchamYukla();
    v3d?.korinsin(true);
  } else v3d?.korinsin(false);
}

function uchOlchamYukla() {
  if (v3dYuklanmoqda) return v3dYuklanmoqda;
  const root = $('stage-3d');
  root.innerHTML = `<div class="stage-xabar" data-i18n="3d.yuklanmoqda">${esc(t('3d.yuklanmoqda'))}</div>`;
  v3dYuklanmoqda = import('./engine/view3d.js').then((m) => {
    if (!m.webglBormi()) throw new Error('webgl');
    v3d = new m.View3D(root, lab);
    window.__v3d = v3d; // sinovlar uchun
    v3d.korinsin(rejim === '3d');
  }).catch((e) => {
    console.error(e);
    root.innerHTML = `<div class="stage-xabar" data-i18n="3d.xato">${esc(t('3d.xato'))}</div>`;
  });
  return v3dYuklanmoqda;
}

function yozuvMaydonimi(e) { return /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable; }

async function boshlash() {
  sahifaBoshlash();
  const id = sxemaId();
  let sxema;
  try {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) throw new Error('id');
    const r = await fetch(`/laboratoriya/schemes/${id}.json`, { cache: 'no-cache' });
    if (!r.ok) throw new Error(String(r.status));
    sxema = await r.json();
  } catch (e) {
    $('stage-2d').innerHTML = `<div class="stage-xabar">${esc(t('mashq.topilmadi'))}</div>`;
    holatXabari(t('mashq.topilmadi'), 'xato');
    document.querySelector('.toolbar').hidden = true;
    document.querySelector('.bottombar').hidden = true;
    return;
  }

  lab = new Lab(sxema);
  window.__lab = lab; // sinovlar va o‘qituvchi uchun konsoldan ko‘rish
  v2d = new View2D($('stage-2d'), lab);
  if (!(sxema.rejimlar || []).includes('3d')) document.querySelector('#rejim [data-rejim="3d"]').hidden = true;

  lab.on((tur, d) => {
    if (tur === 'xabar') holatXabari(d.matn, d.daraja);
    if (tur === 'ozgardi') panelniYangila();
    if (tur === 'tekshiruv') { oxirgiTekshiruv = d; natijalarniChiz(); if (!d.togri) panelniOch(true); }
    if (tur === 'tugadi') natijaniKorsat(d);
  });

  // Asboblar paneli
  $('tb-zoomin').addEventListener('click', () => v2d.masshtab(1.25));
  $('tb-zoomout').addEventListener('click', () => v2d.masshtab(0.8));
  $('tb-fit').addEventListener('click', () => v2d.sigdir());
  $('tb-del').addEventListener('click', () => { if (lab.tanlanganSim) lab.simOchir(lab.tanlanganSim); });
  $('tb-undo').addEventListener('click', () => lab.qaytar());
  $('tb-redo').addEventListener('click', () => lab.takrorla());
  $('tb-joy').addEventListener('click', () => { lab.joylarniTikla(); v2d.sigdir(); });
  $('tb-full').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  });
  $('tb-yordam').addEventListener('click', () => { $('help').hidden = !$('help').hidden; });
  $('b-topshiriq').addEventListener('click', () => panelniOch(!$('side').classList.contains('open')));
  $('b-quvvat').addEventListener('click', () => lab.quvvatAlmashtir());
  $('b-tekshir').addEventListener('click', () => {
    const r = lab.tekshir();
    if (r.togri) holatXabari(t('chk.togri'), 'ok');
    else holatXabari(t(r.xatolar[0].kalit, parametr(r.xatolar[0].p)), r.xatolar[0].daraja);
  });
  $('b-maslahat').addEventListener('click', () => { const m = lab.maslahat(); holatXabari(m.matn, m.yangi ? 'ogoh' : 'info'); });
  $('b-javob').addEventListener('click', async () => { if (await sora(t('tasdiq.javob'))) { oxirgiTekshiruv = null; natijalarniChiz(); lab.javobniKorsat(); } });
  $('b-qayta').addEventListener('click', async () => { if (await sora(t('tasdiq.qayta'))) { oxirgiTekshiruv = null; natijalarniChiz(); lab.qayta(); v2d.sigdir(); } });
  document.querySelectorAll('#rejim [data-rejim]').forEach((b) => b.addEventListener('click', () => rejimniOrnat(b.dataset.rejim)));

  // Pastki panel
  $('ranglar').addEventListener('click', (e) => { const b = e.target.closest('[data-rang]'); if (b) lab.setRang(b.dataset.rang); });
  $('el-chips').addEventListener('click', (e) => {
    const b = e.target.closest('[data-fokus]');
    if (!b) return;
    if (rejim === '3d') v3d?.fokus(b.dataset.fokus); else v2d.fokus(b.dataset.fokus);
  });

  // Klaviatura
  document.addEventListener('keydown', (e) => {
    if (yozuvMaydonimi(e) || document.querySelector('dialog[open]')) return;
    const ctrl = e.ctrlKey || e.metaKey;
    if (e.key === 'Escape') { lab.bosh(); $('help').hidden = true; }
    else if ((e.key === 'Delete' || e.key === 'Backspace') && lab.tanlanganSim) { e.preventDefault(); lab.simOchir(lab.tanlanganSim); }
    else if (ctrl && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); lab.qaytar(); }
    else if (ctrl && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); lab.takrorla(); }
    else if (!ctrl && e.key.toLowerCase() === 'f' && rejim === '2d') v2d.sigdir();
  });

  tilniKuzat(() => { matnlarniYangila(); v2d.chiz(); });
  matnlarniYangila();
  holatXabari(t('h.boshla'));
  setInterval(() => { $('st-vaqt').textContent = vaqtMatn(lab.vaqt()); }, 1000);
  setInterval(() => lab.vaqtQadam(0.2), 200); // vaqt relesi va taymerlar uchun simulyatsiya vaqti
  $('st-vaqt').textContent = vaqtMatn(lab.vaqt());
  if (window.innerWidth > 1100) panelniOch(true);

  let saqlangan = null;
  try { saqlangan = localStorage.getItem(REJIM_KEY); } catch (e) { /* e’tiborsiz */ }
  const q = new URLSearchParams(location.search).get('rejim');
  await rejimniOrnat(q || saqlangan || (sxema.rejimlar || ['2d'])[0]);
}

boshlash();
