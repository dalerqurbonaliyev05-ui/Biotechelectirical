// Bir nechta panelda ishlatiladigan bo'limlar: talabalar (import, kodlar), davrlar, e'lonlar, topshiriqlar.
import {
  sb, esc, fmtDate, fmtDateTime, todayISO, toast, callFn, fetchAll, uniq, debounce, openModal, confirmModal,
  downloadFile, toCSV,
} from "./app.js";
import { parseStudentsText } from "./import.js";

export const loadStudents = () => fetchAll(() => sb.from("students").select("*").order("full_name", { ascending: true }));
export const groupsOf = (students) => uniq(students.map((s) => s.group_name));
const opt = (list, sel, all) => (all ? `<option value="">${esc(all)}</option>` : "") + list.map((g) => `<option value="${esc(g)}" ${g === sel ? "selected" : ""}>${esc(g)}</option>`).join("");

// Vaqtinchalik parol / kodni bir marta ko'rsatadigan oyna.
export function showSecret(title, intro, rows) {
  const html = `<p class="muted">${esc(intro)}</p>` + rows.map(([k, v]) => `<div class="row between mb"><span>${esc(k)}</span><code class="kod" data-copy>${esc(v)}</code></div>`).join("") +
    `<div class="alert info small">Bu ma'lumot faqat hozir ko'rinadi: yopilgandan keyin qayta ko'rib bo'lmaydi.</div>`;
  openModal({
    title, html,
    actions: [
      { label: "Nusxalash", onClick: async (close, btn) => { try { await navigator.clipboard.writeText(rows.map(([k, v]) => `${k}: ${v}`).join("\n")); btn.textContent = "Nusxalandi ✓"; } catch { toast("Nusxalab bo'lmadi: o'zingiz belgilab nusxalang", "err"); } } },
      { label: "Yopish", cls: "ok" },
    ],
  });
}

// ====================== TALABALAR ======================
export async function mountStudents(el, { canResetPassword = true } = {}) {
  let students = await loadStudents();
  let shown = 100;
  let parsed = null;

  el.innerHTML = `
    <h2>👥 Talabalar</h2>
    <div class="card mb">
      <h3>HEMIS ro'yxatini yuklash</h3>
      <p class="muted small">HEMIS'dan eksport qilingan jadvalni (CSV) tanlang yoki Excel'dan nusxalab pastga qo'ying. Ustunlar: <b>HEMIS ID</b>, <b>F.I.SH</b> (yoki Familiya/Ism/Sharif), Guruh, Kurs, Fakultet, Yo'nalish, Universitet, Kafedra. Yangi talabalar avtomatik qo'shiladi va ularga faollashtirish kodlari yaratiladi.</p>
      <div class="row mb"><input type="file" id="impFile" accept=".csv,.tsv,.txt,text/csv,text/plain" style="max-width:360px"></div>
      <textarea id="impText" placeholder="Yoki shu yerga jadvalni qo'ying (sarlavha qatori bilan)..." spellcheck="false"></textarea>
      <div class="row mt"><button class="btn secondary" id="impCheck">Tekshirish</button><button class="btn ok hidden" id="impGo">Import qilish va kodlar yaratish</button></div>
      <div id="impPreview" class="mt"></div>
      <div id="impResult"></div>
    </div>
    <div class="card">
      <div class="row mb">
        <input type="search" id="q" placeholder="🔍 Ism yoki HEMIS ID bo'yicha qidirish" style="max-width:320px">
        <select id="fg" style="max-width:170px"></select>
        <select id="fs" style="max-width:190px"><option value="">Barcha holatlar</option><option value="act">Faollashgan</option><option value="pend">Faollashmagan</option></select>
        <span class="muted small grow right" id="cnt"></span>
      </div>
      <div class="table-wrap"><table><thead><tr><th>HEMIS ID</th><th>F.I.SH</th><th>Guruh</th><th>Kurs</th><th>Holat</th><th></th></tr></thead><tbody id="tb"></tbody></table></div>
      <div class="center mt"><button class="btn secondary hidden" id="more">Ko'proq ko'rsatish</button></div>
    </div>`;

  const $ = (s) => el.querySelector(s);
  $("#fg").innerHTML = opt(groupsOf(students), "", "Barcha guruhlar");

  function filtered() {
    const q = $("#q").value.trim().toLowerCase(), g = $("#fg").value, st = $("#fs").value;
    return students.filter((s) =>
      (!q || s.full_name.toLowerCase().includes(q) || s.hemis_id.includes(q)) && (!g || s.group_name === g) &&
      (!st || (st === "act" ? !!s.profile_id : !s.profile_id)));
  }
  function render() {
    const list = filtered();
    $("#cnt").textContent = `${list.length} / ${students.length} ta · faollashgan: ${students.filter((s) => s.profile_id).length}`;
    $("#tb").innerHTML = list.length ? list.slice(0, shown).map((s) => `<tr>
      <td>${esc(s.hemis_id)}</td><td><b>${esc(s.full_name)}</b></td><td>${esc(s.group_name || "—")}</td><td>${esc(s.course ?? "—")}</td>
      <td>${!s.active ? '<span class="badge bad">Faol emas</span>' : s.profile_id ? '<span class="badge ok">Faollashgan</span>' : '<span class="badge warn">Faollashmagan</span>'}</td>
      <td class="right">${s.profile_id ? (canResetPassword ? `<button class="btn secondary sm" data-reset="${esc(s.hemis_id)}">Parolni tiklash</button>` : "") : `<button class="btn secondary sm" data-code="${esc(s.hemis_id)}">Yangi kod</button>`}</td></tr>`).join("")
      : '<tr><td colspan="6"><div class="empty">Talaba topilmadi. Yuqoridan HEMIS ro\'yxatini yuklang.</div></td></tr>';
    $("#more").classList.toggle("hidden", list.length <= shown);
  }
  render();
  const rerender = debounce(() => { shown = 100; render(); }, 150);
  $("#q").addEventListener("input", rerender); $("#fg").onchange = rerender; $("#fs").onchange = rerender;
  $("#more").onclick = () => { shown += 200; render(); };

  // ---- Qatordagi amallar ----
  $("#tb").addEventListener("click", async (e) => {
    const btn = e.target.closest("button"); if (!btn) return;
    if (btn.dataset.code) {
      const s = students.find((x) => x.hemis_id === btn.dataset.code);
      if (!(await confirmModal("Yangi kod", `${s.full_name} uchun yangi faollashtirish kodi yaratiladi. Eski kod ishlamay qoladi.`, "Yaratish", "ok"))) return;
      btn.disabled = true;
      try {
        const r = await callFn("import-students", { students: [rowOf(s)], reissue_hemis_ids: [s.hemis_id] });
        const c = r.codes[0];
        if (c) showSecret("Faollashtirish kodi", `${s.full_name} (${s.hemis_id})`, [["HEMIS ID", s.hemis_id], ["Kod", c.code]]);
      } catch (err) { toast(err.message, "err"); }
      btn.disabled = false;
    } else if (btn.dataset.reset) {
      const s = students.find((x) => x.hemis_id === btn.dataset.reset);
      if (!(await confirmModal("Parolni tiklash", `${s.full_name} uchun vaqtinchalik parol yaratiladi. Talaba birinchi kirishda uni almashtiradi.`, "Tiklash", "warn"))) return;
      btn.disabled = true;
      try {
        const r = await callFn("manage-users", { action: "reset_password", login: s.hemis_id });
        showSecret("Vaqtinchalik parol", `${s.full_name}: tizimga HEMIS ID va shu parol bilan kiradi`, [["Login (HEMIS ID)", r.login], ["Vaqtinchalik parol", r.temp_password]]);
      } catch (err) { toast(err.message, "err"); }
      btn.disabled = false;
    }
  });
  const rowOf = (s) => ({ hemis_id: s.hemis_id, full_name: s.full_name, group_name: s.group_name, course: s.course, faculty: s.faculty, specialty: s.specialty, university: s.university, kafedra: s.kafedra });

  // ---- Import ----
  async function check() {
    $("#impResult").innerHTML = ""; $("#impGo").classList.add("hidden"); parsed = null;
    const text = $("#impText").value.trim();
    if (!text) { $("#impPreview").innerHTML = '<div class="alert err">Avval fayl tanlang yoki jadvalni qo\'ying.</div>'; return; }
    const r = parseStudentsText(text);
    if (r.missing.length) {
      $("#impPreview").innerHTML = `<div class="alert err">Jadvalda kerakli ustun topilmadi: <b>${r.missing.map((m) => (m === "hemis_id" ? "HEMIS ID" : "F.I.SH")).join(", ")}</b>. Birinchi qator sarlavha bo'lishi kerak.</div>`;
      return;
    }
    parsed = r;
    const exist = new Set(students.map((s) => s.hemis_id));
    const fresh = r.students.filter((s) => !exist.has(s.hemis_id)).length;
    $("#impPreview").innerHTML = `
      <div class="alert ${r.errors.length ? "err" : "okk"}"><b>${r.students.length}</b> ta to'g'ri qator (yangi: <b>${fresh}</b>, yangilanadi: <b>${r.students.length - fresh}</b>)${r.errors.length ? `, <b>${r.errors.length}</b> ta xato:` : "."}
        ${r.errors.length ? `<ul class="small" style="margin:6px 0 0 18px">${r.errors.slice(0, 15).map((x) => `<li>${esc(x)}</li>`).join("")}${r.errors.length > 15 ? `<li>... yana ${r.errors.length - 15} ta</li>` : ""}</ul><div class="small mt">Xato qatorlar o'tkazib yuboriladi.</div>` : ""}</div>
      ${r.unknownHeaders.length ? `<div class="small muted mb">Tanilmagan ustunlar e'tiborsiz qoldirildi: ${esc(r.unknownHeaders.join(", "))}</div>` : ""}
      ${r.students.length ? `<div class="table-wrap"><table><thead><tr><th>HEMIS ID</th><th>F.I.SH</th><th>Guruh</th><th>Kurs</th></tr></thead><tbody>${r.students.slice(0, 5).map((s) => `<tr><td>${esc(s.hemis_id)}</td><td>${esc(s.full_name)}</td><td>${esc(s.group_name || "—")}</td><td>${esc(s.course ?? "—")}</td></tr>`).join("")}</tbody></table></div><div class="small muted">Birinchi 5 ta qator ko'rsatilmoqda.</div>` : ""}`;
    if (r.students.length) $("#impGo").classList.remove("hidden");
  }
  $("#impCheck").onclick = check;
  $("#impFile").addEventListener("change", async (e) => {
    const f = e.target.files[0]; if (!f) return;
    if (/\.xlsx?$/i.test(f.name)) { toast("Excel faylni «CSV» qilib saqlang yoki jadvalni nusxalab qo'ying", "err"); e.target.value = ""; return; }
    $("#impText").value = await f.text(); check();
  });

  $("#impGo").onclick = async (e) => {
    if (!parsed?.students.length) return;
    e.target.disabled = true; e.target.textContent = "Yuklanmoqda...";
    try {
      const codes = []; const sum = { created: 0, updated: 0, already_activated: 0, kept_existing: 0 };
      for (let i = 0; i < parsed.students.length; i += 1000) {
        const r = await callFn("import-students", { students: parsed.students.slice(i, i + 1000) });
        codes.push(...r.codes); for (const k of Object.keys(sum)) sum[k] += r[k];
      }
      students = await loadStudents(); $("#fg").innerHTML = opt(groupsOf(students), "", "Barcha guruhlar"); render();
      $("#impPreview").innerHTML = ""; $("#impGo").classList.add("hidden");
      showImportResult(codes, sum);
    } catch (err) {
      const d = err.data?.details;
      $("#impResult").innerHTML = `<div class="alert err">${esc(err.message)}${d ? `<ul class="small" style="margin:6px 0 0 18px">${d.slice(0, 10).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}</div>`;
    }
    e.target.disabled = false; e.target.textContent = "Import qilish va kodlar yaratish";
  };

  function showImportResult(codes, sum) {
    const rows = codes.map((c) => [c.group_name || "", c.full_name, c.hemis_id, c.code]);
    $("#impResult").innerHTML = `<div class="alert okk"><b>Tayyor.</b> Yangi talabalar: ${sum.created}, yangilangan: ${sum.updated}, allaqachon faollashgan: ${sum.already_activated}, eski kodi saqlangan: ${sum.kept_existing}.</div>
      ${rows.length ? `<div class="alert info"><b>${rows.length}</b> ta yangi faollashtirish kodi yaratildi. Kodlar <b>faqat hozir</b> ko'rinadi: albatta yuklab oling yoki chop eting. Talabaga HEMIS ID va kod beriladi.</div>
      <div class="row mb"><button class="btn" id="dlCodes">CSV yuklab olish</button><button class="btn secondary" id="prCodes">🖨 Chop etish</button></div>
      <div class="table-wrap"><table><thead><tr><th>Guruh</th><th>F.I.SH</th><th>HEMIS ID</th><th>Kod</th></tr></thead><tbody>${rows.slice(0, 50).map((r) => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td><td><code class="kod">${esc(r[3])}</code></td></tr>`).join("")}</tbody></table></div>${rows.length > 50 ? `<div class="small muted">Birinchi 50 tasi ko'rsatilmoqda: to'liq ro'yxat CSV'da.</div>` : ""}` : ""}`;
    const dl = $("#dlCodes"), pr = $("#prCodes");
    if (dl) dl.onclick = () => downloadFile(`faollashtirish_kodlari_${todayISO()}.csv`, toCSV([["Guruh", "F.I.SH", "HEMIS ID", "Kod"], ...rows]));
    if (pr) pr.onclick = () => printCodes(rows);
  }
}

function printCodes(rows) {
  const w = window.open("", "_blank");
  if (!w) return toast("Chop etish oynasi bloklandi: brauzerda oynalarga ruxsat bering", "err");
  const sorted = [...rows].sort((a, b) => (a[0] + a[1]).localeCompare(b[0] + b[1], "uz"));
  w.document.write(`<!DOCTYPE html><html lang="uz"><head><meta charset="utf-8"><title>Faollashtirish kodlari</title><style>
    body{font-family:Arial,sans-serif;padding:20px}h1{font-size:18px}table{border-collapse:collapse;width:100%}
    td,th{border:1px solid #999;padding:6px 8px;font-size:13px;text-align:left}code{font-size:15px;font-weight:700;letter-spacing:.08em}
    tr{page-break-inside:avoid}</style></head><body><h1>Faollashtirish kodlari: ${esc(fmtDate(todayISO()))}</h1>
    <p>Kirish: login sahifasi → «Talaba: faollashtirish». HEMIS ID va kodni kiriting, o'zingizga parol o'ylab toping. Kod bir marta ishlatiladi.</p>
    <table><thead><tr><th>Guruh</th><th>F.I.SH</th><th>HEMIS ID</th><th>Kod</th></tr></thead><tbody>
    ${sorted.map((r) => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td><td><code>${esc(r[3])}</code></td></tr>`).join("")}
    </tbody></table></body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300); // inline skript CSP tomonidan bloklanadi: chop etishni shu oynadan boshlaymiz
}

// ====================== AMALIYOT DAVRLARI ======================
export async function mountPeriods(el) {
  const { data, error } = await sb.from("practice_periods").select("*").order("starts_on", { ascending: false });
  if (error) throw error;
  el.innerHTML = `<h2>🗓 Amaliyot davrlari</h2>
    <div class="card mb"><h3>Yangi davr</h3>
      <div class="grid c4">
        <label class="field"><span>Kurs</span><select id="pc">${[1, 2, 3, 4, 5, 6].map((n) => `<option value="${n}" ${n === 3 ? "selected" : ""}>${n}-kurs</option>`).join("")}</select></label>
        <label class="field"><span>Nomi</span><input type="text" id="pt" placeholder="Texnologik amaliyot"></label>
        <label class="field"><span>Boshlanishi</span><input type="date" id="ps"></label>
        <label class="field"><span>Tugashi</span><input type="date" id="pe"></label>
      </div><button class="btn" id="pAdd">Qo'shish</button></div>
    <div class="table-wrap"><table><thead><tr><th>Kurs</th><th>Nomi</th><th>Davr</th><th></th></tr></thead><tbody>
    ${data.length ? data.map((p) => `<tr><td>${p.course}-kurs</td><td><b>${esc(p.title)}</b></td><td>${fmtDate(p.starts_on)} — ${fmtDate(p.ends_on)}</td><td class="right"><button class="btn bad sm" data-del="${esc(p.id)}">O'chirish</button></td></tr>`).join("") : '<tr><td colspan="4"><div class="empty">Davr belgilanmagan.</div></td></tr>'}
    </tbody></table></div>`;
  el.querySelector("#pAdd").onclick = async (e) => {
    const row = { course: Number(el.querySelector("#pc").value), title: el.querySelector("#pt").value.trim(), starts_on: el.querySelector("#ps").value, ends_on: el.querySelector("#pe").value };
    if (!row.title || !row.starts_on || !row.ends_on) return toast("Nomi va sanalarni kiriting", "err");
    if (row.ends_on < row.starts_on) return toast("Tugash sanasi boshlanishdan oldin bo'lmasligi kerak", "err");
    e.target.disabled = true;
    const { error: err } = await sb.from("practice_periods").insert(row);
    if (err) { e.target.disabled = false; return toast("Saqlab bo'lmadi: " + err.message, "err"); }
    toast("Davr qo'shildi", "ok"); await mountPeriods(el);
  };
  el.querySelectorAll("[data-del]").forEach((b) => (b.onclick = async () => {
    if (!(await confirmModal("Davrni o'chirish", "Davr o'chiriladi. Bu davrga bog'langan tasdiqlar davrsiz qoladi.", "O'chirish"))) return;
    const { error: err } = await sb.from("practice_periods").delete().eq("id", b.dataset.del);
    if (err) return toast("O'chirib bo'lmadi: " + err.message, "err");
    toast("O'chirildi", "ok"); await mountPeriods(el);
  }));
}

// ====================== E'LONLAR ======================
export async function mountAnnouncements(el, { userId }) {
  const { data, error } = await sb.from("announcements").select("*").order("created_at", { ascending: false }).limit(100);
  if (error) throw error;
  el.innerHTML = `<h2>📢 E'lonlar</h2>
    <div class="card mb"><h3>Yangi e'lon</h3>
      <p class="muted small">Masalan: amaliyotga borish vaqti o'zgarganligi haqida. Talabalar ko'radi.</p>
      <label class="field"><span>Sarlavha</span><input type="text" id="at" maxlength="150"></label>
      <label class="field"><span>Matn</span><textarea id="ab" maxlength="3000"></textarea></label>
      <label class="field" style="max-width:260px"><span>Kim uchun</span><select id="ac"><option value="">Barcha talabalarga</option>${[1, 2, 3, 4, 5, 6].map((n) => `<option value="${n}">Faqat ${n}-kurs</option>`).join("")}</select></label>
      <button class="btn" id="aAdd">E'lon qilish</button></div>
    ${data.length ? data.map((a) => `<div class="card mb"><div class="row between"><b>${esc(a.title)}</b><span class="muted small">${fmtDateTime(a.created_at)} · ${a.target_course ? a.target_course + "-kurs" : "hammaga"}</span></div>
      ${a.body ? `<p style="white-space:pre-wrap;margin:8px 0">${esc(a.body)}</p>` : ""}<button class="btn bad sm" data-del="${esc(a.id)}">O'chirish</button></div>`).join("") : '<div class="empty">E\'lonlar yo\'q.</div>'}`;
  el.querySelector("#aAdd").onclick = async (e) => {
    const title = el.querySelector("#at").value.trim(); if (!title) return toast("Sarlavhani kiriting", "err");
    const tc = el.querySelector("#ac").value;
    e.target.disabled = true;
    const { error: err } = await sb.from("announcements").insert({ title, body: el.querySelector("#ab").value.trim() || null, target_course: tc ? Number(tc) : null, created_by: userId });
    if (err) { e.target.disabled = false; return toast("Saqlab bo'lmadi: " + err.message, "err"); }
    toast("E'lon qilindi", "ok"); await mountAnnouncements(el, { userId });
  };
  el.querySelectorAll("[data-del]").forEach((b) => (b.onclick = async () => {
    if (!(await confirmModal("E'lonni o'chirish", "E'lon talabalarga ko'rinmay qoladi.", "O'chirish"))) return;
    const { error: err } = await sb.from("announcements").delete().eq("id", b.dataset.del);
    if (err) return toast("O'chirib bo'lmadi: " + err.message, "err");
    await mountAnnouncements(el, { userId });
  }));
}

// ====================== TOPSHIRIQLAR ======================
export async function mountTasks(el, { userId }) {
  const [students, t] = await Promise.all([loadStudents(), sb.from("tasks").select("*").order("created_at", { ascending: false }).limit(100)]);
  if (t.error) throw t.error;
  const byId = new Map(students.map((s) => [s.id, s]));
  el.innerHTML = `<h2>📝 Topshiriqlar</h2>
    <div class="card mb"><h3>Yangi topshiriq</h3>
      <div class="grid c2">
        <label class="field"><span>Kimga</span><select id="tk"><option value="group">Butun guruhga</option><option value="student">Bitta talabaga</option></select></label>
        <label class="field" id="tgBox"><span>Guruh</span><select id="tg">${opt(groupsOf(students), "")}</select></label>
        <label class="field hidden" id="tsBox"><span>Talaba</span><select id="ts">${students.map((s) => `<option value="${esc(s.id)}">${esc(s.full_name)} (${esc(s.group_name || "—")})</option>`).join("")}</select></label>
        <label class="field"><span>Muddat (ixtiyoriy)</span><input type="date" id="td"></label>
      </div>
      <label class="field"><span>Sarlavha</span><input type="text" id="tt" maxlength="150"></label>
      <label class="field"><span>Tavsif</span><textarea id="tb"></textarea></label>
      <button class="btn" id="tAdd">Topshiriq berish</button></div>
    ${t.data.length ? t.data.map((x) => { const s = x.student_id ? byId.get(x.student_id) : null; return `<div class="card mb"><div class="row between"><b>${esc(x.title)}</b><span class="badge info">${s ? esc(s.full_name) : "Guruh: " + esc(x.group_name)}</span></div>
      ${x.body ? `<p style="white-space:pre-wrap;margin:8px 0">${esc(x.body)}</p>` : ""}<div class="muted small mb">Berilgan: ${fmtDate(x.created_at)}${x.due_on ? ` · muddat: ${fmtDate(x.due_on)}` : ""}</div><button class="btn bad sm" data-del="${esc(x.id)}">O'chirish</button></div>`; }).join("") : '<div class="empty">Topshiriq yo\'q.</div>'}`;
  const sync = () => { const st = el.querySelector("#tk").value === "student"; el.querySelector("#tgBox").classList.toggle("hidden", st); el.querySelector("#tsBox").classList.toggle("hidden", !st); };
  el.querySelector("#tk").onchange = sync;
  el.querySelector("#tAdd").onclick = async (e) => {
    const title = el.querySelector("#tt").value.trim(); if (!title) return toast("Sarlavhani kiriting", "err");
    const toStudent = el.querySelector("#tk").value === "student";
    const row = { title, body: el.querySelector("#tb").value.trim() || null, due_on: el.querySelector("#td").value || null, created_by: userId,
      student_id: toStudent ? el.querySelector("#ts").value : null, group_name: toStudent ? null : el.querySelector("#tg").value };
    if (!toStudent && !row.group_name) return toast("Guruhni tanlang (avval talabalar ro'yxatini yuklang)", "err");
    e.target.disabled = true;
    const { error: err } = await sb.from("tasks").insert(row);
    if (err) { e.target.disabled = false; return toast("Saqlab bo'lmadi: " + err.message, "err"); }
    toast("Topshiriq berildi", "ok"); await mountTasks(el, { userId });
  };
  el.querySelectorAll("[data-del]").forEach((b) => (b.onclick = async () => {
    if (!(await confirmModal("Topshiriqni o'chirish", "Topshiriq talabalarga ko'rinmay qoladi.", "O'chirish"))) return;
    const { error: err } = await sb.from("tasks").delete().eq("id", b.dataset.del);
    if (err) return toast("O'chirib bo'lmadi: " + err.message, "err");
    await mountTasks(el, { userId });
  }));
}
