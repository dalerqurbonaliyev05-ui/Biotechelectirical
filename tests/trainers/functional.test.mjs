// Funksional sinovlar: har bir trenajyor ssenariysi bajariladi va natija golden/<trenajyor>.json bilan
// to'liq solishtiriladi (holat xabarlarining aniq matni, ohangi, qadamlar ro'yxati, hisobot, tugmalar holati).
// Golden fayllarni qayta yozish (faqat ataylab, xulq-atvor o'zgargani tasdiqlangan bo'lsa):
//   UPDATE_GOLDEN=1 npm test
// Faqat ayrim trenajyorlar:  TRAINERS=shit-montaji,chastota-yigish npm test
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as H from "./harness.mjs";
import { TRAINERS } from "./specs.mjs";
import { runScenario } from "./run.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const ONLY = process.env.TRAINERS ? process.env.TRAINERS.split(",") : Object.keys(TRAINERS);
const UPDATE = !!process.env.UPDATE_GOLDEN;

let srv, browser;
before(async () => { srv = await H.startServer(); browser = await H.launch(); });
after(async () => { await browser?.close(); srv?.close(); });

for (const name of ONLY) {
  const cfg = TRAINERS[name];
  for (const scen of Object.keys(cfg.scenarios)) {
    test(`${cfg.no} ${name}: ${scen}`, { timeout: 600000 }, async () => {
      const file = path.join(here, "golden", `${name}.json`);
      const gold = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
      const { steps, errors } = await runScenario(browser, srv.base, name, scen);
      assert.deepEqual(errors, [], "sahifada JS xatosi");
      if (UPDATE || !gold[scen]) {
        // har bir ssenariy o'z kalitiga yoziladi (parallel yozuv bo'lmaydi: testlar ketma-ket)
        const g = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
        g[scen] = steps;
        fs.writeFileSync(file, JSON.stringify(g, null, 1) + "\n");
        if (!UPDATE) assert.fail(`golden/${name}.json da "${scen}" yo'q edi — yozildi, qayta ishga tushiring`);
        return;
      }
      assert.equal(steps.length, gold[scen].length, "qadamlar soni");
      for (let i = 0; i < steps.length; i++) assert.deepEqual(steps[i], gold[scen][i], `${i}-qadam: ${gold[scen][i].step}`);
    });
  }
}
