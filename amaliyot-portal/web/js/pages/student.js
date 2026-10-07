// talaba_portali.html sahifasi mantig'i (alohida fayl: CSP inline skriptga ruxsat bermaydi).
import {
  sb, requireRole, initShell, esc, fmtDate, fmtDateTime, hm, todayISO, statusBadge, toast, confirmModal,
  computeApprovalHash, pickPeriod, approvalCode, fetchAll,
} from "../app.js";
import { buildKundalikPdf, buildHisobotPdf, rasterize } from "../pdf.js";

const { user, profile } = await requireRole(["student"]);

const DEFAULT_ORG = { org_name: "Ulug'bek tuman elektr tarmoqlari korxonasi (RES)", head_name: "", head_position: "RES boshlig'i" };
const S = { me: null, attendance: [], tasks: [], announcements: [], photos: [], approvals: [], periods: [], org: DEFAULT_ORG, signed: new Map() };
let timerId = null;

// ---------- Ma'lumotlarni yuklash ----------
async function loadAll() {
  const meQ = await sb.from("students").select("*").eq("profile_id", user.id).maybeSingle();
  if (meQ.error) throw meQ.error;
  S.me = meQ.data;
  if (!S.me) return;
  const id = S.me.id;
  const [att, tasks, ann, photos, appr, per, org] = await Promise.all([
    fetchAll(() => sb.from("attendance").select("*").eq("student_id", id).order("work_date", { ascending: false })),
    sb.from("tasks").select("*").order("created_at", { ascending: false }).limit(100),
    sb.from("announcements").select("*").order("created_at", { ascending: false }).limit(50),
    fetchAll(() => sb.from("photos").select("*").eq("student_id", id).order("created_at", { ascending: true })),
    sb.from("approvals").select("*").eq("student_id", id),
    sb.from("practice_periods").select("*"),
    sb.from("settings").select("*").maybeSingle(),
  ]);
  for (const r of [tasks, ann, appr, per]) if (r.error) throw r.error;
  S.attendance = att; S.photos = photos;
  S.tasks = tasks.data; S.announcements = ann.data; S.approvals = appr.data; S.periods = per.data;
  S.org = { ...DEFAULT_ORG, ...(org.data || {}) };
}
const period = () => pickPeriod(S.periods, S.me.course);
const attDays = () => S.attendance.filter((a) => a.status !== "kelmadi");

// ---------- Bo'limlar ----------
const sections = {};

sections.home = async (el) => {
  clearInterval(timerId);
  const p = period();
  const last = S.attendance[0];
  const openTasks = S.tasks.filter((t) => !t.due_on || t.due_on >= todayISO());
  el.innerHTML = `
    <h2>Xush kelibsiz, ${esc(S.me.full_name.split(" ")[1] || S.me.full_name.split(" ")[0])}!</h2>
    <div class="grid c2">
      <div class="card"><h4>Talaba ma'lumoti</h4>
        <dl class="kv">
          <dt>F.I.SH</dt><dd>${esc(S.me.full_name)}</dd>
          <dt>HEMIS ID</dt><dd>${esc(S.me.hemis_id)}</dd>
          <dt>Kurs / guruh</dt><dd>${esc(S.me.course ?? "—")}-kurs / ${esc(S.me.group_name || "—")}</dd>
          <dt>Fakultet</dt><dd>${esc(S.me.faculty || "—")}</dd>
          <dt>Yo'nalish</dt><dd>${esc(S.me.specialty || "—")}</dd>
          <dt>Kafedra</dt><dd>${esc(S.me.kafedra || "—")}</dd>
        </dl></div>
      <div class="card"><h4>Amaliyot joyi</h4>
        <dl class="kv">
          <dt>Korxona</dt><dd>${esc(S.org.org_name)}</dd>
          <dt>Rahbar</dt><dd>${esc(S.org.head_name || "—")}</dd>
          <dt>Ish kunlari</dt><dd>${attDays().length} kun</dd>
        </dl>
        <div class="mt" id="timerBox"></div></div>
    </div>
    ${S.announcements.length ? `<h3 class="mt">E'lonlar</h3>${S.announcements.slice(0, 3).map(announcementCard).join("")}` : ""}
    <h3 class="mt">${last ? "So'nggi davomat" : "Davomat"}</h3>
    ${last ? attendanceCard(last) : '<div class="empty">Hozircha davomat belgilanmagan.</div>'}
    <p class="mt muted">Ochiq topshiriqlar: <b>${openTasks.length}</b> ta (batafsil: «Topshiriq va e'lonlar»)</p>`;
  renderTimer(el.querySelector("#timerBox"), p);
};

function renderTimer(box, p) {
  if (!p) { box.innerHTML = '<div class="muted small">Sizning kursingiz uchun amaliyot davri hali belgilanmagan.</div>'; return; }
  const start = new Date(`${p.starts_on}T00:00:00`), end = new Date(`${p.ends_on}T23:59:59`);
  const draw = () => {
    const now = new Date();
    const target = now < start ? start : end;
    const label = now < start ? "Amaliyot boshlanishiga qoldi" : now <= end ? "Amaliyot tugashiga qoldi" : "Amaliyot yakunlangan";
    let ms = Math.max(0, target - now);
    const d = Math.floor(ms / 864e5); ms -= d * 864e5;
    const h = Math.floor(ms / 36e5); ms -= h * 36e5;
    const m = Math.floor(ms / 6e4); ms -= m * 6e4;
    const s = Math.floor(ms / 1e3);
    const z = (n) => String(n).padStart(2, "0");
    box.innerHTML = `<div class="muted small" style="margin-bottom:6px">${esc(p.title)}: ${fmtDate(p.starts_on)} — ${fmtDate(p.ends_on)}<br><b>${label}</b></div>
      <div class="timer"><div><b>${z(d)}</b><span>KUN</span></div><div><b>${z(h)}</b><span>SOAT</span></div><div><b>${z(m)}</b><span>MINUT</span></div><div><b>${z(s)}</b><span>SEKUND</span></div></div>`;
  };
  draw(); timerId = setInterval(() => { if (!box.isConnected) return clearInterval(timerId); draw(); }, 1000);
}

function attendanceCard(a) {
  return `<div class="card att ${esc(a.status)}" style="margin-bottom:12px">
    <div class="row between"><b>📅 ${fmtDate(a.work_date)}${a.time_in ? ` · ${hm(a.time_in)}${a.time_out ? " – " + hm(a.time_out) : " – ..."}` : ""}</b>${statusBadge(a.status)}</div>
    ${a.status !== "kelmadi" ? `<dl class="kv mt"><dt>Brigada</dt><dd>${esc(a.brigade_name || "—")}</dd><dt>Brigada rahbari</dt><dd>${esc(a.leader || "—")}</dd><dt>Naryad</dt><dd>${esc(a.task || "—")}</dd></dl>` : ""}
  </div>`;
}
function announcementCard(a) {
  return `<div class="card" style="margin-bottom:12px;border-left:5px solid var(--warn)"><div class="row between"><b>📢 ${esc(a.title)}</b><span class="muted small">${fmtDate(a.created_at)}</span></div>${a.body ? `<p style="margin:8px 0 0;white-space:pre-wrap">${esc(a.body)}</p>` : ""}</div>`;
}

sections.attendance = async (el) => {
  el.innerHTML = `<h2>📅 Davomat tarixi</h2><p class="muted">Ma'lumotlar RES rahbari tomonidan kiritiladi.</p>` +
    (S.attendance.length ? S.attendance.map(attendanceCard).join("") : '<div class="empty">Hech qanday ma\'lumot yo\'q.</div>');
};

sections.brigade = async (el) => {
  el.innerHTML = `<h2>👷 Brigada va ishlar tarixi</h2><p class="muted">Qaysi kuni qaysi brigada tarkibida ishlaganingiz.</p><div class="timeline">` +
    (S.attendance.length ? S.attendance.map((a) => `
      <div class="tl-item ${a.status === "kelmadi" ? "absent" : ""}"><div class="card">
        <div class="muted small"><b>${fmtDate(a.work_date)}</b> ${a.time_in ? `(${hm(a.time_in)}${a.time_out ? "–" + hm(a.time_out) : ""})` : ""}</div>
        <h3 style="margin:6px 0">${a.status === "kelmadi" ? "Kelmagan" : esc(a.brigade_name || "Brigada belgilanmagan")}</h3>
        ${a.status !== "kelmadi" ? `<div>Rahbar: <b>${esc(a.leader || "—")}</b></div><div>Vazifa: ${esc(a.task || "—")}</div>` : ""}
      </div></div>`).join("") : '<div class="empty">Hozircha ma\'lumot yo\'q.</div>') + "</div>";
};

sections.tasks = async (el) => {
  const today = todayISO();
  el.innerHTML = `<h2>📝 Topshiriq va e'lonlar</h2>
    <h3>Topshiriqlar</h3>` +
    (S.tasks.length ? S.tasks.map((t) => `<div class="card" style="margin-bottom:12px;border-left:5px solid var(--accent)">
        <div class="row between"><b>${esc(t.title)}</b>${t.due_on ? `<span class="badge ${t.due_on < today ? "bad" : "info"}">Muddat: ${fmtDate(t.due_on)}</span>` : ""}</div>
        ${t.body ? `<p style="margin:8px 0 0;white-space:pre-wrap">${esc(t.body)}</p>` : ""}
        <div class="muted small mt">Berilgan: ${fmtDate(t.created_at)}${t.group_name ? ` · guruh ${esc(t.group_name)}` : ""}</div></div>`).join("") : '<div class="empty">Hozircha topshiriq yo\'q.</div>') +
    `<h3 class="mt">E'lonlar</h3>` + (S.announcements.length ? S.announcements.map(announcementCard).join("") : '<div class="empty">Hozircha e\'lon yo\'q.</div>');
};

// ---------- Rasmlar ----------
async function signedUrls(paths) {
  const need = paths.filter((p) => !S.signed.has(p));
  if (need.length) {
    const { data, error } = await sb.storage.from("practice-photos").createSignedUrls(need, 3600);
    if (error) throw error;
    for (const r of data) if (r.signedUrl) S.signed.set(r.path, r.signedUrl);
  }
}
async function toJpegBlob(file, maxSide = 1600) {
  let bmp;
  try { bmp = await createImageBitmap(file); } catch { throw new Error(`"${file.name}" rasm sifatida o'qilmadi (JPG/PNG yuklang)`); }
  const k = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k));
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  return await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Rasmni siqib bo'lmadi"))), "image/jpeg", 0.82));
}
const MAX_PHOTOS_PER_DAY = 12;

sections.photos = async (el) => {
  const days = attDays();
  await signedUrls(S.photos.map((p) => p.storage_path));
  el.innerHTML = `<h2>📷 Jarayon rasmlari</h2>
    <p class="muted">Bajargan ishingizni rasmga olib, tegishli sanaga yuklang. Rasmlar hisobot PDF'ida ko'rinadi. Rasmlar o'zgarsa, hisobotni RES rahbari qayta tasdiqlashi kerak.</p>` +
    (days.length ? days.map((a) => `
      <div class="card mb" data-day="${esc(a.work_date)}">
        <div class="row between"><b>📅 ${fmtDate(a.work_date)}</b><span class="badge">${esc(a.brigade_name || "Brigada belgilanmagan")}</span></div>
        <p class="small muted" style="margin:6px 0 10px">${esc(a.task || "")}</p>
        <label class="dropzone">📷 Rasm tanlang (bir nechta bo'lishi mumkin)<input type="file" accept="image/*" multiple class="hidden up"></label>
        <div class="gallery"></div>
      </div>`).join("") : '<div class="empty">Hozircha ish kunlari yo\'q: avval davomat belgilanishi kerak.</div>');
  el.querySelectorAll("[data-day]").forEach((card) => {
    const day = card.dataset.day;
    const draw = () => {
      const g = card.querySelector(".gallery"); g.innerHTML = "";
      for (const ph of S.photos.filter((p) => p.work_date === day)) {
        const t = document.createElement("div"); t.className = "thumb";
        const url = S.signed.get(ph.storage_path);
        t.innerHTML = `${url ? `<img alt="Amaliyot rasmi" src="${esc(url)}">` : ""}<button title="O'chirish" aria-label="Rasmni o'chirish">✕</button>`;
        t.querySelector("button").onclick = () => removePhoto(ph, draw);
        g.appendChild(t);
      }
    };
    draw();
    card.querySelector(".up").addEventListener("change", async (e) => {
      const files = [...e.target.files]; e.target.value = "";
      for (const f of files) {
        if (S.photos.filter((p) => p.work_date === day).length >= MAX_PHOTOS_PER_DAY) { toast(`Bir kunga ko'pi bilan ${MAX_PHOTOS_PER_DAY} ta rasm`, "err"); break; }
        try { await uploadPhoto(f, day); draw(); } catch (err) { toast(err.message, "err"); }
      }
    });
  });
};

async function uploadPhoto(file, day) {
  if (!/^image\//.test(file.type)) throw new Error(`"${file.name}" rasm emas`);
  const blob = await toJpegBlob(file);
  const path = `${S.me.id}/${day}/${crypto.randomUUID()}.jpg`;
  const up = await sb.storage.from("practice-photos").upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (up.error) throw new Error("Rasmni yuklab bo'lmadi: " + up.error.message);
  const ins = await sb.from("photos").insert({ student_id: S.me.id, work_date: day, storage_path: path }).select().single();
  if (ins.error) { await sb.storage.from("practice-photos").remove([path]); throw new Error("Rasmni saqlab bo'lmadi: " + ins.error.message); }
  S.photos.push(ins.data);
  await signedUrls([path]);
}
async function removePhoto(ph, redraw) {
  if (!(await confirmModal("Rasmni o'chirish", "Bu rasm o'chiriladi. Davom etasizmi?", "O'chirish"))) return;
  const del = await sb.from("photos").delete().eq("id", ph.id);
  if (del.error) return toast("O'chirib bo'lmadi: " + del.error.message, "err");
  await sb.storage.from("practice-photos").remove([ph.storage_path]);
  S.photos = S.photos.filter((p) => p.id !== ph.id);
  redraw();
}

// ---------- Amaliyot yakuni: tasdiq va PDF ----------
async function docState(kind) {
  const p = period();
  const { rows, hash, days } = await computeApprovalHash(kind, S.attendance, S.photos, p);
  const ap = S.approvals.find((a) => a.kind === kind && (a.period_id ?? null) === (p?.id ?? null)) || null;
  const valid = !!(ap && ap.state === "approved" && ap.data_hash === hash);
  return { p, rows, hash, days, ap, valid };
}

function approvalBlock(kind, st) {
  const { ap, valid, days } = st;
  if (!ap) return { html: `<span class="badge">Tasdiqlanmagan</span>`, btn: days ? `<button class="btn" data-send="${kind}">RES rahbari tasdig'iga yuborish</button>` : `<span class="muted small">Avval ish kuni bo'lishi kerak</span>` };
  if (ap.state === "pending") return { html: `<span class="badge warn">Tasdiq kutilmoqda</span> <span class="muted small">(yuborilgan: ${fmtDate(ap.requested_at)})</span>`, btn: "" };
  if (ap.state === "rejected") return { html: `<span class="badge bad">Rad etilgan</span> ${ap.note ? `<div class="small mt">Sabab: ${esc(ap.note)}</div>` : ""}`, btn: `<button class="btn" data-resend="${esc(ap.id)}">Tuzatib, qayta yuborish</button>` };
  if (valid) return { html: `<span class="badge ok">Tasdiqlangan ${fmtDate(ap.decided_at)}</span> <span class="muted small">Kod: ${esc(approvalCode(ap))}</span>`, btn: "" };
  return { html: `<span class="badge warn">Tasdiqdan keyin ma'lumotlar o'zgargan</span><div class="small muted mt">RES rahbari qayta tasdiqlashi kerak. Unga «Talab va takliflar» orqali xabar bering.</div>`, btn: "" };
}

sections.finish = async (el) => {
  const [k, h] = [await docState("kundalik"), await docState("hisobot")];
  const block = (kind, st, title, desc, color) => {
    const a = approvalBlock(kind, st);
    return `<div class="card mb" style="border-left:5px solid ${color}"><h3>${title}</h3><p class="muted">${desc}</p>
      <div class="mb">${a.html}</div><div class="small muted mb">Ish kunlari: <b>${st.days}</b>${st.p ? ` · davr: ${esc(st.p.title)}` : ""}</div>
      <div class="row">${a.btn}<button class="btn secondary" data-pdf="${kind}">📄 PDF yuklab olish</button></div>
      ${st.valid ? "" : '<p class="small muted mt">Tasdiqlanmagan PDF\'da pechat va imzo bo\'lmaydi.</p>'}</div>`;
  };
  el.innerHTML = `<h2>🎓 Amaliyotni yakunlash</h2>
    ${block("kundalik", k, "Amaliyot kundaligi (jadval)", "Kunlik brigada va naryadlaringiz asosida avtomatik shakllantirilgan jadval.", "var(--accent)")}
    ${block("hisobot", h, "Kengaytirilgan hisobot (rasmlar bilan)", "Naryadlar va «Jarayon rasmlari» bo'limiga yuklangan fotosuratlar birlashtirilgan to'liq hisobot.", "var(--ok)")}`;
  el.querySelectorAll("[data-send]").forEach((b) => (b.onclick = () => sendApproval(b.dataset.send, b)));
  el.querySelectorAll("[data-resend]").forEach((b) => (b.onclick = () => resendApproval(b.dataset.resend, b)));
  el.querySelectorAll("[data-pdf]").forEach((b) => (b.onclick = () => makePdf(b.dataset.pdf, b)));
};

async function sendApproval(kind, btn) {
  btn.disabled = true;
  const p = period();
  const { data, error } = await sb.from("approvals").insert({ student_id: S.me.id, period_id: p?.id ?? null, kind, state: "pending" }).select().single();
  if (error) { btn.disabled = false; return toast(/duplicate|unique/i.test(error.message) ? "Bu hujjat allaqachon yuborilgan" : "Yuborib bo'lmadi: " + error.message, "err"); }
  S.approvals.push(data); toast("RES rahbari tasdig'iga yuborildi", "ok"); ctx.navigate("finish");
}
async function resendApproval(id, btn) {
  btn.disabled = true;
  const { data, error } = await sb.from("approvals")
    .update({ state: "pending", decided_by: null, decided_at: null, note: null, requested_at: new Date().toISOString() }).eq("id", id).select().single();
  if (error) { btn.disabled = false; return toast("Yuborib bo'lmadi: " + error.message, "err"); }
  S.approvals = S.approvals.map((a) => (a.id === id ? data : a)); toast("Qayta yuborildi", "ok"); ctx.navigate("finish");
}

async function blobToDataURL(blob) {
  return await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
}

async function makePdf(kind, btn) {
  const label = btn.textContent; btn.disabled = true; btn.textContent = "Tayyorlanmoqda...";
  try {
    const st = await docState(kind);
    const rows = st.rows.filter((a) => a.status !== "kelmadi").sort((a, b) => (a.work_date < b.work_date ? -1 : 1));
    if (!rows.length) throw new Error("Hozircha ish kuni yo'q");
    const c = { me: S.me, org: S.org, period: st.p, rows, approval: null };
    if (st.valid) {
      c.approval = { valid: true, decided_at: st.ap.decided_at, code: approvalCode(st.ap) };
      [c.seal, c.sign] = await Promise.all([rasterize("assets/pechat.svg", 600, 600), rasterize("assets/imzo.svg", 480, 200)]);
    }
    let doc;
    if (kind === "kundalik") doc = buildKundalikPdf(c);
    else {
      const inScope = (d) => !st.p || (d >= st.p.starts_on && d <= st.p.ends_on);
      const list = S.photos.filter((p) => inScope(p.work_date));
      await signedUrls(list.map((p) => p.storage_path));
      c.photos = new Map();
      for (const ph of list) {
        const url = S.signed.get(ph.storage_path); if (!url) continue;
        const res = await fetch(url); if (!res.ok) continue;
        const data = await blobToDataURL(await res.blob());
        if (!c.photos.has(ph.work_date)) c.photos.set(ph.work_date, []);
        c.photos.get(ph.work_date).push(data);
      }
      doc = buildHisobotPdf(c);
    }
    doc.save(`${kind === "kundalik" ? "Amaliyot_kundaligi" : "Amaliyot_hisoboti"}_${S.me.hemis_id}.pdf`);
  } catch (e) { toast(e.message || "PDF yaratib bo'lmadi", "err"); }
  btn.disabled = false; btn.textContent = label;
}

// ---------- Hujjat shablonlari ----------
const T = "https://drive.google.com/file/d/";
const REPORT = `${T}1GCN6-5R2_ubRsgQBX8nRw_wfWt3cKS_k/view?usp=sharing`;
const ENTERPRISE = `${T}1ZvVAvhUyxPXz0CRFemx8eqGArURz4K18/view?usp=sharing`;
const COURSES = [
  ["1-kurs: O'quv amaliyoti", `${T}1j8IIfcYLeqPw8tf5nJURabgRfNRVFu9a/view?usp=sharing`],
  ["2-kurs: Ishlab chiqarish amaliyoti", `${T}1wfOM5vgJsQBRC8-IedRwQ3kllOQ_oeWc/view?usp=sharing`],
  ["3-kurs: Texnologik amaliyot", `${T}1v2D07tDfBmch4zBa9h17Ass-KOeJffnR/view?usp=sharing`],
  ["4-kurs: Bitiruv oldi amaliyoti", `${T}1Umfsb_H4eaeIp8jyfOS2ZG4P1gfMhXPJ/view?usp=sharing`],
];
sections.docs = async (el) => {
  el.innerHTML = `<h2>📚 Hujjat shablonlari</h2><p class="muted">Amaliyot hujjatlari andozalarini yuklab oling.</p>` +
    COURSES.map(([name, diary], i) => `<div class="card mb" ${S.me.course === i + 1 ? 'style="border-color:var(--accent)"' : ""}><h3>${esc(name)}${S.me.course === i + 1 ? ' <span class="badge info">Sizning kursingiz</span>' : ""}</h3>
      <div class="row"><a class="btn secondary" target="_blank" rel="noopener" href="${diary}">Kundalik andozasi</a><a class="btn secondary" target="_blank" rel="noopener" href="${REPORT}">Hisobot shabloni</a><a class="btn secondary" target="_blank" rel="noopener" href="${ENTERPRISE}">Korxona haqida hisobot</a></div></div>`).join("");
};

// ---------- Talab va takliflar ----------
sections.feedback = async (el) => {
  const { data, error } = await sb.from("feedbacks").select("*").eq("student_id", S.me.id).order("created_at", { ascending: false }).limit(20);
  if (error) throw error;
  el.innerHTML = `<h2>💬 Talab va takliflar</h2>
    <div class="card mb" style="border-top:4px solid var(--warn)">
      <p class="muted">Amaliyot jarayoni, sharoitlar yoki portal bo'yicha fikr-mulohazangizni yozing.</p>
      <textarea id="fbText" maxlength="4000" placeholder="Bu yerga yozing..."></textarea>
      <div class="row mt"><button class="btn warn" id="fbSend">Yuborish</button></div></div>
    <h3>Yuborilganlar</h3>` +
    (data.length ? data.map((f) => `<div class="card mb"><div class="muted small">${fmtDateTime(f.created_at)}</div><p style="margin:6px 0 0;white-space:pre-wrap">${esc(f.message)}</p></div>`).join("") : '<div class="empty">Hali hech narsa yubormagansiz.</div>');
  el.querySelector("#fbSend").onclick = async (e) => {
    const text = el.querySelector("#fbText").value.trim();
    if (!text) return toast("Avval matn kiriting", "err");
    e.target.disabled = true;
    const { error: err } = await sb.from("feedbacks").insert({ student_id: S.me.id, message: text });
    if (err) { e.target.disabled = false; return toast("Yuborib bo'lmadi: " + err.message, "err"); }
    toast("Xabaringiz yuborildi. Rahmat!", "ok"); ctx.navigate("feedback");
  };
};

// ---------- Ishga tushirish ----------
await loadAll();
if (!S.me) {
  document.body.innerHTML = `<div class="auth-wrap"><div class="card auth-card"><div class="alert err">HEMIS ma'lumotingiz topilmadi. Amaliyot rahbariga murojaat qiling.</div><button class="btn block" id="o">Chiqish</button></div></div>`;
  document.getElementById("o").onclick = async () => { await sb.auth.signOut(); location.replace("login.html"); };
} else {
  var ctx = initShell({
    title: "TALABA PORTALI", subtitle: "Amaliyot (RES)", profile,
    menu: [
      { id: "home", icon: "🏠", label: "Bosh sahifa" }, { id: "attendance", icon: "📅", label: "Davomat tarixi" },
      { id: "brigade", icon: "👷", label: "Brigada tarixi" }, { id: "tasks", icon: "📝", label: "Topshiriq va e'lonlar" },
      { id: "photos", icon: "📷", label: "Jarayon rasmlari" }, { id: "finish", icon: "🎓", label: "Amaliyot yakuni" },
      { id: "docs", icon: "📚", label: "Hujjat shablonlari" }, { id: "feedback", icon: "💬", label: "Talab va takliflar" },
    ],
    sections,
  });
}
