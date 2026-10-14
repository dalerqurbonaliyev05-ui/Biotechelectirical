import React, { useState } from 'react';
import { Toggle, AmountInput, CatIcon } from '../ui.jsx';
import { ensurePermission } from '../notify.js';
import { balanceOf } from '../calc.js';
import { som } from '../format.js';
import { EXPENSE_CATS } from '../categories.js';

export default function Profile({ state, dispatch }) {
  const r = state.reminders;
  const [name, setName] = useState(state.profile.name);
  const [newBal, setNewBal] = useState('');
  const [fx, setFx] = useState({ name: '', digits: '', day: '1', cat: 'uyjoy' });

  const setR = async (key, patch) => {
    if (patch.on) await ensurePermission();
    dispatch({ type: 'reminder', key, patch });
  };

  const updateBalance = () => {
    if (newBal === '') return;
    const diff = Number(newBal) - balanceOf(state);
    dispatch({ type: 'profile', patch: { startBalance: state.profile.startBalance + diff } });
    setNewBal('');
  };

  const addFixed = () => {
    const amount = Number(fx.digits || 0);
    if (!fx.name.trim() || !amount) return;
    dispatch({
      type: 'addFixed',
      fixed: { name: fx.name.trim(), amount, day: Math.min(31, Math.max(1, Number(fx.day) || 1)), cat: fx.cat },
    });
    setFx({ name: '', digits: '', day: '1', cat: 'uyjoy' });
  };

  const reset = () => {
    if (window.confirm("Barcha ma'lumot o'chiriladi. Davom etasizmi?")) dispatch({ type: 'reset' });
  };

  return (
    <div className="screen">
      <div className="hdr dark-bg only"><h1>Profil va eslatmalar</h1></div>
      <div className="body pad">
        <div className="card">
          <div className="card-t">Eslatmalar</div>

          <div className="rem">
            <div className="grow">
              <b>Har kuni — jamg'arma eslatmasi</b>
              <p className="muted small">Bugun qancha jamg'arish mumkinligini aytadi.</p>
              {r.daily.on && (
                <input className="input time" type="time" value={r.daily.time} onChange={(e) => setR('daily', { time: e.target.value || '19:00' })} />
              )}
            </div>
            <Toggle on={r.daily.on} onChange={(on) => setR('daily', { on })} />
          </div>

          <div className="rem">
            <div className="grow">
              <b>Xarajat kiritishni eslatish</b>
              <p className="muted small">Bugun xarajat yozmagan bo'lsangiz.</p>
              {r.noEntry.on && (
                <input className="input time" type="time" value={r.noEntry.time} onChange={(e) => setR('noEntry', { time: e.target.value || '21:00' })} />
              )}
            </div>
            <Toggle on={r.noEntry.on} onChange={(on) => setR('noEntry', { on })} />
          </div>

          <div className="rem">
            <div className="grow">
              <b>Har hafta (dushanba)</b>
              <p className="muted small">Haftalik xarajatlar tahlili.</p>
            </div>
            <Toggle on={r.weekly.on} onChange={(on) => setR('weekly', { on })} />
          </div>

          <div className="rem">
            <div className="grow">
              <b>Har oy 1-sana</b>
              <p className="muted small">Maqsadlar tekshiruvi.</p>
            </div>
            <Toggle on={r.monthly.on} onChange={(on) => setR('monthly', { on })} />
          </div>
        </div>

        <div className="card">
          <div className="card-t">Majburiy doimiy to'lovlar</div>
          <p className="muted small">Ijara, kommunal, kredit — har oy limitdan oldin ajratib qo'yiladi.</p>
          {state.fixed.map((f) => (
            <div className="li" key={f.id}>
              <CatIcon id={f.cat || 'uyjoy'} size={36} />
              <div className="grow">
                <div className="li-t">{f.name}</div>
                <div className="li-s">{som(f.amount)} · har oyning {f.day}-kuni</div>
              </div>
              <button className="chip danger" onClick={() => dispatch({ type: 'delFixed', id: f.id })}>O'chirish</button>
            </div>
          ))}
          <input className="input" placeholder="Nomi (masalan, Ijara)" value={fx.name} onChange={(e) => setFx({ ...fx, name: e.target.value })} />
          <AmountInput digits={fx.digits} setDigits={(d) => setFx({ ...fx, digits: d })} placeholder="Summa" />
          <div className="two-btn">
            <input className="input" type="number" min="1" max="31" placeholder="Kun" value={fx.day} onChange={(e) => setFx({ ...fx, day: e.target.value })} />
            <select className="input" value={fx.cat} onChange={(e) => setFx({ ...fx, cat: e.target.value })}>
              {EXPENSE_CATS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <button className="btn ghost" onClick={addFixed}>＋ To'lov qo'shish</button>
        </div>

        <div className="card">
          <div className="card-t">Sozlamalar</div>
          <label className="lbl">Ism</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => dispatch({ type: 'profile', patch: { name: name.trim() || state.profile.name } })}
          />

          <label className="lbl">Jamg'armaga ajratiladigan ulush: <b>{state.profile.savePct}%</b></label>
          <input
            type="range" min="0" max="50" step="5"
            value={state.profile.savePct}
            onChange={(e) => dispatch({ type: 'profile', patch: { savePct: Number(e.target.value) } })}
          />

          <label className="lbl">Mablag'ni tuzatish (hozir: {som(balanceOf(state))})</label>
          <AmountInput digits={newBal} setDigits={setNewBal} placeholder="Haqiqiy mablag'" />
          <button className="btn ghost" disabled={newBal === ''} onClick={updateBalance}>Yangilash</button>
        </div>

        <button className="link danger center" onClick={reset}>Barcha ma'lumotni o'chirish</button>
        <p className="muted small center">Hamyon 1.0 · ma'lumot faqat shu telefonda saqlanadi</p>
      </div>
    </div>
  );
}
