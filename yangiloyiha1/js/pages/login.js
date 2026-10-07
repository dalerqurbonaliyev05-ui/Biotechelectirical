// login.html sahifasi mantig'i (alohida fayl: CSP inline skriptga ruxsat bermaydi).
import { sb, ROLE_HOME, loginToEmail, loadProfile, callFn, passwordProblem, setNewPassword, signOutAndGo, setRemember } from "../app.js";

const $ = (id) => document.getElementById(id);
const msg = $("msg");
function say(text, kind = "err") { msg.textContent = text; msg.className = `alert ${kind === "ok" ? "okk" : kind}`; }
function clearMsg() { msg.className = "alert hidden"; }
function busy(btn, on, label) { btn.disabled = on; if (label) btn.textContent = on ? "Kuting..." : label; }

// 👁 tugmalari
document.querySelectorAll(".eye").forEach((b) => b.addEventListener("click", () => {
  const inp = $(b.dataset.for); inp.type = inp.type === "password" ? "text" : "password";
}));

// Tablar
function showTab(which) {
  clearMsg();
  $("tabLogin").classList.toggle("active", which === "login");
  $("tabActivate").classList.toggle("active", which === "activate");
  $("loginForm").classList.toggle("hidden", which !== "login");
  $("activateForm").classList.toggle("hidden", which !== "activate");
  $("subtitle").textContent = which === "login" ? "Tizimga kirish" : "Talabani faollashtirish";
}
$("tabLogin").onclick = () => showTab("login");
$("tabActivate").onclick = () => showTab("activate");

function showChange() {
  $("mainView").classList.add("hidden"); $("changeForm").classList.remove("hidden");
  $("subtitle").textContent = "Yangi parol o'rnatish";
}

// Kirgandan keyin: faollikni tekshirish -> parol almashtirish -> o'z sahifasiga
async function afterSignIn(user) {
  let profile;
  try { profile = await loadProfile(user.id); } catch { profile = null; }
  if (!profile || !profile.active) {
    await sb.auth.signOut();
    throw new Error("Hisobingiz faol emas yoki topilmadi. Amaliyot rahbariga murojaat qiling.");
  }
  if (user.user_metadata?.must_change_password) { showChange(); return; }
  location.replace(ROLE_HOME[profile.role] || "login.html");
}

async function signIn(login, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email: loginToEmail(login), password });
  if (error) {
    if (/invalid login|credentials/i.test(error.message)) throw new Error("Login yoki parol noto'g'ri");
    if (/rate|too many/i.test(error.message)) throw new Error("Juda ko'p urinish. Bir ozdan keyin qayta urinib ko'ring");
    if (/banned/i.test(error.message)) throw new Error("Hisobingiz bloklangan. Amaliyot rahbariga murojaat qiling.");
    throw new Error("Kirib bo'lmadi: " + error.message);
  }
  return data.user;
}

$("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault(); clearMsg();
  const login = $("login").value.trim(), password = $("password").value;
  if (!login || !password) return say("Login va parolni kiriting");
  busy($("loginBtn"), true, "Kirish");
  setRemember($("remember").checked); // sessiya qayerda saqlanishini kirishdan OLDIN belgilaymiz
  try { await afterSignIn(await signIn(login, password)); }
  catch (err) { say(err.message); }
  busy($("loginBtn"), false, "Kirish");
});

$("activateForm").addEventListener("submit", async (e) => {
  e.preventDefault(); clearMsg();
  const hemis = $("aHemis").value.trim(), code = $("aCode").value.trim();
  const p1 = $("aPass").value, p2 = $("aPass2").value;
  if (!/^\d{6,20}$/.test(hemis)) return say("HEMIS ID faqat raqamlardan iborat bo'lishi kerak");
  if (code.replace(/[\s-]/g, "").length !== 8) return say("Faollashtirish kodi 8 ta belgidan iborat (XXXX-XXXX)");
  const prob = passwordProblem(p1, p2);
  if (prob) return say(prob);
  busy($("activateBtn"), true, "Faollashtirish va kirish");
  setRemember($("aRemember").checked);
  try {
    await callFn("activate-student", { hemis_id: hemis, code, password: p1 }, { auth: false });
    await afterSignIn(await signIn(hemis, p1));
  } catch (err) {
    let text = err.message;
    if (err.data && typeof err.data.attempts_left === "number") text += ` (qolgan urinishlar: ${err.data.attempts_left})`;
    say(text);
  }
  busy($("activateBtn"), false, "Faollashtirish va kirish");
});

$("changeForm").addEventListener("submit", async (e) => {
  e.preventDefault(); clearMsg();
  const p1 = $("cPass").value, p2 = $("cPass2").value;
  const prob = passwordProblem(p1, p2);
  if (prob) return say(prob);
  busy($("changeBtn"), true, "Parolni saqlash");
  try {
    await setNewPassword(p1);
    // Yangi metadata bilan sessiyani yangilab, o'z sahifasiga o'tamiz
    const { data: { user } } = await sb.auth.getUser();
    const profile = await loadProfile(user.id);
    location.replace(ROLE_HOME[profile.role] || "login.html");
  } catch (err) { say(err.message); busy($("changeBtn"), false, "Parolni saqlash"); }
});
$("changeOut").onclick = signOutAndGo;

// Sahifa ochilganda: allaqachon kirgan bo'lsa yo'naltirish
(async () => {
  const q = new URLSearchParams(location.search);
  if (q.get("x") === "inactive") say("Hisobingiz faol emas yoki topilmadi. Amaliyot rahbariga murojaat qiling.");
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return;
  try {
    if (q.get("change") === "1" || session.user.user_metadata?.must_change_password) { showChange(); return; }
    const profile = await loadProfile(session.user.id);
    if (profile && profile.active) location.replace(ROLE_HOME[profile.role] || "login.html");
  } catch { /* kirish formasi ko'rinib turadi */ }
})();
