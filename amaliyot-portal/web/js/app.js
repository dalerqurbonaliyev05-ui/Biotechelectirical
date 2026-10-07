// Umumiy modul: server bilan aloqa, kirish tekshiruvi, interfeys yordamchilari.
import { createClient } from "./client.js";

// ---------- Sessiya qayerda saqlanadi ----------
// Odatda sessiya brauzer/oyna yopilganda tugaydi (sessionStorage): umumiy kompyuterda xavfsiz.
// Foydalanuvchi kirishda «Meni eslab qol» ni belgilasa - localStorage (brauzer yopilgandan keyin ham qoladi).
// Tanlov kirishdan oldin o'zgarishi mumkin, shuning uchun xotira har chaqiruvda tanlanadi.
const REMEMBER_KEY = "amaliyot_remember";
const safe = (fn, fallback) => { try { return fn(); } catch { return fallback; } };
const remembered = () => safe(() => window.localStorage.getItem(REMEMBER_KEY) === "1", false);
export function setRemember(on) {
  safe(() => (on ? window.localStorage.setItem(REMEMBER_KEY, "1") : window.localStorage.removeItem(REMEMBER_KEY)));
}
const sessionStore = {
  getItem: (k) => safe(() => (remembered() ? window.localStorage : window.sessionStorage).getItem(k), null),
  setItem: (k, v) => safe(() => {
    const on = remembered() ? window.localStorage : window.sessionStorage;
    (on === window.localStorage ? window.sessionStorage : window.localStorage).removeItem(k); // eski nusxa qolmasin
    on.setItem(k, v);
  }),
  removeItem: (k) => safe(() => { window.localStorage.removeItem(k); window.sessionStorage.removeItem(k); }),
};
export const sb = createClient({ store: sessionStore });
// Sessiya tugasa (yangilab bo'lmadi) har qanday sahifadan kirish sahifasiga qaytamiz.
window.addEventListener("amaliyot:signed-out", () => { if (!/login\.html$/.test(location.pathname)) location.replace("login.html?x=expired"); });

// ---------- Rollar ----------
export const ROLE_HOME = {
  student: "talaba_portali.html",
  res_head: "res_panel.html",
  practice_head: "amaliyot_panel.html",
  admin: "admin_panel.html",
};
export const ROLE_LABEL = {
  student: "Talaba",
  res_head: "RES rahbari",
  practice_head: "Amaliyot rahbari",
  admin: "Administrator",
};
const NEVER = new Promise(() => {});

export async function loadProfile(userId) {
  const { data, error } = await sb.from("profiles").select("id, login, full_name, role, active").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

// Sahifa himoyasi: kirmagan -> login; faolsiz -> chiqarib yuboradi; parol almashtirilmagan -> login (almashtirish);
// noto'g'ri rol -> o'z sahifasiga. Faqat ruxsat etilgan rol uchun davom etadi.
export async function requireRole(roles) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { location.replace("login.html"); return NEVER; }
  let profile = null;
  try { profile = await loadProfile(session.user.id); } catch { /* quyida */ }
  if (!profile || !profile.active) {
    await sb.auth.signOut();
    location.replace("login.html?x=inactive");
    return NEVER;
  }
  if (session.user.must_change_password) { location.replace("login.html?change=1"); return NEVER; }
  if (!roles.includes(profile.role)) { location.replace(ROLE_HOME[profile.role] || "login.html"); return NEVER; }
  return { session, user: session.user, profile };
}

export async function signOutAndGo() {
  try { await sb.auth.signOut(); } catch { /* baribir chiqamiz */ }
  setRemember(false); // keyingi kirishda «Meni eslab qol» yana o'zingiz tanlaysiz
  location.replace("login.html");
}

// ---------- Server amallari (talabalar importi, xodimlar boshqaruvi) ----------
export const callFn = (name, body) => sb.callFn(name, body);

// ---------- Matn, sana, format ----------
export function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
const p2 = (n) => String(n).padStart(2, "0");
export function todayISO(d = new Date()) { return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; }
export function nowHM(d = new Date()) { return `${p2(d.getHours())}:${p2(d.getMinutes())}`; }
export function fmtDate(iso) { if (!iso) return "—"; const [y, m, d] = String(iso).slice(0, 10).split("-"); return `${d}.${m}.${y}`; }
export function fmtDateTime(ts) { if (!ts) return "—"; const d = new Date(ts); return `${fmtDate(todayISO(d))} ${nowHM(d)}`; }
export function hm(t) { return t ? String(t).slice(0, 5) : ""; }
export function addDaysISO(iso, n) { const [y, m, d] = iso.split("-").map(Number); return todayISO(new Date(y, m - 1, d + n)); }
export function statusText(s) { return { faol: "Faol (ishda)", yakunlangan: "Yakunlangan", kelmadi: "Kelmadi" }[s] || "Belgilanmagan"; }
export function statusBadge(s) {
  const cls = { faol: "info", yakunlangan: "ok", kelmadi: "bad" }[s] || "";
  return `<span class="badge ${cls}">${esc(statusText(s))}</span>`;
}
export function debounce(fn, ms = 250) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
export function uniq(arr) { return [...new Set(arr.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), "uz")); }

// ---------- Ko'p qatorli o'qish (PostgREST 1000 qator chegarasi) ----------
export async function fetchAll(build, page = 1000) {
  const out = [];
  for (let from = 0; ; from += page) {
    const { data, error } = await build().range(from, from + page - 1);
    if (error) throw error;
    out.push(...data);
    if (data.length < page) break;
  }
  return out;
}

// ---------- Fayl yuklab olish, CSV ----------
export function downloadFile(name, text, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([text], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
export function toCSV(rows) {
  // Excel formulasi sifatida bajarilmasin: =, +, -, @ bilan boshlansa oldiga ' qo'yiladi
  const q = (v) => { let s = String(v ?? ""); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return "﻿" + rows.map((r) => r.map(q).join(";")).join("\r\n");
}

// ---------- Xabarlar, modal ----------
export function toast(msg, type = "") {
  let box = document.getElementById("toasts");
  if (!box) { box = document.createElement("div"); box.id = "toasts"; document.body.appendChild(box); }
  const t = document.createElement("div");
  t.className = `toast ${type}`; t.textContent = msg; t.setAttribute("role", "status");
  box.appendChild(t);
  setTimeout(() => t.remove(), type === "err" ? 7000 : 4000);
}

// openModal({title, html, actions:[{label, cls, onClick(close)}]}) -> {close, el}
export function openModal({ title, html = "", actions = [], onOpen }) {
  const bg = document.createElement("div");
  bg.className = "modal-bg";
  bg.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><h3>${esc(title)}</h3><div class="mbody">${html}</div><div class="actions"></div></div>`;
  const close = () => bg.remove();
  const acts = bg.querySelector(".actions");
  for (const a of actions) {
    const b = document.createElement("button");
    b.className = `btn ${a.cls || "secondary"}`; b.textContent = a.label;
    b.addEventListener("click", () => (a.onClick ? a.onClick(close, b) : close()));
    acts.appendChild(b);
  }
  bg.addEventListener("mousedown", (e) => { if (e.target === bg) close(); });
  document.body.appendChild(bg);
  if (onOpen) onOpen(bg.querySelector(".mbody"), close);
  return { close, el: bg.querySelector(".mbody") };
}

export function confirmModal(title, text, okLabel = "Ha", cls = "bad") {
  return new Promise((resolve) => {
    openModal({
      title, html: `<p>${esc(text)}</p>`,
      actions: [
        { label: "Bekor qilish", onClick: (close) => { close(); resolve(false); } },
        { label: okLabel, cls, onClick: (close) => { close(); resolve(true); } },
      ],
    });
  });
}

// ---------- Parolni almashtirish ----------
export function passwordProblem(p, p2v) {
  if (typeof p !== "string" || p.length < 8) return "Parol kamida 8 ta belgi bo'lishi kerak";
  if (p.length > 72) return "Parol 72 belgidan oshmasligi kerak";
  if (p2v !== undefined && p !== p2v) return "Ikkala parol bir xil emas";
  return null;
}
export async function setNewPassword(currentPassword, password) {
  const { error } = await sb.auth.changePassword(currentPassword, password);
  if (error) throw new Error(error.message);
}
export function openChangePassword() {
  openModal({
    title: "Parolni o'zgartirish",
    html: `<div id="cpErr" class="alert err hidden"></div>
      <label class="field"><span>Hozirgi parol</span><input type="password" id="cpO" autocomplete="current-password"></label>
      <label class="field"><span>Yangi parol (kamida 8 belgi)</span><input type="password" id="cpA" autocomplete="new-password"></label>
      <label class="field"><span>Yangi parolni takrorlang</span><input type="password" id="cpB" autocomplete="new-password"></label>`,
    actions: [
      { label: "Bekor qilish" },
      { label: "Saqlash", cls: "ok", onClick: async (close, btn) => {
        const o = document.getElementById("cpO").value, a = document.getElementById("cpA").value, b = document.getElementById("cpB").value;
        const err = document.getElementById("cpErr");
        const prob = !o ? "Hozirgi parolni kiriting" : passwordProblem(a, b);
        if (prob) { err.textContent = prob; err.classList.remove("hidden"); return; }
        btn.disabled = true;
        try { await setNewPassword(o, a); close(); toast("Parol almashtirildi", "ok"); }
        catch (e) { err.textContent = e.message; err.classList.remove("hidden"); btn.disabled = false; }
      } },
    ],
  });
}

// ---------- Sahifa qobig'i (yon menyu + yuqori panel + bo'limlar) ----------
// initShell({ title, subtitle, profile, menu:[{id, icon, label}|{sep:true}|{href, icon, label}], sections:{id: async (el, ctx)=>{}} })
export function initShell({ title, subtitle, profile, menu, sections, defaultSection }) {
  const first = defaultSection || menu.find((m) => m.id)?.id;
  const nav = menu.map((m) => {
    if (m.sep) return '<div class="sep"></div>';
    if (m.href) return `<a href="${esc(m.href)}"><span>${m.icon || ""}</span>${esc(m.label)}</a>`;
    return `<button data-id="${esc(m.id)}"><span>${m.icon || ""}</span>${esc(m.label)}</button>`;
  }).join("");
  const initial = esc((profile.full_name || "?").trim().charAt(0).toUpperCase());
  document.body.innerHTML = `
    <div class="layout">
      <aside class="sidebar" id="sidebar">
        <div class="brand"><b>${esc(title)}</b><small>${esc(subtitle || "")}</small></div>
        <nav class="nav">${nav}</nav>
      </aside>
      <div class="main">
        <header class="topbar">
          <div class="row"><button class="menu-btn" id="menuBtn" aria-label="Menyu">☰</button><span class="muted small" id="clock"></span></div>
          <div class="userchip">
            <button id="userBtn" aria-haspopup="true"><span class="avatar">${initial}</span><span><b style="font-size:14px">${esc(profile.full_name)}</b></span></button>
            <div class="dropdown" id="userDd">
              <div><b>${esc(profile.full_name)}</b><div class="muted small">${esc(ROLE_LABEL[profile.role] || profile.role)}</div><div class="muted small">Login: ${esc(profile.login)}</div></div>
              <button class="btn secondary block sm" id="cpBtn">Parolni o'zgartirish</button>
              <button class="btn bad block sm" id="outBtn">Chiqish</button>
            </div>
          </div>
        </header>
        <main class="content" id="content"></main>
      </div>
    </div>`;
  const content = document.getElementById("content");
  const sidebar = document.getElementById("sidebar");
  const dd = document.getElementById("userDd");
  const ctx = { profile, content, navigate };
  const tick = () => { const el = document.getElementById("clock"); if (el) el.textContent = new Date().toLocaleString("uz-UZ"); };
  tick(); setInterval(tick, 30000);

  document.getElementById("menuBtn").onclick = () => sidebar.classList.toggle("open");
  document.getElementById("userBtn").onclick = (e) => { e.stopPropagation(); dd.classList.toggle("show"); };
  document.addEventListener("click", () => dd.classList.remove("show"));
  dd.addEventListener("click", (e) => e.stopPropagation());
  document.getElementById("cpBtn").onclick = () => { dd.classList.remove("show"); openChangePassword(); };
  document.getElementById("outBtn").onclick = signOutAndGo;
  sidebar.querySelectorAll("button[data-id]").forEach((b) => (b.onclick = () => navigate(b.dataset.id)));

  let navToken = 0;
  async function navigate(id) {
    if (!sections[id]) id = first;
    const token = ++navToken;
    sidebar.classList.remove("open");
    sidebar.querySelectorAll("button[data-id]").forEach((b) => b.classList.toggle("active", b.dataset.id === id));
    if (location.hash !== `#${id}`) history.replaceState(null, "", `#${id}`);
    content.innerHTML = '<div class="loading"><div class="spinner"></div>Yuklanmoqda...</div>';
    try {
      const el = document.createElement("div");
      await sections[id](el, ctx);
      if (token === navToken) { content.replaceChildren(el); window.scrollTo(0, 0); }
    } catch (e) {
      console.error(e);
      if (token === navToken) content.innerHTML = `<div class="alert err">Ma'lumotni yuklab bo'lmadi: ${esc(e.message || e)}</div><button class="btn secondary" onclick="location.reload()">Qayta urinish</button>`;
    }
  }
  navigate((location.hash || "").slice(1) || first);
  return ctx;
}

// ---------- Tasdiq muhri (data_hash) ----------
// RES rahbari tasdiqlaganda davomat (hisobot uchun rasmlar ro'yxati ham) shu funksiya bilan xeshlanadi.
// Keyin ma'lumot o'zgarsa xesh mos kelmaydi va PDF'ga pechat qo'yilmaydi.
export function scopeAttendance(attendance, period) {
  if (!period) return attendance.slice();
  return attendance.filter((a) => a.work_date >= period.starts_on && a.work_date <= period.ends_on);
}
export async function attendanceHash(rows, photoPaths = null) {
  const canon = rows
    .map((a) => [a.work_date, a.status, hm(a.time_in), hm(a.time_out), a.brigade_name || "", a.leader || "", a.task || ""])
    .sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0));
  const payload = JSON.stringify(photoPaths ? { d: canon, p: [...photoPaths].sort() } : { d: canon });
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
export function workedDays(rows) { return rows.filter((a) => a.status && a.status !== "kelmadi").length; }
export function approvalCode(approval) { return approval ? `${String(approval.id).slice(0, 8)}-${String(approval.data_hash || "").slice(0, 8)}`.toUpperCase() : ""; }

// Talaba ham, RES rahbari ham AYNAN shu funksiya bilan xesh hisoblaydi (bir xil qoida).
// kind: 'kundalik' | 'hisobot' (hisobotda rasmlar ro'yxati ham xeshga kiradi).
export async function computeApprovalHash(kind, attendance, photos, period) {
  const rows = scopeAttendance(attendance, period);
  const inScope = (d) => !period || (d >= period.starts_on && d <= period.ends_on);
  const paths = kind === "hisobot" ? photos.filter((p) => inScope(p.work_date)).map((p) => p.storage_path) : null;
  return { rows, hash: await attendanceHash(rows, paths), days: workedDays(rows) };
}

// Talabaning kursi bo'yicha joriy (yoki eng yaqin) amaliyot davri.
export function pickPeriod(periods, course, today = todayISO()) {
  const list = periods.filter((p) => p.course === course).sort((a, b) => (a.starts_on < b.starts_on ? -1 : 1));
  return list.find((p) => p.starts_on <= today && today <= p.ends_on)
    || list.find((p) => p.starts_on > today)
    || list[list.length - 1] || null;
}
