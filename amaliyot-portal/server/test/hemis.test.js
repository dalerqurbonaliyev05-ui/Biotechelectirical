import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { courseOf, mapHemisStudent, fetchHemisStudents } from "../src/hemis.js";
import { createAdmin } from "../src/admin.js";
import { createAuth } from "../src/auth.js";
import { startApp } from "./helpers.js";

const item = (n) => ({
  student_id_number: `31221110${String(n).padStart(4, "0")}`, second_name: "Aliyev", first_name: `Vali${n}`, third_name: "Karim o'g'li",
  group: { name: "E-31" }, level: { code: "13", name: "3-kurs" }, department: { name: "Energetika" }, specialty: { name: "Elektr ta'minoti" },
});

let srv, url, seen = [];
before(async () => {
  srv = http.createServer((req, res) => {
    seen.push({ url: req.url, auth: req.headers.authorization });
    const u = new URL(req.url, "http://x");
    if (req.headers.authorization !== "Bearer good") { res.writeHead(401); return res.end("{}"); }
    const page = Number(u.searchParams.get("page")), limit = Number(u.searchParams.get("limit"));
    const all = Array.from({ length: 5 }, (_, i) => item(i + 1));
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true, data: { items: all.slice((page - 1) * limit, page * limit), pagination: { pageCount: Math.ceil(all.length / limit) } } }));
  });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  url = `http://127.0.0.1:${srv.address().port}/rest/v1`;
});
after(() => srv.close());

test("kurs: nom va kod bo'yicha", () => {
  assert.equal(courseOf({ code: "12", name: "2-kurs" }), 2);
  assert.equal(courseOf({ code: "15" }), 5);
  assert.equal(courseOf({ name: "4 kurs" }), 4);
  assert.equal(courseOf(null), null);
  assert.equal(courseOf({ name: "Magistratura" }), null);
});

test("maydonlar xaritasi", () => {
  const r = mapHemisStudent(item(7), { university: "TDTU" });
  assert.deepEqual(r, { hemis_id: "312211100007", full_name: "Aliyev Vali7 Karim o'g'li", group_name: "E-31", course: 3, faculty: "Energetika", specialty: "Elektr ta'minoti", university: "TDTU", kafedra: "" });
});

test("sahifalab o'qish, token yuborish, xatolar", async () => {
  const rows = await fetchHemisStudents({ apiUrl: url, token: "good", pageSize: 2 });
  assert.equal(rows.length, 5);
  assert.equal(seen.filter((s) => s.auth === "Bearer good").length, 3, "3 sahifa");
  await assert.rejects(fetchHemisStudents({ apiUrl: url, token: "bad" }), /401\/403/);
  await assert.rejects(fetchHemisStudents({ apiUrl: "http://127.0.0.1:1/x", token: "good" }), /ulanib bo'lmadi/);
  await assert.rejects(fetchHemisStudents({ apiUrl: url }), /HEMIS_API_TOKEN/);
});

test("HEMIS ro'yxati portalga yoziladi va qayta yuklash dublikat yaratmaydi", async () => {
  const t = await startApp();
  try {
    const rows = await fetchHemisStudents({ apiUrl: url, token: "good", pageSize: 3 });
    const admin = createAdmin({ db: t.app.db, config: t.config, auth: createAuth({ db: t.app.db, config: t.config }) });
    const caller = { id: null, login: "hemis-sync", role: "admin" };
    const r1 = await admin.importStudents(caller, { students: rows }, { ip: "cli" });
    assert.equal(r1.created, 5); assert.equal(r1.codes.length, 5);
    const r2 = await admin.importStudents(caller, { students: rows }, { ip: "cli" });
    assert.equal(r2.created, 0); assert.equal(r2.updated, 5); assert.equal(r2.codes.length, 0, "kodlar o'zgarmaydi");
    assert.equal((await t.sql("select count(*)::int n from public.students")).rows[0].n, 5);
  } finally { await t.stop(); }
});
