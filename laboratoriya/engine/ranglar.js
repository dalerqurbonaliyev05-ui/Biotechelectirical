// Sim ranglari (IEC 60446 / GOST R 50462): L — jigarrang yoki qora, N — ko‘k, PE — sariq-yashil.
export const RANGLAR = {
  jigarrang:    { hex: '#7b4a26', nomi: { uz: 'Jigarrang', ru: 'Коричневый', en: 'Brown' } },
  qora:         { hex: '#24262b', nomi: { uz: 'Qora', ru: 'Чёрный', en: 'Black' } },
  kok:          { hex: '#1f6fd6', nomi: { uz: 'Ko‘k', ru: 'Синий', en: 'Blue' } },
  sariq_yashil: { hex: '#e2c300', hex2: '#1e9a48', nomi: { uz: 'Sariq-yashil', ru: 'Жёлто-зелёный', en: 'Yellow-green' } },
};

// Har bir o‘tkazgich roli uchun ruxsat etilgan ranglar (sxema JSON'da "ranglar" bilan almashtirish mumkin).
export const ROL_RANGLARI = {
  L: ['jigarrang', 'qora'],
  N: ['kok'],
  PE: ['sariq_yashil'],
};
