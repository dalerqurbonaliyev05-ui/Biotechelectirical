// Umumiy yordamchi funksiyalar (DOM ga bog'liq emas — Node testlarida ham ishlaydi)

export function hashString(s) {
  let h = 2166136261 >>> 0;
  const str = String(s);
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** seed + kalit bo'yicha takrorlanadigan tasodifiy generator */
export function rngFor(seed, key) {
  return mulberry32(hashString(seed + ':' + key));
}

/** seed + kalit bo'yicha bitta [0,1) son */
export function hashUnit(seed, key) {
  return rngFor(seed, key)();
}

/** 1 ± pct oralig'ida takrorlanadigan shovqin koeffitsiyenti */
export function noiseFactor(seed, key, pct) {
  return 1 + pct * (2 * hashUnit(seed, key) - 1);
}

export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length) % arr.length];
}

export function weightedPick(rng, items, weightOf = (x) => x.weight ?? 1) {
  const total = items.reduce((s, x) => s + weightOf(x), 0);
  let r = rng() * total;
  for (const it of items) {
    r -= weightOf(it);
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}

export function shuffle(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const round = (x, d = 0) => {
  const k = 10 ** d;
  return Math.round(x * k) / k;
};
export const sum = (arr) => arr.reduce((s, x) => s + x, 0);

export function deepClone(o) {
  return o === undefined ? undefined : JSON.parse(JSON.stringify(o));
}

export function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

export function setPath(obj, path, value) {
  const keys = path.split('.');
  let o = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (o[keys[i]] == null || typeof o[keys[i]] !== 'object') o[keys[i]] = {};
    o = o[keys[i]];
  }
  o[keys[keys.length - 1]] = value;
  return obj;
}

/** Son (o'nlik vergul bilan, o'zbekcha ko'rinish) */
export function fmtNum(x, d = 1) {
  if (x == null || Number.isNaN(x)) return '—';
  const s = Number(x).toFixed(d);
  return s.replace('.', ',');
}

/** Pul: so'm / mln so'm / mlrd so'm */
export function fmtSom(x) {
  if (x == null || Number.isNaN(x)) return '—';
  const a = Math.abs(x);
  const sign = x < 0 ? '−' : '';
  if (a >= 1e9) return sign + fmtNum(a / 1e9, 2) + ' mlrd so\'m';
  if (a >= 1e6) return sign + fmtNum(a / 1e6, a >= 1e8 ? 0 : 1) + ' mln so\'m';
  return sign + Math.round(a).toLocaleString('fr-FR').replace(/ | /g, ' ') + ' so\'m';
}

export function fmtClock(minutes, startHour = 8, dayMinutes = 540) {
  const day = Math.floor(minutes / dayMinutes);
  const m = Math.floor(minutes - day * dayMinutes);
  const total = startHour * 60 + m;
  const hh = String(Math.floor(total / 60)).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return { day: day + 1, text: `${hh}:${mm}` };
}

/** i18n tarjimon: kalit va o'zgaruvchilar beriladi — {x} o'rniga qiymat qo'yadi */
export function makeT(dict) {
  const t = (key, vars) => {
    const v = getPath(dict, key);
    if (v == null) return key;
    if (typeof v !== 'string') return v;
    return vars ? v.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? vars[k] : `{${k}}`)) : v;
  };
  t.has = (key) => getPath(dict, key) != null;
  return t;
}

/** Shablon matn: {x} o'rniga qiymat */
export function fill(str, vars = {}) {
  return String(str).replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? vars[k] : `{${k}}`));
}

/** Chuqur birlashtirish: oddiy obyektlar rekursiv, massivlar almashtiriladi */
export function deepMerge(target, patch) {
  if (!patch) return target;
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && target[k] && typeof target[k] === 'object' && !Array.isArray(target[k])) {
      deepMerge(target[k], v);
    } else {
      target[k] = Array.isArray(v) ? v.slice() : v && typeof v === 'object' ? deepClone(v) : v;
    }
  }
  return target;
}
