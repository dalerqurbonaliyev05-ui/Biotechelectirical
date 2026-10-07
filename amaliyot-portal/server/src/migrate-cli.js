import path from "node:path";
import { fileURLToPath } from "node:url";
import { runMigrations } from "./migrate.js";

const here = path.dirname(fileURLToPath(import.meta.url));
try {
  const applied = await runMigrations({
    adminUrl: process.env.DATABASE_ADMIN_URL,
    appPassword: process.env.APP_DB_PASSWORD,
    dir: process.env.MIGRATIONS_DIR || path.resolve(here, "../../db/migrations"),
  });
  console.log(applied.length ? `Qo'llandi: ${applied.join(", ")}` : "Yangi migratsiya yo'q");
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
