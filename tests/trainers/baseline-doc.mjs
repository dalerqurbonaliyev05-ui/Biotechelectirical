// golden/*.json dan docs/trainer-baseline.md uchun funksional bo'limni (markdown) chiqaradi.
//   node baseline-doc.mjs > /tmp/funk.md
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TRAINERS } from "./specs.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const TONE = { ok: "ok", bad: "xato", "": "—" };
const esc = (s) => s.replace(/\|/g, "\\|");
const out = [];
const p = (s = "") => out.push(s);

for (const [name, cfg] of Object.entries(TRAINERS)) {
  const g = JSON.parse(fs.readFileSync(path.join(here, "golden", `${name}.json`), "utf8"));
  const learn = g.learn, exam = g.exam;
  p(`### ${cfg.no} ${name}`);
  p();
  const first = learn[0].state;
  p(`Ochilishdagi xabar: «${first.status2.t}»`);
  p();
  if (cfg.kind === "wiring") {
    const pd = first.pdone?.t, steps = first.steps || [];
    p(`Qadamlar ro'yxati: ${steps.length} ta (ochilishda tayyor: ${pd}). Namunaviy (oldindan ulangan) simlar: ${cfg.prewired} ta.`);
    p();
    p("**O'rganish rejimida noto'g'ri ulanish xabarlari** (sim qo'yilmaydi, qizil sim bir lahza ko'rinadi):");
    p();
    p("| Ulanish | Xabar | Ohang |");
    p("|---|---|---|");
    for (const s of learn) {
      if (!s.step.startsWith("sim ")) continue;
      const m = s.msgs.at(-1);
      if (!m || m[1] !== "bad") continue;
      p(`| ${s.step.slice(4)} | ${esc(m[0])} | ${TONE[m[1]]} |`);
    }
    p();
    p("**To'g'ri ulanish va boshqa xabarlar (o'rganish rejimi):**");
    p();
    const seen = new Set();
    p("| Qadam | Xabar(lar) |");
    p("|---|---|");
    for (const s of learn.slice(1)) {
      if (s.step.startsWith("sim ") && s.msgs.at(-1)?.[1] === "bad") continue;
      const ms = s.msgs.filter((m) => !/(sudrang yoki ikkinchisini bosing)/.test(m[0]) || s.step.startsWith("bosish"));
      const key = s.step.replace(/^(sim|bosish) .*/, "$1") + JSON.stringify(ms.map((m) => (s.step.startsWith("bosish") ? "" : m[0].replace(/\d+ \/ \d+/, "N / M"))));
      if (seen.has(key) || !ms.length) continue;
      seen.add(key);
      p(`| ${esc(s.step)} | ${ms.map((m) => `«${esc(m[0])}» (${TONE[m[1]]})`).join("<br>")} |`);
    }
    p();
    const checks = exam.filter((s) => s.step === "tugma #check");
    p("**Imtihon rejimi — «Tekshirish» natijalari:**");
    p();
    for (const c of checks) {
      p(`- ${c.msgs.map((m) => `«${m[0]}» (${TONE[m[1]]})`).join(", ")}`);
      (c.state.report || []).forEach((r) => p(`  - ${r}`));
    }
    p();
  } else {
    p("| Qadam | Xabar(lar) |");
    p("|---|---|");
    const seen = new Set();
    for (const s of [...learn.slice(1), ...exam.slice(1)]) {
      const key = s.msgs.map((m) => m[0].replace(/\d+ \/ \d+/, "N / M").replace(/^\d+ · [^:]+?( o'rnatildi|:)/, "N · detal$1")).join("|");
      if (!s.msgs.length || seen.has(key)) continue;
      seen.add(key);
      p(`| ${esc(s.step)} | ${s.msgs.map((m) => `«${esc(m[0])}» (${TONE[m[1]]})`).join("<br>")} |`);
    }
    const res = [...learn, ...exam].filter((s) => s.state.result && s.state.result.t).map((s) => s.state.result.t);
    p();
    res.forEach((r) => p(`Natija kartasi: «${r}»`));
    p();
  }
}
console.log(out.join("\n"));
