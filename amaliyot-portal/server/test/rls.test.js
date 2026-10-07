// Rollar matritsasi: har bir rol /api/db orqali nimani ko'ra oladi va nimani yoza oladi.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startApp, dbq } from "./helpers.js";

let t, tok = {}, sid = {}, period, brigade;
before(async () => {
  t = await startApp();
  for (const [l, r] of [["adm", "admin"], ["prak", "practice_head"], ["resh", "res_head"]]) { await t.mkStaff(l + "01", r); tok[l] = (await t.loginAs(l + "01")).token; }
  sid.a = await t.mkStudent("910000000001", "Alpha Talaba", "E-31", 3);
  sid.b = await t.mkStudent("910000000002", "Beta Talaba", "E-32", 2);
  sid.c = await t.mkStudent("910000000003", "Gamma Talaba", "E-31", 3);
  tok.a = (await t.loginAs("910000000001")).token;
  tok.b = (await t.loginAs("910000000002")).token;
  period = (await t.sql("insert into public.practice_periods (course, title, starts_on, ends_on) values (3,'3-kurs','2026-06-01','2026-06-30') returning id")).rows[0].id;
  brigade = (await t.sql("insert into public.brigades (name) values ('1-brigada') returning id")).rows[0].id;
  await t.sql("insert into public.attendance (student_id, work_date, status) values ($1,'2026-06-02','faol'), ($2,'2026-06-02','faol')", [sid.a, sid.b]);
  await t.sql("insert into public.tasks (student_id, title) values ($1,'Shaxsiy'), ($2,'Boshqaniki')", [sid.a, sid.b]);
  await t.sql("insert into public.tasks (group_name, title) values ('E-31','Guruh E-31'), ('E-32','Guruh E-32')");
  await t.sql("insert into public.announcements (title, target_course) values ('Hamma',null), ('3-kurs',3), ('2-kurs',2)");
  await t.sql("insert into public.feedbacks (student_id, message) values ($1,'a fikr'), ($2,'b fikr')", [sid.a, sid.b]);
});
after(async () => { await t.stop(); });

const sel = (token, table, extra = {}) => dbq(t, token, { table, op: "select", ...extra });
const rows = (r) => { assert.equal(r.status, 200, JSON.stringify(r.json)); return r.json.data; };

test("kirishsiz /api/db rad etiladi", async () => {
  assert.equal((await sel(undefined, "students")).status, 401);
});

test("talaba faqat o'zini ko'radi, xodimlar hammasini", async () => {
  assert.deepEqual(rows(await sel(tok.a, "students")).map((s) => s.hemis_id), ["910000000001"]);
  assert.equal(rows(await sel(tok.b, "students")).length, 1);
  for (const r of ["adm", "prak", "resh"]) assert.equal(rows(await sel(tok[r], "students")).length, 3);
  assert.equal(rows(await sel(tok.a, "profiles")).length, 1);
  assert.equal(rows(await sel(tok.resh, "profiles")).length, 6);
});

test("davomat/vazifa/fikr: talaba faqat o'zinikini ko'radi", async () => {
  assert.deepEqual(rows(await sel(tok.a, "attendance")).map((x) => x.student_id), [sid.a]);
  assert.deepEqual(rows(await sel(tok.a, "tasks")).map((x) => x.title).sort(), ["Guruh E-31", "Shaxsiy"]);
  assert.deepEqual(rows(await sel(tok.b, "tasks")).map((x) => x.title).sort(), ["Boshqaniki", "Guruh E-32"]);
  assert.deepEqual(rows(await sel(tok.a, "feedbacks")).map((x) => x.message), ["a fikr"]);
  assert.equal(rows(await sel(tok.prak, "feedbacks")).length, 2);
});

test("e'lonlar kursga qarab filtrlanadi", async () => {
  assert.deepEqual(rows(await sel(tok.a, "announcements")).map((x) => x.title).sort(), ["3-kurs", "Hamma"]);
  assert.deepEqual(rows(await sel(tok.b, "announcements")).map((x) => x.title).sort(), ["2-kurs", "Hamma"]);
  assert.equal(rows(await sel(tok.adm, "announcements")).length, 3);
});

test("brigadalar talabaga ko'rinmaydi, davrlar va sozlamalar ko'rinadi", async () => {
  assert.equal(rows(await sel(tok.a, "brigades")).length, 0);
  assert.equal(rows(await sel(tok.resh, "brigades")).length, 1);
  assert.equal(rows(await sel(tok.a, "practice_periods")).length, 1);
  assert.equal(rows(await sel(tok.a, "settings")).length, 1);
});

test("maxfiy jadvallarga hech kim (admin ham) /api/db orqali kira olmaydi", async () => {
  for (const tbl of ["credentials", "sessions", "activation_codes", "audit_log", "pg_roles", "information_schema.columns", "public.profiles"]) {
    for (const k of ["a", "adm"]) { const r = await sel(tok[k], tbl); assert.equal(r.status, 400, `${tbl}: ${r.text}`); }
  }
});

test("talaba boshqa talabaning ma'lumotini o'zgartira/o'chira olmaydi", async () => {
  const upd = await dbq(t, tok.a, { table: "students", op: "update", values: { full_name: "Hack" }, filters: [{ col: "id", op: "eq", val: sid.a }], returning: true });
  assert.equal(upd.json.data.length, 0, "talaba o'z yozuvini ham o'zgartira olmaydi");
  const del = await dbq(t, tok.a, { table: "attendance", op: "delete", filters: [{ col: "student_id", op: "eq", val: sid.b }], returning: true });
  assert.equal(del.json.data.length, 0);
  const ins = await dbq(t, tok.a, { table: "attendance", op: "insert", values: { student_id: sid.a, work_date: "2026-06-03", status: "faol" } });
  assert.equal(ins.status, 403);
  const prof = await dbq(t, tok.a, { table: "profiles", op: "update", values: { role: "admin" }, filters: [{ col: "login", op: "eq", val: "910000000001" }], returning: true });
  assert.equal(prof.json.data.length, 0, "talaba o'z rolini ko'tara olmaydi");
  const role = (await t.sql("select role from public.profiles where login = '910000000001'")).rows[0].role;
  assert.equal(role, "student");
});

test("yozish huquqlari: davomat faqat res_head/admin, vazifa faqat practice_head/admin", async () => {
  const att = (token, d) => dbq(t, token, { table: "attendance", op: "upsert", onConflict: "student_id,work_date", values: { student_id: sid.c, work_date: d, status: "faol", brigade_id: brigade } });
  assert.equal((await att(tok.resh, "2026-06-05")).status, 200);
  assert.equal((await att(tok.adm, "2026-06-06")).status, 200);
  assert.equal((await att(tok.prak, "2026-06-07")).status, 403);
  assert.equal((await att(tok.a, "2026-06-08")).status, 403);
  const task = (token) => dbq(t, token, { table: "tasks", op: "insert", values: { student_id: sid.c, title: "Yangi" } });
  assert.equal((await task(tok.prak)).status, 200);
  assert.equal((await task(tok.resh)).status, 403);
  const ann = (token) => dbq(t, token, { table: "announcements", op: "insert", values: { title: "X" } });
  assert.equal((await ann(tok.resh)).status, 200);
  assert.equal((await ann(tok.a)).status, 403);
});

test("talabalar jadvalini faqat admin va amaliyot rahbari yozadi", async () => {
  const mk = (token, h) => dbq(t, token, { table: "students", op: "insert", values: { hemis_id: h, full_name: "Yangi", group_name: "E-31", course: 3 } });
  assert.equal((await mk(tok.prak, "910000000010")).status, 200);
  assert.equal((await mk(tok.adm, "910000000011")).status, 200);
  assert.equal((await mk(tok.resh, "910000000012")).status, 403);
  assert.equal((await mk(tok.prak, "910000000010")).status, 409, "takroriy HEMIS ID");
});

test("profillar: faqat admin yozadi; sozlamalar: faqat admin o'zgartiradi", async () => {
  const p = (token) => dbq(t, token, { table: "profiles", op: "update", values: { full_name: "Yangi ism" }, filters: [{ col: "login", op: "eq", val: "resh01" }], returning: true });
  assert.equal((await p(tok.prak)).json.data.length, 0);
  assert.equal((await p(tok.adm)).json.data.length, 1);
  const s = (token) => dbq(t, token, { table: "settings", op: "update", values: { head_name: "Boshliq B." }, filters: [{ col: "id", op: "eq", val: true }], returning: true });
  assert.equal((await s(tok.resh)).json.data.length, 0);
  assert.equal((await s(tok.adm)).json.data.length, 1);
});

test("tasdiqlash: talaba faqat 'pending' yuboradi; qarorni faqat res_head/admin beradi", async () => {
  const send = (token, v) => dbq(t, token, { table: "approvals", op: "insert", values: v, returning: true });
  const sneaky = await send(tok.a, { student_id: sid.a, period_id: period, kind: "kundalik", state: "approved" });
  assert.equal(sneaky.status, 403);
  const other = await send(tok.a, { student_id: sid.b, period_id: period, kind: "kundalik" });
  assert.equal(other.status, 403);
  const ok = await send(tok.a, { student_id: sid.a, period_id: period, kind: "kundalik", data_hash: "h1", days_count: 3 });
  assert.equal(ok.status, 200);
  const id = ok.json.data[0].id;
  assert.equal((await send(tok.a, { student_id: sid.a, period_id: period, kind: "kundalik" })).status, 409, "takroriy so'rov");
  // talaba o'zi tasdiqlay olmaydi
  const self = await dbq(t, tok.a, { table: "approvals", op: "update", values: { state: "approved" }, filters: [{ col: "id", op: "eq", val: id }], returning: true });
  assert.equal(self.json.data.length, 0);
  const prak = await dbq(t, tok.prak, { table: "approvals", op: "update", values: { state: "approved" }, filters: [{ col: "id", op: "eq", val: id }], returning: true });
  assert.equal(prak.json.data.length, 0, "amaliyot rahbari tasdiqlay olmaydi");
  const dec = await dbq(t, tok.resh, { table: "approvals", op: "update", values: { state: "rejected", note: "Kamchilik" }, filters: [{ col: "id", op: "eq", val: id }], returning: true });
  assert.equal(dec.json.data[0].state, "rejected");
  // rad etilgach talaba qayta yubora oladi, lekin approved qilib bo'lmaydi
  const bad = await dbq(t, tok.a, { table: "approvals", op: "update", values: { state: "approved" }, filters: [{ col: "id", op: "eq", val: id }], returning: true });
  assert.equal(bad.status, 403);
  const re = await dbq(t, tok.a, { table: "approvals", op: "update", values: { state: "pending", decided_by: null, decided_at: null }, filters: [{ col: "id", op: "eq", val: id }], returning: true });
  assert.equal(re.json.data[0].state, "pending");
  // boshqa talaba bu so'rovni ko'rmaydi
  assert.equal(rows(await sel(tok.b, "approvals")).length, 0);
});

test("rasmlar jadvali: talaba faqat o'z papkasi yo'liga yozadi", async () => {
  const ph = (token, p, s = sid.a) => dbq(t, token, { table: "photos", op: "insert", values: { student_id: s, work_date: "2026-06-02", storage_path: p } });
  assert.equal((await ph(tok.a, `${sid.a}/2026-06-02/x.jpg`)).status, 200);
  assert.equal((await ph(tok.a, `${sid.b}/2026-06-02/y.jpg`)).status, 403);
  assert.equal((await ph(tok.a, `${sid.b}/2026-06-02/y.jpg`, sid.b)).status, 403);
  assert.equal(rows(await sel(tok.b, "photos")).length, 0);
});
