import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Empty, FoodImage, Header, Icon, Page, Sheet, Spinner, Stars, Stepper, StickyBar, money, prepLabel, supabase,
  type Category, type FoodItem, type Review, type SellerPublic, useToast } from '@uyovqat/shared';
import { useCart } from '../cart';

export default function FoodPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const cart = useCart();
  const [food, setFood] = useState<FoodItem | null | undefined>(undefined);
  const [seller, setSeller] = useState<SellerPublic | null>(null);
  const [cat, setCat] = useState<Category | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [portions, setPortions] = useState(4);
  const [conflict, setConflict] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('food_items').select('*').eq('id', id!).maybeSingle();
      const f = data as FoodItem | null;
      setFood(f);
      if (!f) return;
      setPortions(Math.max(f.min_portions, 4));
      const [s, c, r] = await Promise.all([
        supabase.from('uy_sellers').select('*').eq('id', f.seller_id).maybeSingle(),
        supabase.from('categories').select('*').eq('id', f.category_id).maybeSingle(),
        supabase.from('reviews').select('*').eq('target_id', f.seller_id).eq('target_kind', 'seller').order('created_at', { ascending: false }).limit(5),
      ]);
      setSeller(s.data as SellerPublic | null); setCat(c.data as Category | null); setReviews((r.data as Review[]) ?? []);
    })();
  }, [id]);

  if (food === undefined) return <Page tabs={false}><Spinner /></Page>;
  if (!food) return <Page tabs={false}><Header title="Taom" back /><Empty icon="🔍" title="Taom topilmadi" /></Page>;

  const sellerName = seller?.display_name ?? '';
  const total = food.price_per_portion * portions;

  function add() {
    if (!food) return;
    if (cart.add(food, portions, sellerName)) { toast('Savatga qo\'shildi', 'success'); nav(-1); }
    else setConflict(true);
  }

  return (
    <Page sticky tabs={false}>
      <div style={{ position: 'relative', margin: '0 calc(var(--page-pad) * -1)', marginTop: -8 }}>
        <div className="u-food-img" style={{ borderRadius: '0 0 28px 28px', aspectRatio: '1 / 0.72', fontSize: 80 }}>
          <FoodImage item={food} category={cat} />
        </div>
        <button className="u-iconbtn" aria-label="Orqaga" onClick={() => nav(-1)}
          style={{ position: 'absolute', left: 16, top: 'calc(var(--safe-top) + 12px)', background: 'rgba(255,255,255,.92)' }}>
          <Icon name="back" />
        </button>
      </div>

      <div style={{ marginTop: 18 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>{food.name}</h1>
        <div className="u-row" style={{ marginTop: 8, flexWrap: 'wrap' }}>
          <span className="u-badge brand"><Icon name="clock" size={14} />{prepLabel(food.prep_minutes)} tayyorlanadi</span>
          {cat && <span className="u-badge">{cat.icon} {cat.name}</span>}
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, marginTop: 14 }}>{money(food.price_per_portion)} <span className="u-muted" style={{ fontSize: 14 }}>/ kishi</span></div>
        {food.description && <p style={{ marginTop: 10, color: 'var(--text-2)', fontWeight: 500 }}>{food.description}</p>}
      </div>

      <div className="u-card flat" style={{ marginTop: 18 }}>
        <div className="u-row">
          <div className="grow">
            <div style={{ fontWeight: 800 }}>Necha kishiga?</div>
            <div className="u-muted" style={{ fontSize: 13, fontWeight: 600 }}>Porsiya = kishi{food.min_portions > 1 ? ` · kamida ${food.min_portions}` : ''}</div>
          </div>
          <Stepper value={portions} min={food.min_portions} onChange={setPortions} />
        </div>
      </div>

      {seller && (
        <div className="u-card" style={{ marginTop: 12 }}>
          <div className="u-row">
            <div className="u-item-thumb" style={{ width: 48, height: 48, borderRadius: 14 }}><Icon name="chef" /></div>
            <div className="grow">
              <div style={{ fontWeight: 800 }}>{seller.display_name}</div>
              <div className="u-row" style={{ gap: 6 }}>
                <Stars value={seller.rating_avg} />
                <span className="u-muted" style={{ fontSize: 13, fontWeight: 700 }}>
                  {seller.rating_count ? `${seller.rating_avg.toFixed(1)} (${seller.rating_count})` : 'Hali baho yo\'q'}
                </span>
              </div>
            </div>
          </div>
          {reviews.filter((r) => r.comment).map((r) => (
            <div key={r.id} style={{ marginTop: 12, paddingTop: 12, borderTop: '1.5px dashed var(--line)' }}>
              <Stars value={r.rating} />
              <div style={{ fontWeight: 600, marginTop: 2 }}>{r.comment}</div>
            </div>
          ))}
        </div>
      )}

      <StickyBar show aboveTabs={false} label="Savatga qo'shish" sub={money(total)} onClick={add} disabled={!food.is_available} />

      <Sheet open={conflict} onClose={() => setConflict(false)}>
        <h2 style={{ fontSize: 22, fontWeight: 800 }}>Savatni almashtiramizmi?</h2>
        <p className="u-muted" style={{ margin: '8px 0 18px', fontWeight: 600 }}>
          Savatingizda boshqa oshxonaning taomlari bor ({cart.sellerName}). Bir buyurtma faqat bitta oshxonadan bo'ladi.
        </p>
        <div className="u-stack">
          <Button block onClick={() => { cart.replaceWith(food, portions, sellerName); setConflict(false); toast('Savat yangilandi', 'success'); nav(-1); }}>Ha, yangi savat</Button>
          <Button block variant="ghost" onClick={() => setConflict(false)}>Bekor qilish</Button>
        </div>
      </Sheet>
    </Page>
  );
}
