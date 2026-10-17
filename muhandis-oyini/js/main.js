// Kirish nuqtasi: ma'lumotlarni yuklab ilovani ishga tushiradi.
import { loadData } from './game/data.js';
import { App } from './ui/app.js';

const root = document.getElementById('app');

async function readJson(file) {
  const url = new URL('../data/' + file, import.meta.url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  return res.json();
}

function fail(err) {
  console.error(err);
  const local = location.protocol === 'file:';
  root.innerHTML = '';
  const box = document.createElement('div');
  box.className = 'bootfail';
  box.innerHTML = `<h1>Elektr muhandisi: bir ish kuni</h1>
    <p><b>O'yinni ishga tushirib bo'lmadi.</b></p>
    ${local ? `<p>Brauzer xavfsizligi tufayli <code>index.html</code> faylini to'g'ridan-to'g'ri (file://) ochganda ma'lumot fayllari yuklanmaydi.
    O'yinni mahalliy serverda oching:</p>
    <pre>cd muhandis-oyini\npython3 -m http.server 8080</pre>
    <p>so'ng brauzerda <code>http://localhost:8080</code> manzilini oching. Yoki saytga joylashtiring (Vercel / GitHub Pages) — README ga qarang.</p>` : `<p>Sabab: <code>${String(err && err.message || err)}</code></p><p>Sahifani yangilang yoki internet aloqasini tekshiring.</p>`}`;
  root.append(box);
}

try {
  const data = await loadData(readJson);
  window.__app = new App(root, data);
  document.getElementById('boot')?.remove();
} catch (e) {
  fail(e);
}
