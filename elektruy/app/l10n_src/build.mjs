// Writes lib/l10n/app_{en,ru,uz}.arb from strings.mjs and fails on duplicates or
// unbalanced placeholders, so every key exists in all three languages.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { strings } from './strings.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'lib', 'l10n');
mkdirSync(out, { recursive: true });

const langs = { en: 1, ru: 2, uz: 3 };
const seen = new Set();
const errors = [];
for (const row of strings) {
  const [key, ...rest] = row;
  if (seen.has(key)) errors.push(`duplicate key ${key}`);
  seen.add(key);
  const ph = row[4] ?? {};
  for (const [lang, i] of Object.entries(langs)) {
    const text = row[i];
    if (typeof text !== 'string' || !text.length) errors.push(`${key}: missing ${lang}`);
    const used = new Set([...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]));
    for (const p of Object.keys(ph)) if (!used.has(p)) errors.push(`${key}/${lang}: placeholder {${p}} not used`);
    for (const u of used) if (!(u in ph)) errors.push(`${key}/${lang}: undeclared placeholder {${u}}`);
  }
  if (rest.length < 3) errors.push(`${key}: incomplete row`);
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

for (const [lang, i] of Object.entries(langs)) {
  const arb = { '@@locale': lang };
  for (const row of strings) {
    arb[row[0]] = row[i];
    if (lang === 'en' && row[4]) {
      arb[`@${row[0]}`] = {
        placeholders: Object.fromEntries(Object.entries(row[4]).map(([k, t]) => [k, { type: t }])),
      };
    }
  }
  writeFileSync(join(out, `app_${lang}.arb`), JSON.stringify(arb, null, 2) + '\n');
}
console.log(`wrote ${strings.length} keys x 3 languages`);
