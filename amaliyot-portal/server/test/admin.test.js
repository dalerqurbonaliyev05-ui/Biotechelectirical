import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startApp, PASSWORD } from "./helpers.js";

let t, tok = {};
before(async () => {
  t = await startApp();
  for (const [l, r] of [["adm01", "admin"], ["prak01", "practice_head"], ["resh01", "res_head"]]) { await t.mkStaff(l, r); tok[l] = (await t.loginAs(l)).token; }
});
after(async () => { await t.stop(); });

const users = (token, body) => t.call("POST", "/api/admin/users", { token, body });
const imp = (token, body) => t.call("POST", "/api/admin/import-students", { token, body });

test("xodim yaratish: xodimni faqat admin yaratadi", async () => {
  const r = await users(tok.adm01, { action: "create_staff", login: "Yangi.Xodim", full_name: "Yangi Xodim", role: "practice_head" });
  assert.equal(r.status, 200);
  assert.equal(r.json.login, "yangi.xodim");
  assert.match(r.json.temp_password, /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  const l = await t.call("POST", "/api/auth/login", { body: { login: "yangi.xodim", password: r.json.temp_password } });
  assert.equal(l.status, 200);
  assert.equal(l.json.user.must_change_password, true, "vaqtinchalik parol almashtirilishi shart");
  assert.equal((await users(tok.prak01, { action: "create_staff", login: "res.yangi", full_name: "Res Yangi", role: "res_head" })).status, 403, "xodimni faqat admin yaratadi");
  assert.equal((await users(tok.prak01, { action: "create_staff", login: "adm.yangi", full_name: "X", role: "admin" })).status, 403);
  assert.equal((await users(tok.resh01, { action: "create_staff", login: "res.boshqa", full_name: "X", role: "res_head" })).status, 403);
  assert.equal((await users(tok.adm01, { action: "create_staff", login: "yangi.xodim", full_name: "X", role: "res_head" })).status, 409);
  assert.equal((await users(tok.adm01, { action: "create_staff", login: "1ab", full_name: "X", role: "res_head" })).status, 400);
  assert.equal((await users(tok.adm01, { action: "create_staff", login: "ok.login", full_name: "X", role: "student" })).status, 400);
  assert.equal((await users(tok.adm01, { action: "nomalum" })).status, 400);
});

test("parolni tiklash: ruxsat va sessiyalarni yopish; mavjud bo'lmagan va ruxsatsiz bir xil javob", async () => {
  await t.mkStaff("tiklash1", "res_head");
  const s = await t.loginAs("tiklash1");
  const r = await users(tok.adm01, { action: "reset_password", login: "tiklash1" });
  assert.equal(r.status, 200);
  assert.equal((await t.call("POST", "/api/auth/refresh", { body: { refresh_token: s.refresh } })).status, 401);
  assert.equal((await t.call("POST", "/api/auth/login", { body: { login: "tiklash1", password: PASSWORD } })).status, 401);
  assert.equal((await t.call("POST", "/api/auth/login", { body: { login: "tiklash1", password: r.json.temp_password } })).status, 200);
  const noRight = await users(tok.resh01, { action: "reset_password", login: "tiklash1" });
  const missing = await users(tok.resh01, { action: "reset_password", login: "mavjud-emas" });
  assert.equal(noRight.status, 403); assert.equal(missing.status, 403);
  assert.deepEqual(noRight.json, missing.json);
  // amaliyot rahbari faqat talabaning parolini tiklaydi
  await t.mkStudent("920000000099", "Parol Talaba");
  assert.equal((await users(tok.prak01, { action: "reset_password", login: "920000000099" })).status, 200);
  assert.equal((await users(tok.prak01, { action: "reset_password", login: "resh01" })).status, 403);
  assert.equal((await users(tok.prak01, { action: "reset_password", login: "adm01" })).status, 403);
});

test("hisobni o'chirish/yoqish: o'zini o'chira olmaydi, o'chirilgan kira olmaydi", async () => {
  await t.mkStaff("vaqtincha", "res_head");
  assert.equal((await users(tok.adm01, { action: "set_active", login: "adm01", active: false })).status, 400);
  assert.equal((await users(tok.adm01, { action: "set_active", login: "vaqtincha", active: false })).status, 200);
  assert.equal((await t.call("POST", "/api/auth/login", { body: { login: "vaqtincha", password: PASSWORD } })).status, 403);
  assert.equal((await users(tok.adm01, { action: "set_active", login: "vaqtincha", active: true })).status, 200);
  assert.equal((await t.call("POST", "/api/auth/login", { body: { login: "vaqtincha", password: PASSWORD } })).status, 200);
  assert.equal((await users(tok.resh01, { action: "set_active", login: "vaqtincha", active: false })).status, 403);
});

test("import: faqat admin/amaliyot rahbari; kodlar qaytadi va faollashtirishda ishlaydi", async () => {
  const students = [
    { hemis_id: "920000000001", full_name: "Ali Valiyev", group_name: "E-31", course: 3 },
    { hemis_id: "920000000002", full_name: "Vali Aliyev", group_name: "E-31", course: 3 },
  ];
  assert.equal((await imp(tok.resh01, { students })).status, 403);
  const r = await imp(tok.prak01, { students });
  assert.equal(r.status, 200);
  assert.equal(r.json.created, 2); assert.equal(r.json.codes.length, 2);
  const code = r.json.codes.find((c) => c.hemis_id === "920000000001").code;
  const a = await t.call("POST", "/api/auth/activate", { body: { hemis_id: "920000000001", code, password: "Talaba-Parol-1" } });
  assert.equal(a.status, 200);
  // qayta import: yangi kod berilmaydi (mavjud kod saqlanadi), faollashgan talabaga hech qachon kod berilmaydi
  const r2 = await imp(tok.prak01, { students: [...students, { hemis_id: "920000000003", full_name: "Uchinchi", group_name: "E-32", course: 3 }] });
  assert.equal(r2.json.created, 1);
  assert.equal(r2.json.codes.length, 1);
  assert.equal(r2.json.already_activated, 1);
  assert.equal(r2.json.kept_existing, 1);
  // qayta kod so'rash
  const r3 = await imp(tok.adm01, { students, reissue_hemis_ids: ["920000000002", "920000000001"] });
  assert.deepEqual(r3.json.codes.map((c) => c.hemis_id), ["920000000002"], "faollashgan talabaga kod berilmaydi");
  // eski kod endi ishlamaydi
  const old = r.json.codes.find((c) => c.hemis_id === "920000000002").code;
  assert.equal((await t.call("POST", "/api/auth/activate", { body: { hemis_id: "920000000002", code: old, password: "Talaba-Parol-1" } })).status, 400);
});

test("import: bitta xato bo'lsa hech narsa yozilmaydi", async () => {
  const before = (await t.sql("select count(*)::int n from public.students")).rows[0].n;
  const r = await imp(tok.adm01, { students: [
    { hemis_id: "930000000001", full_name: "To'g'ri", group_name: "E-31", course: 3 },
    { hemis_id: "xato", full_name: "Xato", group_name: "E-31", course: 3 },
  ] });
  assert.equal(r.status, 400);
  assert.equal((await t.sql("select count(*)::int n from public.students")).rows[0].n, before);
  assert.equal((await imp(tok.adm01, { students: [] })).status, 400);
  assert.equal((await imp(tok.adm01, {})).status, 400);
});

test("amallar auditga yoziladi, audit faqat admin ko'radi", async () => {
  const a = await t.call("GET", "/api/admin/audit", { token: tok.adm01 });
  assert.equal(a.status, 200);
  const acts = new Set(a.json.data.map((x) => x.action));
  for (const k of ["staff_created", "password_reset", "students_imported", "login"]) assert.ok(acts.has(k), k);
  assert.equal((await t.call("GET", "/api/admin/audit", { token: tok.prak01 })).status, 403);
  assert.ok(!JSON.stringify(a.json).includes("temp_password"), "auditda parollar bo'lmasligi kerak");
});
