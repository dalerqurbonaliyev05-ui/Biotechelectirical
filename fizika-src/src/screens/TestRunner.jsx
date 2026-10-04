import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import Question, { hasAnswer } from '../components/Question.jsx';
import { Icon, Modal, Spinner, useToast } from '../components/ui.jsx';
import Results from './Results.jsx';

const OK_WORDS = ['Barakalla!', 'To‘g‘ri!', 'Zo‘r!', 'Aynan shunday!', 'Ajoyib!'];
const BAD_WORDS = ['Xato', 'Unday emas', 'Yana bir urinib ko‘ring keyingisida'];

export default function TestRunner({ spec, onExit, onDone }) {
  const toast = useToast();
  const [test, setTest] = useState(null);
  const [err, setErr] = useState(null);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [fb, setFb] = useState({}); // qid -> feedback
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [report, setReport] = useState(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [left, setLeft] = useState(null);
  const started = useRef(Date.now());
  const saveT = useRef(null);

  useEffect(() => {
    let live = true;
    api.startTest(spec).then(t => { if (live) { setTest(t); if (t.time_limit_min) setLeft(t.time_limit_min * 60); } }).catch(e => live && setErr(e.message));
    return () => { live = false; };
  }, [spec]);

  useEffect(() => {
    if (left == null || result) return;
    if (left <= 0) { finish(); return; }
    const t = setTimeout(() => setLeft(l => l - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, result]);

  const qs = test?.questions || [];
  const q = qs[idx];
  const instant = test?.instant_feedback;
  const answeredCount = useMemo(() => qs.filter(x => hasAnswer(x, answers[x.id])).length, [qs, answers]);

  async function check() {
    if (!hasAnswer(q, answers[q.id])) return;
    setBusy(true);
    try {
      const r = await api.answer(test.attempt_id, q.id, answers[q.id]);
      setFb(f => ({ ...f, [q.id]: r }));
    } catch (e) { toast(e.message); }
    setBusy(false);
  }
  async function saveCurrent(v) {
    setAnswers(a => ({ ...a, [q.id]: v }));
    if (!instant) {
      clearTimeout(saveT.current);
      saveT.current = setTimeout(() => api.answer(test.attempt_id, q.id, v).catch(() => {}), q.qtype.startsWith('open') ? 600 : 0);
    }
  }
  function next() {
    if (idx + 1 < qs.length) setIdx(idx + 1);
    else finish();
  }
  async function finish() {
    setBusy(true); setConfirmEnd(false);
    try {
      // milliy rejimida oxirgi javoblar saqlanganiga ishonch hosil qilamiz
      if (!instant) await Promise.all(qs.filter(x => hasAnswer(x, answers[x.id])).map(x => api.answer(test.attempt_id, x.id, answers[x.id]).catch(() => {})));
      const r = await api.finish(test.attempt_id);
      r.seconds = Math.round((Date.now() - started.current) / 1000);
      setResult(r); onDone?.();
    } catch (e) { toast(e.message); }
    setBusy(false);
  }
  async function sendReport() {
    try { await api.report(report.q.id, report.text); toast('Xabar adminga yuborildi'); setReport(null); } catch (e) { toast(e.message); }
  }

  if (err) return (
    <div className="page"><div className="empty sheet"><h2>Test ochilmadi</h2><p className="muted">{err}</p><button className="btn" onClick={onExit}>Orqaga qaytish</button></div></div>
  );
  if (!test) return <div className="page"><Spinner /></div>;
  if (result) return <Results result={result} questions={qs} onExit={onExit} onRetry={() => { setResult(null); setTest(null); setIdx(0); setAnswers({}); setFb({}); api.startTest(spec).then(setTest); }} />;

  const f = fb[q.id];
  const mm = left != null ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : null;

  return (
    <div className="page runner">
      <div className="qhead">
        <button className="iconbtn" aria-label="Testni to‘xtatish" onClick={() => (answeredCount ? setConfirmEnd('exit') : onExit())}><Icon.close /></button>
        <div className="qprog" aria-label={`${idx + 1} / ${qs.length}`}><i style={{ width: `${(100 * (instant ? Object.keys(fb).length : answeredCount)) / qs.length}%` }} /></div>
        <span className="small" style={{ fontWeight: 800 }}>{idx + 1}/{qs.length}</span>
        {mm && <span className={'chip timer' + (left < 600 ? ' low' : '')}>⏱ {mm}</span>}
      </div>
      <p className="small muted" style={{ marginBottom: 8 }}>{test.title}</p>

      <Question q={q} value={answers[q.id]} onChange={saveCurrent} locked={!!f} reveal={f ? { answer: f.answer } : null} />

      <div className="row" style={{ justifyContent: 'space-between', marginTop: 10 }}>
        <button className="btn ghost small" onClick={() => setReport({ q, text: '' })}><Icon.flag /> Xato bormi?</button>
        {!instant && <span className="small muted">Javob berilgan: {answeredCount}/{qs.length}</span>}
      </div>

      {!instant && (
        <div className="sheet flat" style={{ marginTop: 16 }}>
          <p className="lbl" style={{ marginBottom: 8 }}>Savollar</p>
          <div className="qgrid">
            {qs.map((x, i) => <button key={x.id} className={(hasAnswer(x, answers[x.id]) ? 'done ' : '') + (i === idx ? 'cur' : '')} onClick={() => setIdx(i)}>{i + 1}</button>)}
          </div>
        </div>
      )}

      {f ? (
        <div className={'feedback ' + (f.correct ? 'ok' : 'bad')} role="status">
          <div className="in">
            <div className="verdict">{f.correct ? OK_WORDS[q.id % OK_WORDS.length] : (f.points > 0 ? `Qisman to‘g‘ri (${Math.round(f.points * 100)}%)` : BAD_WORDS[q.id % BAD_WORDS.length])}</div>
            {f.explanation && <p className="math">{f.explanation}</p>}
            <button className={'btn block ' + (f.correct ? 'green' : 'red')} onClick={next} disabled={busy}>{idx + 1 < qs.length ? 'Davom etish' : 'Natijani ko‘rish'}</button>
          </div>
        </div>
      ) : (
        <div className="actionbar">
          <div className="in">
            {instant ? (
              <button className="btn block" disabled={!hasAnswer(q, answers[q.id]) || busy} onClick={check}>Tekshirish</button>
            ) : (
              <>
                <button className="btn ghost" disabled={idx === 0} onClick={() => setIdx(idx - 1)} aria-label="Oldingi savol"><Icon.back /></button>
                {idx + 1 < qs.length ? <button className="btn block" onClick={() => setIdx(idx + 1)}>Keyingi savol</button>
                  : <button className="btn block red" onClick={() => setConfirmEnd('finish')}>Testni yakunlash</button>}
              </>
            )}
          </div>
        </div>
      )}

      {confirmEnd && (
        <Modal onClose={() => setConfirmEnd(false)} label="Tasdiqlash">
          <div className="stack">
            <h2>{confirmEnd === 'exit' ? 'Testni to‘xtatasizmi?' : 'Testni yakunlaysizmi?'}</h2>
            <p className="muted">{confirmEnd === 'exit' ? 'Hozirgacha bergan javoblaringiz bo‘yicha natija hisoblanadi.' : `${qs.length - answeredCount} ta savolga javob berilmagan.`}</p>
            <button className="btn red block" onClick={finish} disabled={busy}>Yakunlash va natijani ko‘rish</button>
            {confirmEnd === 'exit' && <button className="btn ghost block" onClick={onExit}>Natijasiz chiqish</button>}
            <button className="btn ghost block" onClick={() => setConfirmEnd(false)}>Davom etish</button>
          </div>
        </Modal>
      )}
      {report && (
        <Modal onClose={() => setReport(null)} label="Xato haqida xabar">
          <div className="stack">
            <h2>Savolda xato bormi?</h2>
            <p className="muted small">Savol #{report.q.id}. Nimasi noto‘g‘ri ekanini yozing — admin tekshirib tuzatadi.</p>
            <textarea className="input" value={report.text} onChange={e => setReport({ ...report, text: e.target.value })} placeholder="Masalan: to‘g‘ri javob C bo‘lishi kerak, chunki…" />
            <button className="btn block" disabled={!report.text.trim()} onClick={sendReport}>Xabarni yuborish</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
