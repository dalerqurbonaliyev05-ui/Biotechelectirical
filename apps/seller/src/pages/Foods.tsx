import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Empty, FoodImage, Header, Icon, Page, Skeletons, StickyBar, Switch, money, prepLabel, supabase, useToast, errMsg, type Category, type FoodItem } from '@uyovqat/shared';

export default function Foods() {
  const nav = useNavigate();
  const toast = useToast();
  const [foods, setFoods] = useState<FoodItem[] | null>(null);
  const [cats, setCats] = useState<Record<string, Category>>({});

  useEffect(() => {
    void supabase.from('food_items').select('*').order('created_at', { ascending: false }).then(({ data }) => setFoods((data as FoodItem[]) ?? []));
    void supabase.from('categories').select('*').then(({ data }) => setCats(Object.fromEntries(((data as Category[]) ?? []).map((c) => [c.id, c]))));
  }, []);

  async function toggle(f: FoodItem, v: boolean) {
    setFoods((x) => x?.map((i) => (i.id === f.id ? { ...i, is_available: v } : i)) ?? x);
    const { error } = await supabase.from('food_items').update({ is_available: v }).eq('id', f.id);
    if (error) { toast(errMsg(error), 'error'); setFoods((x) => x?.map((i) => (i.id === f.id ? { ...i, is_available: !v } : i)) ?? x); }
  }

  return (
    <Page sticky>
      <Header title="Taomlarim" sub={foods ? `${foods.length} ta taom` : undefined} />
      {foods === null ? <Skeletons n={2} /> : foods.length === 0 ? (
        <Empty icon="🍲" title="Hali taom qo'shmadingiz" text="Birinchi taomingizni qo'shing: narx, necha kishilik va tayyorlanish vaqtini kiriting." />
      ) : (
        <div className="u-list">
          {foods.map((f) => (
            <div key={f.id} className="u-item" style={{ opacity: f.is_available ? 1 : 0.6 }}>
              <button className="u-item-thumb" onClick={() => nav(`/foods/${f.id}`)} aria-label="Tahrirlash"><FoodImage item={f} category={cats[f.category_id]} /></button>
              <button className="u-item-main" style={{ textAlign: 'left' }} onClick={() => nav(`/foods/${f.id}`)}>
                <div className="u-item-title">{f.name}</div>
                <div className="u-item-sub">{cats[f.category_id]?.name} · <Icon name="clock" size={12} /> {prepLabel(f.prep_minutes)}</div>
                <div style={{ fontWeight: 800 }}>{money(f.price_per_portion)} <span className="u-muted" style={{ fontSize: 12 }}>/ kishi</span></div>
              </button>
              <Switch on={f.is_available} onChange={(v) => void toggle(f, v)} label={`${f.name}: mavjud`} />
            </div>
          ))}
        </div>
      )}
      <StickyBar show label="Taom qo'shish" sub="+" onClick={() => nav('/foods/new')} />
    </Page>
  );
}
