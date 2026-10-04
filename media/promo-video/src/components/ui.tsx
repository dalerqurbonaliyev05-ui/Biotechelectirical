import React from 'react';
import { interpolate } from 'remotion';
import { FONT, money } from '../theme';
import { clamp, ease, prog, useP } from '../anim';
import { CANDIDATES, CourierDot, HOME, MapBase, NEAREST, Pin, ROUTE_D, SHOP, routeEvolve, routePoint } from './MapSvg';

/* ====== Ilova interfeysi (390x844) — haqiqiy ilovalarning soddalashtirilgan nusxasi ======
   Barcha o'lchamlar va ranglar apps/shared/src/styles/ui.css dagi bilan bir xil.
   Haqiqiy skrinshotlar qo'yish uchun `screens` proplariga qarang. */

const T = { text: '#17171c', text2: '#4a4a55', muted: '#8b8b97', line: '#ececf0', surface: '#f5f5f7', success: '#17a05d', successBg: '#e6f6ee' };
const base: React.CSSProperties = { fontFamily: FONT, color: T.text, width: 390, height: 844, position: 'relative', overflow: 'hidden', background: '#fff' };

const Ico: React.FC<{ d: string; size?: number; color?: string; fill?: boolean }> = ({ d, size = 24, color = 'currentColor', fill }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? color : 'none'} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
const D = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  bag: 'M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-6 8-6s8 2 8 6',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  plus: 'M12 5v14M5 12h14', minus: 'M5 12h14', check: 'M5 12.5l4.5 4.5L19 7.5', star: 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1.1 5.8L12 16.8 6.7 19.6l1.1-5.8L3.5 9.7l5.9-.8z',
  chef: 'M7 14v6h10v-6M6 14a4 4 0 0 1-1-7.7A4 4 0 0 1 12 4a4 4 0 0 1 7 2.3A4 4 0 0 1 18 14z', wallet: 'M3 7a2 2 0 0 1 2-2h13v4M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2zM16 14.5h.01',
  nav: 'M3 11l18-8-8 18-2-8z', gift: 'M4 11h16v9H4zM3 8h18v3H3zM12 8v12',
};

export const TabBar: React.FC<{ items: { d: string; label: string }[]; active: number; accent: string; badge?: { idx: number; n: number } }> = ({ items, active, accent, badge }) => (
  <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 84, background: 'rgba(255,255,255,0.96)', borderTop: `1px solid ${T.line}`, display: 'flex', padding: '8px 6px 0' }}>
    {items.map((it, i) => (
      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, color: i === active ? accent : T.muted, fontSize: 11.5, fontWeight: 700 }}>
        <div style={{ position: 'relative', width: 46, height: 28, borderRadius: 999, display: 'grid', placeItems: 'center', background: i === active ? '#fff1e6' : 'transparent' }}>
          <Ico d={it.d} size={22} />
          {badge && badge.idx === i && badge.n > 0 && <div style={{ position: 'absolute', top: -4, right: 2, minWidth: 18, height: 18, borderRadius: 9, background: accent, color: '#fff', fontSize: 11, fontWeight: 800, display: 'grid', placeItems: 'center', border: '2px solid #fff' }}>{badge.n}</div>}
        </div>
        {it.label}
      </div>
    ))}
  </div>
);

const Sticky: React.FC<{ label: string; sub: string; show: number; accent: string; bottom?: number; pressed?: number }> = ({ label, sub, show, accent, bottom = 96, pressed = 0 }) => (
  <div style={{ position: 'absolute', left: 16, right: 16, bottom, transform: `translateY(${(1 - show) * 110}px) scale(${1 - pressed * 0.04})`, opacity: show }}>
    <div style={{ height: 58, borderRadius: 18, background: accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', fontWeight: 800, fontSize: 16.5, boxShadow: '0 8px 22px rgba(255,106,19,0.4)' }}>
      <span>{label}</span><span style={{ opacity: 0.9, fontSize: 13 }}>{sub}</span>
    </div>
  </div>
);

/** Bosilish halqasi (barmoq). */
export const Tap: React.FC<{ f: number; at: number; x: number; y: number }> = ({ f, at, x, y }) => {
  const t = f - at;
  if (t < 0 || t > 16) return null;
  const k = t / 16;
  return <div style={{ position: 'absolute', left: x - 30, top: y - 30, width: 60, height: 60, borderRadius: '50%', background: 'rgba(23,23,28,0.22)', border: '3px solid rgba(255,255,255,0.9)', transform: `scale(${0.4 + k * 1.1})`, opacity: 1 - k, zIndex: 50 }} />;
};

/* ---------------- Xaridor: bosh sahifa ---------------- */
const SUYUQ = [
  { n: 'Mastava', e: '🍲', p: 25000, t: '1 soat 30 daq', c: ['#7be495', '#2fe3bf'], s: 'Malika oshxonasi', r: 4.8 },
  { n: 'Qaynatma sho\'rva', e: '🥣', p: 28000, t: '2 soat', c: ['#ffd27a', '#ff9a3c'], s: 'Dilnoza uyi', r: 4.6 },
  { n: 'Lag\'mon', e: '🍜', p: 27000, t: '1 soat 20 daq', c: ['#ffb3a7', '#ff6f61'], s: 'Malika oshxonasi', r: 4.8 },
  { n: 'Go\'shtli mastava', e: '🍲', p: 29000, t: '1 soat 40 daq', c: ['#9be7ff', '#4aa8ff'], s: 'Dilnoza uyi', r: 4.6 },
];
const XAMIRLI = [
  { n: 'Qovurma manti', e: '🥟', p: 30000, t: '1 soat', c: ['#ffd9a8', '#ffa94d'], s: 'Malika oshxonasi', r: 4.8 },
  { n: 'Xonim', e: '🌯', p: 22000, t: '1 soat 15 daq', c: ['#e0c3fc', '#8ec5fc'], s: 'Dilnoza uyi', r: 4.6 },
  { n: 'Chuchvara', e: '🥟', p: 26000, t: '50 daq', c: ['#a8f0d6', '#38d39f'], s: 'Malika oshxonasi', r: 4.8 },
  { n: 'Somsa', e: '🥧', p: 12000, t: '45 daq', c: ['#ffe29a', '#ffa751'], s: 'Dilnoza uyi', r: 4.6 },
];

const FoodTile: React.FC<{ it: typeof SUYUQ[number]; pressed?: number; accentTag?: boolean }> = ({ it, pressed = 0 }) => (
  <div style={{ transform: `scale(${1 - pressed * 0.05})` }}>
    <div style={{ position: 'relative', aspectRatio: '1 / 0.9', borderRadius: 24, background: `linear-gradient(135deg, ${it.c[0]}, ${it.c[1]})`, display: 'grid', placeItems: 'center', fontSize: 54, overflow: 'hidden' }}>
      {it.e}
      <div style={{ position: 'absolute', left: 8, top: 8, display: 'flex', gap: 4, alignItems: 'center', padding: '4px 9px', borderRadius: 999, background: 'rgba(255,255,255,0.93)', fontSize: 11.5, fontWeight: 800 }}><Ico d={D.clock} size={12} />{it.t}</div>
      <div style={{ position: 'absolute', right: 8, bottom: 8, width: 36, height: 36, borderRadius: '50%', background: '#fff', color: '#ff6a13', display: 'grid', placeItems: 'center', boxShadow: '0 4px 12px rgba(23,23,28,0.16)' }}><Ico d={D.plus} size={20} /></div>
    </div>
    <div style={{ padding: '8px 4px 0' }}>
      <div style={{ fontSize: 16, fontWeight: 800 }}>{money(it.p).replace(' so\'m', '')} <span style={{ fontSize: 11.5, color: T.muted, fontWeight: 700 }}>so'm / kishi</span></div>
      <div style={{ fontSize: 14.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.n}</div>
      <div style={{ fontSize: 12, color: T.muted, fontWeight: 600 }}>★ {it.r} · {it.s}</div>
    </div>
  </div>
);

export const BuyerHome: React.FC<{ f: number }> = ({ f }) => {
  const { accent } = useP();
  const chips = ['✨ Hammasi', '🍲 Suyuq taomlar', '🥟 Xamirli taomlar', '🍜 Lag\'mon'];
  const marks = [20, 46, 72];
  const active = f < marks[0] ? 0 : f < marks[1] ? 1 : f < marks[2] ? 2 : 1;
  const lastMark = [...marks].reverse().find((m) => f >= m) ?? 0;
  const scrollX = interpolate(f, [8, 60], [0, -70], { ...clamp, easing: ease });
  const set = active === 2 ? XAMIRLI : SUYUQ;
  const swap = prog(f, lastMark, lastMark + 10);
  const pressed = f >= 96 && f < 104 ? 1 : 0;
  const scrollY = interpolate(f, [0, 100], [0, -22], clamp);
  return (
    <div style={base}>
      <div style={{ padding: '62px 16px 0' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.muted }}>Salom, Ali 👋</div>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15 }}>Bugun nima yeymiz?</div>
        <div style={{ marginTop: 12, height: 48, borderRadius: 18, background: T.surface, display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', color: T.muted, fontSize: 15, fontWeight: 600 }}><Ico d={D.search} size={20} />Mastava, manti, oshxona...</div>
      </div>
      <div style={{ marginTop: 14, paddingLeft: 16, display: 'flex', gap: 8, transform: `translateX(${scrollX}px)`, whiteSpace: 'nowrap' }}>
        {chips.map((c, i) => {
          const on = i === active;
          return <div key={i} style={{ height: 40, padding: '0 16px', borderRadius: 999, display: 'flex', alignItems: 'center', fontSize: 14, fontWeight: 700, background: on ? accent : T.surface, color: on ? '#fff' : T.text2, boxShadow: on ? '0 6px 16px rgba(255,106,19,0.38)' : 'none', transform: `scale(${on ? 1 : 1})` }}>{c}</div>;
        })}
      </div>
      <div style={{ padding: '18px 16px 0', transform: `translateY(${scrollY}px)` }}>
        <div style={{ fontSize: 19, fontWeight: 800, marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}><span>Uyda tayyorlanganlar</span><span style={{ fontSize: 13, color: T.muted }}>{set.length} ta</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 12px', opacity: interpolate(swap, [0, 0.4, 1], [0.2, 0.2, 1]), transform: `translateX(${(1 - swap) * (active === 2 ? 40 : -40)}px)` }}>
          {set.map((it, i) => <FoodTile key={`${active}-${i}`} it={it} pressed={i === 0 && active === 1 ? pressed : 0} />)}
        </div>
      </div>
      <TabBar accent={accent} active={0} items={[{ d: D.home, label: 'Bosh sahifa' }, { d: D.bag, label: 'Savat' }, { d: D.receipt, label: 'Buyurtmalar' }, { d: D.user, label: 'Profil' }]} />
      <Tap f={f} at={96} x={104} y={512} />
    </div>
  );
};

/* ---------------- Xaridor: taom sahifasi (necha kishiga) ---------------- */
export const BuyerFood: React.FC<{ f: number }> = ({ f }) => {
  const { accent, dish, dishEmoji, people, pricePerPerson } = useP();
  const start = 4;
  const n = Math.round(interpolate(f, [12, 12 + (people - start) * 3], [start, people], { ...clamp }));
  const bump = n !== Math.round(interpolate(f - 1, [12, 12 + (people - start) * 3], [start, people], { ...clamp })) ? 1 : 0;
  const total = pricePerPerson * n;
  return (
    <div style={base}>
      <div style={{ height: 300, borderRadius: '0 0 28px 28px', background: 'linear-gradient(135deg,#7be495,#2fe3bf)', display: 'grid', placeItems: 'center', fontSize: 120 }}>{dishEmoji}</div>
      <div style={{ padding: '18px 16px 0' }}>
        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>{dish}</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <span style={{ padding: '4px 11px', borderRadius: 999, background: '#fff1e6', color: accent, fontWeight: 800, fontSize: 12.5 }}>⏱ 1 soat 30 daq tayyorlanadi</span>
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, marginTop: 12 }}>{money(pricePerPerson)} <span style={{ fontSize: 14, color: T.muted }}>/ kishi</span></div>
        <div style={{ marginTop: 16, background: T.surface, borderRadius: 24, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div><div style={{ fontWeight: 800 }}>Necha kishiga?</div><div style={{ fontSize: 13, color: T.muted, fontWeight: 600 }}>Porsiya = kishi</div></div>
          <div style={{ display: 'flex', alignItems: 'center', background: '#fff', borderRadius: 999, padding: 3, boxShadow: '0 1px 2px rgba(0,0,0,.06)' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', display: 'grid', placeItems: 'center' }}><Ico d={D.minus} size={18} /></div>
            <div style={{ minWidth: 48, textAlign: 'center', fontWeight: 800, fontSize: 20 + bump * 6, color: accent }}>{n}</div>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#fff1e6', display: 'grid', placeItems: 'center', color: accent }}><Ico d={D.plus} size={18} /></div>
          </div>
        </div>
      </div>
      <Sticky accent={accent} show={prog(f, 26, 40)} label="Savatga qo'shish" sub={money(total)} bottom={22} pressed={f >= 52 && f < 58 ? 1 : 0} />
      <Tap f={f} at={50} x={195} y={800} />
    </div>
  );
};

/* ---------------- Xaridor: savat va promokod ---------------- */
export const BuyerCart: React.FC<{ f: number }> = ({ f }) => {
  const { accent, dish, dishEmoji, people, pricePerPerson, promoCode, discountPercent, deliveryFee } = useP();
  const subtotal = pricePerPerson * people;
  const discount = Math.round((subtotal * discountPercent) / 100);
  const typed = Math.max(0, Math.min(promoCode.length, Math.floor((f - 16) / 5)));
  const applied = f >= 52;
  const k = prog(f, 54, 82);
  const total = interpolate(k, [0, 1], [subtotal + deliveryFee, subtotal - discount + deliveryFee]);
  const caret = Math.floor(f / 8) % 2 === 0 && typed < promoCode.length + 1 && !applied;
  return (
    <div style={base}>
      <div style={{ padding: '62px 16px 0' }}>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>Savat</div>
        <div style={{ fontSize: 13, color: T.muted, fontWeight: 700 }}>Malika oshxonasi</div>
        <div style={{ marginTop: 12, display: 'flex', gap: 12, padding: 12, borderRadius: 18, boxShadow: `inset 0 0 0 1.5px ${T.line}` }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg,#7be495,#2fe3bf)', display: 'grid', placeItems: 'center', fontSize: 30 }}>{dishEmoji}</div>
          <div style={{ flex: 1 }}><div style={{ fontWeight: 800 }}>{dish}</div><div style={{ fontSize: 13, color: T.muted, fontWeight: 600 }}>{money(pricePerPerson)} × {people} kishi</div><div style={{ fontWeight: 800, marginTop: 4 }}>{money(subtotal)}</div></div>
        </div>
        <div style={{ fontSize: 19, fontWeight: 800, margin: '18px 0 10px' }}>Promokod</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1, height: 50, borderRadius: 18, background: applied ? '#fff' : T.surface, border: `2px solid ${applied ? T.success : typed > 0 ? accent : 'transparent'}`, display: 'flex', alignItems: 'center', padding: '0 14px', fontSize: 16, fontWeight: 800, letterSpacing: '0.04em' }}>
            {promoCode.slice(0, typed)}{caret && <span style={{ width: 2, height: 22, background: accent, marginLeft: 2 }} />}
            {typed === 0 && !caret && <span style={{ color: T.muted, fontWeight: 600, letterSpacing: 0 }}>Masalan: UY10</span>}
          </div>
          <div style={{ height: 50, padding: '0 16px', borderRadius: 18, background: applied ? T.successBg : '#fff1e6', color: applied ? T.success : accent, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, transform: `scale(${f >= 48 && f < 54 ? 0.94 : 1})` }}><Ico d={applied ? D.check : D.gift} size={18} />{applied ? 'Qo\'llandi' : 'Qo\'llash'}</div>
        </div>
        {applied && <div style={{ fontSize: 12.5, fontWeight: 800, color: T.success, marginTop: 6, opacity: prog(f, 52, 60) }}>✓ {promoCode}: −{money(discount)}</div>}
        <div style={{ marginTop: 18, background: T.surface, borderRadius: 24, padding: 16 }}>
          <Row l="Taomlar" r={money(subtotal)} />
          <div style={{ height: applied ? 30 * prog(f, 54, 62) : 0, overflow: 'hidden', opacity: prog(f, 54, 62) }}><Row l="Promokod" r={`−${money(discount)}`} green /></div>
          <Row l="Yetkazish" r={money(deliveryFee)} />
          <div style={{ borderTop: `1.5px dashed ${T.line}`, marginTop: 8, paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 18, fontWeight: 800 }}>
            <span>Jami</span>
            <span style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
              {applied && <span style={{ fontSize: 13, color: T.muted, textDecoration: 'line-through', opacity: prog(f, 54, 62) }}>{money(subtotal + deliveryFee)}</span>}
              <span style={{ color: applied ? T.success : T.text }}>{money(total)}</span>
            </span>
          </div>
        </div>
      </div>
      <Sticky accent={accent} show={1} label="Buyurtma berish" sub={money(total)} bottom={22} />
      <Tap f={f} at={48} x={330} y={212} />
    </div>
  );
};

const Row: React.FC<{ l: string; r: string; green?: boolean }> = ({ l, r, green }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontWeight: 600, color: green ? T.success : T.text2 }}><span>{l}</span><b style={{ color: green ? T.success : T.text }}>{r}</b></div>
);

/* ---------------- Sotuvchi: buyurtmalar ---------------- */
export const SellerOrders: React.FC<{ f: number }> = ({ f }) => {
  const { accent, dish, people, sellerShop, pricePerPerson } = useP();
  const hasOrder = f >= 40;
  const accepted = f >= 92;
  const notif = prog(f, 22, 34) - prog(f, 62, 74);
  const cardIn = prog(f, 40, 52);
  return (
    <div style={base}>
      <div style={{ padding: '62px 16px 0' }}>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>Buyurtmalar</div>
        <div style={{ fontSize: 13, color: T.muted, fontWeight: 700 }}>{sellerShop}</div>
        <div style={{ marginTop: 14, display: 'flex', background: T.surface, borderRadius: 18, padding: 4, gap: 4 }}>
          <div style={{ flex: 1, height: 42, borderRadius: 14, background: '#fff', color: accent, fontWeight: 800, display: 'grid', placeItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,.08)' }}>Faol</div>
          <div style={{ flex: 1, height: 42, borderRadius: 14, color: T.text2, fontWeight: 800, display: 'grid', placeItems: 'center' }}>Tarix</div>
        </div>
        {!hasOrder && <div style={{ textAlign: 'center', padding: '90px 0', color: T.muted }}><div style={{ fontSize: 54 }}>🧑‍🍳</div><div style={{ fontWeight: 800, color: T.text, fontSize: 18 }}>Hozircha buyurtma yo'q</div></div>}
        {hasOrder && (
          <div style={{ marginTop: 16, borderRadius: 24, padding: 16, boxShadow: `inset 0 0 0 1.5px ${accepted ? T.success : T.line}`, transform: `translateY(${(1 - cardIn) * 40}px) scale(${0.9 + cardIn * 0.1})`, opacity: cardIn, background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ padding: '4px 11px', borderRadius: 999, fontWeight: 800, fontSize: 12.5, background: accepted ? T.successBg : '#fff1e6', color: accepted ? T.success : accent }}>{accepted ? '✓ Qabul qilindi' : 'Yangi buyurtma'}</span>
              <span style={{ color: T.muted, fontSize: 13, fontWeight: 600 }}>#A4F9C2</span>
            </div>
            <div style={{ marginTop: 10, fontSize: 19, fontWeight: 800 }}>{dish} <span style={{ color: accent }}>· {people} kishiga</span></div>
            <Row l="Tayyor bo'lsin" r="Bugun, 19:30" /><Row l="To'lov" r="💵 Naqd" /><Row l="Taomlar summasi" r={money(pricePerPerson * people)} />
            {!accepted ? (
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <div style={{ height: 52, padding: '0 20px', borderRadius: 18, background: '#fdeced', color: '#e5484d', fontWeight: 800, display: 'grid', placeItems: 'center' }}>Rad etish</div>
                <div style={{ flex: 1, height: 52, borderRadius: 18, background: accent, color: '#fff', fontWeight: 800, display: 'grid', placeItems: 'center', fontSize: 16, boxShadow: '0 8px 22px rgba(255,106,19,0.38)', transform: `scale(${f >= 84 && f < 92 ? 0.95 : 1})` }}>Qabul qilish</div>
              </div>
            ) : (
              <div style={{ marginTop: 12, height: 52, borderRadius: 18, background: T.successBg, color: T.success, fontWeight: 800, display: 'grid', placeItems: 'center' }}>🛵 Kuryer qidirilmoqda…</div>
            )}
          </div>
        )}
      </div>
      {/* bildirishnoma */}
      <div style={{ position: 'absolute', left: 12, right: 12, top: 56, transform: `translateY(${(1 - notif) * -140}px) rotate(${notif > 0.9 && f < 40 ? Math.sin(f * 1.7) * 1.2 : 0}deg)`, opacity: notif > 0 ? 1 : 0, zIndex: 20 }}>
        <div style={{ background: 'rgba(23,23,28,0.94)', color: '#fff', borderRadius: 22, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center', boxShadow: '0 16px 36px rgba(0,0,0,0.35)' }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: accent, display: 'grid', placeItems: 'center', fontSize: 22 }}>🔔</div>
          <div><div style={{ fontWeight: 800, fontSize: 15 }}>Yangi buyurtma keldi!</div><div style={{ fontSize: 13, opacity: 0.8, fontWeight: 600 }}>{dish} · {people} kishiga</div></div>
        </div>
      </div>
      <TabBar accent={accent} active={0} badge={{ idx: 0, n: hasOrder && !accepted ? 1 : 0 }} items={[{ d: D.receipt, label: 'Buyurtmalar' }, { d: D.chef, label: 'Taomlar' }, { d: D.wallet, label: 'Daromad' }, { d: D.user, label: 'Profil' }]} />
      <Tap f={f} at={84} x={290} y={470} />
    </div>
  );
};

/* ---------------- Kuryer: xarita (avtomatik biriktirish) ---------------- */

export const CourierMapScreen: React.FC<{ f: number }> = ({ f }) => {
  const { accent } = useP();
  const candIn = prog(f, 14, 30);
  const picked = prog(f, 44, 56);
  const routeP = prog(f, 62, 96);
  const ev = routeEvolve(routeP);
  const pulse = ((f - 44) % 30) / 30;
  return (
    <div style={base}>
      <div style={{ position: 'absolute', inset: 0 }}>
        <MapBase width={390} height={844}>
          <g transform="translate(0 0)">
            <path d={ROUTE_D} fill="none" stroke={accent} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} />
            <Pin x={SHOP.x} y={SHOP.y} emoji="🍲" color={accent} scale={prog(f, 4, 14)} />
            <Pin x={HOME.x} y={HOME.y} emoji="🏠" color="#17a05d" scale={prog(f, 60, 72)} />
            {CANDIDATES.map((c, i) => {
              const isN = i === NEAREST;
              const fade = isN ? 1 : 1 - picked * 0.85;
              return (
                <g key={i} opacity={candIn * fade}>
                  {isN && f >= 44 && <line x1={c.x} y1={c.y} x2={SHOP.x} y2={SHOP.y} stroke="#2f7cf6" strokeWidth="3" strokeDasharray="6 6" opacity={picked} />}
                  <CourierDot x={c.x} y={c.y} scale={0.7 + candIn * 0.3 + (isN ? picked * 0.3 : 0)} pulse={isN && f >= 44 ? pulse : 0} label={f < 44 || isN ? c.km : undefined} />
                </g>
              );
            })}
          </g>
        </MapBase>
      </div>
      <div style={{ position: 'absolute', left: 12, right: 12, top: 56, background: '#fff', borderRadius: 24, padding: 12, display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 6px 20px rgba(23,23,28,0.14)' }}>
        <div style={{ width: 34, height: 34, borderRadius: 17, background: T.successBg, display: 'grid', placeItems: 'center' }}>🟢</div>
        <div style={{ flex: 1 }}><div style={{ fontWeight: 800 }}>{f >= 44 ? 'Buyurtma sizga biriktirildi' : 'Siz bo\'shsiz'}</div><div style={{ fontSize: 12.5, color: T.muted, fontWeight: 600 }}>{f >= 44 ? 'Eng yaqin kuryer — avtomatik' : 'Eng yaqin buyurtma avtomatik beriladi'}</div></div>
        <div style={{ width: 52, height: 32, borderRadius: 16, background: T.success, position: 'relative' }}><div style={{ position: 'absolute', top: 3, right: 3, width: 26, height: 26, borderRadius: 13, background: '#fff' }} /></div>
      </div>
      <div style={{ position: 'absolute', left: 12, right: 12, bottom: 100, transform: `translateY(${(1 - picked) * 200}px)`, opacity: picked }}>
        <div style={{ background: '#fff', borderRadius: 24, padding: 16, boxShadow: '0 14px 40px rgba(23,23,28,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ padding: '4px 11px', borderRadius: 999, background: '#fff1e6', color: accent, fontWeight: 800, fontSize: 12.5 }}>Biriktirildi</span><span style={{ color: T.muted, fontWeight: 700, fontSize: 13 }}>Oshxonagacha 1,2 km</span></div>
          <div style={{ display: 'flex', gap: 4, margin: '12px 0' }}>{[0, 1, 2, 3].map((i) => <div key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: i === 0 ? accent : T.line }} />)}</div>
          <div style={{ height: 52, borderRadius: 18, background: accent, color: '#fff', fontWeight: 800, display: 'grid', placeItems: 'center', fontSize: 16 }}>Oldim</div>
        </div>
      </div>
      <TabBar accent={accent} active={0} items={[{ d: D.nav, label: 'Xarita' }, { d: D.receipt, label: 'Tarix' }, { d: D.user, label: 'Profil' }]} />
    </div>
  );
};

/* ---------------- Xaridor: buyurtma holati va kuryer xaritasi ---------------- */

const STEPS = ['Qabul qilindi', 'Tayyorlanmoqda', 'Yo\'lda', 'Yetkazildi'];
export const BuyerTrack: React.FC<{ f: number; stage?: number; move: number }> = ({ f, stage = 2, move }) => {
  const { accent, courierName } = useP();
  const idx = stage;
  const fill = prog(f, 0, 14) * (idx / 3) * 100;
  const pt = routePoint(Math.min(1, Math.max(0, move)));
  const left = Math.max(1, Math.round(8 * (1 - move)));
  return (
    <div style={base}>
      <div style={{ padding: '62px 16px 0' }}>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Buyurtma #A4F9C2</div>
        <div style={{ marginTop: 12, borderRadius: 24, padding: 16, boxShadow: `inset 0 0 0 1.5px ${T.line}` }}>
          <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.02em' }}>{idx >= 3 ? 'Yetkazildi. Yoqimli ishtaha!' : 'Kuryer yo\'lda'}</div>
          <div style={{ position: 'relative', margin: '24px 12.5% 8px', height: 6, borderRadius: 3, background: T.line }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${fill}%`, borderRadius: 3, background: `linear-gradient(90deg,#ffa062,${accent})` }} />
            {STEPS.map((s, i) => {
              const done = i < idx || (i === idx && idx === 3);
              return <div key={s} style={{ position: 'absolute', left: `${(i / 3) * 100}%`, top: 3, transform: 'translate(-50%,-50%)', width: 28, height: 28, borderRadius: '50%', background: done ? accent : '#fff', border: `3px solid ${done || i === idx ? accent : T.line}`, color: done ? '#fff' : accent, display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 800 }}>{done ? <Ico d={D.check} size={14} /> : i + 1}</div>;
            })}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', marginTop: 18, textAlign: 'center', fontSize: 10.5, fontWeight: 700, color: T.muted }}>
            {STEPS.map((s, i) => <div key={s} style={{ color: i <= idx ? T.text : T.muted }}>{s}</div>)}
          </div>
        </div>
        {idx < 3 && (
          <div style={{ marginTop: 12, borderRadius: 24, padding: 10, boxShadow: `inset 0 0 0 1.5px ${T.line}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 6px 8px' }}>
              <div><div style={{ fontWeight: 800 }}>🛵 {courierName} yo'lda</div><div style={{ fontSize: 12.5, color: T.muted, fontWeight: 600 }}>Sizgacha {((1 - move) * 3.4 + 0.1).toFixed(1).replace('.', ',')} km · taxminan <b style={{ color: T.text }}>{left} daq</b></div></div>
              <div style={{ width: 40, height: 40, borderRadius: 20, background: '#fff1e6', display: 'grid', placeItems: 'center' }}>📞</div>
            </div>
            <div style={{ borderRadius: 18, overflow: 'hidden', height: 300 }}>
              <MapBase width={370} height={300} style={{ width: 370, height: 300 }}>
                <path d={ROUTE_D} fill="none" stroke={accent} strokeWidth="6" strokeDasharray="2 10" strokeLinecap="round" opacity="0.85" />
                <Pin x={HOME.x} y={HOME.y} emoji="🏠" color="#17a05d" />
                <CourierDot x={pt.x} y={pt.y} scale={1.15} pulse={(f % 30) / 30} />
              </MapBase>
            </div>
          </div>
        )}
      </div>
      <TabBar accent={accent} active={2} items={[{ d: D.home, label: 'Bosh sahifa' }, { d: D.bag, label: 'Savat' }, { d: D.receipt, label: 'Buyurtmalar' }, { d: D.user, label: 'Profil' }]} />
    </div>
  );
};

/* ---------------- Xaridor: baho berish ---------------- */
export const BuyerReview: React.FC<{ f: number; stars: number; pop: number }> = ({ f, stars, pop }) => {
  const { accent, sellerShop, courierName } = useP();
  return (
    <div style={base}>
      <div style={{ padding: '62px 16px 0' }}>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Buyurtma #A4F9C2</div>
        <div style={{ marginTop: 12, borderRadius: 24, padding: 16, boxShadow: `inset 0 0 0 1.5px ${T.line}` }}>
          <div style={{ fontSize: 21, fontWeight: 800 }}>Yetkazildi. Yoqimli ishtaha!</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 14 }}>
            {[0, 1, 2, 3].map((i) => <React.Fragment key={i}><div style={{ width: 28, height: 28, borderRadius: 14, background: accent, color: '#fff', display: 'grid', placeItems: 'center' }}><Ico d={D.check} size={14} /></div>{i < 3 && <div style={{ flex: 1, height: 5, borderRadius: 3, background: accent }} />}</React.Fragment>)}
          </div>
        </div>
        <div style={{ marginTop: 12, borderRadius: 24, padding: 16, boxShadow: `inset 0 0 0 1.5px ${T.line}`, opacity: prog(f, 10, 22), transform: `translateY(${(1 - prog(f, 10, 22)) * 30}px)` }}>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>Baho bering</div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>🍲 {sellerShop}</div>
          <Stars n={stars} pop={pop} accent="#f5a623" />
          <div style={{ fontWeight: 700, margin: '14px 0 6px' }}>🛵 Kuryer {courierName}</div>
          <Stars n={Math.max(0, stars - 0)} pop={pop} accent="#f5a623" />
          <div style={{ marginTop: 14, height: 52, borderRadius: 18, background: accent, color: '#fff', fontWeight: 800, display: 'grid', placeItems: 'center' }}>Yuborish</div>
        </div>
      </div>
      <TabBar accent={accent} active={2} items={[{ d: D.home, label: 'Bosh sahifa' }, { d: D.bag, label: 'Savat' }, { d: D.receipt, label: 'Buyurtmalar' }, { d: D.user, label: 'Profil' }]} />
    </div>
  );
};

export const Stars: React.FC<{ n: number; pop: number; accent: string }> = ({ n, pop, accent }) => (
  <div style={{ display: 'flex', gap: 6 }}>
    {[0, 1, 2, 3, 4].map((i) => {
      const on = i < n;
      const s = on ? 1 + (i === n - 1 ? pop * 0.35 : 0) : 1;
      return <div key={i} style={{ transform: `scale(${s})`, color: on ? accent : '#d9d9e0' }}><Ico d={D.star} size={44} fill={on} /></div>;
    })}
  </div>
);

