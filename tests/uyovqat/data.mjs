// Sinov ma'lumotlari (mock.mjs uchun).
const id = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
export const IDS = { buyer: id(1), seller: id(2), seller2: id(3), courier: id(4), order: id(100) };
const now = Date.now();
const iso = (min) => new Date(now + min * 60000).toISOString();

export const categories = [
  { id: id(10), parent_id: null, name: 'Suyuq taomlar', slug: 'suyuq', icon: '🍲', sort_order: 1, is_active: true },
  { id: id(11), parent_id: null, name: 'Xamirli taomlar', slug: 'xamirli', icon: '🥟', sort_order: 2, is_active: true },
  { id: id(12), parent_id: id(10), name: 'Sho\'rva', slug: 'shorva', icon: '🥣', sort_order: 1, is_active: true },
  { id: id(13), parent_id: id(10), name: 'Mastava', slug: 'mastava', icon: '🍲', sort_order: 2, is_active: true },
  { id: id(14), parent_id: id(11), name: 'Manti', slug: 'manti', icon: '🥟', sort_order: 1, is_active: true },
  { id: id(15), parent_id: id(11), name: 'Xonim', slug: 'xonim', icon: '🌯', sort_order: 2, is_active: true },
];
const food = (n, seller, cat, name, price, prep, img = true) => ({
  id: id(n), seller_id: seller, category_id: cat, name, description: `${name}: uyda, toza mahsulotlardan tayyorlanadi.`,
  price_per_portion: price, prep_minutes: prep, min_portions: 1, image_url: img ? `https://img.test/${n}.svg` : null, is_available: true, created_at: iso(-n),
});
export const food_items = [
  food(20, IDS.seller, id(13), 'Mastava', 25000, 90),
  food(21, IDS.seller, id(14), 'Qovurma manti', 30000, 60),
  food(22, IDS.seller2, id(12), 'Qaynatma sho\'rva', 28000, 120),
  food(23, IDS.seller2, id(15), 'Xonim', 22000, 75, false),
  food(24, IDS.seller, id(14), 'Bug\'li manti', 32000, 70),
  food(25, IDS.seller2, id(13), 'Mastava (go\'shtli)', 27000, 80),
];
export const uy_sellers = [
  { id: IDS.seller, display_name: 'Malika oshxonasi', rating_avg: 4.8, rating_count: 31 },
  { id: IDS.seller2, display_name: 'Dilnoza uyi', rating_avg: 4.6, rating_count: 12 },
];
const profile = (pid, role, name, extra = {}) => ({ id: pid, role, full_name: name, phone: '+998901234567', address: 'Chilonzor 5', lat: 41.27, lng: 69.2, shop_name: null, avatar_url: null, rating_avg: 0, rating_count: 0, is_active: true, ...extra });
export const uy_profiles = [
  profile(IDS.buyer, 'buyer', 'Ali Valiyev'),
  profile(IDS.seller, 'seller', 'Malika', { shop_name: 'Malika oshxonasi', rating_avg: 4.8, rating_count: 31, lat: 41.31, lng: 69.24 }),
  profile(IDS.courier, 'courier', 'Jasur Karimov', { lat: 41.3, lng: 69.25 }),
];
export const uy_settings = [{ key: 'delivery_fee', value: 8000 }];
export const bonus_rules = [{ id: id(90), name: 'Har 50 ta buyurtmaga bonus', every_n_orders: 50, bonus_type: 'percent', bonus_value: 5, is_active: true }];

export const order = (status, extra = {}) => ({
  id: IDS.order, buyer_id: IDS.buyer, seller_id: IDS.seller, status, people_count: 10, ready_at: iso(120), payment_method: 'cash', paid: false,
  promo_code: null, subtotal: 250000, discount_amount: 0, delivery_fee: 8000, total: 258000, delivery_address: 'Chilonzor 5, 12-uy',
  delivery_lat: 41.27, delivery_lng: 69.2, pickup_lat: 41.31, pickup_lng: 69.24, note: null, created_at: iso(-30), updated_at: iso(-5), ...extra,
});
export const order_items = [{ id: id(110), order_id: IDS.order, food_id: id(20), name: 'Mastava', unit_price: 25000, portions: 10, line_total: 250000 }];
export const order_status_log = [
  { order_id: IDS.order, status: 'new', created_at: iso(-30) },
  { order_id: IDS.order, status: 'accepted', created_at: iso(-25) },
  { order_id: IDS.order, status: 'preparing', created_at: iso(-10) },
];
