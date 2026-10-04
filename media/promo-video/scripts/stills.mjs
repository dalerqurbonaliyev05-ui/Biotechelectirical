// Tanlangan kadrlarni PNG qilib chiqaradi (tez ko'rib chiqish uchun): node scripts/stills.mjs 30 150 300 ...
// Brauzer: REMOTION_BROWSER_EXECUTABLE muhit o'zgaruvchisi (bo'lmasa Remotion o'zi yuklab oladi).
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const frames = process.argv.slice(2).map(Number).filter((n) => Number.isFinite(n));
const list = frames.length ? frames : [30, 70, 150, 200, 300, 345, 440, 480, 600, 660, 700, 780, 820, 880];
const out = path.resolve('out/stills');
mkdirSync(out, { recursive: true });
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE || undefined;

const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
const composition = await selectComposition({ serveUrl, id: 'PromoVideo', browserExecutable });
for (const frame of list) {
  await renderStill({ composition, serveUrl, frame, output: path.join(out, `f${String(frame).padStart(3, '0')}.png`), browserExecutable, scale: 0.5 });
  console.log('kadr', frame);
}
