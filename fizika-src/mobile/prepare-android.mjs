// `npx cap add android` dan keyin ishga tushiriladi: Google kirishdan qaytish manzili (deep link),
// versiya, ikonka va ochilish ekranini Android loyihasiga yozadi.
//   VERSION_CODE, VERSION_NAME — GitHub Actions beradi
import { readFileSync, writeFileSync, readdirSync, statSync, copyFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';

const A = 'android/app';
const RES = path.join(A, 'src/main/res');
const code = parseInt(process.env.VERSION_CODE || '1', 10);
const name = process.env.VERSION_NAME || '1.0.' + code;
const must = (cond, msg) => { if (!cond) throw new Error(msg); };

// 1. Deep link: uz.energyvibe.fizika://auth  (Supabase Auth → Redirect URLs ro'yxatida bo'lishi kerak)
const mf = path.join(A, 'src/main/AndroidManifest.xml');
let x = readFileSync(mf, 'utf8');
if (!x.includes('android:scheme="uz.energyvibe.fizika"')) {
  const i = x.indexOf('</intent-filter>');
  must(i > 0, 'AndroidManifest: intent-filter topilmadi');
  const add = `</intent-filter>
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="uz.energyvibe.fizika" android:host="auth" />
            </intent-filter>`;
  x = x.slice(0, i) + add + x.slice(i + '</intent-filter>'.length);
}
must(/android:launchMode="singleTask"/.test(x), 'MainActivity singleTask emas');
writeFileSync(mf, x);

// 2. Versiya
const bg = path.join(A, 'build.gradle');
let g = readFileSync(bg, 'utf8');
must(/versionCode \d+/.test(g) && /versionName "[^"]*"/.test(g), 'build.gradle: versionCode/versionName topilmadi');
g = g.replace(/versionCode \d+/, 'versionCode ' + code).replace(/versionName "[^"]*"/, `versionName "${name}"`);
writeFileSync(bg, g);

// 3. Ikonkalar va ochilish ekrani
const src = 'mobile/res';
for (const d of readdirSync(src)) {
  const p = path.join(src, d);
  if (!statSync(p).isDirectory()) continue;
  mkdirSync(path.join(RES, d), { recursive: true });
  for (const f of readdirSync(p)) copyFileSync(path.join(p, f), path.join(RES, d, f));
}
const valuesDir = path.join(RES, 'values');
writeFileSync(path.join(valuesDir, 'ic_launcher_background.xml'),
  '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#2347D6</color>\n</resources>\n');
let splashes = 0;
for (const d of readdirSync(RES)) {
  const f = path.join(RES, d, 'splash.png');
  if (!existsSync(f)) continue;
  copyFileSync(path.join(src, d.includes('land') ? 'splash-land.png' : 'splash-port.png'), f);
  splashes++;
}

// 4. WebView: telefonning shrift kattaligi sozlamasi va barmoq bilan kattalashtirish sahifani surib yubormasin
const ma = path.join(A, 'src/main/java/uz/energyvibe/fizika/MainActivity.java');
must(existsSync(ma), 'MainActivity.java topilmadi');
writeFileSync(ma, `package uz.energyvibe.fizika;

import android.os.Bundle;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebSettings s = getBridge().getWebView().getSettings();
        s.setTextZoom(100);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
    }
}
`);

// 5. Ilova nomi
const sx = path.join(valuesDir, 'strings.xml');
writeFileSync(sx, readFileSync(sx, 'utf8').replace(/(<string name="app_name">)[^<]*(<\/string>)/, '$1Fizika$2').replace(/(<string name="title_activity_main">)[^<]*(<\/string>)/, '$1Fizika$2'));

console.log(`android tayyor: versiya ${name} (${code}), splash ${splashes} ta`);
