// Saytdagi "Uy taomlari" yuklab olish sahifasi: ko'rinish, havolalar, APK fayllar butunligi.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReadStream, mkdirSync, readFileSync, statSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { serveDir } from './mock.mjs';

const ROOT = new URL('../../', import.meta.url).pathname;
const SHOTS = new URL('./shots/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });
const CHROME = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
let browser, srv, base;

before(async () => {
  browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  ({ srv, url: base } = await serveDir(ROOT));
});
after(async () => { await browser?.close(); srv?.close(); });

const sha = (f) => new Promise((res, rej) => { const h = createHash('sha256'); createReadStream(f).on('data', (d) => h.update(d)).on('end', () => res(h.digest('hex'))).on('error', rej); });
const config = () => {
  const src = readFileSync(`${ROOT}uyovqat/config.js`, 'utf8');
  return new Function('window', `${src}; return window.UYOVQAT;`)({});
};

test('config.js: hajm va SHA-256 haqiqiy APK fayllarga mos', async () => {
  const cfg = config();
  for (const [name, app] of Object.entries(cfg.APPS)) {
    const file = `${ROOT}${app.file.slice(1)}`;
    assert.equal(statSync(file).size, app.bytes, `${name}: hajm`);
    assert.equal(await sha(file), app.sha256, `${name}: sha256`);
  }
});

test('sahifa: 3 ta yuklab olish tugmasi, yuklangan fayl nomi va tarkibi to\'g\'ri', async () => {
  const cfg = config();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => { if (r.status() >= 400 && !/fonts\.g/.test(r.url())) errors.push(`${r.status()} ${r.url()}`); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.goto(`${base}uyovqat/`);
  await page.waitForSelector('.uy-app');
  assert.equal(await page.locator('.uy-app [data-dl]').count(), 3);
  assert.equal((await page.locator('.uy-app[data-app=courier] [data-hash]').textContent()), cfg.APPS.courier.sha256);
  assert.match(await page.locator('.uy-app[data-app=buyer] [data-size]').textContent(), /^4,[0-9]$/);
  await page.screenshot({ path: `${SHOTS}site-top.png` });

  for (const name of ['buyer', 'seller', 'courier']) {
    const [dl] = await Promise.all([page.waitForEvent('download'), page.locator(`[data-dl=${name}]`).click()]);
    assert.equal(dl.suggestedFilename(), `uyovqat-${name}.apk`);
    const path = await dl.path();
    assert.equal(await sha(path), cfg.APPS[name].sha256, `${name}: yuklangan fayl`);
  }
  await page.locator('.uy-apps').scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${SHOTS}site-apps.png` });
  await page.locator('#install').scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${SHOTS}site-install.png`, fullPage: false });
  assert.deepEqual(errors, []);
});

test('mobil ko\'rinish: gorizontal skroll yo\'q, menyu ochiladi, bosh sahifada havola bor', async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36' });
  const page = await ctx.newPage();
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.goto(`${base}uyovqat/`);
  await page.waitForSelector('.uy-app');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(overflow <= 1, `gorizontal skroll: ${overflow}px`);
  await page.screenshot({ path: `${SHOTS}site-mobile.png` });
  await page.locator('#hamburger').click();
  assert.ok(await page.getByRole('link', { name: 'Uy taomlari' }).first().isVisible());

  // iPhone: ogohlantirish
  const ios = await browser.newContext({ viewport: { width: 390, height: 844 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148' });
  const p2 = await ios.newPage();
  await p2.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p2.goto(`${base}uyovqat/`);
  assert.ok(await p2.locator('#ios-note').isVisible());

  // Bosh sahifa menyusida yangi havola
  const home = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const p3 = await home.newPage();
  await p3.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p3.goto(base);
  const link = p3.locator('#nav-menu a[href="/uyovqat/"]');
  assert.ok(await link.isVisible());
  assert.equal((await link.textContent()).trim(), 'Uy taomlari');
  await p3.screenshot({ path: `${SHOTS}home-nav.png`, clip: { x: 0, y: 0, width: 1280, height: 120 } });
});

test('reklama videosi: bo\'lim, poster va mp4 fayl (30 soniya, 9:16) joyida', async () => {
  const { execFileSync } = await import('node:child_process');
  const file = `${ROOT}uyovqat/video/uyovqat-reklama.mp4`;
  const info = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_name,width,height,duration', '-of', 'default=nw=1', file]).toString();
  assert.match(info, /codec_name=h264/);
  assert.match(info, /width=720/); assert.match(info, /height=1280/);
  assert.ok(Math.abs(Number(/duration=([\d.]+)/.exec(info)[1]) - 30) < 0.2, 'davomiyligi 30 s');
  assert.ok(statSync(file).size < 5 * 1048576, 'veb uchun 5 MB dan kichik');

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const bad = [];
  page.on('response', (r) => { if (r.status() >= 400 && !/fonts\.g/.test(r.url())) bad.push(`${r.status()} ${r.url()}`); });
  await page.goto(`${base}uyovqat/`);
  const video = page.locator('#video video');
  assert.equal(await video.getAttribute('preload'), 'none');
  assert.equal(await video.locator('source').getAttribute('src'), '/uyovqat/video/uyovqat-reklama.mp4');
  assert.equal((await page.request.get(`${base}uyovqat/video/uyovqat-reklama.mp4`, { headers: { Range: 'bytes=0-99' } })).status() < 400, true);
  await page.locator('#video').scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  assert.ok(await video.isVisible());
  await page.screenshot({ path: `${SHOTS}site-video.png` });
  // Raqamlash: 01 video, 02 yuklab olish
  assert.deepEqual(await page.locator('.station b').allTextContents(), ['01', '02', '03', '04', '05']);
  assert.deepEqual(bad, []);

  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p2 = await m.newPage();
  await p2.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p2.goto(`${base}uyovqat/`);
  assert.ok((await p2.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 1, 'gorizontal skroll yo\'q');
  await p2.locator('#video').scrollIntoViewIfNeeded();
  await p2.waitForTimeout(900);
  await p2.screenshot({ path: `${SHOTS}site-video-mobile.png` });
});
