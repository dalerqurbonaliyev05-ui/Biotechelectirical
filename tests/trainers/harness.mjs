// Trenajyor sinovlari uchun umumiy asos: statik server, brauzer, three.js "probe" va sahna bilan ishlash.
//
// Sahifa fayllariga TEGILMAYDI. Sinov paytida:
//  - three.js r128 CDN o'rniga node_modules/three (aynan shu versiya) dan beriladi, oxiriga o'lchov
//    qo'shimchasi (probe) qo'shiladi: har bir asosiy kadrda draw call, uchburchak va render vaqti yoziladi;
//  - Google shriftlari bo'sh javob bilan almashtiriladi (tarmoqqa bog'liq bo'lmaslik uchun);
//  - qisqichlarning 3D koordinatalarini olish uchun HTML'dagi `const T={};` qatoriga `window.__T=T;`
//    qo'shib beriladi (sahifa ichidagi qisqichlar ro'yxatiga faqat o'qish uchun havola).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, "../..");
const THREE_SRC = fs.readFileSync(path.join(here, "node_modules/three/build/three.min.js"), "utf8");
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".json": "application/json" };

// Har bir asosiy (ekranga) render: vaqt, draw call, uchburchak. PMREM kabi render-target'ga chizishlar hisobga olinmaydi.
const PROBE = `;(function(){
  var R=THREE.WebGLRenderer;
  var P=window.__probe={frames:[],first:null,renderer:null,cam:null,scene:null};
  THREE.WebGLRenderer=function(o){
    var r=new R(o);P.renderer=r;var orig=r.render;
    r.render=function(s,c){
      if(r.getRenderTarget()!==null)return orig.call(this,s,c);
      P.scene=s;P.cam=c;var t=performance.now();orig.call(this,s,c);var t1=performance.now();
      if(P.first==null)P.first=t1;
      P.frames.push({t:t,ms:t1-t,calls:r.info.render.calls,tris:r.info.render.triangles});
      if(P.frames.length>4000)P.frames.splice(0,2000);
    };
    return r;
  };
  THREE.WebGLRenderer.prototype=R.prototype;
})();`;

// Sahifa skriptlaridan oldin ishlaydi: pointer ishlovchisi vaqtini o'lchash va yordamchi funksiyalar.
const INIT = () => {
  const H = (window.__h = { evs: [] });
  // pointerdown/pointerup: window capture (boshlanish) va window bubble (canvas ishlovchisi tugagan) orasidagi vaqt
  ["pointerdown", "pointerup"].forEach((type) => {
    window.addEventListener(type, (e) => { if (e.target && e.target.id === "cv") H._t0 = performance.now(); }, true);
    window.addEventListener(type, (e) => { if (e.target && e.target.id === "cv" && H._t0 != null) { H.evs.push({ type, ms: performance.now() - H._t0 }); H._t0 = null; } }, false);
  });
  H.toScreen = (x, y, z) => {
    const P = window.__probe, cv = document.getElementById("cv");
    if (!P || !P.cam) return null;
    const v = new THREE.Vector3(x, y, z).project(P.cam), r = cv.getBoundingClientRect();
    return { x: r.left + (v.x * 0.5 + 0.5) * r.width, y: r.top + (-v.y * 0.5 + 0.5) * r.height, behind: v.z > 1 };
  };
  H.term = (id) => { const t = window.__T && window.__T[id]; if (!t) return null; return H.toScreen(t.pos.x, t.pos.y, t.pos.z); };
  H.onCanvas = (x, y) => { const e = document.elementFromPoint(x, y); return !!e && e.id === "cv"; };
  // nuqtani hisoblash; canvas ustida bo'lmasa (yopishqoq panel to'sgan) sahifani surib qayta hisoblash
  H.prep = (kind, a) => {
    if (kind === "term" && !(window.__T && window.__T[a[0]])) return { err: "qisqich yo'q: " + a[0] };
    for (let i = 0; i < 4; i++) {
      const p = kind === "term" ? H.term(a[0]) : H.toScreen(a[0], a[1], a[2] || 0);
      if (!p) return { err: "nuqta topilmadi" };
      if (H.onCanvas(p.x, p.y)) { H.evs = []; return p; }
      window.scrollBy(0, p.y - window.innerHeight / 2);
    }
    return { err: "canvas ustidagi nuqtani bosib bo'lmadi" };
  };
};

export function startServer() {
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, "http://x");
    let p = path.join(ROOT, decodeURIComponent(u.pathname));
    if (!p.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, "index.html");
    if (!fs.existsSync(p)) { res.writeHead(404); return res.end("yo'q"); }
    const ext = path.extname(p);
    let body = fs.readFileSync(p);
    if (ext === ".html") {
      let s = body.toString("utf8");
      if (s.includes("const T={};") && !s.includes("window.__T=")) s = s.replace("const T={};", "const T={};window.__T=T;");
      body = s;
    }
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(body);
  });
  return new Promise((r) => server.listen(0, "127.0.0.1", () => r({ base: `http://127.0.0.1:${server.address().port}`, close: () => server.close() })));
}

export function launch() {
  const exe = process.env.CHROMIUM_PATH || ["/opt/pw-browsers/chromium"].find((p) => fs.existsSync(p));
  return chromium.launch({ executablePath: exe, args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"] });
}

export const PROFILES = {
  desktop: { viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 },
  // funksional sinovlar uchun: desktop bilan bir xil joylashuv, lekin canvas past aniqlikda (dasturiy GPU da tezroq)
  func: { viewport: { width: 1400, height: 900 }, deviceScaleFactor: 0.25 },
  // 08 uchun: detal ro'yxatdan tanlanib, joyi barmoq bilan bosiladi (sichqonchada detal kursorga ergashadi)
  funcTouch: { viewport: { width: 1400, height: 900 }, deviceScaleFactor: 0.25, hasTouch: true },
  desktopTouch: { viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1, hasTouch: true },
  // telefon: 390×844, DPR 3, sensorli ekran, protsessor 4 marta sekinlashtirilgan
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, cpuThrottle: 4 },
};

export async function openTrainer(browser, base, name, profileName = "desktop") {
  const prof = PROFILES[profileName];
  const { cpuThrottle, ...ctxOpts } = prof;
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route(/cdnjs\.cloudflare\.com\/.*three\.min\.js/, (r) => r.fulfill({ contentType: "text/javascript", body: THREE_SRC + PROBE }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ contentType: "text/css", body: "" }));
  await page.addInitScript(INIT);
  if (cpuThrottle) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpuThrottle });
  }
  await page.goto(`${base}/${name}/`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__probe && window.__probe.first != null, null, { timeout: 120000 });
  await idle(page);
  return { page, ctx, errors };
}

// Sahna "tinchlanguncha" kutish: ketma-ket ikki tekshiruvda yangi kadr chizilmagan bo'lsa
export async function idle(page, maxMs = 8000) {
  const t0 = Date.now();
  let n = -1;
  while (Date.now() - t0 < maxMs) {
    const k = await page.evaluate(() => window.__probe.frames.length + ":" + (window.__probe.frames.at(-1) || {}).t);
    if (k === n) return;
    n = k;
    await page.waitForTimeout(250);
  }
}

// Haqiqiy sichqoncha bosishi; ishlovchilarning (pointerdown+pointerup) sinxron vaqtini qaytaradi
async function clickAt(page, kind, args) {
  const p = await page.evaluate(([k, a]) => window.__h.prep(k, a), [kind, args]);
  if (p.err) throw new Error(p.err);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.up();
  return page.evaluate(() => window.__h.evs.slice());
}

// Barmoq bilan bosish (touch pointer)
export async function touchAt(page, x, y, z = 0) {
  const p = await page.evaluate(([k, a]) => window.__h.prep(k, a), ["world", [x, y, z]]);
  if (p.err) throw new Error(p.err);
  await page.touchscreen.tap(p.x, p.y);
  return page.evaluate(() => window.__h.evs.slice());
}

export const tapTerminal = (page, id) => clickAt(page, "term", [id]);
export const tapWorld = (page, x, y, z = 0) => clickAt(page, "world", [x, y, z]);

// Oxirgi n ta asosiy kadr
export function frames(page) {
  return page.evaluate(() => window.__probe.frames.slice());
}
