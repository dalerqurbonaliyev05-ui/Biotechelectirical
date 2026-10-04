import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { FoodItem } from '@uyovqat/shared';

export interface CartLine { food: FoodItem; portions: number }
interface CartState { sellerId: string | null; sellerName: string; lines: CartLine[] }
interface CartCtx extends CartState {
  count: number;
  subtotal: number;
  /** Boshqa sotuvchining taomi bo'lsa false qaytaradi (savat avval tozalanishi kerak). */
  add(food: FoodItem, portions: number, sellerName: string): boolean;
  setPortions(foodId: string, portions: number): void;
  remove(foodId: string): void;
  clear(): void;
  replaceWith(food: FoodItem, portions: number, sellerName: string): void;
}

const KEY = 'uyovqat.buyer.cart.v1';
const empty: CartState = { sellerId: null, sellerName: '', lines: [] };
const Ctx = createContext<CartCtx | null>(null);

function load(): CartState {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...empty, ...JSON.parse(raw) } : empty;
  } catch { return empty; }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<CartState>(load);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* xotira to'la yoki yopiq */ } }, [s]);

  const add = useCallback<CartCtx['add']>((food, portions, sellerName) => {
    let ok = true;
    setS((cur) => {
      if (cur.sellerId && cur.sellerId !== food.seller_id && cur.lines.length) { ok = false; return cur; }
      const i = cur.lines.findIndex((l) => l.food.id === food.id);
      const lines = i >= 0
        ? cur.lines.map((l, j) => (j === i ? { ...l, portions: Math.min(500, l.portions + portions) } : l))
        : [...cur.lines, { food, portions }];
      return { sellerId: food.seller_id, sellerName, lines };
    });
    return ok;
  }, []);

  const value = useMemo<CartCtx>(() => ({
    ...s,
    count: s.lines.length,
    subtotal: s.lines.reduce((a, l) => a + l.food.price_per_portion * l.portions, 0),
    add,
    setPortions: (id, p) => setS((c) => ({ ...c, lines: c.lines.map((l) => (l.food.id === id ? { ...l, portions: p } : l)) })),
    remove: (id) => setS((c) => { const lines = c.lines.filter((l) => l.food.id !== id); return lines.length ? { ...c, lines } : empty; }),
    clear: () => setS(empty),
    replaceWith: (food, portions, sellerName) => setS({ sellerId: food.seller_id, sellerName, lines: [{ food, portions }] }),
  }), [s, add]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('CartProvider topilmadi');
  return c;
}
