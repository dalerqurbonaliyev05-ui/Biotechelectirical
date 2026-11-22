// Laboratoriya katalogi: kartochkalar schemes/royxat.json dagi sxema fayllaridan avtomatik yasaladi.
import { sahifaBoshlash } from './engine/sahifa.js';
import { t, tx, tilniKuzat } from './engine/i18n.js';
import { natijalarniOl } from './engine/state.js';

const YONALISHLAR = ['yoritish', 'uy_shiti', 'motorlar', 'rele', 'podstansiya', 'olchash', 'yerga_ulash'];
const DARAJALAR = [1, 2, 3, 4, 5];
const REJIMLAR = ['2d', '3d'];
const filtr = { yonalish: null, daraja: null, rejim: null };
let sxemalar = null;
let xato = false;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Kartochka rasmlari: qora to‘r ustidagi oq qurilmalar (yo‘nalish bo‘yicha)
const RASM = {
  yoritish: `<svg viewBox="0 0 320 170" aria-hidden="true">
    <rect x="20" y="38" width="26" height="100" rx="3" fill="#f4f4f2"/>
    <circle cx="33" cy="60" r="6" fill="#7b4a26"/><circle cx="33" cy="88" r="6" fill="#1f6fd6"/><circle cx="33" cy="116" r="6" fill="#e2c300"/>
    <rect x="80" y="30" width="28" height="70" rx="3" fill="#f4f4f2"/><rect x="89" y="46" width="10" height="16" fill="#1d1f24"/><rect x="89" y="66" width="10" height="3" fill="#e5484d"/>
    <rect x="140" y="62" width="70" height="70" rx="8" fill="#17181c" stroke="#4b4e57"/>
    <rect x="150" y="76" width="50" height="12" rx="2" fill="#e9edf1"/><rect x="150" y="96" width="50" height="12" rx="2" fill="#e9edf1"/><rect x="150" y="116" width="50" height="10" rx="2" fill="#e9edf1"/>
    <rect x="236" y="18" width="50" height="50" rx="7" fill="#f4f4f2"/><rect x="246" y="26" width="30" height="34" rx="4" fill="#e3e3de"/>
    <circle cx="262" cy="122" r="30" fill="#ffcf40" opacity=".35"/><circle cx="262" cy="122" r="18" fill="#ffe27a"/><rect x="248" y="92" width="28" height="10" rx="2" fill="#f4f4f2"/>
    <path d="M46 60 H64 V22 H94 V30" fill="none" stroke="#7b4a26" stroke-width="2.4"/>
    <path d="M94 100 V112 H130 V82 H150" fill="none" stroke="#7b4a26" stroke-width="2.4"/>
    <path d="M200 82 H222 V76 H250 V68" fill="none" stroke="#7b4a26" stroke-width="2.4"/>
    <path d="M46 88 H58 V150 H300 V108 H276 V102" fill="none" stroke="#1f6fd6" stroke-width="2.4"/>
    <path d="M200 102 H230 V96 H256 V92" fill="none" stroke="#7b4a26" stroke-width="2.4"/>
  </svg>`,
};

function chip(guruh, qiymat, matn) {
  return `<button type="button" class="chip" data-g="${guruh}" data-v="${qiymat ?? ''}" aria-pressed="${filtr[guruh] === qiymat}">${esc(matn)}</button>`;
}

function filtrlarniChiz() {
  document.getElementById('f-yonalish').innerHTML = chip('yonalish', null, t('filtr.hammasi')) + YONALISHLAR.map((y) => chip('yonalish', y, t(`yon.${y}`))).join('');
  document.getElementById('f-daraja').innerHTML = chip('daraja', null, t('filtr.hammasi')) + DARAJALAR.map((d) => chip('daraja', d, String(d))).join('');
  document.getElementById('f-rejim').innerHTML = chip('rejim', null, t('filtr.hammasi')) + REJIMLAR.map((r) => chip('rejim', r, r.toUpperCase())).join('');
}

function lentaniChiz() {
  const items = ['k.t1', 'k.t2', 'k.t3', 'k.t4', 'k.t5'].map((k, i) => `<span><small>0${i + 1}</small>${esc(t(k))}</span>`).join('');
  document.getElementById('ticker').innerHTML = items.repeat(4);
}

const darajaBelgi = (n) => `<span class="daraja" title="${esc(t('karta.daraja', { n }))}" aria-label="${esc(t('karta.daraja', { n }))}">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;

function kartalarniChiz() {
  const root = document.getElementById('kartalar');
  if (xato) { root.innerHTML = `<p class="bosh-holat">${esc(t('katalog.xato'))}</p>`; return; }
  if (!sxemalar) { root.innerHTML = `<p class="bosh-holat">${esc(t('katalog.yuklanmoqda'))}</p>`; return; }
  const natijalar = natijalarniOl();
  const list = sxemalar.filter((s) =>
    (!filtr.yonalish || s.yonalish === filtr.yonalish) &&
    (!filtr.daraja || s.daraja === filtr.daraja) &&
    (!filtr.rejim || (s.rejimlar || []).includes(filtr.rejim)));
  if (!list.length) { root.innerHTML = `<p class="bosh-holat">${esc(t('katalog.bosh'))}</p>`; return; }
  root.innerHTML = list.map((s) => {
    const n = natijalar[s.id];
    return `<a class="karta" href="/laboratoriya/${encodeURIComponent(s.id)}">
      ${n?.bajarildi ? `<span class="bajarildi">${esc(t('karta.bajarildi'))}</span>` : ''}
      <div class="karta-rasm">${RASM[s.yonalish] || ''}</div>
      <div class="karta-tana">
        <span class="eyebrow acc">// ${esc(t(`yon.${s.yonalish}`))}</span>
        <h3>${esc(tx(s.nomi))}</h3>
        <p>${esc(tx(s.qisqacha))}</p>
        ${n?.bajarildi ? `<span class="karta-eng">${esc(t('karta.eng', { b: n.eng ?? n.ball }))}</span>` : ''}
        <div class="karta-meta">
          ${darajaBelgi(s.daraja)}
          <span class="tag">${esc(t('karta.vaqt', { n: s.vaqt_min }))}</span>
          ${(s.rejimlar || []).map((r) => `<span class="tag">${r.toUpperCase()}</span>`).join('')}
        </div>
        <span class="karta-go">${esc(t(n?.bajarildi ? 'karta.davom' : 'karta.ochish'))}</span>
      </div>
    </a>`;
  }).join('');
}

document.querySelector('.filtrlar').addEventListener('click', (e) => {
  const b = e.target.closest('[data-g]');
  if (!b) return;
  const g = b.dataset.g;
  let v = b.dataset.v || null;
  if (v && g === 'daraja') v = Number(v);
  filtr[g] = filtr[g] === v ? null : v;
  filtrlarniChiz();
  kartalarniChiz();
});

tilniKuzat(() => { filtrlarniChiz(); kartalarniChiz(); lentaniChiz(); });
sahifaBoshlash();

(async () => {
  try {
    const r = await fetch('/laboratoriya/schemes/royxat.json', { cache: 'no-cache' });
    const { sxemalar: idlar } = await r.json();
    const hammasi = await Promise.all(idlar.map((id) => fetch(`/laboratoriya/schemes/${encodeURIComponent(id)}.json`).then((x) => (x.ok ? x.json() : null)).catch(() => null)));
    sxemalar = hammasi.filter(Boolean);
    if (sxemalar[0]) document.querySelectorAll('[data-birinchi]').forEach((a) => { a.href = `/laboratoriya/${encodeURIComponent(sxemalar[0].id)}`; });
  } catch (e) {
    xato = true;
  }
  kartalarniChiz();
})();
