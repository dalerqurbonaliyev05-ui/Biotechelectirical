import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { startApp, dbq } from "./helpers.js";

let t, a, b, staff, sa, sb;
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200, 1)]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(50)]);
const uuid = () => crypto.randomUUID();
before(async () => {
  t = await startApp({ MAX_PHOTO_BYTES: String(100 * 1024) });
  await t.mkStaff("resh01", "res_head");
  sa = await t.mkStudent("940000000001", "A"); sb = await t.mkStudent("940000000002", "B");
  a = (await t.loginAs("940000000001")).token; b = (await t.loginAs("940000000002")).token; staff = (await t.loginAs("resh01")).token;
});
after(async () => { await t.stop(); });

const put = (token, p, body) => t.call("PUT", `/api/storage/practice-photos/${p}`, { token, raw: body, headers: { "Content-Type": "application/octet-stream" } });
const reg = (token, p, s) => dbq(t, token, { table: "photos", op: "insert", values: { student_id: s, work_date: "2026-06-02", storage_path: p } });
const sign = (token, paths) => t.call("POST", "/api/storage/sign", { token, body: { paths } });

test("yuklash, bazada qayd etish, imzolangan havola orqali o'qish", async () => {
  const p = `${sa}/2026-06-02/${uuid()}.jpg`;
  assert.equal((await put(a, p, JPG)).status, 200);
  assert.equal((await reg(a, p, sa)).status, 200);
  const s = await sign(a, [p]);
  const url = s.json.data[0].signedUrl;
  assert.ok(url);
  const res = await fetch(t.base + url); // havola o'zi ruxsat beradi, sarlavha shart emas
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), "image/jpeg");
  assert.deepEqual(Buffer.from(await res.arrayBuffer()), JPG);
  // xodim ham havola olishi mumkin
  assert.ok((await sign(staff, [p])).json.data[0].signedUrl);
});

test("boshqa talaba havola ola olmaydi; qayd etilmagan fayl uchun havola yo'q", async () => {
  const p = `${sa}/2026-06-02/${uuid()}.jpg`;
  await put(a, p, JPG); await reg(a, p, sa);
  assert.equal((await sign(b, [p])).json.data[0].signedUrl, null);
  const orphan = `${sa}/2026-06-02/${uuid()}.jpg`;
  await put(a, orphan, JPG);
  assert.equal((await sign(a, [orphan])).json.data[0].signedUrl, null);
});

test("boshqa talabaning papkasiga yuklab bo'lmaydi; tokensiz yuklab bo'lmaydi", async () => {
  assert.equal((await put(a, `${sb}/2026-06-02/${uuid()}.jpg`, JPG)).status, 403);
  assert.equal((await put(undefined, `${sa}/2026-06-02/${uuid()}.jpg`, JPG)).status, 401);
  assert.equal((await put(staff, `${sa}/2026-06-02/${uuid()}.jpg`, JPG)).status, 403, "xodim rasm yuklamaydi");
});

test("fayl turi, hajmi va yo'l tekshiriladi", async () => {
  const id = uuid();
  assert.equal((await put(a, `${sa}/2026-06-02/${id}.jpg`, Buffer.from("<script>alert(1)</script>"))).status, 415);
  assert.equal((await put(a, `${sa}/2026-06-02/${uuid()}.png`, JPG)).status, 415, "kengaytma mos emas");
  assert.equal((await put(a, `${sa}/2026-06-02/${uuid()}.png`, PNG)).status, 200);
  assert.equal((await put(a, `${sa}/2026-06-02/${uuid()}.jpg`, Buffer.concat([JPG, Buffer.alloc(200 * 1024)]))).status, 413);
  assert.equal((await put(a, `${sa}/2026-06-02/${uuid()}.jpg`, Buffer.alloc(0))).status, 400);
  for (const bad of [`${sa}/../${sb}/2026-06-02/${uuid()}.jpg`, "../../etc/passwd", `${sa}/2026-06-02/x.jpg`, `${sa}/2026-06-02/${uuid()}.svg`, `%2e%2e/%2e%2e/x.jpg`]) {
    const r = await put(a, bad, JPG);
    assert.ok([400, 403, 404].includes(r.status), `${bad} -> ${r.status}`); // fetch ".." ni o'zi qisqartiradi: baribir boshqa talaba papkasi = 403
  }
  const p = `${sa}/2026-06-02/${id}.jpg`;
  assert.equal((await put(a, p, JPG)).status, 200);
  assert.equal((await put(a, p, JPG)).status, 409, "ustiga yozib bo'lmaydi");
});

test("havola: o'zgartirilgan imzo va muddati o'tgan havola rad etiladi", async () => {
  const p = `${sa}/2026-06-02/${uuid()}.jpg`;
  await put(a, p, JPG); await reg(a, p, sa);
  const url = (await sign(a, [p])).json.data[0].signedUrl;
  assert.equal((await fetch(t.base + url.replace(/s=.{4}/, "s=AAAA"))).status, 403);
  assert.equal((await fetch(t.base + url.replace(/e=\d+/, "e=99999999999"))).status, 403);
  const exp = Math.floor(Date.now() / 1000) - 10;
  const s = crypto.createHmac("sha256", t.config.jwtSecret).update(`file|${p}|${exp}`).digest("base64url");
  assert.equal((await fetch(`${t.base}/api/storage/file?p=${encodeURIComponent(p)}&e=${exp}&s=${s}`)).status, 403);
  // boshqa faylning imzosi bu faylga o'tmaydi
  const p2 = `${sa}/2026-06-02/${uuid()}.jpg`;
  const sig = /s=([^&]+)/.exec(url)[1], e = /e=(\d+)/.exec(url)[1];
  assert.equal((await fetch(`${t.base}/api/storage/file?p=${encodeURIComponent(p2)}&e=${e}&s=${sig}`)).status, 403);
});

test("o'chirish: egasi va admin mumkin, boshqa talaba va res_head mumkin emas", async () => {
  const p = `${sa}/2026-06-02/${uuid()}.jpg`;
  await put(a, p, JPG); await reg(a, p, sa);
  const del = (token) => t.call("DELETE", `/api/storage/practice-photos/${p}`, { token });
  assert.equal((await del(b)).status, 403);
  assert.equal((await del(staff)).status, 403);
  assert.equal((await del(a)).status, 200);
  const url = (await sign(a, [p])).json.data[0].signedUrl;
  assert.equal((await fetch(t.base + url)).status, 404);
});
