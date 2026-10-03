// res_panel.html sahifasi mantig'i (alohida fayl: CSP inline skriptga ruxsat bermaydi).
import {
  sb, requireRole, initShell, esc, fmtDate, fmtDateTime, hm, todayISO, nowHM, statusBadge, toast, openModal, confirmModal,
  fetchAll, uniq, debounce, computeApprovalHash, approvalCode, addDaysISO, downloadFile, toCSV,
} from "../app.js";
import { mountAnnouncements, loadStudents, groupsOf } from "../modules.js";

const { user, profile } = await requireRole(["res_head", "admin"]);
const opt = (list, all) => `<option value="">${esc(all)}</option>` + list.map((g) => `<option value="${esc(g)}">${esc(g)}</option>`).join("");
const sections = {};
let dirtyGuard = () => false;
window.addEventListener("beforeunload", (e) => { if (dirtyGuard()) { e.preventDefault(); e.returnValue = ""; } });

const dayAttendance = async (date) => fetchAll(() => sb.from("attendance").select("*").eq("work_date", date));

// ---------- Bosh sahifa ----------
sections.dashboard = async (el) => {
  const today = todayISO();
  const [students, att] = await Promise.all([loadStudents(), dayAttendance(today)]);
  const active = students.filter((s) => s.active);
  const byId = new Map(students.map((s) => [s.id, s]));
  const came = att.filter((a) => a.status === "faol" || a.status === "yakunlangan");
  const absent = att.filter((a) => a.status === "kelmadi").length;
  const working = att.filter((a) => a.status === "faol").length;
  const stat = (ico, n, label, bg) => `<div class="card stat"><div class="ico" style="background:${bg}">${ico}</div><div><b>${n}</b><span>${label}</span></div></div>`;
  el.innerHTML = `<h2>Bosh sahifa <span class="muted small">· ${fmtDate(today)}</span></h2>
    <div class="grid c4 mb">
      ${stat("👥", active.length, "Amaliyotdagi talabalar", "var(--accent-soft)")}
      ${stat("✅", came.length, "Bugun kelganlar", "var(--ok-soft)")}
      ${stat("⛔", absent, "Kelmaganlar", "var(--bad-soft)")}
      ${stat("⏳", working, "Hozir ishda", "var(--warn-soft)")}
    </div>
    <div class="card mb row between"><div><h3 style="margin:0">Tezkor amallar</h3><p class="muted" style="margin:4px 0 0">Bugungi davomat va naryadlarni belgilash uchun «Davomat va naryad» bo'limiga o'ting. Belgilanmagan: <b>${Math.max(0, active.length - att.length)}</b> ta.</p></div>
      <button class="btn" id="go">Davomatni belgilash →</button></div>
    <h3>Bugun kelgan talabalar</h3>` +
    (came.length ? came.map((a) => { const s = byId.get(a.student_id); return `<div class="card att ${esc(a.status)} mb"><div class="row between"><div><b>${esc(s?.full_name || "—")}</b> <span class="muted small">${esc(s?.group_name || "")}</span><div class="small muted">${esc(a.brigade_name || "Brigada belgilanmagan")}</div></div><div class="right">${statusBadge(a.status)}<div class="small muted">Keldi: <b>${hm(a.time_in) || "—"}</b></div></div></div></div>`; }).join("") : '<div class="empty">Bugun hozircha hech kim belgilanmagan.</div>');
  el.querySelector("#go").onclick = () => ctx.navigate("attendance");
};

// ---------- Davomat va naryad ----------
sections.attendance = async (el) => {
  const [students, brigadesQ] = await Promise.all([loadStudents(), sb.from("brigades").select("*").eq("active", true).order("name")]);
  if (brigadesQ.error) throw brigadesQ.error;
  const brigades = brigadesQ.data;
  const active = students.filter((s) => s.active);
  let date = todayISO(), rows = [], saving = false;
  el.innerHTML = `
    <div class="row between mb"><h2 style="margin:0">Davomat va naryad</h2></div>
    <div class="card mb"><div class="row">
      <label class="field" style="margin:0"><span>Sana</span><input type="date" id="d" value="${date}"></label>
      <label class="field" style="margin:0"><span>Guruh</span><select id="g">${opt(groupsOf(active), "Barcha guruhlar")}</select></label>
      <label class="field grow" style="margin:0"><span>Qidirish</span><input type="search" id="q" placeholder="Ism bo'yicha"></label>
    </div></div>
    <datalist id="brgList">${brigades.map((b) => `<option value="${esc(b.name)}">${esc(b.leader_name || "")}</option>`).join("")}</datalist>
    <details class="card mb"><summary style="cursor:pointer;font-weight:600">Tanlanganlarga bir xil brigada va naryad berish</summary>
      <div class="grid c2 mt"><label class="field"><span>Brigada</span><input type="text" id="bb" list="brgList"></label><label class="field"><span>Brigada rahbari (usta)</span><input type="text" id="bl"></label></div>
      <label class="field"><span>Naryad (bajariladigan ish)</span><textarea id="bt"></textarea></label>
      <label class="row small" style="gap:6px"><input type="checkbox" id="bk" checked> Ularni «Keldi» deb ham belgilash</label>
      <button class="btn mt" id="bApply">Tanlanganlarga qo'llash</button></details>
    <div class="table-wrap"><table id="tbl"><thead><tr><th style="width:34px"><input type="checkbox" id="all" aria-label="Hammasini tanlash"></th><th>Talaba</th><th style="width:19%">Brigada va usta</th><th style="width:21%">Naryad</th><th style="width:150px">Vaqt</th><th>Holat</th></tr></thead><tbody></tbody></table></div>
    <div class="row between mt"><span class="muted small" id="info"></span><button class="btn ok" id="save">💾 Saqlash</button></div>`;
  const $ = (s) => el.querySelector(s);

  async function loadDay() {
    const att = await dayAttendance(date);
    const m = new Map(att.map((a) => [a.student_id, a]));
    rows = active.map((s) => { const a = m.get(s.id); return { s, status: a?.status ?? null, time_in: hm(a?.time_in), time_out: hm(a?.time_out), brigade: a?.brigade_name || "", leader: a?.leader || "", task: a?.task || "", dirty: false, sel: false }; });
    render();
  }
  const visible = () => { const g = $("#g").value, q = $("#q").value.trim().toLowerCase(); return rows.map((r, i) => [r, i]).filter(([r]) => (!g || r.s.group_name === g) && (!q || r.s.full_name.toLowerCase().includes(q))); };
  function render() {
    const list = visible();
    $("#tbl tbody").innerHTML = list.length ? list.map(([r, i]) => { const off = r.status === "kelmadi" ? "disabled" : ""; return `<tr data-i="${i}">
      <td><input type="checkbox" class="sel" ${r.sel ? "checked" : ""}></td>
      <td><b>${esc(r.s.full_name)}</b><div class="small muted">${esc(r.s.group_name || "")} · ${esc(r.s.hemis_id)}</div></td>
      <td><input type="text" class="f-brigade" list="brgList" placeholder="Brigada" value="${esc(r.brigade)}" ${off} style="margin-bottom:5px"><input type="text" class="f-leader" placeholder="Usta" value="${esc(r.leader)}" ${off}></td>
      <td><textarea class="f-task" placeholder="Naryad" ${off}>${esc(r.task)}</textarea></td>
      <td><div class="row" style="gap:6px"><input type="time" class="f-in" value="${esc(r.time_in)}" ${off} title="Kelgan vaqti"><input type="time" class="f-out" value="${esc(r.time_out)}" ${off} title="Ketgan vaqti"></div></td>
      <td><div class="seg"><button data-act="faol" class="${r.status === "faol" ? "on faol" : ""}">Keldi</button><button data-act="yakunlangan" class="${r.status === "yakunlangan" ? "on yakunlangan" : ""}">Ketdi</button><button data-act="kelmadi" class="${r.status === "kelmadi" ? "on kelmadi" : ""}">Kelmadi</button></div></td></tr>`; }).join("")
      : '<tr><td colspan="6"><div class="empty">Faol talaba topilmadi. Talabalar ro\'yxati amaliyot rahbari tomonidan yuklanadi.</div></td></tr>';
    const d = rows.filter((r) => r.dirty).length;
    $("#info").textContent = `Jami: ${rows.length} ta · belgilangan: ${rows.filter((r) => r.status).length} ta${d ? ` · saqlanmagan o'zgarishlar: ${d}` : ""}`;
  }
  dirtyGuard = () => rows.some((r) => r.dirty);

  $("#tbl tbody").addEventListener("input", (e) => {
    const tr = e.target.closest("tr"); if (!tr) return; const r = rows[tr.dataset.i]; const c = e.target.classList;
    if (c.contains("f-brigade")) { r.brigade = e.target.value; const b = brigades.find((x) => x.name.toLowerCase() === r.brigade.trim().toLowerCase()); if (b?.leader_name && !r.leader) { r.leader = b.leader_name; tr.querySelector(".f-leader").value = r.leader; } }
    else if (c.contains("f-leader")) r.leader = e.target.value;
    else if (c.contains("f-task")) r.task = e.target.value;
    else if (c.contains("f-in")) r.time_in = e.target.value;
    else if (c.contains("f-out")) r.time_out = e.target.value;
    else return;
    r.dirty = true; $("#info").textContent = $("#info").textContent.replace(/ · saqlanmagan.*$/, "") + ` · saqlanmagan o'zgarishlar: ${rows.filter((x) => x.dirty).length}`;
  });
  $("#tbl tbody").addEventListener("click", (e) => {
    const tr = e.target.closest("tr"); if (!tr) return; const r = rows[tr.dataset.i];
    if (e.target.classList.contains("sel")) { r.sel = e.target.checked; return; }
    const act = e.target.dataset?.act; if (!act) return;
    const isToday = date === todayISO();
    if (act === "faol") { r.status = "faol"; if (!r.time_in && isToday) r.time_in = nowHM(); r.time_out = ""; }
    else if (act === "yakunlangan") {
      if (r.status !== "faol" && !r.time_in) return toast("Avval «Keldi» ni bosing", "err");
      r.status = "yakunlangan"; if (isToday || !r.time_out) r.time_out = isToday ? nowHM() : r.time_out;
    } else r.status = "kelmadi";
    r.dirty = true; render();
  });
  $("#all").onchange = (e) => { for (const [r] of visible()) r.sel = e.target.checked; render(); };
  $("#bApply").onclick = () => {
    const b = $("#bb").value.trim(), l = $("#bl").value.trim(), t = $("#bt").value.trim(), mark = $("#bk").checked;
    const sel = rows.filter((r) => r.sel); if (!sel.length) return toast("Avval talabalarni belgilang (chap tomondagi katakcha)", "err");
    if (!b && !l && !t && !mark) return toast("Brigada, usta yoki naryadni kiriting", "err");
    const bg = brigades.find((x) => x.name.toLowerCase() === b.toLowerCase());
    for (const r of sel) {
      if (b) r.brigade = b; if (l) r.leader = l; else if (b && bg?.leader_name) r.leader = bg.leader_name; if (t) r.task = t;
      if (mark && r.status !== "kelmadi") { if (!r.status) { r.status = "faol"; if (date === todayISO() && !r.time_in) r.time_in = nowHM(); } }
      r.dirty = true;
    }
    render(); toast(`${sel.length} ta talabaga qo'llandi (saqlashni unutmang)`, "ok");
  };
  $("#d").onchange = async (e) => {
    if (dirtyGuard() && !(await confirmModal("Saqlanmagan o'zgarishlar", "Sanani o'zgartirsangiz, saqlanmagan o'zgarishlar yo'qoladi.", "Davom etish", "warn"))) { e.target.value = date; return; }
    date = e.target.value || todayISO(); await loadDay();
  };
  $("#g").onchange = render; $("#q").addEventListener("input", debounce(render, 150));

  $("#save").onclick = async (e) => {
    if (saving) return;
    const dirty = rows.filter((r) => r.dirty);
    if (!dirty.length) return toast("O'zgarish yo'q");
    const noStatus = dirty.filter((r) => !r.status).length;
    const payload = dirty.filter((r) => r.status).map((r) => {
      const off = r.status === "kelmadi", bn = r.brigade.trim();
      const b = brigades.find((x) => x.name.toLowerCase() === bn.toLowerCase());
      return { student_id: r.s.id, work_date: date, status: r.status, time_in: off ? null : r.time_in || null, time_out: off ? null : r.time_out || null,
        brigade_id: off ? null : b?.id ?? null, brigade_name: off ? null : bn || null, leader: off ? null : r.leader.trim() || null, task: off ? null : r.task.trim() || null, marked_by: user.id };
    });
    saving = true; e.target.disabled = true; e.target.textContent = "Saqlanmoqda...";
    try {
      for (let i = 0; i < payload.length; i += 200) {
        const { error } = await sb.from("attendance").upsert(payload.slice(i, i + 200), { onConflict: "student_id,work_date" });
        if (error) throw error;
      }
      const saved = new Set(payload.map((p) => p.student_id));
      for (const r of rows) if (saved.has(r.s.id)) r.dirty = false;
      render();
      toast(`${payload.length} ta yozuv saqlandi${noStatus ? `. Holat belgilanmagan ${noStatus} ta qator saqlanmadi` : ""}`, noStatus ? "" : "ok");
    } catch (err) { toast("Saqlab bo'lmadi: " + (err.message || err), "err"); }
    saving = false; e.target.disabled = false; e.target.textContent = "💾 Saqlash";
  };
  await loadDay();
};

// ---------- Brigadalar ----------
sections.brigades = async (el) => {
  const { data, error } = await sb.from("brigades").select("*").order("name");
  if (error) throw error;
  el.innerHTML = `<h2>👷 Brigadalar</h2>
    <div class="card mb"><h3>Yangi brigada</h3><div class="row"><input type="text" id="bn" placeholder="Brigada nomi" style="max-width:260px"><input type="text" id="bl" placeholder="Rahbari (usta)" style="max-width:260px"><button class="btn" id="bAdd">Qo'shish</button></div></div>
    <div class="table-wrap"><table><thead><tr><th>Nomi</th><th>Rahbari (usta)</th><th>Faol</th><th></th></tr></thead><tbody>
    ${data.length ? data.map((b) => `<tr data-id="${esc(b.id)}"><td><input type="text" class="n" value="${esc(b.name)}"></td><td><input type="text" class="l" value="${esc(b.leader_name || "")}"></td><td><input type="checkbox" class="a" ${b.active ? "checked" : ""}></td><td class="right"><button class="btn sm" data-save>Saqlash</button> <button class="btn bad sm" data-del>O'chirish</button></td></tr>`).join("") : '<tr><td colspan="4"><div class="empty">Brigada yo\'q.</div></td></tr>'}
    </tbody></table></div>`;
  el.querySelector("#bAdd").onclick = async (e) => {
    const name = el.querySelector("#bn").value.trim(); if (!name) return toast("Brigada nomini kiriting", "err");
    e.target.disabled = true;
    const { error: err } = await sb.from("brigades").insert({ name, leader_name: el.querySelector("#bl").value.trim() || null });
    if (err) { e.target.disabled = false; return toast(/duplicate|unique/i.test(err.message) ? "Bunday brigada bor" : "Saqlab bo'lmadi: " + err.message, "err"); }
    toast("Qo'shildi", "ok"); ctx.navigate("brigades");
  };
  el.querySelectorAll("tr[data-id]").forEach((tr) => {
    tr.querySelector("[data-save]").onclick = async () => {
      const name = tr.querySelector(".n").value.trim(); if (!name) return toast("Nomi bo'sh bo'lmasin", "err");
      const { error: err } = await sb.from("brigades").update({ name, leader_name: tr.querySelector(".l").value.trim() || null, active: tr.querySelector(".a").checked }).eq("id", tr.dataset.id);
      toast(err ? "Saqlab bo'lmadi: " + err.message : "Saqlandi", err ? "err" : "ok");
    };
    tr.querySelector("[data-del]").onclick = async () => {
      if (!(await confirmModal("Brigadani o'chirish", "Brigada ro'yxatdan o'chadi (oldingi davomat yozuvlaridagi nomi saqlanadi).", "O'chirish"))) return;
      const { error: err } = await sb.from("brigades").delete().eq("id", tr.dataset.id);
      if (err) return toast("O'chirib bo'lmadi: " + err.message, "err"); ctx.navigate("brigades");
    };
  });
};

// ---------- Tasdiqlash ----------
const KIND = { kundalik: "Kundalik", hisobot: "Hisobot" };
const STATE = { pending: ["warn", "Kutilmoqda"], approved: ["ok", "Tasdiqlangan"], rejected: ["bad", "Rad etilgan"] };

sections.approvals = async (el) => {
  const [aps, students, per] = await Promise.all([fetchAll(() => sb.from("approvals").select("*").order("requested_at", { ascending: false })), loadStudents(), sb.from("practice_periods").select("*")]);
  if (per.error) throw per.error;
  const sMap = new Map(students.map((s) => [s.id, s])), pMap = new Map(per.data.map((p) => [p.id, p]));
  let filter = "pending";
  el.innerHTML = `<h2>✅ Tasdiqlash</h2>
    <p class="muted">Talabalar kundalik va hisobotni tasdiqlashga yuboradi. Tasdiqlaganingizdan keyin PDF'ga pechat va imzo qo'yiladi. Davomat yoki rasmlar keyin o'zgarsa, tasdiq «o'zgargan» deb belgilanadi.</p>
    <div class="tabs" id="tabs">${["pending", "approved", "rejected", "all"].map((f) => `<button data-f="${f}" class="${f === filter ? "active" : ""}">${{ pending: "Kutilmoqda", approved: "Tasdiqlangan", rejected: "Rad etilgan", all: "Hammasi" }[f]} (${f === "all" ? aps.length : aps.filter((a) => a.state === f).length})</button>`).join("")}</div>
    <div id="list"></div>
    <div class="card mt"><h3>Hujjat kodini tekshirish</h3><p class="muted small">PDF pastidagi «Tasdiq kodi»ni kiriting: tizim hujjat haqiqatan tasdiqlanganmi, tekshiradi.</p>
      <div class="row"><input type="text" id="code" placeholder="XXXXXXXX-XXXXXXXX" style="max-width:280px" autocomplete="off"><button class="btn secondary" id="chk">Tekshirish</button></div><div id="chkOut" class="mt"></div></div>`;
  const draw = () => {
    const list = aps.filter((a) => filter === "all" || a.state === filter);
    el.querySelector("#list").innerHTML = list.length ? `<div class="table-wrap"><table><thead><tr><th>Talaba</th><th>Hujjat</th><th>Davr</th><th>Yuborilgan</th><th>Holat</th><th></th></tr></thead><tbody>${list.map((a) => { const s = sMap.get(a.student_id), p = pMap.get(a.period_id), [c, t] = STATE[a.state];
      return `<tr><td><b>${esc(s?.full_name || "—")}</b><div class="small muted">${esc(s?.group_name || "")}</div></td><td>${KIND[a.kind]}</td><td>${p ? esc(p.title) : "—"}</td><td>${fmtDate(a.requested_at)}</td><td><span class="badge ${c}">${t}</span>${a.state === "approved" ? `<div class="small muted">${fmtDate(a.decided_at)}</div>` : ""}</td><td class="right"><button class="btn sm" data-open="${esc(a.id)}">Ko'rish</button></td></tr>`; }).join("")}</tbody></table></div>` : '<div class="empty">Bu bo\'limda hujjat yo\'q.</div>';
    el.querySelectorAll("[data-open]").forEach((b) => (b.onclick = () => review(aps.find((x) => x.id === b.dataset.open))));
  };
  draw();
  el.querySelector("#tabs").onclick = (e) => { const f = e.target.dataset?.f; if (!f) return; filter = f; el.querySelectorAll("#tabs button").forEach((b) => b.classList.toggle("active", b.dataset.f === f)); draw(); };

  async function review(ap) {
    const s = sMap.get(ap.student_id), p = pMap.get(ap.period_id) || null;
    const [att, photos] = await Promise.all([
      fetchAll(() => sb.from("attendance").select("*").eq("student_id", ap.student_id).order("work_date")),
      fetchAll(() => sb.from("photos").select("*").eq("student_id", ap.student_id)),
    ]);
    const cur = await computeApprovalHash(ap.kind, att, photos, p);
    const worked = cur.rows.filter((r) => r.status !== "kelmadi");
    const changed = ap.state === "approved" && ap.data_hash !== cur.hash;
    const inScopePhotos = photos.filter((x) => !p || (x.work_date >= p.starts_on && x.work_date <= p.ends_on)).length;
    const m = openModal({
      title: `${KIND[ap.kind]}: ${s?.full_name || ""}`,
      html: `<div class="row mb"><span class="badge ${STATE[ap.state][0]}">${STATE[ap.state][1]}</span>${p ? `<span class="badge info">${esc(p.title)}</span>` : ""}
          ${changed ? '<span class="badge warn">Tasdiqdan keyin ma\'lumotlar o\'zgargan</span>' : ap.state === "approved" ? '<span class="badge ok">Ma\'lumotlar tasdiqdagi bilan bir xil</span>' : ""}</div>
        <p class="small muted">Ish kunlari: <b>${worked.length}</b>${ap.kind === "hisobot" ? ` · rasmlar: <b>${inScopePhotos}</b>` : ""}${ap.note ? ` · izoh: ${esc(ap.note)}` : ""}</p>
        <div class="table-wrap" style="max-height:300px"><table><thead><tr><th>Sana</th><th>Vaqt</th><th>Brigada</th><th>Usta</th><th>Naryad</th></tr></thead><tbody>
        ${worked.length ? worked.map((r) => `<tr><td>${fmtDate(r.work_date)}</td><td>${hm(r.time_in)}${r.time_out ? "–" + hm(r.time_out) : ""}</td><td>${esc(r.brigade_name || "—")}</td><td>${esc(r.leader || "—")}</td><td>${esc(r.task || "—")}</td></tr>`).join("") : '<tr><td colspan="5"><div class="empty">Ish kuni yo\'q.</div></td></tr>'}</tbody></table></div>`,
      actions: [
        { label: "Yopish" },
        { label: "Rad etish", cls: "bad", onClick: async (close, btn) => {
            const note = prompt("Rad etish sababi (talabaga ko'rinadi):"); if (note === null) return; if (!note.trim()) return toast("Sababni yozing", "err");
            btn.disabled = true; await decide(ap, { state: "rejected", note: note.trim(), data_hash: null, days_count: null }, close);
          } },
        { label: changed ? "Qayta tasdiqlash" : "Tasdiqlash", cls: "ok", onClick: async (close, btn) => {
            if (!worked.length) return toast("Ish kuni yo'q: tasdiqlab bo'lmaydi", "err");
            btn.disabled = true; await decide(ap, { state: "approved", note: null, data_hash: cur.hash, days_count: cur.days }, close);
          } },
      ],
    });
  }
  async function decide(ap, patch, close) {
    const { data, error } = await sb.from("approvals").update({ ...patch, decided_by: user.id, decided_at: new Date().toISOString() }).eq("id", ap.id).select().single();
    if (error) return toast("Saqlab bo'lmadi: " + error.message, "err");
    Object.assign(ap, data); close(); toast(patch.state === "approved" ? "Tasdiqlandi" : "Rad etildi", "ok"); ctx.navigate("approvals");
  }
  el.querySelector("#chk").onclick = () => {
    const raw = el.querySelector("#code").value.trim().toLowerCase().replace(/\s/g, ""); const [idp, hp] = raw.split("-");
    const out = el.querySelector("#chkOut");
    const f = idp && hp ? aps.find((a) => a.state === "approved" && a.id.toLowerCase().startsWith(idp) && (a.data_hash || "").startsWith(hp)) : null;
    if (!f) { out.innerHTML = '<div class="alert err">Bunday tasdiqlangan hujjat topilmadi. Kod noto\'g\'ri yoki hujjat tasdiqlanmagan.</div>'; return; }
    const s = sMap.get(f.student_id);
    out.innerHTML = `<div class="alert okk"><b>Hujjat haqiqiy.</b> ${KIND[f.kind]} · ${esc(s?.full_name || "")} (${esc(s?.group_name || "")}) · tasdiqlangan: ${fmtDateTime(f.decided_at)} · ish kunlari: ${f.days_count ?? "—"}</div>`;
  };
};

// ---------- Talabalar (faqat ko'rish) ----------
sections.students = async (el) => {
  const students = await loadStudents();
  el.innerHTML = `<h2>👥 Talabalar</h2><div class="card"><div class="row mb"><input type="search" id="q" placeholder="🔍 Qidirish" style="max-width:300px"><select id="g" style="max-width:170px">${opt(groupsOf(students), "Barcha guruhlar")}</select><span class="muted small grow right" id="c"></span></div>
    <div class="table-wrap"><table><thead><tr><th>HEMIS ID</th><th>F.I.SH</th><th>Guruh</th><th>Kurs</th><th>Holat</th></tr></thead><tbody id="tb"></tbody></table></div></div>`;
  const draw = () => { const q = el.querySelector("#q").value.trim().toLowerCase(), g = el.querySelector("#g").value;
    const l = students.filter((s) => (!q || s.full_name.toLowerCase().includes(q) || s.hemis_id.includes(q)) && (!g || s.group_name === g));
    el.querySelector("#c").textContent = `${l.length} ta`;
    el.querySelector("#tb").innerHTML = l.slice(0, 300).map((s) => `<tr><td>${esc(s.hemis_id)}</td><td><b>${esc(s.full_name)}</b></td><td>${esc(s.group_name || "—")}</td><td>${esc(s.course ?? "—")}</td><td>${s.active ? '<span class="badge ok">Faol</span>' : '<span class="badge bad">Faol emas</span>'}</td></tr>`).join("") || '<tr><td colspan="5"><div class="empty">Talaba yo\'q.</div></td></tr>'; };
  draw(); el.querySelector("#q").addEventListener("input", debounce(draw, 150)); el.querySelector("#g").onchange = draw;
};

sections.announcements = (el) => mountAnnouncements(el, { userId: user.id });

// ---------- Hisobotlar ----------
sections.reports = async (el) => {
  const students = (await loadStudents()).filter((s) => s.active);
  const today = todayISO(), first = today.slice(0, 8) + "01";
  el.innerHTML = `<h2>📊 Hisobotlar</h2><div class="card mb"><div class="row">
    <label class="field" style="margin:0"><span>Dan</span><input type="date" id="f" value="${first}"></label><label class="field" style="margin:0"><span>Gacha</span><input type="date" id="t" value="${today}"></label>
    <label class="field" style="margin:0"><span>Guruh</span><select id="g">${opt(groupsOf(students), "Barcha guruhlar")}</select></label><button class="btn" id="go" style="align-self:flex-end">Hisoblash</button><button class="btn secondary" id="csv" style="align-self:flex-end">CSV</button></div></div><div id="out"></div>`;
  let table = [];
  const run = async () => {
    const f = el.querySelector("#f").value, t = el.querySelector("#t").value, g = el.querySelector("#g").value;
    if (!f || !t || f > t) return toast("Sanalarni to'g'ri kiriting", "err");
    const att = await fetchAll(() => sb.from("attendance").select("student_id,work_date,status").gte("work_date", f).lte("work_date", t));
    const m = new Map(); for (const a of att) { if (!m.has(a.student_id)) m.set(a.student_id, []); m.get(a.student_id).push(a); }
    table = students.filter((s) => !g || s.group_name === g).map((s) => { const l = m.get(s.id) || [], came = l.filter((a) => a.status !== "kelmadi").length, abs = l.filter((a) => a.status === "kelmadi").length; return [s.group_name || "", s.full_name, s.hemis_id, came, abs, l.length ? Math.round((came / l.length) * 100) + "%" : "—"]; });
    el.querySelector("#out").innerHTML = `<div class="table-wrap"><table><thead><tr><th>Guruh</th><th>F.I.SH</th><th>Kelgan kunlar</th><th>Kelmagan</th><th>Qatnashish</th></tr></thead><tbody>${table.map((r) => `<tr><td>${esc(r[0])}</td><td><b>${esc(r[1])}</b></td><td>${r[3]}</td><td>${r[4]}</td><td>${r[5]}</td></tr>`).join("") || '<tr><td colspan="5"><div class="empty">Ma\'lumot yo\'q.</div></td></tr>'}</tbody></table></div>`;
  };
  el.querySelector("#go").onclick = run;
  el.querySelector("#csv").onclick = () => { if (!table.length) return toast("Avval «Hisoblash» ni bosing", "err"); downloadFile(`hisobot_${el.querySelector("#f").value}_${el.querySelector("#t").value}.csv`, toCSV([["Guruh", "F.I.SH", "HEMIS ID", "Kelgan kunlar", "Kelmagan", "Qatnashish"], ...table])); };
  await run();
};

const isAdmin = profile.role === "admin";
var ctx = initShell({
  title: "RES RAHBARI", subtitle: "Ulug'bek tuman ETK", profile,
  menu: [
    { id: "dashboard", icon: "🏠", label: "Bosh sahifa" }, { id: "attendance", icon: "📅", label: "Davomat va naryad" },
    { id: "approvals", icon: "✅", label: "Tasdiqlash" }, { id: "brigades", icon: "👷", label: "Brigadalar" },
    { id: "students", icon: "👥", label: "Talabalar" }, { id: "announcements", icon: "📢", label: "E'lonlar" }, { id: "reports", icon: "📊", label: "Hisobotlar" },
    ...(isAdmin ? [{ sep: true }, { href: "admin_panel.html", icon: "⚙️", label: "Administrator paneli" }] : []),
  ],
  sections,
});
