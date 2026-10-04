// Javoblarni baholash (demo rejim uchun; serverdagi fizika__grade bilan bir xil mantiq)
const SUPI = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-' };

/** Foydalanuvchi yozgan javobni songa aylantiradi: "4,5", "40/3", "4√3", "2·10^-3", "2,5·10⁻³", "3e8" */
export function parseNumber(input) {
  if (input == null) return null;
  let s = String(input).trim();
  if (!s) return null;
  s = s.replace(/[−–]/g, '-').replace(/,/g, '.').replace(/[∙·×x]/g, '*').replace(/\s+/g, '');
  s = s.replace(/10([⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, (_, e) => '10**(' + [...e].map(c => SUPI[c]).join('') + ')');
  s = s.replace(/10\^\(?(-?\d+)\)?/g, '10**($1)');
  s = s.replace(/(\d(?:\.\d+)?)√\(?(\d+(?:\.\d+)?)\)?/g, '$1*Math.sqrt($2)');
  s = s.replace(/√\(?(\d+(?:\.\d+)?)\)?/g, 'Math.sqrt($1)');
  s = s.replace(/(\d)(π|pi)/g, '$1*Math.PI').replace(/π|pi/g, 'Math.PI');
  s = s.replace(/[a-zA-ZΩμ°%/²³]+$/g, m => (m.includes('/') && /\d/.test(m) ? m : ''));
  if (!/^[\d+\-*/().eE]|Math/.test(s)) return null;
  if (/[^\d+\-*/().eE]/.test(s.replace(/Math\.(sqrt|PI)/g, ''))) return null;
  try {
    // eslint-disable-next-line no-new-func
    const v = Function('"use strict";return (' + s + ')')();
    return typeof v === 'number' && isFinite(v) ? v : null;
  } catch { return null; }
}

const normText = t => String(t || '').toLowerCase().replace(/[\s‘'`ʻ’]/g, '');

export function gradeAnswer(q, a) {
  if (a == null) return 0;
  if (q.qtype === 'mc') return String(a).toUpperCase() === String(q.answer).toUpperCase() ? 1 : 0;
  if (q.qtype === 'matching') {
    const keys = Object.keys(q.answer);
    const ok = keys.filter(k => String(a?.[k] || '').toUpperCase() === String(q.answer[k]).toUpperCase()).length;
    return Math.round((ok / Math.max(1, keys.length)) * 100) / 100;
  }
  if (q.qtype === 'open' || q.qtype === 'open2') {
    const parts = q.answer.parts || [];
    let pts = 0;
    parts.forEach((p, i) => {
      const g = a?.parts?.[i];
      if (!g) return;
      if (p.num != null && g.num != null) {
        if (Math.abs(g.num - p.num) <= Math.max(Math.abs(p.num) * 0.02, 1e-12)) pts++;
      } else if (g.text && normText(g.text) === normText(p.text)) pts++;
    });
    return Math.round((pts / Math.max(1, parts.length)) * 100) / 100;
  }
  return 0;
}

export function xpFor(q, points) {
  return Math.round(points * (3 + q.difficulty * 2));
}

// Milliy sertifikat bo'yicha TAXMINIY ball (maks. 75)
export function milliyBall(items) {
  let b = 0;
  for (const { q, points } of items) b += (q.qtype === 'mc' ? 1.3 : q.qtype === 'matching' ? 6.6 : 2.68) * points;
  return Math.round(b * 10) / 10;
}

/** Answer object for display */
export function answerText(q) {
  if (q.qtype === 'mc') return q.answer;
  if (q.qtype === 'matching') return Object.entries(q.answer).map(([k, v]) => `${k} → ${v}`).join(', ');
  return (q.answer.parts || []).map((p, i) => (q.answer.parts.length > 1 ? (i ? 'b) ' : 'a) ') : '') + p.text).join('   ');
}
