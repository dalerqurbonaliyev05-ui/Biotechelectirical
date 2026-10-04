// login.html sahifasi mantig'i (alohida fayl: CSP inline skriptga ruxsat bermaydi).
import { sb, signInWithGoogle } from "../app.js";

const $ = (id) => document.getElementById(id);
const msg = $("msg");
function show(text, cls = "err") { msg.className = `alert ${cls}`; msg.textContent = text; }

const x = new URLSearchParams(location.search).get("x");
if (x === "denied") show("Bu hisob administrator emas. Boshqa hisob bilan kiring.");
if (x === "error") show("Ruxsatni tekshirib bo'lmadi. Bazada schema.sql qo'llanganini tekshiring.");

// Allaqachon kirgan admin: to'g'ridan-to'g'ri panelga (rad etilgan bo'lsa, qayta aylanib qolmaslik uchun x yo'q bo'lganda)
if (!x) {
  const { data: { session } } = await sb.auth.getSession();
  if (session) location.replace("admin_panel.html");
}

$("eye").onclick = () => { const p = $("password"); p.type = p.type === "password" ? "text" : "password"; };

$("googleBtn").onclick = async (e) => {
  e.target.disabled = true;
  try { await signInWithGoogle(); }
  catch (err) { show("Google orqali kirib bo'lmadi: " + err.message); e.target.disabled = false; }
};

$("loginForm").onsubmit = async (e) => {
  e.preventDefault();
  const btn = $("loginBtn"); btn.disabled = true;
  const { error } = await sb.auth.signInWithPassword({ email: $("email").value.trim(), password: $("password").value });
  if (error) { show(/invalid/i.test(error.message) ? "Email yoki parol noto'g'ri" : error.message); btn.disabled = false; return; }
  location.replace("admin_panel.html");
};
