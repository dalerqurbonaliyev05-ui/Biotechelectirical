// Migratsiyalarni qo'llaydi va serverning ulanish rolini (`app`) yaratadi.
// Superuser (yoki CREATE ROLE huquqi bor) ulanishi kerak: DATABASE_ADMIN_URL.
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

export async function runMigrations({ adminUrl, appPassword, dir }) {
  if (!adminUrl) throw new Error("DATABASE_ADMIN_URL berilmagan");
  if (!appPassword || appPassword.length < 12) throw new Error("APP_DB_PASSWORD kamida 12 belgi bo'lishi kerak");
  const client = new pg.Client({ connectionString: adminUrl });
  await client.connect();
  const applied = [];
  try {
    await client.query(`create table if not exists public.schema_migrations (name text primary key, applied_at timestamptz not null default now())`);
    const done = new Set((await client.query("select name from public.schema_migrations")).rows.map((r) => r.name));
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
    for (const f of files) {
      if (done.has(f)) continue;
      await client.query("begin");
      try {
        await client.query(fs.readFileSync(path.join(dir, f), "utf8"));
        await client.query("insert into public.schema_migrations(name) values ($1)", [f]);
        await client.query("commit");
        applied.push(f);
      } catch (e) {
        await client.query("rollback");
        throw new Error(`Migratsiya ${f} bajarilmadi: ${e.message}`);
      }
    }
    // Ulanish roli: o'zida huquq yo'q (NOINHERIT), faqat `authenticated` va `service` rollariga o'ta oladi.
    const exists = (await client.query("select 1 from pg_roles where rolname = 'app'")).rowCount > 0;
    const lit = (await client.query("select quote_literal($1) as v", [appPassword])).rows[0].v;
    await client.query(`${exists ? "alter" : "create"} role app login noinherit password ${lit}`);
    await client.query("grant authenticated, service to app");
    const db = (await client.query("select quote_ident(current_database()) as n")).rows[0].n;
    await client.query(`grant connect on database ${db} to app`);
  } finally {
    await client.end();
  }
  return applied;
}
