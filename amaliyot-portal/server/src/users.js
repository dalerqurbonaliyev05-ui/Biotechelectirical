// Foydalanuvchilarni to'g'ridan-to'g'ri bazada yaratish/tiklash (buyruq qatori va testlar uchun).
import { hashPassword } from "./crypto-utils.js";
import { STAFF_ROLES, generateTempPassword, normalizeStaffLogin } from "./logic.js";
import { audit } from "./auth.js";

export async function createStaffUser(db, { login, full_name, role, password }) {
  const l = normalizeStaffLogin(login);
  if (!l) throw new Error("Login harf bilan boshlanishi va 3-32 ta belgi (a-z, 0-9, . _ -) bo'lishi kerak");
  if (!STAFF_ROLES.includes(role)) throw new Error(`Rol quyidagilardan biri bo'lishi kerak: ${STAFF_ROLES.join(", ")}`);
  const name = String(full_name || "").trim();
  if (!name) throw new Error("F.I.SH kiritilmagan");
  const temp = password || generateTempPassword();
  const hash = await hashPassword(temp);
  await db.asService(async (c) => {
    if ((await c.query("select 1 from public.profiles where login = $1", [l])).rowCount) throw new Error("Bu login band");
    const p = await c.query("insert into public.profiles (login, full_name, role) values ($1,$2,$3) returning id", [l, name, role]);
    await c.query("insert into public.credentials (user_id, password_hash, must_change_password) values ($1,$2,$3)", [p.rows[0].id, hash, !password]);
    await audit(c, { actorLogin: "cli", action: "staff_created", target: l, details: { role } });
  });
  return { login: l, temp_password: temp };
}

export async function resetUserPassword(db, login) {
  const temp = generateTempPassword();
  const hash = await hashPassword(temp);
  await db.asService(async (c) => {
    const t = (await c.query("select id, login from public.profiles where login = $1", [String(login).trim().toLowerCase()])).rows[0];
    if (!t) throw new Error("Foydalanuvchi topilmadi");
    await c.query(
      `insert into public.credentials (user_id, password_hash, must_change_password) values ($1,$2,true)
       on conflict (user_id) do update set password_hash = excluded.password_hash, must_change_password = true, failed_attempts = 0, locked_until = null, password_changed_at = now()`, [t.id, hash]);
    await c.query("update public.sessions set revoked_at = now() where user_id = $1 and revoked_at is null", [t.id]);
    await audit(c, { actorLogin: "cli", action: "password_reset", target: t.login });
  });
  return { login, temp_password: temp };
}
