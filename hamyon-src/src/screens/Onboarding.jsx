import React, { useState } from 'react';
import { AmountInput } from '../ui.jsx';
import { ensurePermission } from '../notify.js';
import { som } from '../format.js';

export default function Onboarding({ dispatch }) {
  const [name, setName] = useState('');
  const [digits, setDigits] = useState('');
  const [pct, setPct] = useState(20);

  const start = async () => {
    dispatch({
      type: 'onboard',
      profile: { name: name.trim() || 'Do\'st', startBalance: Number(digits || 0), savePct: pct },
    });
    await ensurePermission(); // eslatmalar uchun ruxsat so'raladi
  };

  return (
    <div className="screen dark-bg onboard">
      <div className="ob-top">
        <div className="logo">👛</div>
        <h1>Hamyon</h1>
        <p>Xarajatlaringizni yozing — ilova har kuni qancha sarflash va qancha jamg'arish mumkinligini hisoblab beradi.</p>
      </div>
      <div className="sheet">
        <label className="lbl">Ismingiz</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Masalan, Daler" />

        <label className="lbl">Hozirgi mablag'ingiz (so'm)</label>
        <AmountInput digits={digits} setDigits={setDigits} />

        <label className="lbl">
          Jamg'armaga ajratiladigan ulush: <b>{pct}%</b>
        </label>
        <input type="range" min="0" max="50" step="5" value={pct} onChange={(e) => setPct(Number(e.target.value))} />
        <p className="hint">
          Mablag'ning {pct}% qismi saqlab qo'yiladi, qolgani oyning qolgan kunlariga bo'linadi.
          {digits ? ` Taxminan ${som(Math.round((Number(digits) * pct) / 100))} zaxiraga ketadi.` : ''}
        </p>

        <button className="btn primary" onClick={start}>Boshlash</button>
      </div>
    </div>
  );
}
