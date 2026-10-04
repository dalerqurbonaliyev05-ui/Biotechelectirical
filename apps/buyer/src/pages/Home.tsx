import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChipRow, Empty, FoodCard, Icon, Page, Skeletons, useToast, useAuth } from '@uyovqat/shared';
import { useCart } from '../cart';
import { useCategories, useFoods } from '../data';

export default function Home() {
  const nav = useNavigate();
  const toast = useToast();
  const { profile } = useAuth();
  const cart = useCart();
  const cats = useCategories();
  const { foods, sellers, loading, error, reload } = useFoods();
  const [top, setTop] = useState<string>('all');
  const [sub, setSub] = useState<string>('all');
  const [q, setQ] = useState('');

  const tops = useMemo(() => cats.filter((c) => !c.parent_id), [cats]);
  const subs = useMemo(() => cats.filter((c) => c.parent_id === top), [cats, top]);
  const byId = useMemo(() => new Map(cats.map((c) => [c.id, c])), [cats]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return foods.filter((f) => {
      const c = byId.get(f.category_id);
      if (top !== 'all' && c?.id !== top && c?.parent_id !== top) return false;
      if (sub !== 'all' && f.category_id !== sub) return false;
      if (term) {
        const hay = `${f.name} ${f.description ?? ''} ${sellers[f.seller_id]?.display_name ?? ''}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [foods, byId, top, sub, q, sellers]);

  function quickAdd(id: string) {
    const f = foods.find((x) => x.id === id);
    if (!f) return;
    const name = sellers[f.seller_id]?.display_name ?? '';
    if (cart.add(f, Math.max(f.min_portions, 4), name)) toast(`${f.name} savatga qo'shildi`, 'success');
    else nav(`/food/${f.id}`);   // boshqa sotuvchi: taom sahifasida tasdiqlanadi
  }

  return (
    <Page sticky={cart.count > 0}>
      <div className="u-header" style={{ paddingBottom: 4 }}>
        <div style={{ flex: 1 }}>
          <div className="u-sub u-muted" style={{ fontWeight: 700, fontSize: 13 }}>Salom, {profile?.full_name.split(' ')[0] || 'mehmon'} 👋</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>Bugun nima yeymiz?</h1>
        </div>
      </div>

      <label className="u-search" style={{ marginTop: 8 }}>
        <Icon name="search" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Mastava, manti, oshxona..." aria-label="Qidirish" />
      </label>

      <div style={{ marginTop: 14 }}>
        <ChipRow
          value={top}
          onChange={(id) => { setTop(id); setSub('all'); }}
          items={[{ id: 'all', label: 'Hammasi', icon: '✨' }, ...tops.map((c) => ({ id: c.id, label: c.name, icon: c.icon }))]}
        />
        {subs.length > 0 && (
          <ChipRow sub value={sub} onChange={setSub} items={[{ id: 'all', label: 'Barchasi' }, ...subs.map((c) => ({ id: c.id, label: c.name, icon: c.icon }))]} />
        )}
      </div>

      <h2 className="u-section-title">{q ? 'Qidiruv natijalari' : 'Uyda tayyorlanganlar'}<small>{shown.length} ta</small></h2>

      {loading ? <Skeletons /> : error ? (
        <Empty icon="📡" title="Yuklab bo'lmadi" text={error} action={<button className="u-btn soft" onClick={reload}>Qayta urinish</button>} />
      ) : shown.length === 0 ? (
        <Empty icon="🥘" title="Hozircha taom topilmadi" text="Boshqa kategoriyani tanlang yoki keyinroq qaytib keling." />
      ) : (
        <div className="u-grid">
          {shown.map((f) => (
            <FoodCard key={f.id} item={f} category={byId.get(f.category_id)} sellerName={sellers[f.seller_id]?.display_name}
              rating={sellers[f.seller_id]?.rating_avg} onOpen={() => nav(`/food/${f.id}`)} onAdd={() => quickAdd(f.id)} />
          ))}
        </div>
      )}
    </Page>
  );
}
