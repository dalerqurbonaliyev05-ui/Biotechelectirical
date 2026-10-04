import { useState } from 'react';
import { Button, Header, Page, useAuth, useToast } from '@uyovqat/shared';

export default function Profile() {
  const { profile, session, updateProfile, signOut } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [address, setAddress] = useState(profile?.address ?? '');
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const e = await updateProfile({ full_name: name.trim(), phone: phone.trim() || null, address: address.trim() || null });
    setBusy(false);
    if (e) toast(e, 'error'); else toast('Saqlandi', 'success');
  }

  return (
    <Page>
      <Header title="Profil" sub={session?.user.email} />
      <label className="u-field"><span>Ism</span><input className="u-input" value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label className="u-field"><span>Telefon</span><input className="u-input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
      <label className="u-field"><span>Standart manzil</span><input className="u-input" value={address} onChange={(e) => setAddress(e.target.value)} /></label>
      <div className="u-stack">
        <Button block loading={busy} onClick={save}>Saqlash</Button>
        <Button block variant="ghost" onClick={() => void signOut()}>Chiqish</Button>
      </div>
    </Page>
  );
}
