export const REGIONS = [
  'Toshkent shahri', 'Toshkent viloyati', 'Andijon viloyati', 'Farg‘ona viloyati', 'Namangan viloyati', 'Samarqand viloyati',
  'Buxoro viloyati', 'Navoiy viloyati', 'Qashqadaryo viloyati', 'Surxondaryo viloyati', 'Jizzax viloyati', 'Sirdaryo viloyati',
  'Xorazm viloyati', 'Qoraqalpog‘iston Respublikasi',
];

// Daraja: n-darajaga yetish uchun 50·n·(n−1) XP
export const LEVELS = ['Kvark', 'Elektron', 'Proton', 'Atom', 'Molekula', 'Kristall', 'Asteroid', 'Sayyora', 'Yulduz', 'Galaktika', 'Koinot'];
export function levelOf(xp = 0) {
  let n = 1;
  while (50 * (n + 1) * n <= xp) n++;
  const cur = 50 * n * (n - 1), next = 50 * (n + 1) * n;
  return { n, name: LEVELS[Math.min(n - 1, LEVELS.length - 1)], cur, next, pct: Math.min(1, (xp - cur) / (next - cur)) };
}

export const REWARDS = [
  { id: 'first_test', title: 'Birinchi qadam', description: 'Birinchi testni yakunladingiz', icon: '👣', kind: 'badge', rule: { tests: 1 }, sort: 1 },
  { id: 'tests_10', title: 'Sinovchi', description: '10 ta test yakunlandi', icon: '🧪', kind: 'badge', rule: { tests: 10 }, sort: 2 },
  { id: 'tests_50', title: 'Test ustasi', description: '50 ta test yakunlandi', icon: '🎓', kind: 'badge', rule: { tests: 50 }, sort: 3 },
  { id: 'perfect_1', title: 'Xatosiz', description: 'Kamida 5 savolli testda hammasi to‘g‘ri', icon: '🎯', kind: 'badge', rule: { perfect: 1 }, sort: 4 },
  { id: 'perfect_5', title: 'Beshlik', description: '5 marta xatosiz natija', icon: '5️⃣', kind: 'badge', rule: { perfect: 5 }, sort: 5 },
  { id: 'streak_3', title: 'Uch kun ketma-ket', description: '3 kun uzluksiz shug‘ullanish', icon: '🔥', kind: 'badge', rule: { streak: 3 }, sort: 6 },
  { id: 'streak_7', title: 'Haftalik olov', description: '7 kun uzluksiz', icon: '☄️', kind: 'badge', rule: { streak: 7 }, sort: 7 },
  { id: 'streak_30', title: 'Oy chempioni', description: '30 kun uzluksiz', icon: '🌙', kind: 'badge', rule: { streak: 30 }, sort: 8 },
  { id: 'xp_500', title: 'Zaryadlangan', description: '500 XP to‘plandi', icon: '⚡', kind: 'badge', rule: { xp: 500 }, sort: 9 },
  { id: 'xp_2000', title: 'Yadro energiyasi', description: '2000 XP to‘plandi', icon: '☢️', kind: 'badge', rule: { xp: 2000 }, sort: 10 },
  { id: 'xp_5000', title: 'Yulduz', description: '5000 XP to‘plandi', icon: '⭐', kind: 'badge', rule: { xp: 5000 }, sort: 11 },
  { id: 'games_5', title: 'Tajribachi', description: '5 ta laboratoriya o‘yini', icon: '🔬', kind: 'badge', rule: { games: 5 }, sort: 12 },
  { id: 'games_25', title: 'Laboratoriya sohibi', description: '25 ta o‘yin', icon: '🧲', kind: 'badge', rule: { games: 25 }, sort: 13 },
  { id: 'daily_7', title: 'Kunlik intizom', description: '7 ta kunlik test', icon: '📅', kind: 'badge', rule: { daily: 7 }, sort: 14 },
  { id: 'milliy_1', title: 'Imtihon sinovi', description: 'Milliy sertifikat sinovini to‘liq yechdingiz', icon: '📜', kind: 'badge', rule: { milliy: 1 }, sort: 15 },
  // Tangalar evaziga sovg‘alar
  { id: 'av_magnet', title: 'Magnit avatar', description: 'Profil uchun 🧲', icon: '🧲', kind: 'avatar', cost_coins: 50, sort: 30 },
  { id: 'av_flask', title: 'Kolba avatar', description: 'Profil uchun 🧪', icon: '🧪', kind: 'avatar', cost_coins: 60, sort: 31 },
  { id: 'av_scope', title: 'Teleskop avatar', description: 'Profil uchun 🔭', icon: '🔭', kind: 'avatar', cost_coins: 80, sort: 32 },
  { id: 'av_bolt', title: 'Chaqmoq avatar', description: 'Profil uchun ⚡', icon: '⚡', kind: 'avatar', cost_coins: 100, sort: 33 },
  { id: 'av_planet', title: 'Sayyora avatar', description: 'Profil uchun 🪐', icon: '🪐', kind: 'avatar', cost_coins: 150, sort: 34 },
  { id: 'av_rocket', title: 'Raketa avatar', description: 'Profil uchun 🚀', icon: '🚀', kind: 'avatar', cost_coins: 250, sort: 35 },
  { id: 'ti_newton', title: 'Yosh Nyuton', description: 'Reytingda ko‘rinadigan unvon', icon: '🍎', kind: 'title', cost_coins: 120, audience: 'student', sort: 40 },
  { id: 'ti_student', title: 'Kelajak talabasi', description: 'Reytingda ko‘rinadigan unvon', icon: '🏛️', kind: 'title', cost_coins: 120, audience: 'abiturient', sort: 41 },
  { id: 'ti_lab', title: 'Laboratoriya boshlig‘i', description: 'Noyob unvon', icon: '🥼', kind: 'title', cost_coins: 300, sort: 42 },
  { id: 'gift_cert', title: 'Faxriy yorliq', description: 'Ismingiz yozilgan chop etiladigan yorliq', icon: '🏆', kind: 'gift', cost_coins: 500, sort: 50 },
];

export const MODE_TITLES = {
  grade_test: 'Sinf testi', topic: 'Mavzu testi', abit_test: 'Variant', daily: 'Kunlik test', milliy: 'Milliy sertifikat', open: 'Ochiq savollar',
};

export const EXAM_TITLES = {
  '2024-04-07': '2024-yil, 7-aprel', '2024-10-12': '2024-yil, 12-oktabr', '2024-12-01': '2024-yil, 1-dekabr',
  '2025-02-22': '2025-yil, 22-fevral', '2025-05-13-1': '2025-yil, 13-may (1-smena)', '2025-05-13-2': '2025-yil, 13-may (2-smena)',
};

export const SOURCE_TITLES = {
  milliy: 'Milliy sertifikat savollari to‘plami', usmonov: 'M. Usmonov, Fizika (fiz-mat)', 'usmonov-boshlangich': 'M. Usmonov, boshlang‘ichlar uchun',
  muallif: 'Darslik asosida tuzilgan', 'darslik-6': '6-sinf darsligi', 'darslik-7': '7-sinf darsligi', 'darslik-8': '8-sinf darsligi',
  'darslik-9': '9-sinf darsligi', 'darslik-10': '10-sinf darsligi', 'darslik-11': '11-sinf darsligi', admin: 'Admin',
};
