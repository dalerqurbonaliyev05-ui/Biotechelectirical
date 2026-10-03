// CSV/Excel importi mantig'i: `node --test import.test.mjs`
import { test } from "node:test";
import assert from "node:assert/strict";
import { detectDelimiter, parseDelimited, mapHeaders, rowsToStudents, parseStudentsText } from "../../yangiloyiha1/js/import.js";

test("ajratuvchi aniqlanadi: tab, nuqta-vergul, vergul", () => {
  assert.equal(detectDelimiter("a\tb\tc\n1\t2\t3"), "\t");
  assert.equal(detectDelimiter("a;b;c\n1;2;3"), ";");
  assert.equal(detectDelimiter("a,b,c\n1,2,3"), ",");
  assert.equal(detectDelimiter('"a,b";c;d'), ";");
  assert.equal(detectDelimiter("faqat_bitta"), ",");
});

test("parseDelimited: qo'shtirnoq, qator ichidagi qator, BOM, CRLF, bo'sh qatorlar", () => {
  const t = '﻿a;b\r\n"x;y";"he said ""hi"""\r\n\r\n"ko\'p\nqatorli";z\r\n';
  assert.deepEqual(parseDelimited(t), [["a", "b"], ["x;y", 'he said "hi"'], ["ko'p\nqatorli", "z"]]);
  assert.deepEqual(parseDelimited("a,b\n1,2"), [["a", "b"], ["1", "2"]]);
});

test("sarlavhalar: o'zbekcha, inglizcha, rus; turli yozilishlar", () => {
  const { cols, unknown } = mapHeaders(["T/r", "HEMIS ID", "F.I.SH", "Guruh", "Kurs", "Fakultet", "Yo‘nalish", "Kafedra", "Izoh"]);
  assert.deepEqual(Object.keys(cols).sort(), ["course", "faculty", "full_name", "group_name", "hemis_id", "kafedra", "specialty"]);
  assert.deepEqual(unknown, ["T/r", "Izoh"]);
  assert.ok("hemis_id" in mapHeaders(["student_id_number"]).cols);
  assert.ok("full_name" in mapHeaders(["ФИО"]).cols && "group_name" in mapHeaders(["Группа"]).cols);
});

test("to'g'ri import: ; ajratuvchi, kurs matni, F.I.SH ustunlardan yig'iladi", () => {
  const r = parseStudentsText("HEMIS ID;Familiya;Ism;Otasining ismi;Guruh;Kurs\n312211100543;Aliyev;Vali;Karim o'g'li;E-31;3-kurs\n312211100544;Karimova;Dilnoza;Bahrom qizi;E-32;2");
  assert.deepEqual(r.errors, []);
  assert.equal(r.students.length, 2);
  assert.equal(r.students[0].full_name, "Aliyev Vali Karim o'g'li");
  assert.equal(r.students[0].course, 3);
  assert.equal(r.students[1].group_name, "E-32");
});

test("Excel'dan nusxa (tab) ham o'qiladi", () => {
  const r = parseStudentsText("HEMIS ID\tF.I.SH\tGuruh\tKurs\n999221110001\tKarimov Sardor\tE-31\t3");
  assert.equal(r.students.length, 1);
  assert.equal(r.students[0].hemis_id, "999221110001");
});

test("xatolar: qator raqami bilan, xato qatorlar o'tkazib yuboriladi", () => {
  const r = parseStudentsText("hemis id,fish,kurs\n12,A,1\n999221110002,,1\n999221110003,B,9\n999221110004,C,1\n999221110004,D,1\n3.12211E+11,E,1");
  assert.equal(r.students.length, 1);
  assert.equal(r.students[0].hemis_id, "999221110004");
  assert.equal(r.errors.length, 5);
  assert.match(r.errors[0], /^2-qator.*HEMIS ID/);
  assert.match(r.errors[1], /^3-qator.*F\.I\.SH/);
  assert.match(r.errors[2], /^4-qator.*kurs/);
  assert.match(r.errors[3], /^6-qator.*takrorlangan/);
  assert.match(r.errors[4], /^7-qator.*Excel/);
});

test("kerakli ustun bo'lmasa: aniq xabar (hech narsa import qilinmaydi)", () => {
  assert.deepEqual(rowsToStudents(parseDelimited("Guruh;Kurs\nE-31;3")).missing, ["hemis_id", "full_name"]);
  assert.deepEqual(parseStudentsText("").missing, ["hemis_id", "full_name"]);
  assert.deepEqual(rowsToStudents(parseDelimited("HEMIS ID;Guruh\n999221110001;E-31")).missing, ["full_name"]);
});

test("kurs: bo'sh bo'lsa null; 7 yoki matn bo'lsa xato", () => {
  assert.equal(parseStudentsText("hemis id;fish;kurs\n999221110001;A;").students[0].course, null);
  assert.equal(parseStudentsText("hemis id;fish;kurs\n999221110001;A;7").errors.length, 1);
  assert.equal(parseStudentsText("hemis id;fish;kurs\n999221110001;A;uchinchi").errors.length, 1);
});
