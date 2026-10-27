/* Python Dars — Python kodini brauzer ichida (Pyodide) ishga tushiruvchi worker.
   Alohida oqimda ishlaydi: cheksiz sikl sahifani qotirib qo'ymaydi, uni to'xtatish mumkin. */

const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';
importScripts(PYODIDE_URL + 'pyodide.js');

const MAX_CHIQISH = 20000; // shundan ko'p belgini sahifaga yubormaymiz
let py = null;
let yuborildi = 0;

const tayyor = (async () => {
  py = await loadPyodide({ indexURL: PYODIDE_URL });
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
  py.runPython(`
import builtins, sys

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
`, { filename: '<pydars>' });
  postMessage({ tur: 'tayyor' });
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
    if (ichki && /^\s{4}/.test(s)) continue;
    ichki = false;
    natija.push(s);
  }
  return natija.join('\n').replace(/_KirishTugadi/g, 'EOFError').trim();
}

onmessage = async (e) => {
  const { id, kod, kirish } = e.data;
  try {
    await tayyor;
  } catch (_) { /* yuklanmadi xabari allaqachon yuborilgan */ }
  if (!py) { postMessage({ tur: 'tugadi', id, ok: false, xato: 'Python yuklanmadi' }); return; }
  yuborildi = 0;
  const qatorlar = String(kirish || '').replace(/\r/g, '').split('\n');
  if (qatorlar.length && qatorlar[qatorlar.length - 1] === '') qatorlar.pop();
  let g = null;
  try {
    try { await py.loadPackagesFromImports(kod); } catch (_) { /* paket topilmasa, import xatosi o'zi chiqadi */ }
    g = py.globals.get('dict')();
    g.set('__name__', '__main__');
    const bi = py.pyimport('builtins');
    g.set('__builtins__', bi);
    const yasash = py.globals.get('_input_yasash');
    const ql = py.toPy(qatorlar);
    const inp = yasash(ql);
    bi.input = inp;
    await py.runPythonAsync(kod, { globals: g, filename: '<exec>' });
    py.runPython('import sys; sys.stdout.flush(); sys.stderr.flush()');
    postMessage({ tur: 'tugadi', id, ok: true });
  } catch (err) {
    try { py.runPython('import sys; sys.stdout.flush()'); } catch (_) {}
    postMessage({ tur: 'tugadi', id, ok: false, xato: tozala(err && err.message || err) });
  } finally {
    try { g && g.destroy(); } catch (_) {}
  }
};
