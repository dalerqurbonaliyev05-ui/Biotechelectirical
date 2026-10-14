import React, { useState } from 'react';
import { breakdown, dailySeries, periodRange, shiftAnchor } from '../calc.js';
import { fmt } from '../format.js';
import { catById } from '../categories.js';
import { Donut, Bars } from '../ui.jsx';

export default function Stats({ state, now }) {
  const [mode, setMode] = useState('month');
  const [anchor, setAnchor] = useState(now);
  const range = periodRange(mode, anchor);
  const b = breakdown(state.transactions, range.from, range.to);
  const series = dailySeries(state.transactions, range.from, range.to);
  const hasAny = series.some((d) => d.income || d.expense);

  const change = (m) => {
    setMode(m);
    setAnchor(now);
  };

  return (
    <div className="screen">
      <div className="hdr dark-bg only"><h1>Statistika</h1></div>
      <div className="body pad">
        <div className="seg">
          {[['month', 'Oy'], ['week', 'Hafta'], ['day', 'Kun']].map(([m, l]) => (
            <button key={m} className={mode === m ? 'on' : ''} onClick={() => change(m)}>{l}</button>
          ))}
        </div>

        <div className="card">
          <div className="row between period">
            <button className="icon-btn" onClick={() => setAnchor(shiftAnchor(mode, anchor, -1))}>‹</button>
            <b>{range.label}</b>
            <button className="icon-btn" onClick={() => setAnchor(shiftAnchor(mode, anchor, 1))}>›</button>
          </div>

          {b.total === 0 ? (
            <p className="empty">Bu davrda xarajat yo'q.</p>
          ) : (
            <>
              <Donut items={b.items} total={b.total} />
              <div className="legend">
                {b.items.map((it) => {
                  const c = catById(it.cat);
                  return (
                    <div className="lg" key={it.cat}>
                      <span className="dot" style={{ background: c.color }} />
                      <span className="grow">{c.name}</span>
                      <span className="pct">{it.pct}%</span>
                      <span className="amt">{fmt(it.amount)}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="card">
          <div className="card-t">Daromad va xarajatlar</div>
          <div className="key">
            <span><i style={{ background: '#16A34A' }} /> Daromad</span>
            <span><i style={{ background: '#EF4444' }} /> Xarajat</span>
          </div>
          {hasAny ? <Bars data={series} /> : <p className="empty">Ma'lumot yo'q.</p>}
        </div>
      </div>
    </div>
  );
}
