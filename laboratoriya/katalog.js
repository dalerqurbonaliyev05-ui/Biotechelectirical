// Laboratoriya katalogi: kartochkalar schemes/royxat.json dagi sxema fayllaridan avtomatik yasaladi.
import { sahifaBoshlash } from './engine/sahifa.js';
import { t, tx, tilniKuzat } from './engine/i18n.js';
import { natijalarniOl } from './engine/state.js';

const YONALISHLAR = ['yoritish', 'uy_shiti', 'motorlar', 'avtomatika', 'rele', 'podstansiya', 'olchash', 'yerga_ulash'];
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
  motorlar: `<svg viewBox="0 0 320 170" aria-hidden="true">
    <rect x="30" y="14" width="96" height="40" rx="4" fill="#f4f4f2"/><circle cx="52" cy="34" r="6" fill="#e0b400"/><circle cx="78" cy="34" r="6" fill="#1f9a4a"/><circle cx="104" cy="34" r="6" fill="#d93a32"/>
    <rect x="38" y="74" width="82" height="64" rx="6" fill="#2b2e34" stroke="#4a4e57"/><rect x="66" y="94" width="26" height="14" rx="3" fill="#22c55e"/>
    <rect x="182" y="96" width="92" height="50" rx="14" fill="#5bb5d6" stroke="#2f86a8"/><rect x="214" y="82" width="30" height="18" rx="3" fill="#3f9fc4"/>
    <g transform="translate(186 121)"><g class="d-aylan"><path d="M0 0 L-5 -18 Q0 -22 5 -18 Z" fill="#f5c400"/><path d="M0 0 L16 9 Q16 15 10 18 Z" fill="#d93a32"/><path d="M0 0 L-11 15 Q-16 12 -16 7 Z" fill="#22a35a"/></g><circle r="5" fill="#2a4fb0"/></g>
    <rect x="200" y="16" width="44" height="52" rx="5" fill="#2b2e34"/><ellipse cx="222" cy="22" rx="16" ry="8" fill="#22a35a"/>
    <path d="M52 40 V60 H60 V74 M78 40 V74 M104 40 V60 H98 V74" stroke="#e0b400" stroke-width="2" fill="none"/>
    <path d="M60 138 V156 H200 V138 M79 138 V150 H214 V96" stroke="#1f9a4a" stroke-width="2" fill="none"/>
    <path d="M126 96 H170 V40 H200" stroke="#9aa0a8" stroke-width="2" fill="none"/>
  </svg>`,
  uy_shiti: `<svg viewBox="0 0 320 170" aria-hidden="true">
    <rect x="24" y="22" width="80" height="70" rx="6" fill="#1c1d21" stroke="#3c3f46"/><rect x="34" y="32" width="60" height="22" rx="2" fill="#e8edf1"/><rect x="38" y="36" width="52" height="8" fill="#1f4fa8"/>
    <rect x="124" y="20" width="34" height="76" rx="3" fill="#f4f4f2"/><rect x="162" y="20" width="34" height="76" rx="3" fill="#f4f4f2"/><rect x="128" y="46" width="64" height="14" rx="2" fill="#e0b400"/>
    <rect x="220" y="24" width="56" height="56" rx="8" fill="#f4f4f2"/><circle cx="248" cy="52" r="18" fill="#ecece8"/><circle cx="242" cy="52" r="3" fill="#2b2e34"/><circle cx="254" cy="52" r="3" fill="#2b2e34"/>
    <circle cx="150" cy="138" r="26" fill="#ffcf40" opacity=".35"/><circle cx="150" cy="138" r="15" fill="#ffe27a"/>
    <path d="M64 92 V116 H140 M180 96 V112 H248 V80" stroke="#7b4a26" stroke-width="2" fill="none"/><path d="M84 92 V124 H130" stroke="#1f6fd6" stroke-width="2" fill="none"/>
  </svg>`,
  olchash: `<svg viewBox="0 0 320 170" aria-hidden="true">
    <rect x="40" y="26" width="104" height="96" rx="4" fill="#f4f4f2"/><path d="M58 92 A38 38 0 0 1 126 92" fill="none" stroke="#1b1b1f"/><line x1="92" y1="104" x2="118" y2="64" stroke="#d93a32" stroke-width="2"/><text x="56" y="52" font-family="JetBrains Mono, monospace" font-weight="800" font-size="18" fill="#1b1b1f">V</text>
    <rect x="176" y="26" width="104" height="96" rx="4" fill="#f4f4f2"/><path d="M194 92 A38 38 0 0 1 262 92" fill="none" stroke="#1b1b1f"/><line x1="228" y1="104" x2="216" y2="62" stroke="#d93a32" stroke-width="2"/><text x="192" y="52" font-family="JetBrains Mono, monospace" font-weight="800" font-size="18" fill="#1b1b1f">A</text>
    <path d="M70 122 V148 H250 V122" stroke="#e0b400" stroke-width="2" fill="none"/><path d="M114 122 V138 H206 V122" stroke="#1f9a4a" stroke-width="2" fill="none"/>
  </svg>`,
  avtomatika: `<svg viewBox="0 0 320 170" aria-hidden="true">
    <rect x="26" y="20" width="70" height="60" rx="4" fill="#f4f4f2"/><rect x="36" y="30" width="50" height="18" fill="#b8d4b0"/><circle cx="61" cy="62" r="8" fill="#d93a32"/>
    <rect x="120" y="16" width="56" height="74" rx="6" fill="#2b2e34"/><rect x="132" y="30" width="32" height="40" rx="5" fill="#dfe9f2" opacity=".85"/>
    <rect x="206" y="24" width="44" height="54" rx="5" fill="#2b2e34"/><path d="M212 40 Q228 4 244 40 Z" fill="#d93a32"/>
    <rect x="120" y="118" width="96" height="28" rx="6" fill="#c9a24a" stroke="#8c6d27"/><rect x="152" y="96" width="32" height="24" rx="3" fill="#2b2e34"/><path d="M218 132 h30" stroke="#2a8fd6" stroke-width="6" stroke-linecap="round"/>
    <path d="M61 80 V104 H140 V96 M148 90 V104" stroke="#9aa0a8" stroke-width="2" fill="none"/>
  </svg>`,
};

function chip(guruh, qiymat, matn) {
  return `<button type="button" class="chip" data-g="${guruh}" data-v="${qiymat ?? ''}" aria-pressed="${filtr[guruh] === qiymat}">${esc(matn)}</button>`;
}

function filtrlarniChiz() {
  if (!document.getElementById('f-yonalish')) return;
  const yonlar = sxemalar ? YONALISHLAR.filter((y) => sxemalar.some((x) => x.yonalish === y)) : [];
  document.getElementById('f-yonalish').innerHTML = chip('yonalish', null, t('filtr.hammasi')) + yonlar.map((y) => chip('yonalish', y, t(`yon.${y}`))).join('');
  document.getElementById('f-daraja').innerHTML = chip('daraja', null, t('filtr.hammasi')) + DARAJALAR.map((d) => chip('daraja', d, String(d))).join('');
  document.getElementById('f-rejim').innerHTML = chip('rejim', null, t('filtr.hammasi')) + REJIMLAR.map((r) => chip('rejim', r, r.toUpperCase())).join('');
}

function lentaniChiz() {
  if (!document.getElementById('ticker')) return;
  const items = ['k.t1', 'k.t2', 'k.t3', 'k.t4', 'k.t5'].map((k, i) => `<span><small>0${i + 1}</small>${esc(t(k))}</span>`).join('');
  document.getElementById('ticker').innerHTML = items.repeat(4);
}

const darajaBelgi = (n) => `<span class="daraja" title="${esc(t('karta.daraja', { n }))}" aria-label="${esc(t('karta.daraja', { n }))}">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;

function kartalarniChiz() {
  plitkalarniChiz();
  const root = document.getElementById('kartalar');
  if (!root) return;
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

// Bosh sahifa: yo‘nalish plitkalari (har biri simulyatorni shu yo‘nalish filtri bilan ochadi)
function plitkalarniChiz() {
  const root = document.getElementById('yon-plitka');
  if (!root) return;
  if (!sxemalar) return;
  const soni = document.getElementById('sim-soni');
  if (soni) soni.textContent = t('k.sim_n', { n: sxemalar.length });
  const rasm = document.getElementById('sim-rasm');
  if (rasm && !rasm.innerHTML) rasm.innerHTML = RASM.motorlar;
  const bor = YONALISHLAR.filter((y) => sxemalar.some((x) => x.yonalish === y));
  root.innerHTML = bor.map((y) => {
    const n = sxemalar.filter((x) => x.yonalish === y).length;
    return `<a class="yon-plitka" href="/laboratoriya/simulyator/#yonalish=${y}">
      <div class="karta-rasm">${RASM[y] || ''}</div>
      <div class="yon-tana"><h3>${esc(t(`yon.${y}`))}</h3><span class="tag">${esc(t('k.sim_n', { n }))}</span><span class="karta-go">${esc(t('k.sim_ochish'))}</span></div>
    </a>`;
  }).join('');
}

// Simulyator sahifasi: #yonalish=motorlar kabi havola filtrni oldindan tanlaydi
function hashFiltr() {
  const m = /yonalish=([a-z_]+)/.exec(location.hash);
  filtr.yonalish = m && YONALISHLAR.includes(m[1]) ? m[1] : null;
}
hashFiltr();
window.addEventListener('hashchange', () => { hashFiltr(); filtrlarniChiz(); kartalarniChiz(); });

// Bosh sahifa: pastga surilganda doim ko‘rinadigan «Simulyatorga kirish» tugmasi
const suzuvchi = document.getElementById('sim-float');
if (suzuvchi) {
  const yangila = () => { suzuvchi.hidden = window.scrollY < 420; };
  window.addEventListener('scroll', yangila, { passive: true });
  yangila();
}

document.querySelector('.filtrlar')?.addEventListener('click', (e) => {
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
    filtrlarniChiz();
    if (sxemalar[0]) document.querySelectorAll('[data-birinchi]').forEach((a) => { a.href = `/laboratoriya/${encodeURIComponent(sxemalar[0].id)}`; });
  } catch (e) {
    xato = true;
  }
  kartalarniChiz();
})();
