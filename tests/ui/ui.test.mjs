// Brauzer sinovlari: haqiqiy Chromium + soxta Supabase (fake-supabase.js). `npm test`
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, "../../yangiloyiha1");
const FAKE = fs.readFileSync(path.join(here, "fake-supabase.js"), "utf8");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" };
const CHROME = process.env.CHROMIUM_PATH || ["/opt/pw-browsers/chromium-1194/chrome-linux/chrome"].find((p) => fs.existsSync(p));

let server, base, browser, PHOTO;
before(async () => {
  server = http.createServer((req, res) => {
    const u = new URL(req.url, "http://x");
    if (u.pathname === "/favicon.ico") { res.writeHead(204); return res.end(); }
    if (u.pathname === "/__photo.jpg") { res.writeHead(200, { "Content-Type": "image/jpeg" }); return res.end(PHOTO); }
    let p = path.join(ROOT, decodeURIComponent(u.pathname));
    if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end("yo'q"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" }); fs.createReadStream(p).pipe(res);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
  // Sinov rasmi: haqiqiy JPEG (brauzerning o'zida chiziladi)
  const pg = await browser.newPage();
  const b64 = await pg.evaluate(() => { const c = document.createElement("canvas"); c.width = 80; c.height = 60; const g = c.getContext("2d"); g.fillStyle = "#2a8"; g.fillRect(0, 0, 80, 60); g.fillStyle = "#fff"; g.fillRect(10, 10, 30, 20); return c.toDataURL("image/jpeg", 0.8).split(",")[1]; });
  PHOTO = Buffer.from(b64, "base64"); await pg.close();
});
after(async () => { await browser?.close(); server?.close(); });

// ---------- Boshlang'ich ma'lumotlar ----------
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
const E = (l) => (/^\d+$/.test(l) ? `${l}@students.res.invalid` : `${l}@staff.res.invalid`);
const U = { admin: "u-admin", res: "u-res", amal: "u-amal", st1: "u-st1", st2: "u-st2", temp: "u-temp", off: "u-off", st3: "u-st3" };
function seed() {
  const users = [
    [U.admin, "berdiqulov", "AdminPass1"], [U.res, "raxmonov", "ResPass123"], [U.amal, "rustamov", "AmalPass123"],
    [U.st1, "999221110001", "Talaba123"], [U.st2, "999221110002", "Talaba123"], [U.temp, "yangi", "TEMP-PASS-1234"], [U.off, "ketgan", "Ketgan1234"],
  ];
  return {
    auth_users: users.map(([id, l, password]) => ({ id, email: E(l), password, user_metadata: id === U.temp ? { must_change_password: true } : {} })),
    profiles: [
      { id: U.admin, login: "berdiqulov", full_name: "Berdiqulov Nodir", role: "admin", active: true },
      { id: U.res, login: "raxmonov", full_name: "Raxmonov I.O.", role: "res_head", active: true },
      { id: U.amal, login: "rustamov", full_name: "Rustamov A.", role: "practice_head", active: true },
      { id: U.st1, login: "999221110001", full_name: "Karimov Sardor Akmal o'g'li", role: "student", active: true },
      { id: U.st2, login: "999221110002", full_name: "Yusupova Dilnoza Bahrom qizi", role: "student", active: true },
      { id: U.temp, login: "yangi", full_name: "Yangi Xodim", role: "res_head", active: true },
      { id: U.off, login: "ketgan", full_name: "Ketgan Xodim", role: "res_head", active: false },
    ],
    students: [
      { id: "s1", hemis_id: "999221110001", full_name: "Karimov Sardor Akmal o'g'li", group_name: "E-31", course: 3, faculty: "Energetika", specialty: "Elektr ta'minoti", university: "TDTU", kafedra: "Elektr ta'minoti", active: true, profile_id: U.st1 },
      { id: "s2", hemis_id: "999221110002", full_name: "Yusupova Dilnoza Bahrom qizi", group_name: "E-31", course: 3, faculty: "Energetika", specialty: "Elektr ta'minoti", university: "TDTU", kafedra: "Elektr ta'minoti", active: true, profile_id: U.st2 },
      { id: "s3", hemis_id: "999221110003", full_name: "Toshmatov Jasur Rustam o'g'li", group_name: "E-31", course: 3, faculty: "Energetika", university: "TDTU", kafedra: "Elektr ta'minoti", active: true, profile_id: null },
      { id: "s4", hemis_id: "999221110004", full_name: "Abdullayeva Madina Oybek qizi", group_name: "E-32", course: 3, faculty: "Energetika", university: "TDTU", kafedra: "Elektr ta'minoti", active: true, profile_id: null },
    ],
    settings: [{ id: true, org_name: "Ulug'bek tuman elektr tarmoqlari korxonasi (RES)", head_name: "Raxmonov I.O.", head_position: "RES boshlig'i" }],
    practice_periods: [{ id: "p3", course: 3, title: "3-kurs: Texnologik amaliyot", starts_on: day(-10), ends_on: day(20) }],
    brigades: [{ id: "b1", name: "Brigada-1", leader_name: "Usta Olimov", active: true }, { id: "b2", name: "Brigada-2", leader_name: "Usta Karimov", active: true }],
    attendance: [
      { id: "a1", student_id: "s1", work_date: day(-3), status: "yakunlangan", time_in: "09:00", time_out: "18:00", brigade_id: "b1", brigade_name: "Brigada-1", leader: "Usta Olimov", task: "Kabel tortish" },
      { id: "a2", student_id: "s1", work_date: day(-2), status: "kelmadi", time_in: null, time_out: null, brigade_id: null, brigade_name: null, leader: null, task: null },
      { id: "a3", student_id: "s1", work_date: day(-1), status: "yakunlangan", time_in: "09:10", time_out: "17:30", brigade_id: "b2", brigade_name: "Brigada-2", leader: "Usta Karimov", task: "Transformator ko'rigi" },
    ],
    approvals: [{ id: "a1b2c3d4-1111-2222-3333-444455556666", student_id: "s1", period_id: "p3", kind: "kundalik", state: "pending", requested_at: new Date().toISOString() }],
    tasks: [{ id: "t1", group_name: "E-31", student_id: null, title: "Kabel jurnalini to'ldiring", body: "Har kuni yozib boring", due_on: day(5), created_at: new Date().toISOString() }],
    announcements: [{ id: "n1", title: "Amaliyot vaqti o'zgardi", body: "Ertadan 08:00 da", target_course: null, created_at: new Date().toISOString() }],
  };
}

// ---------- Yordamchilar ----------
async function open(opts = {}) {
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
  const sd = opts.seed || seed();
  const session = opts.as ? { access_token: "tok-" + opts.as, user: { id: opts.as, email: sd.auth_users.find((u) => u.id === opts.as).email, user_metadata: sd.auth_users.find((u) => u.id === opts.as).user_metadata || {} } } : null;
  await ctx.addInitScript(({ sd, session }) => {
    window.__SEED__ = sd;
    if (session && !localStorage.getItem("fakeSession") && !localStorage.getItem("fakeDb")) localStorage.setItem("fakeSession", JSON.stringify(session));
  }, { sd, session });
  const page = await ctx.newPage();
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) page.errors.push("console: " + m.text()); });
  page.on("response", (r) => { if (r.url().startsWith(base) && r.status() >= 400) page.errors.push(`HTTP ${r.status()}: ${r.url()}`); });
  await page.route("**/vendor/supabase-js.umd.js", (r) => r.fulfill({ contentType: "application/javascript", body: FAKE }));
  page.fns = {};
  await page.route("**/functions/v1/*", async (route) => {
    const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "POST, OPTIONS" };
    const req = route.request();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const name = new URL(req.url()).pathname.split("/").pop();
    const h = page.fns[name];
    if (!h) return route.fulfill({ status: 404, headers: cors, contentType: "application/json", body: JSON.stringify({ error: "mock yo'q: " + name }) });
    const out = await h(req.postDataJSON(), req.headers());
    return route.fulfill({ status: out.status || 200, headers: cors, contentType: "application/json", body: JSON.stringify(out.body) });
  });
  return { ctx, page };
}
const go = async (page, file) => { await page.goto(`${base}/${file}`); };
const db = (page) => page.evaluate(() => window.__fake.db());
const clean = (page) => assert.deepEqual(page.errors, [], "Brauzerda xato: " + page.errors.join(" | "));
const login = async (page, l, p) => { await go(page, "login.html"); await page.fill("#login", l); await page.fill("#password", p); await page.click("#loginBtn"); };
const section = async (page, id) => { await page.click(`button[data-id=${id}]`); await page.waitForSelector(`button[data-id=${id}].active`); await page.waitForFunction(() => !document.querySelector("#content .loading")); };
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
async function pdfOf(page, selector) {
  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 20000 }), page.click(selector)]);
  const buf = fs.readFileSync(await dl.path());
  assert.equal(buf.subarray(0, 5).toString(), "%PDF-");
  return { buf, text: buf.toString("latin1"), name: dl.suggestedFilename() };
}

// ====================== KIRISH ======================
test("kirish: noto'g'ri parol aniq xabar beradi va sahifadan chiqarmaydi", async () => {
  const { ctx, page } = await open();
  await login(page, "raxmonov", "xato-parol");
  await page.waitForSelector("#msg:not(.hidden)");
  assert.match(await page.textContent("#msg"), /Login yoki parol noto'g'ri/);
  assert.match(page.url(), /login\.html/);
  clean(page); await ctx.close();
});

test("kirish: har bir rol o'z sahifasiga yo'naltiriladi", async () => {
  for (const [l, p, file] of [["berdiqulov", "AdminPass1", "admin_panel"], ["raxmonov", "ResPass123", "res_panel"], ["rustamov", "AmalPass123", "amaliyot_panel"], ["999221110001", "Talaba123", "talaba_portali"]]) {
    const { ctx, page } = await open();
    await login(page, l, p);
    await page.waitForURL(new RegExp(file), { timeout: 15000 });
    await page.waitForSelector("#content h2");
    clean(page); await ctx.close();
  }
});

test("kirish: HEMIS ID harf bilan boshlangan loginga aralashmaydi (xodim emaili)", async () => {
  const { ctx, page } = await open();
  await login(page, "RAXMONOV", "ResPass123"); // katta harf ham ishlaydi
  await page.waitForURL(/res_panel/, { timeout: 15000});
  await ctx.close();
});

test("kirish: faol bo'lmagan hisob kira olmaydi", async () => {
  const { ctx, page } = await open();
  await login(page, "ketgan", "Ketgan1234");
  await page.waitForSelector("#msg:not(.hidden)");
  assert.match(await page.textContent("#msg"), /faol emas/);
  assert.equal(await page.evaluate(() => localStorage.getItem("fakeSession")), null, "sessiya yopilishi kerak");
  clean(page); await ctx.close();
});

test("kirish: vaqtinchalik parol bilan kirganda yangi parol o'rnatish majburiy", async () => {
  const { ctx, page } = await open();
  await login(page, "yangi", "TEMP-PASS-1234");
  await page.waitForSelector("#changeForm:not(.hidden)");
  await page.fill("#cPass", "qisqa"); await page.fill("#cPass2", "qisqa"); await page.click("#changeBtn");
  assert.match(await page.textContent("#msg"), /kamida 8/);
  await page.fill("#cPass", "YangiParol-77"); await page.fill("#cPass2", "boshqa-parol-1"); await page.click("#changeBtn");
  assert.match(await page.textContent("#msg"), /bir xil emas/);
  await page.fill("#cPass", "TEMP-PASS-1234"); await page.fill("#cPass2", "TEMP-PASS-1234"); await page.click("#changeBtn");
  assert.match(await page.textContent("#msg"), /farq qilishi/);
  await page.fill("#cPass", "YangiParol-77"); await page.fill("#cPass2", "YangiParol-77"); await page.click("#changeBtn");
  await page.waitForURL(/res_panel/, { timeout: 15000 });
  const d = await db(page);
  assert.equal(d.auth_users.find((u) => u.id === U.temp).password, "YangiParol-77");
  assert.equal(d.auth_users.find((u) => u.id === U.temp).user_metadata.must_change_password, false);
  clean(page); await ctx.close();
});

test("himoya: parolni almashtirmagan foydalanuvchi panelga o'ta olmaydi", async () => {
  const { ctx, page } = await open({ as: U.temp });
  await go(page, "res_panel.html");
  await page.waitForURL(/login\.html\?change=1/);
  await page.waitForSelector("#changeForm:not(.hidden)");
  clean(page); await ctx.close();
});

test("faollashtirish: noto'g'ri kod qolgan urinishlarni ko'rsatadi, to'g'ri kod bilan kiradi", async () => {
  const { ctx, page } = await open();
  page.fns["activate-student"] = async (b) => {
    if (b.code.replace(/-/g, "").toUpperCase() !== "ABCD2345") return { status: 400, body: { error: "HEMIS ID yoki faollashtirish kodi noto'g'ri", attempts_left: 3 } };
    await page.evaluate((id) => {
      window.__fake.addUser({ id: "u-new", email: `${id}@students.res.invalid`, password: "Parol-12345", user_metadata: {} });
      const d = window.__fake.db(); d.profiles.push({ id: "u-new", login: id, full_name: "Toshmatov Jasur Rustam o'g'li", role: "student", active: true });
      d.students.find((s) => s.hemis_id === id).profile_id = "u-new"; window.__fake.save();
    }, b.hemis_id);
    return { body: { ok: true, login: b.hemis_id } };
  };
  await go(page, "login.html");
  await page.click("#tabActivate");
  await page.fill("#aHemis", "999221110003"); await page.fill("#aPass", "Parol-12345"); await page.fill("#aPass2", "Parol-12345");
  await page.fill("#aCode", "XXXX-XXXX"); await page.click("#activateBtn");
  await page.waitForFunction(() => /qolgan urinishlar: 3/.test(document.querySelector("#msg").textContent));
  await page.fill("#aPass2", "Boshqa-12345"); await page.fill("#aCode", "abcd-2345"); await page.click("#activateBtn");
  await page.waitForFunction(() => /bir xil emas/.test(document.querySelector("#msg").textContent));
  await page.fill("#aPass2", "Parol-12345"); await page.click("#activateBtn");
  await page.waitForURL(/talaba_portali/, { timeout: 15000 });
  await page.waitForSelector("#content h2");
  clean(page); await ctx.close();
});

// ====================== HIMOYA (rol bo'yicha kirish) ======================
test("himoya: kirmagan foydalanuvchi login sahifasiga qaytariladi", async () => {
  for (const f of ["admin_panel", "res_panel", "amaliyot_panel", "talaba_portali"]) {
    const { ctx, page } = await open();
    await go(page, `${f}.html`); await page.waitForURL(/login\.html/); clean(page); await ctx.close();
  }
});

test("himoya: har bir rol faqat o'z sahifasiga kira oladi", async () => {
  const cases = [
    [U.st1, "admin_panel", "talaba_portali"], [U.st1, "res_panel", "talaba_portali"], [U.st1, "amaliyot_panel", "talaba_portali"],
    [U.res, "admin_panel", "res_panel"], [U.res, "amaliyot_panel", "res_panel"], [U.res, "talaba_portali", "res_panel"],
    [U.amal, "admin_panel", "amaliyot_panel"], [U.amal, "res_panel", "amaliyot_panel"], [U.amal, "talaba_portali", "amaliyot_panel"],
    [U.admin, "talaba_portali", "admin_panel"],
  ];
  for (const [who, from, to] of cases) {
    const { ctx, page } = await open({ as: who });
    await go(page, `${from}.html`); await page.waitForURL(new RegExp(to), { timeout: 15000 });
    clean(page); await ctx.close();
  }
});

test("himoya: admin RES va amaliyot panellarini ham ocha oladi", async () => {
  for (const f of ["res_panel", "amaliyot_panel"]) {
    const { ctx, page } = await open({ as: U.admin });
    await go(page, `${f}.html`); await page.waitForSelector("#content h2"); assert.match(page.url(), new RegExp(f)); clean(page); await ctx.close();
  }
});

test("himoya: faolsizlantirilgan foydalanuvchining eski sessiyasi ishlamaydi", async () => {
  const { ctx, page } = await open({ as: U.off });
  await go(page, "res_panel.html"); await page.waitForURL(/login\.html\?x=inactive/);
  await page.waitForSelector("#msg:not(.hidden)"); clean(page); await ctx.close();
});

// ====================== TALABA PORTALI ======================
test("talaba: barcha bo'limlar xatosiz ochiladi va to'g'ri ma'lumot ko'rsatadi", async () => {
  const { ctx, page } = await open({ as: U.st1 });
  await go(page, "talaba_portali.html"); await page.waitForSelector("#content h2");
  assert.match(await page.textContent("#content"), /Sardor|Karimov/);
  assert.match(await page.textContent("#content"), /999221110001/);
  assert.match(await page.textContent("#content"), /3-kurs Texnologik|3-kurs: Texnologik/);
  assert.match(await page.textContent("#timerBox"), /tugashiga qoldi/);
  assert.match(await page.textContent("#content"), /Amaliyot vaqti o'zgardi/, "e'lon ko'rinmadi");
  await section(page, "attendance"); assert.equal(await page.locator("#content .att").count(), 3);
  await section(page, "brigade"); assert.match(await page.textContent("#content"), /Transformator ko'rigi/);
  await section(page, "tasks"); assert.match(await page.textContent("#content"), /Kabel jurnalini/);
  await section(page, "photos"); assert.equal(await page.locator("[data-day]").count(), 2, "faqat kelgan kunlar uchun rasm bloki");
  await section(page, "finish");
  await section(page, "docs");
  assert.equal(await page.locator('a[href*="1Umfsb_H4eaeIp8jyfOS2ZG4P1gfMhXPJ"]').count(), 1, "4-kurs havolasi");
  await section(page, "feedback");
  clean(page); await ctx.close();
});

test("talaba: boshqa talabaning ma'lumotini ko'rmaydi (o'z davomati)", async () => {
  const { ctx, page } = await open({ as: U.st2 });
  await go(page, "talaba_portali.html"); await page.waitForSelector("#content h2");
  await section(page, "attendance");
  assert.match(await page.textContent("#content"), /Hech qanday ma'lumot yo'q|yo'q/);
  assert.equal(await page.locator("#content .att").count(), 0);
  clean(page); await ctx.close();
});

test("talaba: rasm yuklaydi (siqiladi), o'chiradi; taklif yuboradi", async () => {
  const { ctx, page } = await open({ as: U.st1 });
  await go(page, "talaba_portali.html"); await page.waitForSelector("#content h2");
  await section(page, "photos");
  await page.locator("[data-day] .up").first().setInputFiles({ name: "ish.png", mimeType: "image/png", buffer: PNG });
  await page.waitForSelector("[data-day] .thumb");
  let d = await db(page);
  assert.equal(d.photos.length, 1); assert.equal(d.storage.length, 1);
  assert.equal(d.storage[0].type, "image/jpeg", "JPEG'ga aylantirilishi kerak");
  assert.match(d.photos[0].storage_path, /^s1\/\d{4}-\d{2}-\d{2}\/[0-9a-f-]{36}\.jpg$/, "yo'l <student_id>/<sana>/<uuid>.jpg bo'lishi kerak");
  await page.locator("[data-day] .up").first().setInputFiles({ name: "matn.txt", mimeType: "text/plain", buffer: Buffer.from("salom") });
  await page.waitForSelector(".toast.err");
  assert.equal((await db(page)).photos.length, 1, "rasm bo'lmagan fayl yuklanmasligi kerak");
  await page.click(".thumb button"); await page.locator(".modal").getByRole("button", { name: "O'chirish", exact: true }).click();
  await page.waitForFunction(() => !document.querySelector(".thumb"));
  d = await db(page); assert.equal(d.photos.length, 0); assert.equal(d.storage.length, 0);
  await section(page, "feedback");
  await page.fill("#fbText", "Brigada ustasi yaxshi o'rgatdi"); await page.click("#fbSend");
  await page.waitForFunction(() => /Brigada ustasi yaxshi/.test(document.querySelector("#content").textContent));
  assert.equal((await db(page)).feedbacks[0].student_id, "s1");
  clean(page); await ctx.close();
});

test("talaba: yuklash xatosi foydalanuvchiga ko'rsatiladi va bazaga yarim yozuv qolmaydi", async () => {
  const { ctx, page } = await open({ as: U.st1 });
  await go(page, "talaba_portali.html"); await page.waitForSelector("#content h2");
  await section(page, "photos");
  await page.evaluate(() => { window.__failUpload = true; });
  await page.locator("[data-day] .up").first().setInputFiles({ name: "ish.png", mimeType: "image/png", buffer: PNG });
  await page.waitForSelector(".toast.err");
  assert.equal((await db(page)).photos.length, 0);
  await ctx.close();
});

test("talaba: tasdiqlanmagan PDF pechat va imzosiz; tasdiqlashga yuboradi", async () => {
  const seedData = seed(); seedData.approvals = [];
  const { ctx, page } = await open({ as: U.st1, seed: seedData });
  await go(page, "talaba_portali.html"); await page.waitForSelector("#content h2");
  await section(page, "finish");
  const k = await pdfOf(page, "button[data-pdf=kundalik]");
  assert.equal(k.name, "Amaliyot_kundaligi_999221110001.pdf");
  assert.match(k.text, /Tasdiqlanmagan loyiha/); assert.doesNotMatch(k.text, /Tasdiq kodi/);
  assert.ok(!/\/Subtype \/Image/.test(k.text), "tasdiqlanmagan PDF'da rasm (pechat) bo'lmasligi kerak");
  const h = await pdfOf(page, "button[data-pdf=hisobot]");
  assert.equal(h.name, "Amaliyot_hisoboti_999221110001.pdf");
  await page.click("button[data-send=kundalik]");
  await page.waitForFunction(() => /Tasdiq kutilmoqda/.test(document.querySelector("#content").textContent));
  const d = await db(page); assert.equal(d.approvals.length, 1);
  assert.deepEqual([d.approvals[0].student_id, d.approvals[0].kind, d.approvals[0].state, d.approvals[0].period_id], ["s1", "kundalik", "pending", "p3"]);
  clean(page); await ctx.close();
});

test("talaba: ish kuni bo'lmasa PDF va tasdiq tugmasi to'sib qo'yiladi", async () => {
  const { ctx, page } = await open({ as: U.st2 });
  await go(page, "talaba_portali.html"); await page.waitForSelector("#content h2"); await section(page, "finish");
  assert.equal(await page.locator("button[data-send]").count(), 0);
  await page.click("button[data-pdf=kundalik]"); await page.waitForSelector(".toast.err");
  assert.match(await page.textContent(".toast.err"), /ish kuni yo'q/);
  clean(page); await ctx.close();
});

// ====================== RES RAHBARI ======================
test("RES: davomat belgilash, naryad, ommaviy qo'llash va saqlash", async () => {
  const { ctx, page } = await open({ as: U.res });
  await go(page, "res_panel.html"); await page.waitForSelector("#content h2");
  assert.match(await page.textContent("#content"), /Amaliyotdagi talabalar/);
  await section(page, "attendance");
  assert.equal(await page.locator("#tbl tbody tr[data-i]").count(), 4);
  // Talabalar ism bo'yicha tartiblanadi: Abdullayeva, Karimov, Toshmatov, Yusupova. row(i) - ism bo'yicha qator.
  const NAMES = ["Karimov", "Yusupova", "Toshmatov", "Abdullayeva"];
  const row = (i) => page.locator("#tbl tbody tr[data-i]", { hasText: NAMES[i] });
  await row(0).locator(".f-brigade").fill("Brigada-1");
  assert.equal(await row(0).locator(".f-leader").inputValue(), "Usta Olimov", "brigada tanlanganda usta avtomatik to'ladi");
  await row(0).locator(".f-task").fill("Podstansiya ko'rigi");
  await row(0).locator('[data-act="faol"]').click();
  assert.match(await row(0).locator(".f-in").inputValue(), /^\d\d:\d\d$/, "kelgan vaqti avtomatik qo'yildi");
  await row(1).locator('[data-act="yakunlangan"]').click(); // avval Keldi bosilmagan: rad etiladi
  await page.waitForSelector(".toast.err");
  await row(1).locator('[data-act="kelmadi"]').click();
  await page.locator("summary").click();
  await row(2).locator(".sel").check(); await row(3).locator(".sel").check();
  await page.fill("#bb", "Brigada-2"); await page.fill("#bt", "Kabel ulash"); await page.click("#bApply");
  await page.click("#save"); await page.waitForFunction(() => /yozuv saqlandi/.test(document.querySelector("#toasts")?.textContent || ""));
  const d = await db(page); const today = new Date(); const t = iso(today);
  const rows = d.attendance.filter((a) => a.work_date === t);
  assert.equal(rows.length, 4);
  const by = (s) => rows.find((a) => a.student_id === s);
  assert.deepEqual([by("s1").status, by("s1").brigade_name, by("s1").leader, by("s1").task, by("s1").brigade_id], ["faol", "Brigada-1", "Usta Olimov", "Podstansiya ko'rigi", "b1"]);
  assert.match(by("s1").time_in, /^\d\d:\d\d$/); assert.equal(by("s1").marked_by, U.res);
  assert.deepEqual([by("s2").status, by("s2").brigade_name, by("s2").task, by("s2").time_in], ["kelmadi", null, null, null]);
  assert.deepEqual([by("s3").status, by("s3").brigade_name, by("s3").leader, by("s3").task], ["faol", "Brigada-2", "Usta Karimov", "Kabel ulash"]);
  assert.equal(d.attendance.length, 3 + 4, "oldingi kunlar buzilmadi");
  // Qayta saqlash yangi dublikat yaratmaydi
  await row(0).locator(".f-task").fill("Boshqa ish"); await page.click("#save"); await page.waitForFunction(() => /\b1 ta yozuv saqlandi/.test(document.querySelector("#toasts")?.textContent || ""));
  const d2 = await db(page); assert.equal(d2.attendance.filter((a) => a.work_date === t).length, 4);
  assert.equal(d2.attendance.find((a) => a.student_id === "s1" && a.work_date === t).task, "Boshqa ish");
  clean(page); await ctx.close();
});

test("RES: kecha kunini tahrirlash mumkin; saqlanmagan o'zgarish sana almashtirganda so'raydi", async () => {
  const { ctx, page } = await open({ as: U.res });
  await go(page, "res_panel.html"); await page.waitForSelector("#content h2"); await section(page, "attendance");
  await page.fill("#d", day(-3));
  await page.waitForFunction(() => [...document.querySelectorAll("#tbl tbody tr")].find((r) => /Karimov/.test(r.textContent))?.querySelector(".f-task")?.value === "Kabel tortish");
  assert.equal(await page.locator("#tbl tbody tr", { hasText: "Karimov" }).locator(".f-in").inputValue(), "09:00");
  await page.locator("#tbl tbody tr", { hasText: "Karimov" }).locator(".f-task").fill("Yangi matn");
  await page.fill("#d", day(-1));
  await page.locator(".modal").getByRole("button", { name: "Davom etish" }).waitFor();
  await page.locator(".modal").getByRole("button", { name: "Bekor qilish" }).click();
  assert.equal(await page.inputValue("#d"), day(-3), "bekor qilinsa sana qaytadi");
  clean(page); await ctx.close();
});

test("RES: tasdiqlash -> talabada pechat va imzoli PDF; ma'lumot o'zgarsa tasdiq bekor bo'ladi", async () => {
  const { ctx, page } = await open({ as: U.res });
  await go(page, "res_panel.html"); await page.waitForSelector("#content h2"); await section(page, "approvals");
  assert.match(await page.textContent("#list"), /Karimov Sardor/);
  await page.click("[data-open]");
  assert.match(await page.textContent(".modal"), /Kabel tortish/); assert.doesNotMatch(await page.textContent(".modal"), /Kelmadi/);
  await page.getByRole("button", { name: "Tasdiqlash", exact: true }).click();
  await page.waitForFunction(() => /Tasdiqlandi/.test(document.querySelector("#toasts")?.textContent || ""));
  let d = await db(page); const ap = d.approvals[0];
  assert.deepEqual([ap.state, ap.decided_by, ap.days_count], ["approved", U.res, 2]);
  assert.match(ap.data_hash, /^[0-9a-f]{64}$/); assert.ok(ap.decided_at);
  // Hujjat kodini tekshirish
  await page.fill("#code", `${ap.id.slice(0, 8)}-${ap.data_hash.slice(0, 8)}`); await page.click("#chk");
  assert.match(await page.textContent("#chkOut"), /Hujjat haqiqiy/);
  await page.fill("#code", `${ap.id.slice(0, 8)}-00000000`); await page.click("#chk");
  assert.match(await page.textContent("#chkOut"), /topilmadi/);

  // Talaba: tasdiqlangan PDF
  await page.evaluate((id) => { localStorage.setItem("fakeSession", JSON.stringify({ access_token: "t", user: { id, email: "999221110001@students.res.invalid", user_metadata: {} } })); }, U.st1);
  await go(page, "talaba_portali.html"); await page.waitForSelector("#content h2"); await section(page, "finish");
  assert.match(await page.textContent("#content"), /Tasdiqlangan/);
  const ok = await pdfOf(page, "button[data-pdf=kundalik]");
  const code = `${ap.id.slice(0, 8)}-${ap.data_hash.slice(0, 8)}`.toUpperCase();
  assert.ok(ok.text.includes(`Tasdiq kodi: ${code}`), "PDF'da tasdiq kodi bo'lishi kerak");
  assert.doesNotMatch(ok.text, /Tasdiqlanmagan loyiha/);
  assert.ok((ok.text.match(/\/Subtype \/Image/g) || []).length >= 2, "pechat va imzo rasmlari PDF'da bo'lishi kerak");
  assert.ok(ok.text.includes("Raxmonov I.O."), "rahbar ismi");

  // Tasdiqdan keyin davomat o'zgaradi -> pechat qo'yilmaydi
  await page.evaluate(() => { const d = window.__fake.db(); d.attendance.find((a) => a.id === "a1").task = "O'zgartirilgan naryad"; window.__fake.save(); });
  await page.reload(); await page.waitForSelector("#content h2"); await section(page, "finish");
  assert.match(await page.textContent("#content"), /o'zgargan/);
  const bad = await pdfOf(page, "button[data-pdf=kundalik]");
  assert.match(bad.text, /Tasdiqlanmagan loyiha/); assert.ok(!bad.text.includes("Tasdiq kodi"));
  // RES rahbari o'zgarganini ko'radi va qayta tasdiqlaydi
  await page.evaluate((id) => { localStorage.setItem("fakeSession", JSON.stringify({ access_token: "t", user: { id, email: "raxmonov@staff.res.invalid", user_metadata: {} } })); }, U.res);
  await go(page, "res_panel.html#approvals"); await page.waitForSelector("#content h2");
  await page.click('#tabs [data-f="approved"]'); await page.click("[data-open]");
  assert.match(await page.textContent(".modal"), /o'zgargan/);
  await page.getByRole("button", { name: "Qayta tasdiqlash" }).click();
  await page.waitForFunction(() => /Tasdiqlandi/.test(document.querySelector("#toasts")?.textContent || ""));
  d = await db(page); assert.notEqual(d.approvals[0].data_hash, ap.data_hash, "yangi xesh");
  clean(page); await ctx.close();
});

test("RES: rad etish sababi talabaga ko'rinadi; talaba tuzatib qayta yuboradi", async () => {
  const { ctx, page } = await open({ as: U.res });
  page.on("dialog", (dlg) => dlg.accept("Naryad yetarli emas"));
  await go(page, "res_panel.html#approvals"); await page.waitForSelector("#content h2");
  await page.click("[data-open]"); await page.getByRole("button", { name: "Rad etish" }).click();
  await page.waitForFunction(() => /Rad etildi/.test(document.querySelector("#toasts")?.textContent || ""));
  assert.equal((await db(page)).approvals[0].note, "Naryad yetarli emas");
  await page.evaluate((id) => { localStorage.setItem("fakeSession", JSON.stringify({ access_token: "t", user: { id, email: "999221110001@students.res.invalid", user_metadata: {} } })); }, U.st1);
  await go(page, "talaba_portali.html#finish"); await page.waitForSelector("#content h2");
  assert.match(await page.textContent("#content"), /Naryad yetarli emas/);
  await page.click("[data-resend]");
  await page.waitForFunction(() => /Tasdiq kutilmoqda/.test(document.querySelector("#content").textContent));
  assert.equal((await db(page)).approvals[0].state, "pending");
  clean(page); await ctx.close();
});

test("RES: brigada qo'shish, tahrirlash, o'chirish; dublikat nomga xabar", async () => {
  const { ctx, page } = await open({ as: U.res });
  await go(page, "res_panel.html#brigades"); await page.waitForSelector("#content h2");
  await page.fill("#bn", "Brigada-3"); await page.fill("#bl", "Usta Rahimov"); await page.click("#bAdd");
  await page.waitForFunction(() => document.querySelectorAll("tr[data-id]").length === 3);
  await page.fill("#bn", "Brigada-3"); await page.click("#bAdd"); await page.waitForSelector(".toast.err");
  assert.match(await page.textContent(".toast.err"), /bor/);
  await page.locator("tr[data-id] .l").nth(2).fill("Usta Yangi"); await page.locator("tr[data-id] [data-save]").nth(2).click();
  await page.waitForFunction(() => /Saqlandi/.test((document.querySelector("#toasts")?.textContent || "")));
  assert.equal((await db(page)).brigades.find((b) => b.name === "Brigada-3").leader_name, "Usta Yangi");
  await page.locator("tr[data-id] [data-del]").nth(2).click(); await page.locator(".modal").getByRole("button", { name: "O'chirish", exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll("tr[data-id]").length === 2);
  clean(page); await ctx.close();
});

test("RES: hisobot va bosh sahifa", async () => {
  const { ctx, page } = await open({ as: U.res });
  await go(page, "res_panel.html#reports"); await page.waitForSelector("#content h2");
  await page.fill("#f", day(-5)); await page.click("#go");
  await page.waitForFunction(() => document.querySelectorAll("#out tbody tr").length === 4);
  assert.match(await page.textContent("#out"), /Karimov Sardor[\s\S]*?2[\s\S]*?1[\s\S]*?67%/);
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#csv")]);
  assert.match(fs.readFileSync(await dl.path(), "utf8"), /Kelgan kunlar/);
  clean(page); await ctx.close();
});

// ====================== AMALIYOT RAHBARI ======================
test("amaliyot rahbari: nazorat, topshiriq, e'lon, davr", async () => {
  const { ctx, page } = await open({ as: U.amal });
  await go(page, "amaliyot_panel.html"); await page.waitForSelector("#content h2");
  assert.match(await page.textContent("#content"), /Guruhlar bo'yicha bugungi davomat/);
  await section(page, "monitor");
  await page.fill("#f", day(-6));
  await page.waitForFunction(() => document.querySelectorAll("#out tbody tr").length === 4);
  await page.locator('[data-id="s1"]').click(); assert.match(await page.textContent(".modal"), /Kabel tortish/);
  await page.getByRole("button", { name: "Yopish" }).click();

  await section(page, "tasks");
  await page.fill("#tt", "Qo'shimcha topshiriq"); await page.fill("#tb", "Hisobotni yozing"); await page.click("#tAdd");
  await page.waitForFunction(() => /Qo'shimcha topshiriq/.test(document.querySelector("#content").textContent));
  let d = await db(page); assert.equal(d.tasks.find((t) => t.title === "Qo'shimcha topshiriq").group_name, "E-31");
  await page.selectOption("#tk", "student"); await page.fill("#tt", "Shaxsiy topshiriq"); await page.selectOption("#ts", "s3"); await page.click("#tAdd");
  await page.waitForFunction(() => /Shaxsiy topshiriq/.test(document.querySelector("#content").textContent));
  assert.equal((await db(page)).tasks.find((t) => t.title === "Shaxsiy topshiriq").student_id, "s3");

  await section(page, "announcements");
  await page.fill("#at", "Dushanba kuni yig'ilish"); await page.selectOption("#ac", "3"); await page.click("#aAdd");
  await page.waitForFunction(() => /Dushanba kuni/.test(document.querySelector("#content").textContent));
  assert.equal((await db(page)).announcements.find((a) => a.title.startsWith("Dushanba")).target_course, 3);

  await section(page, "periods");
  await page.fill("#pt", "Sinov amaliyoti"); await page.fill("#ps", day(30)); await page.fill("#pe", day(10)); await page.click("#pAdd");
  await page.waitForSelector(".toast.err"); assert.match(await page.textContent(".toast.err"), /Tugash sanasi/);
  await page.fill("#pe", day(60)); await page.click("#pAdd");
  await page.waitForFunction(() => /Sinov amaliyoti/.test(document.querySelector("#content").textContent));
  await section(page, "feedback");
  clean(page); await ctx.close();
});

test("amaliyot rahbari: HEMIS ro'yxatini yuklash -> talabalar va kodlar", async () => {
  const { ctx, page } = await open({ as: U.amal });
  let sent = null;
  page.fns["import-students"] = async (b, h) => {
    assert.match(h.authorization, /^Bearer tok-u-amal$/, "foydalanuvchi tokeni yuborilishi kerak");
    sent = b;
    await page.evaluate((rows) => { const d = window.__fake.db(); for (const r of rows) if (!d.students.find((s) => s.hemis_id === r.hemis_id)) d.students.push({ id: "n" + r.hemis_id, active: true, profile_id: null, ...r }); window.__fake.save(); }, b.students);
    const reissue = new Set(b.reissue_hemis_ids || []);
    const codes = b.students.filter((s) => !reissue.size || reissue.has(s.hemis_id)).map((s, i) => ({ hemis_id: s.hemis_id, full_name: s.full_name, group_name: s.group_name, code: `AAAA-B${String(i).padStart(3, "C")}` }));
    return { body: { total: b.students.length, created: b.students.length, updated: 0, already_activated: 0, kept_existing: 0, codes } };
  };
  await go(page, "amaliyot_panel.html#students"); await page.waitForSelector("#content h2");
  await page.fill("#impText", "HEMIS ID;F.I.SH;Guruh;Kurs\n999221110010;Ergashev Bobur;E-41;4-kurs\n999221110011;Nazarova Zilola;E-41;4\n12;Xato;E-41;4");
  await page.click("#impCheck");
  assert.match(await page.textContent("#impPreview"), /2<\/b> ta to'g'ri qator|2 ta to'g'ri qator/);
  assert.match(await page.textContent("#impPreview"), /1-qator|2-qator|4-qator/);
  await page.click("#impGo"); await page.waitForSelector("#dlCodes");
  assert.equal(sent.students.length, 2, "faqat to'g'ri qatorlar yuboriladi");
  assert.equal(sent.students[0].course, 4);
  assert.match(await page.textContent("#impResult"), /2<\/b> ta yangi|2 ta yangi faollashtirish kodi/);
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#dlCodes")]);
  const csv = fs.readFileSync(await dl.path(), "utf8"); assert.match(csv, /Ergashev Bobur;999221110010;AAAA-/);
  await page.waitForFunction(() => /6 \//.test(document.querySelector("#cnt").textContent));
  // Talabaga yangi kod
  page.fns["import-students"] = async (b) => { assert.deepEqual(b.reissue_hemis_ids, ["999221110003"]); return { body: { codes: [{ hemis_id: "999221110003", full_name: "x", code: "ZZZZ-9999" }] } }; };
  await page.fill("#q", "Toshmatov"); await page.waitForFunction(() => document.querySelectorAll("[data-code]").length === 1); await page.locator("[data-code]").click(); await page.getByRole("button", { name: "Yaratish" }).click();
  await page.waitForSelector(".modal code.kod"); assert.equal(await page.textContent(".modal code.kod >> nth=1"), "ZZZZ-9999");
  assert.match(await page.textContent(".modal"), /faqat hozir ko'rinadi/);
  clean(page); await ctx.close();
});

test("amaliyot rahbari: parolni tiklash faqat talabaga (manage-users)", async () => {
  const { ctx, page } = await open({ as: U.amal });
  page.fns["manage-users"] = async (b) => { assert.deepEqual([b.action, b.login], ["reset_password", "999221110001"]); return { body: { ok: true, login: b.login, temp_password: "ABCD-EFGH-JKLM" } }; };
  await go(page, "amaliyot_panel.html#students"); await page.waitForSelector("#content h2");
  await page.fill("#q", "Karimov"); await page.waitForFunction(() => document.querySelectorAll("[data-reset]").length === 1); await page.locator("[data-reset]").click(); await page.locator(".modal").getByRole("button", { name: "Tiklash", exact: true }).click();
  await page.waitForSelector(".modal code.kod"); assert.match(await page.textContent(".modal"), /ABCD-EFGH-JKLM/);
  clean(page); await ctx.close();
});

// ====================== ADMINISTRATOR ======================
test("admin: xodim yaratish, parol tiklash, faolsizlantirish, sozlamalar", async () => {
  const { ctx, page } = await open({ as: U.admin });
  const calls = [];
  page.fns["manage-users"] = async (b) => { calls.push(b); return { body: { ok: true, login: b.login, temp_password: "QWER-TYUI-ASDF", active: b.active } }; };
  await go(page, "admin_panel.html"); await page.waitForSelector("#content h2");
  assert.match(await page.textContent("#content"), /Faol talabalar/);
  await section(page, "users");
  assert.equal(await page.locator("#content tbody tr").count(), 5);
  assert.match(await page.textContent("#content"), /Siz/);
  assert.equal(await page.locator(`[data-active="berdiqulov"]`).count(), 0, "o'zini faolsizlantira olmaydi");
  await page.fill("#un", "Sobirov Anvar"); await page.fill("#ul", "sobirov"); await page.selectOption("#ur", "practice_head"); await page.click("#uAdd");
  await page.waitForSelector(".modal code.kod"); assert.match(await page.textContent(".modal"), /QWER-TYUI-ASDF/);
  assert.deepEqual(calls[0], { action: "create_staff", login: "sobirov", full_name: "Sobirov Anvar", role: "practice_head" });
  await page.getByRole("button", { name: "Yopish" }).click();
  await page.locator('[data-reset="raxmonov"]').click(); await page.locator(".modal").getByRole("button", { name: "Tiklash", exact: true }).click();
  await page.waitForSelector(".modal code.kod"); assert.deepEqual(calls[1], { action: "reset_password", login: "raxmonov" });
  await page.getByRole("button", { name: "Yopish" }).click();
  await page.locator('[data-active="raxmonov"]').click(); await page.locator(".modal").getByRole("button", { name: "Faolsizlantirish", exact: true }).click();
  await page.waitForFunction(() => /Bajarildi/.test((document.querySelector("#toasts")?.textContent || "")));
  assert.deepEqual(calls[2], { action: "set_active", login: "raxmonov", active: false });
  await section(page, "settings");
  await page.fill("#sh", "Yangi Rahbar Y.Y."); await page.click("#sSave");
  await page.waitForFunction(() => /Saqlandi/.test((document.querySelector("#toasts")?.textContent || "")));
  assert.equal((await db(page)).settings[0].head_name, "Yangi Rahbar Y.Y.");
  await section(page, "periods"); await section(page, "announcements"); await section(page, "students");
  clean(page); await ctx.close();
});

test("admin: server xatosi foydalanuvchiga ko'rsatiladi (login band)", async () => {
  const { ctx, page } = await open({ as: U.admin });
  page.fns["manage-users"] = async () => ({ status: 409, body: { error: "Bu login band" } });
  await go(page, "admin_panel.html#users"); await page.waitForSelector("#content h2");
  await page.fill("#un", "Kimdir"); await page.fill("#ul", "raxmonov"); await page.click("#uAdd");
  await page.waitForSelector(".toast.err"); assert.match(await page.textContent(".toast.err"), /Bu login band/);
  clean(page); await ctx.close();
});

// ====================== XAVFSIZLIK: XSS ======================
test("XSS: ism, naryad va e'londagi HTML skript sifatida ishlamaydi", async () => {
  const s = seed();
  const evil = `<img src=x onerror="window.__xss=1">`;
  s.students[0].full_name = `Karimov ${evil}`; s.profiles[3].full_name = `Karimov ${evil}`;
  s.attendance[0].task = evil; s.attendance[0].brigade_name = evil; s.announcements[0].title = evil; s.tasks[0].title = evil;
  for (const [who, file] of [[U.st1, "talaba_portali.html"], [U.res, "res_panel.html#attendance"], [U.amal, "amaliyot_panel.html#monitor"], [U.admin, "admin_panel.html#students"]]) {
    const { ctx, page } = await open({ as: who, seed: JSON.parse(JSON.stringify(s)) });
    await go(page, file); await page.waitForSelector("#content h2"); await page.waitForTimeout(300);
    for (const id of ["attendance", "brigade", "tasks"]) if (who === U.st1) await section(page, id);
    assert.equal(await page.evaluate(() => window.__xss), undefined, `${file}: XSS ishladi!`);
    assert.equal(await page.locator("#content img[src='x']").count(), 0);
    clean(page); await ctx.close();
  }
});

test("ulanish xatosi: sahifa qotib qolmaydi, 'qayta urinish' ko'rsatiladi", async () => {
  const { ctx, page } = await open({ as: U.res });
  await go(page, "res_panel.html"); await page.waitForSelector("#content h2");
  await page.evaluate(() => { window.__failTables = ["brigades"]; });
  await page.click("button[data-id=brigades]");
  await page.waitForSelector("#content .alert.err"); assert.match(await page.textContent("#content"), /yuklab bo'lmadi/);
  assert.equal(await page.locator("#content button", { hasText: "Qayta urinish" }).count(), 1);
  await ctx.close();
});

// ====================== CSP va rasmli hisobot ======================
test("CSP: begona inline skript bajarilmaydi, sahifalarda inline skript va onclick yo'q", async () => {
  for (const f of ["login", "talaba_portali", "res_panel", "amaliyot_panel", "admin_panel"]) {
    const html = fs.readFileSync(path.join(ROOT, `${f}.html`), "utf8");
    assert.match(html, /Content-Security-Policy/, `${f}: CSP yo'q`);
    assert.doesNotMatch(html, /<script(?![^>]*\ssrc=)[^>]*>[\s\S]*?\S[\s\S]*?<\/script>/, `${f}: inline skript`);
    assert.doesNotMatch(html, /\son(click|error|load)=/i, `${f}: inline hodisa`);
  }
  const { ctx, page } = await open({ as: U.res });
  await go(page, "res_panel.html"); await page.waitForSelector("#content h2");
  const r = await page.evaluate(() => { const s = document.createElement("script"); s.textContent = "window.__csp = 1"; document.head.appendChild(s); return window.__csp; });
  assert.equal(r, undefined, "CSP inline skriptni bloklashi kerak");
  assert.ok(page.errors.every((e) => /Content Security Policy/.test(e)), "kutilmagan xato: " + page.errors.join("|"));
  await ctx.close();
});

test("talaba: rasmli hisobot PDF (JPEG rasmlar bilan) va 'ma'lumot o'zgardi' holati", async () => {
  const sd = seed();
  sd.photos = [{ id: "ph1", student_id: "s1", work_date: day(-3), storage_path: `s1/${day(-3)}/a.jpg`, created_at: new Date().toISOString() }];
  const { ctx, page } = await open({ as: U.st1, seed: sd });
  await go(page, "talaba_portali.html"); await page.waitForSelector("#content h2"); await section(page, "photos");
  assert.equal(await page.locator(".thumb img").count(), 1);
  await section(page, "finish");
  const h = await pdfOf(page, "button[data-pdf=hisobot]");
  assert.ok((h.text.match(/\/Subtype \/Image/g) || []).length >= 1, "hisobotda rasm bo'lishi kerak");
  assert.match(h.text, /Kabel tortish/);
  assert.ok(h.text.includes("Transformator ko'rigi"));
  clean(page); await ctx.close();
});

test("talaba: rasm o'zgarsa tasdiqlangan hisobot yaroqsiz bo'ladi (xesh rasmlarni ham qamrab oladi)", async () => {
  const sd = seed();
  sd.photos = [{ id: "ph1", student_id: "s1", work_date: day(-3), storage_path: `s1/${day(-3)}/a.jpg`, created_at: new Date().toISOString() }];
  const { ctx, page } = await open({ as: U.res, seed: sd });
  await go(page, "res_panel.html#approvals"); await page.waitForSelector("#content h2");
  // hisobotni tasdiqlash uchun approval qo'shamiz
  await page.evaluate(() => { const d = window.__fake.db(); d.approvals.push({ id: "b1b2b3b4-0000-1111-2222-333344445555", student_id: "s1", period_id: "p3", kind: "hisobot", state: "pending", requested_at: new Date().toISOString() }); window.__fake.save(); });
  await page.reload(); await page.waitForSelector("#content h2");
  await page.locator("tr", { hasText: "Hisobot" }).locator("[data-open]").click();
  assert.match(await page.textContent(".modal"), /rasmlar: 1/);
  await page.getByRole("button", { name: "Tasdiqlash", exact: true }).click();
  await page.waitForFunction(() => /Tasdiqlandi/.test(document.querySelector("#toasts")?.textContent || ""));
  await page.evaluate((id) => { localStorage.setItem("fakeSession", JSON.stringify({ access_token: "t", user: { id, email: "999221110001@students.res.invalid", user_metadata: {} } })); }, U.st1);
  await go(page, "talaba_portali.html#finish"); await page.waitForSelector("#content h2");
  assert.match(await page.textContent("#content"), /Tasdiqlangan/);
  const ok = await pdfOf(page, "button[data-pdf=hisobot]");
  assert.ok(ok.text.includes("Tasdiq kodi"));
  // talaba rasmni o'chiradi -> tasdiq yaroqsiz
  await page.evaluate(() => { const d = window.__fake.db(); d.photos = []; window.__fake.save(); });
  await page.reload(); await page.waitForSelector("#content h2");
  assert.match(await page.textContent("#content"), /o'zgargan/);
  const bad = await pdfOf(page, "button[data-pdf=hisobot]");
  assert.ok(!bad.text.includes("Tasdiq kodi"));
  clean(page); await ctx.close();
});
