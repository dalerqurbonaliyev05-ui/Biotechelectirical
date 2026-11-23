import * as pdfjsLib from './vendor/pdf.min.mjs';

const BASE = new URL('./', import.meta.url).href;
pdfjsLib.GlobalWorkerOptions.workerSrc = BASE + 'vendor/pdf.worker.min.mjs';

const $ = (s, r = document) => r.querySelector(s);
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* ruxsat yo'q */ } },
};
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- Lotin <-> kirill: qidiruvda ikkala yozuv ishlashi uchun ---------- */
const FOLD = { 'ў': 'у', 'қ': 'к', 'ғ': 'г', 'ҳ': 'х', 'ё': 'е', 'э': 'е' };
const fold = s => s.toLowerCase().replace(/[ўқғҳёэ]/g, c => FOLD[c]);
const TRI = { "yo'": 'йў' };
const DI = { "o'": 'ў', "g'": 'ғ', sh: 'ш', ch: 'ч', yo: 'ё', yu: 'ю', ya: 'я', ye: 'е', ng: 'нг', ts: 'ц' };
const ONE = { a: 'а', b: 'б', d: 'д', e: 'е', f: 'ф', g: 'г', h: 'ҳ', i: 'и', j: 'ж', k: 'к', l: 'л', m: 'м', n: 'н', o: 'о', p: 'п', q: 'қ', r: 'р', s: 'с', t: 'т', u: 'у', v: 'в', x: 'х', y: 'й', z: 'з', "'": 'ъ' };
function latToCyr(s) {
  s = s.toLowerCase().replace(/[ʻʼ‘’`´]/g, "'");
  let out = '';
  for (let i = 0; i < s.length;) {
    const t3 = s.substr(i, 3), t2 = s.substr(i, 2);
    if (TRI[t3]) { out += TRI[t3]; i += 3; }
    else if (DI[t2]) { out += DI[t2]; i += 2; }
    else { out += ONE[s[i]] ?? s[i]; i++; }
  }
  return out;
}
/** So'rovning mumkin bo'lgan shakllari (folded) */
function variants(q) {
  q = q.trim();
  if (!q) return [];
  const v = new Set([fold(q)]);
  if (/[a-z]/i.test(q)) v.add(fold(latToCyr(q)));
  return [...v];
}

/* ---------- Ma'lumot ---------- */
let data = { categories: [], books: [] };
const state = { cat: 'all', q: '' };
const progKey = id => `kutubxona:p:${id}`;
const savedPage = id => parseInt(store.get(progKey(id)) || '0', 10) || 0;

async function loadCatalog() {
  const res = await fetch(BASE + 'books.json', { cache: 'no-cache' });
  data = await res.json();
}

/* ---------- Javon ---------- */
function bookMatches(b, vs, rawLower) {
  if (state.cat !== 'all' && b.category !== state.cat) return false;
  if (!vs.length) return true;
  const hayLat = (b.title + ' ' + b.code + ' ' + (b.description || '')).toLowerCase();
  const hayCyr = fold(b.titleOrig + ' ' + b.code);
  return hayLat.includes(rawLower) || vs.some(v => hayCyr.includes(v) || fold(hayLat).includes(v));
}

function renderChips() {
  const wrap = $('#chips');
  const count = id => data.books.filter(b => id === 'all' || b.category === id).length;
  const cats = [{ id: 'all', name: 'Barchasi' }, ...data.categories.filter(c => count(c.id))];
  wrap.innerHTML = cats.map(c =>
    `<button type="button" class="chip" role="tab" data-cat="${c.id}" aria-selected="${state.cat === c.id}">${esc(c.name)}<i>${count(c.id)}</i></button>`
  ).join('');
}

function renderShelf() {
  const rawLower = state.q.trim().toLowerCase();
  const vs = variants(state.q);
  const list = data.books.filter(b => bookMatches(b, vs, rawLower));
  $('#grid').innerHTML = list.map(b => {
    const p = savedPage(b.id);
    const pct = p > 1 ? Math.min(100, Math.round(p / b.pages * 100)) : 0;
    return `<a class="card" href="#/kitob/${b.id}">
      <div class="cover"><img src="${BASE}${b.cover}" alt="${esc(b.title)} muqovasi" loading="lazy">${pct ? `<div class="prog" title="${p}-betgacha o'qilgan"><span style="width:${pct}%"></span></div>` : ''}</div>
      <div><span class="code">${esc(b.code)}</span><h2>${esc(b.title)}</h2>
      <div class="meta">${b.pages} bet · ${b.sizeMB} MB</div></div></a>`;
  }).join('');
  $('#empty').hidden = list.length > 0;

  // "Davom etish"
  const last = data.books.find(b => b.id === store.get('kutubxona:last'));
  const box = $('#continue');
  if (last && savedPage(last.id) > 1 && !state.q) {
    box.hidden = false;
    box.href = `#/kitob/${last.id}`;
    box.innerHTML = `<div><small>O'qishni davom ettiring</small><b>${esc(last.title)} · ${savedPage(last.id)}-bet</b></div><span class="go">Davom etish</span>`;
  } else box.hidden = true;
}

function setupShelf() {
  $('#chips').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    state.cat = b.dataset.cat; renderChips(); renderShelf();
  });
  $('#shelf-q').addEventListener('input', e => { state.q = e.target.value; renderShelf(); });
}

/* ---------- O'quvchi ---------- */
let R = null;          // ochiq kitob holati
let openToken = 0;
const TARGET_W = () => (window.devicePixelRatio > 1.5 ? 1100 : 900);

function drawerOpen(tab) {
  const d = $('#drawer');
  d.classList.add('open'); d.setAttribute('aria-hidden', 'false');
  selectTab(tab);
  if (tab === 'search') setTimeout(() => $('#bs-q').focus(), 260);
}
function drawerClose() {
  const d = $('#drawer'); d.classList.remove('open'); d.setAttribute('aria-hidden', 'true');
}
function selectTab(tab) {
  for (const t of ['toc', 'search']) {
    $('#tab-' + t).setAttribute('aria-selected', String(t === tab));
    $('#pane-' + t).classList.toggle('on', t === tab);
  }
}

function showView(name) {
  $('#shelf-view').hidden = name !== 'shelf';
  $('#reader-view').hidden = name !== 'reader';
  if (name === 'shelf') document.title = 'Kutubxona | EnergyVibe';
}

async function closeReader() {
  openToken++;
  drawerClose();
  if (!R) return;
  const r = R; R = null; r.dead = true;
  try { r.pf?.destroy(); } catch { /* */ }
  for (const u of r.urls.values()) URL.revokeObjectURL(u);
  try { await r.pdf?.destroy(); } catch { /* */ }
  $('#book-wrap').innerHTML = '';
  $('#bs-results').innerHTML = ''; $('#bs-status').textContent = ''; $('#bs-q').value = '';
  $('#pane-toc').innerHTML = '';
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
}

async function openBook(id, startPage) {
  const book = data.books.find(b => b.id === id);
  if (!book) { location.hash = ''; return; }
  await closeReader();
  const token = ++openToken;

  showView('reader');
  document.title = `${book.title} | Kutubxona | EnergyVibe`;
  $('#r-code').textContent = book.code;
  $('#r-title').textContent = book.title;
  $('#btn-pdf').href = BASE + book.file;
  $('#btn-pdf').setAttribute('download', book.id + '.pdf');
  $('#btn-toc').hidden = true;
  $('#r-loading').hidden = false;
  $('#r-loading-text').textContent = 'Kitob ochilmoqda…';
  $('#pg-label').textContent = '—';

  let pdf;
  try {
    const task = pdfjsLib.getDocument({
      url: BASE + book.file,
      cMapUrl: BASE + 'vendor/cmaps/', cMapPacked: true,
      standardFontDataUrl: BASE + 'vendor/standard_fonts/',
      wasmUrl: BASE + 'vendor/wasm/',
    });
    task.onProgress = ({ loaded, total }) => {
      if (total && token === openToken) $('#r-loading-text').textContent = `Yuklanmoqda… ${Math.round(loaded / total * 100)}%`;
    };
    pdf = await task.promise;
  } catch (err) {
    console.error(err);
    $('#r-loading-text').textContent = "Kitobni ochib bo'lmadi. Internetni tekshirib, qayta urinib ko'ring.";
    $('.spin').style.display = 'none';
    return;
  }
  if (token !== openToken) { pdf.destroy(); return; }
  $('.spin').style.display = '';

  const n = pdf.numPages;
  const first = await pdf.getPage(1);
  const vp1 = first.getViewport({ scale: 1 });
  const ratio = vp1.height / vp1.width;

  // Sahifa elementlari
  const wrap = $('#book-wrap'); wrap.innerHTML = '';
  const bookEl = document.createElement('div'); bookEl.id = 'book'; wrap.appendChild(bookEl);
  const items = [];
  for (let i = 0; i < n; i++) {
    const d = document.createElement('div');
    d.className = 'page';
    if (i === 0 || i === n - 1) d.dataset.density = 'hard';
    d.innerHTML = '<div class="ph"></div>';
    bookEl.appendChild(d); items.push(d);
  }

  let start = startPage ? startPage - 1 : savedPage(id) - 1;
  if (!(start >= 0 && start < n)) start = 0;

  const W = 500, H = Math.round(W * ratio);
  const pf = new St.PageFlip(bookEl, {
    width: W, height: H, size: 'stretch',
    minWidth: 240, maxWidth: 1000, minHeight: Math.round(240 * ratio), maxHeight: Math.round(1000 * ratio),
    maxShadowOpacity: 0.45, showCover: true, mobileScrollSupport: false, usePortrait: true,
    startPage: start, flippingTime: 650, swipeDistance: 22, drawShadow: true, autoSize: true,
    showPageCorners: true, startZIndex: 0,
  });

  R = { book, pdf, pf, n, items, ratio, urls: new Map(), inflight: new Set(), queue: [], pumping: false,
        center: start, dead: false, textCache: new Map(), searchTok: 0 };
  const r = R;

  pf.loadFromHTML(items);
  pf.on('flip', e => onPage(r, e.data));
  pf.on('changeOrientation', () => onPage(r, pf.getCurrentPageIndex()));

  $('#pg-range').max = n; $('#pg-jump').max = n;
  $('#r-loading').hidden = true;
  onPage(r, start);
  if (!store.get('kutubxona:hint')) { $('#hint').hidden = false; store.set('kutubxona:hint', '1'); setTimeout(() => { $('#hint').hidden = true; }, 4600); }
  store.set('kutubxona:last', id);

  loadOutline(r).catch(() => {});
}

function pageLabel(r, idx) {
  const landscape = r.pf.getOrientation() === 'landscape';
  if (landscape && idx > 0 && idx + 1 < r.n) return [idx + 1, idx + 2];
  return [idx + 1];
}

function onPage(r, idx) {
  if (r.dead) return;
  r.center = idx;
  const [a, b] = pageLabel(r, idx);
  $('#pg-label').textContent = (b ? `${a}–${b}` : `${a}`) + ` / ${r.n}`;
  $('#pg-range').value = a; $('#pg-jump').value = a;
  $('#nav-prev').disabled = idx <= 0;
  $('#nav-next').disabled = (b || a) >= r.n;
  store.set(progKey(r.book.id), String(a));
  history.replaceState(null, '', `#/kitob/${r.book.id}/${a}`);
  schedule(r);
}

/* Sahifalarni faqat kerak bo'lganda chizish (lazy) */
function schedule(r) {
  const c = r.center;
  const lo = Math.max(0, c - 2), hi = Math.min(r.n - 1, c + 5);
  for (const i of [...r.urls.keys()]) if (i < c - 8 || i > c + 12) evict(r, i);
  r.queue = [];
  for (let i = lo; i <= hi; i++) if (!r.urls.has(i) && !r.inflight.has(i)) r.queue.push(i);
  r.queue.sort((x, y) => Math.abs(x - c) - Math.abs(y - c));
  pump(r);
}
function evict(r, i) {
  const u = r.urls.get(i); if (u) URL.revokeObjectURL(u);
  r.urls.delete(i);
  const el = r.items[i]; el.classList.remove('ready');
  el.querySelectorAll('img').forEach(x => x.remove());
}
async function pump(r) {
  if (r.pumping) return;
  r.pumping = true;
  while (!r.dead && r.queue.length) {
    const i = r.queue.shift();
    if (i < r.center - 2 || i > r.center + 5) continue;
    await renderPage(r, i);
  }
  r.pumping = false;
}
async function renderPage(r, i) {
  r.inflight.add(i);
  try {
    const page = await r.pdf.getPage(i + 1);
    const base = page.getViewport({ scale: 1 });
    const vp = page.getViewport({ scale: TARGET_W() / base.width });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(vp.width); canvas.height = Math.floor(vp.height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, canvas, viewport: vp }).promise;
    page.cleanup();
    const blob = await new Promise(res => canvas.toBlob(res, 'image/webp', 0.9));
    canvas.width = canvas.height = 0;
    if (r.dead || !blob) return;
    const url = URL.createObjectURL(blob);
    r.urls.set(i, url);
    const img = new Image();
    img.src = url; img.alt = `${i + 1}-bet`; img.draggable = false;
    img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;user-select:none';
    r.items[i].appendChild(img);
    // flip paytida klonlangan nusxalar ham ko'rsin:
    r.items[i].classList.add('ready');
  } catch (e) {
    if (!r.dead) console.warn('sahifa chizilmadi', i + 1, e);
  } finally {
    r.inflight.delete(i);
  }
}

/* ---------- Mundarija ---------- */
async function loadOutline(r) {
  const outline = await r.pdf.getOutline();
  if (!outline?.length || r.dead) return;
  const flat = [];
  const walk = (list, depth) => { for (const it of list) { flat.push({ it, depth }); if (it.items?.length && depth < 3) walk(it.items, depth + 1); } };
  walk(outline, 0);
  const rows = [];
  for (const { it, depth } of flat.slice(0, 500)) {
    try {
      let dest = it.dest;
      if (typeof dest === 'string') dest = await r.pdf.getDestination(dest);
      if (!Array.isArray(dest)) continue;
      const idx = typeof dest[0] === 'object' ? await r.pdf.getPageIndex(dest[0]) : dest[0];
      rows.push({ title: it.title, depth, page: idx + 1 });
    } catch { /* o'tkazib yuboramiz */ }
  }
  if (r.dead || !rows.length) return;
  $('#pane-toc').innerHTML = rows.map(x =>
    `<button type="button" class="toc-item" data-p="${x.page}" style="padding-left:${10 + x.depth * 16}px"><span>${esc(x.title || '')}</span><em>${x.page}</em></button>`
  ).join('');
  $('#btn-toc').hidden = false;
}

/* ---------- Kitob ichidan qidirish ---------- */
async function pageText(r, i) {
  if (r.textCache.has(i)) return r.textCache.get(i);
  const page = await r.pdf.getPage(i + 1);
  const tc = await page.getTextContent();
  let t = '';
  for (const it of tc.items) { t += it.str; t += it.hasEOL ? ' ' : (it.str.endsWith(' ') ? '' : ' '); }
  t = t.replace(/\s+/g, ' ').trim();
  page.cleanup();
  const rec = { raw: t, f: fold(t) };
  r.textCache.set(i, rec);
  return rec;
}
async function bookSearch(q) {
  const r = R; if (!r) return;
  const tok = ++r.searchTok;
  const vs = variants(q);
  const out = $('#bs-results'), st = $('#bs-status');
  out.innerHTML = '';
  if (!vs.length || vs[0].length < 2) { st.textContent = "Kamida 2 ta belgi kiriting."; return; }
  let found = 0; const MAX = 120;
  const vlen = Math.max(...vs.map(v => v.length));
  for (let i = 0; i < r.n; i++) {
    if (r.dead || tok !== r.searchTok) return;
    st.textContent = `Qidirilmoqda… ${i + 1}/${r.n} bet · topildi: ${found}`;
    const { raw, f } = await pageText(r, i);
    for (const v of vs) {
      let from = 0, pos, perPage = 0;
      while ((pos = f.indexOf(v, from)) !== -1 && perPage < 3 && found < MAX) {
        const s = Math.max(0, pos - 45), e = Math.min(raw.length, pos + v.length + 85);
        const snip = esc(raw.slice(s, pos)) + '<mark>' + esc(raw.slice(pos, pos + v.length)) + '</mark>' + esc(raw.slice(pos + v.length, e));
        const li = document.createElement('li');
        li.innerHTML = `<button type="button" data-p="${i + 1}"><b>${i + 1}-bet</b>${s > 0 ? '… ' : ''}${snip}${e < raw.length ? ' …' : ''}</button>`;
        out.appendChild(li);
        found++; perPage++; from = pos + vlen;
      }
      if (perPage) break; // bitta shakl topilsa, ikkinchisini takrorlamaymiz
    }
    if (found >= MAX) { st.textContent = `Ko'p natija topildi (${MAX} tadan ko'p) — aniqroq yozing.`; return; }
  }
  st.textContent = found ? `Topildi: ${found} ta joy` : 'Hech narsa topilmadi.';
}

/* ---------- Boshqaruv ---------- */
function goTo(p) {
  if (!R) return;
  p = Math.max(1, Math.min(R.n, p | 0));
  R.pf.turnToPage(p - 1);
  onPage(R, R.pf.getCurrentPageIndex());
}

function setupReader() {
  $('#r-back').addEventListener('click', () => { location.hash = ''; });
  $('#nav-prev').addEventListener('click', () => R?.pf.flipPrev());
  $('#nav-next').addEventListener('click', () => R?.pf.flipNext());
  $('#pg-range').addEventListener('input', e => { $('#pg-label').textContent = `${e.target.value} / ${R?.n ?? ''}`; });
  $('#pg-range').addEventListener('change', e => goTo(+e.target.value));
  $('#pg-jump').addEventListener('change', e => goTo(+e.target.value));
  $('#btn-toc').addEventListener('click', () => drawerOpen('toc'));
  $('#btn-search').addEventListener('click', () => drawerOpen('search'));
  $('#tab-toc').addEventListener('click', () => selectTab('toc'));
  $('#tab-search').addEventListener('click', () => selectTab('search'));
  $('#drawer-close').addEventListener('click', drawerClose);
  $('#btn-full').addEventListener('click', () => {
    const el = $('#reader-view');
    if (document.fullscreenElement) document.exitFullscreen(); else el.requestFullscreen?.().catch(() => {});
  });
  $('#pane-toc').addEventListener('click', e => {
    const b = e.target.closest('.toc-item'); if (!b) return;
    goTo(+b.dataset.p); if (innerWidth < 900) drawerClose();
  });
  $('#bs-results').addEventListener('click', e => {
    const b = e.target.closest('button[data-p]'); if (!b) return;
    goTo(+b.dataset.p); if (innerWidth < 900) drawerClose();
  });
  $('#bs-form').addEventListener('submit', e => { e.preventDefault(); bookSearch($('#bs-q').value); });

  addEventListener('keydown', e => {
    if (!R || e.target.matches('input,textarea')) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { R.pf.flipNext(); e.preventDefault(); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { R.pf.flipPrev(); e.preventDefault(); }
    else if (e.key === 'Home') goTo(1);
    else if (e.key === 'End') goTo(R.n);
    else if (e.key === 'Escape') { if ($('#drawer').classList.contains('open')) drawerClose(); else if (!document.fullscreenElement) location.hash = ''; }
    else if (e.key === 'f' || e.key === 'F') $('#btn-full').click();
    else if (e.key === '/') { drawerOpen('search'); e.preventDefault(); }
  });
}

/* ---------- Yo'nalish (hash) ---------- */
function route() {
  const m = location.hash.match(/^#\/kitob\/([\w-]+)(?:\/(\d+))?/);
  if (m) {
    if (R && R.book.id === m[1]) return;      // o'sha kitob: sahifa almashganda qayta ochmaymiz
    openBook(m[1], m[2] ? +m[2] : 0);
  } else {
    closeReader().then(() => { showView('shelf'); renderChips(); renderShelf(); });
  }
}

(async function init() {
  setupShelf(); setupReader();
  try { await loadCatalog(); }
  catch (e) { $('#grid').innerHTML = '<p class="empty">Katalog yuklanmadi (books.json).</p>'; console.error(e); }
  renderChips(); renderShelf();
  addEventListener('hashchange', route);
  route();
})();
