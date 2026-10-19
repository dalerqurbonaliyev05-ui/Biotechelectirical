// Kichik DOM yordamchilari (build qadamisiz, kutubxonasiz)

// Element.append / prepend: null, undefined va false bolalarni e'tiborsiz qoldiradi (massivlarni yoyadi)
for (const method of ['append', 'prepend']) {
  const orig = Element.prototype[method];
  Element.prototype[method] = function (...nodes) {
    const flat = nodes.flat(Infinity).filter((n) => n != null && n !== false);
    return orig.apply(this, flat);
  };
}

/** h('div.class#id', {onclick, attrs}, ...children) */
export function h(tag, attrs, ...children) {
  let cls = '';
  let id = '';
  const m = tag.match(/^([a-z0-9-]*)((?:[.#][\w-]+)*)$/i);
  let name = tag;
  if (m) {
    name = m[1] || 'div';
    for (const part of m[2].match(/[.#][\w-]+/g) || []) {
      if (part[0] === '.') cls += (cls ? ' ' : '') + part.slice(1);
      else id = part.slice(1);
    }
  }
  const svgNs = ['svg', 'g', 'rect', 'circle', 'path', 'text', 'line', 'polyline', 'polygon', 'defs', 'title', 'use', 'ellipse', 'linearGradient', 'radialGradient', 'stop', 'pattern', 'filter', 'feGaussianBlur', 'feMerge', 'feMergeNode', 'clipPath'];
  const el = svgNs.includes(name) ? document.createElementNS('http://www.w3.org/2000/svg', name) : document.createElement(name);
  if (cls) el.setAttribute('class', cls);
  if (id) el.id = id;
  if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs) || typeof attrs === 'string')) {
    children.unshift(attrs);
    attrs = null;
  }
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'class') el.setAttribute('class', (el.getAttribute('class') ? el.getAttribute('class') + ' ' : '') + v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'value' || k === 'checked' || k === 'disabled' || k === 'selected') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  append(el, children);
  return el;
}

export function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

const ICON_PATHS = {
    motor: '<circle cx="12" cy="12" r="6"/><path d="M2 12h4M18 12h4M12 6V2M12 18v4"/>',
    panel: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    welder: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    cable: '<path d="M3 17c4 0 4-10 9-10s5 10 9 10"/>',
    capbank: '<path d="M9 4v16M15 4v16M3 12h6M15 12h6"/>',
    ru: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8v8M12 8v8M17 8v8"/>',
    transformer: '<circle cx="9" cy="12" r="5"/><circle cx="15" cy="12" r="5"/>',
    pump: '<circle cx="12" cy="12" r="7"/><path d="M12 5v7l5 3"/>',
    fan: '<circle cx="12" cy="12" r="2"/><path d="M12 10c0-5 5-6 5-3s-3 3-5 3zM14 12c5 0 6 5 3 5s-3-3-3-5zM12 14c0 5-5 6-5 3s3-3 5-3zM10 12c-5 0-6-5-3-5s3 3 3 5z"/>',
    crane: '<path d="M3 20h18M6 20V8l12 4M18 12v6M5 8h14"/>',
    warn: '<path d="M12 3 2 21h20z"/><path d="M12 10v5M12 18v.5"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    cross: '<path d="m6 6 12 12M18 6 6 18"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    tasks: '<path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>',
    radio: '<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M7 8 17 3M8 14h4"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17v.5"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    ppe: '<path d="M4 14a8 8 0 0 1 16 0v2H4zM2 18h20"/>',
    hint: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    gauge: '<path d="M4 16a8 8 0 1 1 16 0"/><path d="m12 16 4-5"/>',
    coin: '<ellipse cx="12" cy="7" rx="7" ry="3"/><path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/>',
    chart: '<path d="M4 20V4M4 20h16M8 16l4-5 3 3 5-7"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    pin: '<path d="M12 21s-6-5.5-6-10a6 6 0 0 1 12 0c0 4.5-6 10-6 10z"/><circle cx="12" cy="11" r="2"/>'
};

/** Ikonaning ichki SVG qismi (xaritada ham ishlatiladi) */
export function iconPath(name) {
  return ICON_PATHS[name] || ICON_PATHS.bolt;
}

export function icon(name) {
  const s = h('svg', { viewBox: '0 0 24 24', class: 'ico', 'aria-hidden': 'true', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  s.innerHTML = iconPath(name);
  return s;
}

export function eqIcon(def) {
  if (def.type === 'motor') return icon(def.role === 'nasos' ? 'pump' : def.role === 'ventilyator' ? 'fan' : def.role === 'kran' ? 'crane' : 'motor');
  return icon(def.type);
}
