import React, { useState } from 'react';
import { asset } from '../lib/api.js';
import { parseNumber, answerText } from '../lib/grading.js';
import { SOURCE_TITLES } from '../data/meta.js';

const DIFF = ['', 'Oson', 'O‘rtacha', 'Qiyinroq', 'Qiyin', 'Murakkab'];
const fmtNum = v => (v == null ? '' : Math.abs(v) >= 1e5 || (Math.abs(v) < 1e-3 && v !== 0) ? v.toExponential(3).replace('e', '·10^') : String(+v.toPrecision(6)).replace('.', ','));

function Img({ src, fig, alt }) {
  const [zoom, setZoom] = useState(false);
  if (!src) return null;
  return (
    <>
      <button type="button" className={'qimg' + (fig ? ' fig' : '')} onClick={() => setZoom(true)} aria-label="Rasmni kattalashtirish">
        <img src={asset(src)} srcSet={asset(src) + ' 2x'} alt={alt || (fig ? 'Savolga chizma' : 'Savol matni (asl ko‘rinishda)')} loading="lazy" />
        <span className="zoomhint" aria-hidden="true">⤢</span>
      </button>
      {zoom && (
        <div className="zoomview" onClick={() => setZoom(false)} role="dialog" aria-label="Kattalashtirilgan rasm">
          <img src={asset(src)} alt="" />
          <button className="iconbtn" aria-label="Yopish" onClick={() => setZoom(false)}>✕</button>
        </div>
      )}
    </>
  );
}

function PenCircle() {
  return (
    <svg className="pen-circle" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
      <path d="M8 22 C 6 6, 70 2, 94 14 C 100 26, 60 38, 24 36 C 6 34, 2 22, 14 12" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/**
 * q: savol (javobsiz), value: joriy javob, onChange, locked, reveal: {answer} (to'g'ri javob ko'rsatilsin)
 */
export default function Question({ q, value, onChange, locked, reveal, compact }) {
  const imgOnly = !!q.full_image;
  const opts = q.options ? Object.entries(q.options) : [];
  const lettersOnly = q.qtype === 'mc' && (imgOnly || !!q.options_image || opts.every(([, t]) => !t));
  const corr = reveal?.answer;

  return (
    <div className={compact ? '' : 'qcard'}>
      {!compact && (
        <div className="qmeta">
          <span>{DIFF[q.difficulty] || ''}</span>
          {q.exam_tag && <span>Imtihon: {q.exam_tag}</span>}
          {q.source && <span>{SOURCE_TITLES[q.source] || q.source}</span>}
        </div>
      )}
      {imgOnly ? <Img src={q.full_image} /> : <p className="stem">{q.stem}</p>}
      {!imgOnly && <Img src={q.figure} fig />}
      {!imgOnly && q.options_image && <Img src={q.options_image} fig alt="Javob variantlari" />}

      {q.qtype === 'mc' && (
        <div className={'opts' + (lettersOnly ? ' letters' : '')} role="radiogroup">
          {opts.map(([k, t]) => {
            let cls = 'opt';
            if (value === k) cls += ' sel';
            if (corr != null) { if (k === corr) cls += ' ok'; else if (value === k) cls += ' bad'; }
            return (
              <button key={k} className={cls} disabled={locked} role="radio" aria-checked={value === k} onClick={() => onChange?.(k)}>
                {lettersOnly ? <span>{k}</span> : <><span className="L">{k}</span><span className="tx">{t}</span></>}
                {corr != null && k === corr && <PenCircle />}
              </button>
            );
          })}
        </div>
      )}

      {q.qtype === 'matching' && (
        <>
          {!imgOnly && opts.length > 0 && (
            <div className="optlist">{opts.map(([k, t]) => <div key={k}><b>{k})</b> {t}</div>)}</div>
          )}
          <div className="match">
            {Object.entries(q.tasks || { 33: '', 34: '', 35: '' }).map(([n, t]) => (
              <div className="mrow" key={n}>
                <div className="mtask"><b>{n}.</b> {t}</div>
                <div className="mopts">
                  {'ABCDEF'.split('').map(L => {
                    let cls = '';
                    if (corr) { if (corr[n] === L) cls = 'ok'; else if (value?.[n] === L) cls = 'bad'; }
                    return <button key={L} className={cls} disabled={locked} aria-pressed={value?.[n] === L}
                      onClick={() => onChange?.({ ...(value || {}), [n]: L })}>{L}</button>;
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {(q.qtype === 'open' || q.qtype === 'open2') && (
        <div className="stack" style={{ marginTop: 16 }}>
          {(q.qtype === 'open2' ? ['a', 'b'] : ['a']).map((k, i) => {
            const part = value?.parts?.[i] || { text: '' };
            const label = q.qtype === 'open2' ? (q.tasks?.[k] || '') : (q.unit_hint ? `Javob (${q.unit_hint})` : 'Javob');
            const right = corr?.parts?.[i];
            return (
              <div className="field" key={k}>
                {q.qtype === 'open2' ? <p className="math" style={{ fontSize: 17 }}><b>{k})</b> {label}</p> : <label htmlFor={'ans' + q.id}>{label}</label>}
                <input id={'ans' + q.id + k} className="input math" inputMode="decimal" autoComplete="off" disabled={locked}
                  placeholder="Masalan: 12,5 yoki 40/3 yoki 2·10^-3" value={part.text}
                  onChange={e => {
                    const parts = [...(value?.parts || [])];
                    parts[i] = { text: e.target.value, num: parseNumber(e.target.value) };
                    onChange?.({ parts });
                  }} />
                {part.text && part.num != null && !locked && <span className="small muted">Hisoblandi: {fmtNum(part.num)}</span>}
                {right && <span className="small">To‘g‘ri javob: <b className="math">{right.text}</b></span>}
              </div>
            );
          })}
        </div>
      )}
      {reveal && q.qtype !== 'mc' && q.qtype !== 'open' && q.qtype !== 'open2' && corr && <p className="small" style={{ marginTop: 10 }}>To‘g‘ri javob: <b>{answerText({ ...q, answer: corr })}</b></p>}
    </div>
  );
}

export function hasAnswer(q, v) {
  if (v == null) return false;
  if (q.qtype === 'mc') return !!v;
  if (q.qtype === 'matching') return Object.keys(q.tasks || { 33: 1, 34: 1, 35: 1 }).every(k => v[k]);
  return (v.parts || []).some(p => p?.text?.trim());
}
