import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { startApp, PASSWORD } from "./helpers.js";
import { generateCode, hashCode, formatCode } from "../src/logic.js";
import { signJwt } from "../src/crypto-utils.js";

let t;
before(async () => { t = await startApp({ LOGIN_MAX_FAILURES: "5" }); await t.mkStaff("admin1", "admin"); await t.mkStaff("teacher1", "practice_head"); });
after(async () => { await t.stop(); });

const login = (l, p, extra = {}) => t.call("POST", "/api/auth/login", { body: { login: l, password: p, ...extra } });

test("to'g'ri parol bilan kirish va /me", async () => {
  const r = await login("admin1", PASSWORD);
  assert.equal(r.status, 200);
  assert.ok(r.json.access_token && r.json.refresh_token);
  assert.equal(r.json.user.role, "admin");
  const me = await t.call("GET", "/api/auth/me", { token: r.json.access_token });
  assert.equal(me.status, 200);
  assert.equal(me.json.user.login, "admin1");
});

test("noto'g'ri parol va mavjud bo'lmagan login bir xil xabar beradi", async () => {
  const a = await login("admin1", "xato-parol-123");
  const b = await login("yoq-odam", "xato-parol-123");
  assert.equal(a.status, 401); assert.equal(b.status, 401);
  assert.equal(a.json.error, b.json.error);
});

test("tokensiz, buzilgan va alg=none token rad etiladi", async () => {
  assert.equal((await t.call("GET", "/api/auth/me")).status, 401);
  assert.equal((await t.call("GET", "/api/auth/me", { token: "abc.def.ghi" })).status, 401);
  const none = Buffer.from('{"alg":"none","typ":"JWT"}').toString("base64url") + "." + Buffer.from(JSON.stringify({ sub: crypto.randomUUID(), exp: 9999999999 })).toString("base64url") + ".";
  assert.equal((await t.call("GET", "/api/auth/me", { token: none })).status, 401);
  const good = await login("admin1", PASSWORD);
  const parts = good.json.access_token.split(".");
  const forged = parts[0] + "." + Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(parts[1], "base64url")), sub: crypto.randomUUID() })).toString("base64url") + "." + parts[2];
  assert.equal((await t.call("GET", "/api/auth/me", { token: forged })).status, 401);
  const wrongKey = signJwt({ sub: good.json.user.id, role: "authenticated", exp: 9999999999 }, "boshqa-kalit-boshqa-kalit-boshqa-kalit-1");
  assert.equal((await t.call("GET", "/api/auth/me", { token: wrongKey })).status, 401);
  const expired = signJwt({ sub: good.json.user.id, role: "authenticated", exp: 10 }, t.config.jwtSecret);
  assert.equal((await t.call("GET", "/api/auth/me", { token: expired })).status, 401);
});

test("ketma-ket xato urinishlardan keyin hisob vaqtincha bloklanadi", async () => {
  await t.mkStaff("lockme", "practice_head");
  for (let i = 0; i < 5; i++) assert.equal((await login("lockme", "xato-parol-123")).status, 401);
  const r = await login("lockme", PASSWORD); // to'g'ri parol ham bloklangan paytda o'tmaydi
  assert.equal(r.status, 429);
});

test("refresh: aylanish, eski token qayta ishlatilsa hamma sessiya yopiladi", async () => {
  await t.mkStaff("rot", "practice_head");
  const s = await t.loginAs("rot");
  const r1 = await t.call("POST", "/api/auth/refresh", { body: { refresh_token: s.refresh } });
  assert.equal(r1.status, 200);
  assert.notEqual(r1.json.refresh_token, s.refresh);
  // eski token darhol qayta ishlatilsa (30 s oynasi ichida) rad etiladi, lekin sessiyalar yopilmaydi
  const again = await t.call("POST", "/api/auth/refresh", { body: { refresh_token: s.refresh } });
  assert.equal(again.status, 401);
  const r2 = await t.call("POST", "/api/auth/refresh", { body: { refresh_token: r1.json.refresh_token } });
  assert.equal(r2.status, 200);
  // oyna o'tgan deb hisoblaymiz: o'g'irlangan token qayta ishlatildi
  await t.sql("update public.sessions set revoked_at = now() - interval '5 minutes' where token_hash = $1", [crypto.createHash("sha256").update(r1.json.refresh_token).digest("hex")]);
  const reuse = await t.call("POST", "/api/auth/refresh", { body: { refresh_token: r1.json.refresh_token } });
  assert.equal(reuse.status, 401);
  const dead = await t.call("POST", "/api/auth/refresh", { body: { refresh_token: r2.json.refresh_token } });
  assert.equal(dead.status, 401, "qayta ishlatish aniqlangach butun oila yopilishi kerak");
  const log = await t.sql("select 1 from public.audit_log where action = 'refresh_reuse_detected' and actor_login = 'rot'");
  assert.equal(log.rowCount, 1);
});

test("logout refresh tokenni bekor qiladi", async () => {
  await t.mkStaff("logout1", "practice_head");
  const s = await t.loginAs("logout1");
  assert.equal((await t.call("POST", "/api/auth/logout", { body: { refresh_token: s.refresh } })).status, 200);
  assert.equal((await t.call("POST", "/api/auth/refresh", { body: { refresh_token: s.refresh } })).status, 401);
});

test("parol almashtirish: joriy parol shart, boshqa sessiyalar yopiladi", async () => {
  await t.mkStaff("chpass1", "practice_head");
  const a = await t.loginAs("chpass1");
  const b = await t.loginAs("chpass1");
  const bad = await t.call("POST", "/api/auth/change-password", { token: a.token, body: { current_password: "xato-xato-123", new_password: "Yangi-Parol-777" } });
  assert.equal(bad.status, 400);
  const weak = await t.call("POST", "/api/auth/change-password", { token: a.token, body: { current_password: PASSWORD, new_password: "123" } });
  assert.equal(weak.status, 400);
  const same = await t.call("POST", "/api/auth/change-password", { token: a.token, body: { current_password: PASSWORD, new_password: PASSWORD } });
  assert.equal(same.status, 400);
  const ok = await t.call("POST", "/api/auth/change-password", { token: a.token, body: { current_password: PASSWORD, new_password: "Yangi-Parol-777" } });
  assert.equal(ok.status, 200);
  assert.equal((await login("chpass1", PASSWORD)).status, 401);
  assert.equal((await login("chpass1", "Yangi-Parol-777")).status, 200);
  assert.equal((await t.call("POST", "/api/auth/refresh", { body: { refresh_token: b.refresh } })).status, 401, "boshqa qurilma sessiyasi yopilishi kerak");
  assert.equal((await t.call("POST", "/api/auth/refresh", { body: { refresh_token: a.refresh } })).status, 200, "joriy sessiya qoladi");
});

test("faolsizlantirilgan foydalanuvchi kira olmaydi va mavjud token ishlamaydi", async () => {
  await t.mkStaff("gone", "practice_head");
  const s = await t.loginAs("gone");
  await t.sql("update public.profiles set active = false where login = 'gone'");
  // kesh (3 s) tufayli darhol emas, balki keshni kutib tekshiramiz
  await new Promise((r) => setTimeout(r, 3200));
  assert.equal((await t.call("GET", "/api/auth/me", { token: s.token })).status, 401);
  assert.equal((await login("gone", PASSWORD)).status, 403);
});

async function newStudentWithCode(hemis, name = "Sinov Talaba") {
  const st = (await t.sql("insert into public.students (hemis_id, full_name, group_name, course) values ($1,$2,'E-31',3) returning id", [hemis, name])).rows[0];
  const code = generateCode(8);
  await t.sql("insert into public.activation_codes (student_id, code_hash, expires_at) values ($1,$2, now() + interval '7 days')", [st.id, hashCode(code, hemis, t.config.activationPepper)]);
  return { id: st.id, code: formatCode(code) };
}
const activate = (hemis_id, code, password = "Talaba-Parol-1") => t.call("POST", "/api/auth/activate", { body: { hemis_id, code, password } });

test("faollashtirish: to'g'ri kod bilan hisob yaratiladi, keyin kirish mumkin, kod qayta ishlamaydi", async () => {
  const { code } = await newStudentWithCode("900000000001");
  const r = await activate("900000000001", code);
  assert.equal(r.status, 200);
  const l = await login("900000000001", "Talaba-Parol-1");
  assert.equal(l.status, 200);
  assert.equal(l.json.user.role, "student");
  assert.equal((await activate("900000000001", code)).status, 409);
});

test("faollashtirish: noto'g'ri kod urinishlar soni bilan cheklanadi (to'g'ri kod ham o'tmaydi)", async () => {
  const { code } = await newStudentWithCode("900000000002");
  for (let i = 0; i < 5; i++) assert.equal((await activate("900000000002", "AAAA-AAAA")).status, 400);
  assert.equal((await activate("900000000002", code)).status, 429);
});

test("faollashtirish: bir vaqtda 20 ta parallel so'rov — faqat bittasi muvaffaqiyatli", async () => {
  const { code } = await newStudentWithCode("900000000003");
  const rs = await Promise.all(Array.from({ length: 20 }, () => activate("900000000003", code)));
  assert.equal(rs.filter((r) => r.status === 200).length, 1);
  const n = await t.sql("select count(*)::int as n from public.profiles where login = '900000000003'");
  assert.equal(n.rows[0].n, 1);
});

test("faollashtirish: mavjud bo'lmagan ID, kodsiz talaba, zaif parol", async () => {
  assert.equal((await activate("900000009999", "AAAA-AAAA")).status, 400);
  await t.sql("insert into public.students (hemis_id, full_name, group_name, course) values ('900000000004','Kodsiz','E-31',3)");
  assert.equal((await activate("900000000004", "AAAA-AAAA")).status, 400);
  const { code } = await newStudentWithCode("900000000005");
  assert.equal((await activate("900000000005", code, "123")).status, 400);
  // zaif parol urinish hisoblanmaydi: kod hali ishlaydi
  assert.equal((await activate("900000000005", code)).status, 200);
});

test("faollashtirish: muddati o'tgan kod rad etiladi", async () => {
  const { id, code } = await newStudentWithCode("900000000006");
  await t.sql("update public.activation_codes set expires_at = now() - interval '1 day' where student_id = $1", [id]);
  assert.equal((await activate("900000000006", code)).status, 400);
});

test("kod bazada ochiq holda saqlanmaydi (faqat HMAC)", async () => {
  const { id, code } = await newStudentWithCode("900000000007");
  const row = (await t.sql("select code_hash from public.activation_codes where student_id = $1", [id])).rows[0];
  assert.ok(!row.code_hash.includes(code.replace("-", "")));
  assert.equal(row.code_hash.length, 64);
});
