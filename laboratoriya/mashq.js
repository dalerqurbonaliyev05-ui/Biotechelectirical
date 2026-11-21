// Mashq sahifasi: /laboratoriya/<sxema-id>. Har qanday sxema JSON'i shu umumiy sahifada ishlaydi.
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

function vaqtMatn(s) {
  const m = Math.floor(s / 60), c = s % 60;
  return `${m}:${String(c).padStart(2, '0')}`;
}

let lab, v2d, v3d = null, v3dYuklanmoqda = null, rejim = '2d';

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
    } else res[k] = v;
  }
  return res;
}

let oxirgiTekshiruv = null;
function natijalarniChiz() {
  const r = oxirgiTekshiruv;
  $('p-natija').hidden = !r;
  if (!r) return;
  if (r.togri) {
    $('natijalar').innerHTML = `<li class="xabar ok">${esc(t('chk.togri'))}</li>`;
    return;
  }
  $('natijalar').innerHTML = r.xatolar.map((x) => {
    const sub = x.joy ? t(x.joy.kalit, parametr(x.joy.p)) : x.qoshimcha ? t(x.qoshimcha) : '';
    return `<li class="xabar ${x.daraja}">${esc(t(x.kalit, parametr(x.p)))}${sub ? `<small>${esc(sub)}</small>` : ''}</li>`;
  }).join('') + (r.xatolar[0]?.tur !== 'bosh' && !lab.ball.tugadi ? `<li class="xabar ogoh"><small>${esc(t('chk.minus'))}</small></li>` : '');
}

function maslahatlarniChiz() {
  const list = lab.maslahatlarRoyxati();
  $('p-maslahat').hidden = !list.length;
  $('maslahatlar').innerHTML = list.map((m) => `<li>${esc(m)}</li>`).join('');
}

function panelniYangila() {
  $('st-ball').textContent = lab.ballHisob();
  $('st-xato').textContent = lab.ball.xato;
  const q = lab.quvvatBormi();
  const b = $('b-quvvat');
  b.setAttribute('aria-pressed', String(q));
  b.querySelector('span').dataset.i18n = q ? 'btn.quvvat_ol' : 'btn.quvvat_ber';
  b.querySelector('span').textContent = t(q ? 'btn.quvvat_ol' : 'btn.quvvat_ber');
  $('ranglar').querySelectorAll('[data-rang]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.rang === lab.rang)));
  $('el-holat').innerHTML = lab.els.filter((e) => e.def.bosiladi || e.def.yuklama).map((e) => {
    let s, cls = '';
    if (e.def.yuklama) {
      const y = lab.sim.yuklamalar[e.id]?.yonadi;
      s = t(y ? 's.yonadi' : 's.ochiq_lampa');
      cls = y ? 'yonadi on' : '';
    } else {
      const on = lab.holat[e.id]?.yoqilgan;
      s = t(on ? 's.yoqilgan' : 's.ochgan');
      cls = on ? 'on' : '';
    }
    return `<li class="${cls}"><span>${esc(e.id)} · ${esc(tx(e.def.nomi))}</span><span>${esc(s)}</span></li>`;
  }).join('');
  maslahatlarniChiz();
}

function matnlarniYangila() {
  const s = lab.sxema;
  $('m-nomi').textContent = tx(s.nomi);
  document.title = `${tx(s.nomi)} | EnergyVibe`;
  $('m-topshiriq').textContent = tx(s.topshiriq);
  $('m-meta').innerHTML = `<span class="tag">${esc(t(`yon.${s.yonalish}`))}</span>
    <span class="daraja" aria-label="${esc(t('karta.daraja', { n: s.daraja }))}" title="${esc(t('karta.daraja', { n: s.daraja }))}">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= s.daraja ? 'on' : ''}"></i>`).join('')}</span>
    <span class="tag vaqt">${esc(t('karta.vaqt', { n: s.vaqt_min }))}</span>`;
  $('ranglar').innerHTML = Object.entries(RANGLAR).map(([id, r]) => {
    const fon = r.hex2 ? `repeating-linear-gradient(90deg, ${r.hex} 0 6px, ${r.hex2} 6px 12px)` : r.hex;
    return `<button type="button" class="rang-btn" data-rang="${id}" aria-pressed="${lab.rang === id}"><i style="background:${fon}"></i>${esc(tx(r.nomi))}</button>`;
  }).join('');
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
    $('m-nomi').textContent = t('mashq.topilmadi');
    document.querySelector('.m-grid').hidden = true;
    document.querySelector('.m-task').hidden = true;
    $('m-bar').hidden = true;
    $('rejim').hidden = true;
    return;
  }

  lab = new Lab(sxema);
  window.__lab = lab; // sinovlar va o‘qituvchi uchun konsoldan ko‘rish
  v2d = new View2D($('stage-2d'), lab);
  if (!(sxema.rejimlar || []).includes('3d')) document.querySelector('#rejim [data-rejim="3d"]').hidden = true;

  lab.on((tur, d) => {
    if (tur === 'xabar') holatXabari(d.matn, d.daraja);
    if (tur === 'ozgardi') panelniYangila();
    if (tur === 'tekshiruv') { oxirgiTekshiruv = d; natijalarniChiz(); }
    if (tur === 'tugadi') natijaniKorsat(d);
  });

  $('ranglar').addEventListener('click', (e) => { const b = e.target.closest('[data-rang]'); if (b) lab.setRang(b.dataset.rang); });
  $('b-quvvat').addEventListener('click', () => lab.quvvatAlmashtir());
  $('b-tekshir').addEventListener('click', () => {
    const r = lab.tekshir();
    if (r.togri) holatXabari(t('chk.togri'), 'ok');
    else holatXabari(t(r.xatolar[0].kalit, parametr(r.xatolar[0].p)), r.xatolar[0].daraja);
  });
  $('b-maslahat').addEventListener('click', () => {
    const m = lab.maslahat();
    holatXabari(m.matn, m.yangi ? 'ogoh' : 'info');
  });
  $('b-javob').addEventListener('click', async () => { if (await sora(t('tasdiq.javob'))) { oxirgiTekshiruv = null; natijalarniChiz(); lab.javobniKorsat(); } });
  $('b-qayta').addEventListener('click', async () => { if (await sora(t('tasdiq.qayta'))) { oxirgiTekshiruv = null; natijalarniChiz(); lab.qayta(); } });
  document.querySelectorAll('#rejim [data-rejim]').forEach((b) => b.addEventListener('click', () => rejimniOrnat(b.dataset.rejim)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') lab.bosh(); });

  tilniKuzat(() => { matnlarniYangila(); v2d.chiz(); });
  matnlarniYangila();
  holatXabari(t('h.boshla'));
  setInterval(() => { $('st-vaqt').textContent = vaqtMatn(lab.vaqt()); }, 1000);
  $('st-vaqt').textContent = vaqtMatn(lab.vaqt());

  let saqlangan = null;
  try { saqlangan = localStorage.getItem(REJIM_KEY); } catch (e) { /* e’tiborsiz */ }
  const q = new URLSearchParams(location.search).get('rejim');
  await rejimniOrnat(q || saqlangan || (sxema.rejimlar || ['2d'])[0]);
}

boshlash();
