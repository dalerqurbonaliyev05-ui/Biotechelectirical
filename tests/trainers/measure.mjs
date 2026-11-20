// Tezlik o'lchovi (sinov emas — raqamlar mashinaga bog'liq). Natija: out/measure-<sana>.json va jadval (stdout).
//   node measure.mjs                       — 07, 08, 09, 10, 11; desktop va telefon; har biri 3 marta
//   node measure.mjs shit-montaji phone 5  — bitta trenajyor, bitta profil, 5 marta
//
// Nima o'lchanadi (har bir ko'rsatkich — bir necha o'lchovning medianasi):
//   load      — sahifa ochilishidan birinchi asosiy kadr chizilguncha (ms, performance.now)
//   calls0    — birinchi kadrdagi draw call (soya xaritasi bilan)
//   connect   — sim ulash: ikkinchi qisqich bosilganda pointerdown ishlovchisining sinxron vaqti (ms),
//               butun yechim bo'yicha mediana va maksimum (simlar ko'paygan sari qimmatlashadi)
//   frameMs   — ulashdan keyingi kadrda renderer.render() ning JS vaqti (ms, mediana)
//   calls     — yechim to'liq yig'ilgan, kamera siljigan statik kadrdagi draw call va uchburchaklar
//   callsOn   — kuchlanish berilgan (tok oqimi animatsiyasi) kadrdagi draw call
// 08 (detal yig'ish) uchun connect o'rniga "place": detal qo'yilgandagi pointerup ishlovchisi vaqti.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as H from "./harness.mjs";
import { TRAINERS, MCB_SNAP } from "./specs.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const [argT, argP, argN] = process.argv.slice(2);
const NAMES = argT && argT !== "all" ? argT.split(",") : Object.keys(TRAINERS);
const PROFS = argP ? argP.split(",") : ["desktop", "phone"];
const RUNS = +argN || 3;

const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1) / 2)] : null; };
const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);

async function lastFrame(page) { await H.idle(page, 4000); return page.evaluate(() => window.__probe.frames.at(-1)); }

async function once(browser, base, name, prof) {
  const cfg = TRAINERS[name];
  // 08: detal ro'yxatdan tanlanib joyi barmoq bilan bosiladi (desktop profilida ham sensor yoqiladi)
  const { page, ctx, errors } = await H.openTrainer(browser, base, name, cfg.kind === "parts" && prof === "desktop" ? "desktopTouch" : prof);
  const res = {};
  const f0 = await page.evaluate(() => ({ first: window.__probe.first, f: window.__probe.frames[0] }));
  res.load = f0.first; res.calls0 = f0.f.calls;
  const conn = [], fms = [];
  if (cfg.kind === "wiring") {
    for (const [a, b] of cfg.full.slice(cfg.prewired)) {
      await H.tapTerminal(page, a);
      const n0 = await page.evaluate(() => window.__probe.frames.length);
      const ev = await H.tapTerminal(page, b);
      const d = ev.find((e) => e.type === "pointerdown");
      if (d) conn.push(d.ms);
      await page.waitForFunction((n) => window.__probe.frames.length > n, n0, { timeout: 10000 }).catch(() => {});
      const f = await page.evaluate((n) => window.__probe.frames[n], n0);
      if (f) fms.push(f.ms);
    }
    const ok = await page.evaluate(() => document.getElementById("status").textContent);
    res.solvedMsg = ok;
  } else {
    for (const id of ["t1", "t2", "chute", "arm", "coil", "core", "bi", "shA", "shB", "mech", "handle", "din"]) {
      await page.click(`#plist li[data-id="${id}"]`);
      await page.waitForTimeout(300);
      const ev = await H.touchAt(page, ...MCB_SNAP[id]);
      const u = ev.find((e) => e.type === "pointerup"); if (u) conn.push(u.ms);
      await page.waitForFunction((i) => document.querySelector(`#plist li[data-id="${i}"]`).classList.contains("done"), id, { timeout: 10000 });
      const f = await lastFrame(page); fms.push(f.ms);
    }
  }
  res.connectMed = med(conn); res.connectMax = conn.length ? Math.max(...conn) : null; res.frameMs = med(fms);
  // statik kadr: kamerani bir pog'ona yaqinlashtirib qayta chizdirish
  await page.click("#zin"); const fs1 = await lastFrame(page);
  res.calls = fs1.calls; res.tris = fs1.tris; res.staticMs = fs1.ms;
  if (cfg.kind === "wiring") {
    await page.click("#power"); await page.waitForTimeout(1200);
    const fp = await page.evaluate(() => window.__probe.frames.at(-1));
    res.callsOn = fp.calls; res.onMs = fp.ms;
  }
  res.errors = errors;
  await ctx.close();
  return res;
}

const srv = await H.startServer();
const browser = await H.launch();
const all = {};
for (const name of NAMES) for (const prof of PROFS) {
  const runs = [];
  for (let i = 0; i < RUNS; i++) { const r = await once(browser, srv.base, name, prof); runs.push(r); process.stderr.write(`${name} ${prof} #${i + 1}: ${JSON.stringify(r)}\n`); }
  const pick = (k) => r1(med(runs.map((r) => r[k]).filter((x) => x != null)));
  all[`${name}|${prof}`] = { name, no: TRAINERS[name].no, prof, runs: RUNS,
    load: pick("load"), calls0: pick("calls0"), connectMed: pick("connectMed"), connectMax: pick("connectMax"),
    frameMs: pick("frameMs"), calls: pick("calls"), tris: pick("tris"), staticMs: pick("staticMs"), callsOn: pick("callsOn"), onMs: pick("onMs"),
    errors: [...new Set(runs.flatMap((r) => r.errors))] };
}
await browser.close(); srv.close();

const outDir = path.join(here, "out"); fs.mkdirSync(outDir, { recursive: true });
const file = path.join(outDir, `measure-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`);
fs.writeFileSync(file, JSON.stringify(all, null, 1));
console.log(`| № | Trenajyor | Profil | Ochilish, ms | Sim ulash (med / max), ms | Kadr, ms | Draw call: 1-kadr / statik / tok oqimi | Uchburchak |`);
console.log(`|---|---|---|---|---|---|---|---|`);
for (const r of Object.values(all)) console.log(`| ${r.no} | ${r.name} | ${r.prof} | ${r.load} | ${r.connectMed} / ${r.connectMax} | ${r.frameMs} | ${r.calls0} / ${r.calls} / ${r.callsOn ?? "—"} | ${r.tris} |`);
console.log("\n" + file);
