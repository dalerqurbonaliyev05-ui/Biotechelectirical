// Admin panel: buyurtmalar, sotuvchilar, kuryerlar, promokodlar, statistika, sozlamalar.
// Frameworksiz (saytning boshqa sahifalari kabi); barcha dinamik matn esc() orqali xavfsizlantiriladi.
const { createClient } = window.supabase;
const sb = createClient(window.UY_CONFIG.url, window.UY_CONFIG.anonKey, { auth: { persistSession: true, autoRefreshToken: true } });
const $app = document.getElementById('app');

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => Math.round(Number(n ?? 0)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' so\'m';
const pad = (n) => String(n).padStart(2, '0');
const dt = (iso) => { if (!iso) return '—'; const d = new Date(iso); return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const STATUS = { new: ['Yangi', ''], accepted: ['Qabul qilindi', 'brand'], preparing: ['Tayyorlanmoqda', 'brand'], handed_to_courier: ['Yo\'lda', 'brand'], delivered: ['Yetkazildi', 'ok'], rejected: ['Rad etildi', 'bad'], cancelled: ['Bekor qilindi', 'bad'] };
const DELIVERY = { assigned: 'Biriktirildi', picked_up: 'Oldi', on_the_way: 'Yo\'lda', delivered: 'Yetkazdi' };
const badge = (s) => `<span class="badge ${STATUS[s]?.[1] ?? ''}">${esc(STATUS[s]?.[0] ?? s)}</span>`;

let toastTimer;
function toast(text, kind = 'ok') {
  document.querySelector('.toast')?.remove();
  const t = document.createElement('div'); t.className = `toast ${kind}`; t.textContent = text; document.body.appendChild(t);
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.remove(), 3500);
}
const fail = (e) => toast(e?.message ?? String(e), 'bad');

/* ---------------- Kirish ---------------- */
// Administrator faqat ID (masalan 912328580) yozadi: ro'yxatdan o'tkazib bo'lmaydigan domen qo'shiladi
// (parolni "email orqali tiklash" bilan hisobni egallab bo'lmasligi uchun). Email yozilsa o'zi ishlatiladi.
const loginToEmail = (v) => { const t = v.trim().toLowerCase(); return t.includes('@') ? t : `${t}@admin.uyovqat.invalid`; };
function renderLogin(msg = '') {
  $app.innerHTML = `
    <div class="login"><form id="lf">
      <div class="logo">🍲</div><h1>Admin panel</h1><p class="muted">Uy taomlari bozori. Faqat administratorlar uchun.</p>
      ${msg ? `<div class="err" role="alert">${esc(msg)}</div>` : ''}
      <div class="form" style="grid-template-columns:1fr">
        <label>Login (ID) yoki email<input name="email" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" required></label>
        <label>Parol<input name="password" type="password" autocomplete="current-password" required></label>
        <button class="btn" type="submit">Kirish</button>
      </div></form></div>`;
  document.getElementById('lf').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const btn = e.target.querySelector('button'); btn.disabled = true;
    const { error } = await sb.auth.signInWithPassword({ email: loginToEmail(String(f.get('email'))), password: String(f.get('password')) });
    if (error) { renderLogin(/Invalid login/i.test(error.message) ? 'Email yoki parol noto\'g\'ri' : error.message); return; }
    boot();
  });
}

/* ---------------- Ilova ---------------- */
const TABS = [['stats', 'Statistika'], ['orders', 'Buyurtmalar'], ['sellers', 'Sotuvchilar'], ['couriers', 'Kuryerlar'], ['promo', 'Promokodlar'], ['settings', 'Sozlamalar']];
let me = null; let tab = 'stats'; let mustChange = false;

async function boot() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return renderLogin();
  const { data: p } = await sb.from('uy_profiles').select('*').eq('id', session.user.id).maybeSingle();
  if (!p || p.role !== 'admin') { await sb.auth.signOut(); return renderLogin('Bu hisob administrator emas.'); }
  me = p;
  mustChange = session.user.user_metadata?.must_change_password === true;
  tab = (location.hash || '#stats').slice(1); if (!TABS.some((t) => t[0] === tab)) tab = 'stats';
  renderShell();
}

function renderShell() {
  $app.innerHTML = `
    <header class="top">
      <div class="brand"><i>🍲</i>Uy taomlari · Admin</div>
      <nav class="tabs" role="tablist">${TABS.map(([k, l]) => `<button role="tab" data-tab="${k}" class="${k === tab ? 'on' : ''}">${l}</button>`).join('')}</nav>
      <span class="who">${esc(me.full_name || 'Admin')}</span>
      <button class="btn ghost sm" id="out">Chiqish</button>
    </header>
    <main id="view"></main>`;
  $app.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; location.hash = tab; renderShell(); }));
  document.getElementById('out').addEventListener('click', async () => { await sb.auth.signOut(); renderLogin(); });
  const view = document.getElementById('view');
  if (mustChange && tab !== 'settings') { tab = 'settings'; location.hash = 'settings'; return renderShell(); }
  view.innerHTML = '<div class="boot"><div class="spin"></div></div>';
  ({ stats: viewStats, orders: viewOrders, sellers: viewSellers, couriers: viewCouriers, promo: viewPromo, settings: viewSettings })[tab](view).catch((e) => { view.innerHTML = `<div class="err">${esc(e.message)}</div>`; });
}

const card = (k, v, hi) => `<div class="stat ${hi ? 'hi' : ''}"><div class="k">${esc(k)}</div><div class="v">${v}</div></div>`;
const table = (heads, rows, numCols = []) => rows.length
  ? `<div class="tablewrap"><table><thead><tr>${heads.map((h, i) => `<th class="${numCols.includes(i) ? 'num' : ''}">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td class="${numCols.includes(i) ? 'num' : ''}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
  : '<div class="panel empty">Ma\'lumot yo\'q</div>';

/* ---------------- Statistika ---------------- */
async function viewStats(v) {
  const { data: s, error } = await sb.rpc('uy_admin_stats');
  if (error) throw error;
  const max = Math.max(1, ...s.daily.map((d) => d.orders));
  v.innerHTML = `
    <h2>Umumiy statistika</h2>
    <div class="cards">
      ${card('Bugungi buyurtmalar', s.today_orders, true)}${card('Bugungi aylanma', money(s.today_revenue), true)}
      ${card('Faol buyurtmalar', s.active_orders)}${card('Yetkazilgan', s.delivered_orders)}
      ${card('Jami buyurtmalar', s.total_orders)}${card('Umumiy aylanma (yetkazilgan)', money(s.total_revenue))}
      ${card('Sotuvchilar', s.sellers)}${card('Kuryerlar', `${s.free_couriers} / ${s.couriers} <span class="muted" style="font-size:14px">bo'sh</span>`)}
      ${card('Xaridorlar', s.buyers)}
    </div>
    <div class="panel"><h3 style="margin-top:0">So'nggi 14 kun: kunlik buyurtmalar</h3>
      <div class="chart">${s.daily.map((d) => `<div class="col" title="${esc(d.day)}: ${d.orders} ta, ${esc(money(d.revenue))}">
        <div class="n">${d.orders || ''}</div><div class="bar" style="height:${(d.orders / max) * 100}%"></div><div class="d">${esc(d.day.slice(8, 10) + '.' + d.day.slice(5, 7))}</div></div>`).join('')}</div>
    </div>`;
}

/* ---------------- Buyurtmalar ---------------- */
async function viewOrders(v) {
  const [o, p] = await Promise.all([
    sb.from('orders').select('*, order_items(name, portions), courier_assignments(courier_id, delivery_status)').order('created_at', { ascending: false }).limit(300),
    sb.from('uy_profiles').select('id, full_name, shop_name, phone'),
  ]);
  if (o.error) throw o.error;
  const names = Object.fromEntries((p.data ?? []).map((x) => [x.id, x]));
  const nm = (id) => esc(names[id]?.shop_name || names[id]?.full_name || '—');
  const draw = (filter) => {
    const list = o.data.filter((r) => !filter || r.status === filter);
    document.getElementById('olist').innerHTML = table(['Sana', 'Xaridor', 'Sotuvchi', 'Taomlar', 'To\'lov', 'Jami', 'Holat', 'Kuryer'],
      list.map((r) => {
        const a = Array.isArray(r.courier_assignments) ? r.courier_assignments[0] : r.courier_assignments;
        return [esc(dt(r.created_at)), nm(r.buyer_id), nm(r.seller_id),
          esc(r.order_items.map((i) => `${i.name} (${i.portions} kishi)`).join(', ')),
          r.payment_method === 'cash' ? 'Naqd' : 'Karta', esc(money(r.total)) + (r.promo_code ? `<br><span class="muted">${esc(r.promo_code)}</span>` : ''),
          badge(r.status), a ? `${nm(a.courier_id)}<br><span class="muted">${esc(DELIVERY[a.delivery_status])}</span>` : '<span class="muted">—</span>'];
      }), [5]);
  };
  v.innerHTML = `<div class="row" style="justify-content:space-between;margin-bottom:14px"><h2 style="margin:0">Buyurtmalar <span class="muted">(${o.data.length})</span></h2>
    <select id="of" class="inline" style="height:40px;border-radius:12px;border:2px solid var(--line);padding:0 12px"><option value="">Hammasi</option>${Object.entries(STATUS).map(([k, [l]]) => `<option value="${k}">${esc(l)}</option>`).join('')}</select></div>
    <div id="olist"></div>`;
  draw('');
  document.getElementById('of').addEventListener('change', (e) => draw(e.target.value));
}

/* ---------------- Sotuvchilar ---------------- */
async function viewSellers(v) {
  const [s, c] = await Promise.all([sb.rpc('uy_admin_seller_stats'), sb.from('orders').select('seller_id, status')]);
  if (s.error) throw s.error;
  const active = {};
  (c.data ?? []).filter((x) => ['new', 'accepted', 'preparing', 'handed_to_courier'].includes(x.status)).forEach((x) => { active[x.seller_id] = (active[x.seller_id] ?? 0) + 1; });
  const tot = s.data.reduce((a, r) => ({ n: a.n + Number(r.delivered_orders), net: a.net + Number(r.net_total), b: a.b + Number(r.bonus_total) }), { n: 0, net: 0, b: 0 });
  v.innerHTML = `<h2>Sotuvchilar: daromad va bonus</h2>
    <div class="cards" style="margin-bottom:14px">${card('Yetkazilgan buyurtmalar', tot.n)}${card('Sotuvchilarga to\'langan (sof)', money(tot.net))}${card('Berilgan bonuslar', money(tot.b), true)}</div>
    ${table(['Sotuvchi', 'Telefon', 'Reyting', 'Faol', 'Yetkazilgan', 'Aylanma', 'Sof daromad', 'Bonus'],
      s.data.map((r) => [`<b>${esc(r.shop_name || r.full_name)}</b><br><span class="muted">${esc(r.full_name)}</span>`, esc(r.phone ?? '—'),
        Number(r.rating_avg) ? `★ ${Number(r.rating_avg).toFixed(1)}` : '—', active[r.seller_id] ?? 0, r.delivered_orders,
        esc(money(r.gross_total)), esc(money(r.net_total)), esc(money(r.bonus_total))]), [3, 4, 5, 6, 7])}`;
}

/* ---------------- Kuryerlar ---------------- */
async function viewCouriers(v) {
  const [c, p, a] = await Promise.all([
    sb.from('couriers').select('*'), sb.from('uy_profiles').select('id, full_name, phone, rating_avg').eq('role', 'courier'),
    sb.from('courier_assignments').select('courier_id, delivery_status, order_id'),
  ]);
  if (c.error) throw c.error;
  const prof = Object.fromEntries((p.data ?? []).map((x) => [x.id, x]));
  const rows = (c.data ?? []).map((x) => {
    const mine = (a.data ?? []).filter((r) => r.courier_id === x.id);
    const cur = mine.find((r) => r.delivery_status !== 'delivered');
    const loc = x.lat != null ? `<a href="https://www.openstreetmap.org/?mlat=${x.lat}&mlon=${x.lng}#map=16/${x.lat}/${x.lng}" target="_blank" rel="noopener">${Number(x.lat).toFixed(4)}, ${Number(x.lng).toFixed(4)}</a><br><span class="muted">${esc(dt(x.location_updated_at))}</span>` : '<span class="muted">noma\'lum</span>';
    return [`<b>${esc(prof[x.id]?.full_name ?? '—')}</b><br><span class="muted">${esc(x.vehicle ?? '')}</span>`, esc(prof[x.id]?.phone ?? '—'),
      x.availability === 'free' ? '<span class="badge ok">Bo\'sh</span>' : '<span class="badge">Band</span>', loc,
      cur ? `<span class="badge brand">${esc(DELIVERY[cur.delivery_status])}</span>` : '<span class="muted">—</span>',
      mine.filter((r) => r.delivery_status === 'delivered').length, Number(prof[x.id]?.rating_avg) ? `★ ${Number(prof[x.id].rating_avg).toFixed(1)}` : '—'];
  });
  v.innerHTML = `<h2>Kuryerlar <span class="muted">(${rows.length})</span></h2>${table(['Kuryer', 'Telefon', 'Holat', 'Joylashuv', 'Joriy buyurtma', 'Yetkazgan', 'Reyting'], rows, [5])}`;
}

/* ---------------- Promokodlar ---------------- */
async function viewPromo(v) {
  const { data, error } = await sb.from('promo_codes').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  const now = Date.now();
  v.innerHTML = `<h2>Promokodlar</h2>
    <form id="pf" class="panel form" style="margin-top:0">
      <label>Kod<input name="code" required minlength="3" maxlength="32" placeholder="UY10" style="text-transform:uppercase"></label>
      <label>Turi<select name="kind"><option value="percent">Foiz (%)</option><option value="amount">Summa (so'm)</option></select></label>
      <label>Qiymat<input name="value" type="number" min="1" step="0.01" required></label>
      <label>Min. buyurtma (so'm)<input name="min" type="number" min="0" value="0"></label>
      <label>Amal qilish muddati<input name="until" type="datetime-local"></label>
      <label>Limit (bo'sh = cheksiz)<input name="limit" type="number" min="1"></label>
      <button class="btn" type="submit">Yaratish</button></form>
    <div style="margin-top:14px">${table(['Kod', 'Chegirma', 'Min. summa', 'Muddat', 'Ishlatildi', 'Holat', ''],
      (data ?? []).map((r) => {
        const expired = r.valid_until && new Date(r.valid_until).getTime() < now;
        const full = r.usage_limit != null && r.used_count >= r.usage_limit;
        const st = !r.is_active ? '<span class="badge">O\'chirilgan</span>' : expired ? '<span class="badge bad">Muddati tugagan</span>' : full ? '<span class="badge bad">Limit tugagan</span>' : '<span class="badge ok">Faol</span>';
        return [`<b>${esc(r.code)}</b>`, r.discount_percent != null ? `${Number(r.discount_percent)}%` : esc(money(r.discount_amount)), esc(money(r.min_order_total)),
          r.valid_until ? esc(dt(r.valid_until)) : 'Cheksiz', `${r.used_count}${r.usage_limit != null ? ' / ' + r.usage_limit : ''}`, st,
          `<button class="btn ghost sm" data-toggle="${esc(r.id)}" data-on="${r.is_active ? 1 : 0}">${r.is_active ? 'O\'chirib qo\'yish' : 'Yoqish'}</button> <button class="btn danger sm" data-del="${esc(r.id)}">O'chirish</button>`];
      }))}</div>`;
  document.getElementById('pf').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target); const val = Number(f.get('value'));
    const row = { code: String(f.get('code')).trim().toUpperCase(), min_order_total: Number(f.get('min') || 0), created_by: me.id,
      usage_limit: f.get('limit') ? Number(f.get('limit')) : null, valid_until: f.get('until') ? new Date(String(f.get('until'))).toISOString() : null,
      ...(f.get('kind') === 'percent' ? { discount_percent: val } : { discount_amount: val }) };
    if (row.discount_percent > 100) return toast('Foiz 100 dan oshmasin', 'bad');
    const { error: er } = await sb.from('promo_codes').insert(row);
    if (er) return fail(er.code === '23505' ? { message: 'Bu kod allaqachon mavjud' } : er);
    toast('Promokod yaratildi'); viewPromo(v).catch(fail);
  });
  v.querySelectorAll('[data-toggle]').forEach((b) => b.addEventListener('click', async () => {
    const { error: er } = await sb.from('promo_codes').update({ is_active: b.dataset.on !== '1' }).eq('id', b.dataset.toggle);
    if (er) return fail(er); viewPromo(v).catch(fail);
  }));
  v.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('Promokodni o\'chirasizmi?')) return;
    const { error: er } = await sb.from('promo_codes').delete().eq('id', b.dataset.del);
    // Buyurtmada ishlatilgan kod bazadan o'chmaydi (tarix saqlanadi): faol emas qilinadi.
    if (er) { await sb.from('promo_codes').update({ is_active: false }).eq('id', b.dataset.del); toast('Buyurtmalarda ishlatilgan: faol emas qilindi'); }
    else toast('O\'chirildi');
    viewPromo(v).catch(fail);
  }));
}

/* ---------------- Sozlamalar: bonus qoidalari va platforma qiymatlari ---------------- */
const SETTING_LABELS = { delivery_fee: 'Yetkazish narxi (so\'m)', commission_pct: 'Platforma ulushi (%)', max_assign_radius_km: 'Kuryer qidirish radiusi (km)' };
async function viewSettings(v) {
  const [r, s] = await Promise.all([sb.from('bonus_rules').select('*').order('created_at'), sb.from('uy_settings').select('*')]);
  if (r.error) throw r.error;
  v.innerHTML = `<h2>Sozlamalar</h2>
    ${mustChange ? '<div class="err" role="alert">Xavfsizlik uchun avval bir martalik parolni o\'zingizniki bilan almashtiring.</div>' : ''}
    <h3 style="margin-top:0">Parolni o'zgartirish</h3>
    <form id="pwf" class="panel form" style="margin-top:0">
      <label>Yangi parol (kamida 10 belgi)<input name="p1" type="password" autocomplete="new-password" minlength="10" required></label>
      <label>Yangi parolni takrorlang<input name="p2" type="password" autocomplete="new-password" minlength="10" required></label>
      <button class="btn" type="submit">Parolni almashtirish</button></form>
    <h3>Sotuvchi bonus qoidalari</h3>
    <p class="muted">Har N ta yetkazilgan buyurtmadan keyin sotuvchiga bonus beriladi. Foiz: oxirgi N ta buyurtma sof daromadidan.</p>
    ${r.data.map((x) => `<form class="panel form" data-rule="${esc(x.id)}">
      <label>Nomi<input name="name" value="${esc(x.name)}" required></label>
      <label>Har necha buyurtmada<input name="n" type="number" min="1" value="${x.every_n_orders}" required></label>
      <label>Turi<select name="type"><option value="percent" ${x.bonus_type === 'percent' ? 'selected' : ''}>Foiz (%)</option><option value="fixed" ${x.bonus_type === 'fixed' ? 'selected' : ''}>Qat'iy summa</option></select></label>
      <label>Qiymat<input name="val" type="number" min="0" step="0.01" value="${Number(x.bonus_value)}" required></label>
      <label>Faol<select name="on"><option value="1" ${x.is_active ? 'selected' : ''}>Ha</option><option value="0" ${x.is_active ? '' : 'selected'}>Yo'q</option></select></label>
      <button class="btn" type="submit">Saqlash</button></form>`).join('')}
    <button class="btn ghost" id="addrule" style="margin-top:12px">+ Yangi qoida</button>
    <h3>Platforma sozlamalari</h3>
    <form id="sf" class="panel form" style="margin-top:0">${(s.data ?? []).filter((x) => SETTING_LABELS[x.key]).map((x) => `<label>${esc(SETTING_LABELS[x.key])}<input name="${esc(x.key)}" type="number" min="0" step="0.01" value="${Number(x.value)}" required></label>`).join('')}
      <button class="btn" type="submit">Saqlash</button></form>`;
  document.getElementById('pwf').addEventListener('submit', async (e) => {
    e.preventDefault(); const d = new FormData(e.target);
    if (d.get('p1') !== d.get('p2')) return toast('Parollar bir xil emas', 'bad');
    const { error } = await sb.auth.updateUser({ password: String(d.get('p1')), data: { must_change_password: false } });
    if (error) return fail(error);
    mustChange = false; e.target.reset(); toast('Parol almashtirildi'); renderShell();
  });
  v.querySelectorAll('[data-rule]').forEach((f) => f.addEventListener('submit', async (e) => {
    e.preventDefault(); const d = new FormData(f);
    const { error } = await sb.from('bonus_rules').update({ name: d.get('name'), every_n_orders: Number(d.get('n')), bonus_type: d.get('type'), bonus_value: Number(d.get('val')), is_active: d.get('on') === '1' }).eq('id', f.dataset.rule);
    if (error) fail(error); else toast('Saqlandi');
  }));
  document.getElementById('addrule').addEventListener('click', async () => {
    const { error } = await sb.from('bonus_rules').insert({ name: 'Yangi bonus qoidasi', every_n_orders: 100, bonus_type: 'percent', bonus_value: 5, is_active: false });
    if (error) fail(error); else viewSettings(v).catch(fail);
  });
  document.getElementById('sf').addEventListener('submit', async (e) => {
    e.preventDefault(); const d = new FormData(e.target);
    const results = await Promise.all([...d.entries()].map(([key, value]) => sb.from('uy_settings').update({ value: Number(value) }).eq('key', key)));
    const bad = results.find((x) => x.error); if (bad) fail(bad.error); else toast('Saqlandi');
  });
}

sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT') renderLogin(); });
boot().catch((e) => renderLogin(e.message));
