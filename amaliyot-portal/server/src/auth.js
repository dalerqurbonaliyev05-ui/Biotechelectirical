// Kirish, sessiyalar, parol almashtirish, talabani faollashtirish.
import { HttpError } from "./errors.js";
import { burnPasswordTime, hashPassword, randomToken, sha256, signJwt, verifyJwt, verifyPassword } from "./crypto-utils.js";
import {
  MAX_CODE_ATTEMPTS, codeUsable, hashCode, normalizeCode, normalizeHemisId, normalizeLogin, passwordError, timingSafeEqualStr,
} from "./logic.js";

const BAD_LOGIN = "Login yoki parol noto'g'ri";
const BAD_CODE = "HEMIS ID yoki faollashtirish kodi noto'g'ri";

export async function audit(c, { actorId = null, actorLogin = null, action, target = null, ip = null, details = null }) {
  await c.query(
    "insert into public.audit_log (actor_id, actor_login, action, target, ip, details) values ($1,$2,$3,$4,$5,$6)",
    [actorId, actorLogin, action, target, ip, details ? JSON.stringify(details) : null],
  );
}

export function createAuth({ db, config }) {
  const nowSec = () => Math.floor(Date.now() / 1000);

  const userView = (p, mustChange) => ({ id: p.id, login: p.login, full_name: p.full_name, role: p.role, must_change_password: !!mustChange });

  function issueAccess(userId, sid) {
    const iat = nowSec();
    const exp = iat + config.accessTtlSec;
    return { token: signJwt({ sub: userId, role: "authenticated", sid, iat, exp }, config.jwtSecret), exp };
  }

  async function createSession(c, userId, { ttlSec, userAgent, expiresAt }) {
    const refresh = randomToken(32);
    const exp = expiresAt || new Date(Date.now() + ttlSec * 1000).toISOString();
    const r = await c.query(
      "insert into public.sessions (user_id, token_hash, expires_at, user_agent) values ($1,$2,$3,$4) returning id, expires_at",
      [userId, sha256(refresh), exp, (userAgent || "").slice(0, 300)],
    );
    return { refresh, sid: r.rows[0].id, expiresAt: r.rows[0].expires_at };
  }

  async function login({ login, password, remember }, ctx) {
    const l = normalizeLogin(login);
    if (!l || typeof password !== "string" || !password || password.length > 200) {
      await burnPasswordTime(typeof password === "string" ? password.slice(0, 200) : "x");
      throw new HttpError(401, BAD_LOGIN);
    }
    const row = await db.asService(async (c) => {
      const r = await c.query(
        `select p.id, p.login, p.full_name, p.role, p.active, c.password_hash, c.must_change_password, c.failed_attempts, c.locked_until
           from public.profiles p left join public.credentials c on c.user_id = p.id where p.login = $1`, [l]);
      return r.rows[0] || null;
    });
    if (!row || !row.password_hash) {
      await burnPasswordTime(password);
      throw new HttpError(401, BAD_LOGIN);
    }
    if (row.locked_until && new Date(row.locked_until) > new Date()) {
      throw new HttpError(429, "Juda ko'p noto'g'ri urinish. Bir ozdan keyin qayta urinib ko'ring");
    }
    const ok = await verifyPassword(password, row.password_hash);
    if (!ok) {
      await db.asService(async (c) => {
        const r = await c.query(
          `update public.credentials set failed_attempts = failed_attempts + 1,
             locked_until = case when failed_attempts + 1 >= $2 then now() + make_interval(secs => $3) else locked_until end
           where user_id = $1 returning failed_attempts`, [row.id, config.loginMaxFailures, config.loginLockSec]);
        await audit(c, { actorId: row.id, actorLogin: row.login, action: "login_failed", ip: ctx.ip, details: { attempts: r.rows[0].failed_attempts } });
      });
      throw new HttpError(401, BAD_LOGIN);
    }
    if (!row.active) throw new HttpError(403, "Hisobingiz faol emas. Amaliyot rahbariga murojaat qiling");

    const sess = await db.asService(async (c) => {
      await c.query("update public.credentials set failed_attempts = 0, locked_until = null where user_id = $1", [row.id]);
      const s = await createSession(c, row.id, { ttlSec: remember ? config.refreshTtlRememberSec : config.refreshTtlSec, userAgent: ctx.userAgent });
      await audit(c, { actorId: row.id, actorLogin: row.login, action: "login", ip: ctx.ip });
      return s;
    });
    const acc = issueAccess(row.id, sess.sid);
    return { access_token: acc.token, expires_at: acc.exp, refresh_token: sess.refresh, user: userView(row, row.must_change_password) };
  }

  async function refresh({ refresh_token }, ctx) {
    if (typeof refresh_token !== "string" || refresh_token.length < 20 || refresh_token.length > 200) throw new HttpError(401, "Sessiya tugagan. Qaytadan kiring");
    const out = await db.asService(async (c) => {
      const r = await c.query(
        `select s.id, s.user_id, s.expires_at, s.revoked_at, p.login, p.full_name, p.role, p.active, cr.must_change_password
           from public.sessions s join public.profiles p on p.id = s.user_id left join public.credentials cr on cr.user_id = p.id
          where s.token_hash = $1 for update of s`, [sha256(refresh_token)]);
      const s = r.rows[0];
      if (!s) return { err: "Sessiya tugagan. Qaytadan kiring" };
      if (s.revoked_at) {
        // Bekor qilingan token qayta ishlatildi: o'g'irlangan bo'lishi mumkin. Parallel yangilash (30 s ichida) bundan mustasno.
        if (Date.now() - new Date(s.revoked_at).getTime() > 30000) {
          await c.query("update public.sessions set revoked_at = now() where user_id = $1 and revoked_at is null", [s.user_id]);
          await audit(c, { actorId: s.user_id, actorLogin: s.login, action: "refresh_reuse_detected", ip: ctx.ip });
        }
        return { err: "Sessiya tugagan. Qaytadan kiring" };
      }
      if (new Date(s.expires_at) <= new Date() || !s.active) return { err: "Sessiya tugagan. Qaytadan kiring" };
      await c.query("update public.sessions set revoked_at = now() where id = $1", [s.id]);
      // Yangi token: umumiy muddat o'zgarmaydi (mutlaq muddat).
      const ns = await createSession(c, s.user_id, { userAgent: ctx.userAgent, expiresAt: s.expires_at });
      return { s, ns };
    });
    if (out.err) throw new HttpError(401, out.err);
    const acc = issueAccess(out.s.user_id, out.ns.sid);
    return { access_token: acc.token, expires_at: acc.exp, refresh_token: out.ns.refresh, user: userView(out.s, out.s.must_change_password) };
  }

  async function logout({ refresh_token }) {
    if (typeof refresh_token === "string" && refresh_token.length >= 20) {
      await db.asService((c) => c.query("update public.sessions set revoked_at = now() where token_hash = $1 and revoked_at is null", [sha256(refresh_token)]));
    }
    return { ok: true };
  }

  // JWT'ni tekshiradi va foydalanuvchining hozirgi holatini bazadan oladi (rol/faollik JWT'ga ishonmaydi).
  const cache = new Map();
  async function authenticate(authHeader) {
    const m = /^Bearer\s+(.+)$/i.exec(authHeader || "");
    const claims = m && verifyJwt(m[1], config.jwtSecret);
    if (!claims || !claims.sub) throw new HttpError(401, "Avval tizimga kiring");
    const hit = cache.get(claims.sub);
    let prof = hit && hit.until > Date.now() ? hit.prof : null;
    if (!prof) {
      prof = await db.asService(async (c) => (await c.query("select id, login, full_name, role, active from public.profiles where id = $1", [claims.sub])).rows[0] || null);
      cache.set(claims.sub, { prof, until: Date.now() + 3000 }); // 3 soniyalik kesh: faolsizlantirish deyarli darhol kuchga kiradi
      if (cache.size > 5000) cache.clear();
    }
    if (!prof || !prof.active) throw new HttpError(401, "Hisobingiz faol emas yoki topilmadi");
    return { claims: { sub: claims.sub, role: "authenticated" }, sid: claims.sid, profile: prof };
  }
  const forget = (userId) => cache.delete(userId);

  async function me(userId) {
    return db.asService(async (c) => {
      const r = await c.query("select p.id, p.login, p.full_name, p.role, cr.must_change_password from public.profiles p left join public.credentials cr on cr.user_id = p.id where p.id = $1", [userId]);
      return r.rows[0] ? userView(r.rows[0], r.rows[0].must_change_password) : null;
    });
  }

  async function changePassword({ userId, sid, current_password, new_password }, ctx) {
    const prob = passwordError(new_password);
    if (prob) throw new HttpError(400, prob);
    if (typeof current_password !== "string" || !current_password) throw new HttpError(400, "Hozirgi parolni kiriting");
    if (current_password === new_password) throw new HttpError(400, "Yangi parol eskisidan farq qilishi kerak");
    const hash = await hashPassword(new_password);
    await db.asService(async (c) => {
      const r = await c.query("select p.login, cr.password_hash from public.profiles p join public.credentials cr on cr.user_id = p.id where p.id = $1 for update of cr", [userId]);
      if (!r.rows[0]) throw new HttpError(404, "Foydalanuvchi topilmadi");
      if (!(await verifyPassword(current_password, r.rows[0].password_hash))) throw new HttpError(400, "Hozirgi parol noto'g'ri");
      await c.query("update public.credentials set password_hash = $2, must_change_password = false, password_changed_at = now(), failed_attempts = 0, locked_until = null where user_id = $1", [userId, hash]);
      // Boshqa qurilmalardagi sessiyalar yopiladi (joriysi qoladi).
      await c.query("update public.sessions set revoked_at = now() where user_id = $1 and revoked_at is null and id <> $2", [userId, sid || "00000000-0000-0000-0000-000000000000"]);
      await audit(c, { actorId: userId, actorLogin: r.rows[0].login, action: "password_changed", ip: ctx.ip });
    });
    return { ok: true };
  }

  // Talabani faollashtirish: HEMIS ID + bir martalik kod + parol. Bir xil xato xabari: ID'larni terib chiqib bo'lmasin.
  async function activate({ hemis_id, code, password }, ctx) {
    const hemisId = normalizeHemisId(hemis_id);
    const codeN = normalizeCode(code);
    if (!hemisId || codeN.length !== 8) throw new HttpError(400, BAD_CODE);
    const pwErr = passwordError(password); // parol xatosi urinish hisoblanmasidan OLDIN
    if (pwErr) throw new HttpError(400, pwErr);

    const st = await db.asService(async (c) => (await c.query(
      `select s.id, s.full_name, s.profile_id, s.active, a.code_hash, a.expires_at, a.used_at
         from public.students s left join public.activation_codes a on a.student_id = s.id where s.hemis_id = $1`, [hemisId])).rows[0]);
    if (!st || !st.active) throw new HttpError(400, BAD_CODE);
    if (st.profile_id) throw new HttpError(409, "Hisob allaqachon faollashtirilgan. Tizimga kiring");
    if (!codeUsable(st.code_hash ? st : null)) throw new HttpError(400, "Faollashtirish kodi yo'q yoki muddati o'tgan. O'qituvchidan yangi kod so'rang");

    // Urinish AVVAL (alohida tranzaksiyada) hisoblanadi: xato kod ham qayd etiladi, parallel so'rovlar bilan aylanib o'tib bo'lmaydi.
    const attempts = await db.asService(async (c) => (await c.query(
      "update public.activation_codes set attempts = least(attempts + 1, 100) where student_id = $1 and used_at is null returning attempts", [st.id])).rows[0]?.attempts);
    if (attempts === undefined) throw new HttpError(409, "Kod allaqachon ishlatilgan");
    if (attempts > MAX_CODE_ATTEMPTS) throw new HttpError(429, "Urinishlar soni tugadi. O'qituvchidan yangi kod so'rang");
    if (!timingSafeEqualStr(hashCode(codeN, hemisId, config.activationPepper), st.code_hash)) {
      throw new HttpError(400, BAD_CODE, { attempts_left: MAX_CODE_ATTEMPTS - attempts });
    }

    const hash = await hashPassword(password);
    await db.asService(async (c) => {
      // Hammasi bir tranzaksiyada: yarim yo'lda to'xtasa hech narsa qolmaydi (kod ham ishlatilmagan bo'lib qoladi).
      const claim = await c.query("update public.activation_codes set used_at = now() where student_id = $1 and used_at is null returning student_id", [st.id]);
      if (claim.rowCount === 0) throw new HttpError(409, "Kod allaqachon ishlatilgan");
      const p = await c.query("insert into public.profiles (login, full_name, role) values ($1,$2,'student') returning id", [hemisId, st.full_name]);
      await c.query("insert into public.credentials (user_id, password_hash, must_change_password) values ($1,$2,false)", [p.rows[0].id, hash]);
      const link = await c.query("update public.students set profile_id = $1 where id = $2 and profile_id is null returning id", [p.rows[0].id, st.id]);
      if (link.rowCount === 0) throw new HttpError(409, "Hisob allaqachon faollashtirilgan. Tizimga kiring");
      await audit(c, { actorId: p.rows[0].id, actorLogin: hemisId, action: "student_activated", ip: ctx.ip });
    });
    return { ok: true, login: hemisId };
  }

  return { login, refresh, logout, authenticate, forget, me, changePassword, activate };
}
