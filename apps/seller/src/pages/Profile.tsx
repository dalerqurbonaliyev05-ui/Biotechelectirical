import { useState } from 'react';
import { Button, Header, Icon, Page, Stars, getPosition, useAuth, useToast } from '@uyovqat/shared';

export default function Profile() {
  const { profile, session, updateProfile, signOut } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({ shop: profile?.shop_name ?? '', name: profile?.full_name ?? '', phone: profile?.phone ?? '', address: profile?.address ?? '' });
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function save() {
    setBusy(true);
    const e = await updateProfile({ shop_name: f.shop.trim(), full_name: f.name.trim(), phone: f.phone.trim() || null, address: f.address.trim() || null });
    setBusy(false);
    if (e) toast(e, 'error'); else toast('Saqlandi', 'success');
  }

  async function locate() {
    setLocating(true);
    try {
      const p = await getPosition();
      const e = await updateProfile({ lat: p.lat, lng: p.lng });
      if (e) toast(e, 'error'); else toast('Oshxona joylashuvi saqlandi', 'success');
    } catch { toast('Joylashuvni aniqlab bo\'lmadi. Ruxsatni tekshiring.', 'error'); }
    setLocating(false);
  }

  return (
    <Page>
      <Header title="Profil" sub={session?.user.email} />
      {profile && profile.rating_count > 0 && (
        <div className="u-card flat u-row" style={{ marginBottom: 16 }}><Stars value={profile.rating_avg} /><b>{profile.rating_avg.toFixed(1)}</b><span className="u-muted">({profile.rating_count} baho)</span></div>
      )}
      <label className="u-field"><span>Oshxona nomi</span><input className="u-input" value={f.shop} onChange={set('shop')} /></label>
      <label className="u-field"><span>Ismingiz</span><input className="u-input" value={f.name} onChange={set('name')} /></label>
      <label className="u-field"><span>Telefon</span><input className="u-input" type="tel" value={f.phone} onChange={set('phone')} /></label>
      <label className="u-field"><span>Manzil</span><input className="u-input" value={f.address} onChange={set('address')} placeholder="Kuryer olib ketadigan manzil" /></label>
      <div className="u-card flat" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 800 }}>Oshxona joylashuvi</div>
        <div className="u-hint" style={{ marginBottom: 10 }}>
          {profile?.lat != null ? `Saqlangan: ${profile.lat.toFixed(4)}, ${profile.lng?.toFixed(4)}` : 'Belgilanmagan: kuryer avtomatik biriktirilmaydi.'} Oshxonada turib bosing.
        </div>
        <Button variant="soft" size="sm" loading={locating} onClick={locate}><Icon name="pin" size={18} />Joriy joylashuvni saqlash</Button>
      </div>
      <div className="u-stack">
        <Button block loading={busy} onClick={save}>Saqlash</Button>
        <Button block variant="ghost" onClick={() => void signOut()}>Chiqish</Button>
      </div>
    </Page>
  );
}
