// Baza bilan ishlash. Ikki xil bajarish usuli:
//  asUser(claims, fn)  - so'rov FOYDALANUVCHI huquqi bilan (SET LOCAL ROLE authenticated + JWT da'volari):
//                        PostgreSQL RLS qoidalari qo'llanadi. Foydalanuvchi so'rovlari faqat shu orqali.
//  asService(fn)       - server ichki amallari uchun (RLS'siz): parol, sessiya, kod, audit jadvallari.
import pg from "pg";

// date (1082) va time (1083) matn holida qoladi: vaqt zonasi xatolarisiz ("2026-10-07", "09:00:00").
for (const oid of [1082, 1083]) pg.types.setTypeParser(oid, (v) => v);
// timestamptz (1184) -> ISO 8601 ("2026-10-07T13:38:00.123+00:00"): brauzerda Date bilan ishonchli o'qiladi.
pg.types.setTypeParser(1184, (v) => v.replace(" ", "T").replace(/([+-]\d\d)$/, "$1:00"));
// int8 (bigint): JS son sifatida (audit_log id uchun yetarli).
pg.types.setTypeParser(20, (v) => Number(v));

export function createDb(connectionString, { max = 10 } = {}) {
  const pool = new pg.Pool({ connectionString, max, idleTimeoutMillis: 30000, options: "-c timezone=UTC" });
  pool.on("error", (e) => console.error("Baza ulanishi xatosi:", e.message));

  async function run(role, claims, fn) {
    const c = await pool.connect();
    try {
      await c.query("begin");
      await c.query(`set local role ${role}`);
      if (claims) await c.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
      await c.query("set local statement_timeout = '15s'");
      const r = await fn(c);
      await c.query("commit");
      return r;
    } catch (e) {
      try { await c.query("rollback"); } catch { /* ulanish uzilgan bo'lishi mumkin */ }
      throw e;
    } finally {
      c.release();
    }
  }

  return {
    pool,
    asUser: (claims, fn) => run("authenticated", claims, fn),
    asService: (fn) => run("service", null, fn),
    close: () => pool.end(),
  };
}
