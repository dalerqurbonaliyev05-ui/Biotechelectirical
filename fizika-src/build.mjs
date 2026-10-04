// Build:
//   node build.mjs              -> dist/         veb (admin panel; supabase-js CDN dan)
//   NATIVE=1 node build.mjs     -> dist-native/  Android ilova uchun (Capacitor): supabase-js, Capacitor
//                                                plaginlari va shriftlar fayl ichiga joylanadi, internetsiz ochiladi
import { build } from 'esbuild';
import { cpSync, mkdirSync, rmSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
import path from 'path';

const NATIVE = process.env.NATIVE === '1';
const out = NATIVE ? 'dist-native' : 'dist';
rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
const require = createRequire(import.meta.url);
const has = m => { try { require.resolve(m); return true; } catch { return false; } };

// Android: CDN dagi supabase-js o'rniga o'rnatilgan npm paketini ishlatamiz
const supabaseLocal = {
  name: 'supabase-local',
  setup(b) {
    b.onResolve({ filter: /^https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js/ }, async () => {
      const r = await b.resolve('@supabase/supabase-js', { kind: 'import-statement', resolveDir: process.cwd() });
      if (r.errors.length) throw new Error('NATIVE build uchun @supabase/supabase-js o‘rnatilmagan (npm install)');
      return { path: r.path };
    });
  },
};

const common = {
  bundle: true, format: 'esm', minify: true, jsx: 'automatic', target: ['es2020'], loader: { '.js': 'jsx' },
  define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'info',
};

if (!NATIVE) {
  await build({ ...common, external: ['https://*'], entryPoints: { app: 'src/main.jsx', admin: 'src/admin/main.jsx' }, outdir: out });
  cpSync('public', out, { recursive: true });
  cpSync('index.html', out + '/index.html'); cpSync('admin.html', out + '/admin.html');
} else {
  await build({ ...common, plugins: [supabaseLocal], entryPoints: { app: 'src/main.jsx', native: 'src/native.js' }, outdir: out });

  // Shriftlar (@fontsource): topilganlari APK ichiga joylanadi, topilmasa tizim shrifti ishlatiladi
  const want = [
    '@fontsource/bricolage-grotesque/400.css', '@fontsource/bricolage-grotesque/600.css', '@fontsource/bricolage-grotesque/700.css', '@fontsource/bricolage-grotesque/800.css',
    '@fontsource/caveat/600.css', '@fontsource/caveat/700.css',
    '@fontsource/stix-two-text/400.css', '@fontsource/stix-two-text/600.css', '@fontsource/stix-two-text/400-italic.css', '@fontsource/stix-two-text/600-italic.css',
  ];
  const found = want.filter(has);
  want.filter(m => !found.includes(m)).forEach(m => console.warn('shrift topilmadi:', m));
  let fontsLink = '';
  if (found.length) {
    const entry = path.join(out, '_fonts.css');
    writeFileSync(entry, found.map(m => `@import "${require.resolve(m).replace(/\\/g, '/')}";`).join('\n'));
    await build({ bundle: true, minify: true, entryPoints: { fonts: entry }, outdir: out, loader: { '.woff2': 'file', '.woff': 'file' }, assetNames: 'fonts/[name]-[hash]', logLevel: 'info' });
    rmSync(entry);
    fontsLink = '  <link rel="stylesheet" href="fonts.css" />\n';
  }

  cpSync('public', out, { recursive: true });
  rmSync(path.join(out, 'data'), { recursive: true, force: true }); // savollar bazasi Supabase'da; demo fayl kerak emas
  rmSync(path.join(out, 'sw.js'), { force: true });
  rmSync(path.join(out, 'manifest.webmanifest'), { force: true });
  writeFileSync(path.join(out, 'config.js'), readFileSync('public/config.js', 'utf8') + '\nwindow.FIZIKA_CONFIG.noSW = true;\n');

  let html = readFileSync('index.html', 'utf8')
    .replace(/\s*<link rel="preconnect"[^>]*>/g, '')
    .replace(/\s*<link href="https:\/\/fonts\.googleapis\.com[^>]*>/g, '')
    .replace(/\s*<link rel="manifest"[^>]*>/, '')
    .replace('<link rel="stylesheet" href="app.css" />', fontsLink + '  <link rel="stylesheet" href="app.css" />')
    .replace('<script type="module" src="app.js"></script>', '<script type="module" src="native.js"></script>\n  <script type="module" src="app.js"></script>');
  writeFileSync(path.join(out, 'index.html'), html);
  if (!existsSync(path.join(out, 'native.js'))) throw new Error('native.js yig‘ilmadi');
}
console.log(out + ' tayyor');
