// Amaliyot portali serveri: API + statik sahifalar (bitta jarayon).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "./config.js";
import { createDb } from "./db.js";
import { createAuth } from "./auth.js";
import { createAdmin } from "./admin.js";
import { createGateway, loadCatalog } from "./gateway.js";
import { createStorage } from "./storage.js";
import { createRateLimiter } from "./ratelimit.js";
import { HttpError } from "./errors.js";

const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon", ".json": "application/json", ".txt": "text/plain; charset=utf-8",
};

export async function createApp(config, { db: injectedDb } = {}) {
  const db = injectedDb || createDb(config.databaseUrl);
  const catalog = await loadCatalog(db);
  const auth = createAuth({ db, config });
  const admin = createAdmin({ db, config, auth });
  const gateway = createGateway({ db, catalog });
  const storage = createStorage({ db, config });
  const limiter = createRateLimiter();

  const secHeaders = () => {
    const h = {
      "Content-Security-Policy": CSP, "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Referrer-Policy": "no-referrer",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()", "Cross-Origin-Opener-Policy": "same-origin",
    };
    if (config.hsts) h["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
    return h;
  };
  const clientIp = (req) => {
    if (config.trustProxy) { const f = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim(); if (f) return f; }
    return req.socket.remoteAddress || "";
  };
  const send = (res, status, body, extra = {}) => {
    const data = Buffer.from(JSON.stringify(body));
    res.writeHead(status, { ...secHeaders(), "Content-Type": "application/json; charset=utf-8", "Content-Length": data.length, "Cache-Control": "no-store", ...extra });
    res.end(data);
  };
  const readBody = (req, limit) => new Promise((resolve, reject) => {
    const len = Number(req.headers["content-length"] || 0);
    if (len > limit) { req.resume(); return reject(new HttpError(413, "So'rov juda katta")); }
    const chunks = []; let n = 0;
    req.on("data", (c) => { n += c.length; if (n > limit) { req.destroy(); reject(new HttpError(413, "So'rov juda katta")); } else chunks.push(c); });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
  const readJson = async (req, limit = 1024 * 1024) => {
    const buf = await readBody(req, limit);
    if (!buf.length) return {};
    try { const v = JSON.parse(buf.toString("utf8")); if (v === null || typeof v !== "object" || Array.isArray(v)) throw 0; return v; } catch { throw new HttpError(400, "JSON noto'g'ri"); }
  };
  const ensureLimit = (key, limit) => { const r = limiter(key, limit); if (!r.ok) throw new HttpError(429, "Juda ko'p so'rov. Bir ozdan keyin urinib ko'ring", { retry_after: r.retryAfterSec }); };

  async function api(req, res, url) {
    const ip = clientIp(req), ua = String(req.headers["user-agent"] || "");
    const ctx = { ip, userAgent: ua };
    const p = url.pathname, m = req.method;
    if (p === "/api/health") {
      await db.asService((c) => c.query("select 1"));
      return send(res, 200, { ok: true });
    }
    const isAuthRoute = p.startsWith("/api/auth/") && ["/api/auth/login", "/api/auth/refresh", "/api/auth/activate"].includes(p);
    ensureLimit(`${isAuthRoute ? "auth" : "api"}:${ip}`, isAuthRoute ? config.rateLimitAuthPerMin : config.rateLimitApiPerMin);

    // ----- kirishsiz yo'llar -----
    if (m === "POST" && p === "/api/auth/login") return send(res, 200, await auth.login(await readJson(req, 16 * 1024), ctx));
    if (m === "POST" && p === "/api/auth/refresh") return send(res, 200, await auth.refresh(await readJson(req, 16 * 1024), ctx));
    if (m === "POST" && p === "/api/auth/logout") return send(res, 200, await auth.logout(await readJson(req, 16 * 1024)));
    if (m === "POST" && p === "/api/auth/activate") return send(res, 200, await auth.activate(await readJson(req, 16 * 1024), ctx));
    if (m === "GET" && p === "/api/storage/file") return storage.serve(url.searchParams, res);

    // ----- kirgan foydalanuvchi -----
    const who = await auth.authenticate(req.headers.authorization);
    if (m === "GET" && p === "/api/auth/me") return send(res, 200, { user: await auth.me(who.profile.id) });
    if (m === "POST" && p === "/api/auth/change-password") {
      const b = await readJson(req, 16 * 1024);
      return send(res, 200, await auth.changePassword({ userId: who.profile.id, sid: who.sid, current_password: b.current_password, new_password: b.new_password }, ctx));
    }
    if (m === "POST" && p === "/api/db") {
      try { return send(res, 200, await gateway.execute(who.claims, await readJson(req, 2 * 1024 * 1024))); }
      catch (e) {
        if (e instanceof HttpError) return send(res, e.status, { data: null, error: { message: e.message, ...e.extra } });
        throw e;
      }
    }
    const sp = /^\/api\/storage\/practice-photos\/(.+)$/.exec(p);
    if (sp && m === "PUT") return send(res, 200, await storage.upload(who.claims, decodeURIComponent(sp[1]), await readBody(req, config.maxPhotoBytes + 1024)));
    if (sp && m === "DELETE") return send(res, 200, await storage.remove(who.claims, who.profile, decodeURIComponent(sp[1])));
    if (m === "POST" && p === "/api/storage/sign") {
      const b = await readJson(req, 256 * 1024);
      return send(res, 200, { data: await storage.sign(who.claims, b.paths, b.ttl) });
    }
    if (m === "POST" && p === "/api/admin/users") {
      const b = await readJson(req, 16 * 1024);
      if (b.action === "create_staff") return send(res, 200, await admin.createStaff(who.profile, b, ctx));
      if (b.action === "reset_password") return send(res, 200, await admin.resetPassword(who.profile, b, ctx));
      if (b.action === "set_active") return send(res, 200, await admin.setActive(who.profile, b, ctx));
      throw new HttpError(400, "Noma'lum amal");
    }
    if (m === "POST" && p === "/api/admin/import-students") return send(res, 200, await admin.importStudents(who.profile, await readJson(req, 4 * 1024 * 1024), ctx));
    if (m === "GET" && p === "/api/admin/audit") {
      if (who.profile.role !== "admin") throw new HttpError(403, "Bu amal uchun ruxsat yo'q");
      const limit = Math.max(1, Math.min(Number(url.searchParams.get("limit")) || 100, 500));
      const rows = await db.asService((c) => c.query("select id, at, actor_login, action, target, ip, details from public.audit_log order by id desc limit $1", [limit]));
      return send(res, 200, { data: rows.rows });
    }
    throw new HttpError(404, "Topilmadi");
  }

  function serveStatic(req, res, url) {
    if (req.method !== "GET" && req.method !== "HEAD") throw new HttpError(405, "Ruxsat etilmagan usul");
    let rel;
    try { rel = decodeURIComponent(url.pathname); } catch { throw new HttpError(400, "Manzil noto'g'ri"); }
    if (rel === "/") rel = "/login.html";
    const full = path.normalize(path.join(config.webDir, rel));
    const base = path.resolve(config.webDir);
    const segs = rel.split("/");
    if (!full.startsWith(base + path.sep) || segs.some((s) => s.startsWith(".")) || rel.includes("\0")) throw new HttpError(404, "Topilmadi");
    let stat;
    try { stat = fs.statSync(full); } catch { throw new HttpError(404, "Topilmadi"); }
    if (!stat.isFile()) throw new HttpError(404, "Topilmadi");
    const ext = path.extname(full).toLowerCase();
    if (!MIME[ext]) throw new HttpError(404, "Topilmadi");
    const cache = rel.startsWith("/vendor/") || rel.startsWith("/assets/") ? "public, max-age=86400" : "no-cache";
    res.writeHead(200, { ...secHeaders(), "Content-Type": MIME[ext], "Content-Length": stat.size, "Cache-Control": cache });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(full).pipe(res);
  }

  const server = http.createServer(async (req, res) => {
    const t0 = Date.now();
    const url = new URL(req.url, "http://localhost");
    try {
      if (url.pathname.startsWith("/api/")) await api(req, res, url);
      else serveStatic(req, res, url);
    } catch (e) {
      if (e instanceof HttpError) {
        if (!res.headersSent) {
          const isDb = url.pathname === "/api/db";
          const retry = e.extra.retry_after ? { "Retry-After": String(e.extra.retry_after) } : {};
          send(res, e.status, isDb ? { data: null, error: { message: e.message, ...e.extra } } : { error: e.message, ...e.extra }, retry);
        }
      } else {
        console.error("Kutilmagan xato:", e);
        if (!res.headersSent) send(res, 500, { error: "Server xatosi. Keyinroq urinib ko'ring" });
      }
    } finally {
      if (config.logRequests) console.log(`${req.method} ${url.pathname} ${res.statusCode} ${Date.now() - t0}ms`);
    }
  });
  server.requestTimeout = 60000;
  server.headersTimeout = 15000;

  return { server, db, auth, close: async () => { await new Promise((r) => server.close(r)); if (!injectedDb) await db.close(); } };
}

// To'g'ridan-to'g'ri ishga tushirilganda
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const config = loadConfig();
    const app = await createApp(config);
    app.server.listen(config.port, () => console.log(`Amaliyot portali: http://0.0.0.0:${config.port}`));
    const stop = async () => { console.log("To'xtatilmoqda..."); await app.close(); process.exit(0); };
    process.on("SIGTERM", stop); process.on("SIGINT", stop);
  } catch (e) {
    console.error("Ishga tushmadi:", e.message);
    process.exit(1);
  }
}
