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
