import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Empty, FoodImage, Header, Icon, Page, Stepper, StickyBar, errMsg, getPosition, money, prepLabel, supabase,
  toLocalInput, useAuth, useToast, type PayMethod, type PromoPreview } from '@uyovqat/shared';
import { useCart } from '../cart';

export default function CartPage() {
  const nav = useNavigate();
  const toast = useToast();
  const { profile, updateProfile } = useAuth();
  const cart = useCart();

  const maxPrep = useMemo(() => Math.max(0, ...cart.lines.map((l) => l.food.prep_minutes)), [cart.lines]);
  const minReady = useMemo(() => new Date(Date.now() + (maxPrep + 3) * 60000), [maxPrep]);
  const [ready, setReady] = useState(() => toLocalInput(new Date(Date.now() + (maxPrep + 33) * 60000)));
  const [address, setAddress] = useState(profile?.address ?? '');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(profile?.lat != null && profile?.lng != null ? { lat: profile.lat, lng: profile.lng } : null);
  const [pay, setPay] = useState<PayMethod>('cash');
  const [note, setNote] = useState('');
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState<(PromoPreview & { code: string }) | null>(null);
  const [promoMsg, setPromoMsg] = useState<string | null>(null);
  const [fee, setFee] = useState(0);
  const [placing, setPlacing] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    supabase.from('uy_settings').select('value').eq('key', 'delivery_fee').maybeSingle()
      .then(({ data }) => setFee(Number((data as { value: unknown } | null)?.value ?? 0)));
  }, []);

  // Savat summasi o'zgarsa, qo'llangan promokod qayta tekshiriladi.
  useEffect(() => {
    if (!promo) return;
    supabase.rpc('uy_preview_promo', { p_code: promo.code, p_subtotal: cart.subtotal }).then(({ data }) => {
      const r = (data as PromoPreview[] | null)?.[0];
      if (r && r.valid) setPromo({ ...r, code: promo.code }); else { setPromo(null); setPromoMsg(r?.message ?? null); }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.subtotal]);

  if (cart.count === 0) {
    return (
      <Page tabs>
        <Header title="Savat" />
        <Empty icon="🛒" title="Savat bo'sh" text="Mazali taomlarni tanlang, biz tayyorlab olib kelamiz." action={<Button onClick={() => nav('/')}>Taomlarni ko'rish</Button>} />
      </Page>
    );
  }

  const discount = promo?.discount ?? 0;
  const total = Math.max(0, cart.subtotal - discount + fee);
  const readyDate = new Date(ready);
  const readyOk = !Number.isNaN(readyDate.getTime()) && readyDate >= minReady;

  async function applyPromo() {
    if (!promoInput.trim()) return;
    const { data, error } = await supabase.rpc('uy_preview_promo', { p_code: promoInput.trim(), p_subtotal: cart.subtotal });
    if (error) { setPromoMsg(errMsg(error)); return; }
    const r = (data as PromoPreview[])[0];
    if (r.valid) { setPromo({ ...r, code: promoInput.trim().toUpperCase() }); setPromoMsg(null); toast(`Chegirma: −${money(r.discount)}`, 'success'); }
    else { setPromo(null); setPromoMsg(r.message); }
  }

  async function locate() {
    setLocating(true);
    try {
      const p = await getPosition();
      setCoords(p);
      if (!address.trim()) setAddress('Joriy joylashuvim');
      toast('Joylashuv aniqlandi', 'success');
    } catch { toast('Joylashuvni aniqlab bo\'lmadi. Ruxsatni tekshiring.', 'error'); }
    setLocating(false);
  }

  async function place() {
    if (address.trim().length < 3) { toast('Yetkazish manzilini kiriting', 'error'); return; }
    if (!readyOk) { toast(`Taom kamida ${prepLabel(maxPrep)} dan keyin tayyor bo'ladi`, 'error'); return; }
    setPlacing(true);
    const { data, error } = await supabase.rpc('uy_place_order', {
      p_seller: cart.sellerId,
      p_items: cart.lines.map((l) => ({ food_id: l.food.id, portions: l.portions })),
      p_ready_at: readyDate.toISOString(),
      p_pay: pay,
      p_promo: promo?.code ?? null,
      p_address: address.trim(),
      p_lat: coords?.lat ?? null,
      p_lng: coords?.lng ?? null,
      p_note: note.trim() || null,
    });
    setPlacing(false);
    if (error) { toast(errMsg(error), 'error'); return; }
    if (!profile?.address) void updateProfile({ address: address.trim(), lat: coords?.lat ?? null, lng: coords?.lng ?? null });
    cart.clear();
    toast('Buyurtma yuborildi!', 'success');
    nav(`/orders/${data as string}`, { replace: true });
  }

  return (
    <Page sticky>
      <Header title="Savat" sub={cart.sellerName} />

      <div className="u-list">
        {cart.lines.map((l) => (
          <div key={l.food.id} className="u-item" style={{ alignItems: 'flex-start' }}>
            <div className="u-item-thumb"><FoodImage item={l.food} /></div>
            <div className="u-item-main">
              <div className="u-item-title">{l.food.name}</div>
              <div className="u-item-sub">{money(l.food.price_per_portion)} × {l.portions} kishi</div>
              <div className="u-row" style={{ marginTop: 8, justifyContent: 'space-between' }}>
                <Stepper value={l.portions} min={l.food.min_portions} onChange={(n) => cart.setPortions(l.food.id, n)} />
                <b>{money(l.food.price_per_portion * l.portions)}</b>
              </div>
            </div>
            <button className="u-iconbtn" aria-label="O'chirish" onClick={() => cart.remove(l.food.id)}><Icon name="trash" size={18} /></button>
          </div>
        ))}
      </div>

      <h2 className="u-section-title">Qachonga tayyor bo'lsin?</h2>
      <label className="u-field" style={{ marginBottom: 0 }}>
        <input className={`u-input ${readyOk ? '' : 'err'}`} type="datetime-local" value={ready} min={toLocalInput(minReady)} onChange={(e) => setReady(e.target.value)} aria-label="Kerakli tayyor bo'lish vaqti" />
        <div className="u-hint">Eng ko'p tayyorlanadigan taom: {prepLabel(maxPrep)}. Shu vaqtga tayyor bo'ladi va yetkaziladi.</div>
      </label>

      <h2 className="u-section-title">Yetkazish manzili</h2>
      <label className="u-field">
        <input className="u-input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Ko'cha, uy, xonadon" autoComplete="street-address" />
      </label>
      <Button variant="soft" size="sm" onClick={locate} loading={locating}><Icon name="pin" size={18} />{coords ? 'Joylashuv saqlandi · yangilash' : 'Joylashuvimni aniqlash'}</Button>
      <label className="u-field" style={{ marginTop: 14 }}><span>Izoh (ixtiyoriy)</span>
        <input className="u-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Masalan: eshik oldida qo'ng'iroq qiling" maxLength={300} />
      </label>

      <h2 className="u-section-title">To'lov usuli</h2>
      <div className="u-seg" role="radiogroup">
        <button role="radio" aria-checked={pay === 'cash'} className={pay === 'cash' ? 'active' : ''} onClick={() => setPay('cash')}>💵 Naqd</button>
        <button role="radio" aria-checked={pay === 'card'} className={pay === 'card' ? 'active' : ''} onClick={() => setPay('card')}>💳 Karta</button>
      </div>
      <div className="u-hint">{pay === 'cash' ? 'Kuryerga yetkazilganda naqd to\'laysiz.' : 'Karta orqali yetkazilganda to\'laysiz (kuryer ko\'rsatmasiga ko\'ra).'}</div>

      <h2 className="u-section-title">Promokod</h2>
      <div className="u-row">
        <input className="u-input" style={{ textTransform: 'uppercase' }} value={promoInput} onChange={(e) => setPromoInput(e.target.value)} placeholder="Masalan: UY10" aria-label="Promokod" />
        <Button variant="soft" onClick={applyPromo}><Icon name="gift" size={18} />Qo'llash</Button>
      </div>
      {promo && <div className="u-hint" style={{ color: 'var(--success)' }}>✓ {promo.code}: −{money(promo.discount)}</div>}
      {promoMsg && !promo && <div className="u-hint" style={{ color: 'var(--danger)' }}>{promoMsg}</div>}

      <div className="u-card flat" style={{ marginTop: 22 }}>
        <div className="u-kv"><span>Taomlar</span><b>{money(cart.subtotal)}</b></div>
        {discount > 0 && <div className="u-kv discount"><span>Promokod</span><b>−{money(discount)}</b></div>}
        <div className="u-kv"><span>Yetkazish</span><b>{money(fee)}</b></div>
        <div className="u-kv total"><span>Jami</span><b>{money(total)}</b></div>
      </div>

      <StickyBar show label="Buyurtma berish" sub={money(total)} onClick={place} loading={placing} />
    </Page>
  );
}
