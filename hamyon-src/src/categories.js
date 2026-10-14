export const EXPENSE_CATS = [
  { id: 'oziq', name: 'Oziq-ovqat', icon: '🛒', color: '#F59E0B' },
  { id: 'transport', name: 'Transport', icon: '🚌', color: '#3B82F6' },
  { id: 'internet', name: 'Internet', icon: '📶', color: '#8B5CF6' },
  { id: 'kiyim', name: 'Kiyim-kechak', icon: '👕', color: '#EC4899' },
  { id: 'uyjoy', name: 'Uy-joy', icon: '🏠', color: '#14B8A6' },
  { id: 'tibbiyot', name: 'Tibbiyot', icon: '💊', color: '#EF4444' },
  { id: 'talim', name: "Ta'lim", icon: '📚', color: '#EAB308' },
  { id: 'dam', name: 'Dam olish', icon: '🎮', color: '#A855F7' },
  { id: 'boshqa', name: 'Boshqa', icon: '⋯', color: '#94A3B8' },
];

export const INCOME_CATS = [
  { id: 'in_maosh', name: 'Maosh', icon: '💼', color: '#16A34A' },
  { id: 'in_qoshimcha', name: "Qo'shimcha", icon: '➕', color: '#22C55E' },
  { id: 'in_sovga', name: "Sovg'a", icon: '🎁', color: '#10B981' },
  { id: 'in_boshqa', name: 'Boshqa', icon: '⋯', color: '#94A3B8' },
];

const ALL = [...EXPENSE_CATS, ...INCOME_CATS];
export const catById = (id) => ALL.find((c) => c.id === id) || EXPENSE_CATS[EXPENSE_CATS.length - 1];

// Izohdan kategoriyani avtomatik taxmin qilish (kalit so'zlar)
const KEYWORDS = {
  oziq: ['non', 'sabzavot', 'meva', "go'sht", 'gosht', 'sut', 'tuxum', 'guruch', 'yog', 'choy', 'kofe', 'bozor', 'market', 'korzinka', 'makro', 'oziq', 'ovqat', 'tushlik', 'kafe', 'restoran', 'osh', 'somsa', 'lavash', 'burger', 'pizza', 'shirinlik', 'ichimlik', 'suv'],
  transport: ['taksi', 'yandex', 'avtobus', 'metro', 'benzin', 'gaz', 'yoqilg', 'parkovka', 'yo\'l', 'yol haqi', 'transport', 'bilet', 'mashina'],
  internet: ['internet', 'wifi', 'wi-fi', 'tarif', 'telefon', 'mobil', 'beeline', 'ucell', 'uzmobile', 'mobiuz', 'humans', 'uztelecom', 'paket'],
  kiyim: ['kiyim', "ko'ylak", 'koylak', 'shim', 'poyabzal', 'krossovka', 'kurtka', 'futbolka', 'oyoq kiyim', 'soat', 'sumka'],
  uyjoy: ['kommunal', 'ijara', 'svet', 'elektr', 'tok', 'ichimlik suvi', 'uy', 'remont', 'mebel', 'kvartira', 'chiqindi', 'isitish'],
  tibbiyot: ['dori', 'apteka', 'shifokor', 'doktor', 'klinika', 'tish', 'tahlil', 'kasalxona', 'vitamin'],
  talim: ['kurs', 'kitob', "o'qish", 'oqish', 'kontrakt', 'daftar', 'ruchka', 'repetitor', 'dars', 'universitet', 'talim'],
  dam: ['kino', "o'yin", 'oyin', 'konsert', 'park', 'sayohat', 'dam', 'playstation', 'steam', 'obuna', 'netflix', 'spotify'],
};

const norm = (s) =>
  s
    .toLowerCase()
    .replace(/[‘’ʻʼ`´]/g, "'")
    .trim();

export function guessCategory(note) {
  const text = norm(note || '');
  if (text.length < 2) return null;
  const words = text.split(/[^a-z0-9'а-яё]+/i).filter(Boolean);
  for (const [cat, keys] of Object.entries(KEYWORDS)) {
    for (const k of keys) {
      const nk = norm(k);
      if (words.some((w) => w === nk || (nk.length >= 4 && w.startsWith(nk)))) return cat;
    }
  }
  return null;
}
