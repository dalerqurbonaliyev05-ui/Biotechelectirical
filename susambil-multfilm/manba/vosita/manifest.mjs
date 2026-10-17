// Qahramon qatlamlari ro'yxatini (nomlar, tartib, aylanish nuqtalari, boshlang'ich ko'rinish) JSON ga yozadi.
// Ishlatish: node manba/vosita/manifest.mjs eshak
import { writeFileSync } from "node:fs";

const nom = process.argv[2];
const q = (await import(`../qahramonlar/${nom}.mjs`)).default;
const out = {
  qahramon: nom,
  izoh: "Qatlamlar pastdan yuqoriga tartibda. pivot — aylanish nuqtasi (ko'rinish kadri koordinatasida, piksel).",
  korinishlar: Object.fromEntries(
    Object.entries(q.views).map(([v, view]) => [
      v,
      {
        figma_kadr: `${nom}_${v}`,
        olcham: [view.w, view.h],
        qatlamlar: view.layers.map((l) => ({ nom: l.name, pivot: l.pivot, boshida_yashirin: l.hidden })),
      },
    ])
  ),
  ifodalar: q.ifodalar?.yon ?? {},
};
writeFileSync(new URL(`../../qatlamlar/${nom}.json`, import.meta.url), JSON.stringify(out, null, 2) + "\n");
console.log("yozildi: qatlamlar/" + nom + ".json");
