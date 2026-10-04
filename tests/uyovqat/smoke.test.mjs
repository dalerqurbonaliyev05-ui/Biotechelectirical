import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { installMock, serveDir } from './mock.mjs';
import * as D from './data.mjs';

const ROOT = new URL('../../apps/', import.meta.url).pathname;
const SHOTS = new URL('./shots/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });
const CHROME = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
let browser;
const servers = [];

before(async () => { browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] }); });
after(async () => { await browser?.close(); servers.forEach((s) => s.close()); });

async function open(app, user, { db, rpc, hash = '' }) {
  const { srv, url } = await serveDir(`${ROOT}${app}/dist`);
  servers.push(srv);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, geolocation: { latitude: 41.3, longitude: 69.25 }, permissions: ['geolocation'] });
  const mock = await installMock(ctx, { db, rpc, user });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR|WebSocket/.test(m.text())) errors.push(m.text()); });
  await page.goto(`${url}#${hash}`);
  return { page, mock, errors, ctx };
}

const baseDb = () => ({
  uy_profiles: structuredClone(D.uy_profiles), categories: structuredClone(D.categories), food_items: structuredClone(D.food_items),
  uy_sellers: structuredClone(D.uy_sellers), uy_settings: structuredClone(D.uy_settings), orders: [], order_items: [], order_status_log: [],
  courier_assignments: [], reviews: [], bonus_rules: structuredClone(D.bonus_rules),
});

test('xaridor: bosh sahifa, kategoriya chiplari, savat va buyurtma berish', async () => {
  const placed = [];
  const { page, errors, mock } = await open('buyer', { id: D.IDS.buyer, email: 'ali@test.uz' }, {
    db: baseDb(),
    rpc: {
      uy_preview_promo: ({ p_code, p_subtotal }) => (p_code.toUpperCase() === 'UY10' ? [{ valid: true, discount: Math.round(p_subtotal * 0.1), message: 'ok' }] : [{ valid: false, discount: 0, message: 'Promokod topilmadi' }]),
      uy_place_order: (args) => { placed.push(args); return D.IDS.order; },
    },
  });
  await page.waitForSelector('.u-food');
  assert.equal(await page.locator('.u-food').count(), 6);
  await page.screenshot({ path: `${SHOTS}buyer-home.png` });

  // Kategoriya: Xamirli taomlar -> Manti
  await page.getByRole('tab', { name: /Xamirli taomlar/ }).click();
  assert.equal(await page.locator('.u-food').count(), 3);
  await page.getByRole('tab', { name: /^🥟 Manti/ }).click();
  assert.equal(await page.locator('.u-food').count(), 2);
  await page.getByRole('tab', { name: /Hammasi/ }).first().click();

  // Qidiruv
  await page.getByLabel('Qidirish').fill('mastava');
  assert.equal(await page.locator('.u-food').count(), 2);
  await page.getByLabel('Qidirish').fill('');

  // Taom sahifasi: 10 kishiga mastava
  await page.locator('.u-food-img').first().click();
  await page.waitForSelector('text=Necha kishiga');
  await page.getByLabel("Ko'paytirish").click();
  await page.screenshot({ path: `${SHOTS}buyer-food.png` });
  await page.getByRole('button', { name: /Savatga qo'shish/ }).first().click();

  // Sticky savat tugmasi
  await page.waitForSelector('.u-sticky');
  await page.screenshot({ path: `${SHOTS}buyer-sticky.png` });
  await page.locator('.u-sticky button').click();
  await page.waitForSelector('text=Qachonga tayyor bo');
  await page.getByPlaceholder('Masalan: UY10').fill('uy10');
  await page.getByRole('button', { name: /Qo'llash/ }).click();
  await page.waitForSelector('text=Promokod');
  await page.screenshot({ path: `${SHOTS}buyer-cart.png`, fullPage: true });
  await page.getByRole('radio', { name: /Karta/ }).click();
  await page.locator('.u-sticky button').click();
  await page.waitForURL(/#\/orders\//);

  assert.equal(placed.length, 1);
  assert.equal(placed[0].p_pay, 'card');
  assert.equal(placed[0].p_promo, 'UY10');
  assert.equal(placed[0].p_items[0].portions, 5);
  assert.deepEqual(errors, []);
  assert.ok(mock.log.some((l) => l.name === 'rpc/uy_place_order'));
});

test('xaridor: buyurtma holati timeline va sharh', async () => {
  const db = baseDb();
  db.orders = [D.order('preparing')];
  db.order_items = D.order_items; db.order_status_log = D.order_status_log;
  const { page, errors } = await open('buyer', { id: D.IDS.buyer, email: 'ali@test.uz' }, { db, hash: `/orders/${D.IDS.order}` });
  await page.waitForSelector('.u-tl');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${SHOTS}buyer-order-preparing.png`, fullPage: true });
  assert.ok(await page.locator('.u-tl-dot.current').count() === 1);

  db.orders[0].status = 'delivered';
  db.courier_assignments = [{ id: 'a1', order_id: D.IDS.order, courier_id: D.IDS.courier, delivery_status: 'delivered', distance_km: 2.4 }];
  await page.reload();
  await page.waitForSelector('text=Baho bering');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${SHOTS}buyer-order-delivered.png`, fullPage: true });
  await page.locator('.u-stars.big').first().getByRole('button').nth(4).click();
  await page.locator('.u-stars.big').nth(1).getByRole('button').nth(3).click();
  await page.getByRole('button', { name: 'Yuborish' }).click();
  await page.waitForTimeout(400);
  assert.equal(db.reviews.length, 2);
  assert.deepEqual(db.reviews.map((r) => r.rating).sort(), [4, 5]);

  await page.goto(page.url().split('#')[0] + '#/orders');
  await page.getByRole('button', { name: 'Tarix' }).click();
  await page.waitForSelector('.u-item');
  await page.screenshot({ path: `${SHOTS}buyer-orders.png` });
  assert.deepEqual(errors, []);
});

const sellerUser = { id: D.IDS.seller, email: 'malika@test.uz' };

test('sotuvchi: buyurtmani qabul qilish, taom qo\'shish, bonus progressi', async () => {
  const db = baseDb();
  db.orders = [D.order('new', { ready_at: new Date(Date.now() + 3 * 3600000).toISOString() })];
  db.order_items = D.order_items;
  db.seller_earnings = Array.from({ length: 37 }, (_, i) => ({ id: `e${i}`, seller_id: D.IDS.seller, order_id: `00000000-0000-0000-0000-${String(500 + i).padStart(12, '0')}`, gross: 100000, commission: 10000, net: 90000, created_at: new Date(Date.now() - i * 86400000).toISOString() }));
  db.seller_bonuses = [];
  const calls = [];
  const { page, errors } = await open('seller', sellerUser, {
    db, rpc: { uy_seller_set_status: (a) => { calls.push(a); db.orders[0].status = a.p_status; return null; } },
  });
  await page.waitForSelector('text=Yangi buyurtma');
  assert.ok(await page.getByText('Mastava').first().isVisible());
  await page.screenshot({ path: `${SHOTS}seller-orders.png` });
  await page.getByRole('button', { name: 'Qabul qilish' }).click();
  await page.getByRole('button', { name: 'Tayyorlashni boshlash' }).waitFor();
  assert.deepEqual(calls.map((c) => c.p_status), ['accepted']);

  await page.getByRole('link', { name: /Daromad/ }).click();
  await page.waitForSelector('text=Yana');
  await page.waitForTimeout(900);
  assert.ok(await page.getByText('13 ta').first().isVisible());           // 50 - 37
  await page.screenshot({ path: `${SHOTS}seller-earnings.png` });

  await page.getByRole('link', { name: /Taomlar/ }).click();
  await page.getByRole('button', { name: /Taom qo'shish/ }).click();
  await page.waitForSelector('text=Yangi taom');
  await page.getByPlaceholder('Masalan: Mastava').fill('Lag\'mon');
  await page.locator('select').selectOption({ label: 'Mastava' });
  await page.locator('input[type=number]').first().fill('26000');
  await page.screenshot({ path: `${SHOTS}seller-foodform.png` });
  await page.getByRole('button', { name: 'Saqlash' }).click();
  await page.waitForURL(/#\/foods$/);
  const added = db.food_items.find((x) => x.name === 'Lag\'mon');
  assert.ok(added && Number(added.price_per_portion) === 26000 && added.seller_id === D.IDS.seller);
  assert.deepEqual(errors, []);
});

const courierUser = { id: D.IDS.courier, email: 'jasur@test.uz' };

test('kuryer: xarita, bo\'sh holat va yetkazish bosqichlari', async () => {
  const db = baseDb();
  db.couriers = [{ id: D.IDS.courier, availability: 'busy', lat: 41.3, lng: 69.25, location_updated_at: null, vehicle: null }];
  db.uy_profiles.push({ ...D.uy_profiles[0], id: D.IDS.buyer });
  db.orders = [D.order('preparing')];
  db.courier_assignments = [{ id: 'a1', order_id: D.IDS.order, courier_id: D.IDS.courier, delivery_status: 'assigned', distance_km: 1.3, assigned_at: new Date().toISOString(), picked_up_at: null, delivered_at: null }];
  const steps = [];
  const { page, errors } = await open('courier', courierUser, {
    db, rpc: { uy_courier_set_delivery: (a) => { steps.push(a.p_status); db.courier_assignments[0].delivery_status = a.p_status; if (a.p_status === 'delivered') db.courier_assignments[0].delivered_at = new Date().toISOString(); return null; } },
  });
  await page.waitForSelector('.leaflet-container');
  await page.waitForSelector('text=Buyurtma bajarilmoqda');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${SHOTS}courier-map.png` });
  assert.ok(await page.locator('.u-pin').count() >= 2);                     // oshxona va mijoz belgilari
  await page.getByRole('button', { name: 'Oldim' }).click();
  await page.getByRole('button', { name: "Yo'ldaman" }).click();
  await page.getByRole('button', { name: 'Yetkazdim' }).click();
  await page.waitForTimeout(400);
  assert.deepEqual(steps, ['picked_up', 'on_the_way', 'delivered']);
  assert.deepEqual(errors, []);
});

test('admin panel: statistika, buyurtmalar, promokod yaratish, rol tekshiruvi', async () => {
  const ADMIN_DIR = new URL('../../admin/', import.meta.url).pathname;
  const { srv, url } = await serveDir(ADMIN_DIR);
  servers.push(srv);
  const db = baseDb();
  const admin = { id: '00000000-0000-0000-0000-0000000000ad', email: 'admin@test.uz' };
  db.uy_profiles.push({ ...D.uy_profiles[0], id: admin.id, role: 'admin', full_name: 'Admin' });
  db.orders = [D.order('delivered'), D.order('new', { id: '00000000-0000-0000-0000-000000000101', buyer_id: D.IDS.buyer })];
  db.order_items = D.order_items; db.promo_codes = []; db.couriers = [{ id: D.IDS.courier, availability: 'free', lat: 41.3, lng: 69.25, location_updated_at: new Date().toISOString(), vehicle: 'Skuter' }];
  db.courier_assignments = [];
  const daily = Array.from({ length: 14 }, (_, i) => ({ day: new Date(Date.now() - (13 - i) * 86400000).toISOString().slice(0, 10), orders: i % 5, revenue: (i % 5) * 100000 }));
  const rpc = {
    uy_admin_stats: () => ({ today_orders: 3, today_revenue: 640000, total_orders: 2, delivered_orders: 1, active_orders: 1, total_revenue: 258000, sellers: 2, couriers: 1, free_couriers: 1, buyers: 5, daily }),
    uy_admin_seller_stats: () => [{ seller_id: D.IDS.seller, shop_name: 'Malika oshxonasi', full_name: 'Malika', phone: '+998901234567', rating_avg: 4.8, delivered_orders: 37, gross_total: 3700000, net_total: 3330000, bonus_total: 0 }],
  };
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  await installMock(ctx, { db, rpc, user: admin });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url);
  await page.waitForSelector('text=Umumiy statistika');
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${SHOTS}admin-stats.png` });
  assert.ok(await page.getByText('640').first().isVisible());

  await page.getByRole('tab', { name: 'Buyurtmalar' }).click();
  await page.waitForSelector('table');
  assert.equal(await page.locator('tbody tr').count(), 2);
  await page.locator('#of').selectOption('new');
  assert.equal(await page.locator('tbody tr').count(), 1);

  await page.getByRole('tab', { name: 'Sotuvchilar' }).click();
  await page.waitForSelector('text=Malika oshxonasi');
  await page.getByRole('tab', { name: 'Kuryerlar' }).click();
  await page.waitForSelector('text=Skuter');

  await page.getByRole('tab', { name: 'Promokodlar' }).click();
  await page.waitForSelector('#pf');
  await page.locator('#pf input[name=code]').fill('yoz10');
  await page.locator('#pf input[name=value]').fill('10');
  await page.locator('#pf button[type=submit]').click();
  await page.waitForTimeout(500);
  assert.equal(db.promo_codes.length, 1);
  assert.equal(db.promo_codes[0].code, 'YOZ10');
  assert.equal(db.promo_codes[0].discount_percent, 10);
  await page.screenshot({ path: `${SHOTS}admin-promo.png` });

  await page.getByRole('tab', { name: 'Sozlamalar' }).click();
  await page.waitForSelector('text=Sotuvchi bonus qoidalari');
  assert.equal(await page.locator('[data-rule] input[name=n]').inputValue(), '50');
  assert.deepEqual(errors, []);

  // Admin bo'lmagan hisob kira olmaydi
  const ctx2 = await browser.newContext();
  const db2 = baseDb();
  await installMock(ctx2, { db: db2, rpc: {}, user: { id: D.IDS.buyer, email: 'ali@test.uz' } });
  const p2 = await ctx2.newPage();
  await p2.goto(url);
  await p2.waitForSelector('text=administrator emas');
});

test('xaridor: kuryer xaritasi faqat yo\'lga chiqqach ko\'rinadi', async () => {
  const db = baseDb();
  db.orders = [D.order('preparing')];
  db.order_items = D.order_items; db.order_status_log = D.order_status_log;
  db.couriers = [{ id: D.IDS.courier, availability: 'busy', lat: 41.29, lng: 69.23, location_updated_at: new Date().toISOString(), vehicle: 'Skuter' }];
  db.courier_assignments = [{ id: 'a1', order_id: D.IDS.order, courier_id: D.IDS.courier, delivery_status: 'assigned', distance_km: 1.2 }];
  const { page, errors } = await open('buyer', { id: D.IDS.buyer, email: 'ali@test.uz' }, { db, hash: `/orders/${D.IDS.order}` });
  await page.waitForSelector('.u-tl');
  await page.waitForTimeout(500);
  assert.equal(await page.locator('.leaflet-container').count(), 0, 'olib ketmasdan xarita ko\'rinmasligi kerak');

  db.orders[0].status = 'handed_to_courier';
  db.courier_assignments[0].delivery_status = 'on_the_way';
  await page.reload();
  await page.waitForSelector('.leaflet-container');
  await page.waitForSelector('text=Jasur Karimov yo');
  await page.waitForTimeout(1000);
  assert.equal(await page.locator('.u-pin').count(), 2);               // kuryer va uy
  assert.ok(await page.getByText(/taxminan/).isVisible());
  await page.screenshot({ path: `${SHOTS}buyer-courier-map.png`, fullPage: true });

  // Kuryer joylashuvi yangilanadi (zaxira so'rov); aloqa uzilsa ogohlantiradi
  db.couriers[0].location_updated_at = new Date(Date.now() - 5 * 60000).toISOString();
  await page.waitForSelector('text=Oxirgi yangilanish', { timeout: 20000 });
  assert.deepEqual(errors, []);
});

test('admin: ID bilan kirish va bir martalik parolni almashtirish', async () => {
  const ADMIN_DIR = new URL('../../admin/', import.meta.url).pathname;
  const { srv, url } = await serveDir(ADMIN_DIR);
  servers.push(srv);
  const db = baseDb();
  const admin = { id: '00000000-0000-0000-0000-0000000000ad', email: '912328580@admin.uyovqat.invalid', meta: { must_change_password: true } };
  db.uy_profiles.push({ ...D.uy_profiles[0], id: admin.id, role: 'admin', full_name: 'Administrator' });
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 800 } });
  const { log } = await installMock(ctx, { db, rpc: {}, user: admin, seed: false });
  const page = await ctx.newPage();
  await page.goto(url);
  await page.waitForSelector('#lf');
  await page.locator('input[name=email]').fill('912328580');
  await page.locator('input[name=password]').fill('bir-martalik');
  await page.locator('#lf button').click();
  // Birinchi kirishda majburan "Sozlamalar" ga o'tadi
  await page.waitForSelector('#pwf');
  assert.ok(await page.getByText('bir martalik parolni').isVisible());
  assert.equal(JSON.parse(log.find((l) => l.name === 'auth/token').body).email, '912328580@admin.uyovqat.invalid');
  await page.screenshot({ path: `${SHOTS}admin-firstlogin.png` });

  await page.locator('#pwf input[name=p1]').fill('yangi-parol-123');
  await page.locator('#pwf input[name=p2]').fill('boshqa-parol-123');
  await page.locator('#pwf button').click();
  await page.waitForSelector('text=Parollar bir xil emas');
  assert.ok(!log.some((l) => l.name === 'auth/user'));
  await page.locator('#pwf input[name=p2]').fill('yangi-parol-123');
  await page.locator('#pwf button').click();
  await page.waitForTimeout(500);
  const upd = JSON.parse(log.find((l) => l.name === 'auth/user').body);
  assert.equal(upd.password, 'yangi-parol-123');
  assert.equal(upd.data.must_change_password, false);
});
