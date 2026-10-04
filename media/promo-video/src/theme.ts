import { z } from 'zod';
import { zColor } from '@remotion/zod-types';

/** Ilovalardagi dizayn-tokenlar (apps/shared/src/styles/tokens.css) bilan bir xil. */
export const FONT = "'Manrope Variable', 'Manrope', system-ui, 'Segoe UI', sans-serif";

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const DURATION = 900; // 30 soniya

/** Sahnalar: boshlanish kadri va uzunligi. Har bir sahna oldingisi ustiga "iris" bilan ochiladi (OVERLAP kadr). */
export const OVERLAP = 10;
export const SCENES = [
  { id: 'brand', from: 0, to: 90 },      // 0-3s
  { id: 'order', from: 90, to: 240 },    // 3-8s
  { id: 'promo', from: 240, to: 390 },   // 8-13s
  { id: 'seller', from: 390, to: 540 },  // 13-18s
  { id: 'courier', from: 540, to: 720 }, // 18-24s
  { id: 'rating', from: 720, to: 840 },  // 24-28s
  { id: 'outro', from: 840, to: 900 },   // 28-30s
] as const;

export const colorSchema = zColor();

export const propsSchema = z.object({
  // ---- Brend va ranglar ----
  brandName: z.string(),
  slogan: z.string(),
  accent: colorSchema,       // asosiy brend rangi (ilovalardagi to'q sariq)
  accentDark: colorSchema,
  accentSoft: colorSchema,
  ink: colorSchema,          // qora (matn / qorong'u fon)
  cream: colorSchema,        // och fon

  // ---- Musiqa ritmi ----
  bpm: z.number().min(60).max(200), // animatsiya ritmi; 120 BPM = har 0,5 soniyada urg'u
  audioSrc: z.string().optional(),   // public/ ichidagi fayl, masalan "music.mp3" (ixtiyoriy)
  audioVolume: z.number().min(0).max(1),

  // ---- Sahna matnlari ----
  orderTitle1: z.string(),
  orderTitle2: z.string(),
  promoTitle1: z.string(),
  promoTitle2: z.string(),
  sellerTitle1: z.string(),
  sellerTitle2: z.string(),
  courierTitle1: z.string(),
  courierTitle2: z.string(),
  ratingTitle1: z.string(),
  ratingTitle2: z.string(),
  outroTitle: z.string(),
  ctaText: z.string(),
  ctaNote: z.string(),

  // ---- Buyurtma ma'lumotlari ----
  dish: z.string(),
  dishEmoji: z.string(),
  people: z.number().int().min(2).max(500),
  pricePerPerson: z.number(),
  promoCode: z.string(),
  discountPercent: z.number().min(1).max(90),
  deliveryFee: z.number(),
  courierName: z.string(),
  sellerShop: z.string(),

  // ---- Ilova nomlari (yakuniy ekran) ----
  appBuyer: z.string(),
  appSeller: z.string(),
  appCourier: z.string(),

  // ---- Haqiqiy ilova skrinshotlari (ixtiyoriy). public/ ichidagi yo'l, masalan "screens/buyer-home.png".
  // Berilsa, telefon ichidagi chizilgan interfeys o'rniga shu rasm ko'rinadi (390x844 nisbatda bo'lsin). ----
  screens: z.object({
    buyerHome: z.string().optional(),
    buyerFood: z.string().optional(),
    buyerCart: z.string().optional(),
    sellerOrder: z.string().optional(),
    courierMap: z.string().optional(),
    buyerTrack: z.string().optional(),
    buyerReview: z.string().optional(),
  }),
});

export type VideoProps = z.infer<typeof propsSchema>;

export const defaultProps: VideoProps = {
  brandName: "Uy ta'mi",
  slogan: 'bir bosishda',
  accent: '#ff6a13',
  accentDark: '#ee5a00',
  accentSoft: '#fff1e6',
  ink: '#17171c',
  cream: '#fff8f1',

  bpm: 120,
  audioSrc: undefined,
  audioVolume: 0.9,

  orderTitle1: 'Suyuq? Xamirli?',
  orderTitle2: 'Hammasi shu yerda',
  promoTitle1: 'Promokod bor?',
  promoTitle2: 'Chegirma shu zahoti',
  sellerTitle1: 'Yangi buyurtma!',
  sellerTitle2: 'Sotuvchi bir bosishda qabul qiladi',
  courierTitle1: 'Eng yaqin kuryer',
  courierTitle2: 'avtomatik biriktiriladi',
  ratingTitle1: 'Yetkazildi!',
  ratingTitle2: 'Baho bering',
  outroTitle: 'Uy ta\'mi ilovalari',
  ctaText: "energyvibe.uz'dan yuklab oling",
  ctaNote: 'Xaridor · Sotuvchi · Kuryer',

  dish: 'Mastava',
  dishEmoji: '🍲',
  people: 10,
  pricePerPerson: 25000,
  promoCode: 'UY10',
  discountPercent: 10,
  deliveryFee: 8000,
  courierName: 'Jasur',
  sellerShop: 'Malika oshxonasi',

  appBuyer: 'Xaridor',
  appSeller: 'Sotuvchi',
  appCourier: 'Kuryer',

  screens: {},
};

export const money = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + " so'm";
