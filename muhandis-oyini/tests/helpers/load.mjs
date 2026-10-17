// Node'da ma'lumotlarni yuklash (testlar uchun)
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadData } from '../../js/game/data.js';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, '..', '..', 'data');

let cached = null;
export async function loadTestData() {
  if (!cached) cached = await loadData(async (f) => JSON.parse(await readFile(join(dataDir, f), 'utf8')));
  return cached;
}
