import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import { startApp, dbq } from "./helpers.js";

let t, adm;
before(async () => { t = await startApp(); await t.mkStaff("adm01", "admin"); adm = (await t.loginAs("adm01")).token; });
after(async () => { await t.stop(); });

const raw = (reqText) => new Promise((resolve) => {
  const s = net.connect(new URL(t.base).port, "127.0.0.1", () => s.write(reqText));
  let d = ""; s.on("data", (c) => { d += c; }); s.on("close", () => resolve(d)); s.setTimeout(2000, () => { s.destroy(); });
});

test("xavfsizlik sarlavhalari barcha javoblarda", async () => {
  for (const p of ["/login.html", "/api/health", "/yoq"]) {
    const r = await t.call("GET", p);
    assert.match(r.headers.get("content-security-policy"), /script-src 'self'/, p);
    assert.equal(r.headers.get("x-content-type-options"), "nosniff");
    assert.equal(r.headers.get("x-frame-options"), "DENY");
  }
});

test("statik fayllar: yo'l o'tish, yashirin va tashqi fayllar yopiq", async () => {
  assert.equal((await t.call("GET", "/")).status, 200);
  assert.equal((await t.call("GET", "/js/a.js")).status, 200);
  assert.equal((await t.call("GET", "/.secret")).status, 404);
  for (const p of ["/../outside-secret.txt", "/%2e%2e/outside-secret.txt", "/js/../../outside-secret.txt", "/%2e%2e%2f%2e%2e%2foutside-secret.txt", "/js/%00.js"]) {
    const r = await t.call("GET", p);
    assert.ok([400, 404].includes(r.status), `${p} -> ${r.status}`);
    assert.ok(!r.text.includes("tashqarida"));
  }
  const rawReq = await raw("GET /../../../etc/passwd HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n");
  assert.ok(!rawReq.includes("root:"));
  assert.equal((await t.call("POST", "/login.html")).status, 405);
});

test("shlyuz: SQL inyeksiya, noma'lum ustun/jadval, filtrsiz yozish rad etiladi", async () => {
  const bad = [
    { table: "students; drop table students", op: "select" },
    { table: "students", op: "select", select: "id, (select password_hash from credentials)" },
    { table: "students", op: "select", filters: [{ col: "full_name\" or 1=1 --", op: "eq", val: "x" }] },
    { table: "students", op: "select", filters: [{ col: "id", op: "= 1 or 1=1 --", val: "x" }] },
    { table: "students", op: "select", order: [{ col: "id; drop table students" }] },
    { table: "students", op: "update", values: { full_name: "X" } },
    { table: "students", op: "delete" },
    { table: "students", op: "delete", filters: [] },
    { table: "students", op: "insert", values: { "x\") values (1); --": 1 } },
    { table: "students", op: "select", filters: [{ col: "id", op: "eq", val: { $ne: 1 } }] },
    { table: "students", op: "nope" },
    { table: "students", op: "select", limit: "1; drop table students" },
    { table: "students", op: "select", range: ["0", "1; drop"] },
  ];
  for (const b of bad) { const r = await dbq(t, adm, b); assert.equal(r.status, 400, JSON.stringify(b) + " -> " + r.text); }
  assert.equal((await t.sql("select to_regclass('public.students') as r")).rows[0].r, "students");
});

test("shlyuz: qiymat parametr sifatida (tirnoq va maxsus belgilar zarar qilmaydi)", async () => {
  const name = `O'Brien"; drop table students; --`;
  const ins = await dbq(t, adm, { table: "students", op: "insert", values: { hemis_id: "950000000001", full_name: name, group_name: "E", course: 1 }, returning: true });
  assert.equal(ins.status, 200);
  const got = await dbq(t, adm, { table: "students", op: "select", filters: [{ col: "full_name", op: "eq", val: name }], single: "one" });
  assert.equal(got.json.data.hemis_id, "950000000001");
});

test("shlyuz: single rejimi va tartib/oraliq", async () => {
  for (let i = 0; i < 5; i++) await t.sql("insert into public.students (hemis_id, full_name, group_name, course) values ($1,$2,'E',1)", [`96000000000${i}`, `S${i}`]);
  const r = await dbq(t, adm, { table: "students", op: "select", select: "hemis_id", filters: [{ col: "hemis_id", op: "gte", val: "960000000000" }], order: [{ col: "hemis_id", asc: false }], range: [1, 2] });
  assert.deepEqual(r.json.data.map((x) => x.hemis_id), ["960000000003", "960000000002"]);
  assert.equal((await dbq(t, adm, { table: "students", op: "select", single: "one" })).status, 406);
  assert.equal((await dbq(t, adm, { table: "students", op: "select", filters: [{ col: "hemis_id", op: "eq", val: "yoq" }], single: "maybe" })).json.data, null);
});

test("noto'g'ri JSON, juda katta tana, noma'lum yo'l", async () => {
  const r = await t.call("POST", "/api/auth/login", { raw: "{not json", headers: { "Content-Type": "application/json" } });
  assert.equal(r.status, 400);
  const big = await t.call("POST", "/api/auth/login", { raw: JSON.stringify({ login: "a", password: "x".repeat(50000) }), headers: { "Content-Type": "application/json" } });
  assert.equal(big.status, 413);
  assert.equal((await t.call("GET", "/api/yoq", { token: adm })).status, 404);
  assert.equal((await t.call("GET", "/api/health")).json.ok, true);
});

test("kirish yo'llariga so'rovlar chegarasi qo'llanadi", async () => {
  const t2 = await startApp({ RATE_LIMIT_AUTH_PER_MIN: "5" });
  try {
    const codes = [];
    for (let i = 0; i < 8; i++) codes.push((await t2.call("POST", "/api/auth/login", { body: { login: "nobody", password: "xxxxxxxx" } })).status);
    assert.deepEqual(codes.slice(0, 5), [401, 401, 401, 401, 401]);
    assert.ok(codes.slice(5).every((c) => c === 429), codes.join());
  } finally { await t2.stop(); }
});

test("500 xatolarida ichki ma'lumot sizib chiqmaydi", async () => {
  const r = await t.call("POST", "/api/db", { token: adm, body: { table: "students", op: "insert", values: { hemis_id: "950000000001", full_name: "dup", group_name: "E", course: 1 } } });
  assert.equal(r.status, 409);
  assert.ok(!/constraint "|students_/i.test(r.text), r.text);
});
