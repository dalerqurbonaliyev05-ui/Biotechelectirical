// Bundles src/viewer.js (+ three.js) into one IIFE and inlines it into
// ../assets/viewer3d/index.html so the app can load it offline from assets.
import { build } from 'esbuild';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const result = await build({
  entryPoints: [join(here, 'src', 'viewer.js')],
  bundle: true,
  format: 'iife',
  minify: true,
  target: ['chrome80'],
  legalComments: 'none',
  write: false,
});
const js = result.outputFiles[0].text.replaceAll('</script', '<\\/script');
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<title>ElektrUy 3D</title>
<!-- three.js (MIT License, Copyright 2010-2025 three.js authors) bundled for offline use -->
<style>html,body{margin:0;height:100%;overflow:hidden;background:#f3f6f8;touch-action:none}canvas{display:block;width:100%;height:100%}</style>
</head>
<body>
<canvas id="c"></canvas>
<script>${js}</script>
</body>
</html>
`;
const outDir = join(here, '..', 'assets', 'viewer3d');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'index.html'), html);
console.log(`viewer3d/index.html: ${(html.length / 1024).toFixed(0)} KB`);
