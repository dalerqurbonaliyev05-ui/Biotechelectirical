// Canvas yuklama grafigi (kutubxonasiz). Soatlar bo'yicha kW egri chiziqlari, tarif zonalari, soat tanlash.

const COL = { axis: '#8fb0d6', grid: 'rgba(120,170,230,0.16)', text: '#d6e6fa', hover: 'rgba(255,255,255,0.6)', sel: 'rgba(34,211,238,0.28)', peak: 'rgba(251,113,133,0.22)' };

/**
 * opts: {series:[{key,label,values:number[24],color,dashed,width}], zones:[{from,to,mult}], selected:number[], peaks:number[], yUnit:'kW', selectable}
 * handlers: {onHour(h), onHover(h)}
 */
export function mountChart(canvas, getOpts, handlers = {}) {
  let hover = -1;
  const draw = () => render(canvas, getOpts(), hover);
  const hourAt = (ev) => {
    const r = canvas.getBoundingClientRect();
    const x = ev.clientX - r.left;
    const pad = padding(r.width);
    const w = r.width - pad.l - pad.r;
    return Math.max(0, Math.min(23, Math.round(((x - pad.l) / w) * 23)));
  };
  canvas.addEventListener('pointermove', (ev) => {
    const hr = hourAt(ev);
    if (hr !== hover) {
      hover = hr;
      draw();
      handlers.onHover?.(hr);
    }
  });
  canvas.addEventListener('pointerleave', () => {
    hover = -1;
    draw();
    handlers.onHover?.(-1);
  });
  canvas.addEventListener('click', (ev) => handlers.onHour?.(hourAt(ev)));
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(draw) : null;
  ro?.observe(canvas);
  draw();
  return { redraw: draw, destroy: () => ro?.disconnect() };
}

function padding(w) {
  return { l: w < 480 ? 38 : 48, r: 12, t: 14, b: 30 };
}

function render(canvas, opts, hover) {
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || 600;
  const cssH = canvas.clientHeight || 300;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  const pad = padding(cssW);
  const W = cssW - pad.l - pad.r;
  const H = cssH - pad.t - pad.b;
  const all = opts.series.flatMap((s) => s.values);
  const yMax = niceMax(Math.max(opts.yMax || 0, ...all, 1));
  const X = (h) => pad.l + (h / 23) * W;
  const Y = (v) => pad.t + H - (v / yMax) * H;

  // tarif zonalari
  for (const z of opts.zones || []) {
    const x0 = X(Math.max(0, z.from - 0.5));
    const x1 = X(Math.min(23, z.to - 0.5));
    ctx.fillStyle = z.mult > 1.05 ? 'rgba(255,107,107,0.10)' : z.mult < 0.95 ? 'rgba(90,160,255,0.10)' : 'rgba(0,0,0,0)';
    ctx.fillRect(x0, pad.t, x1 - x0, H);
  }
  // tanlangan va cho'qqi soatlar
  for (const hr of opts.peaks || []) {
    ctx.fillStyle = COL.peak;
    ctx.fillRect(X(hr) - W / 46, pad.t, W / 23, H);
  }
  for (const hr of opts.selected || []) {
    ctx.fillStyle = COL.sel;
    ctx.fillRect(X(hr) - W / 46, pad.t, W / 23, H);
    ctx.strokeStyle = 'rgba(34,211,238,0.95)';
    ctx.strokeRect(X(hr) - W / 46 + 0.5, pad.t + 0.5, W / 23 - 1, H - 1);
  }
  // to'r
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillStyle = COL.text;
  ctx.strokeStyle = COL.grid;
  ctx.lineWidth = 1;
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const v = (yMax / 4) * i;
    const y = Y(v);
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(pad.l + W, y);
    ctx.stroke();
    ctx.fillText(Math.round(v), pad.l - 6, y + 4);
  }
  ctx.textAlign = 'center';
  for (let hr = 0; hr < 24; hr += cssW < 480 ? 4 : 2) ctx.fillText(String(hr).padStart(2, '0'), X(hr), cssH - 10);
  ctx.textAlign = 'left';
  ctx.fillText(opts.yUnit || 'kW', 4, 12);

  // egri chiziqlar
  for (const s of opts.series) {
    ctx.beginPath();
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.width || 2;
    ctx.setLineDash(s.dashed ? [6, 4] : []);
    s.values.forEach((v, hr) => (hr === 0 ? ctx.moveTo(X(hr), Y(v)) : ctx.lineTo(X(hr), Y(v))));
    ctx.stroke();
  }
  ctx.setLineDash([]);

  if (hover >= 0) {
    ctx.strokeStyle = COL.hover;
    ctx.beginPath();
    ctx.moveTo(X(hover), pad.t);
    ctx.lineTo(X(hover), pad.t + H);
    ctx.stroke();
    const lines = [`${String(hover).padStart(2, '0')}:00`, ...opts.series.map((s) => `${s.label}: ${Math.round(s.values[hover])}`)];
    const bw = 150;
    const bh = 8 + lines.length * 14;
    const bx = X(hover) + 8 + bw > cssW ? X(hover) - 8 - bw : X(hover) + 8;
    ctx.fillStyle = 'rgba(7,18,38,0.94)';
    ctx.fillRect(bx, pad.t + 4, bw, bh);
    ctx.fillStyle = COL.text;
    lines.forEach((l, i) => ctx.fillText(l, bx + 6, pad.t + 18 + i * 14));
  }
}

function niceMax(v) {
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}
