// «Ish kuni dalolatnomasi» — chop etishga mos mustaqil HTML sahifa
import { fmtNum, fmtSom, fmtClock } from '../util.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function buildReportHtml(app, r) {
  const t = app.t;
  const g = app.game;
  const d = new Date();
  const date = d.toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' });
  const cats = ['diagnosis', 'safety', 'time', 'cost'];
  const rows = r.tasks.map((x) => `<tr><td>${esc(x.id)}</td><td>${esc(x.title)}</td><td>${esc(t('task.status.' + x.status))}</td><td>${x.minutes}</td><td>${x.status === 'done' || x.status === 'failed' ? fmtNum(x.total, 0) : '—'}</td></tr>`).join('');
  const catRows = cats.map((c) => `<tr><td>${esc(t('cat.' + c))}</td><td>${r.cats[c].pct == null ? '—' : fmtNum(r.cats[c].value, 1) + ' / ' + r.cats[c].max}</td><td>${r.cats[c].pct == null ? '—' : fmtNum(r.cats[c].pct, 0) + ' %'}</td></tr>`).join('');
  const mistakes = r.mistakes.length
    ? '<ul>' + r.mistakes.map((m) => `<li><b>${esc(m.taskId)}</b> — ${esc(m.text)}${m.tip ? `<br><i>${esc(m.tip)}</i>` : ''}</li>`).join('') + '</ul>'
    : `<p>${esc(t('fin.noMistakes'))}</p>`;
  const ach = r.achievements.length ? '<ul>' + r.achievements.map((a) => `<li>🏅 <b>${esc(t('ach.' + a + '.n'))}</b> — ${esc(t('ach.' + a + '.d'))}</li>`).join('') + '</ul>' : `<p>${esc(t('fin.noAch'))}</p>`;
  const clk = fmtClock(r.t, g.cfg.clock.startHour);
  return `<!doctype html><html lang="uz"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(t('rep.docTitle'))}</title>
<style>
body{font:15px/1.5 system-ui,Segoe UI,Arial,sans-serif;color:#111;max-width:820px;margin:24px auto;padding:0 18px}
h1{font-size:22px;margin:0 0 4px}h2{font-size:17px;margin:22px 0 6px;border-bottom:1px solid #999;padding-bottom:3px}
table{border-collapse:collapse;width:100%;margin:6px 0}td,th{border:1px solid #bbb;padding:5px 8px;text-align:left;vertical-align:top}th{background:#eee}
.big{font-size:34px;font-weight:700}.meta{color:#444}.disc{font-size:12px;color:#555;border-top:1px solid #aaa;margin-top:24px;padding-top:8px}
.sig{display:flex;gap:40px;margin-top:34px}.sig div{flex:1;border-top:1px solid #333;padding-top:4px;font-size:13px}
@media print{body{margin:0}button{display:none}}
</style></head><body>
<button onclick="window.print()">${esc(t('fin.print'))}</button>
<h1>${esc(t('rep.docTitle'))}</h1>
<div class="meta">${esc(g.cfg.plant.name)} · ${esc(date)} · ${esc(t('top.day', { n: r.day }))} ${clk.text} · ${esc(t('setup.d.' + g.state.difficulty))} · ${esc(t('setup.m.' + g.state.mode))}</div>
<h2>${esc(t('rep.result'))}</h2>
<div><span class="big">${fmtNum(r.total, 0)}</span> / 100 — <b>${esc(t('rank.' + r.rank))}</b></div>
<table><tr><th>${esc(t('fin.category'))}</th><th>${esc(t('fin.points'))}</th><th>%</th></tr>${catRows}</table>
<table><tr><td>${esc(t('fin.weighted'))}</td><td>${fmtNum(r.weighted, 1)}</td></tr>
<tr><td>${esc(t('fin.priority'))}</td><td>${r.priority == null ? '—' : '+' + fmtNum(r.bonus, 1)}</td></tr>
<tr><td>${esc(t('fin.emerg'))}</td><td>${r.emPenalty ? '−' + fmtNum(r.emPenalty, 1) : '0'}</td></tr>
<tr><td>${esc(t('fin.accidents'))}</td><td>${r.accidents}</td></tr>
<tr><td>${esc(t('fin.loss'))}</td><td>${esc(fmtSom(r.money.loss))}</td></tr>
<tr><td>${esc(t('fin.spent'))}</td><td>${esc(fmtSom(r.money.spent))}</td></tr></table>
<h2>${esc(t('fin.tasks'))}</h2>
<table><tr><th></th><th>${esc(t('fin.task'))}</th><th>${esc(t('fin.status'))}</th><th>${esc(t('fin.min'))}</th><th>${esc(t('fin.score'))}</th></tr>${rows}</table>
<h2>${esc(t('fin.mistakes'))}</h2>${mistakes}
<h2>${esc(t('fin.achievements'))}</h2>${ach}
<div class="sig"><div>${esc(t('rep.sigEng'))}</div><div>${esc(t('rep.sigChief'))}</div></div>
<p class="disc">${esc(t('app.disclaimer'))}</p>
</body></html>`;
}

export function openReportWindow(app, r) {
  const html = buildReportHtml(app, r);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank');
  if (!w) {
    app.toast(app.t('rep.popup'), 'warn');
    downloadReport(app, r);
  } else setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export function downloadReport(app, r) {
  const html = buildReportHtml(app, r);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ish-kuni-dalolatnomasi.html';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}
