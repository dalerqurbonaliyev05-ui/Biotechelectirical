// admin_panel.html sahifasi mantig'i (alohida fayl: CSP inline skriptga ruxsat bermaydi).
import { sb, requireRole, initShell, esc, fmtDate, fmtDateTime, toast, callFn, confirmModal, ROLE_LABEL, fetchAll } from "../app.js";
import { mountStudents, mountPeriods, mountAnnouncements, loadStudents, showSecret } from "../modules.js";

const { user, profile } = await requireRole(["admin"]);
const sections = {};

// ---------- Bosh sahifa ----------
sections.dashboard = async (el) => {
  const [students, prof, ap] = await Promise.all([loadStudents(), sb.from("profiles").select("role, active"), sb.from("approvals").select("state")]);
  if (prof.error) throw prof.error; if (ap.error) throw ap.error;
  const staff = prof.data.filter((p) => p.role !== "student");
  const stat = (ico, n, label, bg) => `<div class="card stat"><div class="ico" style="background:${bg}">${ico}</div><div><b>${n}</b><span>${label}</span></div></div>`;
  el.innerHTML = `<h2>Bosh sahifa</h2>
    <div class="grid c4 mb">
      ${stat("👥", students.filter((s) => s.active).length, "Faol talabalar", "var(--accent-soft)")}
      ${stat("🔑", students.filter((s) => s.profile_id).length, "Faollashgan talabalar", "var(--ok-soft)")}
      ${stat("🧑‍💼", staff.filter((p) => p.active).length, "Faol xodimlar", "var(--warn-soft)")}
      ${stat("✅", ap.data.filter((a) => a.state === "pending").length, "Tasdiq kutayotgan", "var(--bad-soft)")}
    </div>
    <div class="grid c2">
      <div class="card"><h3>Boshqa panellar</h3><div class="row"><a class="btn secondary" href="res_panel.html">RES rahbari paneli</a><a class="btn secondary" href="amaliyot_panel.html">Amaliyot rahbari paneli</a></div></div>
      <div class="card"><h3>Tizim holati</h3><p class="muted" style="margin:0">Kirish faqat HEMIS bazasida bor talabalar (faollashtirish kodi orqali) va siz yaratgan xodimlar uchun ochiq.</p></div>
    </div>`;
};

// ---------- Foydalanuvchilar (xodimlar) ----------
sections.users = async (el) => {
  const { data, error } = await sb.from("profiles").select("*").neq("role", "student").order("created_at");
  if (error) throw error;
  el.innerHTML = `<h2>🧑‍💼 Xodimlar</h2>
    <p class="muted">RES rahbari, amaliyot rahbari va administratorlar shu yerda yaratiladi. Talabalar HEMIS ro'yxatidan avtomatik qo'shiladi: ularni «Talabalar» bo'limidan boshqaring.</p>
    <div class="card mb"><h3>Yangi xodim</h3>
      <div class="grid c4">
        <label class="field"><span>F.I.SH</span><input type="text" id="un" maxlength="200"></label>
        <label class="field"><span>Login (lotin harflari)</span><input type="text" id="ul" placeholder="masalan: karimov" autocapitalize="none"></label>
        <label class="field"><span>Roli</span><select id="ur"><option value="res_head">RES rahbari</option><option value="practice_head">Amaliyot rahbari</option><option value="admin">Administrator</option></select></label>
      </div><button class="btn" id="uAdd">Yaratish</button></div>
    <div class="table-wrap"><table><thead><tr><th>F.I.SH</th><th>Login</th><th>Roli</th><th>Holat</th><th></th></tr></thead><tbody>
    ${data.map((p) => `<tr><td><b>${esc(p.full_name)}</b>${p.id === user.id ? ' <span class="badge info">Siz</span>' : ""}</td><td>${esc(p.login)}</td><td>${esc(ROLE_LABEL[p.role])}</td><td>${p.active ? '<span class="badge ok">Faol</span>' : '<span class="badge bad">Faolsiz</span>'}</td>
      <td class="right"><button class="btn secondary sm" data-reset="${esc(p.login)}">Parolni tiklash</button> ${p.id === user.id ? "" : `<button class="btn ${p.active ? "bad" : "ok"} sm" data-active="${esc(p.login)}" data-to="${p.active ? "0" : "1"}">${p.active ? "Faolsizlantirish" : "Faollashtirish"}</button>`}</td></tr>`).join("")}
    </tbody></table></div>`;
  el.querySelector("#uAdd").onclick = async (e) => {
    const full_name = el.querySelector("#un").value.trim(), login = el.querySelector("#ul").value.trim(), role = el.querySelector("#ur").value;
    if (!full_name || !login) return toast("F.I.SH va loginni kiriting", "err");
    e.target.disabled = true;
    try {
      const r = await callFn("manage-users", { action: "create_staff", login, full_name, role });
      showSecret("Xodim yaratildi", `${full_name} (${ROLE_LABEL[role]}): birinchi kirishda parolni almashtiradi`, [["Login", r.login], ["Vaqtinchalik parol", r.temp_password]]);
      ctx.navigate("users");
    } catch (err) { toast(err.message, "err"); e.target.disabled = false; }
  };
  el.querySelectorAll("[data-reset]").forEach((b) => (b.onclick = async () => {
    if (!(await confirmModal("Parolni tiklash", `${b.dataset.reset} uchun yangi vaqtinchalik parol yaratiladi. Eski parol va sessiyalar bekor qilinadi.`, "Tiklash", "warn"))) return;
    try { const r = await callFn("manage-users", { action: "reset_password", login: b.dataset.reset }); showSecret("Vaqtinchalik parol", "Foydalanuvchi birinchi kirishda uni almashtiradi", [["Login", r.login], ["Vaqtinchalik parol", r.temp_password]]); }
    catch (err) { toast(err.message, "err"); }
  }));
  el.querySelectorAll("[data-active]").forEach((b) => (b.onclick = async () => {
    const on = b.dataset.to === "1";
    if (!(await confirmModal(on ? "Faollashtirish" : "Faolsizlantirish", on ? `${b.dataset.active} yana tizimga kira oladi.` : `${b.dataset.active} tizimga kira olmaydi, sessiyalari bekor qilinadi.`, on ? "Faollashtirish" : "Faolsizlantirish", on ? "ok" : "bad"))) return;
    try { await callFn("manage-users", { action: "set_active", login: b.dataset.active, active: on }); toast("Bajarildi", "ok"); ctx.navigate("users"); }
    catch (err) { toast(err.message, "err"); }
  }));
};

sections.students = (el) => mountStudents(el, { canResetPassword: true });
sections.periods = (el) => mountPeriods(el);
sections.announcements = (el) => mountAnnouncements(el, { userId: user.id });

// ---------- Sozlamalar ----------
sections.settings = async (el) => {
  const { data, error } = await sb.from("settings").select("*").maybeSingle();
  if (error) throw error;
  const s = data || {};
  el.innerHTML = `<h2>⚙️ Sozlamalar</h2>
    <div class="card" style="max-width:640px"><p class="muted">Bu ma'lumotlar talabalar yuklab oladigan PDF hujjatlarida (kundalik, hisobot) ko'rinadi.</p>
      <label class="field"><span>Korxona nomi</span><input type="text" id="so" value="${esc(s.org_name || "")}" maxlength="200"></label>
      <label class="field"><span>Korxona rahbari (F.I.SH)</span><input type="text" id="sh" value="${esc(s.head_name || "")}" maxlength="120"></label>
      <label class="field"><span>Lavozimi</span><input type="text" id="sp" value="${esc(s.head_position || "")}" maxlength="120"></label>
      <p class="small muted">Pechat va imzo rasmlari <code>assets/pechat.svg</code> va <code>assets/imzo.svg</code> fayllarida (hozir namunaviy). Rasmiy pechat va imzo tayyor bo'lganda shu fayllarni almashtiring.</p>
      <button class="btn ok" id="sSave">Saqlash</button></div>`;
  el.querySelector("#sSave").onclick = async (e) => {
    const patch = { org_name: el.querySelector("#so").value.trim(), head_name: el.querySelector("#sh").value.trim(), head_position: el.querySelector("#sp").value.trim() };
    if (!patch.org_name || !patch.head_name || !patch.head_position) return toast("Hamma maydonni to'ldiring", "err");
    e.target.disabled = true;
    const { error: err } = await sb.from("settings").update(patch).eq("id", true);
    e.target.disabled = false; toast(err ? "Saqlab bo'lmadi: " + err.message : "Saqlandi", err ? "err" : "ok");
  };
};

var ctx = initShell({
  title: "ADMINISTRATOR", subtitle: "Amaliyot portali", profile,
  menu: [
    { id: "dashboard", icon: "🏠", label: "Bosh sahifa" }, { id: "users", icon: "🧑‍💼", label: "Xodimlar" },
    { id: "students", icon: "👥", label: "Talabalar va import" }, { id: "periods", icon: "🗓", label: "Amaliyot davrlari" },
    { id: "announcements", icon: "📢", label: "E'lonlar" }, { id: "settings", icon: "⚙️", label: "Sozlamalar" },
    { sep: true }, { href: "res_panel.html", icon: "📅", label: "RES rahbari paneli" }, { href: "amaliyot_panel.html", icon: "📋", label: "Amaliyot rahbari paneli" },
  ],
  sections,
});
