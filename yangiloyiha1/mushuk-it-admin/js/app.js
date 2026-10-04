// Umumiy modul: Supabase ulanishi, admin tekshiruvi, interfeys yordamchilari (Amaliyot admin panelidagi bilan bir xil qobiq).
// Supabase kutubxonasi sahifada ./vendor/supabase-js.umd.js orqali (global `supabase`) yuklanadi.
import { SUPABASE_URL, SUPABASE_KEY } from "./config.js";

export const BUCKET = "animal-photos";
const NEVER = new Promise(() => {});

function fatal(html) {
  document.body.innerHTML = `<div class="auth-wrap"><div class="card auth-card">${html}</div></div>`;
  throw new Error("Sozlama xatosi");
}
if (!SUPABASE_URL || !SUPABASE_KEY) {
  fatal('<h3>Supabase sozlanmagan</h3><p class="muted">Ochiq <code>js/config.js</code> faylida <code>SUPABASE_URL</code> va <code>SUPABASE_KEY</code> qiymatlarini kiriting (README\'ga qarang).</p>');
}
if (!window.supabase || !window.supabase.createClient) {
  fatal("<p>Supabase kutubxonasi yuklanmadi (vendor/supabase-js.umd.js). Sahifani yangilang.</p>");
}
// PKCE: Google'dan qaytishda URL'da ?code=..., supabase-js uni o'zi almashtiradi va URL'ni tozalaydi.
export const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" },
});

// ---------- Ikonkalar (inline SVG; tashqi kutubxonasiz) ----------
const IC = {
  home: "M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10",
  image: "M4 5h16v14H4V5zM4 16l5-5 4 4 3-3 4 4M9 9.5a1 1 0 1 0 0-.01",
  users: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14.5c2.5.6 4 2.3 4 5.5",
  comment: "M4 5h16v11H9l-5 4V5z",
  heart: "M12 20S4 14.5 4 9a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 5.5-8 11-8 11z",
  map: "M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14",
  mail: "M3 6h18v12H3V6zM3 7l9 7 9-7",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14.2 3h-4l-.4 2.7a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2l.4 2.7h4l.4-2.7a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 4-6 8-6s8 2 8 6",
  pin: "M12 21s7-6 7-12a7 7 0 1 0-14 0c0 6 7 12 7 12zM12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  alert: "M12 4l9 16H3L12 4zM12 10v4M12 17v.01",
};
export function icon(name, size = 20) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${IC[name] || ""}"/></svg>`;
}

// ---------- Kirish ----------
export function pageUrl(name) { return new URL(name, location.href).href; }

export async function signInWithGoogle() {
  const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: pageUrl("admin_panel.html") } });
  if (error) throw error;
}

// Sahifa himoyasi: kirmagan -> login; admin bo'lmagan -> chiqarib yuboradi. Faqat admin uchun davom etadi.
export async function requireAdmin() {
  const { data: { session } } = await sb.auth.getSession();   // OAuth qaytishida kodni ham shu yerda almashtiradi
  if (!session) { location.replace("login.html"); return NEVER; }
  const { data, error } = await sb.rpc("is_admin");
  if (error) { await sb.auth.signOut(); location.replace("login.html?x=error"); return NEVER; }
  if (data !== true) { await sb.auth.signOut(); location.replace("login.html?x=denied"); return NEVER; }
  const u = session.user, m = u.user_metadata || {};
  return { session, user: u, profile: { full_name: m.full_name || m.name || u.email || "Admin", email: u.email || "", avatar_url: m.avatar_url || m.picture || "" } };
}

export async function signOutAndGo() {
  try { await sb.auth.signOut(); } catch { /* baribir chiqamiz */ }
  location.replace("login.html");
}

// ---------- Matn, sana, format ----------
export function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
const p2 = (n) => String(n).padStart(2, "0");
export function todayISO(d = new Date()) { return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; }
export function nowHM(d = new Date()) { return `${p2(d.getHours())}:${p2(d.getMinutes())}`; }
export function fmtDate(iso) { if (!iso) return "—"; const [y, m, d] = String(iso).slice(0, 10).split("-"); return `${d}.${m}.${y}`; }
export function fmtDateTime(ts) { if (!ts) return "—"; const d = new Date(ts); return `${fmtDate(todayISO(d))} ${nowHM(d)}`; }
export function debounce(fn, ms = 300) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
export function mapsUrl(lat, lng) { return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`; }
export function coords(lat, lng) { return `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`; }
export const ANIMAL = { cat: { icon: "🐱", label: "Mushuk" }, dog: { icon: "🐶", label: "It" } };
export function animalBadge(t) { const a = ANIMAL[t] || { icon: "🐾", label: t }; return `<span class="badge info">${a.icon} ${esc(a.label)}</span>`; }
export function postStatusBadge(s) { return s === "blocked" ? '<span class="badge bad">Bloklangan</span>' : '<span class="badge ok">Faol</span>'; }
// Faqat Supabase Storage'dagi rasm havolasini rasm sifatida ko'rsatamiz (boshqa havola bo'lsa — bo'sh).
export function safeImg(url) { return /^https:\/\/[^/]+\/storage\/v1\/object\/public\//.test(String(url || "")) ? url : ""; }
export function storagePath(url) { const m = String(url || "").match(new RegExp(`/object/public/${BUCKET}/(.+)$`)); return m ? decodeURIComponent(m[1]) : null; }
export function cleanFilter(q) { return String(q || "").replace(/[,()*%\\:]/g, " ").trim(); }

// ---------- Xabarlar, modal ----------
export function toast(msg, type = "") {
  let box = document.getElementById("toasts");
  if (!box) { box = document.createElement("div"); box.id = "toasts"; document.body.appendChild(box); }
  const t = document.createElement("div");
  t.className = `toast ${type}`; t.textContent = msg; t.setAttribute("role", "status");
  box.appendChild(t);
  setTimeout(() => t.remove(), type === "err" ? 7000 : 4000);
}

// openModal({title, html, actions:[{label, cls, onClick(close, btn)}]}) -> {close, el}
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

// Sabab so'raydigan modal: null (bekor) yoki matn (bo'sh bo'lishi mumkin) qaytaradi.
export function promptModal(title, text, okLabel = "Bloklash", cls = "bad") {
  return new Promise((resolve) => {
    openModal({
      title, html: `<p class="muted">${esc(text)}</p><label class="field"><span>Sabab (ixtiyoriy)</span><input type="text" id="pmReason" maxlength="300" placeholder="Masalan: spam, nomaqbul rasm"></label>`,
      actions: [
        { label: "Bekor qilish", onClick: (close) => { close(); resolve(null); } },
        { label: okLabel, cls, onClick: (close) => { const v = document.getElementById("pmReason").value.trim(); close(); resolve(v); } },
      ],
    });
  });
}

export function showImage(url, caption = "") {
  const src = safeImg(url);
  if (!src) return;
  openModal({ title: "Rasm", html: `<img class="lightbox" src="${esc(src)}" alt="">${caption ? `<p class="muted small center mt">${esc(caption)}</p>` : ""}`, actions: [{ label: "Yopish" }] });
}

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

// ---------- Storage fayllarini o'chirish ----------
// Har bir postning asl rasmi va kichik nusxasi (<uuid>_t.jpg) ham o'chiriladi.
export async function removePhotos(urls) {
  const paths = urls.flatMap((u) => [storagePath(u), storagePath(String(u).replace(/\.jpg$/, "_t.jpg"))]).filter(Boolean);
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await sb.storage.from(BUCKET).remove(paths.slice(i, i + 100));
    if (error) throw error;
  }
}

// ---------- Sahifa qobig'i (yon menyu + yuqori panel + bo'limlar) ----------
// initShell({ title, subtitle, profile, menu:[{id, icon, label}|{sep:true}|{href, icon, label}], sections:{id: async (el, ctx)=>{}} })
export function initShell({ title, subtitle, profile, menu, sections, defaultSection }) {
  const first = defaultSection || menu.find((m) => m.id)?.id;
  const nav = menu.map((m) => {
    if (m.sep) return '<div class="sep"></div>';
    if (m.href) return `<a href="${esc(m.href)}"><span class="ico">${m.icon || ""}</span>${esc(m.label)}</a>`;
    return `<button data-id="${esc(m.id)}"><span class="ico">${m.icon || ""}</span><span class="lbl">${esc(m.label)}</span><i class="nbadge hidden" data-badge="${esc(m.id)}"></i></button>`;
  }).join("");
  const initial = esc((profile.full_name || "?").trim().charAt(0).toUpperCase());
  document.body.innerHTML = `
    <div class="layout">
      <aside class="sidebar" id="sidebar">
        <div class="brand"><img src="assets/logo.svg" alt="" width="40" height="40"><div><b>${esc(title)}</b><small>${esc(subtitle || "")}</small></div></div>
        <nav class="nav">${nav}</nav>
      </aside>
      <div class="main">
        <header class="topbar">
          <div class="row"><button class="menu-btn" id="menuBtn" aria-label="Menyu">☰</button><span class="muted small" id="clock"></span></div>
          <div class="userchip">
            <button id="userBtn" aria-haspopup="true"><span class="avatar">${initial}</span><span><b style="font-size:14px">${esc(profile.full_name)}</b></span></button>
            <div class="dropdown" id="userDd">
              <div><b>${esc(profile.full_name)}</b><div class="muted small">Administrator</div><div class="muted small">${esc(profile.email)}</div></div>
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
  // Yon menyudagi nishon: n bo'sh/0 bo'lsa yashiriladi; cls "red" — diqqat talab qiladi (masalan, yangi xabarlar).
  function setBadge(id, n, cls = "") {
    const b = sidebar.querySelector(`[data-badge="${id}"]`);
    if (!b) return;
    b.textContent = n > 999 ? "999+" : String(n);
    b.className = `nbadge ${cls}${n ? "" : " hidden"}`;
  }
  const ctx = { profile, content, navigate, setBadge };
  const tick = () => { const el = document.getElementById("clock"); if (el) el.textContent = new Date().toLocaleString("uz-UZ"); };
  tick(); setInterval(tick, 30000);

  document.getElementById("menuBtn").onclick = () => sidebar.classList.toggle("open");
  document.getElementById("userBtn").onclick = (e) => { e.stopPropagation(); dd.classList.toggle("show"); };
  document.addEventListener("click", () => dd.classList.remove("show"));
  dd.addEventListener("click", (e) => e.stopPropagation());
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
      if (token === navToken) {
        content.innerHTML = `<div class="alert err">Ma'lumotni yuklab bo'lmadi: ${esc(e.message || e)}</div><button class="btn secondary" id="retryBtn">Qayta urinish</button>`;
        document.getElementById("retryBtn").onclick = () => navigate(id);   // inline onclick CSP tomonidan bloklanadi
      }
    }
  }
  navigate((location.hash || "").slice(1) || first);
  return ctx;
}
