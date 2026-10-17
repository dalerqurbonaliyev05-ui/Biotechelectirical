// Umumiy yordamchilar: palitra, SVG bo'laklari, qatlam ta'rifi.
import { readFileSync } from "node:fs";

const palitra = JSON.parse(readFileSync(new URL("../palitra.json", import.meta.url)));
export const C = palitra.ranglar;
export const SOYA = 0.22;
export const YORUGLIK = 0.45;

const attrs = (o) =>
  Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}="${v}"`)
    .join(" ");

// fill: palitra nomi; op: shaffoflik
export const path = (d, fill, op, extra = {}) =>
  `<path ${attrs({ d, fill: C[fill], "fill-opacity": op, ...extra })}/>`;
export const ellipse = (cx, cy, rx, ry, fill, op, rot) =>
  `<ellipse ${attrs({ cx, cy, rx, ry, fill: C[fill], "fill-opacity": op, transform: rot ? `rotate(${rot} ${cx} ${cy})` : undefined })}/>`;
export const circle = (cx, cy, r, fill, op) => `<circle ${attrs({ cx, cy, r, fill: C[fill], "fill-opacity": op })}/>`;
export const rect = (x, y, w, h, rx, fill, op, rot) =>
  `<rect ${attrs({ x, y, width: w, height: h, rx, fill: C[fill], "fill-opacity": op, transform: rot ? `rotate(${rot} ${x + w / 2} ${y + h / 2})` : undefined })}/>`;
// chiziq (kontur emas — og'iz, qosh, yumuq ko'z kabi ingichka detal)
export const line = (d, color, width, op) =>
  `<path ${attrs({ d, fill: "none", stroke: C[color], "stroke-width": width, "stroke-opacity": op, "stroke-linecap": "round", "stroke-linejoin": "round" })}/>`;

// Qatlam: name — Figma'dagi nom, pivot — aylanish nuqtasi [x, y] (ko'rinish kadri koordinatasida)
export const layer = (name, parts, { pivot = null, hidden = false } = {}) => ({
  name,
  svg: Array.isArray(parts) ? parts.join("") : parts,
  pivot,
  hidden,
});
