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

const RASM = {
  yoritish: `<svg viewBox="0 0 300 150" aria-hidden="true">
    <path d="M30 105 H95 M125 105 H180 V58 M180 58 V40" stroke="#1b1440" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="95" cy="105" r="4" fill="#1b1440"/><path d="M95 105 L122 92" stroke="#1b1440" stroke-width="3" stroke-linecap="round"/>
    <circle cx="210" cy="64" r="34" fill="#ffe27a" opacity=".55"/>
    <circle cx="210" cy="64" r="20" fill="#fff" stroke="#1b1440" stroke-width="3"/>
    <path d="M196 50 L224 78 M224 50 L196 78" stroke="#1b1440" stroke-width="3"/>
    <path d="M180 40 H210 V44 M230 64 H262 V105 H200" stroke="#1f6fd6" stroke-width="3" fill="none" stroke-linecap="round"/>
    <text x="30" y="96" font-family="JetBrains Mono, monospace" font-size="13" font-weight="700" fill="#57507a">L</text>
    <text x="100" y="128" font-family="JetBrains Mono, monospace" font-size="13" font-weight="700" fill="#57507a">SA1</text>
    <text x="236" y="34" font-family="JetBrains Mono, monospace" font-size="13" font-weight="700" fill="#57507a">HL1</text>
  </svg>`,
};

function chip(guruh, qiymat, matn) {
  const on = filtr[guruh] === qiymat;
  return `<button type="button" class="chip" data-g="${guruh}" data-v="${qiymat ?? ''}" aria-pressed="${on}">${esc(matn)}</button>`;
}

function filtrlarniChiz() {
  document.getElementById('f-yonalish').innerHTML = chip('yonalish', null, t('filtr.hammasi')) + YONALISHLAR.map((y) => chip('yonalish', y, t(`yon.${y}`))).join('');
  document.getElementById('f-daraja').innerHTML = chip('daraja', null, t('filtr.hammasi')) + DARAJALAR.map((d) => chip('daraja', d, String(d))).join('');
  document.getElementById('f-rejim').innerHTML = chip('rejim', null, t('filtr.hammasi')) + REJIMLAR.map((r) => chip('rejim', r, r.toUpperCase())).join('');
}

function darajaBelgi(n) {
  return `<span class="daraja" title="${esc(t('karta.daraja', { n }))}" aria-label="${esc(t('karta.daraja', { n }))}">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;
}

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
        <h2>${esc(tx(s.nomi))}</h2>
        <p>${esc(tx(s.qisqacha))}</p>
        ${n?.bajarildi ? `<span class="karta-eng">${esc(t('karta.eng', { b: n.eng ?? n.ball }))}</span>` : ''}
        <div class="karta-meta">
          <span class="tag">${esc(t(`yon.${s.yonalish}`))}</span>
          ${darajaBelgi(s.daraja)}
          <span class="tag vaqt">${esc(t('karta.vaqt', { n: s.vaqt_min }))}</span>
          ${(s.rejimlar || []).map((r) => `<span class="tag rejim">${r.toUpperCase()}</span>`).join('')}
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

tilniKuzat(() => { filtrlarniChiz(); kartalarniChiz(); });
sahifaBoshlash();

(async () => {
  try {
    const r = await fetch('/laboratoriya/schemes/royxat.json', { cache: 'no-cache' });
    const { sxemalar: idlar } = await r.json();
    const hammasi = await Promise.all(idlar.map((id) => fetch(`/laboratoriya/schemes/${encodeURIComponent(id)}.json`).then((x) => (x.ok ? x.json() : null)).catch(() => null)));
    sxemalar = hammasi.filter(Boolean);
  } catch (e) {
    xato = true;
  }
  kartalarniChiz();
})();
