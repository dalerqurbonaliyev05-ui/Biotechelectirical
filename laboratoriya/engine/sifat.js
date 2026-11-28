// 3D sifat darajalari (unumdorlik). Sahifa manzili: ?quality=past|orta|yuqori, ?pr=1|1.5|2 (piksel zichligi),
// ?aa=0 (antialias o‘chirilsin), ?merge=0|1 (statik mesh birlashtirish), ?debug=1 (FPS/draw call paneli).
// Standart daraja qurilma turiga qarab tanlanadi (teginish ko‘rsatkichi, hover yo‘qligi, mobil brauzer belgisi), ekran kengligiga emas.
//
// yuqori — kompyuter 3D, avvalgidek: 2 ta yo‘nalishli soya, yongan lampaning kub soyasi, har kadrda yangilanadi.
// orta   — 2 ta yo‘nalishli soya (1024²), faqat sahna o‘zgarganda qayta chiziladi; lampa kub soyasi yo‘q.
// past   — dinamik soya yo‘q (VR, yurish, telefon); lampa o‘rniga yorug‘lik dog‘i (glow).

export const SIFAT = {
  yuqori: { nom: 'yuqori', soya: true, soyaXarita: null, soyaStatik: false, lampaSoya: true, glow: false, birlash: false, pr: 2 },
  orta: { nom: 'orta', soya: true, soyaXarita: 1024, soyaStatik: true, lampaSoya: false, glow: true, birlash: true, pr: 1.5 },
  past: { nom: 'past', soya: false, soyaXarita: 0, soyaStatik: false, lampaSoya: false, glow: true, birlash: true, pr: 1.5 },
};

const ALIAS = { low: 'past', medium: 'orta', mid: 'orta', high: 'yuqori', 'o‘rta': 'orta' };

/** Telefon/planshetmi? Bir nechta belgi bo‘yicha (bittasi noto‘g‘ri chiqsa ham ishlashi uchun). Qaytaradi: { tel, belgi } */
export function qurilmaniAniqla() {
  const b = {};
  try { b.coarse = matchMedia('(pointer: coarse)').matches; } catch (e) { b.coarse = false; }
  try { b.hoverYoq = matchMedia('(hover: none)').matches; } catch (e) { b.hoverYoq = false; }
  const nav = typeof navigator !== 'undefined' ? navigator : {};
  b.touch = nav.maxTouchPoints || 0;
  b.mobil = !!(nav.userAgentData && nav.userAgentData.mobile) || /Android|iPhone|iPad|iPod|Mobile/i.test(nav.userAgent || '');
  // iPadOS Safari o‘zini Mac deb tanishtiradi, lekin bir nechta teginish nuqtasi bor
  b.ipad = /Macintosh/i.test(nav.userAgent || '') && b.touch > 1;
  const tel = b.coarse || b.hoverYoq || b.mobil || b.ipad;
  return { tel, belgi: `coarse=${+b.coarse} hover:none=${+b.hoverYoq} touch=${b.touch} mobil=${+b.mobil}${b.ipad ? ' ipad' : ''}` };
}

export function sifatAniqla(qs = (typeof location !== 'undefined' ? location.search : '')) {
  const p = new URLSearchParams(qs);
  let nom = (p.get('quality') || '').toLowerCase();
  nom = ALIAS[nom] || nom;
  let sabab = 'qo‘lda (?quality)';
  if (!SIFAT[nom]) {
    const q = qurilmaniAniqla();
    nom = q.tel ? 'past' : 'yuqori';
    sabab = `avto: ${q.belgi}`;
  }
  const s = { ...SIFAT[nom], sabab };
  const pr = parseFloat(p.get('pr'));
  if (pr >= 0.5 && pr <= 3) s.pr = pr;
  s.aa = p.get('aa') !== '0';
  if (p.has('merge')) s.birlash = p.get('merge') !== '0';
  s.debug = p.get('debug') === '1';
  return s;
}
