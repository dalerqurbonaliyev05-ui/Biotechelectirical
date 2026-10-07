#!/usr/bin/env node
// Boshqaruv buyruqlari: node src/cli.js <buyruq> [--bayroq qiymat]
//   create-admin   --login <login> --name "F.I.SH"        Birinchi administratorni yaratadi (vaqtinchalik parol chiqaradi)
//   create-user    --login <login> --name "F.I.SH" --role res_head|practice_head|admin
//   reset-password --login <login>                        Yangi vaqtinchalik parol beradi, sessiyalarni yopadi
//   list-users                                            Xodimlar ro'yxati
//   hemis-sync     [--dry-run] [--codes-out fayl.csv]   HEMIS API'dan talabalarni yuklaydi (HEMIS_API_URL, HEMIS_API_TOKEN kerak; docs/HEMIS.md)
//   seed-demo                                             Namuna talabalar, brigadalar, davrlar (faqat sinov uchun)
import { loadConfig } from "./config.js";
import { createDb } from "./db.js";
import { createStaffUser, resetUserPassword } from "./users.js";
import { createAuth } from "./auth.js";
import { createAdmin } from "./admin.js";
import { fetchHemisStudents } from "./hemis.js";
import { toCSV } from "./csv.js";
import fs from "node:fs";

const [cmd, ...rest] = process.argv.slice(2);
const flag = (n) => { const i = rest.indexOf(`--${n}`); return i >= 0 ? rest[i + 1] : undefined; };
const config = loadConfig();
const db = createDb(config.databaseUrl, { max: 2 });
const show = (r) => console.log(`\nLogin: ${r.login}\nVaqtinchalik parol: ${r.temp_password}\n(birinchi kirishda almashtiriladi; bu parol qayta ko'rsatilmaydi)\n`);

try {
  if (cmd === "create-admin") show(await createStaffUser(db, { login: flag("login"), full_name: flag("name"), role: "admin" }));
  else if (cmd === "create-user") show(await createStaffUser(db, { login: flag("login"), full_name: flag("name"), role: flag("role") }));
  else if (cmd === "reset-password") show(await resetUserPassword(db, flag("login") || ""));
  else if (cmd === "list-users") {
    const r = await db.asService((c) => c.query("select p.login, p.full_name, p.role, p.active from public.profiles p where p.role <> 'student' order by p.created_at"));
    console.table(r.rows);
  } else if (cmd === "hemis-sync") {
    const rows = await fetchHemisStudents({ apiUrl: process.env.HEMIS_API_URL, token: process.env.HEMIS_API_TOKEN, extraQuery: process.env.HEMIS_QUERY || "", university: process.env.HEMIS_UNIVERSITY || "" });
    console.log(`HEMIS'dan ${rows.length} ta talaba olindi.`);
    if (rest.includes("--dry-run")) { console.table(rows.slice(0, 10)); console.log("(--dry-run: bazaga yozilmadi)"); }
    else {
      const admin = createAdmin({ db, config, auth: createAuth({ db, config }) });
      let total = { created: 0, updated: 0, codes: [] };
      for (let i = 0; i < rows.length; i += 1000) {
        const r = await admin.importStudents({ id: null, login: "hemis-sync", role: "admin" }, { students: rows.slice(i, i + 1000) }, { ip: "cli" });
        total.created += r.created; total.updated += r.updated; total.codes.push(...r.codes);
      }
      console.log(`Yangi: ${total.created}, yangilandi: ${total.updated}, yangi faollashtirish kodlari: ${total.codes.length}`);
      const out = flag("codes-out");
      if (out && total.codes.length) {
        fs.writeFileSync(out, toCSV([["Guruh", "F.I.SH", "HEMIS ID", "Kod"], ...total.codes.map((c) => [c.group_name || "", c.full_name, c.hemis_id, c.code])]), { mode: 0o600 });
        console.log(`Kodlar saqlandi: ${out} (maxfiy fayl: tarqatgandan keyin o'chiring)`);
      } else if (total.codes.length) console.log("Kodlar ko'rsatilmadi: --codes-out fayl.csv bering, aks holda ularni qayta ko'rib bo'lmaydi (kerak bo'lsa admin paneldan qayta chiqariladi).");
    }
  } else if (cmd === "seed-demo") {
    await db.asService(async (c) => {
      await c.query(`insert into public.brigades (name, leader_name) values ('Brigada-1','Usta Olimov'), ('Brigada-2','Usta Karimov') on conflict (name) do nothing`);
      await c.query(`insert into public.practice_periods (course, title, starts_on, ends_on)
        select * from (values (3, '3-kurs: Texnologik amaliyot', current_date - 10, current_date + 20), (2, '2-kurs: Ishlab chiqarish amaliyoti', current_date, current_date + 30)) v
        where not exists (select 1 from public.practice_periods)`);
    });
    console.log("Demo ma'lumot qo'shildi (brigadalar, davrlar). Talabalar admin paneli orqali CSV bilan yuklanadi.");
  } else {
    console.log("Buyruqlar: create-admin, create-user, reset-password, list-users, seed-demo. Batafsil: fayl boshidagi izoh.");
    process.exitCode = 1;
  }
} catch (e) {
  console.error("Xato:", e.message);
  process.exitCode = 1;
} finally {
  await db.close();
}
