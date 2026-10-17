// i18n kalitlarini tekshirish: kodda ishlatilgan statik kalitlar JSON'da bormi
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const dict = JSON.parse(readFileSync(join(root, 'data', 'i18n.uz.json'), 'utf8'));
const has = (k) => k.split('.').reduce((o, p) => (o == null ? undefined : o[p]), dict) !== undefined;

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.js')) out.push(p);
  }
  return out;
}

export function scan() {
  const missing = [];
  for (const file of walk(join(root, 'js'))) {
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) {
      if (!has(m[1])) missing.push(`${file.replace(root + '/', '')}: ${m[1]}`);
    }
  }
  return missing;
}

if (process.argv[1] && process.argv[1].endsWith('i18nscan.mjs')) {
  const miss = scan();
  console.log(miss.length ? miss.join('\n') : 'Barcha statik kalitlar mavjud');
}
