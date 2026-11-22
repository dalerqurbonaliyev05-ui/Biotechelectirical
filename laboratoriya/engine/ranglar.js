// Sim ranglari. Bir fazali tarmoq (IEC 60446): L — jigarrang/qora, N — ko‘k, PE — sariq-yashil.
// Uch fazali tarmoq (GOST, O‘zbekistonda keng tarqalgan): A — sariq, B — yashil, C — qizil.
export const RANGLAR = {
  jigarrang:    { hex: '#7b4a26', nomi: { uz: 'Jigarrang', ru: 'Коричневый', en: 'Brown' } },
  qora:         { hex: '#24262b', nomi: { uz: 'Qora', ru: 'Чёрный', en: 'Black' } },
  kulrang:      { hex: '#8a9099', nomi: { uz: 'Kulrang', ru: 'Серый', en: 'Grey' } },
  sariq:        { hex: '#e0b400', nomi: { uz: 'Sariq', ru: 'Жёлтый', en: 'Yellow' } },
  yashil:       { hex: '#1f9a4a', nomi: { uz: 'Yashil', ru: 'Зелёный', en: 'Green' } },
  qizil:        { hex: '#d93a32', nomi: { uz: 'Qizil', ru: 'Красный', en: 'Red' } },
  kok:          { hex: '#1f6fd6', nomi: { uz: 'Ko‘k', ru: 'Синий', en: 'Blue' } },
  sariq_yashil: { hex: '#e2c300', hex2: '#1e9a48', nomi: { uz: 'Sariq-yashil', ru: 'Жёлто-зелёный', en: 'Yellow-green' } },
};

// Har bir o‘tkazgich roli uchun ruxsat etilgan ranglar (sxema JSON'da "ranglar" bilan almashtirish mumkin).
export const ROL_RANGLARI = {
  L: ['jigarrang', 'qora'],
  N: ['kok'],
  PE: ['sariq_yashil'],
};

// Uch fazali sxemalar uchun: faza va boshqaruv simlari har qanday faza rangida bo‘lishi mumkin,
// lekin ko‘k faqat N uchun, sariq-yashil faqat PE uchun.
export const ROL_RANGLARI_3F = {
  L: ['jigarrang', 'qora', 'kulrang', 'sariq', 'yashil', 'qizil'],
  N: ['kok'],
  PE: ['sariq_yashil'],
};
