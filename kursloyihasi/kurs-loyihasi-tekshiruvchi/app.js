/*
 * app.js — interfeys: ma'lumotlarni yuklash, kirishni yig'ish, natijalarni ko'rsatish, DOCX yuklab olish.
 */
(function () {
  'use strict';

  const C = window.KursCalc;
  const fmt = C.fmt;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  const LINE_LABEL = { 'HL-1': 'A ga', 'HL-2': 'C ga', 'HL-3': 'B ga', 'HL-4': 'D ga', 'HL-5': 'E ga', 'HL-6': 'sistemaga' };
  // SPEC.md dagi test misoli (daler_2.docx)
  const SAMPLE = {
    schema: 6,
    pst: {
      A: { P: 105, kat: 1, cos: 0.9, W: 600 },
      B: { P: 48, kat: 3, cos: 0.85, W: 240 },
      C: { P: 65, kat: 1, cos: 0.85, W: 320 },
      D: { P: 68, kat: 1, cos: 0.9, W: 340 },
      E: { P: 50, kat: 2, cos: 0.92, W: 260 }
    },
    lengths: { 'HL-1': 90, 'HL-2': 60, 'HL-3': 90, 'HL-4': 80, 'HL-5': 70, 'HL-6': 150 }
  };
  const STORE_KEY = 'kurs-tekshiruvchi-v2';
  const SETTING_IDS = ['opt-kxus', 'opt-dptar', 'opt-line2', 'opt-tr2', 'opt-kI', 'opt-k2', 'opt-k1', 'opt-down', 'opt-costie', 'opt-ubus'];

  let DATA = null;
  let lastResult = null;
  let variantModified = false;

  // ------------------------------------------------------------------ ma'lumot yuklash
  async function loadData() {
    const files = {
      wires: 'data/wires.json',
      transformers: 'data/transformers.json',
      regulation: 'data/voltage-regulation.json',
      tau: 'data/tm-tau-table.json',
      schemas: 'data/schemas.json'
    };
    if (location.protocol.startsWith('http')) {
      try {
        const entries = await Promise.all(Object.entries(files).map(async ([k, url]) => {
          const r = await fetch(url, { cache: 'no-cache' });
          if (!r.ok) throw new Error(url + ': ' + r.status);
          return [k, await r.json()];
        }));
        return Object.fromEntries(entries);
      } catch (e) {
        console.warn('JSON fetch ishlamadi, data-bundle.js ishlatiladi:', e);
      }
    }
    if (window.KURS_DATA) return window.KURS_DATA;
    throw new Error("Ma'lumotlar yuklanmadi: data/*.json yoki data/data-bundle.js topilmadi.");
  }

  // ------------------------------------------------------------------ mini-formula → HTML
  // "P_{t}^{2}" → P<sub>t</sub><sup>2</sup>
  function mathHtml(s) {
    return esc(s)
      .replace(/_\{([^}]*)\}/g, '<sub>$1</sub>')
      .replace(/\^\{([^}]*)\}/g, '<sup>$1</sup>');
  }
  const F = (s) => `<div class="formula">${mathHtml(s)}</div>`;

  // ------------------------------------------------------------------ forma qurish
  function buildForm() {
    const selS = $('sel-schema');
    selS.innerHTML = DATA.schemas.sxemalar.map((s) => {
      const has = !!DATA.schemas.variantlar['sxema_' + s.raqam];
      return `<option value="${s.raqam}">Sxema ${s.raqam} — ${esc(s.manba)} ${esc(s.manba_quvvati.replace(/x/g, '×'))}, cosφ=${s.cos_fi_manba}${has ? '' : ' (variantlar kiritilmagan)'}</option>`;
    }).join('');

    $('pst-body').innerHTML = C.PST.map((p) => `
      <tr data-pst="${p}">
        <td>${p}</td>
        <td><input type="number" step="any" min="0" class="form-control form-control-sm" data-f="P" aria-label="p/st ${p} P"></td>
        <td><select class="form-select form-select-sm" data-f="kat" aria-label="p/st ${p} kategoriya">
          <option value="1">I</option><option value="2">II</option><option value="3">III</option></select></td>
        <td><input type="number" step="0.01" min="0" max="1" class="form-control form-control-sm" data-f="cos" aria-label="p/st ${p} cosφ"></td>
        <td><input type="number" step="any" min="0" class="form-control form-control-sm" data-f="W" aria-label="p/st ${p} W"></td>
        <td class="tm-cell">—</td>
      </tr>`).join('');

    $('lengths-row').innerHTML = C.LINES.map((l) => `
      <div class="col-6 col-md-4 col-lg-2">
        <label class="form-label" for="len-${l.id}">${l.id} <span class="text-muted small">(${LINE_LABEL[l.id]})</span></label>
        <input id="len-${l.id}" type="number" step="any" min="0" class="form-control" data-line="${l.id}" placeholder="km">
      </div>`).join('');

    selS.addEventListener('change', () => { onSchemaChange(); save(); });
    $('sel-variant').addEventListener('change', () => { applyVariant(); save(); });
    $('pst-body').addEventListener('input', () => { variantModified = true; updateTm(); save(); });
    $('pst-body').addEventListener('change', () => { variantModified = true; save(); });
    $('lengths-row').addEventListener('input', save);
    $('inp-gens').addEventListener('input', () => { updateGensHint(); save(); });
    SETTING_IDS.concat(['inp-manba', 'inp-cosm', 'sel-unom', 'inp-student', 'inp-group', 'inp-teacher'])
      .forEach((id) => $(id).addEventListener('change', save));
  }

  function schemaByNum(n) { return DATA.schemas.sxemalar.find((s) => s.raqam === Number(n)); }
  function variantsOf(n) { return DATA.schemas.variantlar['sxema_' + n] || null; }

  function onSchemaChange(keepVariant) {
    const s = schemaByNum($('sel-schema').value);
    $('inp-manba').value = s.manba;
    $('inp-cosm').value = s.cos_fi_manba;
    $('inp-gens').value = s.manba_quvvati.replace(/\s*MVt/i, '');
    updateGensHint();
    const vars = variantsOf(s.raqam);
    const selV = $('sel-variant');
    const cur = keepVariant || selV.value;
    selV.innerHTML = ['B-1', 'B-2', 'B-3', 'B-4', 'B-5'].map((v) =>
      `<option value="${v}">${v}${vars && vars[v] ? '' : ' — qo\'lda kiritiladi'}</option>`).join('');
    if (cur && [...selV.options].some((o) => o.value === cur)) selV.value = cur;
    const warn = $('variant-warning');
    if (!vars) {
      warn.innerHTML = `<strong>Sxema ${s.raqam}</strong> uchun variant qiymatlari hali <code>data/schemas.json</code> ga kiritilmagan. ` +
        `p/st A–E qiymatlarini (P, kategoriya, cosφ, W) metodik qo'llanmaning 1-ilovasidan jadvalga qo'lda kiriting.`;
      warn.classList.remove('d-none');
    } else warn.classList.add('d-none');
    if (!keepVariant) applyVariant();
  }

  function applyVariant() {
    const vars = variantsOf($('sel-schema').value);
    const v = vars && vars[$('sel-variant').value];
    if (!v) return;
    C.PST.forEach((p) => setPst(p, v[p]));
    variantModified = false;
    updateTm();
    // PDF da o'qib bo'lmagan yoki shubhali qiymatlar haqida ogohlantirish
    const warn = $('variant-warning');
    const msgs = [];
    C.PST.forEach((p) => {
      const d = v[p];
      ['P', 'cos', 'W'].forEach((k) => { if (d[k] == null) msgs.push(`p/st ${p}: ${k === 'cos' ? 'cosφ' : k} jadvalda o'qilmaydi — qo'llanmadan aniqlab kiriting`); });
      if (d.P > 0 && d.W > 0 && d.W * 1000 / d.P > 8760) msgs.push(`p/st ${p}: T<sub>m</sub> = ${fmt.i(d.W * 1000 / d.P)} soat > 8760 — manba jadvalidagi qiymat shubhali, o'qituvchi bilan aniqlashtiring`);
    });
    if (msgs.length) {
      warn.innerHTML = '<b>Diqqat:</b><ul class="mb-0">' + msgs.map((m) => `<li>${m}</li>`).join('') + '</ul>';
      warn.classList.remove('d-none');
    } else warn.classList.add('d-none');
  }

  function setPst(p, d) {
    const row = document.querySelector(`#pst-body tr[data-pst="${p}"]`);
    row.querySelector('[data-f="P"]').value = d.P;
    row.querySelector('[data-f="kat"]').value = d.kat;
    row.querySelector('[data-f="cos"]').value = d.cos;
    row.querySelector('[data-f="W"]').value = d.W;
  }

  function updateTm() {
    document.querySelectorAll('#pst-body tr').forEach((row) => {
      const P = parseFloat(row.querySelector('[data-f="P"]').value);
      const W = parseFloat(row.querySelector('[data-f="W"]').value);
      const cell = row.querySelector('.tm-cell');
      const Tm = P > 0 && W > 0 ? W * 1000 / P : null;
      cell.textContent = Tm ? fmt.i(Tm) + (Tm > 8760 ? ' > 8760!' : '') : '—';
      cell.classList.toggle('text-danger', !!Tm && Tm > 8760);
      cell.classList.toggle('fw-bold', !!Tm && Tm > 8760);
    });
  }

  function updateGensHint() {
    const g = C.parseGenerators($('inp-gens').value);
    $('gens-hint').textContent = g.length
      ? `${g.length} ta generator, jami ${fmt.n(g.reduce((a, b) => a + b, 0), 0)} MVt`
      : 'Format: 3x100+2x50';
  }

  // ------------------------------------------------------------------ localStorage (faqat qulaylik uchun)
  function save() {
    try {
      const st = collectRaw();
      localStorage.setItem(STORE_KEY, JSON.stringify(st));
    } catch (e) { /* e'tiborsiz */ }
  }
  function collectRaw() {
    const pst = {};
    document.querySelectorAll('#pst-body tr').forEach((row) => {
      pst[row.dataset.pst] = {
        P: row.querySelector('[data-f="P"]').value,
        kat: row.querySelector('[data-f="kat"]').value,
        cos: row.querySelector('[data-f="cos"]').value,
        W: row.querySelector('[data-f="W"]').value
      };
    });
    const lengths = {};
    document.querySelectorAll('[data-line]').forEach((el) => { lengths[el.dataset.line] = el.value; });
    const vals = {};
    ['sel-schema', 'sel-variant', 'inp-manba', 'inp-cosm', 'inp-gens', 'sel-unom', 'inp-student', 'inp-group', 'inp-teacher']
      .concat(SETTING_IDS).forEach((id) => { vals[id] = $(id).value; });
    return { pst, lengths, vals, variantModified };
  }
  function restore() {
    let st = null;
    try { st = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) { st = null; }
    if (!st || !st.vals || !schemaByNum(st.vals['sel-schema'])) return false;
    $('sel-schema').value = st.vals['sel-schema'];
    onSchemaChange(st.vals['sel-variant']);
    Object.entries(st.vals).forEach(([id, v]) => {
      if ($(id) && id !== 'sel-schema' && id !== 'sel-variant') $(id).value = v;
    });
    C.PST.forEach((p) => st.pst && st.pst[p] && setPst(p, st.pst[p]));
    Object.entries(st.lengths || {}).forEach(([id, v]) => { const el = document.querySelector(`[data-line="${id}"]`); if (el) el.value = v; });
    variantModified = !!st.variantModified;
    updateTm(); updateGensHint();
    return true;
  }

  // ------------------------------------------------------------------ kirishni yig'ish
  function num(el) {
    const v = parseFloat(String(el.value).replace(',', '.'));
    return isNaN(v) ? NaN : v;
  }
  function collectInput() {
    document.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
    const pst = {};
    document.querySelectorAll('#pst-body tr').forEach((row) => {
      const d = {
        P: num(row.querySelector('[data-f="P"]')),
        kat: parseInt(row.querySelector('[data-f="kat"]').value, 10),
        cos: num(row.querySelector('[data-f="cos"]')),
        W: num(row.querySelector('[data-f="W"]'))
      };
      if (!(d.P > 0)) row.querySelector('[data-f="P"]').classList.add('is-invalid');
      if (!(d.cos > 0 && d.cos <= 1)) row.querySelector('[data-f="cos"]').classList.add('is-invalid');
      if (!(d.W > 0) || (d.P > 0 && d.W * 1000 / d.P > 8760)) row.querySelector('[data-f="W"]').classList.add('is-invalid');
      pst[row.dataset.pst] = d;
    });
    const lengths = {};
    document.querySelectorAll('[data-line]').forEach((el) => {
      lengths[el.dataset.line] = num(el);
      if (!(lengths[el.dataset.line] > 0)) el.classList.add('is-invalid');
    });
    const gens = C.parseGenerators($('inp-gens').value);
    if (!gens.length) $('inp-gens').classList.add('is-invalid');
    const cosM = num($('inp-cosm'));
    if (!(cosM > 0 && cosM <= 1)) $('inp-cosm').classList.add('is-invalid');
    const kx = $('opt-kxus').value.trim();
    const schema = schemaByNum($('sel-schema').value);
    return {
      schemaNum: schema.raqam,
      variant: $('sel-variant').value,
      variantModified,
      manba: $('inp-manba').value,
      generatorsText: $('inp-gens').value,
      generators: gens,
      cosManba: cosM,
      pst, lengths,
      U: $('sel-unom').value,
      opts: {
        kXusPct: kx === '' ? null : parseFloat(kx),
        dPtarPct: num($('opt-dptar')) >= 0 ? num($('opt-dptar')) : 8,
        lineKat2: parseInt($('opt-line2').value, 10),
        trafoKat2: parseInt($('opt-tr2').value, 10),
        kTrafoI: num($('opt-kI')) > 0 ? num($('opt-kI')) : 1.0,
        kTrafo2: num($('opt-k2')) > 0 ? num($('opt-k2')) : 0.7,
        kTrafo1: num($('opt-k1')) > 0 ? num($('opt-k1')) : 1.0,
        onlyStepDown: $('opt-down').value !== '0',
        cosTieMin: num($('opt-costie')) > 0 && num($('opt-costie')) <= 1 ? num($('opt-costie')) : 0.97,
        uBusCoef: num($('opt-ubus')) > 0 ? num($('opt-ubus')) : 1.1
      }
    };
  }

  // ------------------------------------------------------------------ jadval yordamchisi
  function table(head, rows, opts = {}) {
    const num = opts.num || [];
    const th = head.map((h, i) => `<th class="${num.includes(i) ? 'num' : ''}">${h}</th>`).join('');
    const tr = rows.map((r) => `<tr>${r.map((c, i) => `<td class="${num.includes(i) ? 'num' : ''}">${c}</td>`).join('')}</tr>`).join('');
    const tf = opts.foot ? `<tfoot><tr>${opts.foot.map((c, i) => `<td class="${num.includes(i) ? 'num' : ''}">${c}</td>`).join('')}</tr></tfoot>` : '';
    return `<div class="table-responsive"><table class="table table-sm table-bordered res-table"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody>${tf}</table></div>`;
  }
  const tag = (ok, yes = 'bajariladi', no = 'bajarilmaydi') => `<span class="tag ${ok ? 'tag-ok' : 'tag-bad'}">${ok ? '✓ ' + yes : '✗ ' + no}</span>`;
  const n2 = (x) => fmt.n(x, 2);
  const cx = (s) => fmt.c(s.p, s.q);
  const wireName = (l) => (l.n === 2 ? '2×' : '') + l.wire.marka;
  const trName = (t) => (t.n === 2 ? '2×' : '') + t.marka;

  // ------------------------------------------------------------------ SVG chizmalar
  const COL = { s1: '#2a78d6', s2: '#eb6834', s3: '#1baf7a', s4: '#eda100', ink: '#16202c', ink2: '#4b5563', ink3: '#8a93a0', grid: '#e3e7ed', band: '#dff2e6', good: '#1a8a4a', bad: '#c62828', surface: '#ffffff' };

  function balanceSvg(r) {
    const b = r.balance;
    const W = 720, H = 130, x0 = 90, x1 = W - 90;
    const demand = b.sumP + b.P_xus + b.dP_tar;
    const max = Math.max(demand, b.P_st) * 1.02;
    const sx = (v) => (x1 - x0) * v / max;
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Aktiv quvvat balansi">`;
    const bar = (y, parts, name, total) => {
      let x = x0, out = `<text x="${x0 - 8}" y="${y + 17}" text-anchor="end" font-size="12" fill="${COL.ink2}">${name}</text>`;
      parts.forEach((p, i) => {
        const w = Math.max(0, sx(p.v) - (i < parts.length - 1 ? 2 : 0));
        out += `<rect x="${x}" y="${y}" width="${w}" height="26" rx="${i === parts.length - 1 ? 4 : 0}" fill="${p.c}"><title>${p.n}: ${fmt.n(p.v)} MVt</title></rect>`;
        x += sx(p.v);
      });
      out += `<text x="${x + 8}" y="${y + 17}" font-size="12" font-weight="700" fill="${COL.ink}">${fmt.n(total, 1)} MVt</text>`;
      return out;
    };
    s += bar(14, [{ v: b.sumP, c: COL.s1, n: 'ΣP yuklama' }, { v: b.P_xus, c: COL.s2, n: 'P xususiy ehtiyoj' }, { v: b.dP_tar, c: COL.s3, n: 'ΔP tarmoq' }], 'Talab', demand);
    s += bar(58, [{ v: b.P_st, c: COL.ink3, n: 'Stansiya quvvati' }], 'Stansiya', b.P_st);
    s += `<text x="${x0}" y="${H - 16}" font-size="12" fill="${b.P_rez >= 0 ? COL.good : COL.bad}" font-weight="600">${b.P_rez >= 0 ? 'Ortiqcha quvvat sistemaga: ' : 'Yetishmovchilik (sistemadan olinadi): '}${fmt.n(Math.abs(b.P_rez))} MVt</text>`;
    s += '</svg>';
    return `<figure class="chart-wrap"><div class="chart-legend"><span><i style="background:${COL.s1}"></i>ΣP yuklama</span><span><i style="background:${COL.s2}"></i>P<sub>xus</sub></span><span><i style="background:${COL.s3}"></i>ΔP<sub>tar</sub></span><span><i style="background:${COL.ink3}"></i>Stansiya</span></div>${s}</figure>`;
  }

  function lossesSvg(r) {
    const items = [];
    C.LINES.forEach((l) => {
      if (l.pst) items.push({ n: l.id, v: r.chains[l.pst].dPl });
      else items.push({ n: 'HL-6', v: r.station.max.dP6 });
    });
    C.PST.forEach((p) => items.push({ n: 'T-' + p, v: r.chains[p].dPt + r.chains[p].dPx }));
    items.push({ n: "Ko'tar. T", v: r.station.max.dPup });
    const W = 720, rowH = 22, H = items.length * rowH + 10, x0 = 80, x1 = W - 70;
    const max = Math.max(...items.map((i) => i.v)) || 1;
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Elementlardagi aktiv quvvat isrofi">`;
    items.forEach((it, i) => {
      const y = 4 + i * rowH, w = Math.max(1, (x1 - x0) * it.v / max);
      s += `<text x="${x0 - 8}" y="${y + 13}" text-anchor="end" font-size="11" fill="${COL.ink2}">${esc(it.n)}</text>`;
      s += `<rect x="${x0}" y="${y + 2}" width="${w}" height="14" rx="3" fill="${COL.s1}"><title>${esc(it.n)}: ΔP = ${fmt.n(it.v, 3)} MVt</title></rect>`;
      s += `<text x="${x0 + w + 6}" y="${y + 13}" font-size="11" fill="${COL.ink}">${fmt.n(it.v, 3)}</text>`;
    });
    s += '</svg>';
    return `<figure class="chart-wrap">${s}<figcaption>Maksimal rejimda elementlardagi aktiv quvvat isrofi, MVt</figcaption></figure>`;
  }

  function voltageSvg(r) {
    const W = 720, rowH = 40, top = 26, H = top + r.volt.length * rowH + 26, x0 = 70, x1 = W - 20;
    const vals = r.volt.flatMap((v) => [v.U0, v.tap.Upk, v.lo, v.hi]);
    const lo = Math.floor(Math.min(...vals) * 2) / 2 - 0.25, hi = Math.ceil(Math.max(...vals) * 2) / 2 + 0.25;
    const sx = (u) => x0 + (x1 - x0) * (u - lo) / (hi - lo);
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="PK tarafidagi kuchlanishlar">`;
    for (let u = Math.ceil(lo * 2) / 2; u <= hi; u += 0.5) {
      s += `<line x1="${sx(u)}" y1="${top - 6}" x2="${sx(u)}" y2="${H - 22}" stroke="${COL.grid}"/>`;
      s += `<text x="${sx(u)}" y="${H - 6}" text-anchor="middle" font-size="10" fill="${COL.ink3}">${u.toFixed(1)}</text>`;
    }
    r.volt.forEach((v, i) => {
      const cy = top + i * rowH + rowH / 2;
      s += `<rect x="${sx(v.lo)}" y="${cy - 11}" width="${sx(v.hi) - sx(v.lo)}" height="22" rx="4" fill="${COL.band}"><title>Ruxsat etilgan oraliq: ${fmt.n(v.lo)}–${fmt.n(v.hi)} kV</title></rect>`;
      s += `<text x="${x0 - 10}" y="${cy + 4}" text-anchor="end" font-size="12" font-weight="600" fill="${COL.ink}">p/st ${v.pst}</text>`;
      s += `<line x1="${sx(v.U0)}" y1="${cy}" x2="${sx(v.tap.Upk)}" y2="${cy}" stroke="${COL.ink3}" stroke-width="1.5" stroke-dasharray="3 3"/>`;
      s += `<circle cx="${sx(v.U0)}" cy="${cy}" r="6" fill="#ffffff" stroke="${COL.s2}" stroke-width="2"><title>RPN siz: ${fmt.n(v.U0)} kV</title></circle>`;
      s += `<circle cx="${sx(v.tap.Upk)}" cy="${cy}" r="6" fill="${COL.s1}" stroke="#ffffff" stroke-width="2"><title>RPN ${v.tap.pct > 0 ? '+' : ''}${v.tap.pct}%: ${fmt.n(v.tap.Upk)} kV</title></circle>`;
    });
    s += `<text x="${x1}" y="14" text-anchor="end" font-size="10" fill="${COL.ink3}">U_PK, kV</text>`;
    s += '</svg>';
    return `<figure class="chart-wrap"><div class="chart-legend"><span><i style="background:#fff;border:2px solid ${COL.s2};border-radius:50%"></i>RPN siz (0 shahobcha)</span><span><i style="background:${COL.s1};border-radius:50%"></i>Tanlangan RPN shahobchasi bilan</span><span><i style="background:${COL.band}"></i>Ruxsat etilgan ±5% oraliq</span></div>${s}</figure>`;
  }

  // ------------------------------------------------------------------ natijalarni chizish
  function stat(lbl, val, unit) {
    return `<div class="stat"><div class="lbl">${lbl}</div><div class="val">${val} <span class="unit">${unit || ''}</span></div></div>`;
  }

  function render(r) {
    const b = r.balance;
    $('summary').innerHTML =
      stat('Nominal kuchlanish', r.U, 'kV') +
      stat('ΣP yuklama', fmt.n(b.sumP, 1), 'MVt') +
      stat('Quvvat isrofi ΔP', fmt.n(r.lossTotals.dP), `MVt (${fmt.n(r.lossTotals.pct)}%)`) +
      stat('Energiya isrofi ΔW', fmt.i(r.energy.dW), `MVt·soat (${fmt.n(r.energy.pct)}%)`) +
      stat('HL-6 oqimi', fmt.n(r.station.max.S6.p, 1), `MVt, cosφ=${fmt.n(r.station.max.cos6)}`) +
      stat('Uzatish FIK', fmt.n(r.efficiency.eta, 1), '%');

    let h = '';
    const kx = (b.kx * 100).toFixed(1).replace(/\.0$/, '');

    // ---- 1. balans
    h += `<section class="res-section"><h3>1. Aktiv va reaktiv quvvat balansi</h3>`;
    h += balanceSvg(r);
    h += table(['Kattalik', 'Formula', 'Qiymat'], [
      ['ΣP<sub>yuk</sub>', 'P<sub>A</sub>+P<sub>B</sub>+P<sub>C</sub>+P<sub>D</sub>+P<sub>E</sub>', `${n2(b.sumP)} MVt`],
      ['P<sub>xus</sub>', `ΣP<sub>gen</sub>·${kx}%`, `${n2(b.P_xus)} MVt`],
      ['ΔP<sub>tar</sub>', `${r.opts.dPtarPct}%·ΣP<sub>yuk</sub>`, `${n2(b.dP_tar)} MVt`],
      ['ΣP<sub>stansiya</sub>', r.gens.join('+'), `${n2(b.P_st)} MVt`],
      ['P<sub>rez</sub>', 'ΣP<sub>st</sub> − (ΣP<sub>yuk</sub>+P<sub>xus</sub>+ΔP<sub>tar</sub>)', `<b>${n2(b.P_rez)} MVt</b>`],
      ['ΣQ<sub>yuk</sub>', 'Σ P<sub>i</sub>·tgφ<sub>i</sub>', `${n2(b.sumQ)} MVAr`],
      ['Q<sub>xus</sub>', 'P<sub>xus</sub>·tgφ<sub>manba</sub>', `${n2(b.Q_xus)} MVAr`],
      ['ΔQ<sub>po\'l</sub>', `${r.opts.dQpulPct}%·ΣP<sub>yuk</sub> (transformatorlar o'zagi)`, `${n2(b.dQ_pul)} MVAr`],
      ['ΔQ<sub>M</sub>', '3·ΔP<sub>tar</sub> (liniya va cho\'lg\'amlar)', `${n2(b.dQ_M)} MVAr`],
      ['ΔQ<sub>tar</sub>', 'ΔQ<sub>po\'l</sub> + ΔQ<sub>M</sub>', `${n2(b.dQ_tar)} MVAr`],
      ['Q<sub>zar</sub>', `${b.qkm}·Σ(l·n) = ${b.qkm}·${fmt.n(b.sumLn, 0)}`, `${n2(b.Q_zar)} MVAr`],
      ['Q<sub>gen</sub>', `P<sub>st</sub>·tgφ<sub>manba</sub> (tgφ = ${fmt.n(b.tgM, 3)})`, `${n2(b.Q_gen)} MVAr`],
      ['Q<sub>rez</sub>', 'Q<sub>gen</sub>+Q<sub>zar</sub>−ΣQ<sub>yuk</sub>−Q<sub>xus</sub>−ΔQ<sub>tar</sub>', `<b>${n2(b.Q_rez)} MVAr</b>`]
    ], { num: [2] });
    if (b.compensation) {
      h += `<div class="note warn"><b>Reaktiv quvvat yetishmaydi</b> (${n2(b.compensation.Qdef)} MVAr). Qo'llanma 3.3 ga ko'ra uni sistemadan olish iqtisodiy emas — podstansiyalarning PK tomonida kompensatsiya qurilmalari o'rnatiladi (Q<sub>i</sub> ga proporsional, ${esc(b.compensation.unit.marka)} ${b.compensation.unit.Q_MVAr} MVAr): ` +
        b.compensation.perPst.map((c) => `${c.pst}: ${n2(c.Qk)} MVAr (${c.count} dona)`).join('; ') + '. Bu qurilmalar keyingi hisobda hisobga olinadi.</div>';
    } else {
      h += `<div class="note">Q<sub>rez</sub> = ${n2(b.Q_rez)} MVAr &gt; 0 — reaktiv quvvat ortiqcha. Qo'llanma 3.3 ga ko'ra bunda stansiyada reaktiv quvvat ishlab chiqarish kamaytiriladi (generator cosφ i ko'tariladi) — aniq qiymat 5-bo'limda HL-6 cosφ ≥ ${r.opts.cosTieMin} sharti bo'yicha aniqlanadi.</div>`;
    }
    h += '</section>';

    // ---- 2. kuchlanish
    h += `<section class="res-section"><h3>2. Nominal kuchlanishni tanlash</h3>`;
    h += F('U_{hisob} = 4.34·√(l + 0.016·P),  kV   (P — bir zanjir quvvati, kVt)');
    h += table(['Liniya', 'l, km', 'n', 'P, MVt', 'P/n, MVt', 'U<sub>hisob</sub>, kV', 'Yaqin standart, kV'],
      r.voltage.map((v) => [v.id + (v.pst ? ` (${v.pst})` : ' (sistema)'), fmt.n(v.l, 0), v.n, n2(v.Ptot), n2(v.P), n2(v.Uh), v.Ustd]), { num: [1, 2, 3, 4, 5, 6] });
    h += `<div class="note">Formula bo'yicha tavsiya: <b>${r.U_rec} kV</b>. Hisobda qabul qilingan: <b>${r.U} kV</b>${r.input.U === 'auto' ? ' (avtomatik)' : ''}.</div>`;
    if (r.autoRaised) {
      h += `<div class="note warn">${r.autoRaised.from.join(', ')} kV da sim yoki transformator tanlab bo'lmadi («${esc(r.autoRaised.reason)}»). Qo'llanma 5.2 ga ko'ra nominal kuchlanish <b>${r.U} kV</b> gacha oshirildi.</div>`;
    }
    h += '</section>';

    // ---- 3. simlar
    h += `<section class="res-section"><h3>3. Liniya simlarini tanlash</h3>`;
    h += `<p class="lead-note">Prinsipial va ekvivalent almashtiruv sxemalari quyidagi alohida kartalarda (1-rasm va 2-rasm).</p>`;
    h += F('I_{max} = S·10^{3} / (√3·U_{nom}·n),   F_{hisob} = I_{max} / j_{iqt},   I_{av} = S·10^{3} / (√3·U_{nom})');
    h += table(['Liniya', 'n', 'S, MVA', 'T<sub>m</sub>, soat', 'j, A/mm²', 'I<sub>max</sub>, A', 'F<sub>hisob</sub>, mm²', 'Sim', 'I<sub>av</sub>, A', 'I<sub>ruh</sub>, A', 'Qizish'],
      r.lines.map((l) => [l.id, l.n, n2(l.S), fmt.i(l.Tm), l.j, fmt.i(l.I_max), fmt.n(l.F_calc, 1),
        `<span class="hl">${wireName(l)}</span>${l.increasedForHeating ? ' <span class="tag tag-warn">qizish bo\'yicha kattalashtirildi</span>' : ''}`,
        fmt.i(l.I_heat), l.wire.Iruh, tag(l.heatOk, 'OK', "yo'q")]), { num: [1, 2, 3, 4, 5, 6, 8, 9] });
    h += '<h4>Liniya parametrlari</h4>';
    h += F('R = r_{0}·l / n,   X = x_{0}·l / n,   Q_{c} = q_{0}·l·n');
    h += table(['Liniya', 'Sim', 'l, km', 'r<sub>0</sub>, Om/km', 'x<sub>0</sub>, Om/km', 'q<sub>0</sub>, MVAr/km', 'R, Om', 'X, Om', 'Q<sub>c</sub>, MVAr'],
      r.lines.map((l) => [l.id, wireName(l), fmt.n(l.l, 0), fmt.n(l.wire.r0, 3), fmt.n(l.wire.x0, 3), fmt.n(l.wire.q0, 4), n2(l.R), n2(l.X), n2(l.Qc)]),
      { num: [2, 3, 4, 5, 6, 7, 8] });
    const m6 = r.lines.find((l) => l.id === 'HL-6').modes;
    h += `<div class="note">HL-6 (sistema bilan bog'lovchi) oqimlari stansiya shinasi balansidan (5-bo'lim): maksimal ${n2(m6.Smax)} MVA, minimal (yuklamalar ${r.opts.minLoadFactor * 100}%) ${n2(m6.Smin)} MVA, avariyadan keyingi (eng katta generator o'chgan, II–III kat. yuklamalar ${r.opts.avLoadFactor * 100}%) ${n2(m6.Sav)} MVA. Qo'llanma 5.2 ga ko'ra kesim maksimal rejim bo'yicha (T = ${r.opts.tieTm} soat) tanlanib, qizishga tekshirildi: maksimal rejimda bitta zanjir o'chganda, minimal va avariya rejimlarida ikki zanjir bilan.</div>`;
    h += '</section>';

    // ---- 4. transformatorlar
    h += `<section class="res-section"><h3>4. Transformatorlarni tanlash</h3>`;
    h += F(`I kat.: 2 ta, S_{n} ≥ ${r.opts.kTrafoI}·S;   II kat.: ${r.opts.trafoKat2} ta, S_{n} ≥ ${r.opts.trafoKat2 === 2 ? r.opts.kTrafo2 : r.opts.kTrafo1}·S;   III kat.: S < ${r.opts.kat3OneMax} MVA — 1 ta, S_{n} ≥ ${r.opts.kTrafo1}·S`);
    h += table(['p/st', 'Kat.', 'S, MVA', 'n', 'S<sub>talab</sub>, MVA', 'Transformator', 'k<sub>yuk</sub>', 'k<sub>av</sub>', 'R<sub>t</sub>, Om', 'X<sub>t</sub>, Om', 'ΔP<sub>x</sub>, kVt', 'ΔQ<sub>x</sub>, kVAr'],
      C.PST.map((p) => {
        const t = r.trafos[p], ld = r.loads[p];
        return [p, fmt.kat(ld.kat), n2(ld.S), t.n, n2(t.Sreq), `<span class="hl">${esc(trName(t))}</span>`, n2(t.kz),
          t.kAv != null ? `${n2(t.kAv)} ${t.kAv <= 1.4 ? '' : '<span class="tag tag-bad">&gt;1.4</span>'}` : '—', n2(t.Rt), n2(t.Xt), t.dPpul, t.dQpul];
      }), { num: [2, 3, 4, 6, 7, 8, 9, 10, 11] });
    C.PST.filter((p) => r.trafos[p].note).forEach((p) => { h += `<div class="note warn">p/st ${p}: ${esc(r.trafos[p].note)}</div>`; });
    h += '<h4>Ko\'taruvchi (blok) transformatorlar</h4>';
    h += table(['Generator', 'S<sub>G</sub>, MVA', 'Soni', 'Transformator', 'U<sub>YuK</sub>, kV', 'R<sub>t</sub>, Om', 'X<sub>t</sub>, Om'],
      r.stepUps.map((u) => [`${fmt.n(u.Pg, 0)} MVt`, n2(u.Sg), u.count, `<span class="hl">${esc(u.trafo.marka)}</span>`, u.trafo.UnYuK, n2(u.trafo.Rt), n2(u.trafo.Xt)]),
      { num: [1, 2, 4, 5, 6] });
    h += '</section>';

    // ---- 5. isroflar
    h += `<section class="res-section"><h3>5. Quvvat isrofi (maksimal rejim, oxiridan boshiga)</h3>`;
    h += F('ΔS_{t} = (P^{2}+Q^{2})/U^{2}·(R_{t}+jX_{t}) + n(ΔP_{x}+jΔQ_{x});   S_{1} = S_{yuk}+ΔS_{t};   S_{2} = S_{1} − jQ_{c}/2');
    h += F('ΔS_{HL} = (P_{2}^{2}+Q_{2}^{2})/U^{2}·(R+jX);   S_{3} = S_{2}+ΔS_{HL};   S_{4} = S_{3} − jQ_{c}/2');
    if (r.compensation) {
      const cp = r.compensation;
      h += `<div class="note warn"><b>Kompensatsiya qurilmalari hisobga olingan</b> (jami ${n2(cp.total)} MVAr${cp.fromBalance ? ', reaktiv balans va' : ','} HL-6 da cosφ ≥ ${r.opts.cosTieMin} sharti bo'yicha, qo'llanma 5.6, 27–28-bandlar): ` +
        cp.perPst.filter((c) => c.Qk > 0.005).map((c) => `${c.pst}: ${n2(c.Qk)} MVAr ≈ ${c.count}×${esc(cp.unit.marka)}`).join('; ') + '. S<sub>yuk</sub> ustunida Q kompensatsiyadan keyingi qiymat.</div>';
    }
    h += table(['p/st', 'S<sub>yuk</sub>', 'ΔS<sub>t</sub>', 'S<sub>1</sub>', 'S<sub>2</sub>', 'ΔS<sub>HL</sub>', 'S<sub>3</sub>', 'S<sub>4</sub>'],
      C.PST.map((p) => {
        const c = r.chains[p];
        return [p, cx(c.Syuk), cx(c.dSt), cx(c.S1), cx(c.S2), fmt.c(c.dPl, c.dQl), cx(c.S3), `<b>${cx(c.S4)}</b>`];
      }), { num: [1, 2, 3, 4, 5, 6, 7] });
    const sm = r.station;
    const modeName = { max: 'Maksimal', min: `Minimal (${r.opts.minLoadFactor * 100}%)`, av: 'Avariyadan keyingi' };
    h += '<h4>Stansiya shinasi balansi va HL-6 (Kirxgof 1-qonuni)</h4>';
    h += table(['Rejim', 'P<sub>gen</sub>, MVt', 'Q<sub>gen</sub>, MVAr', 'ΣS<sub>4</sub> (p/st lar)', 'ΔS ko\'tar. T', 'S<sub>HL-6</sub> (stansiyadan)', 'cosφ<sub>HL-6</sub>', 'ΔP<sub>HL-6</sub>, MVt', 'I<sub>tekshiruv</sub>, A', 'Qizish'],
      ['max', 'min', 'av'].map((k, i) => {
        const s = sm[k], chk = r.hl6Check[i];
        const cosOk = s.cos6 >= r.opts.cosTieMin - 0.005;
        return [modeName[k], n2(s.Pg), `${n2(s.Qg)}${s.genQreduced ? ' <span class="text-muted small">(kamaytirilgan)</span>' : ''}`, cx(s.need), fmt.c(s.dPup, s.dQup),
          `<b>${cx(s.S6)}</b> ${s.direction === 'export' ? '→ sistemaga' : '← sistemadan'}`,
          `${fmt.n(s.cos6, 3)} ${cosOk ? '' : '<span class="tag tag-warn">&lt;' + r.opts.cosTieMin + '</span>'}`,
          fmt.n(s.dP6, 3), `${fmt.i(chk.Iworst)} <span class="text-muted small">(${chk.oneOff ? '1 zanjir' : '2 zanjir'})</span>`, tag(chk.ok, 'OK', 'yo\'q')];
      }), { num: [1, 2, 6, 7, 8] });
    h += `<div class="note">Generatorlar nominal cosφ = ${r.input.cosManba} bilan ishlaydi deb olinadi; HL-6 da reaktiv quvvat ortib cosφ &lt; ${r.opts.cosTieMin} bo'lsa, qo'llanma 3.3 ga ko'ra generator Q kamaytiriladi. Maksimal rejimda generatorlar cosφ = ${fmt.n(sm.max.cosGen, 3)} (Q<sub>gen</sub> = ${n2(sm.max.Qg)} MVAr, nominal ${n2(sm.max.Qg_nom)} MVAr). ` +
      `Avariyadan keyingi rejim: eng katta generator o'chgan, II–III kategoriya yuklamalari ${r.opts.avLoadFactor * 100}%.</div>`;
    h += lossesSvg(r);
    const lt = r.lossTotals;
    h += table(['', 'ΔP, MVt', 'ΔQ, MVAr'], [
      ['Liniyalarda', fmt.n(lt.dPl, 3), fmt.n(lt.dQl, 3)],
      ['Transformatorlarda', fmt.n(lt.dPt, 3), fmt.n(lt.dQt, 3)]
    ], { num: [1, 2], foot: ['Jami', `${fmt.n(lt.dP, 3)} (${n2(lt.pct)}% ΣP)`, fmt.n(lt.dQ, 3)] });
    const ef = r.efficiency;
    h += `<div class="note">Uzatish FIK: η = P<sub>yetkazilgan</sub>/P<sub>uzatilgan</sub>·100% = ${n2(ef.delivered)}/${n2(ef.sent)}·100% = <b>${n2(ef.eta)}%</b> (iste'molchilar + sistemaga yetkazilgan / stansiyadan xususiy ehtiyojdan keyin + sistemadan olingan).</div>`;
    h += '</section>';

    // ---- 6. energiya
    const e = r.energy;
    h += `<section class="res-section"><h3>6. Yillik elektr energiya isrofi</h3>`;
    h += F('ΔW_{HL} = ΔP_{HL}·τ;   ΔW_{T} = ΔP_{t}·τ + ΔP_{x}·8760;   τ = f(T_{m}, cosφ)');
    h += table(['Element', 'T<sub>m</sub>, soat', 'cosφ', 'τ, soat', 'ΔP<sub>yuk</sub>, MVt', 'ΔP<sub>x</sub>, MVt', 'ΔW, MVt·soat'],
      e.rows.map((x) => [esc(x.el), fmt.i(x.Tm), fmt.n(x.cos, 2), fmt.i(x.tau) + (x.tauMethod === 'formula' ? '*' : ''), fmt.n(x.dP, 3), x.dPx ? fmt.n(x.dPx, 3) : '—', fmt.n(x.dW, 1)]),
      { num: [1, 2, 3, 4, 5, 6], foot: ['Jami ΔW<sub>Σ</sub>', '', '', '', '', '', fmt.n(e.dW, 1)] });
    h += `<div class="note">Qo'llanma 5.7: stansiya ishlab chiqargan energiya W<sub>st</sub> = ΣP<sub>gen</sub>·T = ${n2(r.P_st)}·${e.Tst} = ${fmt.i(e.Wst)} MVt·soat. ΔW<sub>%</sub> = ΔW<sub>Σ</sub>/W<sub>st</sub>·100% = <b>${n2(e.pct)}%</b> (liniyalar ${fmt.n(e.dWlines, 1)}, transformatorlar ${fmt.n(e.dWtrafo, 1)} MVt·soat). Ma'lumot uchun: iste'molchilar energiyasiga (${fmt.i(e.Wyuk)} MVt·soat) nisbatan ${n2(e.pctYuk)}%. Liniyalar uchun cosφ — liniya oqimining haqiqiy cosφ i; HL-6 va stansiya uchun T = ${e.Tst} soat.${e.rows.some((x) => x.tauMethod === 'formula') ? ' * τ = (0.124 + T<sub>m</sub>/10<sup>4</sup>)<sup>2</sup>·8760 formulasi bilan (jadval oralig\'idan tashqarida).' : ''}</div>`;
    h += '</section>';

    // ---- 7. kuchlanish
    h += `<section class="res-section"><h3>7. Kuchlanish yo'qotilishi va RPN shahobchasi</h3>`;
    h += F(`ΔU_{HL} = (P_{3}·R + Q_{3}·X)/U_{A};   ΔU_{t} = (P'·R_{t} + Q'·X_{t})/U_{oxiri};   U_{PK} = U'_{PK}·U_{nPK}/U_{otv}`);
    h += `<p class="lead-note">Manba YuK shinasi kuchlanishi U<sub>A</sub> = ${n2(r.volt[0].Ubus)} kV (o'zgarmas). PK tarafida istalgan kuchlanish ${n2(r.volt[0].Udes)} kV (±5%).</p>`;
    h += '<h4>Ko\'taruvchi transformatorlar: generator kuchlanishi va ПБВ shahobchasi (±2×2.5%)</h4>';
    h += F("ΔU_{T} = (P·R_{t} + Q·X_{t})/U_{A};   U'_{G} = U_{A} + ΔU_{T};   U_{G} = U'_{G}·U_{nG}/U_{otv}");
    h += table(['Transformator', 'P+jQ (bittasi)', 'ΔU<sub>T</sub>, kV', "U'<sub>G</sub>, kV", 'ПБВ', 'K<sub>T</sub>', 'U<sub>G</sub>, kV', 'Holat'],
      r.stepUpVolt.map((s) => [esc(s.marka), fmt.c(s.p, s.q), n2(s.dU), n2(s.Ug_ref), `<b>${s.tap.pct > 0 ? '+' : ''}${s.tap.pct}%</b>`,
        `${s.UnG}/${n2(s.tap.Uotv)}`, `<b>${n2(s.tap.Ug)}</b>`, tag(s.ok, 'OK', '±5% dan tashqari')]), { num: [2, 3, 6] });
    h += '<h4>Pasaytiruvchi podstansiyalar</h4>';
    h += voltageSvg(r);
    h += table(['p/st', 'ΔU<sub>HL</sub>, kV', 'U<sub>oxiri</sub>, kV', 'ΔU<sub>t</sub>, kV', "U'<sub>PK</sub>, kV", 'U<sub>PK</sub> (0), kV', 'RPN', 'U<sub>otv</sub>, kV', 'U<sub>PK</sub>, kV', 'Holat'],
      r.volt.map((v) => [v.pst, n2(v.dUl), n2(v.Uend), n2(v.dUt), n2(v.Uref), n2(v.U0),
        `<b>${v.tap.pct > 0 ? '+' : ''}${v.tap.pct}%</b>`, n2(v.tap.Uotv), `<b>${n2(v.tap.Upk)}</b>`,
        v.ok ? (v.needRPN ? '<span class="tag tag-ok">RPN bilan OK</span>' : '<span class="tag tag-ok">RPN siz ham OK</span>') : '<span class="tag tag-bad">kompensatsiya kerak</span>']),
      { num: [1, 2, 3, 4, 5, 7, 8] });
    r.volt.filter((v) => v.comp).forEach((v) => {
      h += `<div class="note bad">p/st ${v.pst}: barcha RPN shahobchalari bilan ham kuchlanish yetarli emas. Taxminan Q<sub>k</sub> = ${n2(v.comp.Qk)} MVAr kompensatsiya kerak → ` +
        `${v.comp.type === 'SK' ? 'sinxron kompensator ' + esc(v.comp.device.marka) : v.comp.count + ' × ' + esc(v.comp.device.marka) + ' (' + v.comp.device.Q_MVAr + ' MVAr) kondensator batareyasi'}.</div>`;
    });
    const v6 = r.voltHL6;
    h += `<div class="note">HL-6: ΔU = ${n2(v6.dU)} kV, sistema tomonidagi kuchlanish ≈ ${n2(v6.Usys)} kV.</div>`;
    h += '</section>';

    $('results').innerHTML = h;
  }

  // ------------------------------------------------------------------ bosqich ko'rsatkichi
  function setStep(n) {
    document.querySelectorAll('#steps .step').forEach((el) => {
      const s = Number(el.dataset.step);
      el.classList.toggle('active', s === n);
      el.classList.toggle('done', s < n);
    });
  }

  function showError(el, err) {
    const msgs = err && err.messages ? err.messages : [err && err.message ? err.message : String(err)];
    el.innerHTML = msgs.length > 1
      ? `<b>Xatoliklar:</b><ul class="mb-0">${msgs.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>`
      : `<b>Xatolik:</b> ${esc(msgs[0])}`;
    el.classList.remove('d-none');
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ------------------------------------------------------------------ hisoblash
  function onCalc(ev) {
    ev.preventDefault();
    const errBox = $('calc-error');
    errBox.classList.add('d-none');
    let r;
    try {
      const input = collectInput();
      r = C.calculate(input, DATA);
    } catch (e) {
      console.error(e);
      showError(errBox, e);
      return;
    }
    lastResult = r;
    $('unom-hint').innerHTML = `Formula bo'yicha tavsiya: <b>${r.U_rec} kV</b> (eng katta U<sub>hisob</sub> = ${fmt.n(Math.max(...r.voltage.map((v) => v.Uh)), 1)} kV).`;
    render(r);
    ['card-results', 'card-principal', 'card-equivalent', 'card-download'].forEach((id) => $(id).classList.remove('d-none'));
    drawSchemas(r);
    setStep(2);
    $('card-results').scrollIntoView({ behavior: 'smooth', block: 'start' });
    save();
  }

  // ------------------------------------------------------------------ sxemalar (1-rasm, 2-rasm)
  const SCHEMAS = {
    'schema-principal': 'drawPrincipalSchema',
    'schema-equivalent': 'drawEquivalentSchema'
  };

  function drawSchemas(r) {
    Object.entries(SCHEMAS).forEach(([id, fn]) => {
      try {
        window.SchemaDrawer[fn](r, id);
      } catch (e) {
        console.error(e);
        $(id).innerHTML = `<div class="alert alert-danger m-3">Sxemani chizishda xato: ${esc(e.message || e)}</div>`;
      }
    });
  }

  function downloadBlob(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  async function onSchemaToolbar(ev) {
    const btn = ev.target.closest('button[data-act]');
    if (!btn) return;
    const bar = btn.closest('.schema-toolbar');
    const m = window.SchemaDrawer.get(bar.dataset.target);
    if (!m) return;
    const pz = m.panZoom;
    const act = btn.dataset.act;
    if (act === 'in' && pz) pz.zoomIn();
    else if (act === 'out' && pz) pz.zoomOut();
    else if (act === 'fit' && pz) { pz.resetZoom(); pz.fit(); pz.center(); }
    else if (act === 'svg') {
      downloadBlob(new Blob([m.built.svg], { type: 'image/svg+xml;charset=utf-8' }), `${bar.dataset.file}.svg`);
    } else if (act === 'png') {
      try {
        const buf = await svgToPng(m.built.svg, m.built.W, m.built.H, 3);
        downloadBlob(new Blob([buf], { type: 'image/png' }), `${bar.dataset.file}.png`);
      } catch (e) { console.error(e); }
    }
  }

  // ------------------------------------------------------------------ SVG → PNG (DOCX uchun)
  function svgToPng(svg, w, h, scale = 2) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const cv = document.createElement('canvas');
          cv.width = w * scale; cv.height = h * scale;
          const ctx = cv.getContext('2d');
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
          ctx.drawImage(img, 0, 0, cv.width, cv.height);
          cv.toBlob((b) => (b ? b.arrayBuffer().then(resolve, reject) : reject(new Error('PNG yaratilmadi'))), 'image/png');
        } catch (e) { reject(e); }
      };
      img.onerror = () => reject(new Error('SVG yuklanmadi'));
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  }

  async function onDocx() {
    if (!lastResult) return;
    const st = $('docx-status');
    const btn = $('btn-docx');
    if (!window.docx) {
      st.innerHTML = '<span class="text-danger">docx kutubxonasi yuklanmadi — internet aloqasini tekshiring (cdn.jsdelivr.net).</span>';
      return;
    }
    btn.disabled = true;
    st.textContent = 'Hisobot tayyorlanmoqda…';
    try {
      // ikkala sxema PNG ga (vektor SVG dan, 3× aniqlik bilan)
      const figure = async (fn) => {
        try {
          const b = window.SchemaDrawer[fn](lastResult);
          return { data: await svgToPng(b.svg, b.W, b.H, 3), W: b.W, H: b.H };
        } catch (e) {
          console.warn('Sxema rasmi qo\'shilmadi:', e);
          return null;
        }
      };
      const meta = {
        student: $('inp-student').value.trim() || 'talaba',
        group: $('inp-group').value.trim(),
        teacher: $('inp-teacher').value.trim(),
        principalImage: await figure('buildPrincipalSvg'),
        equivalentImage: await figure('buildEquivalentSvg'),
        schema: schemaByNum(lastResult.input.schemaNum)
      };
      const blob = await window.DocxBuilder.build(lastResult, meta);
      downloadBlob(blob, `hisobot_sxema${lastResult.input.schemaNum}_${lastResult.input.variant}.docx`);
      st.innerHTML = '<span class="text-success">✓ Hisobot yuklab olindi.</span>';
      setStep(3);
    } catch (e) {
      console.error(e);
      st.innerHTML = `<span class="text-danger">DOCX yaratishda xato: ${esc(e.message || e)}</span>`;
    } finally {
      btn.disabled = false;
    }
  }

  // ------------------------------------------------------------------ namuna
  function loadSample() {
    $('sel-schema').value = SAMPLE.schema;
    onSchemaChange();
    C.PST.forEach((p) => setPst(p, SAMPLE.pst[p]));
    Object.entries(SAMPLE.lengths).forEach(([id, v]) => { document.querySelector(`[data-line="${id}"]`).value = v; });
    variantModified = true;
    $('sel-unom').value = '220';
    // daler_2.docx: I kat. uchun 0.7 qoidasi, E (II kat.) bitta transformator, bitta transformatorlar zaxira bilan olingan
    $('opt-line2').value = '1';
    $('opt-tr2').value = '1';
    $('opt-kI').value = '0.7';
    $('opt-k1').value = '1.25';
    $('opt-down').value = '0';
    $('sample-note').innerHTML = "Namuna (daler_2.docx) qiymatlari yuklandi. Hujjatga mos kelishi uchun <b>Qo'shimcha sozlamalar</b> qo'llanmadan farqli qo'yildi: " +
      "I kat. transformatorlari k = 0.7 (qo'llanmada 1.0), II kat. — 1 ta transformator (qo'llanmada 2 ta), bitta transformator k = 1.25, " +
      "242 kV li (ko'taruvchi turdagi) transformatorlarga ham ruxsat. " +
      "Qo'llanma bo'yicha hisoblash uchun «Qo'llanma bo'yicha standart sozlamalar» tugmasini bosing.";
    $('sample-note').classList.remove('d-none');
    updateTm();
    save();
  }

  const OPT_DEFAULTS = {
    'opt-kxus': '', 'opt-dptar': '8', 'opt-line2': '1', 'opt-tr2': '2', 'opt-kI': '1.0',
    'opt-k2': '0.7', 'opt-k1': '1.0', 'opt-down': '1', 'opt-costie': '0.97', 'opt-ubus': '1.1'
  };
  function resetOpts() {
    Object.entries(OPT_DEFAULTS).forEach(([id, v]) => { $(id).value = v; });
    $('sample-note').classList.add('d-none');
    save();
  }

  // ------------------------------------------------------------------ ishga tushirish
  async function init() {
    try {
      DATA = await loadData();
    } catch (e) {
      showError($('load-error'), e);
      $('btn-calc').disabled = true;
      return;
    }
    buildForm();
    if (!restore()) {
      $('sel-schema').value = 6;
      onSchemaChange();
    }
    $('input-form').addEventListener('submit', onCalc);
    $('btn-sample').addEventListener('click', loadSample);
    $('btn-reset-opts').addEventListener('click', resetOpts);
    $('btn-docx').addEventListener('click', onDocx);
    $('btn-print').addEventListener('click', () => window.print());
    $('btn-print2').addEventListener('click', () => window.print());
    $('btn-edit').addEventListener('click', () => { setStep(1); $('card-input').scrollIntoView({ behavior: 'smooth' }); });
    document.querySelectorAll('.schema-toolbar').forEach((bar) => bar.addEventListener('click', onSchemaToolbar));
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => window.SchemaDrawer && window.SchemaDrawer.refit(), 200);
    });
    window.addEventListener('beforeprint', () => window.SchemaDrawer && window.SchemaDrawer.refit());
  }

  document.addEventListener('DOMContentLoaded', init);
})();
