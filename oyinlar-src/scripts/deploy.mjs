// out/ (next build natijasi) -> ../oyinlar/ (saytning statik papkasi).
// Eski fayllar avval o'chiriladi, shunda eski hash'li _next bo'laklari to'planib qolmaydi.
import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = resolve(root, "out");
const dest = resolve(root, "..", "oyinlar");

if (!existsSync(resolve(src, "index.html"))) {
  console.error("out/index.html topilmadi — avval `npm run build` ishga tushiring.");
  process.exit(1);
}
rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });
console.log(`Nusxalandi: ${src} -> ${dest}`);
