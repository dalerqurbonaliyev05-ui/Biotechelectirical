// Admin panel sinovi: panel haqiqiy Chromium'da ochiladi, Supabase so'rovlari (REST/RPC/Storage) tarmoq darajasida taqlid qilinadi.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" };
const CHROME = process.env.CHROMIUM_PATH || ["/opt/pw-browsers/chromium-1194/chrome-linux/chrome"].find((p) => fs.existsSync(p));
const SB = "https://testproj.supabase.co";
const IMG = (uid, n) => `${SB}/storage/v1/object/public/animal-photos/${uid}/${n}.jpg`;
const PIXEL = Buffer.from("/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=", "base64");

let server, base, browser;
before(async () => {
  server = http.createServer((req, res) => {
    const u = new URL(req.url, "http://x");
    if (u.pathname === "/favicon.ico") { res.writeHead(204); return res.end(); }
    const p = path.join(ROOT, decodeURIComponent(u.pathname));
    if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end("yo'q"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" }); fs.createReadStream(p).pipe(res);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
});
after(async () => { await browser?.close(); server?.close(); });

const day = (n) => { const d = new Date(Date.now() - n * 86400000); return d.toISOString().slice(0, 10); };
const ago = (min) => new Date(Date.now() - min * 60000).toISOString();
function seed() {
  return {
    admin: true,
    users: [
      { user_id: "u-admin", full_name: "Admin Adminov", email: "admin@x.uz", google_id: "g0", avatar_url: null, phone: null, city: null, created_at: "2026-01-01T00:00:00Z", last_sign_in_at: null, blocked: false, is_admin: true, posts_count: 0, comments_count: 0, likes_count: 0 },
      { user_id: "u-ali", full_name: "Ali Valiyev", email: "ali@x.uz", google_id: "g1", avatar_url: "https://lh3.googleusercontent.com/a", phone: "+998901112233", city: "Toshkent", created_at: "2026-02-01T00:00:00Z", last_sign_in_at: null, blocked: false, is_admin: false, posts_count: 2, comments_count: 1, likes_count: 1 },
      { user_id: "u-spam", full_name: "Spammer", email: "spam@x.uz", google_id: "g2", avatar_url: null, phone: null, city: null, created_at: ago(30), last_sign_in_at: null, blocked: false, is_admin: false, posts_count: 1, comments_count: 2, likes_count: 5 },
    ],
    posts: [
      { id: "p1", user_id: "u-ali", animal_type: "cat", title: "Chiroyli mushuk", image_url: IMG("u-ali", 1), latitude: 41.31, longitude: 69.24, address: "Chilonzor, Toshkent", caption: "Yo'qolgan mushuk", status: "active", blocked_reason: null, created_at: ago(300), likes: [{ count: 1 }], comments: [{ count: 1 }] },
      { id: "p2", user_id: "u-spam", animal_type: "dog", title: null, image_url: IMG("u-spam", 2), latitude: 40.1, longitude: 65.3, address: null, caption: null, status: "active", blocked_reason: null, created_at: ago(200), likes: [{ count: 0 }], comments: [{ count: 0 }] },
    ],
    comments: [
      { id: "c1", post_id: "p1", user_id: "u-spam", text: "Arzon telefon <b>sotiladi</b> t.me/spam", created_at: ago(100), posts: { image_url: IMG("u-ali", 1), animal_type: "cat" } },
      { id: "c2", post_id: "p1", user_id: "u-ali", text: "Rahmat!", created_at: ago(50), posts: { image_url: IMG("u-ali", 1), animal_type: "cat" } },
    ],
    likes: [{ id: "l1", post_id: "p1", user_id: "u-spam", created_at: ago(20), posts: { image_url: IMG("u-ali", 1), animal_type: "cat" } }],
    calls: [],
  };
}
const stats = (db) => ({ total_posts: db.posts.length, active_posts: db.posts.filter((p) => p.status === "active").length, blocked_posts: db.posts.filter((p) => p.status === "blocked").length, cat_posts: 1, dog_posts: 1,
  total_users: db.users.length, blocked_users: db.users.filter((u) => u.blocked).length, total_likes: db.likes.length, total_comments: db.comments.length, new_posts_today: 7, new_users_today: 1, active_users_7d: 5, active_users_30d: 9,
  daily: Array.from({ length: 14 }, (_, i) => ({ day: day(13 - i), posts: i === 13 ? 7 : i % 3, users: 0, likes: 0, comments: 0 })) });

async function openPanel(db, { page: pageName = "admin_panel.html", hash = "", signedIn = true } = {}) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => { errors.push(e.message); if (process.env.DBG) console.log("PAGEERROR", e.message); });
  if (process.env.DBG) page.on("console", (m) => console.log("CONSOLE", m.type(), m.text()));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.route("**/js/config.js", (r) => r.fulfill({ contentType: "text/javascript", body: `export const SUPABASE_URL=${JSON.stringify(SB)}; export const SUPABASE_KEY="sb_publishable_test";` }));
  await page.route("https://tile.openstreetmap.org/**", (r) => r.fulfill({ status: 200, contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64") }));
  await page.route(`${SB}/**`, async (route) => {
    const req = route.request(), u = new URL(req.url()), m = req.method();
    const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" };
    const json = (body, status = 200) => route.fulfill({ status, headers: cors, contentType: "application/json", body: JSON.stringify(body) });
    if (m === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    if (u.pathname.startsWith("/storage/v1/object/public/")) return route.fulfill({ status: 200, headers: cors, contentType: "image/jpeg", body: PIXEL });
    const name = u.pathname.split("/").pop();
    db.calls.push({ m, path: u.pathname, search: u.search, body: req.postData() });
    if (u.pathname.startsWith("/rest/v1/rpc/")) {
      if (name === "is_admin") return json(db.admin);
      if (name === "admin_stats") return json(stats(db));
      if (name === "admin_list_users") return json(db.users);
      if (name === "admin_set_user_blocked") { const b = JSON.parse(req.postData()); db.users.find((x) => x.user_id === b.p_user).blocked = b.p_blocked; return route.fulfill({ status: 204, headers: cors }); }
      if (name === "admin_delete_user") { const b = JSON.parse(req.postData()); db.users = db.users.filter((x) => x.user_id !== b.p_user); return route.fulfill({ status: 204, headers: cors }); }
    }
    if (u.pathname.startsWith("/rest/v1/") && m === "GET") {
      const rows = db[name] || [];
      const off = Number(u.searchParams.get("offset") || 0);
      const st = u.searchParams.get("status"); let f = st ? rows.filter((r) => r.status === st.replace("eq.", "")) : rows;
      const idq = u.searchParams.get("id"); if (idq) f = f.filter((r) => r.id === idq.replace("eq.", ""));
      if (/vnd\.pgrst\.object/.test(req.headers()["accept"] || "")) return f[0] ? json(f[0]) : route.fulfill({ status: 406, headers: cors, contentType: "application/json", body: JSON.stringify({ code: "PGRST116", message: "0 rows" }) });
      return json(off ? [] : f);
    }
    if (u.pathname.startsWith("/rest/v1/") && m === "PATCH") {
      const id = u.searchParams.get("id").replace("eq.", ""); Object.assign(db.posts.find((p) => p.id === id), JSON.parse(req.postData())); return route.fulfill({ status: 204, headers: cors });
    }
    if (u.pathname.startsWith("/rest/v1/") && m === "DELETE") {
      const id = u.searchParams.get("id")?.replace("eq.", ""); if (id) db[name] = db[name].filter((r) => r.id !== id);
      return route.fulfill({ status: 204, headers: cors });
    }
    if (u.pathname.startsWith("/storage/v1/object/animal-photos") && m === "DELETE") return json([]);
    return json({ message: "mock: " + m + " " + u.pathname }, 404);
  });
  if (signedIn) await page.addInitScript(() => {
    localStorage.setItem("sb-testproj-auth-token", JSON.stringify({ access_token: "a.b.c", refresh_token: "r", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: "u-admin", email: "admin@x.uz", user_metadata: { full_name: "Admin Adminov" } } }));
  });
  await page.goto(`${base}/${pageName}${hash}`);
  return { page, errors, ctx };
}

test("kirmagan foydalanuvchi login sahifasiga yo'naltiriladi", async () => {
  const { page, ctx } = await openPanel(seed(), { signedIn: false });
  await page.waitForURL("**/login.html");
  assert.ok(await page.locator("#googleBtn").isVisible());
  await ctx.close();
});

test("admin bo'lmagan hisob rad etiladi", async () => {
  const db = seed(); db.admin = false;
  const { page, ctx } = await openPanel(db);
  await page.waitForURL("**/login.html?x=denied");
  assert.match(await page.locator("#msg").innerText(), /administrator emas/);
  await ctx.close();
});

test("bosh sahifa: rangli ko'rsatkichlar, kunlik diagramma, so'nggi faollik", async () => {
  const { page, errors, ctx } = await openPanel(seed());
  await page.waitForSelector(".kpi");
  const t = await page.locator("#content").innerText();
  assert.match(t, /jami e'lonlar/i); assert.match(t, /bugungi yangi e'lonlar/i); assert.match(t, /faol foydalanuvchilar \(7 kun\)/i);
  for (const c of ["green", "blue", "pink", "orange"]) assert.equal(await page.locator(`.kpi.${c}`).count(), 1, c);
  assert.equal(await page.locator(".bars .bar").count(), 14);
  assert.equal(await page.locator(".kpi b").first().innerText(), "2");
  await page.waitForSelector(".feed-item");
  assert.ok(await page.locator(".feed-item").count() >= 4, "so'nggi faollik");
  assert.deepEqual(errors, []);
  await ctx.close();
});

test("yon menyu: maketdagi bo'limlar, jami nishonlari va qizil 'Xabarlar' nishoni", async () => {
  const { page, ctx } = await openPanel(seed());
  await page.waitForSelector(".kpi");
  const labels = await page.locator(".nav button .lbl").allInnerTexts();
  assert.deepEqual(labels, ["Bosh sahifa", "E'lonlar", "Foydalanuvchilar", "Izohlar", "Layklar", "Xarita", "Xabarlar", "Statistika", "Sozlamalar"]);
  assert.match(await page.locator(".brand").innerText(), /Mushuk va Itlarni Top/);
  assert.ok(await page.locator(".brand img").evaluate((i) => i.complete && i.naturalWidth > 0), "logo");
  await page.waitForFunction(() => document.querySelector('[data-badge="posts"]')?.textContent === "2");
  assert.equal(await page.locator('[data-badge="users"]').innerText(), "3");
  await page.waitForFunction(() => !document.querySelector('[data-badge="activity"]').classList.contains("hidden"));
  assert.ok(await page.locator('[data-badge="activity"]').evaluate((e) => e.classList.contains("red")));
  await page.screenshot({ path: (process.env.SHOTS || "/tmp/claude-0") + "/admin-dashboard.png" });
  await ctx.close();
});

test("e'lonlar: rasm, joy, muallif, bloklash va o'chirish", async () => {
  const db = seed();
  const { page, errors, ctx } = await openPanel(db, { hash: "#posts" });
  await page.waitForSelector(".pcard");
  assert.equal(await page.locator(".pcard").count(), 2);
  const first = page.locator(".pcard").first();
  assert.match(await first.innerText(), /Chilonzor, Toshkent|Manzil aniqlanmagan/);
  assert.match(await page.locator(".pcard", { hasText: "Chilonzor" }).innerText(), /Ali Valiyev/);
  assert.match(await page.locator(".pcard a", { hasText: "Xarita" }).first().getAttribute("href"), /google\.com\/maps\/search\/\?api=1&query=/);
  assert.ok(await page.locator(".pcard img").first().evaluate((i) => i.complete && i.naturalWidth > 0), "rasm yuklanishi kerak");
  // bloklash (sabab bilan)
  await page.locator(".pcard", { hasText: "Chilonzor" }).getByText("Bloklash").click();
  await page.fill("#pmReason", "spam");
  await page.locator(".modal .btn.bad", { hasText: "Bloklash" }).click();
  await page.waitForSelector(".pcard.is-blocked");
  assert.equal(db.posts.find((p) => p.id === "p1").status, "blocked");
  assert.equal(db.posts.find((p) => p.id === "p1").blocked_reason, "spam");
  // faqat bloklanganlar
  await page.selectOption("#fs", "blocked");
  await page.waitForFunction(() => document.querySelectorAll(".pcard").length === 1);
  await page.selectOption("#fs", "");
  await page.waitForFunction(() => document.querySelectorAll(".pcard").length === 2);
  // o'chirish: Storage fayli ham o'chadi
  await page.locator(".pcard", { hasText: "Spammer" }).getByText("O'chirish").click();
  await page.locator(".modal .btn.bad", { hasText: "O'chirish" }).click();
  await page.waitForFunction(() => document.querySelectorAll(".pcard").length === 1);
  assert.ok(db.calls.some((c) => c.m === "DELETE" && c.path.includes("/storage/v1/object/animal-photos")), "Storage'dan o'chirilmadi");
  assert.equal(db.posts.length, 1);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test("post tafsiloti: izoh va laykni o'chirish", async () => {
  const db = seed();
  const { page, ctx } = await openPanel(db, { hash: "#posts" });
  await page.waitForSelector(".pcard");
  await page.locator(".pcard", { hasText: "Chilonzor" }).getByText("Izoh/layklar").click();
  await page.waitForSelector(".cmt");
  assert.match(await page.locator(".modal").innerText(), /izohlar \(2\)/i);
  await page.locator("[data-dc='c1']").click();
  await page.waitForFunction(() => /izohlar \(1\)/i.test(document.querySelector(".modal").innerText));
  assert.ok(!db.comments.some((c) => c.id === "c1"));
  await page.locator("[data-dl='l1']").click();
  await page.waitForFunction(() => /layklar \(0\)/i.test(document.querySelector(".modal").innerText));
  assert.equal(db.likes.length, 0);
  await ctx.close();
});

test("foydalanuvchilar: bloklash va o'chirish (rasmlari bilan)", async () => {
  const db = seed();
  const { page, errors, ctx } = await openPanel(db, { hash: "#users" });
  await page.waitForSelector("#ub tr");
  assert.equal(await page.locator("#ub tr").count(), 3);
  assert.equal(await page.locator("#ub tr", { hasText: "Admin Adminov" }).getByRole("button").count(), 0, "adminni bloklab bo'lmaydi");
  await page.locator("#ub tr", { hasText: "Spammer" }).getByText("Bloklash", { exact: true }).click();
  await page.locator(".modal .btn.bad", { hasText: "Bloklash" }).click();
  await page.waitForSelector("#ub .badge.bad");
  assert.equal(db.users.find((u) => u.user_id === "u-spam").blocked, true);
  await page.locator("#ub tr", { hasText: "Spammer" }).getByText("O'chirish").click();
  await page.locator(".modal .btn.bad", { hasText: "O'chirish" }).click();
  await page.waitForFunction(() => document.querySelectorAll("#ub tr").length === 2);
  assert.ok(db.calls.some((c) => c.path.endsWith("/rpc/admin_delete_user")));
  assert.ok(db.calls.some((c) => c.m === "DELETE" && c.path.includes("/storage/")), "foydalanuvchi rasmlari o'chirilishi kerak");
  await page.fill("#uq", "ali"); await page.waitForFunction(() => document.querySelectorAll("#ub tr").length === 1);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test("izohlar va layklar moderatsiyasi; matn HTML sifatida talqin qilinmaydi", async () => {
  const db = seed();
  const { page, errors, ctx } = await openPanel(db, { hash: "#comments" });
  await page.waitForSelector("#cb tr");
  assert.equal(await page.locator("#cb .txt b").count(), 0, "izohdagi <b> teg sifatida chiqmasligi kerak");
  assert.match(await page.locator("#cb").innerText(), /<b>sotiladi<\/b>/);
  await page.locator("#cb tr", { hasText: "Arzon" }).getByText("O'chirish").click();
  await page.locator(".modal .btn.bad", { hasText: "O'chirish" }).click();
  await page.waitForFunction(() => document.querySelectorAll("#cb tr").length === 1);
  assert.equal(db.comments.length, 1);
  await page.locator(".nav button[data-id=likes]").click();
  await page.waitForSelector("#lb tr");
  await page.locator("#lb tr").first().getByText("Olib tashlash", { exact: true }).click();
  await page.locator(".modal .btn.bad", { hasText: "Olib tashlash" }).click();
  await page.waitForSelector("#empty:not(.hidden)");
  assert.equal(db.likes.length, 0);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test("xarita: pinlar, filtr, pin tanlash va kartadan bloklash", async () => {
  const db = seed();
  const { page, errors, ctx } = await openPanel(db, { hash: "#map" });
  if (process.env.DBG) { await page.waitForTimeout(2500); console.log("DBGINFO", await page.evaluate(() => JSON.stringify({ L: typeof window.L, amap: document.querySelector("#amap")?.outerHTML.slice(0, 200), w: document.querySelector("#amap")?.clientWidth, h: document.querySelector("#amap")?.clientHeight, content: document.querySelector("#content").innerText.slice(0, 200) }))); }
  await page.locator(".leaflet-container").waitFor();
  await page.waitForFunction(() => document.querySelectorAll(".photo-pin").length === 2);
  assert.match(await page.locator("#mcount").innerText(), /2 ta/);
  assert.ok(await page.locator(".photo-pin img").first().evaluate((i) => i.complete && i.naturalWidth > 0), "pin rasmi (kichik rasm yo'q bo'lsa asl rasm)");
  await page.screenshot({ path: (process.env.SHOTS || "/tmp/claude-0") + "/admin-map.png" });
  await page.selectOption("#ma", "dog");
  await page.waitForFunction(() => document.querySelectorAll(".photo-pin").length === 1);
  await page.selectOption("#ma", "");
  await page.waitForFunction(() => document.querySelectorAll(".photo-pin").length === 2);
  await page.locator(".photo-pin.cat").click();
  await page.locator("#msel .pcard").waitFor();
  assert.match(await page.locator("#msel .pcard").innerText(), /Chiroyli mushuk/);
  assert.match(await page.locator("#msel .pcard").innerText(), /Ali Valiyev/);
  await page.locator("#msel").getByText("Bloklash").click();
  await page.fill("#pmReason", "spam");
  await page.locator(".modal .btn.bad", { hasText: "Bloklash" }).click();
  await page.waitForSelector(".photo-pin.blocked");
  assert.equal(db.posts.find((p) => p.id === "p1").status, "blocked");
  assert.deepEqual(errors, []);
  await ctx.close();
});

test("xabarlar: faollik lentasi, e'lonni ochish, nishon tozalanadi", async () => {
  const db = seed();
  const { page, errors, ctx } = await openPanel(db);
  await page.waitForFunction(() => !document.querySelector('[data-badge="activity"]').classList.contains("hidden"));
  await page.locator('.nav button[data-id="activity"]').click();
  await page.waitForSelector(".feed-item");
  const t = await page.locator("#feed").innerText();
  assert.match(t, /Ali Valiyev yangi e'lon qo'shdi «Chiroyli mushuk»/);
  assert.match(t, /Spammer .*izoh yozdi/); assert.match(t, /layk bosdi/); assert.match(t, /ro'yxatdan o'tdi/);
  assert.match(t, /<b>sotiladi<\/b>/, "izoh matni HTML sifatida talqin qilinmasligi kerak");
  assert.equal(await page.locator("#feed b").filter({ hasText: "sotiladi" }).count(), 0);
  await page.screenshot({ path: (process.env.SHOTS || "/tmp/claude-0") + "/admin-activity.png" });
  await page.waitForFunction(() => document.querySelector('[data-badge="activity"]').classList.contains("hidden"));
  await page.locator(".feed-item[data-post='p1']").first().click();
  if (process.env.DBG) { await page.waitForTimeout(1500); console.log("DBGINFO", await page.evaluate(() => JSON.stringify({ modal: document.querySelector(".modal")?.innerText.slice(0, 300), toasts: document.querySelector("#toasts")?.innerText })), JSON.stringify(db.calls.slice(-6))); }
  await page.waitForSelector(".modal .lightbox");
  assert.match(await page.locator(".modal").innerText(), /Chiroyli mushuk/);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test("statistika: to'rtta diagramma va eng faollar; sozlamalar: hisob va adminlar", async () => {
  const { page, errors, ctx } = await openPanel(seed(), { hash: "#stats" });
  await page.waitForSelector(".bars");
  assert.equal(await page.locator(".bars").count(), 4);
  await page.screenshot({ path: (process.env.SHOTS || "/tmp/claude-0") + "/admin-stats.png" });
  assert.match(await page.locator("#content").innerText(), /Eng faol e'lonlar/);
  assert.match(await page.locator("#content").innerText(), /Eng faol foydalanuvchilar/);
  await page.locator('.nav button[data-id="settings"]').click();
  await page.getByText("Adminlar (1)").waitFor();
  const t = await page.locator("#content").innerText();
  assert.match(t, /admin@x\.uz/); assert.match(t, /insert into public\.admins/); assert.match(t, /testproj\.supabase\.co/);
  assert.deepEqual(errors, []);
  await ctx.close();
});
