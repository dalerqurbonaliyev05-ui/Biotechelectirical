import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, FOOD_IMAGES_BUCKET, FoodImage, Header, Icon, Page, Spinner, Switch, errMsg, supabase, useAuth, useToast, type Category, type FoodItem } from '@uyovqat/shared';

/** Rasmni brauzerda kichraytiradi (eng uzun tomoni 1200px, JPEG) — Storage va trafikni tejaydi. */
async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1200 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Rasmni o\'qib bo\'lmadi'))), 'image/jpeg', 0.85));
}

export default function FoodForm() {
  const { id } = useParams();
  const isNew = id === 'new';
  const nav = useNavigate();
  const toast = useToast();
  const { session } = useAuth();
  const [cats, setCats] = useState<Category[]>([]);
  const [loaded, setLoaded] = useState(isNew);
  const [f, setF] = useState({ name: '', description: '', category_id: '', price: '', minPortions: '1', prepMinutes: '60', available: true, image: null as string | null });
  const [busy, setBusy] = useState(false);
  const [up, setUp] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from('categories').select('*').order('sort_order').then(({ data }) => setCats((data as Category[]) ?? []));
    if (!isNew) {
      supabase.from('food_items').select('*').eq('id', id!).maybeSingle().then(({ data }) => {
        const x = data as FoodItem | null;
        if (x) setF({ name: x.name, description: x.description ?? '', category_id: x.category_id, price: String(x.price_per_portion), minPortions: String(x.min_portions), prepMinutes: String(x.prep_minutes), available: x.is_available, image: x.image_url });
        setLoaded(true);
      });
    }
  }, [id, isNew]);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file0 = e.target.files?.[0];
    if (!file0 || !session) return;
    setUp(true);
    try {
      const blob = await shrink(file0);
      const path = `${session.user.id}/${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage.from(FOOD_IMAGES_BUCKET).upload(path, blob, { contentType: 'image/jpeg' });
      if (error) throw error;
      setF((x) => ({ ...x, image: path }));
    } catch (er) { toast(errMsg(er), 'error'); }
    setUp(false);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    const price = Number(f.price);
    if (!f.category_id) { toast('Kategoriyani tanlang', 'error'); return; }
    if (!(price > 0)) { toast('Narxni kiriting', 'error'); return; }
    setBusy(true);
    const row = {
      name: f.name.trim(), description: f.description.trim() || null, category_id: f.category_id, price_per_portion: price,
      min_portions: Math.max(1, Number(f.minPortions) || 1), prep_minutes: Math.max(5, Number(f.prepMinutes) || 60), is_available: f.available, image_url: f.image,
    };
    const { error } = isNew
      ? await supabase.from('food_items').insert({ ...row, seller_id: session.user.id })
      : await supabase.from('food_items').update(row).eq('id', id!);
    setBusy(false);
    if (error) { toast(errMsg(error), 'error'); return; }
    toast(isNew ? 'Taom qo\'shildi' : 'Saqlandi', 'success');
    nav('/foods', { replace: true });
  }

  async function remove() {
    if (!window.confirm('Taomni o\'chirasizmi?')) return;
    const { error } = await supabase.from('food_items').delete().eq('id', id!);
    if (error) toast(errMsg(error), 'error'); else { toast('O\'chirildi'); nav('/foods', { replace: true }); }
  }

  if (!loaded) return <Page tabs={false}><Spinner /></Page>;
  const tops = cats.filter((c) => !c.parent_id);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <Page tabs={false}>
      <Header title={isNew ? 'Yangi taom' : 'Taomni tahrirlash'} back="/foods" />
      <form onSubmit={save}>
        <button type="button" className="u-food-img" style={{ width: '100%', aspectRatio: '16/10', marginBottom: 16 }} onClick={() => file.current?.click()} aria-label="Rasm tanlash">
          {up ? <span className="u-spin" /> : <FoodImage item={{ image_url: f.image, name: f.name }} />}
          <span className="u-food-time" style={{ left: 'auto', right: 10 }}><Icon name="camera" size={14} />{f.image ? 'Almashtirish' : 'Rasm qo\'shish'}</span>
        </button>
        <input ref={file} type="file" accept="image/*" hidden onChange={pick} />

        <label className="u-field"><span>Taom nomi</span><input className="u-input" value={f.name} onChange={set('name')} required minLength={2} maxLength={120} placeholder="Masalan: Mastava" /></label>
        <label className="u-field"><span>Kategoriya</span>
          <select className="u-select" value={f.category_id} onChange={set('category_id')} required>
            <option value="">Tanlang…</option>
            {tops.map((t) => {
              const kids = cats.filter((c) => c.parent_id === t.id);
              return kids.length
                ? <optgroup key={t.id} label={t.name}>{kids.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}</optgroup>
                : <option key={t.id} value={t.id}>{t.name}</option>;
            })}
          </select>
        </label>
        <div className="u-row">
          <label className="u-field grow"><span>Narxi (1 kishi, so'm)</span><input className="u-input" type="number" inputMode="numeric" min={1000} step={500} value={f.price} onChange={set('price')} required /></label>
          <label className="u-field grow"><span>Kamida (kishi)</span><input className="u-input" type="number" inputMode="numeric" min={1} max={500} value={f.minPortions} onChange={set('minPortions')} /></label>
        </div>
        <label className="u-field"><span>Tayyorlanish vaqti (daqiqa)</span><input className="u-input" type="number" inputMode="numeric" min={5} max={2880} value={f.prepMinutes} onChange={set('prepMinutes')} required />
          <div className="u-hint">Xaridor tayyor bo'lish vaqtini shundan oldinga qo'ya olmaydi.</div></label>
        <label className="u-field"><span>Tavsif (ixtiyoriy)</span><textarea className="u-textarea" value={f.description} onChange={set('description')} placeholder="Tarkibi, o'ziga xosligi…" /></label>
        <div className="u-row" style={{ justifyContent: 'space-between', marginBottom: 20 }}>
          <b>Hozir buyurtma qabul qilinadi</b><Switch on={f.available} onChange={(v) => setF({ ...f, available: v })} label="Mavjud" />
        </div>
        <div className="u-stack">
          <Button block type="submit" loading={busy}>Saqlash</Button>
          {!isNew && <Button block variant="danger" type="button" onClick={remove}>O'chirish</Button>}
        </div>
      </form>
    </Page>
  );
}
