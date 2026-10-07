#!/usr/bin/env node
// Boshqaruv buyruqlari: node src/cli.js <buyruq> [--bayroq qiymat]
//   create-admin   --login <login> --name "F.I.SH"        Birinchi administratorni yaratadi (vaqtinchalik parol chiqaradi)
//   create-user    --login <login> --name "F.I.SH" --role res_head|practice_head|admin
//   reset-password --login <login>                        Yangi vaqtinchalik parol beradi, sessiyalarni yopadi
//   list-users                                            Xodimlar ro'yxati
//   seed-demo                                             Namuna talabalar, brigadalar, davrlar (faqat sinov uchun)
import { loadConfig } from "./config.js";
import { createDb } from "./db.js";
import { createStaffUser, resetUserPassword } from "./users.js";

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
