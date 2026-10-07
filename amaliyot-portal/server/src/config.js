// Sozlamalar muhit o'zgaruvchilaridan olinadi (.env.example ga qarang). Maxfiy qiymatlar kodda saqlanmaydi.
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

export function loadConfig(overrides = {}) {
  const e = { ...process.env, ...overrides };
  const need = (name) => {
    if (!e[name]) throw new Error(`${name} muhit o'zgaruvchisi berilmagan (.env faylini tekshiring)`);
    return e[name];
  };
  const jwtSecret = need("JWT_SECRET");
  if (jwtSecret.length < 32) throw new Error("JWT_SECRET kamida 32 belgi bo'lishi kerak (openssl rand -hex 32)");
  const num = (name, dflt) => { const v = e[name] === undefined || e[name] === "" ? dflt : Number(e[name]); if (!Number.isFinite(v)) throw new Error(`${name} son bo'lishi kerak`); return v; };
  return {
    port: num("PORT", 8080),
    databaseUrl: need("DATABASE_URL"),
    jwtSecret,
    // Faollashtirish kodlari xeshi uchun alohida kalit; berilmasa JWT_SECRET'dan hosil qilinadi.
    activationPepper: e.ACTIVATION_PEPPER || crypto.createHmac("sha256", jwtSecret).update("activation-pepper").digest("hex"),
    dataDir: path.resolve(e.DATA_DIR || "./data"),
    webDir: path.resolve(e.WEB_DIR || path.join(here, "../../web")),
    // Teskari proksi (nginx/Caddy) ortida bo'lsa 1: IP manzillar X-Forwarded-For dan olinadi.
    trustProxy: e.TRUST_PROXY === "1",
    // HTTPS ostida ishlayotgan bo'lsa 1: HSTS sarlavhasi yoqiladi.
    hsts: e.HSTS === "1",
    accessTtlSec: num("ACCESS_TTL_SEC", 30 * 60),
    refreshTtlSec: num("REFRESH_TTL_SEC", 12 * 3600),
    refreshTtlRememberSec: num("REFRESH_TTL_REMEMBER_SEC", 30 * 24 * 3600),
    maxPhotoBytes: num("MAX_PHOTO_BYTES", 5 * 1024 * 1024),
    // Kirishda ketma-ket xato urinishlar chegarasi va bloklash vaqti.
    loginMaxFailures: num("LOGIN_MAX_FAILURES", 10),
    loginLockSec: num("LOGIN_LOCK_SEC", 15 * 60),
    // So'rovlar chegarasi (bitta IP uchun, daqiqada).
    rateLimitAuthPerMin: num("RATE_LIMIT_AUTH_PER_MIN", 20),
    rateLimitApiPerMin: num("RATE_LIMIT_API_PER_MIN", 600),
    logRequests: e.LOG_REQUESTS !== "0",
  };
}
