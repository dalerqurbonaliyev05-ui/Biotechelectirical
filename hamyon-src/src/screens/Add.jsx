import React, { useState, useEffect } from 'react';
import { Header, AmountInput } from '../ui.jsx';
import { EXPENSE_CATS, INCOME_CATS, guessCategory } from '../categories.js';

export default function Add({ state, dispatch, today, onClose }) {
  const [type, setType] = useState('expense');
  const [digits, setDigits] = useState('');
  const [note, setNote] = useState('');
  const [cat, setCat] = useState(state.lastCat || 'oziq');
  const [touched, setTouched] = useState(false);
  const [auto, setAuto] = useState(false);
  const [date, setDate] = useState(today);

  const cats = type === 'expense' ? EXPENSE_CATS : INCOME_CATS;

  useEffect(() => {
    setCat(type === 'expense' ? state.lastCat || 'oziq' : 'in_maosh');
    setTouched(false);
    setAuto(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const onNote = (v) => {
    setNote(v);
    if (type === 'expense' && !touched) {
      const g = guessCategory(v);
      if (g) {
        setCat(g);
        setAuto(true);
      }
    }
  };

  const amount = Number(digits || 0);
  const save = () => {
    if (!amount) return;
    dispatch({ type: 'addTx', tx: { type, amount, cat, note: note.trim(), date } });
    onClose();
  };

  return (
    <div className="screen overlay">
      <Header title={type === 'expense' ? "Xarajat qo'shish" : "Daromad qo'shish"} onBack={onClose} />
      <div className="body pad">
        <div className="seg">
          <button className={type === 'expense' ? 'on' : ''} onClick={() => setType('expense')}>Xarajat</button>
          <button className={type === 'income' ? 'on' : ''} onClick={() => setType('income')}>Daromad</button>
        </div>

        <label className="lbl">Summa (so'm)</label>
        <AmountInput digits={digits} setDigits={setDigits} autoFocus />

        <label className="lbl">Izoh (ixtiyoriy)</label>
        <input
          className="input"
          value={note}
          onChange={(e) => onNote(e.target.value)}
          placeholder={type === 'expense' ? 'Non, sabzavot, sut' : 'Maosh, avans...'}
        />

        <label className="lbl">
          Kategoriya {auto && <span className="auto">izohdan tanlandi ✓</span>}
        </label>
        <div className="cat-grid">
          {cats.map((c) => (
            <button
              key={c.id}
              className={'cat' + (cat === c.id ? ' sel' : '')}
              style={cat === c.id ? { borderColor: c.color, background: c.color + '14' } : null}
              onClick={() => {
                setCat(c.id);
                setTouched(true);
                setAuto(false);
              }}
            >
              <span className="cat-icon" style={{ background: c.color + '22', color: c.color }}>{c.icon}</span>
              <span>{c.name}</span>
            </button>
          ))}
        </div>

        <label className="lbl">Sana</label>
        <input className="input" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value || today)} />

        <button className="btn primary" disabled={!amount} onClick={save}>Saqlash</button>
      </div>
    </div>
  );
}
