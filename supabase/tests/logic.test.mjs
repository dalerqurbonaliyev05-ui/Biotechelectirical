// Edge Function'lar mantig'ini sinash: `node --test supabase/tests/logic.test.mjs` (Node 22.18+).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cleanStudentRow,
  codeUsable,
  formatCode,
  generateCode,
  hashCode,
  MAX_CODE_ATTEMPTS,
  normalizeCode,
  normalizeHemisId,
  normalizeStaffLogin,
  passwordError,
  staffEmail,
  studentEmail,
  timingSafeEqual,
} from "../functions/_shared/logic.ts";

test("HEMIS ID: faqat 6-20 ta raqam", () => {
  assert.equal(normalizeHemisId(" 312211100543 "), "312211100543");
  assert.equal(normalizeHemisId(312211100543), "312211100543");
  for (const bad of ["", "12345", "abc123456", "1234567890123456789012", "123 456 789", null, undefined, "12345a"]) {
    assert.equal(normalizeHemisId(bad), null, String(bad));
  }
});

test("xodim logini: harf bilan boshlanadi, kichik harfga o'tadi", () => {
  assert.equal(normalizeStaffLogin(" Raxmonov "), "raxmonov");
  assert.equal(normalizeStaffLogin("a.b-c_1"), "a.b-c_1");
  for (const bad of ["ab", "1abc", "312211100543", "a b c", "аbc", "x".repeat(40), ""]) {
    assert.equal(normalizeStaffLogin(bad), null, bad);
  }
});

test("email'lar ro'yxatdan o'tkazib bo'lmaydigan .invalid domenida", () => {
  assert.equal(studentEmail("312211100543"), "312211100543@students.res.invalid");
  assert.equal(staffEmail("raxmonov"), "raxmonov@staff.res.invalid");
});

test("parol: 8-72 belgi", () => {
  assert.equal(passwordError("12345678"), null);
  assert.ok(passwordError("1234567"));
  assert.ok(passwordError("x".repeat(73)));
  assert.ok(passwordError(undefined));
  assert.ok(passwordError(12345678));
});

test("kod: bo'sh joy va chiziqcha e'tiborga olinmaydi, katta harfga o'tadi", () => {
  assert.equal(normalizeCode("ab3c-d4ef"), "AB3CD4EF");
  assert.equal(normalizeCode(" ab3c d4ef "), "AB3CD4EF");
  assert.equal(normalizeCode(null), "");
});

test("generateCode: uzunlik, alifbo (adashtiradigan belgilarsiz), tasodifiylik", () => {
  const seen = new Set();
  for (let i = 0; i < 2000; i++) {
    const c = generateCode(8);
    assert.match(c, /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/);
    seen.add(c);
  }
  assert.ok(seen.size > 1990, "takrorlanish juda ko'p");
  assert.equal(formatCode("ABCD2345"), "ABCD-2345");
  assert.equal(normalizeCode(formatCode("ABCD2345")), "ABCD2345");
});

test("generateCode: belgilar taxminan teng taqsimlanadi", () => {
  const counts = {};
  const N = 31 * 2000;
  let got = 0;
  while (got < N) { for (const ch of generateCode(8)) { counts[ch] = (counts[ch] ?? 0) + 1; got++; } }
  const exp = got / 31;
  for (const [ch, n] of Object.entries(counts)) assert.ok(Math.abs(n - exp) / exp < 0.1, `${ch}: ${n} (kutilgan ${exp | 0})`);
  assert.equal(Object.keys(counts).length, 31);
});

test("hashCode: bir xil kirish = bir xil xesh; ID, kod yoki pepper o'zgarsa boshqa", async () => {
  const h = await hashCode("ABCD2345", "312211100543");
  assert.match(h, /^[0-9a-f]{64}$/);
  assert.equal(h, await hashCode("ABCD2345", "312211100543"));
  assert.notEqual(h, await hashCode("ABCD2346", "312211100543"));
  assert.notEqual(h, await hashCode("ABCD2345", "312211100544"));
  assert.notEqual(h, await hashCode("ABCD2345", "312211100543", "pepper"));
});

test("timingSafeEqual", () => {
  assert.equal(timingSafeEqual("abc", "abc"), true);
  assert.equal(timingSafeEqual("abc", "abd"), false);
  assert.equal(timingSafeEqual("abc", "abcd"), false);
});

test("codeUsable: ishlatilmagan va muddati o'tmagan bo'lsagina", () => {
  const now = Date.parse("2026-10-03T12:00:00Z");
  assert.equal(codeUsable({ expires_at: "2026-10-04T00:00:00Z", used_at: null }, now), true);
  assert.equal(codeUsable({ expires_at: "2026-10-02T00:00:00Z", used_at: null }, now), false);
  assert.equal(codeUsable({ expires_at: "2026-10-04T00:00:00Z", used_at: "2026-10-03T00:00:00Z" }, now), false);
  assert.equal(codeUsable(null, now), false);
  assert.equal(codeUsable(undefined, now), false);
  assert.equal(MAX_CODE_ATTEMPTS, 5);
});

test("import qatori: to'g'ri va noto'g'ri holatlar", () => {
  const ok = cleanStudentRow({ hemis_id: " 999221110001 ", full_name: " Karimov Sardor ", course: "3", group_name: "E-31" }, 1);
  assert.equal(ok.error, undefined);
  assert.deepEqual(ok.row, {
    hemis_id: "999221110001", full_name: "Karimov Sardor", group_name: "E-31", course: 3,
    faculty: null, specialty: null, university: null, kafedra: null,
  });
  assert.equal(cleanStudentRow({ hemis_id: "999221110001", full_name: "A" }, 1).row.course, null);

  assert.match(cleanStudentRow({ hemis_id: "12", full_name: "A" }, 7).error, /^7-qator/);
  assert.match(cleanStudentRow({ hemis_id: "999221110001", full_name: "  " }, 2).error, /F\.I\.SH/);
  assert.match(cleanStudentRow({ hemis_id: "999221110001", full_name: "A", course: "7" }, 3).error, /kurs/);
  assert.match(cleanStudentRow({ hemis_id: "999221110001", full_name: "A", course: "2.5" }, 3).error, /kurs/);
  assert.match(cleanStudentRow(null, 4).error, /noto'g'ri format/);
  assert.equal(cleanStudentRow({ hemis_id: "999221110001", full_name: "x".repeat(500) }, 1).row.full_name.length, 200);
});
