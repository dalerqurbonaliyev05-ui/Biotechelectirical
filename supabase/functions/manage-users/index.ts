// Foydalanuvchilarni boshqarish (faqat kirgan admin / amaliyot rahbari).
//
// So'rov:  POST { action, ... }
//   create_staff   { login, full_name, role }   (admin)   -> { login, temp_password }
//   reset_password { login }                    (admin: hammaga; amaliyot rahbari: faqat talabaga) -> { login, temp_password }
//   set_active     { login, active }            (admin)   -> { login, active }
//
// Vaqtinchalik parol faqat shu javobda, bir marta ko'rsatiladi. Foydalanuvchi birinchi kirishda
// uni almashtirishga majbur (user_metadata.must_change_password).
import { adminClient, corsHeaders, getCaller, json, readJson } from "../_shared/server.ts";
import {
  type AnyRole,
  canManage,
  generateTempPassword,
  type ManageAction,
  normalizeStaffLogin,
  staffEmail,
  STAFF_ROLES,
} from "../_shared/logic.ts";

const ACTIONS: ManageAction[] = ["create_staff", "reset_password", "set_active"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Faqat POST" }, 405);

  const admin = adminClient();
  const caller = await getCaller(req, admin);
  if (!caller) return json({ error: "Avval tizimga kiring" }, 401);

  const body = await readJson(req);
  const action = body?.action as ManageAction;
  if (!body || !ACTIONS.includes(action)) return json({ error: "Noma'lum amal" }, 400);

  // ---------- Xodim yaratish ----------
  if (action === "create_staff") {
    const role = String(body.role ?? "") as AnyRole;
    if (!(STAFF_ROLES as string[]).includes(role)) return json({ error: "Rol noto'g'ri" }, 400);
    if (!canManage(caller.role, role, action)) return json({ error: "Bu amal uchun ruxsat yo'q" }, 403);
    const login = normalizeStaffLogin(body.login);
    if (!login) return json({ error: "Login harf bilan boshlanishi va 3-32 ta belgi (a-z, 0-9, . _ -) bo'lishi kerak" }, 400);
    const fullName = String(body.full_name ?? "").trim().slice(0, 200);
    if (!fullName) return json({ error: "F.I.SH kiritilmagan" }, 400);

    const { data: dup } = await admin.from("profiles").select("id").eq("login", login).maybeSingle();
    if (dup) return json({ error: "Bu login band" }, 409);

    const temp = generateTempPassword();
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email: staffEmail(login),
      password: temp,
      email_confirm: true,
      user_metadata: { full_name: fullName, must_change_password: true },
    });
    if (cErr || !created?.user) {
      console.error("create_staff createUser:", cErr?.message);
      return json({ error: "Hisob yaratib bo'lmadi" }, 500);
    }
    const { error: pErr } = await admin.from("profiles")
      .insert({ id: created.user.id, login, full_name: fullName, role });
    if (pErr) {
      console.error("create_staff profiles:", pErr.message);
      await admin.auth.admin.deleteUser(created.user.id);
      return json({ error: "Hisob yaratib bo'lmadi" }, 500);
    }
    return json({ ok: true, login, temp_password: temp });
  }

  // ---------- Parol tiklash / faolsizlantirish: nishon foydalanuvchini topamiz ----------
  const login = String(body.login ?? "").trim().toLowerCase();
  if (!login) return json({ error: "Login kiritilmagan" }, 400);
  const { data: target, error: tErr } = await admin.from("profiles")
    .select("id, role, login").eq("login", login).maybeSingle();
  if (tErr) return json({ error: "Server xatosi" }, 500);
  // Ruxsat bo'lmasa ham, mavjud emasligini ham bir xil aytamiz (403): login terib chiqilmasin.
  if (!target || !canManage(caller.role, target.role as AnyRole, action)) {
    return json({ error: "Bu amal uchun ruxsat yo'q yoki foydalanuvchi topilmadi" }, 403);
  }
  if (target.id === caller.userId && action === "set_active") {
    return json({ error: "O'z hisobingizni o'chira olmaysiz" }, 400);
  }

  if (action === "reset_password") {
    const temp = generateTempPassword();
    const { data: u, error: gErr } = await admin.auth.admin.getUserById(target.id);
    if (gErr || !u?.user) return json({ error: "Server xatosi" }, 500);
    const { error: uErr } = await admin.auth.admin.updateUserById(target.id, {
      password: temp,
      user_metadata: { ...(u.user.user_metadata ?? {}), must_change_password: true },
    });
    if (uErr) {
      console.error("reset_password:", uErr.message);
      return json({ error: "Parolni almashtirib bo'lmadi" }, 500);
    }
    await admin.rpc("revoke_user_sessions", { p_user: target.id });
    return json({ ok: true, login: target.login, temp_password: temp });
  }

  // set_active
  const active = body.active === true;
  const { error: aErr } = await admin.from("profiles").update({ active }).eq("id", target.id);
  if (aErr) return json({ error: "Server xatosi" }, 500);
  if (!active) await admin.rpc("revoke_user_sessions", { p_user: target.id });
  return json({ ok: true, login: target.login, active });
});
