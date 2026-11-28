// 3D sifat darajalari (unumdorlik). Sahifa manzili: ?quality=past|orta|yuqori, ?pr=1|1.5|2 (piksel zichligi),
// ?aa=0 (antialias o‘chirilsin), ?merge=0|1 (statik mesh birlashtirish), ?debug=1 (FPS/draw call paneli).
// Standart daraja qurilma imkoniyatiga qarab tanlanadi (asosiy ko‘rsatkich — barmoq/sichqoncha), ekran kengligiga emas.
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

export function sifatAniqla(qs = (typeof location !== 'undefined' ? location.search : '')) {
  const p = new URLSearchParams(qs);
  let nom = (p.get('quality') || '').toLowerCase();
  nom = ALIAS[nom] || nom;
  if (!SIFAT[nom]) {
    let telefon = false;
    try { telefon = matchMedia('(pointer: coarse)').matches; } catch (e) { /* e’tiborsiz */ }
    nom = telefon ? 'past' : 'yuqori';
  }
  const s = { ...SIFAT[nom] };
  const pr = parseFloat(p.get('pr'));
  if (pr >= 0.5 && pr <= 3) s.pr = pr;
  s.aa = p.get('aa') !== '0';
  if (p.has('merge')) s.birlash = p.get('merge') !== '0';
  s.debug = p.get('debug') === '1';
  return s;
}
