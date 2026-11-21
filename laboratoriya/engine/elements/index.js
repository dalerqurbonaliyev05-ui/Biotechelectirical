// Elementlar kutubxonasi. Yangi element qo‘shish: alohida fayl yozing va shu ro‘yxatga qo‘shing.
// Element tuzilishi laboratoriya/docs/sxema-qoshish.md da batafsil yozilgan.
import vvod from './vvod.js';
import avtomat_1p from './avtomat_1p.js';
import kalit_1 from './kalit_1.js';
import lampa_patron from './lampa_patron.js';
import taqsimlash_qutisi from './taqsimlash_qutisi.js';

export const ELEMENTLAR = { vvod, avtomat_1p, kalit_1, lampa_patron, taqsimlash_qutisi };

export function elementTuri(tur) {
  const d = ELEMENTLAR[tur];
  if (!d) throw new Error(`Noma’lum element turi: ${tur}`);
  return d;
}
