/**
 * Barcha interfeys matnlari SHU YERDA (o'zbek, lotin).
 * Boshqa til qo'shish: `ru.ts` yarating (`const ru: Messages = {...}`) va `index.ts` da tanlang.
 */
export const uz = {
  app: {
    name: 'SmartEdu',
    tagline: "Kafedra uchun interaktiv ta'lim tizimi",
    loading: 'Yuklanmoqda…',
    save: 'Saqlash',
    cancel: 'Bekor qilish',
    delete: "O'chirish",
    edit: 'Tahrirlash',
    create: "Qo'shish",
    back: 'Orqaga',
    yes: 'Ha',
    no: "Yo'q",
    actions: 'Amallar',
    search: 'Qidirish',
    empty: "Hozircha ma'lumot yo'q",
    error: 'Xatolik yuz berdi. Qaytadan urinib ko‘ring.',
    confirmDelete: "Haqiqatan ham o'chirasizmi?",
    copy: 'Nusxalash',
    download: 'Yuklab olish',
    notConfigured: 'Supabase sozlanmagan. `.env.local` faylini to‘ldiring (README ga qarang).',
  },
  roles: { admin: 'Administrator', teacher: "O'qituvchi", student: 'Talaba' },
  home: {
    title: "Interaktiv ta'lim tizimi",
    lead: "Ma'ruza, amaliyot, nazorat, laboratoriya va kitoblar — bitta hisobda.",
    login: 'Kirish',
    features: [
      {
        title: "Jonli ma'ruza",
        text: "QR-kod orqali qo'shiling, savollarga javob bering, reytingni real vaqtda ko'ring.",
      },
      {
        title: 'Nazorat va test',
        text: "Natijalar avtomatik hisoblanadi va shaffof ko'rsatiladi.",
      },
      {
        title: 'Laboratoriya va kitoblar',
        text: "Savollar kitob sahifalari va 3D laboratoriya topshiriqlariga bog'lanadi.",
      },
    ],
  },
} as const

export type Messages = typeof uz
