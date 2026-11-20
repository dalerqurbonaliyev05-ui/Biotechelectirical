// Ssenariyni bajarish va har qadamdagi holatni yozib olish.
import * as H from "./harness.mjs";
import { TRAINERS, MCB_SNAP } from "./specs.mjs";

// Sahifaga: #status o'zgarishlarini (matn + ohang) yozib boruvchi kuzatuvchi va holat suratini oluvchi funksiya
async function install(page, cfg) {
  await page.evaluate(({ ids, lists, norm }) => {
    const re = (norm || []).map(([a, b]) => [new RegExp(a, "g"), b]);
    const N = (s) => { s = (s || "").replace(/\s+/g, " ").trim(); re.forEach(([a, b]) => { s = s.replace(a, b); }); return s; };
    const H = window.__h;
    H.log = [];
    const st = document.getElementById("status"), st2 = document.getElementById("status2");
    new MutationObserver(() => { H.log.push([N(st.textContent), st2 ? st2.className : ""]); })
      .observe(st, { childList: true, characterData: true, subtree: true });
    H.snap = () => {
      const o = {};
      ids.forEach((spec) => {
        const [id, only] = spec.split(":");
        const e = document.getElementById(id);
        if (!e) { o[id] = null; return; }
        const r = {};
        const t = e.tagName === "INPUT" || e.tagName === "SELECT" ? e.value : N(e.textContent);
        if (t) r.t = t;
        if (e.hidden) r.h = 1;
        if (e.disabled) r.d = 1;
        if (e.className && typeof e.className === "string") r.c = e.className;
        const p = e.getAttribute("aria-pressed"); if (p != null) r.p = p;
        if (only) Object.keys(r).forEach((k) => { if (!only.includes(k)) delete r[k]; });
        o[id] = r;
      });
      Object.entries(lists).forEach(([k, sel]) => {
        o[k] = [...document.querySelectorAll(sel)].map((li) => (li.className ? li.className + "|" : "") + N(li.textContent));
      });
      const msgs = H.log; H.log = [];
      return { msgs, state: o };
    };
  }, { ids: cfg.ids, lists: cfg.lists, norm: cfg.norm });
}

async function waitSnap(page, cond, timeout = 120000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const r = await page.evaluate((c) => { try { if (!(new Function("return (" + c + ")"))()) return null; } catch (e) { return null; } return window.__h.snap(); }, cond);
    if (r) return r;
    await page.waitForTimeout(50);
  }
  throw new Error("shart bajarilmadi: " + cond);
}

async function domClick(page, id) {
  const st = await page.evaluate((i) => { const e = document.getElementById(i); if (!e) return "yo'q"; if (e.disabled) return "disabled"; let x = e; while (x) { if (x.hidden) return "hidden"; x = x.parentElement; } return "ok"; }, id);
  if (st !== "ok") return st;
  await page.click("#" + id, { timeout: 10000, noWaitAfter: true });
  return null;
}

async function holdButton(page, id, down) {
  const loc = page.locator("#" + id);
  if (down) {
    if (await loc.isDisabled()) return "disabled";
    await loc.scrollIntoViewIfNeeded();
    const b = await loc.boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
  } else {
    await page.mouse.up();
  }
  return null;
}

// 08: tanlangan detalni (x,y) dunyo nuqtasiga qo'yish — joyini barmoq bilan bosish
async function placeAt(page, x, y) {
  await page.waitForTimeout(300);
  await H.touchAt(page, x, y);
}

function label(s) {
  if (s.w) return `sim ${s.w[0]} — ${s.w[1]}`;
  if (s.t) return `bosish ${s.t}`;
  if (s.c) return `tugma #${s.c}`;
  if (s.down) return `bosib turish #${s.down}`;
  if (s.up) return `qo'yib yuborish #${s.up}`;
  if (s.sel) return `tanlash #${s.sel[0]} = ${s.sel[1]}`;
  if (s.range) return `surgich #${s.range[0]} = ${s.range[1]}`;
  if (s.part) return `detal tanlash ${s.part}`;
  if (s.place) return `detalni joyiga qo'yish ${s.place}`;
  if (s.placeAt) return `detalni (${s.placeAt}) ga qo'yish`;
  return JSON.stringify(s);
}

// Avvalgi holatdan farqini olish (golden fayl ixcham va o'qilishi oson bo'lsin)
function diff(prev, cur) {
  if (!prev) return cur;
  const d = {};
  for (const k of Object.keys(cur)) if (JSON.stringify(prev[k]) !== JSON.stringify(cur[k])) d[k] = cur[k];
  return d;
}

export async function runScenario(browser, base, name, scen, opts = {}) {
  const cfg = TRAINERS[name];
  const { page, ctx, errors } = await H.openTrainer(browser, base, name, opts.profile || cfg.profile || "func");
  await install(page, cfg);
  const out = [];
  let prev = null;
  const record = (step, r, extra) => {
    out.push({ step, ...(extra || {}), msgs: r.msgs, state: diff(prev, r.state) });
    prev = r.state;
  };
  record("ochilish", await page.evaluate(() => window.__h.snap()));
  let steps = cfg.scenarios[scen];
  const expand = [];
  for (const s of steps) {
    if (s.solve) {
      const list = s.solve === "learn" ? cfg.full.slice(cfg.prewired) : cfg.full;
      list.forEach((w) => expand.push({ w }));
    } else expand.push(s);
  }
  try { for (const s of expand) {
    let note = null;
    if (s.w) { await H.tapTerminal(page, s.w[0]); await H.tapTerminal(page, s.w[1]); }
    else if (s.t) await H.tapTerminal(page, s.t);
    else if (s.c) note = await domClick(page, s.c);
    else if (s.down) note = await holdButton(page, s.down, true);
    else if (s.up) note = await holdButton(page, s.up, false);
    else if (s.sel) await page.selectOption("#" + s.sel[0], s.sel[1]);
    else if (s.range) await page.evaluate(([id, v]) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event("input", { bubbles: true })); }, s.range);
    else if (s.part) await page.click(`#plist li[data-id="${s.part}"]`, { noWaitAfter: true });
    else if (s.place) await placeAt(page, ...MCB_SNAP[s.place]);
    else if (s.placeAt) await placeAt(page, ...s.placeAt);
    else throw new Error("noma'lum qadam " + JSON.stringify(s));
    // simulyatsiya holati kadr ichida yangilanadi: 2 ta yangi kadr chizilishini kutish (sahna tinch bo'lsa 300 ms)
    await page.waitForFunction((n) => window.__probe.frames.length >= n + 2, await page.evaluate(() => window.__probe.frames.length), { timeout: 300, polling: "raf" }).catch(() => {});
    const r = s.then ? await waitSnap(page, s.then) : await page.evaluate(() => window.__h.snap());
    record(label(s), r, note ? { note } : null);
  } } catch (e) { e.partial = out; await ctx.close(); throw e; }
  await ctx.close();
  return { steps: out, errors };
}
