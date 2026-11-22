// Elementlar kutubxonasi. Yangi element qo‘shish: tegishli faylga yozing va shu ro‘yxatga qo‘shing.
// Element tuzilishi laboratoriya/docs/sxema-qoshish.md da batafsil yozilgan.
import vvod from './vvod.js';
import avtomat_1p from './avtomat_1p.js';
import kalit_1 from './kalit_1.js';
import lampa_patron from './lampa_patron.js';
import taqsimlash_qutisi from './taqsimlash_qutisi.js';
import { manba_3f, avtomat, rubilnik, difavtomat, hisoblagich_1f } from './kuch.js';
import { kontaktor, modulli_kontaktor, rele, vaqt_relesi, issiqlik_relesi } from './kommutatsiya.js';
import { tugma, tanlagich, signal_lampa } from './boshqaruv.js';
import { motor_3f, motor_6, motor_1f, ventilyator } from './motorlar.js';
import { lampochka, kalit_2y, rozetka, lyum_lampa, drossel, starter, karta_kalit } from './uy.js';
import { suzgich, voltmetr, ampermetr, vaqt_kaliti, solenoid, klemma_qator, chastota_ozgartirgich, radio_pult } from './avtomatika.js';

export const ELEMENTLAR = {
  vvod, avtomat_1p, kalit_1, lampa_patron, taqsimlash_qutisi,
  manba_3f, avtomat, rubilnik, difavtomat, hisoblagich_1f,
  kontaktor, modulli_kontaktor, rele, vaqt_relesi, issiqlik_relesi,
  tugma, tanlagich, signal_lampa,
  motor_3f, motor_6, motor_1f, ventilyator,
  lampochka, kalit_2y, rozetka, lyum_lampa, drossel, starter, karta_kalit,
  suzgich, voltmetr, ampermetr, vaqt_kaliti, solenoid, klemma_qator, chastota_ozgartirgich, radio_pult,
};

export function elementTuri(tur) {
  const d = ELEMENTLAR[tur];
  if (!d) throw new Error(`Noma’lum element turi: ${tur}`);
  return d;
}
