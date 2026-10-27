/* Python Dars — talabalar Python kodini qanday yozayotganini ustoz jonli kuzatadigan dastur.
   Ma'lumotlar Firebase Realtime Database'da, "pydars/" bo'limida saqlanadi:
     pydars/ustoz/pin                      — ustoz parolining SHA-256 xeshi
     pydars/sinf                           — { amaliyotId, boshlandi, boshVariant }
     pydars/sinf/navbat/{amaliyotId}       — variant tarqatish hisoblagichi
     pydars/talabalar/{sid}                — { ism, guruh, online, oxirgi }
     pydars/ish/{amaliyotId}/{sid}         — { variant, qoshimcha, izoh, yordam, tayyor, qabul, ustozTahrir,
                                               fayllar: { asosiy|qoshimcha: { kod, vaqt, muallif, kirish, ishga } } }
*/
(function () {
'use strict';

const firebaseConfig = {
  apiKey: "AIzaSyBuY-ActQrkKbLLTHsh5ik_xaukC4H2tA4",
  authDomain: "pythonduel-eb4bc.firebaseapp.com",
  databaseURL: "https://pythonduel-eb4bc-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "pythonduel-eb4bc",
  storageBucket: "pythonduel-eb4bc.firebasestorage.app",
  messagingSenderId: "522841263840",
  appId: "1:522841263840:web:2ec5a454e9e96072928a85",
};

const VAQT_CHEGARASI = 10000;    // bitta ishga tushirish uchun maksimal vaqt (ms)
const SAQLASH_KECHIKISHI = 400;  // yozishdan keyin shuncha ms o'tib saqlanadi
const AMALIYOTLAR = window.AMALIYOTLAR || [];
const $app = document.getElementById('app');

// ---------------------------------------------------------------- yordamchilar
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (sel, root = document) => root.querySelector(sel);
const saqla = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (_) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} },
  del(k) { try { localStorage.removeItem(k); } catch (_) {} },
};
function toast(matn, ms = 2600) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = matn;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), ms);
}
function throttle(fn, ms) {
  let kutilmoqda = false, yana = false;
  return function chaqir() {
    if (kutilmoqda) { yana = true; return; }
    kutilmoqda = true; fn();
    setTimeout(() => { kutilmoqda = false; if (yana) { yana = false; chaqir(); } }, ms);
  };
}
function slug(s) {
  return String(s).toLowerCase().replace(/[ʻʼ'`’‘]/g, '').normalize('NFKC')
    .replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}
async function xesh(matn) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('pydars:' + matn));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
const amaliyot = (id) => AMALIYOTLAR.find((a) => a.id === id) || null;

// ---------------------------------------------------------------- Firebase
if (!window.firebase || !firebase.database) {
  $app.innerHTML = `<div class="welcome card center"><h2>Ulanib bo'lmadi</h2><p class="muted">Internet aloqasini tekshirib, sahifani yangilang.</p></div>`;
  return;
}
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const R = (p) => db.ref('pydars/' + p);
const TS = firebase.database.ServerValue.TIMESTAMP;
let vaqtFarqi = 0;
db.ref('.info/serverTimeOffset').on('value', (s) => { vaqtFarqi = s.val() || 0; });
const hozir = () => Date.now() + vaqtFarqi;
function oldin(ts) {
  if (!ts) return '';
  const s = Math.max(0, Math.round((hozir() - ts) / 1000));
  if (s < 5) return 'hozir';
  if (s < 60) return s + ' s oldin';
  if (s < 3600) return Math.floor(s / 60) + ' daq oldin';
  return Math.floor(s / 3600) + ' soat oldin';
}

// Joriy ekrandagi Firebase tinglovchilari — ekran almashganda o'chiriladi
let tinglovchilar = [];
function tingla(ref, fn) {
  const cb = (snap) => fn(snap.val());
  ref.on('value', cb);
  tinglovchilar.push(() => ref.off('value', cb));
}
let tozalovchilar = [];
function ekranniTozala() {
  tinglovchilar.forEach((f) => { try { f(); } catch (_) {} });
  tozalovchilar.forEach((f) => { try { f(); } catch (_) {} });
  tinglovchilar = []; tozalovchilar = [];
  document.querySelectorAll('.overlay').forEach((o) => o.remove());
}

// ---------------------------------------------------------------- Python (Pyodide, alohida worker'da)
class PyRunner {
  constructor() {
    this.n = 0; this.joriy = null; this.holat = 'yuklanmoqda'; this.kuzat = new Set();
    this.fayllar = []; this.faylKuzat = new Set(); this.fsKutish = new Map(); this.fsN = 0; this.saqlanadi = false;
    this._yarat();
  }
  _yarat() {
    this.holat = 'yuklanmoqda'; this._xabar();
    this.w = new Worker(new URL('py-worker.js?v=2', document.baseURI));
    this.w.onmessage = (e) => this._msg(e.data);
    this.w.onerror = () => { this.holat = 'xato'; this._xabar(); };
  }
  _xabar() { this.kuzat.forEach((f) => { try { f(this.holat); } catch (_) {} }); }
  _taymer(j) { j.t0 = performance.now(); clearTimeout(j.timer); j.timer = setTimeout(() => this.stop('vaqt'), VAQT_CHEGARASI); }
  _fayllar(list) { this.fayllar = list || []; this.faylKuzat.forEach((f) => { try { f(this.fayllar); } catch (_) {} }); }
  _msg(d) {
    const j = this.joriy;
    if (d.tur === 'tayyor') {
      this.holat = 'tayyor'; this.saqlanadi = !!d.fayllarSaqlanadi; this._xabar();
    } else if (d.tur === 'yuklanmadi') {
      this.holat = 'xato'; this._xabar();
      if (j) { this.joriy = null; j.resolve({ ok: false, xato: "Python yuklanmadi. Internetni tekshirib, sahifani yangilang." }); }
    } else if (d.tur === 'boshlandi') {
      if (j && j.id === d.id) this._taymer(j); // vaqt chegarasi kutubxonalar yuklangandan keyin hisoblanadi
    } else if (d.tur === 'stdout' || d.tur === 'stderr' || d.tur === 'info') {
      if (j) j.onChunk(d.matn, d.tur);
    } else if (d.tur === 'rasm') {
      if (j && j.id === d.id && j.onRasm) j.onRasm(d.data);
    } else if (d.tur === 'fayllar') {
      this._fayllar(d.list);
    } else if (d.tur === 'fsJavob') {
      const k = this.fsKutish.get(d.sid);
      if (k) { this.fsKutish.delete(d.sid); d.xato ? k.reject(new Error(d.xato)) : k.resolve(d.natija); }
    } else if (d.tur === 'tugadi') {
      if (!j || j.id !== d.id) return;
      clearTimeout(j.timer); this.joriy = null;
      j.resolve({ ok: d.ok, xato: d.xato, ms: j.timer ? performance.now() - j.t0 : 0 });
    }
  }
  run(kod, kirish, argv, onChunk, onRasm) {
    if (this.joriy) this.stop('toxtatildi');
    return new Promise((resolve) => {
      const j = { id: ++this.n, resolve, onChunk, onRasm, t0: performance.now(), timer: null };
      this.joriy = j;
      this.w.postMessage({ tur: 'run', id: j.id, kod, kirish, argv });
    });
  }
  stop(sabab) {
    const j = this.joriy;
    if (!j) return;
    clearTimeout(j.timer); this.joriy = null;
    this.w.terminate();
    this.fsKutish.forEach((k) => k.reject(new Error("Python qayta ishga tushirildi")));
    this.fsKutish.clear();
    this._yarat();
    j.resolve({ ok: false, toxtatildi: true, sabab, ms: performance.now() - j.t0 });
  }
  fs(amal, params = {}) {
    return new Promise((resolve, reject) => {
      const sid = ++this.fsN;
      this.fsKutish.set(sid, { resolve, reject });
      this.w.postMessage({ tur: 'fs', sid, amal, ...params });
    }).then((r) => { if (Array.isArray(r)) this._fayllar(r); return r; });
  }
}
let pyRunner = null;
const runner = () => (pyRunner || (pyRunner = new PyRunner()));

function pyHolatPill(el) {
  const f = (h) => {
    if (!el.isConnected) { runner().kuzat.delete(f); return; }
    el.className = 'pill ' + (h === 'tayyor' ? 'ok' : h === 'xato' ? 'err' : 'warn');
    el.textContent = h === 'tayyor' ? '🐍 Python tayyor' : h === 'xato' ? '🐍 Python yuklanmadi' : '🐍 Python yuklanmoqda…';
  };
  runner().kuzat.add(f); f(runner().holat);
}

const MASLAHATLAR = [
  [/No module named '_?tkinter'/, () => "Tkinter (grafik oyna) brauzerda ishlamaydi. Hisob funksiyalarini shu yerda yozib tekshiring, oynali ilovani esa kompyuteringizdagi Python (IDLE yoki VS Code) da ishga tushiring."],
  [/FileNotFoundError: .*'([^']+)'/, (m) => `'${m[1]}' fayli topilmadi. Avval uni yarating: generator dasturini ishga tushiring yoki «📁 Fayllar» bo'limida «Yangi fayl» tugmasini bosing. Fayl nomi aynan bir xil bo'lishi kerak.`],
  [/IndentationError|TabError/, () => "Chekinish xatosi: if, for, while, def, else qatoridan keyingi qatorlar 4 ta bo'sh joy bilan ichkariga surilgan bo'lishi kerak, bir blokdagi qatorlar esa bir xil surilishi kerak."],
  [/SyntaxError: expected ':'/, () => "if, elif, else, for, while, def qatorining oxiriga ikki nuqta ( : ) qo'yilmagan."],
  [/SyntaxError: .*(never closed|unexpected EOF|unterminated string)/, () => "Qavs yoki qo'shtirnoq yopilmagan: ( ) [ ] { } va \" \" ' ' juftligini tekshiring."],
  [/SyntaxError: invalid syntax\. Maybe you meant '==' /, () => "Solishtirish uchun = emas, == yoziladi."],
  [/SyntaxError/, () => "Sintaksis xatosi: ko'rsatilgan qatorda yozish qoidasi buzilgan (qavslar, qo'shtirnoqlar, : belgisi, = va == ni tekshiring)."],
  [/NameError: name '([^']+)'/, (m) => `'${m[1]}' degan nom topilmadi: o'zgaruvchi oldin qiymat olmagan yoki nomi xato yozilgan (katta-kichik harf ham farq qiladi).`],
  [/can only concatenate str|'str' and 'int'|'int' and 'str'|'str' and 'float'|'float' and 'str'/, () => "Matn (str) bilan son ustida amal bajarib bo'lmaydi. input() har doim matn qaytaradi — int(input()) yoki float(input()) yozing."],
  [/TypeError/, () => "Tur xatosi: amal noto'g'ri turdagi qiymatga qo'llandi (masalan, matn va son yoki argumentlar soni noto'g'ri)."],
  [/ValueError: (invalid literal for int|could not convert string to float)/, () => "Kiritilgan qiymatni songa aylantirib bo'lmadi. «Kiruvchi ma'lumotlar» maydonidagi qatorlarni tekshiring (o'nli kasr uchun nuqta ishlating: 2.5)."],
  [/ZeroDivisionError/, () => "Nolga bo'lish mumkin emas. Bo'luvchi 0 bo'lib qolgan holatni tekshiring."],
  [/EOFError/, () => "input() ko'proq ma'lumot so'radi. «Kiruvchi ma'lumotlar» maydoniga har bir input() uchun bittadan qator yozing."],
  [/IndexError/, () => "Ro'yxat (yoki satr) chegarasidan chiqib ketildi: indeks uzunlikdan katta yoki teng."],
  [/KeyError/, () => "Lug'atda bunday kalit yo'q."],
  [/ModuleNotFoundError/, () => "Bunday modul topilmadi (brauzerdagi Python'da hamma kutubxonalar ham bo'lmaydi)."],
  [/RecursionError/, () => "Rekursiya juda chuqurlashib ketdi: funksiyaning to'xtash sharti bormi?"],
  [/AttributeError/, () => "Bu obyektda bunday metod yoki xususiyat yo'q — nomini tekshiring."],
];
function maslahat(xato) {
  for (const [re, f] of MASLAHATLAR) { const m = re.exec(xato); if (m) return f(m); }
  return '';
}
function xatoQatori(xato) {
  const m = /File "kod", line (\d+)(?![\s\S]*File "kod", line)/.exec(xato || '');
  return m ? +m[1] : 0;
}

// Konsol (chiqish oynasi)
class Konsol {
  constructor(el) { this.el = el; this.matn = ''; }
  tozala() { this.el.innerHTML = ''; this.matn = ''; }
  qosh(matn, cls = '') {
    if (!matn) return;
    this.matn += matn;
    const oxirgi = this.el.lastChild;
    if (oxirgi && oxirgi.dataset && oxirgi.dataset.c === cls) oxirgi.textContent += matn;
    else { const s = document.createElement('span'); s.dataset.c = cls; if (cls) s.className = cls; s.textContent = matn; this.el.appendChild(s); }
    this.el.scrollTop = this.el.scrollHeight;
  }
  yangiQator() { if (this.matn && !this.matn.endsWith('\n')) this.qosh('\n'); }
  rasm(b64) {
    const img = document.createElement('img');
    img.src = 'data:image/png;base64,' + b64;
    img.className = 'kons-rasm';
    img.alt = 'grafik';
    img.title = 'Kattalashtirish uchun bosing';
    img.onclick = () => rasmniOch(img.src);
    this.el.appendChild(img);
    this.el.appendChild(document.createElement('span')).dataset.c = '#';
    this.el.scrollTop = this.el.scrollHeight;
  }
}

function rasmniOch(src) {
  const ov = document.createElement('div');
  ov.className = 'modal-fon';
  ov.innerHTML = `<div class="modal" style="max-width:1100px"><div class="row"><b style="flex:1">Grafik</b>
    <a class="btn outline sm" download="grafik.png" href="${src}">⬇ Yuklab olish</a><button class="btn sm" data-yop>Yopish</button></div>
    <img src="${src}" style="max-width:100%;margin-top:10px;background:#fff;border-radius:8px"></div>`;
  ov.onclick = (e) => { if (e.target === ov || e.target.dataset.yop != null) ov.remove(); };
  document.body.appendChild(ov);
}

// Kodni ishga tushirib, natijani konsolga chiqaradi. Natija: { ok, chiqish, xato, ms, rasmlar }
async function ishgaTushir(kod, kirish, argv, konsol, cm) {
  konsol.tozala();
  if (cm) xatoBelgisiniOlib(cm);
  if (!kod.trim()) { konsol.qosh("Kod bo'sh — avval kod yozing.\n", 'info'); return null; }
  if (runner().holat !== 'tayyor') konsol.qosh('Python yuklanmoqda, biroz kuting…\n', 'info');
  let chiqish = '', rasmlar = 0;
  const r = await runner().run(kod, kirish, argv,
    (matn, tur) => { if (tur !== 'info') chiqish += matn; konsol.qosh(matn, tur === 'stderr' ? 'err' : tur === 'info' ? 'info' : ''); },
    (b64) => { rasmlar++; konsol.rasm(b64); });
  konsol.yangiQator();
  if (r.ok) {
    konsol.qosh(`✓ Dastur tugadi (${(r.ms / 1000).toFixed(2)} s)\n`, 'done');
  } else if (r.toxtatildi) {
    konsol.qosh(r.sabab === 'vaqt'
      ? `⏱ Dastur ${VAQT_CHEGARASI / 1000} soniyada tugamadi va to'xtatildi. Cheksiz sikl (while) bo'lishi mumkin.\n`
      : "■ To'xtatildi\n", 'err');
  } else {
    konsol.qosh(r.xato + '\n', 'err');
    const m = maslahat(r.xato);
    if (m) konsol.qosh('💡 ' + m + '\n', 'hint');
    const q = xatoQatori(r.xato);
    if (cm && q) xatoBelgila(cm, q);
  }
  if (rasmlar) chiqish += `\n[${rasmlar} ta grafik chizildi]\n`;
  const xato = r.ok ? '' : (r.toxtatildi ? (r.sabab === 'vaqt' ? 'Vaqt tugadi (cheksiz sikl?)' : "To'xtatildi") : r.xato);
  return { ok: !!r.ok, chiqish, xato, ms: Math.round(r.ms || 0), rasmlar };
}

// ---------------------------------------------------------------- kod muharriri
function muharrir(el, { readOnly = false, onChange, onRun } = {}) {
  const keys = {
    Tab: (cm) => cm.somethingSelected() ? cm.indentSelection('add') : cm.replaceSelection('    ', 'end'),
    'Shift-Tab': (cm) => cm.indentSelection('subtract'),
    'Ctrl-Enter': () => onRun && onRun(),
    'Cmd-Enter': () => onRun && onRun(),
  };
  let cm;
  if (window.CodeMirror) {
    cm = CodeMirror(el, {
      value: '', mode: 'python', lineNumbers: true, indentUnit: 4, tabSize: 4, indentWithTabs: false,
      matchBrackets: true, readOnly, extraKeys: keys, lineWrapping: false, autofocus: false,
    });
    cm.on('change', (_, ch) => { if (ch.origin !== 'setValue') { xatoBelgisiniOlib(cm); onChange && onChange(cm.getValue()); } });
  } else {
    // CodeMirror yuklanmasa — oddiy matn maydoni
    const ta = document.createElement('textarea');
    ta.className = 'fallback-editor mono'; ta.spellcheck = false; ta.readOnly = readOnly;
    el.appendChild(ta);
    ta.addEventListener('input', () => onChange && onChange(ta.value));
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') { e.preventDefault(); const s = ta.selectionStart; ta.setRangeText('    ', s, ta.selectionEnd, 'end'); onChange && onChange(ta.value); }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); onRun && onRun(); }
    });
    cm = {
      getValue: () => ta.value, setValue: (v) => { ta.value = v; },
      setOption: (k, v) => { if (k === 'readOnly') ta.readOnly = !!v; },
      getCursor: () => ta.selectionStart, setCursor: (p) => { try { ta.setSelectionRange(p, p); } catch (_) {} },
      getScrollInfo: () => ({ left: ta.scrollLeft, top: ta.scrollTop }), scrollTo: (l, t) => { ta.scrollLeft = l; ta.scrollTop = t; },
      refresh() {}, focus: () => ta.focus(), lineCount: () => ta.value.split('\n').length, fallback: true,
    };
  }
  return cm;
}
function masofadanQoy(cm, matn) {
  matn = matn || '';
  if (cm.getValue() === matn) return;
  const kursor = cm.getCursor(), sc = cm.getScrollInfo();
  cm.setValue(matn);
  try { cm.setCursor(kursor); cm.scrollTo(sc.left, sc.top); } catch (_) {}
}
function xatoBelgila(cm, qator) {
  if (cm.fallback || !cm.addLineClass) return;
  const i = Math.min(qator - 1, cm.lineCount() - 1);
  cm.addLineClass(i, 'background', 'cm-err-line');
  cm.__xatoQator = i;
}
function xatoBelgisiniOlib(cm) {
  if (cm.__xatoQator != null && cm.removeLineClass) { try { cm.removeLineClass(cm.__xatoQator, 'background', 'cm-err-line'); } catch (_) {} cm.__xatoQator = null; }
}
(function () {
  const st = document.createElement('style');
  st.textContent = '.cm-err-line{background:var(--err-bg)!important}';
  document.head.appendChild(st);
})();

// Kodni Firebase'ga kechiktirib saqlash. pending=true bo'lsa, masofadan kelgan qiymat muharrirga qo'yilmaydi.
class Sinxron {
  constructor(ref, muallif, holatEl) { this.ref = ref; this.muallif = muallif; this.el = holatEl; this.timer = null; this.pending = false; this.matn = ''; }
  yozildi(matn) {
    this.matn = matn; this.pending = true;
    if (this.el) this.el.textContent = 'saqlanmoqda…';
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.yubor(), SAQLASH_KECHIKISHI);
  }
  yubor() {
    clearTimeout(this.timer);
    if (!this.pending) return Promise.resolve();
    const matn = this.matn;
    return this.ref.update({ kod: matn, vaqt: TS, muallif: this.muallif }).then(() => {
      if (this.matn === matn) { this.pending = false; if (this.el) this.el.textContent = 'saqlandi ✓'; }
    }).catch(() => { if (this.el) this.el.textContent = "saqlanmadi — internetni tekshiring"; });
  }
  bekor() { clearTimeout(this.timer); this.pending = false; }
}

// ---------------------------------------------------------------- masala bloki va fayllar paneli
// Variant ma'lumotlari, topshiriqlar, nazariya va namuna dasturlar
function masalaHTML(am, vi, q) {
  if (q) {
    return `<div class="vbox star"><div class="vbox-sar">⭐ ${esc(q.sarlavha || "Qo'shimcha masala")}</div><div class="problem">${esc(q.matn || '')}</div></div>
      <div class="small muted">Bu ustoz faqat sizga yuborgan qo'shimcha (qiyinroq) masala. Asosiy vazifa «Asosiy vazifa» tabida qoladi.</div>`;
  }
  const vr = vi != null ? am.variantlar[vi % am.variantlar.length] : null;
  const nm = am.namunalar || [];
  return `
    <div class="vbox"><div class="vbox-sar">${vr ? `Variant ${vi + 1} — boshlang'ich ma'lumotlar` : 'Variant tayinlanmoqda…'}</div>${vr ? `<div class="problem">${esc(vr.matn)}</div>` : ''}</div>
    ${am.topshiriq ? `<div><div class="h3">Topshiriqlar</div><div class="problem">${esc(am.topshiriq)}</div></div>` : ''}
    ${am.eslatma ? `<div class="banner warn small">${esc(am.eslatma)}</div>` : ''}
    ${am.nazariy ? `<button class="nazariy-btn" data-nazariy>📘 Nazariy ma'lumot, formulalar va jadvallar <span>ochish →</span></button>` : ''}
    ${nm.length ? `<details class="ref"><summary>📄 Namuna dasturlar (${nm.length})</summary>${nm.map((n, i) => `
      <div class="namuna">
        <div class="row" style="gap:6px"><b class="mono" style="flex:1;min-width:120px">${esc(n.nomi)}</b>
          <button class="btn outline sm" data-nm="${i}" data-amal="muharrir" title="Kodni muharrirga qo'yish">Muharrirga</button>
          <button class="btn outline sm" data-nm="${i}" data-amal="fayl" title="${esc(n.nomi)} nomli fayl qilib saqlash (import qilish yoki o'qish uchun)">Fayl qilib saqlash</button>
          <button class="btn outline sm" data-nm="${i}" data-amal="nusxa">Nusxa</button></div>
        ${n.izoh ? `<div class="small muted">${esc(n.izoh)}</div>` : ''}
        <pre class="code-pre">${esc(n.kod)}</pre>
      </div>`).join('')}</details>` : ''}`;
}
function nazariyOyna(am) {
  const ov = document.createElement('div');
  ov.className = 'modal-fon';
  ov.innerHTML = `<div class="modal" style="max-width:980px">
    <div class="row"><b style="flex:1">📘 ${esc(am.nomi)}</b><button class="btn sm" data-yop>Yopish</button></div>
    <div class="small muted" style="margin:4px 0 10px">Nazariy ma'lumot, formulalar va jadvallar</div>
    <pre class="nazariy-pre">${esc(am.nazariy)}</pre></div>`;
  const yop = () => { ov.remove(); document.removeEventListener('keydown', esc_); };
  const esc_ = (e) => { if (e.key === 'Escape') yop(); };
  ov.onclick = (e) => { if (e.target === ov || e.target.dataset.yop != null) yop(); };
  document.addEventListener('keydown', esc_);
  document.body.appendChild(ov);
}
function namunaTugmalari(root, am, muharrirga) {
  const nb = root.querySelector('[data-nazariy]');
  if (nb) nb.onclick = () => nazariyOyna(am);
  root.querySelectorAll('[data-nm]').forEach((b) => {
    const n = (am.namunalar || [])[+b.dataset.nm];
    if (!n) return;
    if (b.dataset.amal === 'muharrir' && !muharrirga) { b.remove(); return; }
    b.onclick = async () => {
      if (b.dataset.amal === 'nusxa') {
        try { await navigator.clipboard.writeText(n.kod); toast('Nusxa olindi'); } catch (_) { toast("Nusxa olib bo'lmadi — matnni belgilab nusxalang"); }
      } else if (b.dataset.amal === 'muharrir') {
        muharrirga(n.kod);
      } else {
        try { await runner().fs('yoz', { nom: n.nomi, matn: n.kod }); toast(`📁 ${n.nomi} fayli saqlandi`); } catch (e) { toast(e.message); }
      }
    };
  });
}

const hajmMatn = (b) => (b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB');
const faylBelgi = (n) => (/\.py$/i.test(n) ? '🐍' : /\.(png|jpe?g|gif|svg)$/i.test(n) ? '🖼️' : /\.(xlsx?|csv)$/i.test(n) ? '📊' : /\.json$/i.test(n) ? '🧾' : '📄');
const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml', csv: 'text/csv', json: 'application/json', txt: 'text/plain', py: 'text/x-python', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
const mimeTuri = (n) => MIME[(String(n).split('.').pop() || '').toLowerCase()] || 'application/octet-stream';

function faylPaneli(el) {
  el.innerHTML = `<div class="row"><h2 style="margin:0;flex:1">📁 Fayllar</h2><button class="btn outline sm" data-yangi>+ Yangi fayl</button></div>
    <div class="small muted" data-izoh style="margin-top:4px"></div><div class="fayl-list" data-list></div>`;
  const chiz = (list) => {
    if (!el.isConnected) { runner().faylKuzat.delete(chiz); return; }
    el.querySelector('[data-izoh]').textContent = runner().saqlanadi
      ? "Dastur yaratgan va siz qo'shgan fayllar shu brauzerda saqlanadi (open(), csv, json, savefig…)."
      : "Fayllar sahifa yangilanguncha saqlanadi.";
    const l = el.querySelector('[data-list]');
    l.innerHTML = list.length
      ? list.map((f) => `<button class="fayl" data-f="${esc(f.nom)}"><span class="mono">${faylBelgi(f.nom)} ${esc(f.nom)}</span><span class="small muted">${hajmMatn(f.hajm)}</span></button>`).join('')
      : `<div class="small muted">Hozircha fayl yo'q.</div>`;
    l.querySelectorAll('[data-f]').forEach((b) => { b.onclick = () => faylOyna(b.dataset.f); });
  };
  runner().faylKuzat.add(chiz);
  chiz(runner().fayllar);
  el.querySelector('[data-yangi]').onclick = () => faylOyna(null);
}

async function faylOyna(nom) {
  const yangi = !nom;
  const rasmmi = /\.(png|jpe?g|gif|svg)$/i.test(nom || '');
  let data = null, matn = '', matnmi = true;
  if (!yangi) {
    try { data = await runner().fs('oqi', { nom }); } catch (e) { toast(e.message); return; }
    if (!rasmmi) { try { matn = new TextDecoder('utf-8', { fatal: true }).decode(data); } catch (_) { matnmi = false; } }
  }
  const url = data ? URL.createObjectURL(new Blob([data], { type: mimeTuri(nom) })) : null;
  const katta = matnmi && matn.length > 300000;
  const ov = document.createElement('div');
  ov.className = 'modal-fon';
  ov.innerHTML = `<div class="modal stack">
    <div class="row"><b style="flex:1;word-break:break-all">${yangi ? 'Yangi fayl' : faylBelgi(nom) + ' ' + esc(nom)}</b>
      ${url ? `<a class="btn outline sm" download="${esc(nom.split('/').pop())}" href="${url}">⬇ Yuklab olish</a>` : ''}
      ${!yangi ? `<button class="btn red sm" data-och>O'chirish</button>` : ''}
      <button class="btn sm" data-yop>Yopish</button></div>
    ${yangi ? `<div><label class="lbl">Fayl nomi</label><input type="text" data-nom placeholder="masalan: tarmoq_v7.json yoki energetika.py" spellcheck="false"></div>` : ''}
    ${rasmmi ? `<img src="${url}" alt="${esc(nom)}" style="max-width:100%;background:#fff;border-radius:8px">`
      : matnmi ? `<textarea class="mono" data-matn rows="18" spellcheck="false" ${katta ? 'readonly' : ''}></textarea>
          <div class="row"><button class="btn blue sm" data-saqla ${katta ? 'disabled' : ''}>Saqlash</button>
          <span class="small muted">${data ? hajmMatn(data.length) : ''}${katta ? ' — juda katta, faqat ko\'rish mumkin' : ''}</span></div>`
      : `<p class="muted">Bu fayl matn emas (masalan, Excel). Uni yuklab olib, kompyuteringizda oching.</p>`}
  </div>`;
  document.body.appendChild(ov);
  const yop = () => { if (url) URL.revokeObjectURL(url); ov.remove(); };
  ov.onclick = (e) => { if (e.target === ov) yop(); };
  ov.querySelector('[data-yop]').onclick = yop;
  const ta = ov.querySelector('[data-matn]');
  if (ta) { ta.value = katta ? matn.slice(0, 300000) : matn; ta.onkeydown = (e) => { if (e.key === 'Tab') { e.preventDefault(); ta.setRangeText('    ', ta.selectionStart, ta.selectionEnd, 'end'); } }; }
  const sq = ov.querySelector('[data-saqla]');
  if (sq) sq.onclick = async () => {
    const n = yangi ? ov.querySelector('[data-nom]').value.trim() : nom;
    if (!n) { toast('Fayl nomini yozing'); return; }
    if (yangi && runner().fayllar.some((f) => f.nom === n) && !confirm(`${n} allaqachon bor. Ustidan yozilsinmi?`)) return;
    try { await runner().fs('yoz', { nom: n, matn: ta.value }); toast(`📁 ${n} saqlandi`); yop(); } catch (e) { toast(e.message); }
  };
  const och = ov.querySelector('[data-och]');
  if (och) och.onclick = async () => {
    if (!confirm(`${nom} o'chirilsinmi?`)) return;
    try { await runner().fs('ochir', { nom }); yop(); } catch (e) { toast(e.message); }
  };
  if (yangi) ov.querySelector('[data-nom]').focus();
}

// ---------------------------------------------------------------- 1) rol tanlash
function rolTanlash() {
  ekranniTozala();
  $app.innerHTML = `
    <div class="welcome">
      <div class="center">
        <h1 style="font-size:26px">🐍 Python Dars</h1>
        <p class="muted">Amaliy mashg'ulotlarda Python kodini yozish va ustoz nazorati</p>
      </div>
      <div class="role-grid">
        <button class="btn blue role-btn" data-r="talaba">🎓 Talaba<span>vazifani bajarish</span></button>
        <button class="btn role-btn" data-r="ustoz">👩‍🏫 Ustoz<span>kuzatish va boshqarish</span></button>
      </div>
    </div>`;
  $app.querySelectorAll('[data-r]').forEach((b) => {
    b.onclick = () => (b.dataset.r === 'talaba' ? talabaKirish() : ustozKirish());
  });
}

// ---------------------------------------------------------------- 2) talaba kirishi
function talabaKirish() {
  ekranniTozala();
  const oldingi = saqla.get('pydars_talaba') || {};
  $app.innerHTML = `
    <div class="welcome card stack">
      <h1>🎓 Talaba sifatida kirish</h1>
      <div><label class="lbl" for="ism">Familiya va ism</label><input type="text" id="ism" autocomplete="name" placeholder="Masalan: Karimov Anvar" value="${esc(oldingi.ism || '')}"></div>
      <div><label class="lbl" for="guruh">Guruh</label><input type="text" id="guruh" placeholder="Masalan: 16Sa-23" value="${esc(oldingi.guruh || '')}"></div>
      <p class="small muted">Boshqa kompyuterdan kirsangiz ham, xuddi shu ism va guruhni yozsangiz — ishingiz saqlanib qoladi.</p>
      <div class="row"><button class="btn blue" id="kir">Kirish</button><button class="btn outline" id="orqa">Orqaga</button></div>
    </div>`;
  const kir = () => {
    const ism = $('#ism').value.trim().replace(/\s+/g, ' ');
    const guruh = $('#guruh').value.trim().replace(/\s+/g, ' ');
    if (ism.length < 3 || !slug(ism)) { toast('Familiya va ismingizni yozing'); $('#ism').focus(); return; }
    if (!guruh || !slug(guruh)) { toast('Guruhingizni yozing'); $('#guruh').focus(); return; }
    saqla.set('pydars_talaba', { ism, guruh });
    saqla.set('pydars_rol', 'talaba');
    talabaEkrani({ ism, guruh, sid: slug(guruh) + '__' + slug(ism) });
  };
  $('#kir').onclick = kir;
  $('#guruh').onkeydown = (e) => { if (e.key === 'Enter') kir(); };
  $('#ism').onkeydown = (e) => { if (e.key === 'Enter') $('#guruh').focus(); };
  $('#orqa').onclick = rolTanlash;
  if (!oldingi.ism) $('#ism').focus();
}

// Onlayn holatini kuzatish (talaba yopilsa yoki internet uzilsa — offline bo'ladi)
let presenceOchir = null;
function presence(sid, profil) {
  if (presenceOchir) presenceOchir();
  const ref = R('talabalar/' + sid);
  const con = db.ref('.info/connected');
  const cb = (s) => {
    if (s.val() !== true) return;
    ref.onDisconnect().update({ online: false, oxirgi: TS }).then(() => ref.update({ ...profil, online: true, oxirgi: TS }));
  };
  con.on('value', cb);
  presenceOchir = () => { con.off('value', cb); ref.onDisconnect().cancel(); ref.update({ online: false, oxirgi: TS }); presenceOchir = null; };
}

// ---------------------------------------------------------------- 3) talaba ekrani
function talabaEkrani(t) {
  ekranniTozala();
  runner();
  presence(t.sid, { ism: t.ism, guruh: t.guruh });
  let sinf = null;
  let joriyA = undefined; // ko'rsatilayotgan amaliyot id

  tingla(R('sinf'), (s) => {
    sinf = s || {};
    const a = sinf.amaliyotId && amaliyot(sinf.amaliyotId) ? sinf.amaliyotId : null;
    if (a !== joriyA) { joriyA = a; ish.ochir(); a ? ish.qur(a) : kutish(); }
  });

  function kutish() {
    $app.innerHTML = `
      <div class="topbar">
        <div class="title"><h1>🎓 ${esc(t.ism)}</h1><div class="muted small">${esc(t.guruh)}</div></div>
        <span class="spacer"></span><span class="pill" id="pyHolat"></span>
        <button class="btn outline sm" id="chiqish">Chiqish</button>
      </div>
      <div class="card empty"><div style="font-size:34px">⏳</div><p>Ustoz bugungi amaliyotni boshlashini kuting…</p>
      <p class="small">Amaliyot boshlanishi bilan vazifangiz shu yerda avtomatik paydo bo'ladi.</p></div>`;
    pyHolatPill($('#pyHolat'));
    $('#chiqish').onclick = chiqish;
  }

  function chiqish() {
    if (!confirm('Chiqasizmi? Ishingiz saqlangan, qayta kirsangiz davom ettirasiz.')) return;
    ish.ochir();
    if (presenceOchir) presenceOchir();
    saqla.del('pydars_rol');
    rolTanlash();
  }

  // Amaliyot ichidagi ish maydoni
  const ish = {
    ochirgichlar: [],
    ochir() { this.ochirgichlar.forEach((f) => { try { f(); } catch (_) {} }); this.ochirgichlar = []; },
    qur(aId) {
      const am = amaliyot(aId);
      const ishRef = R(`ish/${aId}/${t.sid}`);
      let d = {};          // pydars/ish/{a}/{sid} dagi ma'lumot
      let tab = 'asosiy';
      let yopilganIzoh = 0;
      let oldingiQosh = null, oldingiTahrir = null;
      let birinchi = true;

      $app.innerHTML = `
        <div class="topbar">
          <div class="title"><h1>🎓 ${esc(t.ism)}</h1><div class="muted small">${esc(t.guruh)} · ${esc(am.nomi)}</div></div>
          <span class="spacer"></span>
          <span class="pill" id="pyHolat"></span>
          <span class="pill blue" id="varPill">Variant …</span>
          <button class="btn outline sm" id="chiqish">Chiqish</button>
        </div>
        <div id="bannerlar" class="stack" style="margin-bottom:12px"></div>
        <div class="work">
          <div class="card stack">
            <div class="row">
              <button class="btn warn sm" id="yordamBtn">✋ Yordam so'rash</button>
              <button class="btn outline sm" id="tayyorBtn">✅ Bajardim</button>
              <span class="small muted" id="holatMatn"></span>
            </div>
            <div id="masalaBlok" class="stack"><div class="muted">Variant tayinlanmoqda…</div></div>
          </div>
          <div class="stack">
          <div class="card stack">
            <div class="tabs" id="tablar"></div>
            <div class="editor-wrap" id="edWrap"></div>
            <div class="row small muted"><span id="saqlashHolat">avtomatik saqlanadi</span><span class="spacer"></span><span>Ctrl+Enter — ishga tushirish</span></div>
            <div><label class="lbl" for="kirish">Kiruvchi ma'lumotlar — input() uchun, har qatorga bittadan</label>
              <textarea id="kirish" class="mono" rows="3" spellcheck="false"></textarea></div>
            <div class="row small" style="gap:6px"><label class="muted" for="argv">Argumentlar (sys.argv):</label>
              <span class="mono muted">python kod.py</span><input type="text" id="argv" class="mono argv" spellcheck="false" placeholder="bo'sh"></div>
            <div class="row">
              <button class="btn green" id="runBtn">▶ Ishga tushirish</button>
              <button class="btn outline" id="stopBtn" disabled>■ To'xtatish</button>
              <span class="spacer"></span>
              <button class="btn outline sm" id="tozalaBtn">Konsolni tozalash</button>
            </div>
            <div class="console" id="konsol"><span class="info">Natija shu yerda chiqadi.</span></div>
          </div>
          <div class="card" id="faylPanel"></div>
          </div>
        </div>`;
      pyHolatPill($('#pyHolat'));
      $('#chiqish').onclick = chiqish;

      const konsol = new Konsol($('#konsol'));
      faylPaneli($('#faylPanel'));
      let masalaKalit = null;
      const saqlashEl = $('#saqlashHolat');
      const sync = {
        asosiy: new Sinxron(ishRef.child('fayllar/asosiy'), 'talaba', saqlashEl),
        qoshimcha: new Sinxron(ishRef.child('fayllar/qoshimcha'), 'talaba', saqlashEl),
      };
      const cm = muharrir($('#edWrap'), { onChange: (v) => { if (!qulflangan()) sync[tab].yozildi(v); }, onRun: run });
      const qulflangan = () => d.ustozTahrir === tab;

      // Variant olish (tasodifiy boshlanish + navbat bilan, shunda yonma-yon o'tirganlar har xil variant oladi)
      (async () => {
        const v = await ishRef.child('variant').once('value');
        if (v.val() != null) return;
        const n = am.variantlar.length;
        const r = await R(`sinf/navbat/${aId}`).transaction((x) => (x || 0) + 1);
        const tartib = (r.snapshot.val() || 1) - 1;
        const bosh = (sinf && sinf.boshVariant) || 0;
        await ishRef.child('variant').transaction((x) => (x == null ? (bosh + tartib) % n : x));
        ishRef.update({ ism: t.ism, guruh: t.guruh });
      })().catch(() => toast("Variant olishda xato — sahifani yangilang"));

      const yangila = () => {
        // Variant va masala
        const vi = d.variant;
        const vr = vi != null ? am.variantlar[vi % am.variantlar.length] : null;
        $('#varPill').textContent = vi != null ? `Variant ${vi + 1}` : 'Variant …';
        const q = d.qoshimcha;
        if (tab === 'qoshimcha' && !q) tab = 'asosiy';
        const mk = tab === 'asosiy' ? 'a' + vi : 'q' + (q && q.vaqt);
        if (mk !== masalaKalit) {
          masalaKalit = mk;
          $('#masalaBlok').innerHTML = masalaHTML(am, vi, tab === 'qoshimcha' ? q : null);
          namunaTugmalari($('#masalaBlok'), am, (kod) => {
            if (qulflangan()) { toast('Ustoz hozir kodingizni tuzatmoqda'); return; }
            if (cm.getValue().trim() && !confirm("Muharrirdagi kod namuna bilan almashtirilsinmi? (Hozirgi kodingiz o'chadi)")) return;
            cm.setValue(kod); sync[tab].yozildi(kod); cm.focus();
          });
        }
        // Tablar
        $('#tablar').innerHTML = `<button class="tab ${tab === 'asosiy' ? 'active' : ''}" data-t="asosiy">Asosiy vazifa</button>` +
          (q ? `<button class="tab star ${tab === 'qoshimcha' ? 'active' : ''}" data-t="qoshimcha">⭐ Qo'shimcha masala</button>` : '');
        $('#tablar').querySelectorAll('[data-t]').forEach((b) => { b.onclick = () => tabAlmashtir(b.dataset.t); });
        // Kod (masofadan) — o'zimiz yozib turgan bo'lsak, ustiga yozmaymiz
        const f = (d.fayllar && d.fayllar[tab]) || {};
        if (!sync[tab].pending) masofadanQoy(cm, f.kod || '');
        // Kiruvchi ma'lumotlar: talaba o'zi o'zgartirmagan bo'lsa, saqlangan yoki namunaviy qiymat qo'yiladi
        const kEl = $('#kirish');
        const kQiymat = f.kirish != null ? f.kirish : ((tab === 'asosiy' ? (vr && vr.kirish) : (q && q.kirish)) || '');
        if (kirishTab !== tab || (document.activeElement !== kEl && kEl.value === (kEl.dataset.v || '') && kEl.value !== kQiymat)) {
          kEl.value = kQiymat; kEl.dataset.v = kQiymat;
        }
        const aEl = $('#argv');
        const aQiymat = f.argv != null ? f.argv : (tab === 'asosiy' && am.argvVariant && vi != null ? String(vi + 1) : '');
        if (kirishTab !== tab || (document.activeElement !== aEl && aEl.value === (aEl.dataset.v || '') && aEl.value !== aQiymat)) {
          aEl.value = aQiymat; aEl.dataset.v = aQiymat;
        }
        kirishTab = tab;
        // Ustoz tahrirlayaptimi
        cm.setOption('readOnly', qulflangan());
        $('#edWrap').classList.toggle('locked', qulflangan());
        // Tugmalar
        $('#yordamBtn').textContent = d.yordam ? '✋ Yordam so\'raldi (bekor qilish)' : '✋ Yordam so\'rash';
        $('#yordamBtn').className = 'btn sm ' + (d.yordam ? 'outline' : 'warn');
        $('#tayyorBtn').textContent = d.tayyor ? '✅ Bajarildi (bekor qilish)' : '✅ Bajardim';
        $('#tayyorBtn').className = 'btn sm ' + (d.tayyor ? 'green' : 'outline');
        $('#holatMatn').textContent = d.qabul ? '✓ Ustoz ishingizni qabul qildi' : d.yordam ? "Ustozga yordam so'rovingiz yuborildi" : '';
        // Bannerlar
        const b = [];
        if (d.ustozTahrir) {
          b.push(`<div class="banner warn">✏️ <b>Ustoz hozir ${d.ustozTahrir === 'qoshimcha' ? "qo'shimcha masaladagi" : ''} kodingizni tuzatmoqda.</b> O'zgarishlarni jonli ko'rib turing — ustoz tugatgach, yana yozishingiz mumkin.</div>`);
        }
        if (d.izoh && d.izoh.matn && d.izoh.vaqt !== yopilganIzoh) {
          b.push(`<div class="banner blue"><div class="row"><div style="flex:1">💬 <b>Ustoz izohi:</b> ${esc(d.izoh.matn)}</div><button class="btn outline sm" id="izohYop">Yopish</button></div></div>`);
        }
        if (q && tab !== 'qoshimcha') {
          b.push(`<div class="banner star">⭐ <b>Ustoz sizga qo'shimcha masala yubordi:</b> ${esc(q.sarlavha || '')} <button class="btn star sm" id="qoshOch" style="margin-left:8px">Ochish</button></div>`);
        }
        $('#bannerlar').innerHTML = b.join('');
        const iy = $('#izohYop'); if (iy) iy.onclick = () => { yopilganIzoh = d.izoh.vaqt; yangila(); };
        const qo = $('#qoshOch'); if (qo) qo.onclick = () => tabAlmashtir('qoshimcha');
        // Bildirishnomalar
        if (!birinchi) {
          const qk = q ? q.vaqt : null;
          if (qk && qk !== oldingiQosh) toast("⭐ Ustoz sizga qo'shimcha masala yubordi");
          if (oldingiTahrir && !d.ustozTahrir) toast('Ustoz tuzatishni tugatdi — davom etishingiz mumkin');
        }
        oldingiQosh = q ? q.vaqt : null;
        oldingiTahrir = d.ustozTahrir || null;
        birinchi = false;
      };
      let kirishTab = null;

      function tabAlmashtir(yangi) {
        if (yangi === tab) return;
        sync[tab].yubor();
        tab = yangi;
        const f = (d.fayllar && d.fayllar[tab]) || {};
        masofadanQoy(cm, f.kod || '');
        konsol.tozala();
        if (f.ishga) konsol.qosh('Oxirgi natija:\n' + (f.ishga.chiqish || '') + (f.ishga.xato ? '\n' + f.ishga.xato : ''), f.ishga.xato ? 'err' : '');
        yangila();
        cm.refresh();
      }

      async function run() {
        if (runBtn.disabled) return;
        const t0 = tab;
        await sync[t0].yubor();
        const kod = cm.getValue(), kirish = $('#kirish').value, argv = $('#argv').value.trim();
        runBtn.disabled = true; stopBtn.disabled = false;
        const r = await ishgaTushir(kod, kirish, argv, konsol, cm);
        runBtn.disabled = false; stopBtn.disabled = true;
        if (!r) return;
        ishRef.child('fayllar/' + t0).update({
          kirish, argv,
          ishga: { ok: r.ok, chiqish: r.chiqish.slice(0, 4000), xato: (r.xato || '').slice(0, 2000), ms: r.ms, vaqt: TS },
        });
      }
      const runBtn = $('#runBtn'), stopBtn = $('#stopBtn');
      runBtn.onclick = run;
      stopBtn.onclick = () => runner().stop('toxtatildi');
      $('#tozalaBtn').onclick = () => konsol.tozala();
      $('#yordamBtn').onclick = () => ishRef.update({ yordam: d.yordam ? null : TS });
      $('#tayyorBtn').onclick = () => ishRef.update({ tayyor: d.tayyor ? null : TS });

      const cb = (snap) => {
        const eski = d.ustozTahrir;
        d = snap.val() || {};
        // Ustoz tahrirni boshlasa — saqlanmagan o'zgarishni darhol yuboramiz
        if (d.ustozTahrir && d.ustozTahrir !== eski && sync[d.ustozTahrir].pending) sync[d.ustozTahrir].yubor();
        yangila();
      };
      ishRef.on('value', cb);
      this.ochirgichlar.push(() => ishRef.off('value', cb), () => { sync.asosiy.yubor(); sync.qoshimcha.yubor(); });
    },
  };
  tozalovchilar.push(() => ish.ochir());
}

// ---------------------------------------------------------------- 4) ustoz kirishi (parol)
async function ustozKirish() {
  ekranniTozala();
  $app.innerHTML = `<div class="welcome card"><p class="muted center">Tekshirilmoqda…</p></div>`;
  let pin = null;
  try { pin = (await R('ustoz/pin').once('value')).val(); } catch (_) {}
  // Shu kompyuterda saqlangan parolning o'zi tekshiriladi (bazadagi xeshni nusxalab kirib bo'lmaydi)
  saqla.del('pydars_ustoz');
  const saqlangan = saqla.get('pydars_ustoz_p');
  if (pin && saqlangan && (await xesh(saqlangan)) === pin) { saqla.set('pydars_rol', 'ustoz'); ustozPaneli(); return; }
  if (saqlangan) saqla.del('pydars_ustoz_p');
  const yangi = !pin;
  $app.innerHTML = `
    <div class="welcome card stack">
      <h1>👩‍🏫 Ustoz sifatida kirish</h1>
      ${yangi ? `<p class="small muted">Birinchi marta kiryapsiz. Ustoz paneli uchun parol o'ylab toping — talabalar uni bilmasligi kerak.</p>` : ''}
      <div><label class="lbl" for="p1">${yangi ? 'Yangi parol' : 'Parol'}</label><input type="password" id="p1" autocomplete="${yangi ? 'new-password' : 'current-password'}"></div>
      ${yangi ? `<div><label class="lbl" for="p2">Parolni takrorlang</label><input type="password" id="p2" autocomplete="new-password"></div>` : ''}
      <div class="row"><button class="btn blue" id="kir">${yangi ? "Parolni o'rnatish va kirish" : 'Kirish'}</button><button class="btn outline" id="orqa">Orqaga</button></div>
    </div>`;
  const kir = async () => {
    const p1 = $('#p1').value;
    if (p1.length < 4) { toast("Parol kamida 4 belgidan iborat bo'lsin"); return; }
    const h = await xesh(p1);
    if (yangi) {
      if ($('#p2').value !== p1) { toast('Parollar mos emas'); return; }
      try { await R('ustoz/pin').set(h); }
      catch (_) { toast("Parol allaqachon o'rnatilgan — mavjud parol bilan kiring"); ustozKirish(); return; }
    } else if (h !== pin) { toast("Parol noto'g'ri"); $('#p1').select(); return; }
    saqla.set('pydars_ustoz_p', p1);
    saqla.set('pydars_rol', 'ustoz');
    ustozPaneli();
  };
  $('#kir').onclick = kir;
  $app.querySelectorAll('input').forEach((i) => { i.onkeydown = (e) => { if (e.key === 'Enter') kir(); }; });
  $('#orqa').onclick = rolTanlash;
  $('#p1').focus();
}

// ---------------------------------------------------------------- 5) ustoz paneli
function ustozPaneli() {
  ekranniTozala();
  runner();
  let sinf = {}, talabalar = {}, ishlar = {};
  let faolA = null, ishOchir = null;
  let faqatOnlayn = !!saqla.get('pydars_faqat_onlayn');
  let ochiq = null; // ochilgan talaba tafsiloti

  $app.innerHTML = `
    <div class="topbar">
      <div class="title"><h1>👩‍🏫 Ustoz paneli</h1><div class="muted small">Python Dars — talabalar ishini jonli kuzatish</div></div>
      <span class="spacer"></span>
      <span class="pill" id="pyHolat"></span>
      <button class="btn outline sm" id="chiqish">Chiqish</button>
    </div>
    <div class="card stack">
      <div class="row" style="align-items:flex-end">
        <div style="flex:1;min-width:240px"><label class="lbl" for="amSel">Bugungi amaliyot</label>
          <select id="amSel">${AMALIYOTLAR.map((a) => `<option value="${esc(a.id)}">${esc(a.nomi)} — ${a.variantlar.length} variant</option>`).join('')}</select></div>
        <button class="btn blue" id="boshla">▶ Boshlash va variantlarni tarqatish</button>
        <button class="btn outline" id="tugat">■ Tugatish</button>
      </div>
      <div class="small muted" id="faolMatn"></div>
    </div>
    <div class="row" style="margin-top:12px">
      <div class="stats" id="stats"></div>
      <span class="spacer"></span>
      <label class="small row" style="gap:6px;cursor:pointer"><input type="checkbox" id="faqatOnlayn" ${faqatOnlayn ? 'checked' : ''}> Faqat onlayn talabalar</label>
    </div>
    <div class="grid" id="grid"></div>`;
  pyHolatPill($('#pyHolat'));
  $('#chiqish').onclick = () => { saqla.del('pydars_rol'); saqla.del('pydars_ustoz_p'); rolTanlash(); };
  $('#faqatOnlayn').onchange = (e) => { faqatOnlayn = e.target.checked; saqla.set('pydars_faqat_onlayn', faqatOnlayn); chiz(); };
  $('#boshla').onclick = async () => {
    const id = $('#amSel').value;
    const am = amaliyot(id);
    if (sinf.amaliyotId === id) { toast('Bu amaliyot allaqachon boshlangan'); return; }
    if (sinf.amaliyotId && !confirm(`Hozirgi amaliyot o'rniga «${am.nomi}» boshlansinmi? Talabalarning oldingi ishi saqlanib qoladi.`)) return;
    await R('sinf').update({ amaliyotId: id, boshlandi: TS, boshVariant: Math.floor(Math.random() * am.variantlar.length) });
    toast('Amaliyot boshlandi — variantlar talabalarga tarqatilmoqda');
  };
  $('#tugat').onclick = async () => {
    if (!sinf.amaliyotId) return;
    if (!confirm("Amaliyot tugatilsinmi? Talabalar ekranida vazifa yopiladi (ishlari saqlanib qoladi).")) return;
    await R('sinf').update({ amaliyotId: null });
  };

  tingla(R('sinf'), (s) => {
    sinf = s || {};
    const a = sinf.amaliyotId && amaliyot(sinf.amaliyotId) ? sinf.amaliyotId : null;
    if (a) $('#amSel').value = a;
    if (a !== faolA) {
      if (ishOchir) ishOchir();
      ishlar = {}; faolA = a; ishOchir = null;
      if (ochiq) ochiq.yop();
      if (a) {
        const ref = R('ish/' + a);
        const cb = (snap) => { ishlar = snap.val() || {}; chiz(); if (ochiq) ochiq.yangila(); };
        ref.on('value', cb);
        ishOchir = () => ref.off('value', cb);
      }
    }
    const am = amaliyot(a);
    $('#faolMatn').innerHTML = am
      ? `<span class="pill ok">FAOL</span> &nbsp;${esc(am.nomi)} · boshlandi: ${sinf.boshlandi ? new Date(sinf.boshlandi).toLocaleTimeString('uz') : ''}`
      : `<span class="pill">KUTILMOQDA</span> &nbsp;Amaliyotni tanlab, «Boshlash» tugmasini bosing. Talabalar shundan keyin variant oladi.`;
    $('#tugat').disabled = !am;
    chiz();
  });
  tozalovchilar.push(() => { if (ishOchir) ishOchir(); });
  tingla(R('talabalar'), (s) => { talabalar = s || {}; chiz(); if (ochiq) ochiq.yangila(); });
  const iv = setInterval(() => chiz(), 5000); // "x s oldin" yozuvlarini yangilab turish
  tozalovchilar.push(() => clearInterval(iv));

  function oxirgiFayl(ish) {
    const f = (ish && ish.fayllar) || {};
    const a = f.asosiy, q = f.qoshimcha;
    if (q && (!a || (q.vaqt || 0) > (a.vaqt || 0))) return { f: q, tab: 'qoshimcha' };
    return { f: a || {}, tab: 'asosiy' };
  }

  function royxat() {
    const ids = new Set(Object.keys(ishlar));
    Object.entries(talabalar).forEach(([id, p]) => { if (p && p.online) ids.add(id); });
    return [...ids].map((id) => ({ id, p: talabalar[id] || ishlar[id] || {}, ish: ishlar[id] || null }))
      .filter((x) => !faqatOnlayn || (x.p && x.p.online))
      .sort((x, y) => (!!(y.ish && y.ish.yordam) - !!(x.ish && x.ish.yordam)) ||
        String(x.p.ism || x.id).localeCompare(String(y.p.ism || y.id), 'uz'));
  }

  const chiz = throttle(() => {
    const grid = $('#grid');
    if (!grid) return;
    const r = royxat();
    let onlayn = 0, ishladi = 0, xato = 0, yordam = 0, tayyor = 0;
    r.forEach(({ p, ish }) => {
      if (p.online) onlayn++;
      const a = ish && ish.fayllar && ish.fayllar.asosiy && ish.fayllar.asosiy.ishga;
      if (a) (a.ok ? ishladi++ : xato++);
      if (ish && ish.yordam) yordam++;
      if (ish && ish.tayyor) tayyor++;
    });
    $('#stats').innerHTML = [
      [onlayn, 'onlayn'], [ishladi, 'xatosiz ishladi'], [xato, 'xato bilan'], [tayyor, '«bajardim» dedi'], [yordam, "yordam so'radi"],
    ].map(([n, s]) => `<div class="stat"><b>${n}</b><span>${s}</span></div>`).join('');
    if (!r.length) {
      grid.innerHTML = `<div class="card empty" style="grid-column:1/-1">Hozircha talabalar yo'q. Talabalarga shu sahifa havolasini yuboring — ular «Talaba» bo'lib kiradi:<br><b>${esc(location.origin + location.pathname)}</b></div>`;
      return;
    }
    const am = amaliyot(faolA);
    grid.innerHTML = r.map(({ id, p, ish }) => {
      const { f, tab } = oxirgiFayl(ish);
      const run = f.ishga;
      const kod = (f.kod || '').replace(/\s+$/, '');
      const qatorlar = kod ? kod.split('\n') : [];
      const preview = qatorlar.slice(-6).join('\n');
      const pills = [];
      if (ish && ish.variant != null && am) pills.push(`<span class="pill blue">V${ish.variant + 1}</span>`);
      if (ish && ish.yordam) pills.push(`<span class="pill warn">✋ Yordam</span>`);
      if (run) pills.push(run.ok ? `<span class="pill ok">✓ Ishladi</span>` : `<span class="pill err">✗ Xato</span>`);
      else if (am && ish) pills.push(`<span class="pill">ishga tushirmagan</span>`);
      if (ish && ish.qabul) pills.push(`<span class="pill ok">✓ Qabul</span>`);
      else if (ish && ish.tayyor) pills.push(`<span class="pill blue">Bajardim</span>`);
      if (ish && ish.qoshimcha) pills.push(`<span class="pill star">⭐ Qo'shimcha</span>`);
      if (ish && ish.ustozTahrir) pills.push(`<span class="pill warn">✏️ Tuzatilmoqda</span>`);
      return `<button class="scard ${p.online ? '' : 'off'} ${ish && ish.yordam ? 'help' : ''}" data-sid="${esc(id)}">
        <div class="row" style="gap:6px"><span class="dot ${p.online ? 'on' : ''}"></span><span class="nm">${esc(p.ism || id)}</span></div>
        <div class="small muted">${esc(p.guruh || '')} · ${qatorlar.length} qator${tab === 'qoshimcha' ? " · qo'shimcha" : ''}${f.vaqt ? ' · ' + oldin(f.vaqt) : ''}</div>
        <div class="meta">${pills.join('')}</div>
        <div class="preview">${esc(preview) || '<span style="opacity:.6">— hali kod yozilmagan —</span>'}</div>
      </button>`;
    }).join('');
    grid.querySelectorAll('[data-sid]').forEach((b) => { b.onclick = () => tafsilot(b.dataset.sid); });
  }, 250);

  // ---------------------------------------------- talaba tafsiloti (kuzatish + tuzatish)
  function tafsilot(sid) {
    if (ochiq) ochiq.yop();
    const aId = faolA;
    const am = amaliyot(aId);
    const ishRef = aId ? R(`ish/${aId}/${sid}`) : null;
    let tab = 'asosiy';
    let tahrir = false;
    let oxirgiIshgaVaqt = null;
    let qulfRef = null;

    const ov = document.createElement('div');
    ov.className = 'overlay';
    ov.innerHTML = `<div class="overlay-inner">
      <div class="topbar">
        <button class="btn outline sm" id="dYop">← Barcha talabalar</button>
        <div class="title"><h1 id="dIsm"></h1><div class="muted small" id="dInfo"></div></div>
        <span class="spacer"></span>
        <div class="meta row" id="dPills" style="gap:5px"></div>
      </div>
      ${!am ? `<div class="card empty">Amaliyot boshlanmagan — talaba hali vazifa olmagan.</div>` : `
      <div class="detail">
        <div class="stack">
          <div class="card stack">
            <div class="row"><h2 style="margin:0;flex:1">Masala</h2>
              <label class="small muted" for="dVar">Variantni almashtirish:</label>
              <select id="dVar" style="width:auto">${am.variantlar.map((_, i) => `<option value="${i}">Variant ${i + 1}</option>`).join('')}</select></div>
            <div id="dMasala" class="stack"></div>
          </div>
          <div class="card stack">
            <h2>Holat</h2>
            <div class="row">
              <button class="btn warn sm hidden" id="dYordamOk">✋ Yordam berildi</button>
              <button class="btn green sm" id="dQabul">✓ Qabul qilish</button>
            </div>
            <div class="small muted" id="dHolat"></div>
          </div>
          <div class="card stack">
            <h2>💬 Talabaga izoh</h2>
            <textarea id="dIzoh" rows="2" placeholder="Masalan: 5-qatorda int() ni unutdingiz"></textarea>
            <div class="row"><button class="btn blue sm" id="dIzohYubor">Yuborish</button><button class="btn outline sm" id="dIzohOchir">Izohni olib tashlash</button></div>
            <div class="small muted" id="dIzohJoriy"></div>
          </div>
          <div class="card stack">
            <h2>⭐ Qo'shimcha (qiyinroq) masala</h2>
            <div class="small muted" id="dQoshJoriy"></div>
            <select id="dQoshTanla">
              ${(am.qiyin || []).map((q, i) => `<option value="${i}">${esc(q.sarlavha)}</option>`).join('')}
              <option value="o">✍️ O'zim yozaman…</option>
            </select>
            <input type="text" id="dQoshSarl" placeholder="Sarlavha">
            <textarea id="dQoshMatn" rows="4" placeholder="Masala sharti"></textarea>
            <div class="row"><button class="btn star sm" id="dQoshYubor">⭐ Shu talabaga yuborish</button><button class="btn outline sm hidden" id="dQoshOchir">Bekor qilish</button></div>
          </div>
          <details><summary>Boshqa amallar</summary>
            <div class="row" style="margin-top:8px"><button class="btn red sm" id="dOchir">Talabaning shu amaliyotdagi ishini o'chirish</button></div>
          </details>
        </div>
        <div class="card stack">
          <div class="tabs" id="dTablar"></div>
          <div class="banner warn hidden" id="dTahrirBanner">✏️ <b>Tuzatish rejimi.</b> Talaba hozir yoza olmaydi va sizning o'zgarishlaringizni jonli ko'rib turadi. Tugatgach «Tuzatishni tugatish» tugmasini bosing.</div>
          <div class="row">
            <button class="btn warn" id="dTahrir">✏️ Kodni tuzatish</button>
            <button class="btn green" id="dRun">▶ Ishga tushirish</button>
            <button class="btn outline" id="dStop" disabled>■</button>
            <span class="spacer"></span>
            <span class="small muted" id="dSaqlash"></span>
          </div>
          <div class="editor-wrap" id="dEd"></div>
          <div><label class="lbl" for="dKirish">Kiruvchi ma'lumotlar (talaba oxirgi marta ishlatgani)</label>
            <textarea id="dKirish" class="mono" rows="2" spellcheck="false"></textarea></div>
          <div class="row small" style="gap:6px"><label class="muted" for="dArgv">Argumentlar (sys.argv):</label>
            <span class="mono muted">python kod.py</span><input type="text" id="dArgv" class="mono argv" spellcheck="false"></div>
          <div><label class="lbl">Talabaning oxirgi natijasi <span id="dRunVaqt"></span></label><div class="console" id="dKonsolT"></div></div>
          <div class="hidden" id="dKonsolUWrap"><label class="lbl">Sizda ishga tushirilgan natija</label><div class="console" id="dKonsolU"></div></div>
          <details><summary>📁 Sizning brauzeringizdagi fayllar (talaba kodini ishga tushirish uchun kerak bo'lsa)</summary><div id="dFayl" style="margin-top:8px"></div></details>
        </div>
      </div>`}
    </div>`;
    document.body.appendChild(ov);
    document.body.style.overflow = 'hidden';

    const yop = () => {
      if (tahrirniTugat) tahrirniTugat();
      document.removeEventListener('keydown', escTugma);
      ov.remove();
      document.body.style.overflow = '';
      ochiq = null;
    };
    const escTugma = (e) => { if (e.key === 'Escape' && !e.target.closest('.CodeMirror')) yop(); };
    document.addEventListener('keydown', escTugma);
    $('#dYop', ov).onclick = yop;

    let tahrirniTugat = null;
    const holat = { yop, yangila: () => {} };
    ochiq = holat;
    if (!am) {
      holat.yangila = () => {
        const p = talabalar[sid] || {};
        $('#dIsm', ov).textContent = p.ism || sid;
        $('#dInfo', ov).textContent = (p.guruh || '') + (p.online ? ' · onlayn' : ' · offlayn');
      };
      holat.yangila();
      return;
    }

    const konsolT = new Konsol($('#dKonsolT', ov));
    const konsolU = new Konsol($('#dKonsolU', ov));
    const sync = {
      asosiy: new Sinxron(ishRef.child('fayllar/asosiy'), 'ustoz', $('#dSaqlash', ov)),
      qoshimcha: new Sinxron(ishRef.child('fayllar/qoshimcha'), 'ustoz', $('#dSaqlash', ov)),
    };
    const cm = muharrir($('#dEd', ov), { readOnly: true, onChange: (v) => { if (tahrir) sync[tab].yozildi(v); }, onRun: () => $('#dRun', ov).click() });
    let kirishTab = null, masalaKalit = null;
    faylPaneli($('#dFayl', ov));

    const qoshFormaniTold = () => {
      const v = $('#dQoshTanla', ov).value;
      if (v === 'o') { $('#dQoshSarl', ov).value = ''; $('#dQoshMatn', ov).value = ''; $('#dQoshSarl', ov).focus(); return; }
      const q = (am.qiyin || [])[+v];
      if (q) { $('#dQoshSarl', ov).value = q.sarlavha; $('#dQoshMatn', ov).value = q.matn; }
    };
    $('#dQoshTanla', ov).onchange = qoshFormaniTold;
    qoshFormaniTold();

    holat.yangila = () => {
      const p = talabalar[sid] || {};
      const d = ishlar[sid] || {};
      const q = d.qoshimcha;
      if (tab === 'qoshimcha' && !q) tab = 'asosiy';
      $('#dIsm', ov).textContent = p.ism || d.ism || sid;
      $('#dInfo', ov).textContent = `${p.guruh || d.guruh || ''} · ${p.online ? 'onlayn' : 'offlayn' + (p.oxirgi ? ' (' + oldin(p.oxirgi) + ')' : '')}`;
      const pills = [];
      if (d.yordam) pills.push(`<span class="pill warn">✋ Yordam so'radi ${oldin(d.yordam)}</span>`);
      if (d.qabul) pills.push(`<span class="pill ok">✓ Qabul qilingan</span>`);
      else if (d.tayyor) pills.push(`<span class="pill blue">«Bajardim» dedi</span>`);
      $('#dPills', ov).innerHTML = pills.join('');
      // Variant va masala
      const vi = d.variant;
      if (vi != null && document.activeElement !== $('#dVar', ov)) $('#dVar', ov).value = String(vi);
      const vr = vi != null ? am.variantlar[vi % am.variantlar.length] : null;
      const mk = tab === 'asosiy' ? 'a' + vi : 'q' + (q && q.vaqt);
      if (mk !== masalaKalit) {
        masalaKalit = mk;
        $('#dMasala', ov).innerHTML = masalaHTML(am, vi, tab === 'qoshimcha' ? q : null);
        namunaTugmalari($('#dMasala', ov), am, tahrir ? (kod) => { cm.setValue(kod); sync[tab].yozildi(kod); } : null);
      }
      // Holat
      $('#dYordamOk', ov).classList.toggle('hidden', !d.yordam);
      $('#dQabul', ov).textContent = d.qabul ? 'Qabulni bekor qilish' : '✓ Qabul qilish';
      $('#dQabul', ov).className = 'btn sm ' + (d.qabul ? 'outline' : 'green');
      $('#dHolat', ov).textContent = d.tayyor ? `Talaba ${oldin(d.tayyor)} «bajardim» deb belgiladi.` : 'Talaba hali «bajardim» demagan.';
      $('#dIzohJoriy', ov).textContent = d.izoh && d.izoh.matn ? `Hozirgi izoh: «${d.izoh.matn}»` : 'Izoh yuborilmagan.';
      $('#dIzohOchir', ov).classList.toggle('hidden', !(d.izoh && d.izoh.matn));
      $('#dQoshJoriy', ov).textContent = q ? `Yuborilgan: «${q.sarlavha}». Yangisini yuborsangiz, almashtiriladi.` : 'Iqtidorli talabaga asosiy vazifadan tashqari qiyinroq masala yuboring.';
      $('#dQoshOchir', ov).classList.toggle('hidden', !q);
      // Tablar
      $('#dTablar', ov).innerHTML = `<button class="tab ${tab === 'asosiy' ? 'active' : ''}" data-t="asosiy">Asosiy vazifa</button>` +
        (q ? `<button class="tab star ${tab === 'qoshimcha' ? 'active' : ''}" data-t="qoshimcha">⭐ Qo'shimcha masala</button>` : '');
      $('#dTablar', ov).querySelectorAll('[data-t]').forEach((b) => { b.onclick = () => tabAlmashtir(b.dataset.t); });
      // Kod
      const f = (d.fayllar && d.fayllar[tab]) || {};
      if (!(tahrir && sync[tab].pending)) masofadanQoy(cm, f.kod || '');
      if (!tahrir) $('#dSaqlash', ov).textContent = f.vaqt ? `talaba yozdi: ${oldin(f.vaqt)}` + (f.muallif === 'ustoz' ? ' (oxirgi o\'zgarish — sizniki)' : '') : '';
      const kEl = $('#dKirish', ov);
      const kQiymat = f.kirish != null ? f.kirish : ((tab === 'asosiy' ? (vr && vr.kirish) : (q && q.kirish)) || '');
      if (kirishTab !== tab || (document.activeElement !== kEl && kEl.dataset.v !== kQiymat)) {
        kEl.value = kQiymat; kEl.dataset.v = kQiymat;
      }
      const aEl = $('#dArgv', ov);
      const aQiymat = f.argv != null ? f.argv : (tab === 'asosiy' && am.argvVariant && vi != null ? String(vi + 1) : '');
      if (kirishTab !== tab || (document.activeElement !== aEl && aEl.dataset.v !== aQiymat)) {
        aEl.value = aQiymat; aEl.dataset.v = aQiymat;
      }
      kirishTab = tab;
      // Talabaning oxirgi natijasi
      const r = f.ishga;
      const kalit = r ? r.vaqt + tab : tab;
      if (kalit !== oxirgiIshgaVaqt) {
        oxirgiIshgaVaqt = kalit;
        konsolT.tozala();
        if (!r) konsolT.qosh('Talaba hali ishga tushirmagan.', 'info');
        else {
          konsolT.qosh(r.chiqish || '');
          konsolT.yangiQator();
          if (r.ok) konsolT.qosh(`✓ Dastur tugadi (${((r.ms || 0) / 1000).toFixed(2)} s)`, 'done');
          else { konsolT.qosh(r.xato || 'Xato', 'err'); const m = maslahat(r.xato || ''); if (m) konsolT.qosh('\n💡 ' + m, 'hint'); }
        }
      }
      $('#dRunVaqt', ov).textContent = r && r.vaqt ? '— ' + oldin(r.vaqt) : '';
      // Tahrir holati (boshqa qurilmadagi ustoz ham bo'lishi mumkin)
      const boshqaTahrir = d.ustozTahrir && !tahrir;
      $('#dTahrir', ov).textContent = tahrir ? '✔ Tuzatishni tugatish' : '✏️ Kodni tuzatish';
      $('#dTahrir', ov).className = 'btn ' + (tahrir ? 'green' : 'warn');
      $('#dTahrirBanner', ov).classList.toggle('hidden', !tahrir);
      $('#dEd', ov).classList.toggle('locked', tahrir);
      if (boshqaTahrir) $('#dSaqlash', ov).textContent = 'boshqa oynada tuzatish rejimi ochiq';
    };

    function tabAlmashtir(yangi) {
      if (yangi === tab) return;
      if (tahrir) tahrirniTugat();
      tab = yangi; oxirgiIshgaVaqt = null;
      konsolU.tozala(); $('#dKonsolUWrap', ov).classList.add('hidden');
      holat.yangila();
      cm.refresh();
    }

    // Tuzatish rejimi: talabaning muharriri qulflanadi, ustoz yozadi
    $('#dTahrir', ov).onclick = async () => {
      if (tahrir) { tahrirniTugat(); holat.yangila(); return; }
      if (!(talabalar[sid] && talabalar[sid].online) && !confirm("Talaba hozir offlayn. Baribir tuzatasizmi? O'zgarishlar u qaytib kirganda ko'rinadi.")) return;
      tahrir = true; masalaKalit = null;
      qulfRef = ishRef.child('ustozTahrir');
      await qulfRef.onDisconnect().remove();
      await qulfRef.set(tab);
      cm.setOption('readOnly', false);
      $('#dSaqlash', ov).textContent = "o'zgarishlar talabaga darhol ko'rinadi";
      holat.yangila();
      cm.focus();
      tahrirniTugat = () => {
        tahrir = false; masalaKalit = null;
        sync[tab].yubor();
        cm.setOption('readOnly', true);
        if (qulfRef) { qulfRef.onDisconnect().cancel(); qulfRef.remove(); qulfRef = null; }
        tahrirniTugat = null;
        toast("Tuzatish tugadi — talaba yana yoza oladi");
      };
    };
    $('#dRun', ov).onclick = async () => {
      const b = $('#dRun', ov);
      if (b.disabled) return;
      $('#dKonsolUWrap', ov).classList.remove('hidden');
      b.disabled = true; $('#dStop', ov).disabled = false;
      await ishgaTushir(cm.getValue(), $('#dKirish', ov).value, $('#dArgv', ov).value.trim(), konsolU, cm);
      b.disabled = false; $('#dStop', ov).disabled = true;
    };
    $('#dStop', ov).onclick = () => runner().stop('toxtatildi');
    $('#dVar', ov).onchange = (e) => {
      ishRef.update({ variant: +e.target.value });
      toast(`Variant ${+e.target.value + 1} berildi`);
    };
    $('#dYordamOk', ov).onclick = () => ishRef.update({ yordam: null });
    $('#dQabul', ov).onclick = () => { const d = ishlar[sid] || {}; ishRef.update({ qabul: d.qabul ? null : TS }); };
    $('#dIzohYubor', ov).onclick = () => {
      const m = $('#dIzoh', ov).value.trim();
      if (!m) { toast('Izoh matnini yozing'); return; }
      ishRef.update({ izoh: { matn: m, vaqt: TS } });
      $('#dIzoh', ov).value = '';
      toast('Izoh yuborildi');
    };
    $('#dIzohOchir', ov).onclick = () => ishRef.update({ izoh: null });
    $('#dQoshYubor', ov).onclick = () => {
      const sarlavha = $('#dQoshSarl', ov).value.trim() || "Qo'shimcha masala";
      const matn = $('#dQoshMatn', ov).value.trim();
      if (!matn) { toast('Masala shartini yozing'); return; }
      const sel = $('#dQoshTanla', ov).value;
      const asl = sel !== 'o' ? (am.qiyin || [])[+sel] : null;
      ishRef.update({ qoshimcha: { sarlavha, matn, kirish: (asl && asl.kirish) || '', vaqt: TS } });
      toast(`⭐ «${sarlavha}» yuborildi`);
    };
    $('#dQoshOchir', ov).onclick = () => {
      if (!confirm("Qo'shimcha masala bekor qilinsinmi? (Talabaning yozgan kodi saqlanib qoladi)")) return;
      ishRef.update({ qoshimcha: null });
    };
    $('#dOchir', ov).onclick = async () => {
      if (!confirm("Bu talabaning shu amaliyotdagi butun ishi o'chirilsinmi? Buni qaytarib bo'lmaydi.")) return;
      yop();
      await ishRef.remove();
      const p = talabalar[sid];
      if (p && !p.online) await R('talabalar/' + sid).remove();
    };
    holat.yangila();
    setTimeout(() => cm.refresh(), 0);
  }
}

// ---------------------------------------------------------------- yo'naltirish
const rol = saqla.get('pydars_rol');
const tal = saqla.get('pydars_talaba');
if (rol === 'talaba' && tal && tal.ism && tal.guruh) talabaEkrani({ ...tal, sid: slug(tal.guruh) + '__' + slug(tal.ism) });
else if (rol === 'ustoz') ustozKirish();
else rolTanlash();
})();
