import React, { useState } from 'react';
import { goalInfo, dailyPlan, addDays, dkey } from '../calc.js';
import { som, longDate } from '../format.js';
import { Progress, AmountInput, Header } from '../ui.jsx';

const ICONS = ['💻', '✈️', '🛡️', '🚗', '🏠', '📱', '🎓', '💍'];

export default function Goals({ state, dispatch, now }) {
  const [adding, setAdding] = useState(false);
  const [active, setActive] = useState(null); // goal id for deposit sheet
  const goals = state.goals;
  const plan = dailyPlan(state, now);
  const totalSaved = goals.reduce((a, g) => a + g.saved, 0);
  const totalTarget = goals.reduce((a, g) => a + g.target, 0);
  const pct = totalTarget ? Math.round((totalSaved / totalTarget) * 100) : 0;
  const activeGoal = goals.find((g) => g.id === active);

  if (adding) return <AddGoal now={now} onClose={() => setAdding(false)} dispatch={dispatch} />;

  return (
    <div className="screen">
      <div className="hdr dark-bg only"><h1>Jamg'arish maqsadlari</h1></div>
      <div className="body pad">
        <div className="card sum">
          <div className="row between"><span className="muted">Jami jamg'arma</span><b>{pct}%</b></div>
          <div className="limit-v">{som(totalSaved)}</div>
          <Progress pct={pct} />
          <div className="small muted">Maqsad: {som(totalTarget)}</div>
        </div>

        <div className="row between">
          <div className="card-t">Maqsadlarim</div>
          <button className="link" onClick={() => setAdding(true)}>＋ Yangi maqsad</button>
        </div>

        {goals.length === 0 && <p className="empty">Hali maqsad yo'q. Birinchi maqsadingizni qo'shing — masalan, noutbuk yoki sayohat.</p>}

        {goals.map((g) => {
          const i = goalInfo(g, now);
          return (
            <div className="card goal" key={g.id} onClick={() => setActive(g.id)}>
              <div className="row">
                <span className="goal-i">{g.icon}</span>
                <div className="grow">
                  <b>{g.name}</b>
                  <div className="blue">{som(g.target)}</div>
                </div>
                <span className="muted">{i.pct}%</span>
              </div>
              <Progress pct={i.pct} />
              <div className="row between small muted">
                <span>Qolgan: {som(i.remaining)}</span>
                {g.deadline && <span>Muddat: {longDate(g.deadline)}</span>}
              </div>
              {g.deadline && !i.done && i.daysLeft > 0 && (
                <div className="note good">Kuniga ~{som(i.perDay)} jamg'arsangiz, muddatga yetasiz</div>
              )}
              {g.deadline && !i.done && i.daysLeft <= 0 && <div className="note warn">Muddat o'tdi</div>}
              {i.done && <div className="note good">🎉 Maqsadga erishildi!</div>}
            </div>
          );
        })}

        <div className="card tip">
          <b>Maqsadlar sari har kuni kichik qadamlar bilan!</b>
          <p className="muted">
            {plan.canSaveToday > 0
              ? `Bugun ${som(plan.canSaveToday)} tejashingiz mumkin — maqsadga qo'shib qo'ying.`
              : "Bugungi limit doirasida sarflasangiz, ertaga jamg'arma ko'payadi."}
          </p>
        </div>
      </div>

      {activeGoal && (
        <Deposit
          goal={activeGoal}
          free={Math.max(0, plan.free)}
          onClose={() => setActive(null)}
          dispatch={dispatch}
        />
      )}
    </div>
  );
}

function Deposit({ goal, free, onClose, dispatch }) {
  const [digits, setDigits] = useState('');
  const amount = Number(digits || 0);
  const room = goal.target - goal.saved;
  const move = (delta) => {
    if (!amount) return;
    dispatch({ type: 'goalMove', id: goal.id, delta });
    onClose();
  };
  const del = () => {
    if (window.confirm(`"${goal.name}" maqsadini o'chiraymi? Yig'ilgan pul umumiy mablag'ga qaytadi.`)) {
      dispatch({ type: 'delGoal', id: goal.id });
      onClose();
    }
  };
  return (
    <div className="modal" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h3>{goal.icon} {goal.name}</h3>
        <p className="muted small">
          Yig'ilgan: {som(goal.saved)} · Erkin mablag': {som(free)}
        </p>
        <AmountInput digits={digits} setDigits={setDigits} autoFocus />
        <div className="two-btn">
          <button className="btn primary" disabled={!amount || amount > free || amount > room} onClick={() => move(amount)}>
            Qo'shish
          </button>
          <button className="btn ghost" disabled={!amount || amount > goal.saved} onClick={() => move(-amount)}>
            Qaytarib olish
          </button>
        </div>
        {amount > free && <p className="neg small">Erkin mablag' yetarli emas.</p>}
        <button className="link danger" onClick={del}>Maqsadni o'chirish</button>
      </div>
    </div>
  );
}

function AddGoal({ now, onClose, dispatch }) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(ICONS[0]);
  const [digits, setDigits] = useState('');
  const [deadline, setDeadline] = useState(dkey(addDays(now, 90)));
  const ok = name.trim() && Number(digits) > 0;
  return (
    <div className="screen overlay">
      <Header title="Yangi maqsad" onBack={onClose} />
      <div className="body pad">
        <label className="lbl">Nomi</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Noutbuk, Sayohat..." />
        <div className="icons">
          {ICONS.map((i) => (
            <button key={i} className={'ic' + (icon === i ? ' sel' : '')} onClick={() => setIcon(i)}>{i}</button>
          ))}
        </div>
        <label className="lbl">Maqsad summasi (so'm)</label>
        <AmountInput digits={digits} setDigits={setDigits} />
        <label className="lbl">Muddat</label>
        <input className="input" type="date" value={deadline} min={dkey(now)} onChange={(e) => setDeadline(e.target.value)} />
        <button
          className="btn primary"
          disabled={!ok}
          onClick={() => {
            dispatch({ type: 'addGoal', goal: { name: name.trim(), icon, target: Number(digits), deadline: deadline || null } });
            onClose();
          }}
        >
          Saqlash
        </button>
      </div>
    </div>
  );
}
