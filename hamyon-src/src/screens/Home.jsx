import React from 'react';
import { dailyPlan, monthTotals, fixedUnpaid, dkey } from '../calc.js';
import { som, fmt, shortDate } from '../format.js';
import { CatIcon, Progress } from '../ui.jsx';
import { catById } from '../categories.js';

export default function Home({ state, dispatch, now, onAdd, goProfile }) {
  const plan = dailyPlan(state, now);
  const totals = monthTotals(state.transactions, now);
  const today = dkey(now);
  const todays = state.transactions.filter((t) => t.date === today).reverse();
  const unpaid = fixedUnpaid(state, now);
  const usedPct = plan.dailyLimit > 0 ? (plan.spentToday / plan.dailyLimit) * 100 : plan.spentToday > 0 ? 100 : 0;

  const remove = (t) => {
    if (window.confirm(`"${t.note || catById(t.cat).name}" yozuvini o'chiraymi?`)) dispatch({ type: 'delTx', id: t.id });
  };

  return (
    <div className="screen">
      <div className="top dark-bg">
        <div className="row between">
          <div>
            <h1 className="hello">Salom, {state.profile.name} 👋</h1>
            <p className="sub">Moliyaviy maqsadlaring sari!</p>
          </div>
          <button className="icon-btn light" onClick={goProfile} aria-label="Sozlamalar">⚙️</button>
        </div>

        <div className="glass">
          <span className="mini">Jami mablag'</span>
          <div className="big">{som(plan.balance)}</div>
          <div className="mini2">
            {plan.incomeToday > 0 ? <span className="pos">+ {som(plan.incomeToday)} (bugun)</span> : null}
            {plan.incomeToday > 0 ? ' · ' : ''}
            <span>Jamg'armada: {som(plan.goalsSaved)}</span>
          </div>
        </div>

        <div className="two">
          <div className="glass sm">
            <span className="mini">⬆ Daromad</span>
            <div className="mid">{som(totals.income)}</div>
            <span className="mini3">(oylik)</span>
          </div>
          <div className="glass sm">
            <span className="mini">⬇ Xarajat</span>
            <div className="mid">{som(totals.expense)}</div>
            <span className="mini3">(oylik)</span>
          </div>
        </div>
      </div>

      <div className="body">
        <div className="card limit">
          <div className="row between">
            <b>Bugungi limit</b>
            <span className="muted">{plan.daysLeft} kun qoldi</span>
          </div>
          <div className="limit-v">{som(plan.dailyLimit)}</div>
          <Progress pct={usedPct} color={plan.overspent ? 'var(--red)' : 'var(--green)'} />
          <div className="row between small">
            <span>Sarflandi: {som(plan.spentToday)}</span>
            {plan.overspent ? (
              <span className="neg">Limit oshdi: {som(-plan.remainingToday)}</span>
            ) : (
              <span>Qoldi: {som(plan.remainingToday)}</span>
            )}
          </div>
          {plan.short ? (
            <div className="note warn">⚠️ Mablag' majburiy to'lovlar uchun yetmaydi. Daromad kiriting yoki to'lovlarni tekshiring.</div>
          ) : plan.overspent ? (
            <div className="note warn">Bugun limitdan oshdingiz — ertangi limit biroz kamayadi.</div>
          ) : (
            <div className="note good">
              💰 Bugun <b>{som(plan.canSaveToday)}</b> jamg'arishingiz mumkin
            </div>
          )}
          <div className="split">
            <span>Zaxiraga saqlangan: <b>{som(plan.reserve)}</b></span>
            {plan.fixedTotal > 0 && <span>Majburiy to'lovlar: <b>{som(plan.fixedTotal)}</b></span>}
          </div>
        </div>

        {unpaid.length > 0 && (
          <div className="card">
            <div className="card-t">Majburiy to'lovlar (shu oy)</div>
            {unpaid.map((f) => (
              <div className="li" key={f.id}>
                <CatIcon id={f.cat || 'uyjoy'} />
                <div className="grow">
                  <div className="li-t">{f.name}</div>
                  <div className="li-s">har oyning {f.day}-kuni</div>
                </div>
                <div className="li-r">
                  <div className="neg">{som(f.amount)}</div>
                  <button className="chip" onClick={() => dispatch({ type: 'payFixed', id: f.id, now, date: today })}>To'ladim</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="card">
          <div className="row between">
            <div className="card-t">Bugungi xarajatlar</div>
            <span className="muted">{shortDate(today)}</span>
          </div>
          {todays.length === 0 && <p className="empty">Bugun hali yozuv yo'q. Pastdagi tugma orqali qo'shing.</p>}
          {todays.map((t) => (
            <div className="li" key={t.id} onClick={() => remove(t)}>
              <CatIcon id={t.cat} />
              <div className="grow">
                <div className="li-t">{t.note || catById(t.cat).name}</div>
                <div className="li-s">{catById(t.cat).name}</div>
              </div>
              <div className={t.type === 'income' ? 'pos' : 'neg'}>
                {t.type === 'income' ? '+' : '−'} {fmt(t.amount)} so'm
              </div>
            </div>
          ))}
          <button className="btn primary" onClick={onAdd}>＋ Xarajat qo'shish</button>
        </div>
      </div>
    </div>
  );
}
