// CSV yozish (Excel uchun: BOM + nuqta-vergul).
export function toCSV(rows) {
  // Excel formulasi sifatida bajarilmasin: =, +, -, @ bilan boshlansa oldiga ' qo'yiladi
  const q = (v) => { let s = String(v ?? ""); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return "\ufeff" + rows.map((r) => r.map(q).join(";")).join("\r\n");
}
