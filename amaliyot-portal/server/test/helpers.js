// Sinov yordamchilari: har bir test fayli uchun alohida (vaqtinchalik) baza, haqiqiy server va HTTP chaqiruvlar.
// Kerak: ishlayotgan PostgreSQL va TEST_DATABASE_ADMIN_URL (superuser), masalan postgresql://postgres@127.0.0.1:5432/postgres
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { runMigrations } from "../src/migrate.js";
import { loadConfig } from "../src/config.js";
import { createApp } from "../src/index.js";
import { createStaffUser } from "../src/users.js";

const here = path.dirname(fileURLToPath(import.meta.url));
export const ADMIN_URL = process.env.TEST_DATABASE_ADMIN_URL || "postgresql://postgres@127.0.0.1:5546/postgres";
const APP_PASSWORD = "test-app-password-123";
export const PASSWORD = "Parol-12345";

export async function createTestDb() {
  const name = `portal_test_${crypto.randomBytes(5).toString("hex")}`;
  const admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(`create database ${name}`);
  const u = new URL(ADMIN_URL); u.pathname = `/${name}`;
  const adminUrl = u.toString();
  await runMigrations({ adminUrl, appPassword: APP_PASSWORD, dir: path.resolve(here, "../../db/migrations") });
  const a = new URL(adminUrl); a.username = "app"; a.password = APP_PASSWORD;
  return {
    name, adminUrl, appUrl: a.toString(),
    async drop() { await admin.query(`drop database if exists ${name} with (force)`); await admin.end(); },
  };
}

export async function startApp(extra = {}) {
  const tdb = await createTestDb();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "portal-data-"));
  const webDir = fs.mkdtempSync(path.join(os.tmpdir(), "portal-web-"));
  fs.writeFileSync(path.join(webDir, "login.html"), "<!doctype html><title>login</title>");
  fs.mkdirSync(path.join(webDir, "js")); fs.writeFileSync(path.join(webDir, "js", "a.js"), "export const a=1");
  fs.writeFileSync(path.join(webDir, ".secret"), "yashirin");
  fs.writeFileSync(path.join(os.tmpdir(), "outside-secret.txt"), "tashqarida");
  const config = loadConfig({
    DATABASE_URL: tdb.appUrl, JWT_SECRET: "test-secret-test-secret-test-secret-0123456789", DATA_DIR: dataDir, WEB_DIR: webDir,
    LOG_REQUESTS: "0", RATE_LIMIT_AUTH_PER_MIN: "1000", RATE_LIMIT_API_PER_MIN: "100000", ...extra,
  });
  const app = await createApp(config);
  await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${app.server.address().port}`;

  async function call(method, p, { body, token, headers = {}, raw } = {}) {
    const h = { ...headers };
    if (token) h.Authorization = `Bearer ${token}`;
    let payload = raw;
    if (body !== undefined) { h["Content-Type"] = "application/json"; payload = JSON.stringify(body); }
    const res = await fetch(base + p, { method, headers: h, body: payload });
    const text = await res.text();
    let json = null; try { json = JSON.parse(text); } catch { /* matn */ }
    return { status: res.status, json, text, headers: res.headers };
  }
  const sql = (q, params) => app.db.asService((c) => c.query(q, params));
  async function mkStaff(login, role, name = login) { await createStaffUser(app.db, { login, full_name: name, role, password: PASSWORD }); return login; }
  async function loginAs(login, password = PASSWORD) {
    const r = await call("POST", "/api/auth/login", { body: { login, password } });
    if (r.status !== 200) throw new Error(`login ${login}: ${r.status} ${r.text}`);
    return { token: r.json.access_token, refresh: r.json.refresh_token, user: r.json.user };
  }
  // Talaba: bazaga yozamiz va faollashtirilgan hisob yaratamiz (HEMIS ID = login).
  async function mkStudent(hemis, name, group = "E-31", course = 3, { activate = true } = {}) {
    const s = (await sql("insert into public.students (hemis_id, full_name, group_name, course) values ($1,$2,$3,$4) returning id", [hemis, name, group, course])).rows[0];
    if (activate) {
      const { hashPassword } = await import("../src/crypto-utils.js");
      await app.db.asService(async (c) => {
        const p = await c.query("insert into public.profiles (login, full_name, role) values ($1,$2,'student') returning id", [hemis, name]);
        await c.query("insert into public.credentials (user_id, password_hash, must_change_password) values ($1,$2,false)", [p.rows[0].id, await hashPassword(PASSWORD)]);
        await c.query("update public.students set profile_id = $1 where id = $2", [p.rows[0].id, s.id]);
      });
    }
    return s.id;
  }
  async function stop() { await app.close(); await tdb.drop(); fs.rmSync(dataDir, { recursive: true, force: true }); fs.rmSync(webDir, { recursive: true, force: true }); }
  return { app, base, config, call, sql, mkStaff, loginAs, mkStudent, stop };
}
// db() so'rovi: gateway uchun qisqa yozuv
export const dbq = (t, token, body) => t.call("POST", "/api/db", { token, body });
