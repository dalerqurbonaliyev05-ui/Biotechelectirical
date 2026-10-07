// To'liq brauzer sinovlari: haqiqiy Chromium -> haqiqiy server -> haqiqiy PostgreSQL (RLS bilan).
// Ishga tushirish: TEST_DATABASE_ADMIN_URL=postgresql://postgres@127.0.0.1:5432/postgres npm test
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { startApp, PASSWORD } from "../../server/test/helpers.js";
import { createStaffUser } from "../../server/src/users.js";
import { hashPassword } from "../../server/src/crypto-utils.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.resolve(here, "../../web");
const CHROME = process.env.CHROMIUM_PATH || ["/opt/pw-browsers/chromium-1194/chrome-linux/chrome"].find((p) => fs.existsSync(p));
const SESSION_KEY = "amaliyot_session";

let T, base, browser, PHOTO, PROF = {};
const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const ID = { s1: uid(1), s2: uid(2), s3: uid(3), s4: uid(4), p3: uid(11), b1: uid(21), b2: uid(22), a1: uid(31), a2: uid(32), a3: uid(33), t1: uid(41), n1: uid(51) };
const AP1 = "a1b2c3d4-1111-2222-3333-444455556666";
const LOGINS = { admin: "berdiqulov", res: "raxmonov", amal: "rustamov", st1: "999221110001", st2: "999221110002", off: "ketgan" };

before(async () => {
  T = await startApp({ WEB_DIR: WEB, RATE_LIMIT_AUTH_PER_MIN: "100000" });
  base = T.base;
  for (const [k, l, name, role] of [
    ["admin", "berdiqulov", "Berdiqulov Nodir", "admin"], ["res", "raxmonov", "Raxmonov I.O.", "res_head"],
    ["amal", "rustamov", "Rustamov A.", "practice_head"], ["off", "ketgan", "Ketgan Xodim", "res_head"],
  ]) await T.mkStaff(l, role, name);
  await T.sql("update public.profiles set active = false where login = 'ketgan'");
  const hash = await hashPassword(PASSWORD);
  for (const [k, l, name] of [["st1", "999221110001", "Karimov Sardor Akmal o'g'li"], ["st2", "999221110002", "Yusupova Dilnoza Bahrom qizi"]]) {
    await T.app.db.asService(async (c) => {
      const p = await c.query("insert into public.profiles (login, full_name, role) values ($1,$2,'student') returning id", [l, name]);
      await c.query("insert into public.credentials (user_id, password_hash, must_change_password) values ($1,$2,false)", [p.rows[0].id, hash]);
    });
  }
  for (const r of (await T.sql("select id, login from public.profiles")).rows) PROF[r.login] = r.id;
  browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
  const pg = await browser.newPage();
  const b64 = await pg.evaluate(() => { const c = document.createElement("canvas"); c.width = 80; c.height = 60; const g = c.getContext("2d"); g.fillStyle = "#2a8"; g.fillRect(0, 0, 80, 60); g.fillStyle = "#fff"; g.fillRect(10, 10, 30, 20); return c.toDataURL("image/jpeg", 0.8).split(",")[1]; });
  PHOTO = Buffer.from(b64, "base64"); await pg.close();
});
after(async () => { await browser?.close(); await T?.stop(); });

// ---------- Boshlang'ich ma'lumotlar (har bir testdan oldin tozalanib qayta yoziladi) ----------
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
const DATA_TABLES = ["attendance", "tasks", "announcements", "photos", "feedbacks", "approvals", "practice_periods", "brigades", "students"];
async function reseed() {
  await T.sql(`truncate ${DATA_TABLES.map((t) => "public." + t).join(", ")} cascade`);
  fs.rmSync(path.join(T.config.dataDir, "photos"), { recursive: true, force: true }); fs.mkdirSync(path.join(T.config.dataDir, "photos"), { recursive: true });
  // test davomida o'zgargan hisoblarni asl holatiga qaytaramiz
  await T.sql("update public.profiles set active = (login <> 'ketgan'), full_name = case login when 'berdiqulov' then 'Berdiqulov Nodir' when 'raxmonov' then 'Raxmonov I.O.' when 'rustamov' then 'Rustamov A.' else full_name end where login in ('berdiqulov','raxmonov','rustamov','ketgan')");
  await T.sql("delete from public.profiles where login not in ('berdiqulov','raxmonov','rustamov','ketgan','999221110001','999221110002')");
  await T.sql("update public.credentials set failed_attempts = 0, locked_until = null, must_change_password = false, password_hash = $1", [await hashPassword(PASSWORD)]);
  const S = (id, h, name, g, course, prof) => T.sql(
    "insert into public.students (id, hemis_id, full_name, group_name, course, faculty, specialty, university, kafedra, profile_id) values ($1,$2,$3,$4,$5,'Energetika','Elektr ta''minoti','TDTU','Elektr ta''minoti',$6)",
    [id, h, name, g, course, prof]);
  await S(ID.s1, "999221110001", "Karimov Sardor Akmal o'g'li", "E-31", 3, PROF["999221110001"]);
  await S(ID.s2, "999221110002", "Yusupova Dilnoza Bahrom qizi", "E-31", 3, PROF["999221110002"]);
  await S(ID.s3, "999221110003", "Toshmatov Jasur Rustam o'g'li", "E-31", 3, null);
  await S(ID.s4, "999221110004", "Abdullayeva Madina Oybek qizi", "E-32", 3, null);
  await T.sql("update public.settings set org_name = $1, head_name = 'Raxmonov I.O.', head_position = 'RES boshlig''i'", ["Ulug'bek tuman elektr tarmoqlari korxonasi (RES)"]);
  await T.sql("insert into public.practice_periods (id, course, title, starts_on, ends_on) values ($1,3,'3-kurs: Texnologik amaliyot',$2,$3)", [ID.p3, day(-10), day(20)]);
  await T.sql("insert into public.brigades (id, name, leader_name) values ($1,'Brigada-1','Usta Olimov'), ($2,'Brigada-2','Usta Karimov')", [ID.b1, ID.b2]);
  await T.sql(`insert into public.attendance (id, student_id, work_date, status, time_in, time_out, brigade_id, brigade_name, leader, task) values
    ($1,$4,$7,'yakunlangan','09:00','18:00',$5,'Brigada-1','Usta Olimov','Kabel tortish'),
    ($2,$4,$8,'kelmadi',null,null,null,null,null,null),
    ($3,$4,$9,'yakunlangan','09:10','17:30',$6,'Brigada-2','Usta Karimov','Transformator ko''rigi')`, [ID.a1, ID.a2, ID.a3, ID.s1, ID.b1, ID.b2, day(-3), day(-2), day(-1)]);
  await T.sql("insert into public.approvals (id, student_id, period_id, kind, state) values ($1,$2,$3,'kundalik','pending')", [AP1, ID.s1, ID.p3]);
  await T.sql("insert into public.tasks (id, group_name, title, body, due_on) values ($1,'E-31','Kabel jurnalini to''ldiring','Har kuni yozib boring',$2)", [ID.t1, day(5)]);
  await T.sql("insert into public.announcements (id, title, body) values ($1,'Amaliyot vaqti o''zgardi','Ertadan 08:00 da')", [ID.n1]);
}
beforeEach(reseed);

const TABLES = ["profiles", "students", "attendance", "tasks", "announcements", "photos", "approvals", "practice_periods", "brigades", "feedbacks", "settings"];
function listFiles(dir) { const out = []; for (const e of fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }) : []) { const p = path.join(dir, e.name); if (e.isDirectory()) out.push(...listFiles(p)); else out.push(p); } return out; }
async function snap() {
  const o = {};
  for (const t of TABLES) o[t] = (await T.sql(`select * from public.${t}`)).rows;
  o.files = listFiles(path.join(T.config.dataDir, "photos"));
  return o;
}

// ---------- Brauzer yordamchilari ----------
async function apiLogin(login, password = PASSWORD, remember = false) {
  const r = await T.call("POST", "/api/auth/login", { body: { login, password, remember } });
  assert.equal(r.status, 200, `${login}: ${r.text}`);
  return r.json;
}
async function open(opts = {}) {
  const ctx = opts.ctx || await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
  if (opts.as) {
    const sess = await apiLogin(LOGINS[opts.as] || opts.as, opts.password);
    await ctx.addInitScript(({ k, v }) => { if (!sessionStorage.getItem("__seeded")) { sessionStorage.setItem("__seeded", "1"); sessionStorage.setItem(k, v); } }, { k: SESSION_KEY, v: JSON.stringify(sess) });
  }
  const page = await ctx.newPage();
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) page.errors.push("console: " + m.text()); });
  page.on("response", (r) => { if (r.url().startsWith(base) && r.status() >= 400 && !(page.allowStatus || []).includes(r.status())) page.errors.push(`HTTP ${r.status()}: ${r.url()}`); });
  return { ctx, page };
}
async function switchTo(page, who) {
  const sess = await apiLogin(LOGINS[who] || who);
  await page.evaluate(({ k, v }) => sessionStorage.setItem(k, v), { k: SESSION_KEY, v: JSON.stringify(sess) });
}
const go = async (page, file) => { await page.goto(`${base}/${file}`); };
const clean = (page) => assert.deepEqual(page.errors, [], "Brauzerda xato: " + page.errors.join(" | "));
const loginUI = async (page, l, p) => { await go(page, "login.html"); await page.fill("#login", l); await page.fill("#password", p); await page.click("#loginBtn"); };
const section = async (page, id) => { await page.click(`button[data-id=${id}]`); await page.waitForSelector(`button[data-id=${id}].active`); await page.waitForFunction(() => !document.querySelector("#content .loading")); };
const toast = (page, re) => page.waitForFunction((s) => new RegExp(s).test(document.querySelector("#toasts")?.textContent || ""), re.source);
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
async function pdfOf(page, selector) {
  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 20000 }), page.click(selector)]);
  const buf = fs.readFileSync(await dl.path());
  assert.equal(buf.subarray(0, 5).toString(), "%PDF-");
  return { buf, text: buf.toString("latin1"), name: dl.suggestedFilename() };
}
const HM = /^\d\d:\d\d(:\d\d)?$/;

// ====================== KIRISH ======================
test("kirish: noto'g'ri parol aniq xabar beradi va sahifadan chiqarmaydi", async () => {
  const { ctx, page } = await open(); page.allowStatus = [401];
  await loginUI(page, "raxmonov", "xato-parol");
  await page.waitForSelector("#msg:not(.hidden)");
  assert.match(await page.textContent("#msg"), /Login yoki parol noto'g'ri/);
  assert.match(page.url(), /login\.html/);
  clean(page); await ctx.close();
});

test("kirish: har bir rol o'z sahifasiga yo'naltiriladi", async () => {
  for (const [l, file] of [["berdiqulov", "admin_panel"], ["raxmonov", "res_panel"], ["rustamov", "amaliyot_panel"], ["999221110001", "talaba_portali"]]) {
    const { ctx, page } = await open();
    await loginUI(page, l, PASSWORD);
    await page.waitForURL(new RegExp(file), { timeout: 15000 });
    await page.waitForSelector("#content h2");
    clean(page); await ctx.close();
  }
});

test("kirish: katta harf bilan yozilgan xodim logini ham ishlaydi", async () => {
  const { ctx, page } = await open();
  await loginUI(page, "RAXMONOV", PASSWORD);
  await page.waitForURL(/res_panel/, { timeout: 15000 });
  await ctx.close();
});

test("kirish: faol bo'lmagan hisob kira olmaydi", async () => {
  const { ctx, page } = await open(); page.allowStatus = [403];
  await loginUI(page, "ketgan", PASSWORD);
  await page.waitForSelector("#msg:not(.hidden)");
  assert.match(await page.textContent("#msg"), /faol emas/);
  assert.equal(await page.evaluate((k) => sessionStorage.getItem(k) || localStorage.getItem(k), SESSION_KEY), null, "sessiya bo'lmasligi kerak");
  clean(page); await ctx.close();
});

test("kirish: ketma-ket xato urinishlardan keyin hisob vaqtincha bloklanadi", async () => {
  await createStaffUser(T.app.db, { login: "bloklanuvchi", full_name: "Bloklanuvchi", role: "res_head", password: PASSWORD });
  const { ctx, page } = await open(); page.allowStatus = [401, 429];
  for (let i = 0; i < T.config.loginMaxFailures; i++) { await loginUI(page, "bloklanuvchi", "xato-parol-1"); await page.waitForSelector("#msg:not(.hidden)"); }
  await loginUI(page, "bloklanuvchi", PASSWORD);
  await page.waitForFunction(() => /Juda ko'p/.test(document.querySelector("#msg").textContent));
  assert.match(page.url(), /login\.html/);
  clean(page); await ctx.close();
});

test("kirish: vaqtinchalik parol bilan kirganda yangi parol o'rnatish majburiy", async () => {
  const { temp_password } = await createStaffUser(T.app.db, { login: "yangi", full_name: "Yangi Xodim", role: "res_head" });
  const { ctx, page } = await open(); page.allowStatus = [400];
  await loginUI(page, "yangi", temp_password);
  await page.waitForSelector("#changeForm:not(.hidden)");
  const fill = async (cur, a, b) => { await page.fill("#cOld", cur); await page.fill("#cPass", a); await page.fill("#cPass2", b); await page.click("#changeBtn"); };
  await fill(temp_password, "qisqa", "qisqa");
  assert.match(await page.textContent("#msg"), /kamida 8/);
  await fill(temp_password, "YangiParol-77", "boshqa-parol-1");
  assert.match(await page.textContent("#msg"), /bir xil emas/);
  await fill(temp_password, temp_password, temp_password);
  await page.waitForFunction(() => /farq qilishi/.test(document.querySelector("#msg").textContent));
  await fill("noto'g'ri-eski-parol", "YangiParol-77", "YangiParol-77");
  await page.waitForFunction(() => /Hozirgi parol noto'g'ri/.test(document.querySelector("#msg").textContent));
  await fill(temp_password, "YangiParol-77", "YangiParol-77");
  await page.waitForURL(/res_panel/, { timeout: 15000 });
  assert.equal((await apiLogin("yangi", "YangiParol-77")).user.must_change_password, false);
  clean(page); await ctx.close();
});

test("himoya: parolni almashtirmagan foydalanuvchi panelga o'ta olmaydi", async () => {
  const { temp_password } = await createStaffUser(T.app.db, { login: "yangi2", full_name: "Yangi Ikki", role: "res_head" });
  const { ctx, page } = await open({ as: "yangi2", password: temp_password });
  await go(page, "res_panel.html");
  await page.waitForURL(/login\.html\?change=1/);
  await page.waitForSelector("#changeForm:not(.hidden)");
  clean(page); await ctx.close();
});

test("faollashtirish: noto'g'ri kod qolgan urinishlarni ko'rsatadi, to'g'ri kod bilan kiradi", async () => {
  const imp = await T.call("POST", "/api/admin/import-students", { token: (await apiLogin("rustamov")).access_token, body: { students: [{ hemis_id: "999221110003", full_name: "Toshmatov Jasur Rustam o'g'li", group_name: "E-31", course: 3 }] } });
  assert.equal(imp.status, 200, imp.text);
  const code = imp.json.codes[0].code;
  const { ctx, page } = await open(); page.allowStatus = [400];
  await go(page, "login.html");
  await page.click("#tabActivate");
  await page.fill("#aHemis", "999221110003"); await page.fill("#aPass", "Parol-12345"); await page.fill("#aPass2", "Parol-12345");
  await page.fill("#aCode", "ZZZZ-ZZZZ"); await page.click("#activateBtn");
  await page.waitForFunction(() => /qolgan urinishlar: 4/.test(document.querySelector("#msg").textContent));
  await page.fill("#aPass2", "Boshqa-12345"); await page.fill("#aCode", code.toLowerCase()); await page.click("#activateBtn");
  await page.waitForFunction(() => /bir xil emas/.test(document.querySelector("#msg").textContent));
  await page.fill("#aPass2", "Parol-12345"); await page.click("#activateBtn");
  await page.waitForURL(/talaba_portali/, { timeout: 15000 });
  await page.waitForSelector("#content h2");
  assert.match(await page.textContent("#content"), /Toshmatov/);
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
    ["st1", "admin_panel", "talaba_portali"], ["st1", "res_panel", "talaba_portali"], ["st1", "amaliyot_panel", "talaba_portali"],
    ["res", "admin_panel", "res_panel"], ["res", "amaliyot_panel", "res_panel"], ["res", "talaba_portali", "res_panel"],
    ["amal", "admin_panel", "amaliyot_panel"], ["amal", "res_panel", "amaliyot_panel"], ["amal", "talaba_portali", "amaliyot_panel"],
    ["admin", "talaba_portali", "admin_panel"],
  ];
  for (const [who, from, to] of cases) {
    const { ctx, page } = await open({ as: who });
    await go(page, `${from}.html`); await page.waitForURL(new RegExp(to), { timeout: 15000 });
    clean(page); await ctx.close();
  }
});

test("himoya: admin RES va amaliyot panellarini ham ocha oladi", async () => {
  for (const f of ["res_panel", "amaliyot_panel"]) {
    const { ctx, page } = await open({ as: "admin" });
    await go(page, `${f}.html`); await page.waitForSelector("#content h2"); assert.match(page.url(), new RegExp(f)); clean(page); await ctx.close();
  }
});

test("himoya: faolsizlantirilgan foydalanuvchining eski sessiyasi ishlamaydi", async () => {
  await createStaffUser(T.app.db, { login: "vaqtincha", full_name: "Vaqtincha Xodim", role: "res_head", password: PASSWORD });
  const { ctx, page } = await open({ as: "vaqtincha" }); page.allowStatus = [401];
  await T.sql("update public.profiles set active = false where login = 'vaqtincha'");
  await T.app.auth.forget((await T.sql("select id from public.profiles where login = 'vaqtincha'")).rows[0].id);
  await go(page, "res_panel.html"); await page.waitForURL(/login\.html\?x=(inactive|expired)/);
  await page.waitForSelector("#msg:not(.hidden)");
  assert.equal(await page.evaluate((k) => sessionStorage.getItem(k) || localStorage.getItem(k), SESSION_KEY), null, "sessiya tozalanishi kerak");
  clean(page); await ctx.close();
});

test("himoya: boshqa qurilmada sessiya yopilsa (parol tiklandi) sahifa kirishga qaytaradi", async () => {
  const { ctx, page } = await open({ as: "res" }); page.allowStatus = [401];
  await go(page, "res_panel.html"); await page.waitForSelector("#content h2");
  const adm = await apiLogin("berdiqulov");
  assert.equal((await T.call("POST", "/api/admin/users", { token: adm.access_token, body: { action: "reset_password", login: "raxmonov" } })).status, 200);
  // brauzerdagi access token hali yaroqli, lekin refresh bekor qilingan: token muddati tugagach chiqarib yuboriladi
  await page.evaluate((k) => { const s = JSON.parse(sessionStorage.getItem(k)); s.expires_at = Math.floor(Date.now() / 1000) - 5; sessionStorage.setItem(k, JSON.stringify(s)); }, SESSION_KEY);
  await page.click("button[data-id=brigades]");
  await page.waitForURL(/login\.html/, { timeout: 15000 });
  assert.equal(await page.evaluate((k) => sessionStorage.getItem(k), SESSION_KEY), null);
  await ctx.close(); // (sahifa 401 ni konsolga yozadi: bu kutilgan xatti-harakat)
});

// ====================== TALABA PORTALI ======================
test("talaba: barcha bo'limlar xatosiz ochiladi va to'g'ri ma'lumot ko'rsatadi", async () => {
  const { ctx, page } = await open({ as: "st1" });
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
  await section(page, "feedback");
  clean(page); await ctx.close();
});

test("talaba: boshqa talabaning ma'lumotini ko'rmaydi (o'z davomati)", async () => {
  const { ctx, page } = await open({ as: "st2" });
  await go(page, "talaba_portali.html"); await page.waitForSelector("#content h2");
  await section(page, "attendance");
  assert.match(await page.textContent("#content"), /Hech qanday ma'lumot yo'q|yo'q/);
  assert.equal(await page.locator("#content .att").count(), 0);
  // sahifa ichidan bo'lsa ham boshqa talabaning qatorlarini so'rab bo'lmaydi (RLS)
  const leak = await page.evaluate(async (k) => {
    const s = JSON.parse(sessionStorage.getItem(k));
    const r = await fetch("/api/db", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + s.access_token }, body: JSON.stringify({ table: "attendance", op: "select" }) });
    return (await r.json()).data.length;
  }, SESSION_KEY);
  assert.equal(leak, 0);
  clean(page); await ctx.close();
});

test("talaba: rasm yuklaydi (siqiladi), o'chiradi; taklif yuboradi", async () => {
  const { ctx, page } = await open({ as: "st1" });
  await go(page, "talaba_portali.html"); await page.waitForSelector("#content h2");
  await section(page, "photos");
  await page.locator("[data-day] .up").first().setInputFiles({ name: "ish.png", mimeType: "image/png", buffer: PNG });
  await page.waitForSelector("[data-day] .thumb img");
  await page.waitForFunction(() => document.querySelector("[data-day] .thumb img")?.complete && document.querySelector("[data-day] .thumb img").naturalWidth > 0);
  let d = await snap();
  assert.equal(d.photos.length, 1); assert.equal(d.files.length, 1);
  assert.match(d.photos[0].storage_path, new RegExp(`^${ID.s1}/\\d{4}-\\d{2}-\\d{2}/[0-9a-f-]{36}\\.jpg$`), "yo'l <student_id>/<sana>/<uuid>.jpg bo'lishi kerak");
  assert.equal(fs.readFileSync(d.files[0]).subarray(0, 3).toString("hex"), "ffd8ff", "JPEG'ga aylantirilishi kerak");
  await page.locator("[data-day] .up").first().setInputFiles({ name: "matn.txt", mimeType: "text/plain", buffer: Buffer.from("salom") });
  await page.waitForSelector(".toast.err");
  assert.equal((await snap()).photos.length, 1, "rasm bo'lmagan fayl yuklanmasligi kerak");
  await page.click(".thumb button"); await page.locator(".modal").getByRole("button", { name: "O'chirish", exact: true }).click();
  await page.waitForFunction(() => !document.querySelector(".thumb"));
  d = await snap(); assert.equal(d.photos.length, 0); assert.equal(d.files.length, 0, "fayl diskdan ham o'chishi kerak");
  await section(page, "feedback");
  await page.fill("#fbText", "Brigada ustasi yaxshi o'rgatdi"); await page.click("#fbSend");
  await page.waitForFunction(() => /Brigada ustasi yaxshi/.test(document.querySelector("#content").textContent));
  assert.equal((await snap()).feedbacks[0].student_id, ID.s1);
  clean(page); await ctx.close();
});

test("talaba: yuklash xatosi foydalanuvchiga ko'rsatiladi va bazaga yarim yozuv qolmaydi", async () => {
  const { ctx, page } = await open({ as: "st1" }); page.allowStatus = [500];
  await go(page, "talaba_portali.html"); await page.waitForSelector("#content h2");
  await section(page, "photos");
  await page.route("**/api/storage/practice-photos/**", (r) => r.request().method() === "PUT" ? r.fulfill({ status: 500, contentType: "application/json", body: '{"error":"Disk to\'lgan"}' }) : r.continue());
  await page.locator("[data-day] .up").first().setInputFiles({ name: "ish.png", mimeType: "image/png", buffer: PNG });
  await page.waitForSelector(".toast.err");
  assert.match(await page.textContent(".toast.err"), /Disk to'lgan/);
  assert.equal((await snap()).photos.length, 0);
  await ctx.close();
});

test("talaba: tasdiqlanmagan PDF pechat va imzosiz; tasdiqlashga yuboradi", async () => {
  await T.sql("delete from public.approvals");
  const { ctx, page } = await open({ as: "st1" });
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
  const d = await snap(); assert.equal(d.approvals.length, 1);
  assert.deepEqual([d.approvals[0].student_id, d.approvals[0].kind, d.approvals[0].state, d.approvals[0].period_id], [ID.s1, "kundalik", "pending", ID.p3]);
  clean(page); await ctx.close();
});

test("talaba: ish kuni bo'lmasa PDF va tasdiq tugmasi to'sib qo'yiladi", async () => {
  const { ctx, page } = await open({ as: "st2" });
  await go(page, "talaba_portali.html"); await page.waitForSelector("#content h2"); await section(page, "finish");
  assert.equal(await page.locator("button[data-send]").count(), 0);
  await page.click("button[data-pdf=kundalik]"); await page.waitForSelector(".toast.err");
  assert.match(await page.textContent(".toast.err"), /ish kuni yo'q/);
  clean(page); await ctx.close();
});

// ====================== RES RAHBARI ======================
test("RES: davomat belgilash, naryad, ommaviy qo'llash va saqlash", async () => {
  const { ctx, page } = await open({ as: "res" });
  await go(page, "res_panel.html"); await page.waitForSelector("#content h2");
  assert.match(await page.textContent("#content"), /Amaliyotdagi talabalar/);
  await section(page, "attendance");
  assert.equal(await page.locator("#tbl tbody tr[data-i]").count(), 4);
  const NAMES = ["Karimov", "Yusupova", "Toshmatov", "Abdullayeva"];
  const row = (i) => page.locator("#tbl tbody tr[data-i]", { hasText: NAMES[i] });
  await row(0).locator(".f-brigade").fill("Brigada-1");
  assert.equal(await row(0).locator(".f-leader").inputValue(), "Usta Olimov", "brigada tanlanganda usta avtomatik to'ladi");
  await row(0).locator(".f-task").fill("Podstansiya ko'rigi");
  await row(0).locator('[data-act="faol"]').click();
  assert.match(await row(0).locator(".f-in").inputValue(), /^\d\d:\d\d$/, "kelgan vaqti avtomatik qo'yildi");
  await row(1).locator('[data-act="yakunlangan"]').click();
  await page.waitForSelector(".toast.err");
  await row(1).locator('[data-act="kelmadi"]').click();
  await page.locator("summary").click();
  await row(2).locator(".sel").check(); await row(3).locator(".sel").check();
  await page.fill("#bb", "Brigada-2"); await page.fill("#bt", "Kabel ulash"); await page.click("#bApply");
  await page.click("#save"); await toast(page, /yozuv saqlandi/);
  const d = await snap(); const t = iso(new Date());
  const rows = d.attendance.filter((a) => a.work_date === t);
  assert.equal(rows.length, 4);
  const by = (s) => rows.find((a) => a.student_id === s);
  assert.deepEqual([by(ID.s1).status, by(ID.s1).brigade_name, by(ID.s1).leader, by(ID.s1).task, by(ID.s1).brigade_id], ["faol", "Brigada-1", "Usta Olimov", "Podstansiya ko'rigi", ID.b1]);
  assert.match(by(ID.s1).time_in, HM); assert.equal(by(ID.s1).marked_by, PROF.raxmonov);
  assert.deepEqual([by(ID.s2).status, by(ID.s2).brigade_name, by(ID.s2).task, by(ID.s2).time_in], ["kelmadi", null, null, null]);
  assert.deepEqual([by(ID.s3).status, by(ID.s3).brigade_name, by(ID.s3).leader, by(ID.s3).task], ["faol", "Brigada-2", "Usta Karimov", "Kabel ulash"]);
  assert.equal(d.attendance.length, 3 + 4, "oldingi kunlar buzilmadi");
  await row(0).locator(".f-task").fill("Boshqa ish"); await page.click("#save"); await page.waitForFunction(() => /\b1 ta yozuv saqlandi/.test(document.querySelector("#toasts")?.textContent || ""));
  const d2 = await snap(); assert.equal(d2.attendance.filter((a) => a.work_date === t).length, 4, "qayta saqlash dublikat yaratmaydi");
  assert.equal(d2.attendance.find((a) => a.student_id === ID.s1 && a.work_date === t).task, "Boshqa ish");
  clean(page); await ctx.close();
});

test("RES: kecha kunini tahrirlash mumkin; saqlanmagan o'zgarish sana almashtirganda so'raydi", async () => {
  const { ctx, page } = await open({ as: "res" });
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
  const { ctx, page } = await open({ as: "res" });
  await go(page, "res_panel.html"); await page.waitForSelector("#content h2"); await section(page, "approvals");
  assert.match(await page.textContent("#list"), /Karimov Sardor/);
  await page.click("[data-open]");
  assert.match(await page.textContent(".modal"), /Kabel tortish/); assert.doesNotMatch(await page.textContent(".modal"), /Kelmadi/);
  await page.getByRole("button", { name: "Tasdiqlash", exact: true }).click();
  await toast(page, /Tasdiqlandi/);
  let d = await snap(); const ap = d.approvals[0];
  assert.deepEqual([ap.state, ap.decided_by, ap.days_count], ["approved", PROF.raxmonov, 2]);
  assert.match(ap.data_hash, /^[0-9a-f]{64}$/); assert.ok(ap.decided_at);
  await page.fill("#code", `${ap.id.slice(0, 8)}-${ap.data_hash.slice(0, 8)}`); await page.click("#chk");
  assert.match(await page.textContent("#chkOut"), /Hujjat haqiqiy/);
  await page.fill("#code", `${ap.id.slice(0, 8)}-00000000`); await page.click("#chk");
  assert.match(await page.textContent("#chkOut"), /topilmadi/);

  await switchTo(page, "st1");
  await go(page, "talaba_portali.html"); await page.waitForSelector("#content h2"); await section(page, "finish");
  assert.match(await page.textContent("#content"), /Tasdiqlangan/);
  const ok = await pdfOf(page, "button[data-pdf=kundalik]");
  const code = `${ap.id.slice(0, 8)}-${ap.data_hash.slice(0, 8)}`.toUpperCase();
  assert.ok(ok.text.includes(`Tasdiq kodi: ${code}`), "PDF'da tasdiq kodi bo'lishi kerak");
  assert.doesNotMatch(ok.text, /Tasdiqlanmagan loyiha/);
  assert.ok((ok.text.match(/\/Subtype \/Image/g) || []).length >= 2, "pechat va imzo rasmlari PDF'da bo'lishi kerak");
  assert.ok(ok.text.includes("Raxmonov I.O."), "rahbar ismi");

  // Tasdiqdan keyin davomat o'zgaradi -> pechat qo'yilmaydi
  await T.sql("update public.attendance set task = 'O''zgartirilgan naryad' where id = $1", [ID.a1]);
  await page.reload(); await page.waitForSelector("#content h2"); await section(page, "finish");
  assert.match(await page.textContent("#content"), /o'zgargan/);
  const bad = await pdfOf(page, "button[data-pdf=kundalik]");
  assert.match(bad.text, /Tasdiqlanmagan loyiha/); assert.ok(!bad.text.includes("Tasdiq kodi"));
  await switchTo(page, "res");
  await go(page, "res_panel.html#approvals"); await page.waitForSelector("#content h2");
  await page.click('#tabs [data-f="approved"]'); await page.click("[data-open]");
  assert.match(await page.textContent(".modal"), /o'zgargan/);
  await page.getByRole("button", { name: "Qayta tasdiqlash" }).click();
  await toast(page, /Tasdiqlandi/);
  d = await snap(); assert.notEqual(d.approvals[0].data_hash, ap.data_hash, "yangi xesh");
  clean(page); await ctx.close();
});

test("RES: rad etish sababi talabaga ko'rinadi; talaba tuzatib qayta yuboradi", async () => {
  const { ctx, page } = await open({ as: "res" });
  page.on("dialog", (dlg) => dlg.accept("Naryad yetarli emas"));
  await go(page, "res_panel.html#approvals"); await page.waitForSelector("#content h2");
  await page.click("[data-open]"); await page.getByRole("button", { name: "Rad etish" }).click();
  await toast(page, /Rad etildi/);
  assert.equal((await snap()).approvals[0].note, "Naryad yetarli emas");
  await switchTo(page, "st1");
  await go(page, "talaba_portali.html#finish"); await page.waitForSelector("#content h2");
  assert.match(await page.textContent("#content"), /Naryad yetarli emas/);
  await page.click("[data-resend]");
  await page.waitForFunction(() => /Tasdiq kutilmoqda/.test(document.querySelector("#content").textContent));
  assert.equal((await snap()).approvals[0].state, "pending");
  clean(page); await ctx.close();
});

test("RES: brigada qo'shish, tahrirlash, o'chirish; dublikat nomga xabar", async () => {
  const { ctx, page } = await open({ as: "res" }); page.allowStatus = [409];
  await go(page, "res_panel.html#brigades"); await page.waitForSelector("#content h2");
  await page.fill("#bn", "Brigada-3"); await page.fill("#bl", "Usta Rahimov"); await page.click("#bAdd");
  await page.waitForFunction(() => document.querySelectorAll("tr[data-id]").length === 3);
  await page.fill("#bn", "Brigada-3"); await page.click("#bAdd"); await page.waitForSelector(".toast.err");
  assert.match(await page.textContent(".toast.err"), /bor|duplicate/);
  await page.locator("tr[data-id] .l").nth(2).fill("Usta Yangi"); await page.locator("tr[data-id] [data-save]").nth(2).click();
  await toast(page, /Saqlandi/);
  assert.equal((await snap()).brigades.find((b) => b.name === "Brigada-3").leader_name, "Usta Yangi");
  await page.locator("tr[data-id] [data-del]").nth(2).click(); await page.locator(".modal").getByRole("button", { name: "O'chirish", exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll("tr[data-id]").length === 2);
  clean(page); await ctx.close();
});

test("RES: hisobot va bosh sahifa", async () => {
  const { ctx, page } = await open({ as: "res" });
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
  const { ctx, page } = await open({ as: "amal" }); page.allowStatus = [400];
  await go(page, "amaliyot_panel.html"); await page.waitForSelector("#content h2");
  assert.match(await page.textContent("#content"), /Guruhlar bo'yicha bugungi davomat/);
  await section(page, "monitor");
  await page.fill("#f", day(-6));
  await page.waitForFunction(() => document.querySelectorAll("#out tbody tr").length === 4);
  await page.locator(`[data-id="${ID.s1}"]`).click(); assert.match(await page.textContent(".modal"), /Kabel tortish/);
  await page.getByRole("button", { name: "Yopish" }).click();

  await section(page, "tasks");
  await page.fill("#tt", "Qo'shimcha topshiriq"); await page.fill("#tb", "Hisobotni yozing"); await page.click("#tAdd");
  await page.waitForFunction(() => /Qo'shimcha topshiriq/.test(document.querySelector("#content").textContent));
  let d = await snap(); assert.equal(d.tasks.find((t) => t.title === "Qo'shimcha topshiriq").group_name, "E-31");
  await page.selectOption("#tk", "student"); await page.fill("#tt", "Shaxsiy topshiriq"); await page.selectOption("#ts", ID.s3); await page.click("#tAdd");
  await page.waitForFunction(() => /Shaxsiy topshiriq/.test(document.querySelector("#content").textContent));
  assert.equal((await snap()).tasks.find((t) => t.title === "Shaxsiy topshiriq").student_id, ID.s3);

  await section(page, "announcements");
  await page.fill("#at", "Dushanba kuni yig'ilish"); await page.selectOption("#ac", "3"); await page.click("#aAdd");
  await page.waitForFunction(() => /Dushanba kuni/.test(document.querySelector("#content").textContent));
  assert.equal((await snap()).announcements.find((a) => a.title.startsWith("Dushanba")).target_course, 3);

  await section(page, "periods");
  await page.fill("#pt", "Sinov amaliyoti"); await page.fill("#ps", day(30)); await page.fill("#pe", day(10)); await page.click("#pAdd");
  await page.waitForSelector(".toast.err"); assert.match(await page.textContent(".toast.err"), /Tugash sanasi/);
  await page.fill("#pe", day(60)); await page.click("#pAdd");
  await page.waitForFunction(() => /Sinov amaliyoti/.test(document.querySelector("#content").textContent));
  await section(page, "feedback");
  clean(page); await ctx.close();
});

test("amaliyot rahbari: HEMIS ro'yxatini yuklash -> talabalar va kodlar -> kod bilan faollashtirish", async () => {
  const { ctx, page } = await open({ as: "amal" });
  await go(page, "amaliyot_panel.html#students"); await page.waitForSelector("#content h2");
  await page.fill("#impText", "HEMIS ID;F.I.SH;Guruh;Kurs\n999221110010;Ergashev Bobur;E-41;4-kurs\n999221110011;Nazarova Zilola;E-41;4\n12;Xato;E-41;4");
  await page.click("#impCheck");
  assert.match(await page.textContent("#impPreview"), /2<\/b> ta to'g'ri qator|2 ta to'g'ri qator/);
  assert.match(await page.textContent("#impPreview"), /1-qator|2-qator|4-qator/);
  await page.click("#impGo"); await page.waitForSelector("#dlCodes");
  assert.match(await page.textContent("#impResult"), /2<\/b> ta yangi|2 ta yangi faollashtirish kodi/);
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#dlCodes")]);
  const csv = fs.readFileSync(await dl.path(), "utf8"); assert.match(csv, /Ergashev Bobur;999221110010;[A-Z2-9]{4}-[A-Z2-9]{4}/);
  assert.equal((await snap()).students.length, 6);
  await page.waitForFunction(() => /6 \//.test(document.querySelector("#cnt").textContent));
  // CSV'dagi kod bilan talaba haqiqatan faollashadi
  const code = /Ergashev Bobur;999221110010;([A-Z2-9]{4}-[A-Z2-9]{4})/.exec(csv)[1];
  assert.equal((await T.call("POST", "/api/auth/activate", { body: { hemis_id: "999221110010", code, password: "Talaba-Yangi-1" } })).status, 200);
  // Faollashgan talaba uchun kod ishlab chiqarib bo'lmaydi; faollashmaganga yangi kod
  await page.fill("#q", "Toshmatov"); await page.waitForFunction(() => document.querySelectorAll("[data-code]").length === 1); await page.locator("[data-code]").click(); await page.getByRole("button", { name: "Yaratish" }).click();
  await page.waitForSelector(".modal code.kod");
  const newCode = await page.textContent(".modal code.kod >> nth=1");
  assert.match(newCode, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  assert.match(await page.textContent(".modal"), /faqat hozir ko'rinadi/);
  assert.equal((await T.call("POST", "/api/auth/activate", { body: { hemis_id: "999221110003", code: newCode, password: "Talaba-Yangi-2" } })).status, 200);
  clean(page); await ctx.close();
});

test("amaliyot rahbari: parolni tiklash faqat talabaga", async () => {
  const { ctx, page } = await open({ as: "amal" });
  await go(page, "amaliyot_panel.html#students"); await page.waitForSelector("#content h2");
  await page.fill("#q", "Karimov"); await page.waitForFunction(() => document.querySelectorAll("[data-reset]").length === 1); await page.locator("[data-reset]").click(); await page.locator(".modal").getByRole("button", { name: "Tiklash", exact: true }).click();
  await page.waitForSelector(".modal code.kod");
  const temp = (await page.textContent(".modal code.kod >> nth=1")).trim();
  assert.match(temp, /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  const r = await T.call("POST", "/api/auth/login", { body: { login: "999221110001", password: temp } });
  assert.equal(r.status, 200); assert.equal(r.json.user.must_change_password, true);
  clean(page); await ctx.close();
});

// ====================== ADMINISTRATOR ======================
test("admin: xodim yaratish, parol tiklash, faolsizlantirish, sozlamalar", async () => {
  const { ctx, page } = await open({ as: "admin" });
  await go(page, "admin_panel.html"); await page.waitForSelector("#content h2");
  assert.match(await page.textContent("#content"), /Faol talabalar/);
  await section(page, "users");
  assert.equal(await page.locator("#content tbody tr").count(), 4);
  assert.match(await page.textContent("#content"), /Siz/);
  assert.equal(await page.locator(`[data-active="berdiqulov"]`).count(), 0, "o'zini faolsizlantira olmaydi");
  await page.fill("#un", "Sobirov Anvar"); await page.fill("#ul", "sobirov"); await page.selectOption("#ur", "practice_head"); await page.click("#uAdd");
  await page.waitForSelector(".modal code.kod");
  const temp = (await page.textContent(".modal code.kod >> nth=1")).trim();
  assert.match(temp, /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  assert.equal((await T.sql("select role from public.profiles where login = 'sobirov'")).rows[0].role, "practice_head");
  assert.equal((await apiLogin("sobirov", temp)).user.must_change_password, true);
  await page.getByRole("button", { name: "Yopish" }).click();
  await page.locator('[data-reset="raxmonov"]').click(); await page.locator(".modal").getByRole("button", { name: "Tiklash", exact: true }).click();
  await page.waitForSelector(".modal code.kod");
  const t2 = (await page.textContent(".modal code.kod >> nth=1")).trim();
  assert.equal((await apiLogin("raxmonov", t2)).user.login, "raxmonov");
  await page.getByRole("button", { name: "Yopish" }).click();
  await page.locator('[data-active="raxmonov"]').click(); await page.locator(".modal").getByRole("button", { name: "Faolsizlantirish", exact: true }).click();
  await toast(page, /Bajarildi/);
  assert.equal((await T.sql("select active from public.profiles where login = 'raxmonov'")).rows[0].active, false);
  await section(page, "settings");
  await page.fill("#sh", "Yangi Rahbar Y.Y."); await page.click("#sSave");
  await toast(page, /Saqlandi/);
  assert.equal((await snap()).settings[0].head_name, "Yangi Rahbar Y.Y.");
  await section(page, "periods"); await section(page, "announcements"); await section(page, "students");
  clean(page); await ctx.close();
});

test("admin: server xatosi foydalanuvchiga ko'rsatiladi (login band)", async () => {
  const { ctx, page } = await open({ as: "admin" }); page.allowStatus = [409];
  await go(page, "admin_panel.html#users"); await page.waitForSelector("#content h2");
  await page.fill("#un", "Kimdir"); await page.fill("#ul", "raxmonov"); await page.click("#uAdd");
  await page.waitForSelector(".toast.err"); assert.match(await page.textContent(".toast.err"), /Bu login band/);
  clean(page); await ctx.close();
});

// ====================== XAVFSIZLIK: XSS, CSP ======================
test("XSS: ism, naryad va e'londagi HTML skript sifatida ishlamaydi", async () => {
  const evil = `<img src=x onerror="window.__xss=1">`;
  await T.sql("update public.students set full_name = $1 where id = $2", [`Karimov ${evil}`, ID.s1]);
  await T.sql("update public.profiles set full_name = $1 where login = '999221110001'", [`Karimov ${evil}`]);
  await T.sql("update public.attendance set task = $1, brigade_name = $1 where id = $2", [evil, ID.a1]);
  await T.sql("update public.announcements set title = $1", [evil]);
  await T.sql("update public.tasks set title = $1", [evil]);
  for (const [who, file] of [["st1", "talaba_portali.html"], ["res", "res_panel.html#attendance"], ["amal", "amaliyot_panel.html#monitor"], ["admin", "admin_panel.html#students"]]) {
    const { ctx, page } = await open({ as: who });
    await go(page, file); await page.waitForSelector("#content h2"); await page.waitForTimeout(300);
    for (const id of ["attendance", "brigade", "tasks"]) if (who === "st1") await section(page, id);
    assert.equal(await page.evaluate(() => window.__xss), undefined, `${file}: XSS ishladi!`);
    assert.equal(await page.locator("#content img[src='x']").count(), 0);
    clean(page); await ctx.close();
  }
});

test("ulanish xatosi: sahifa qotib qolmaydi, 'qayta urinish' ko'rsatiladi", async () => {
  const { ctx, page } = await open({ as: "res" });
  await go(page, "res_panel.html"); await page.waitForSelector("#content h2");
  await page.route("**/api/db", (r) => (/"brigades"/.test(r.request().postData() || "") ? r.abort() : r.continue()));
  await page.click("button[data-id=brigades]");
  await page.waitForSelector("#content .alert.err"); assert.match(await page.textContent("#content"), /yuklab bo'lmadi/);
  assert.equal(await page.locator("#content button", { hasText: "Qayta urinish" }).count(), 1);
  await ctx.close();
});

test("CSP: server sarlavhasi bor, begona inline skript bajarilmaydi, sahifalarda inline skript va onclick yo'q", async () => {
  for (const f of ["login", "talaba_portali", "res_panel", "amaliyot_panel", "admin_panel"]) {
    const html = fs.readFileSync(path.join(WEB, `${f}.html`), "utf8");
    assert.match(html, /Content-Security-Policy/, `${f}: CSP yo'q`);
    assert.doesNotMatch(html, /<script(?![^>]*\ssrc=)[^>]*>[\s\S]*?\S[\s\S]*?<\/script>/, `${f}: inline skript`);
    assert.doesNotMatch(html, /\son(click|error|load)=/i, `${f}: inline hodisa`);
    assert.doesNotMatch(html, /https?:\/\//, `${f}: tashqi manzil bo'lmasligi kerak`);
  }
  const { ctx, page } = await open({ as: "res" });
  await go(page, "res_panel.html"); await page.waitForSelector("#content h2");
  const r = await page.evaluate(() => { const s = document.createElement("script"); s.textContent = "window.__csp = 1"; document.head.appendChild(s); return window.__csp; });
  assert.equal(r, undefined, "CSP inline skriptni bloklashi kerak");
  assert.ok(page.errors.every((e) => /Content Security Policy/.test(e)), "kutilmagan xato: " + page.errors.join("|"));
  await ctx.close();
});

test("tashqi tarmoqqa hech qanday so'rov ketmaydi (hamma narsa o'z serveridan)", async () => {
  const { ctx, page } = await open({ as: "res" });
  const foreign = [];
  page.on("request", (r) => { const u = r.url(); if (!u.startsWith(base) && !u.startsWith("data:") && !u.startsWith("blob:")) foreign.push(u); });
  await go(page, "res_panel.html"); await page.waitForSelector("#content h2");
  for (const id of ["attendance", "approvals", "brigades", "reports"]) await section(page, id);
  assert.deepEqual(foreign, []);
  await ctx.close();
});

// ====================== Rasmli hisobot ======================
async function addPhoto(studentId, date) {
  const rel = `${studentId}/${date}/${crypto.randomUUID()}.jpg`;
  const full = path.join(T.config.dataDir, "photos", rel);
  fs.mkdirSync(path.dirname(full), { recursive: true }); fs.writeFileSync(full, PHOTO);
  await T.sql("insert into public.photos (student_id, work_date, storage_path) values ($1,$2,$3)", [studentId, date, rel]);
  return rel;
}

test("talaba: rasmli hisobot PDF (JPEG rasmlar bilan)", async () => {
  await addPhoto(ID.s1, day(-3));
  const { ctx, page } = await open({ as: "st1" });
  await go(page, "talaba_portali.html"); await page.waitForSelector("#content h2"); await section(page, "photos");
  await page.waitForFunction(() => document.querySelector(".thumb img")?.complete && document.querySelector(".thumb img").naturalWidth > 0);
  assert.equal(await page.locator(".thumb img").count(), 1);
  await section(page, "finish");
  const h = await pdfOf(page, "button[data-pdf=hisobot]");
  assert.ok((h.text.match(/\/Subtype \/Image/g) || []).length >= 1, "hisobotda rasm bo'lishi kerak");
  assert.match(h.text, /Kabel tortish/);
  assert.ok(h.text.includes("Transformator ko'rigi"));
  clean(page); await ctx.close();
});

test("talaba: rasm o'zgarsa tasdiqlangan hisobot yaroqsiz bo'ladi (xesh rasmlarni ham qamrab oladi)", async () => {
  await addPhoto(ID.s1, day(-3));
  await T.sql("insert into public.approvals (student_id, period_id, kind, state) values ($1,$2,'hisobot','pending')", [ID.s1, ID.p3]);
  const { ctx, page } = await open({ as: "res" });
  await go(page, "res_panel.html#approvals"); await page.waitForSelector("#content h2");
  await page.locator("tr", { hasText: "Hisobot" }).locator("[data-open]").click();
  assert.match(await page.textContent(".modal"), /rasmlar: 1/);
  await page.getByRole("button", { name: "Tasdiqlash", exact: true }).click();
  await toast(page, /Tasdiqlandi/);
  await switchTo(page, "st1");
  await go(page, "talaba_portali.html#finish"); await page.waitForSelector("#content h2");
  assert.match(await page.textContent("#content"), /Tasdiqlangan/);
  const ok = await pdfOf(page, "button[data-pdf=hisobot]");
  assert.ok(ok.text.includes("Tasdiq kodi"));
  await T.sql("delete from public.photos");
  await page.reload(); await page.waitForSelector("#content h2");
  assert.match(await page.textContent("#content"), /o'zgargan/);
  const bad = await pdfOf(page, "button[data-pdf=hisobot]");
  assert.ok(!bad.text.includes("Tasdiq kodi"));
  clean(page); await ctx.close();
});

test("rasm havolasi: boshqa talaba ko'ra olmaydi, havola muddati/imzosi tekshiriladi", async () => {
  const rel = await addPhoto(ID.s1, day(-3));
  const s1 = await apiLogin("999221110001"), s2 = await apiLogin("999221110002");
  const sign = async (tok) => (await T.call("POST", "/api/storage/sign", { token: tok, body: { paths: [rel] } })).json.data[0];
  assert.ok((await sign(s1.access_token)).signedUrl);
  assert.equal((await sign(s2.access_token)).signedUrl, null);
  assert.equal((await T.call("GET", (await sign(s1.access_token)).signedUrl)).status, 200);
});

// ====================== SESSIYA SAQLASH ======================
const keys = (page) => page.evaluate((k) => ({ local: Object.keys(localStorage).filter((x) => x === k), session: Object.keys(sessionStorage).filter((x) => x === k), flag: localStorage.getItem("amaliyot_remember") }), SESSION_KEY);
async function loginRemember(page, remember) {
  await page.goto(`${base}/login.html`); await page.waitForSelector("#login");
  await page.fill("#login", "raxmonov"); await page.fill("#password", PASSWORD);
  if (remember) await page.check("#remember");
  await page.click("#loginBtn"); await page.waitForURL(/res_panel/, { timeout: 15000 });
}

test("sessiya: «Meni eslab qol» belgilanmasa token faqat shu oynada turadi; yangi oynada qayta kirish so'raladi", async () => {
  const { ctx, page } = await open();
  await loginRemember(page, false);
  await page.waitForSelector("#content h2");
  const k = await keys(page);
  assert.deepEqual(k.local, [], "localStorage'da token bo'lmasligi kerak");
  assert.deepEqual(k.session, [SESSION_KEY]);
  assert.equal(k.flag, null);
  const p2 = await ctx.newPage(); await p2.goto(`${base}/login.html`); await p2.waitForSelector("#login");
  await p2.waitForTimeout(1500);
  assert.match(p2.url(), /login\.html/, "avtomatik kirib ketmasligi kerak");
  assert.equal(await p2.isVisible("#loginForm"), true);
  const p3 = await ctx.newPage(); await p3.goto(`${base}/res_panel.html`); await p3.waitForURL(/login\.html/);
  await ctx.close();
});

test("sessiya: «Meni eslab qol» belgilansa yangi oynada ham avtomatik kiradi; chiqish hammasini tozalaydi va serverda sessiyani yopadi", async () => {
  const { ctx, page } = await open();
  await loginRemember(page, true); await page.waitForSelector("#content h2");
  let k = await keys(page);
  assert.deepEqual(k.local, [SESSION_KEY]); assert.equal(k.flag, "1");
  const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), SESSION_KEY);
  const p2 = await ctx.newPage(); await p2.goto(`${base}/login.html`); await p2.waitForURL(/res_panel/, { timeout: 15000 });
  await page.click("#userBtn"); await page.click("#outBtn"); await page.waitForURL(/login\.html/);
  k = await keys(page);
  assert.deepEqual(k.local, [], "chiqishdan keyin localStorage'da token qolmasligi kerak"); assert.deepEqual(k.session, []); assert.equal(k.flag, null);
  assert.equal((await T.call("POST", "/api/auth/refresh", { body: { refresh_token: stored.refresh_token } })).status, 401, "serverda sessiya yopilgan bo'lishi kerak");
  const p3 = await ctx.newPage(); await p3.goto(`${base}/login.html`); await p3.waitForSelector("#login"); await p3.waitForTimeout(1200);
  assert.match(p3.url(), /login\.html/, "chiqishdan keyin avtomatik kirmasligi kerak");
  await ctx.close();
});

test("sessiya: access token muddati tugasa avtomatik yangilanadi va ish uzilmaydi", async () => {
  const { ctx, page } = await open({ as: "res" });
  await go(page, "res_panel.html"); await page.waitForSelector("#content h2");
  const before = await page.evaluate((k) => JSON.parse(sessionStorage.getItem(k)), SESSION_KEY);
  await page.evaluate((k) => { const s = JSON.parse(sessionStorage.getItem(k)); s.expires_at = Math.floor(Date.now() / 1000) - 5; sessionStorage.setItem(k, JSON.stringify(s)); }, SESSION_KEY);
  await section(page, "brigades");
  const after = await page.evaluate((k) => JSON.parse(sessionStorage.getItem(k)), SESSION_KEY);
  assert.notEqual(after.refresh_token, before.refresh_token, "refresh token almashishi kerak");
  assert.ok(after.expires_at > Date.now() / 1000 + 600);
  assert.equal(await page.locator("tr[data-id]").count(), 2);
  clean(page); await ctx.close();
});
