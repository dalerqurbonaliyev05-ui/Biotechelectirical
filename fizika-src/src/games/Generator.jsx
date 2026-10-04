import React, { useMemo, useState } from 'react';
import { parseNumber } from '../lib/grading.js';

const R = (a, b, s = 1) => Math.round((a + Math.random() * (b - a)) / s) * s;
const n = (x, d = 3) => String(+x.toPrecision(d)).replace('.', ',');
const pick = a => a[Math.floor(Math.random() * a.length)];

// Har bir generator: () => { t: matn, a: javob (son), u: birlik, f: formula }
export const GENS = {
  6: [
    () => { const r = pick([[1000, 'suv'], [2700, 'alyuminiy'], [7800, 'temir'], [900, 'muz']]); const V = R(0.2, 5, 0.1); return { t: `Hajmi ${n(V)} m³ bo‘lgan ${r[1]} bo‘lagining massasi qancha? (ρ = ${r[0]} kg/m³)`, a: r[0] * V, u: 'kg', f: 'm = ρ·V' }; },
    () => { const s = R(60, 600, 10), t = pick([2, 3, 4, 5, 6]); return { t: `Avtobus ${s} km yo‘lni ${t} soatda bosdi. O‘rtacha tezligi qancha?`, a: s / t, u: 'km/soat', f: 'v = s/t' }; },
    () => { const F = R(100, 2000, 50), S = pick([0.5, 0.25, 2, 0.1, 4]); return { t: `${F} N kuch ${n(S)} m² yuzaga tik ta’sir qilmoqda. Bosim qancha?`, a: F / S, u: 'Pa', f: 'p = F/S' }; },
    () => { const h = R(1, 12), rho = 1000; return { t: `Suvda ${h} m chuqurlikdagi gidrostatik bosim qancha? (g = 10 m/s²)`, a: rho * 10 * h, u: 'Pa', f: 'p = ρgh' }; },
    () => { const V = R(0.001, 0.02, 0.001); return { t: `Hajmi ${n(V)} m³ jism suvga to‘liq botirildi. Arximed kuchi qancha? (g = 10 m/s²)`, a: 1000 * 10 * V, u: 'N', f: 'F = ρgV' }; },
    () => { const F = R(20, 300, 10), s = R(2, 30); return { t: `Yashik ${F} N kuch bilan ${s} m ga surildi. Bajarilgan ish qancha?`, a: F * s, u: 'J', f: 'A = F·s' }; },
    () => { const A = R(600, 12000, 100), t = pick([10, 20, 30, 60]); return { t: `Dvigatel ${t} s da ${A} J ish bajardi. Quvvati qancha?`, a: A / t, u: 'W', f: 'N = A/t' }; },
    () => { const F1 = R(10, 60, 5), l1 = R(10, 40, 5), l2 = R(20, 80, 10); return { t: `Richagning ${l1} sm li yelkasiga ${F1} N kuch qo‘yilgan. ${l2} sm li yelkaga qancha kuch qo‘yilsa muvozanat bo‘ladi?`, a: F1 * l1 / l2, u: 'N', f: 'F₁l₁ = F₂l₂' }; },
  ],
  7: [
    () => { const v0 = R(0, 10), v = v0 + R(5, 25), t = R(2, 10); return { t: `Jism tezligi ${t} s da ${v0} m/s dan ${v} m/s gacha oshdi. Tezlanishi qancha?`, a: (v - v0) / t, u: 'm/s²', f: 'a = (v − v₀)/t' }; },
    () => { const a = pick([0.5, 1, 2, 3, 4]), t = R(2, 12); return { t: `Tinch holatdan ${n(a)} m/s² tezlanish bilan harakatlangan jism ${t} s da qancha yo‘l bosadi?`, a: a * t * t / 2, u: 'm', f: 's = at²/2' }; },
    () => { const t = R(1, 6); return { t: `Jism ${t} s davomida erkin tushdi. U qanday balandlikdan tushgan? (g = 10 m/s²)`, a: 5 * t * t, u: 'm', f: 'h = gt²/2' }; },
    () => { const v = R(10, 40, 5); return { t: `Jism ${v} m/s tezlik bilan tik yuqoriga otildi. Maksimal ko‘tarilish balandligi? (g = 10 m/s²)`, a: v * v / 20, u: 'm', f: 'h = v₀²/2g' }; },
    () => { const m = R(2, 50), a = pick([0.5, 1, 2, 2.5, 4]); return { t: `Massasi ${m} kg bo‘lgan jismga ${n(a)} m/s² tezlanish berish uchun qancha kuch kerak?`, a: m * a, u: 'N', f: 'F = ma' }; },
    () => { const k = R(50, 500, 10), x = R(1, 15); return { t: `Bikrligi ${k} N/m prujina ${x} sm ga cho‘zildi. Elastiklik kuchi?`, a: k * x / 100, u: 'N', f: 'F = kx' }; },
    () => { const m = R(1, 10), v = R(2, 20); return { t: `Massasi ${m} kg, tezligi ${v} m/s bo‘lgan jismning kinetik energiyasi?`, a: m * v * v / 2, u: 'J', f: 'E = mv²/2' }; },
    () => { const m = R(1, 20), h = R(2, 30); return { t: `${m} kg yuk ${h} m balandlikka ko‘tarildi. Potensial energiyasi? (g = 10 m/s²)`, a: m * 10 * h, u: 'J', f: 'E = mgh' }; },
    () => { const m = R(1, 8), v = R(2, 15); return { t: `Massasi ${m} kg, tezligi ${v} m/s bo‘lgan aravachaning impulsi?`, a: m * v, u: 'kg·m/s', f: 'p = mv' }; },
    () => { const R0 = pick([0.2, 0.5, 1, 2]), v = R(2, 10); return { t: `Radiusi ${n(R0)} m aylanada ${v} m/s tezlik bilan harakatlanayotgan jismning markazga intilma tezlanishi?`, a: v * v / R0, u: 'm/s²', f: 'a = v²/R' }; },
  ],
  8: [
    () => { const U = pick([4.5, 6, 9, 12, 24, 220]), Rr = pick([2, 3, 4, 6, 10, 20, 44]); return { t: `${n(U)} V kuchlanishga ${Rr} Ω qarshilik ulandi. Tok kuchi qancha?`, a: U / Rr, u: 'A', f: 'I = U/R' }; },
    () => { const a = R(2, 20), b = R(2, 20); return { t: `${a} Ω va ${b} Ω rezistorlar ketma-ket ulandi. Umumiy qarshilik?`, a: a + b, u: 'Ω', f: 'R = R₁ + R₂' }; },
    () => { const a = pick([2, 3, 4, 6, 12]), b = pick([3, 4, 6, 12]); return { t: `${a} Ω va ${b} Ω rezistorlar parallel ulandi. Umumiy qarshilik?`, a: a * b / (a + b), u: 'Ω', f: '1/R = 1/R₁ + 1/R₂' }; },
    () => { const U = pick([12, 36, 127, 220]), I = pick([0.5, 1, 2, 2.5, 5]); return { t: `Asbob ${U} V kuchlanishda ${n(I)} A tok iste’mol qiladi. Quvvati?`, a: U * I, u: 'W', f: 'P = UI' }; },
    () => { const I = R(1, 5), Rr = R(2, 20), t = R(10, 60, 10); return { t: `${Rr} Ω qarshilikdan ${I} A tok ${t} s o‘tdi. Ajralgan issiqlik?`, a: I * I * Rr * t, u: 'J', f: 'Q = I²Rt' }; },
    () => { const q = R(2, 60), t = R(2, 20); return { t: `O‘tkazgich kesimidan ${t} s da ${q} C zaryad o‘tdi. Tok kuchi?`, a: q / t, u: 'A', f: 'I = q/t' }; },
    () => { const C = pick([2, 5, 10, 20]), U = R(10, 200, 10); return { t: `Sig‘imi ${C} μF kondensator ${U} V gacha zaryadlandi. Zaryadi necha μC?`, a: C * U, u: 'μC', f: 'q = CU' }; },
    () => { const P = pick([0.5, 1, 1.5, 2, 3]), t = pick([0.5, 1, 2, 3, 4]); return { t: `Quvvati ${n(P)} kW choynak ${n(t)} soat ishladi. Necha kW·soat energiya sarflandi?`, a: P * t, u: 'kW·soat', f: 'W = Pt' }; },
  ],
  9: [
    () => { const m = R(0.5, 5, 0.5), dt = R(10, 80, 5); return { t: `${n(m)} kg suvni ${dt} °C ga isitish uchun qancha issiqlik kerak? (c = 4200 J/(kg·°C))`, a: 4200 * m * dt, u: 'J', f: 'Q = cmΔt' }; },
    () => { const M = pick([[2, 'vodorod'], [32, 'kislorod'], [28, 'azot'], [18, 'suv'], [44, 'karbonat angidrid']]), m = R(1, 20) * M[0]; return { t: `${m} g ${M[1]}da necha mol modda bor? (M = ${M[0]} g/mol)`, a: m / M[0], u: 'mol', f: 'ν = m/M' }; },
    () => { const t = R(-50, 200); return { t: `${t} °C necha kelvin?`, a: t + 273, u: 'K', f: 'T = t + 273' }; },
    () => { const T1 = R(400, 1000, 50), T2 = R(250, 380, 10); return { t: `Ideal issiqlik mashinasida isitgich ${T1} K, sovutgich ${T2} K. Maksimal FIK necha foiz?`, a: 100 * (T1 - T2) / T1, u: '%', f: 'η = (T₁ − T₂)/T₁' }; },
    () => { const F = pick([0.1, 0.2, 0.25, 0.5, 2]); return { t: `Fokus masofasi ${n(F)} m linzaning optik kuchi?`, a: 1 / F, u: 'dptr', f: 'D = 1/F' }; },
    () => { const F = pick([10, 12, 15, 20]), d = F * pick([1.5, 2, 3, 4]); return { t: `Fokus masofasi ${F} sm yig‘uvchi linzadan ${d} sm uzoqlikda buyum turibdi. Tasvir linzadan qancha uzoqlikda?`, a: d * F / (d - F), u: 'sm', f: '1/F = 1/d + 1/f' }; },
    () => { const nn = pick([1.33, 1.5, 2.4]); return { t: `Sindirish ko‘rsatkichi ${n(nn)} bo‘lgan muhitda yorug‘lik tezligi necha km/s?`, a: 300000 / nn, u: 'km/s', f: 'v = c/n' }; },
    () => { const p = R(1, 5) * 1e5, V = R(1, 10) * 1e-3, A = p * V; return { t: `Gaz ${n(p / 1e5)}·10⁵ Pa o‘zgarmas bosimda ${n(V * 1e3)} litrga kengaydi. Bajarilgan ish?`, a: A, u: 'J', f: 'A = pΔV' }; },
  ],
  10: [
    () => { const h = pick([5, 20, 45, 80, 125]), v = R(5, 30); return { t: `${h} m balandlikdan ${v} m/s tezlik bilan gorizontal otilgan jism qancha uzoqlikka tushadi? (g = 10 m/s²)`, a: v * Math.sqrt(2 * h / 10), u: 'm', f: 'l = v₀√(2h/g)' }; },
    () => { const v = R(10, 40, 5), a = pick([15, 30, 45, 60, 75]); return { t: `Jism ${v} m/s tezlik bilan gorizontga ${a}° burchak ostida otildi. Uchish uzoqligi? (g = 10 m/s²)`, a: v * v * Math.sin(2 * a * Math.PI / 180) / 10, u: 'm', f: 'L = v₀² sin2α / g' }; },
    () => { const l = pick([0.4, 1, 1.6, 2.5, 3.6]); return { t: `Uzunligi ${n(l)} m bo‘lgan matematik mayatnikning tebranish davri? (g = 9,8 m/s²)`, a: 2 * Math.PI * Math.sqrt(l / 9.8), u: 's', f: 'T = 2π√(l/g)' }; },
    () => { const m = pick([0.1, 0.2, 0.4, 1]), k = pick([10, 40, 100, 160]); return { t: `${n(m)} kg yuk bikrligi ${k} N/m prujinada tebranmoqda. Davri?`, a: 2 * Math.PI * Math.sqrt(m / k), u: 's', f: 'T = 2π√(m/k)' }; },
    () => { const v = pick([340, 1500, 5000]), nu = pick([100, 200, 500, 1000]); return { t: `Tezligi ${v} m/s, chastotasi ${nu} Hz bo‘lgan to‘lqinning uzunligi?`, a: v / nu, u: 'm', f: 'λ = v/ν' }; },
    () => { const E = pick([4.5, 6, 9, 12]), Rr = R(2, 20), r = pick([0.5, 1, 2]); return { t: `EYuK ${n(E)} V, ichki qarshiligi ${n(r)} Ω manbaga ${Rr} Ω tashqi qarshilik ulandi. Tok kuchi?`, a: E / (Rr + r), u: 'A', f: 'I = ℰ/(R + r)' }; },
    () => { const C = pick([2, 5, 10]), U = R(100, 400, 50); return { t: `Sig‘imi ${C} μF kondensator ${U} V gacha zaryadlangan. Energiyasi (J)?`, a: C * 1e-6 * U * U / 2, u: 'J', f: 'W = CU²/2' }; },
    () => { const m = R(1, 5), v1 = R(2, 10), M = R(1, 5); return { t: `${m} kg massali ${v1} m/s tezlikdagi shar tinch turgan ${M} kg sharga urilib, unga yopishib qoldi. Birgalikdagi tezlik?`, a: m * v1 / (m + M), u: 'm/s', f: 'm₁v₁ = (m₁ + m₂)u' }; },
  ],
  11: [
    () => { const lam = pick([200, 300, 400, 500, 600]); return { t: `To‘lqin uzunligi ${lam} nm bo‘lgan foton energiyasi necha eV? (hc ≈ 1240 eV·nm)`, a: 1240 / lam, u: 'eV', f: 'E = hc/λ' }; },
    () => { const B = pick([0.1, 0.2, 0.5]), I = R(1, 10), l = pick([0.1, 0.2, 0.5]); return { t: `Induksiyasi ${n(B)} T maydonga tik joylashgan ${n(l)} m o‘tkazgichdan ${I} A tok o‘tmoqda. Amper kuchi?`, a: B * I * l, u: 'N', f: 'F = BIl' }; },
    () => { const N = pick([50, 100, 200]), dF = pick([0.01, 0.02, 0.05]), dt = pick([0.1, 0.2, 0.5]); return { t: `${N} o‘ramli g‘altakda magnit oqimi ${n(dt)} s da ${n(dF)} Wb ga o‘zgardi. Induksiya EYuK?`, a: N * dF / dt, u: 'V', f: 'ℰ = NΔΦ/Δt' }; },
    () => { const L = pick([0.1, 0.2, 0.4]), I = R(1, 6); return { t: `Induktivligi ${n(L)} H g‘altakdan ${I} A tok o‘tmoqda. Magnit maydon energiyasi?`, a: L * I * I / 2, u: 'J', f: 'W = LI²/2' }; },
    () => { const v = pick([0.6, 0.8]), l0 = R(1, 10); return { t: `Tinch holatdagi uzunligi ${l0} m sterjen ${n(v)}c tezlikda harakatlanmoqda. Uzunligi?`, a: l0 * Math.sqrt(1 - v * v), u: 'm', f: 'l = l₀√(1 − v²/c²)' }; },
    () => { const T = pick([2, 5, 8, 10]), k = pick([2, 3, 4]); return { t: `Yarim yemirilish davri ${T} kun. ${k * T} kunda necha marta kamayadi?`, a: 2 ** k, u: 'marta', f: 'N = N₀·2^(−t/T)' }; },
    () => { const Um = pick([141, 311, 537]); return { t: `O‘zgaruvchan kuchlanishning amplituda qiymati ${Um} V. Ta’sir etuvchi qiymati?`, a: Um / Math.SQRT2, u: 'V', f: 'U = Uₘ/√2' }; },
    () => { const A = pick([2, 2.3, 3, 4.5]), E = A + pick([0.5, 1, 1.5, 2]); return { t: `Chiqish ishi ${n(A)} eV metallga ${n(E)} eV energiyali fotonlar tushmoqda. Fotoelektronlarning maksimal kinetik energiyasi (eV)?`, a: E - A, u: 'eV', f: 'hν = A + Eₖ' }; },
  ],
};

export default function Generator({ grade, onFinish }) {
  const [g, setG] = useState(grade || 7);
  const tasks = useMemo(() => Array.from({ length: 6 }, () => pick(GENS[g])()), [g]);
  const [i, setI] = useState(0);
  const [val, setVal] = useState('');
  const [res, setRes] = useState(null);
  const [score, setScore] = useState(0);
  const t = tasks[i];
  function check() {
    const x = parseNumber(val);
    const ok = x != null && Math.abs(x - t.a) <= Math.max(Math.abs(t.a) * 0.02, 1e-9);
    setRes(ok); if (ok) setScore(s => s + 10);
  }
  function next() { if (i + 1 >= tasks.length) return onFinish(score); setI(i + 1); setVal(''); setRes(null); }
  return (
    <div className="stack">
      <div className="gradepick" role="group" aria-label="Sinf">{[6, 7, 8, 9, 10, 11].map(x => <button key={x} aria-pressed={g === x} onClick={() => { setG(x); setI(0); setVal(''); setRes(null); setScore(0); }}>{x}</button>)}</div>
      <p className="muted small">{i + 1}/{tasks.length} · har safar yangi sonlar bilan masala</p>
      <div className="qcard">
        <p className="stem">{t.t}</p>
        <div className="field" style={{ marginTop: 14 }}>
          <label htmlFor="gen">Javob ({t.u})</label>
          <input id="gen" className="input math" inputMode="decimal" value={val} disabled={res != null} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && val && res == null && check()} placeholder="Son kiriting" />
        </div>
        {res != null && <p style={{ marginTop: 10 }} className={res ? 'tag green' : 'tag red'}>{res ? 'To‘g‘ri!' : `To‘g‘ri javob: ${n(t.a, 4)} ${t.u}`} · <span className="math">{t.f}</span></p>}
      </div>
      {res == null ? <button className="btn block" disabled={!val} onClick={check}>Tekshirish</button> : <button className="btn block" onClick={next}>{i + 1 < tasks.length ? 'Keyingi masala' : 'Yakunlash'}</button>}
    </div>
  );
}
