// Qahramon ko'rinishini Figma'ga joylash uchun use_figma JS kodini yaratadi.
// Ishlatish: node manba/vosita/figma_kod.mjs eshak yon  > chiqish/eshak/figma_yon.js
//            node manba/vosita/figma_kod.mjs eshak ifodalar > chiqish/eshak/figma_ifodalar.js
import { readFileSync } from "node:fs";

const [nom, qism] = process.argv.slice(2);
const q = (await import(`../qahramonlar/${nom}.mjs`)).default;
const palitra = JSON.parse(readFileSync(new URL("../../palitra.json", import.meta.url))).ranglar;
// Figma bo'limi nomi (o'zbekcha imlo bilan), masalan "Ho'kiz"
const Nom = q.bolim || nom[0].toUpperCase() + nom.slice(1);
const viewNames = Object.keys(q.views);

// Figma'dagi palitra o'zgaruvchilari: hex -> o'zgaruvchi nomi bo'yicha bog'lanadi
const umumiy = `
const PAL = ${JSON.stringify(palitra)};
const hex2 = (c) => "#" + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
const vars = await figma.variables.getLocalVariablesAsync("COLOR");
const byHex = {};
for (const [n, h] of Object.entries(PAL)) { const v = vars.find((x) => x.name === n); if (v) byHex[h.toUpperCase()] = v; }
const bindPaints = (paints) => paints.map((p) => {
  if (p.type !== "SOLID") return p;
  const v = byHex[hex2(p.color)];
  if (!v) { begona.push(hex2(p.color)); return p; }
  return figma.variables.setBoundVariableForPaint(p, "color", v);
});
const begona = [];
const bindAll = (root) => {
  for (const n of [root, ...(root.findAll ? root.findAll(() => true) : [])]) {
    // Diqqat: bog'langan bo'yoqni berganda Figma shaffoflikni 1 ga qaytaradi — asl qiymatni qayta qo'yamiz
    for (const key of ["fills", "strokes"]) {
      if (!(key in n) || !Array.isArray(n[key]) || !n[key].length) continue;
      const asl = n[key].map((p) => p.opacity);
      n[key] = bindPaints(n[key]);
      n[key] = n[key].map((p, i) => (asl[i] != null && p.opacity !== asl[i] ? { ...p, opacity: asl[i] } : p));
    }
  }
};
const Y0 = 120 + ${q.qatorY || 0} * 1200; // bir bo'limdagi bir nechta qahramon uchun qator
let section = figma.currentPage.findChild((n) => n.type === "SECTION" && n.name === ${JSON.stringify(Nom)});
`;

let code;
if (qism === "ikkala") {
  const VIEWS = Object.fromEntries(
    viewNames.map((v) => [v, { w: q.views[v].w, h: q.views[v].h, layers: q.views[v].layers.map((l) => ({ name: l.name, hidden: l.hidden, pivot: l.pivot, svg: l.svg })) }])
  );
  code = `${umumiy}
if (!section) {
  const right = Math.max(0, ...figma.currentPage.children.filter((n) => n.type === "SECTION").map((n) => n.x + n.width));
  section = figma.createSection();
  section.name = ${JSON.stringify(Nom)};
  section.x = right > 0 ? right + 200 : 0;
  section.y = 0;
}
const VIEWS = ${JSON.stringify(VIEWS)};
const out = {};
let fx = 80;
for (const [vn, V] of Object.entries(VIEWS)) {
  const name = ${JSON.stringify(nom)} + "_" + vn;
  const prev = section.findChild((n) => n.name === name); if (prev) prev.remove();
  const frame = figma.createFrame(); frame.name = name; frame.resize(V.w, V.h); frame.fills = []; frame.clipsContent = false;
  section.appendChild(frame); frame.x = fx; frame.y = Y0; fx += V.w + 80;
  for (const L of V.layers) {
    const tmp = figma.createNodeFromSvg('<svg xmlns="http://www.w3.org/2000/svg" width="' + V.w + '" height="' + V.h + '" viewBox="0 0 ' + V.w + ' ' + V.h + '">' + L.svg + '</svg>');
    frame.appendChild(tmp); tmp.x = 0; tmp.y = 0;
    const g = figma.group([...tmp.children], frame); tmp.remove();
    g.name = L.name; g.visible = !L.hidden; bindAll(g);
  }
  const dots = [];
  for (const L of V.layers.filter((l) => l.pivot)) {
    const d = figma.createEllipse(); d.resize(12, 12); frame.appendChild(d);
    d.x = L.pivot[0] - 6; d.y = L.pivot[1] - 6; d.name = "pivot_" + L.name;
    d.fills = bindPaints([{ type: "SOLID", color: { r: 0.784, g: 0.263, b: 0.227 } }]); dots.push(d);
  }
  if (dots.length) { const pg = figma.group(dots, frame); pg.name = "_pivotlar"; pg.visible = false; pg.locked = true; }
  out[vn] = { id: frame.id, layers: V.layers.length };
  section.resizeWithoutConstraints(Math.max(section.width, frame.x + V.w + 80), Math.max(section.height, frame.y + V.h + 80));
}
return { sectionId: section.id, out, begonaRanglar: [...new Set(begona)] };
`;
} else if (viewNames.includes(qism)) {
  const view = q.views[qism];
  const idx = viewNames.indexOf(qism);
  const layers = view.layers.map((l) => ({ name: l.name, hidden: l.hidden, pivot: l.pivot, svg: l.svg }));
  code = `${umumiy}
if (!section) {
  const right = Math.max(0, ...figma.currentPage.children.filter((n) => n.type === "SECTION").map((n) => n.x + n.width));
  section = figma.createSection();
  section.name = ${JSON.stringify(Nom)};
  section.x = right > 0 ? right + 200 : 0;
  section.y = 0;
}
const W = ${view.w}, H = ${view.h};
const old = section.findChild((n) => n.name === ${JSON.stringify(`${nom}_${qism}`)});
if (old) old.remove();
const frame = figma.createFrame();
frame.name = ${JSON.stringify(`${nom}_${qism}`)};
frame.resize(W, H);
frame.fills = [];
frame.clipsContent = false;
section.appendChild(frame);
frame.x = 80 + ${idx} * (W + 80);
frame.y = Y0;
const LAYERS = ${JSON.stringify(layers)};
const created = [];
for (const L of LAYERS) {
  const tmp = figma.createNodeFromSvg('<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">' + L.svg + '</svg>');
  frame.appendChild(tmp);
  tmp.x = 0; tmp.y = 0;
  const g = figma.group([...tmp.children], frame);
  tmp.remove();
  g.name = L.name;
  g.visible = !L.hidden;
  bindAll(g);
  created.push({ id: g.id, name: g.name });
}
// Aylanish nuqtalari (yashirin yordamchi qatlam)
const dots = [];
for (const L of LAYERS.filter((l) => l.pivot)) {
  const d = figma.createEllipse();
  d.resize(12, 12);
  frame.appendChild(d);
  d.x = L.pivot[0] - 6; d.y = L.pivot[1] - 6;
  d.name = "pivot_" + L.name;
  d.fills = bindPaints([{ type: "SOLID", color: { r: 0.784, g: 0.263, b: 0.227 } }]);
  dots.push(d);
}
if (dots.length) { const pg = figma.group(dots, frame); pg.name = "_pivotlar"; pg.visible = false; pg.locked = true; }
const sw = Math.max(section.width, frame.x + W + 80), sh = Math.max(section.height, frame.y + H + 80);
section.resizeWithoutConstraints(sw, sh);
return { sectionId: section.id, frameId: frame.id, layers: created, begonaRanglar: [...new Set(begona)] };
`;
} else if (qism === "ifodalar") {
  const sets = q.ifodalar;
  code = `${umumiy}
await Promise.all([figma.loadFontAsync({ family: "Nunito", style: "Bold" })]);
const SETS = ${JSON.stringify(sets)};
const KESIM = ${JSON.stringify(q.boshKesim)};
const EXTRA = ${JSON.stringify(q.holatlar || {})};
const nomi = ${JSON.stringify(nom)};
const S = ${q.kesimMasshtab || 1}; // kichik qahramonlar kesimini kattalashtirish
const prev = section.findChild((n) => n.name === nomi + "_ifodalar");
if (prev) prev.remove();
const sheet = figma.createAutoLayout("VERTICAL", { name: nomi + "_ifodalar", itemSpacing: 40, paddingLeft: 48, paddingRight: 48, paddingTop: 48, paddingBottom: 48 });
sheet.fills = bindPaints([{ type: "SOLID", color: { r: 1, g: 0.957, b: 0.871 } }]);
sheet.cornerRadius = 32;
section.appendChild(sheet);
const toq = bindPaints([{ type: "SOLID", color: { r: 0.231, g: 0.184, b: 0.227 } }]);
const crop = (viewName, label, show) => {
  const src = section.findChild((n) => n.name === nomi + "_" + viewName);
  const [x, y, w, h] = KESIM[viewName];
  const card = figma.createAutoLayout("VERTICAL", { name: label, itemSpacing: 12 });
  card.fills = [];
  const box = figma.createFrame();
  box.name = "kesim";
  box.resize(w * S, h * S);
  box.clipsContent = true;
  box.cornerRadius = 24;
  box.fills = bindPaints([{ type: "SOLID", color: { r: 0.937, g: 0.902, b: 0.839 } }]);
  const c = src.clone();
  box.appendChild(c);
  c.rescale(S);
  c.x = -x * S; c.y = -y * S;
  for (const ch of c.children) if (ch.name in show) ch.visible = show[ch.name];
  card.appendChild(box);
  const t = figma.createText();
  t.fontName = { family: "Nunito", style: "Bold" };
  t.characters = label;
  t.fontSize = 22;
  t.fills = toq;
  card.appendChild(t);
  return card;
};
const rows = [];
for (const viewName of Object.keys(SETS)) {
  const row = figma.createAutoLayout("HORIZONTAL", { name: "qator_" + viewName, itemSpacing: 32 });
  row.fills = [];
  sheet.appendChild(row);
  for (const [ifoda, show] of Object.entries(SETS[viewName])) row.appendChild(crop(viewName, viewName + " · " + ifoda, show));
  rows.push(row.id);
}
for (const [viewName, list] of Object.entries(EXTRA)) {
  const row = figma.createAutoLayout("HORIZONTAL", { name: "holatlar_" + viewName, itemSpacing: 32 });
  row.fills = [];
  sheet.appendChild(row);
  for (const [label, show] of Object.entries(list)) row.appendChild(crop(viewName, label, show));
  rows.push(row.id);
}
const last = section.children.filter((n) => n.type === "FRAME" && n.name.startsWith(nomi + "_") && n.name !== nomi + "_ifodalar");
sheet.x = Math.max(...last.map((n) => n.x + n.width)) + 80;
sheet.y = Y0;
section.resizeWithoutConstraints(Math.max(section.width, sheet.x + sheet.width + 80), Math.max(section.height, sheet.y + sheet.height + 80));
return { sheetId: sheet.id, rows, size: [sheet.width, sheet.height], begonaRanglar: [...new Set(begona)] };
`;
}
process.stdout.write(code);
