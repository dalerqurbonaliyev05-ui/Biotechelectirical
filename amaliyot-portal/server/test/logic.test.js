import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canManage, cleanStudentRow, codeUsable, formatCode, generateCode, generateTempPassword, hashCode, MAX_CODE_ATTEMPTS,
  normalizeCode, normalizeHemisId, normalizeLogin, normalizeStaffLogin, passwordError, timingSafeEqualStr,
} from "../src/logic.js";
import { hashPassword, signJwt, verifyJwt, verifyPassword } from "../src/crypto-utils.js";

test("HEMIS ID: faqat 6-20 ta raqam", () => {
  assert.equal(normalizeHemisId(" 312211100543 "), "312211100543");
  for (const bad of ["", "12345", "abc123456", "1".repeat(21), "123 456 789", null, undefined, "12345a"]) assert.equal(normalizeHemisId(bad), null, String(bad));
});

test("xodim logini: harf bilan boshlanadi, kichik harfga o'tadi", () => {
  assert.equal(normalizeStaffLogin(" Raxmonov "), "raxmonov");
  for (const bad of ["ab", "1abc", "312211100543", "a b c", "x".repeat(40), ""]) assert.equal(normalizeStaffLogin(bad), null, bad);
  assert.equal(normalizeLogin("312211100543"), "312211100543");
  assert.equal(normalizeLogin("Admin"), "admin");
  assert.equal(normalizeLogin("12"), null);
});

test("parol: 8-72 belgi", () => {
  assert.equal(passwordError("12345678"), null);
  assert.ok(passwordError("1234567")); assert.ok(passwordError("x".repeat(73))); assert.ok(passwordError(undefined)); assert.ok(passwordError(12345678));
});

test("kod: normallashtirish, alifbo, tasodifiylik, taqsimot", () => {
  assert.equal(normalizeCode(" ab3c-d4ef "), "AB3CD4EF");
  const seen = new Set(), counts = {};
  for (let i = 0; i < 3000; i++) { const c = generateCode(8); assert.match(c, /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/); seen.add(c); for (const ch of c) counts[ch] = (counts[ch] || 0) + 1; }
  assert.ok(seen.size > 2990);
  const exp = (3000 * 8) / 31;
  assert.equal(Object.keys(counts).length, 31);
  for (const [ch, n] of Object.entries(counts)) assert.ok(Math.abs(n - exp) / exp < 0.1, ch);
  assert.equal(formatCode("ABCD2345"), "ABCD-2345");
  const p = generateTempPassword(); assert.match(p, /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/); assert.equal(passwordError(p), null);
});

test("kod xeshi: HMAC, kalit/ID/kod o'zgarsa boshqa; taqqoslash vaqt bo'yicha xavfsiz", () => {
  const h = hashCode("ABCD2345", "312211100543", "pepper");
  assert.match(h, /^[0-9a-f]{64}$/);
  assert.equal(h, hashCode("ABCD2345", "312211100543", "pepper"));
  assert.notEqual(h, hashCode("ABCD2345", "312211100543", "other"));
  assert.notEqual(h, hashCode("ABCD2346", "312211100543", "pepper"));
  assert.notEqual(h, hashCode("ABCD2345", "312211100544", "pepper"));
  assert.equal(timingSafeEqualStr("abc", "abc"), true); assert.equal(timingSafeEqualStr("abc", "abd"), false); assert.equal(timingSafeEqualStr("abc", "abcd"), false);
});

test("codeUsable va MAX_CODE_ATTEMPTS", () => {
  const now = Date.parse("2026-10-03T12:00:00Z");
  assert.equal(codeUsable({ expires_at: "2026-10-04T00:00:00Z", used_at: null }, now), true);
  assert.equal(codeUsable({ expires_at: "2026-10-02T00:00:00Z", used_at: null }, now), false);
  assert.equal(codeUsable({ expires_at: "2026-10-04T00:00:00Z", used_at: "2026-10-03T00:00:00Z" }, now), false);
  assert.equal(codeUsable(null, now), false);
  assert.equal(MAX_CODE_ATTEMPTS, 5);
});

test("canManage: kim kimni boshqaradi", () => {
  assert.equal(canManage("admin", "res_head", "create_staff"), true);
  assert.equal(canManage("admin", "student", "create_staff"), false);
  assert.equal(canManage("admin", "student", "reset_password"), true);
  assert.equal(canManage("admin", null, "reset_password"), false);
  assert.equal(canManage("practice_head", "student", "reset_password"), true);
  assert.equal(canManage("practice_head", "student", "set_active"), false);
  assert.equal(canManage("practice_head", "res_head", "reset_password"), false);
  for (const a of ["create_staff", "reset_password", "set_active"]) for (const who of ["res_head", "student", "???"]) assert.equal(canManage(who, "student", a), false);
});

test("import qatori: to'g'ri va noto'g'ri holatlar", () => {
  const ok = cleanStudentRow({ hemis_id: " 999221110001 ", full_name: " Karimov Sardor ", course: "3", group_name: "E-31" }, 1);
  assert.deepEqual(ok.row, { hemis_id: "999221110001", full_name: "Karimov Sardor", group_name: "E-31", course: 3, faculty: null, specialty: null, university: null, kafedra: null });
  assert.match(cleanStudentRow({ hemis_id: "12", full_name: "A" }, 7).error, /^7-qator/);
  assert.match(cleanStudentRow({ hemis_id: "999221110001", full_name: " " }, 2).error, /F\.I\.SH/);
  assert.match(cleanStudentRow({ hemis_id: "999221110001", full_name: "A", course: "7" }, 3).error, /kurs/);
  assert.match(cleanStudentRow({ hemis_id: "999221110001", full_name: "A", course: "2.5" }, 3).error, /kurs/);
  assert.match(cleanStudentRow(null, 4).error, /noto'g'ri format/);
  assert.match(cleanStudentRow([], 4).error, /noto'g'ri format/);
  assert.equal(cleanStudentRow({ hemis_id: "999221110001", full_name: "x".repeat(500) }, 1).row.full_name.length, 200);
});

test("parol xeshi: to'g'ri/noto'g'ri, har safar boshqa tuz", async () => {
  const h1 = await hashPassword("Sirli-Parol-1"), h2 = await hashPassword("Sirli-Parol-1");
  assert.notEqual(h1, h2);
  assert.equal(await verifyPassword("Sirli-Parol-1", h1), true);
  assert.equal(await verifyPassword("Sirli-Parol-2", h1), false);
  assert.equal(await verifyPassword("x", "buzilgan-xesh"), false);
});

test("JWT: imzo, muddat, algoritm tekshiruvi", () => {
  const secret = "s".repeat(40), now = 1_000_000;
  const t = signJwt({ sub: "u1", exp: now + 60 }, secret);
  assert.equal(verifyJwt(t, secret, now).sub, "u1");
  assert.equal(verifyJwt(t, secret, now + 61), null, "muddati o'tgan");
  assert.equal(verifyJwt(t, "x".repeat(40), now), null, "boshqa kalit");
  const [h, b] = t.split(".");
  assert.equal(verifyJwt(`${h}.${Buffer.from(JSON.stringify({ sub: "admin", exp: now + 60 })).toString("base64url")}.${t.split(".")[2]}`, secret, now), null, "ma'lumot o'zgartirilgan");
  const none = `${Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url")}.${b}.`;
  assert.equal(verifyJwt(none, secret, now), null, "alg=none rad etiladi");
  assert.equal(verifyJwt("a.b", secret, now), null); assert.equal(verifyJwt(null, secret, now), null);
  assert.equal(verifyJwt(signJwt({ sub: "u1" }, secret), secret, now), null, "exp yo'q");
});
