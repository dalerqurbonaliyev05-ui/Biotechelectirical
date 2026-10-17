// Qahramon ko'rinishlarini SVG + PNG ga chiqaradi (tekshirish uchun) va qatlam SVG'larini saqlaydi.
// Ishlatish: node manba/vosita/render.mjs eshak
import { mkdirSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { join } from "node:path";

// Playwright global o'rnatilgan (muhitda tayyor Chromium bilan)
const require = createRequire(import.meta.url);
const { chromium } = require(join(execSync("npm root -g").toString().trim(), "playwright"));

const nom = process.argv[2];
const mod = await import(`../qahramonlar/${nom}.mjs`);
const q = mod.default;
const out = new URL(`../../chiqish/${nom}/`, import.meta.url).pathname;
mkdirSync(out, { recursive: true });

export const compose = (view, show = {}) => {
  const body = view.layers
    .filter((l) => (l.name in show ? show[l.name] : !l.hidden))
    .map((l) => `<g id="${l.name}">${l.svg}</g>`)
    .join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${view.w}" height="${view.h}" viewBox="0 0 ${view.w} ${view.h}">${body}</svg>`;
};

const pivotsSvg = (view) =>
  view.layers
    .filter((l) => l.pivot)
    .map((l) => `<circle cx="${l.pivot[0]}" cy="${l.pivot[1]}" r="6" fill="#ff00aa"/>`)
    .join("");

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
const shoot = async (svg, file, bg = "#efe6d6") => {
  await page.setContent(`<html><body style="margin:0;background:${bg}">${svg}</body></html>`);
  const el = await page.$("svg");
  await el.screenshot({ path: file });
};

const sheet = [];
for (const [vnom, view] of Object.entries(q.views)) {
  const svg = compose(view);
  writeFileSync(`${out}${nom}_${vnom}.svg`, svg);
  await shoot(svg, `${out}${nom}_${vnom}.png`);
  await shoot(svg.replace("</svg>", pivotsSvg(view) + "</svg>"), `${out}${nom}_${vnom}_pivot.png`);
  for (const [inom, show] of Object.entries(q.ifodalar?.[vnom] || {})) {
    await shoot(compose(view, show), `${out}${nom}_${vnom}_${inom}.png`);
  }
  sheet.push(vnom);
}
await browser.close();
console.log("tayyor:", out, sheet);
