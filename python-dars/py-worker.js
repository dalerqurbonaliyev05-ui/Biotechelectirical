/* Python Dars — Python kodini brauzer ichida (Pyodide) ishga tushiruvchi worker.
   Alohida oqimda ishlaydi: cheksiz sikl sahifani qotirib qo'ymaydi, uni to'xtatish mumkin.
   Imkoniyatlar:
     - input() — sahifadagi «Kiruvchi ma'lumotlar» maydonidan o'qiydi
     - sys.argv — «Argumentlar» maydonidan (python fayl.py 7 kabi)
     - fayllar (open, csv, json, savefig...) /home/pyodide da saqlanadi va brauzerda (IndexedDB) qoladi
     - o'zingiz yaratgan modullar (masalan energetika.py) import qilinadi
     - numpy, pandas, matplotlib avtomatik yuklanadi; Excel uchun openpyxl PyPI'dan o'rnatiladi
     - matplotlib grafiklari rasm sifatida sahifaga chiqariladi */

const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';
const HOME = '/home/pyodide';
importScripts(PYODIDE_URL + 'pyodide.js');

const MAX_CHIQISH = 20000; // shundan ko'p belgini sahifaga yubormaymiz
let py = null;
let yuborildi = 0;
let fsSaqlanadi = false;
let joriyId = 0;
let openpyxlBor = false;

function sinx(yuklash) {
  if (!fsSaqlanadi) return Promise.resolve();
  return new Promise((r) => { try { py.FS.syncfs(yuklash, () => r()); } catch (_) { r(); } });
}

const tayyor = (async () => {
  py = await loadPyodide({ indexURL: PYODIDE_URL, env: { HOME, MPLBACKEND: 'Agg' } });
  // Fayllar brauzer xotirasida (IndexedDB) saqlansin — sahifa yangilansa ham yo'qolmaydi
  try {
    py.FS.mount(py.FS.filesystems.IDBFS, {}, HOME);
    fsSaqlanadi = true;
    await sinx(true);
  } catch (_) { fsSaqlanadi = false; }
  try { py.FS.chdir(HOME); } catch (_) {}

  const dekoder = new TextDecoder();
  const yoz = (tur) => ({
    write(buf) {
      const matn = dekoder.decode(buf);
      if (yuborildi < MAX_CHIQISH) {
        const qism = matn.slice(0, MAX_CHIQISH - yuborildi);
        yuborildi += qism.length;
        postMessage({ tur, matn: qism });
        if (yuborildi >= MAX_CHIQISH) postMessage({ tur: 'stderr', matn: "\n… chiqish juda uzun, qolgani ko'rsatilmadi\n" });
      }
      return buf.length;
    },
  });
  py.setStdout(yoz('stdout'));
  py.setStderr(yoz('stderr'));
  py.globals.set('_rasm_js', (b64) => postMessage({ tur: 'rasm', id: joriyId, data: b64 }));
  py.runPython(`
import builtins, sys, importlib

class _KirishTugadi(EOFError):
    pass

def _input_yasash(qatorlar):
    it = iter(qatorlar)
    def _input(prompt=''):
        sys.stdout.write(str(prompt))
        try:
            v = next(it)
        except StopIteration:
            sys.stdout.write('\\n')
            raise _KirishTugadi("input() uchun ma'lumot qolmadi") from None
        sys.stdout.write(v + '\\n')
        sys.stdout.flush()
        return v
    return _input

def _tayyorla(argv):
    # o'zimiz yaratgan modullar (masalan energetika.py) har safar yangidan o'qilsin
    for _n, _m in list(sys.modules.items()):
        _f = getattr(_m, '__file__', None) or ''
        if _f.startswith('${HOME}/'):
            del sys.modules[_n]
    if '${HOME}' not in sys.path:
        sys.path.insert(0, '${HOME}')
    importlib.invalidate_caches()
    sys.argv = ['kod.py'] + list(argv)

def _mpl_sozla():
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt, warnings
    warnings.filterwarnings('ignore', message='.*non-interactive.*')
    if getattr(plt, '_pydars', False):
        return
    def _show(*a, **k):
        _rasmlarni_yubor()
    plt.show = _show
    plt._pydars = True

def _rasmlarni_yubor():
    if 'matplotlib.pyplot' not in sys.modules:
        return
    import io, base64
    plt = sys.modules['matplotlib.pyplot']
    for n in plt.get_fignums():
        f = plt.figure(n)
        b = io.BytesIO()
        f.savefig(b, format='png', dpi=90, bbox_inches='tight')
        _rasm_js(base64.b64encode(b.getvalue()).decode())
    plt.close('all')
`, { filename: '<pydars>' });
  postMessage({ tur: 'tayyor', fayllarSaqlanadi: fsSaqlanadi });
  postMessage({ tur: 'fayllar', list: royxat() });
})().catch((e) => {
  postMessage({ tur: 'yuklanmadi', matn: String(e && e.message || e) });
});

// Traceback'dan Pyodide'ning ichki qatorlarini olib tashlab, faqat talabaning kodiga tegishlisini qoldiramiz
function tozala(xabar) {
  const q = String(xabar).split('\n');
  const natija = [];
  let ichki = false;
  for (const s of q) {
    if (/^\s*File "(\/lib\/python|<frozen|<pydars>)/.test(s)) { ichki = true; continue; }
    if (/^\s*File "<exec>"/.test(s)) { ichki = false; natija.push(s.replace('"<exec>"', '"kod"')); continue; }
    if (s.includes(`File "${HOME}/`)) { ichki = false; natija.push(s.replace(`${HOME}/`, '')); continue; }
    if (ichki && /^\s{4}/.test(s)) continue;
    ichki = false;
    natija.push(s);
  }
  return natija.join('\n').replace(/_KirishTugadi/g, 'EOFError').trim();
}

// ---------------- fayllar
function xavfsizYol(nom) {
  nom = String(nom || '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (!nom || nom.split('/').some((q) => q === '..' || q === '')) throw new Error("Fayl nomi noto'g'ri");
  return HOME + '/' + nom;
}
function royxat(dir = HOME, prefix = '', chuqurlik = 0) {
  const out = [];
  let nomlar = [];
  try { nomlar = py.FS.readdir(dir); } catch (_) { return out; }
  for (const n of nomlar) {
    if (n === '.' || n === '..' || n.startsWith('.') || n === '__pycache__') continue;
    const p = dir + '/' + n;
    let st; try { st = py.FS.stat(p); } catch (_) { continue; }
    if (py.FS.isDir(st.mode)) { if (chuqurlik < 2) out.push(...royxat(p, prefix + n + '/', chuqurlik + 1)); }
    else out.push({ nom: prefix + n, hajm: st.size, vaqt: st.mtime instanceof Date ? st.mtime.getTime() : +st.mtime });
  }
  return out.sort((a, b) => a.nom.localeCompare(b.nom));
}
async function fsAmal(d) {
  await tayyor;
  if (d.amal === 'royxat') return royxat();
  if (d.amal === 'oqi') return py.FS.readFile(xavfsizYol(d.nom));
  if (d.amal === 'yoz') {
    const yol = xavfsizYol(d.nom);
    const papka = yol.slice(0, yol.lastIndexOf('/'));
    if (papka !== HOME) { try { py.FS.mkdirTree(papka); } catch (_) {} }
    py.FS.writeFile(yol, d.matn);
    await sinx(false);
    return royxat();
  }
  if (d.amal === 'ochir') {
    py.FS.unlink(xavfsizYol(d.nom));
    await sinx(false);
    return royxat();
  }
  throw new Error("Noma'lum amal");
}

// ---------------- paketlar
async function paketlarniYukla(kod) {
  const nomlar = [...kod.matchAll(/^\s*(?:import|from)\s+(numpy|pandas|matplotlib|pylab|scipy)\b/gm)]
    .map((m) => (m[1] === 'pylab' ? 'matplotlib' : m[1]))
    .filter((n) => !(py.loadedPackages && py.loadedPackages[n]));
  if (nomlar.length) postMessage({ tur: 'info', matn: `${[...new Set(nomlar)].join(', ')} yuklanmoqda (birinchi marta 10–40 soniya)…\n` });
  try { await py.loadPackagesFromImports(kod, { messageCallback: () => {}, errorCallback: () => {} }); } catch (_) { /* topilmasa, import xatosi o'zi chiqadi */ }
  if (/to_excel|ExcelWriter|read_excel|openpyxl/.test(kod) && !openpyxlBor) {
    try {
      postMessage({ tur: 'info', matn: "Excel uchun openpyxl o'rnatilmoqda…\n" });
      await py.loadPackage('micropip', { messageCallback: () => {} });
      await py.pyimport('micropip').install('openpyxl');
      openpyxlBor = true;
    } catch (e) {
      postMessage({ tur: 'stderr', matn: "openpyxl o'rnatilmadi (internetni tekshiring): " + (e && e.message || e) + '\n' });
    }
  }
  if (/matplotlib|pylab/.test(kod)) {
    try { py.globals.get('_mpl_sozla')(); } catch (_) {}
  }
}

onmessage = async (e) => {
  const d = e.data;
  if (d.tur === 'fs') {
    try { const natija = await fsAmal(d); postMessage({ tur: 'fsJavob', sid: d.sid, natija }); }
    catch (err) { postMessage({ tur: 'fsJavob', sid: d.sid, xato: String(err && err.message || err) }); }
    return;
  }
  const { id, kod, kirish, argv } = d;
  try {
    await tayyor;
  } catch (_) { /* yuklanmadi xabari allaqachon yuborilgan */ }
  if (!py) { postMessage({ tur: 'tugadi', id, ok: false, xato: 'Python yuklanmadi' }); return; }
  joriyId = id;
  yuborildi = 0;
  const qatorlar = String(kirish || '').replace(/\r/g, '').split('\n');
  if (qatorlar.length && qatorlar[qatorlar.length - 1] === '') qatorlar.pop();
  let g = null;
  let ok = true, xato = '';
  try {
    await paketlarniYukla(kod);
    postMessage({ tur: 'boshlandi', id });
    py.globals.get('_tayyorla')(py.toPy(String(argv || '').trim() ? String(argv).trim().split(/\s+/) : []));
    g = py.globals.get('dict')();
    g.set('__name__', '__main__');
    const bi = py.pyimport('builtins');
    g.set('__builtins__', bi);
    bi.input = py.globals.get('_input_yasash')(py.toPy(qatorlar));
    await py.runPythonAsync(kod, { globals: g, filename: '<exec>' });
  } catch (err) {
    ok = false;
    xato = tozala(err && err.message || err);
  } finally {
    try { py.globals.get('_rasmlarni_yubor')(); } catch (_) {}
    try { py.runPython('import sys; sys.stdout.flush(); sys.stderr.flush()'); } catch (_) {}
    try { g && g.destroy(); } catch (_) {}
  }
  await sinx(false);
  postMessage({ tur: 'fayllar', list: royxat() });
  postMessage({ tur: 'tugadi', id, ok, xato });
};
