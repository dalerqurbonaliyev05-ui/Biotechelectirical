// Fizika veb-ilovasidan Android (Trusted Web Activity) loyihasini yaratadi.
// GitHub Actions ishga tushiradi: .github/workflows/fizika-apk.yml
//   MANIFEST_URL  — joylangan ilova manifesti
//   OUT_DIR       — Android loyiha papkasi
//   KEYSTORE      — imzo kaliti fayli (yo'li twa-manifest.json ga yoziladi)
//   VERSION_CODE, VERSION_NAME
'use strict';
const path = require('path');
const { TwaManifest, TwaGenerator, ConsoleLog } = require('@bubblewrap/core');

(async () => {
    const log = new ConsoleLog('fizika-twa');
    const url = process.env.MANIFEST_URL || 'https://energyvibe.uz/fizika/app/manifest.webmanifest';
    const out = path.resolve(process.env.OUT_DIR || 'twa-build');
    const code = parseInt(process.env.VERSION_CODE || '1', 10);
    const name = process.env.VERSION_NAME || '1.0.' + code;

    const m = await TwaManifest.fromWebManifest(url);
    m.packageId = 'uz.energyvibe.fizika';
    m.host = 'energyvibe.uz';
    m.name = 'Fizika';
    m.launcherName = 'Fizika';
    m.startUrl = '/fizika/app/index.html';
    m.fallbackType = 'customtabs';
    m.orientation = 'portrait';
    m.enableNotifications = false;
    m.enableSiteSettingsShortcut = false;
    m.appVersionCode = code;
    m.appVersionName = name;
    m.appVersion = name;
    m.signingKey = { path: path.resolve(process.env.KEYSTORE || 'android.keystore'), alias: 'fizika' };
    m.generatorApp = 'bubblewrap-cli';

    const errs = m.validate ? m.validate() : null;
    if (errs) throw new Error('twa-manifest xato: ' + errs);

    await new TwaGenerator().createTwaProject(out, m, log);
    await m.saveToFile(path.join(out, 'twa-manifest.json'));
    console.log('TWA loyiha tayyor:', out, 'versiya', name, '(' + code + ')', 'start', m.startUrl);
})().catch((e) => { console.error(e && e.stack || e); process.exit(1); });
