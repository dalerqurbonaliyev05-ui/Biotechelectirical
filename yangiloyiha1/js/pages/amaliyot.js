// amaliyot_panel.html sahifasi mantig'i (alohida fayl: CSP inline skriptga ruxsat bermaydi).
import { sb, requireRole, initShell, esc, fmtDate, fmtDateTime, hm, todayISO, addDaysISO, statusBadge, toast, openModal, fetchAll, debounce, downloadFile, toCSV } from "../app.js";
import { mountStudents, mountPeriods, mountAnnouncements, mountTasks, loadStudents, groupsOf } from "../modules.js";

const { user, profile } = await requireRole(["practice_head", "admin"]);
const opt = (list, all) => `<option value="">${esc(all)}</option>` + list.map((g) => `<option value="${esc(g)}">${esc(g)}</option>`).join("");
const sections = {};

// ---------- Bosh sahifa ----------
sections.dashboard = async (el) => {
  const today = todayISO();
  const [students, att] = await Promise.all([loadStudents(), fetchAll(() => sb.from("attendance").select("*").eq("work_date", today))]);
  const active = students.filter((s) => s.active);
  const m = new Map(att.map((a) => [a.student_id, a]));
  const groups = groupsOf(active), noGroup = active.filter((s) => !s.group_name);
  const rowOf = (name, list) => { const came = list.filter((s) => ["faol", "yakunlangan"].includes(m.get(s.id)?.status)).length, abs = list.filter((s) => m.get(s.id)?.status === "kelmadi").length;
    return `<tr><td><b>${esc(name)}</b></td><td>${list.length}</td><td>${came}</td><td>${abs}</td><td>${list.length - came - abs}</td></tr>`; };
  const absent = active.filter((s) => m.get(s.id)?.status === "kelmadi");
  const unmarked = active.filter((s) => !m.get(s.id));
  const stat = (ico, n, label, bg) => `<div class="card stat"><div class="ico" style="background:${bg}">${ico}</div><div><b>${n}</b><span>${label}</span></div></div>`;
  el.innerHTML = `<h2>Bosh sahifa <span class="muted small">· ${fmtDate(today)}</span></h2>
    <div class="grid c4 mb">
      ${stat("👥", active.length, "Faol talabalar", "var(--accent-soft)")}
      ${stat("🔑", active.filter((s) => s.profile_id).length, "Faollashgan hisoblar", "var(--ok-soft)")}
      ${stat("⛔", absent.length, "Bugun kelmaganlar", "var(--bad-soft)")}
      ${stat("❔", unmarked.length, "Hali belgilanmagan", "var(--warn-soft)")}
    </div>
    ${active.length === 0 ? '<div class="alert info">Hali talaba yo\'q. «Talabalar» bo\'limidan HEMIS ro\'yxatini yuklang.</div>' : ""}
    <h3>Guruhlar bo'yicha bugungi davomat</h3>
    <div class="table-wrap mb"><table><thead><tr><th>Guruh</th><th>Jami</th><th>Keldi</th><th>Kelmadi</th><th>Belgilanmagan</th></tr></thead><tbody>
      ${groups.map((g) => rowOf(g, active.filter((s) => s.group_name === g))).join("")}${noGroup.length ? rowOf("Guruhsiz", noGroup) : ""}
      ${active.length ? "" : '<tr><td colspan="5"><div class="empty">Ma\'lumot yo\'q.</div></td></tr>'}</tbody></table></div>
    <h3>Bugun kelmaganlar</h3>
    ${absent.length ? absent.map((s) => `<div class="card att kelmadi mb"><b>${esc(s.full_name)}</b> <span class="muted small">${esc(s.group_name || "")}</span></div>`).join("") : '<div class="empty">Bugun kelmagan talaba belgilanmagan.</div>'}`;
};

// ---------- Davomat nazorati ----------
sections.monitor = async (el) => {
  const students = (await loadStudents()).filter((s) => s.active);
  const today = todayISO();
  el.innerHTML = `<h2>📅 Davomat nazorati</h2>
    <div class="card mb"><div class="row">
      <label class="field" style="margin:0"><span>Dan</span><input type="date" id="f" value="${addDaysISO(today, -6)}"></label>
      <label class="field" style="margin:0"><span>Gacha</span><input type="date" id="t" value="${today}"></label>
      <label class="field" style="margin:0"><span>Guruh</span><select id="g">${opt(groupsOf(students), "Barcha guruhlar")}</select></label>
      <label class="field grow" style="margin:0"><span>Qidirish</span><input type="search" id="q" placeholder="Ism bo'yicha"></label>
      <button class="btn secondary" id="csv" style="align-self:flex-end">CSV</button></div></div>
    <div id="out"></div>`;
  let att = [], table = [];
  const byStudent = () => { const m = new Map(); for (const a of att) { if (!m.has(a.student_id)) m.set(a.student_id, []); m.get(a.student_id).push(a); } return m; };
  const draw = () => {
    const g = el.querySelector("#g").value, q = el.querySelector("#q").value.trim().toLowerCase(), m = byStudent();
    table = students.filter((s) => (!g || s.group_name === g) && (!q || s.full_name.toLowerCase().includes(q))).map((s) => {
      const l = (m.get(s.id) || []).sort((a, b) => (a.work_date < b.work_date ? 1 : -1)), came = l.filter((a) => a.status !== "kelmadi").length, abs = l.filter((a) => a.status === "kelmadi").length;
      return { s, l, came, abs, last: l[0] }; });
    el.querySelector("#out").innerHTML = `<div class="table-wrap"><table><thead><tr><th>Talaba</th><th>Guruh</th><th>Kelgan</th><th>Kelmagan</th><th>So'nggi belgi</th><th></th></tr></thead><tbody>${table.map((r) => `<tr><td><b>${esc(r.s.full_name)}</b></td><td>${esc(r.s.group_name || "—")}</td><td>${r.came}</td><td>${r.abs ? `<span class="badge bad">${r.abs}</span>` : 0}</td>
      <td>${r.last ? `${fmtDate(r.last.work_date)} ${statusBadge(r.last.status)}` : '<span class="muted">belgi yo\'q</span>'}</td><td class="right"><button class="btn secondary sm" data-id="${esc(r.s.id)}">Kunlar</button></td></tr>`).join("") || '<tr><td colspan="6"><div class="empty">Talaba topilmadi.</div></td></tr>'}</tbody></table></div>`;
  };
  const run = async () => {
    const f = el.querySelector("#f").value, t = el.querySelector("#t").value; if (!f || !t || f > t) return toast("Sanalarni to'g'ri kiriting", "err");
    att = await fetchAll(() => sb.from("attendance").select("*").gte("work_date", f).lte("work_date", t)); draw();
  };
  el.querySelector("#f").onchange = run; el.querySelector("#t").onchange = run; el.querySelector("#g").onchange = draw; el.querySelector("#q").addEventListener("input", debounce(draw, 150));
  el.querySelector("#out").addEventListener("click", (e) => {
    const id = e.target.dataset?.id; if (!id) return; const r = table.find((x) => x.s.id === id);
    openModal({ title: r.s.full_name, html: `<div class="table-wrap" style="max-height:60vh"><table><thead><tr><th>Sana</th><th>Holat</th><th>Vaqt</th><th>Brigada</th><th>Naryad</th></tr></thead><tbody>${r.l.map((a) => `<tr><td>${fmtDate(a.work_date)}</td><td>${statusBadge(a.status)}</td><td>${hm(a.time_in)}${a.time_out ? "–" + hm(a.time_out) : ""}</td><td>${esc(a.brigade_name || "—")}</td><td>${esc(a.task || "—")}</td></tr>`).join("") || '<tr><td colspan="5"><div class="empty">Bu davrda belgi yo\'q.</div></td></tr>'}</tbody></table></div>`, actions: [{ label: "Yopish", cls: "ok" }] });
  });
  el.querySelector("#csv").onclick = () => downloadFile(`davomat_${el.querySelector("#f").value}_${el.querySelector("#t").value}.csv`, toCSV([["Guruh", "F.I.SH", "HEMIS ID", "Kelgan", "Kelmagan"], ...table.map((r) => [r.s.group_name || "", r.s.full_name, r.s.hemis_id, r.came, r.abs])]));
  await run();
};

sections.tasks = (el) => mountTasks(el, { userId: user.id });
sections.announcements = (el) => mountAnnouncements(el, { userId: user.id });
sections.students = (el) => mountStudents(el, { canResetPassword: true });
sections.periods = (el) => mountPeriods(el);

// ---------- Talab va takliflar ----------
sections.feedback = async (el) => {
  const [students, fb] = await Promise.all([loadStudents(), sb.from("feedbacks").select("*").order("created_at", { ascending: false }).limit(100)]);
  if (fb.error) throw fb.error;
  const byId = new Map(students.map((s) => [s.id, s]));
  el.innerHTML = `<h2>💬 Talab va takliflar</h2>` + (fb.data.length ? fb.data.map((f) => { const s = byId.get(f.student_id); return `<div class="card mb"><div class="row between"><b>${esc(s?.full_name || "—")} <span class="muted small">${esc(s?.group_name || "")}</span></b><span class="muted small">${fmtDateTime(f.created_at)}</span></div><p style="margin:8px 0 0;white-space:pre-wrap">${esc(f.message)}</p></div>`; }).join("") : '<div class="empty">Talabalardan xabar yo\'q.</div>');
};

const isAdmin = profile.role === "admin";
initShell({
  title: "AMALIYOT RAHBARI", subtitle: "Kafedra", profile,
  menu: [
    { id: "dashboard", icon: "🏠", label: "Bosh sahifa" }, { id: "monitor", icon: "📅", label: "Davomat nazorati" },
    { id: "tasks", icon: "📝", label: "Topshiriqlar" }, { id: "announcements", icon: "📢", label: "E'lonlar" },
    { id: "students", icon: "👥", label: "Talabalar va import" }, { id: "periods", icon: "🗓", label: "Amaliyot davrlari" }, { id: "feedback", icon: "💬", label: "Talab va takliflar" },
    ...(isAdmin ? [{ sep: true }, { href: "admin_panel.html", icon: "⚙️", label: "Administrator paneli" }] : []),
  ],
  sections,
});
