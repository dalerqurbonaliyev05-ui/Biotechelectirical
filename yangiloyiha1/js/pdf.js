// Kundalik va hisobot PDF'lari (jsPDF + autoTable, ./vendor/ dan).
// Pechat va imzo FAQAT tasdiqlangan (approval.valid) hujjatga qo'yiladi.
import { fmtDate, hm } from "./app.js";

// Standart PDF shriftlari faqat lotin harflarni biladi: maxsus tirnoqlarni oddiy ' ga almashtiramiz.
export function pdfSafe(s) {
  return String(s ?? "")
    .replace(/[ʻʼ‘’`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/[^\u0000-ÿ]/g, "?");
}

const imgCache = new Map();
// SVG yoki rasmni PNG (data URL) ga aylantiradi (jsPDF PNG/JPEG qabul qiladi).
export function rasterize(url, width, height) {
  const key = `${url}|${width}x${height}`;
  if (imgCache.has(key)) return imgCache.get(key);
  const p = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = width; c.height = height;
      c.getContext("2d").drawImage(img, 0, 0, width, height);
      resolve(c.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error(`Rasm yuklanmadi: ${url}`));
    img.src = url;
  });
  imgCache.set(key, p);
  return p;
}

function newDoc() {
  const { jsPDF } = window.jspdf;
  return new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
}

function header(doc, title, c) {
  doc.setFont("helvetica", "bold"); doc.setFontSize(16);
  doc.text(pdfSafe(title), 105, 20, { align: "center" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(10.5);
  const lines = [
    `Oliy ta'lim muassasasi: ${c.me.university || "-"}`,
    `Fakultet: ${c.me.faculty || "-"} | Kafedra: ${c.me.kafedra || "-"}`,
    `Talaba: ${c.me.full_name} (${c.me.course ?? "-"}-kurs, guruh ${c.me.group_name || "-"}, HEMIS ID ${c.me.hemis_id})`,
    `Amaliyot joyi: ${c.org.org_name}`,
    c.period ? `Amaliyot davri: ${c.period.title} (${fmtDate(c.period.starts_on)} - ${fmtDate(c.period.ends_on)})` : null,
  ].filter(Boolean);
  let y = 30;
  for (const l of lines) { doc.text(doc.splitTextToSize(pdfSafe(l), 180), 15, y); y += 6; }
  return y + 2;
}

// Imzo bloki: tasdiqlangan bo'lsa pechat + imzo, aks holda ogohlantirish.
function signatureBlock(doc, y, c) {
  if (y > 235) { doc.addPage(); y = 25; }
  doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text(pdfSafe(`${c.org.head_position}: ${c.org.head_name}`), 15, y + 8);
  doc.setFont("helvetica", "normal");
  if (c.approval && c.approval.valid && c.seal && c.sign) {
    doc.addImage(c.seal, "PNG", 95, y - 12, 42, 42);
    doc.addImage(c.sign, "PNG", 62, y - 2, 36, 15);
    doc.setFontSize(9);
    doc.text(pdfSafe(`Tasdiqlangan: ${fmtDate(c.approval.decided_at)}. Tasdiq kodi: ${c.approval.code}`), 15, y + 36);
  } else {
    doc.text("_________________________", 70, y + 8);
    doc.setFontSize(9); doc.setTextColor(180, 40, 40);
    doc.text("Tasdiqlanmagan loyiha: pechat va imzo RES rahbari tasdiqlagandan keyin qo'yiladi.", 15, y + 20);
    doc.setTextColor(0, 0, 0);
  }
}

// c: { me, org, period, rows (sanasi bo'yicha o'sish tartibida, 'kelmadi' siz), approval:{valid,decided_at,code}|null, seal, sign }
export function buildKundalikPdf(c) {
  const doc = newDoc();
  const startY = header(doc, "AMALIYOT KUNDALIGI", c);
  const body = c.rows.map((r, i) => [
    String(i + 1), fmtDate(r.work_date), [hm(r.time_in), hm(r.time_out)].filter(Boolean).join(" - ") || "-",
    pdfSafe(r.brigade_name || "-"), pdfSafe(r.leader || "-"), pdfSafe(r.task || "-"),
  ]);
  doc.autoTable({
    startY, head: [["No", "Sana", "Vaqt", "Brigada", "Usta (rahbar)", "Bajarilgan ish mazmuni"]], body,
    theme: "grid", styles: { fontSize: 9, cellPadding: 2, valign: "middle" },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, halign: "center" },
    columnStyles: { 0: { cellWidth: 9, halign: "center" }, 1: { cellWidth: 24, halign: "center" }, 2: { cellWidth: 26, halign: "center" }, 3: { cellWidth: 32 }, 4: { cellWidth: 32 } },
  });
  doc.setFontSize(10);
  doc.text(`Jami ish kunlari: ${c.rows.length}`, 15, doc.lastAutoTable.finalY + 8);
  signatureBlock(doc, doc.lastAutoTable.finalY + 20, c);
  return doc;
}

// c.photos: Map(work_date -> [JPEG data URL, ...])
export function buildHisobotPdf(c) {
  const doc = newDoc();
  let y = header(doc, "AMALIYOT HISOBOTI", c) + 4;
  const IMG_W = 85, IMG_H = 60;
  for (const r of c.rows) {
    if (y > 255) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    doc.text(pdfSafe(`Sana: ${fmtDate(r.work_date)} (${[hm(r.time_in), hm(r.time_out)].filter(Boolean).join(" - ") || "-"})`), 15, y); y += 6;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    doc.text(pdfSafe(`Brigada: ${r.brigade_name || "-"} | Usta: ${r.leader || "-"}`), 15, y); y += 6;
    const task = doc.splitTextToSize(pdfSafe(`Naryad: ${r.task || "-"}`), 180);
    doc.text(task, 15, y); y += task.length * 5 + 3;

    const imgs = c.photos?.get(r.work_date) || [];
    if (imgs.length) {
      let x = 15;
      for (const im of imgs) {
        if (x + IMG_W > 200) { x = 15; y += IMG_H + 4; }
        if (y + IMG_H > 280) { doc.addPage(); y = 20; x = 15; }
        doc.addImage(im, "JPEG", x, y, IMG_W, IMG_H);
        x += IMG_W + 5;
      }
      y += IMG_H + 8;
    } else {
      doc.setFont("helvetica", "italic"); doc.text("(Bu kun uchun rasmlar biriktirilmagan)", 15, y); y += 8;
    }
    doc.setDrawColor(210); doc.line(15, y, 195, y); y += 8;
  }
  signatureBlock(doc, y + 4, c);
  return doc;
}
