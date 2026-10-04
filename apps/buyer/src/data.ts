import { useEffect, useState } from 'react';
import { supabase, type Category, type FoodItem, type SellerPublic } from '@uyovqat/shared';

let catCache: Category[] | null = null;

export function useCategories(): Category[] {
  const [cats, setCats] = useState<Category[]>(catCache ?? []);
  useEffect(() => {
    if (catCache) return;
    supabase.from('categories').select('*').order('sort_order').then(({ data }) => {
      catCache = (data as Category[]) ?? [];
      setCats(catCache);
    });
  }, []);
  return cats;
}

export interface FoodsData { foods: FoodItem[]; sellers: Record<string, SellerPublic>; loading: boolean; error: string | null }

export function useFoods(): FoodsData & { reload: () => void } {
  const [st, setSt] = useState<FoodsData>({ foods: [], sellers: {}, loading: true, error: null });
  const [n, setN] = useState(0);
  useEffect(() => {
    let alive = true;
    (async () => {
      const [f, s] = await Promise.all([
        supabase.from('food_items').select('*').eq('is_available', true).order('created_at', { ascending: false }).limit(300),
        supabase.from('uy_sellers').select('*'),
      ]);
      if (!alive) return;
      if (f.error) { setSt((x) => ({ ...x, loading: false, error: f.error!.message })); return; }
      const sellers: Record<string, SellerPublic> = {};
      ((s.data as SellerPublic[]) ?? []).forEach((x) => { sellers[x.id] = x; });
      setSt({ foods: f.data as FoodItem[], sellers, loading: false, error: null });
    })();
    return () => { alive = false; };
  }, [n]);
  return { ...st, reload: () => setN((x) => x + 1) };
}
