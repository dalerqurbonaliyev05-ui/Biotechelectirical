import { useState } from 'react';
import { Button, Header, Page, Stars, supabase, useAuth, useToast } from '@uyovqat/shared';
import { useCourier } from '../courier';

export default function Profile() {
  const { profile, session, updateProfile, signOut } = useAuth();
  const { courier, reload } = useCourier();
  const toast = useToast();
  const [name, setName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [vehicle, setVehicle] = useState(courier?.vehicle ?? '');
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const e = await updateProfile({ full_name: name.trim(), phone: phone.trim() || null });
    const v = await supabase.from('couriers').update({ vehicle: vehicle.trim() || null }).eq('id', session!.user.id);
    await reload();
    setBusy(false);
    if (e || v.error) toast(e ?? v.error!.message, 'error'); else toast('Saqlandi', 'success');
  }

  return (
    <Page>
      <Header title="Profil" sub={session?.user.email} />
      {profile && profile.rating_count > 0 && (
        <div className="u-card flat u-row" style={{ marginBottom: 16 }}><Stars value={profile.rating_avg} /><b>{profile.rating_avg.toFixed(1)}</b><span className="u-muted">({profile.rating_count} baho)</span></div>
      )}
      <label className="u-field"><span>Ism</span><input className="u-input" value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label className="u-field"><span>Telefon</span><input className="u-input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
      <label className="u-field"><span>Transport</span><input className="u-input" value={vehicle} onChange={(e) => setVehicle(e.target.value)} placeholder="Masalan: Skuter, velosiped, Damas" /></label>
      <div className="u-stack">
        <Button block loading={busy} onClick={save}>Saqlash</Button>
        <Button block variant="ghost" onClick={() => void signOut()}>Chiqish</Button>
      </div>
    </Page>
  );
}
