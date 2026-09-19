"use strict";

/* ============ MA'LUMOTLAR ============ */
const EPS = 0.005; // MW — hisoblash aniqligi

// setpoint — foydalanuvchi belgilagan quvvat, max — o'rnatilgan quvvat
// cost — narx darajasi (kattasi qimmatroq). Avtomatik taqsimlashda avval eng qimmat manba ishlatiladi
const plants = [
  {id: "ies",   name: "IES",        icon: "🔥", color: "#ff9f43", max: 10, setpoint: 6.5, enabled: true, solar: false, cost: 3},
  {id: "aes",   name: "AES",        icon: "☢️", color: "#a78bfa", max: 12, setpoint: 7,   enabled: true, solar: false, cost: 2},
  {id: "solar", name: "Quyosh EES", icon: "☀️", color: "#ffd166", max: 10, setpoint: 10,  enabled: true, solar: true,  cost: 1}
];

// priority: 1 — juda yuqori, 2 — yuqori, 3 — oddiy
const consumers = [
  {id: "industry", name: "Sanoat korxonasi",    icon: "🏭", demand: 1.0, priority: 2},
  {id: "hospital", name: "Shifoxona",           icon: "🏥", demand: 0.8, priority: 1},
  {id: "homes",    name: "Ko‘p qavatli uylar",  icon: "🏢", demand: 20,  priority: 1},
  {id: "park",     name: "Park / yoritish",     icon: "🌳", demand: 0.5, priority: 3}
];

const DEFAULT_SETPOINTS = {ies: 6.5, aes: 7, solar: 10};
const DEFAULT_DEMANDS   = {industry: 1.0, hospital: 0.8, homes: 20, park: 0.5};

function emptyRoutes() {
  const r = {};
  plants.forEach(p => { r[p.id] = {}; consumers.forEach(c => { r[p.id][c.id] = 0; }); });
  return r;
}
function defaultRoutes() {
  const r = emptyRoutes();
  r.ies.industry = 1.0; r.ies.hospital = 0.8; r.ies.homes = 4.0; r.ies.park = 0.5;
  r.aes.homes = 7.0;
  r.solar.homes = 9.0;
  return r;
}

function defaultWires() {
  const r = defaultRoutes(), w = {};
  plants.forEach(p => { w[p.id] = {}; consumers.forEach(c => { w[p.id][c.id] = r[p.id][c.id] > 0; }); });
  return w;
}

let routes = defaultRoutes();
let wires = defaultWires(); // wires[stansiya][iste'molchi] = sim ulanganmi (qo'l rejimida o'zgartiriladi)
let hour = 12;              // o'nlik soat: 12.25 = 12:15
const TIME_STEP = 0.25;     // simulyatsiya qadami: 0.25 soat = 15 daqiqa
const STEP_MS = 1200;       // har bir qadam necha millisekund davom etadi
let timer = null;
let autoDispatch = false;
let lastFlowHTML = "";

const $ = id => document.getElementById(id);
const fmt = n => Number(n).toFixed(2);

/* ============ HISOBLASH ============ */
function daylight(h) {
  return Math.max(0, Math.sin((h - 6) / 12 * Math.PI)); // 06:00–18:00
}
function available(p) {
  return p.solar ? p.max * daylight(hour) : p.max;
}
function output(p) {
  return p.enabled ? Math.min(p.setpoint, available(p)) : 0;
}
function sentBy(p) {
  return consumers.reduce((s, c) => s + (routes[p.id][c.id] || 0), 0);
}
// Stansiya rejalashtirilganidan ko'p quvvat bera olmaydi: agar jadvalda yuborilishi kerak
// bo'lgan quvvat mavjud quvvatdan ko'p bo'lsa (yoki stansiya o'chirilgan bo'lsa),
// haqiqiy yetkazilgan quvvat proporsional kamayadi (o'chirilgan bo'lsa — 0).
function scaleOf(p) {
  const s = sentBy(p), o = output(p);
  if (s <= o) return 1;
  return s > 0 ? o / s : 0;
}
function deliveredFrom(p, c) {
  if (!wires[p.id][c.id]) return 0; // uzilgan sim quvvat o'tkazmaydi
  return (routes[p.id][c.id] || 0) * scaleOf(p);
}
function receivedBy(c) {
  return plants.reduce((s, p) => s + deliveredFrom(p, c), 0);
}

function computeTotals() {
  const generation = plants.reduce((s, p) => s + output(p), 0);
  const demand = consumers.reduce((s, c) => s + c.demand, 0);
  const served = consumers.reduce((s, c) => s + Math.min(receivedBy(c), c.demand), 0);
  const deficit = Math.max(0, demand - served);
  const reserve = plants.reduce((s, p) => s + Math.max(0, output(p) - sentBy(p)), 0);
  const overload = plants.some(p => sentBy(p) > output(p) + EPS);
  return {generation, demand, served, deficit, reserve, overload};
}

// Iste'molchilar prioritet bo'yicha (1 → 3), manbalar esa avval eng qimmatidan (IES → AES → Quyosh)
function runAutoDispatch() {
  routes = emptyRoutes();
  const remaining = {};
  plants.forEach(p => { remaining[p.id] = output(p); });
  const sources = [...plants].sort((a, b) => b.cost - a.cost);
  [...consumers].sort((a, b) => a.priority - b.priority).forEach(c => {
    let need = c.demand;
    sources.forEach(p => {
      if (need <= 0) return;
      const x = Math.min(remaining[p.id], need);
      if (x > 0) {
        routes[p.id][c.id] = Math.round(x * 1000) / 1000;
        remaining[p.id] -= x;
        need -= x;
      }
    });
  });
}

/* ============ INTERFEYSNI QURISH (bir marta) ============ */
function buildPlantControls() {
  $("plantControls").innerHTML = plants.map(p => `
    <div class="card" style="--accent:${p.color}">
      <h3>${p.icon} ${p.name}</h3>
      <div class="value"><span id="${p.id}Out">0.00</span> MW <small>ishlab chiqarilmoqda</small></div>
      <span class="small">Sozlangan quvvat: <b id="${p.id}Set"></b> MW</span>
      <input data-plant="${p.id}" type="range" min="0" max="${p.max}" step="0.1" value="${p.setpoint}" aria-label="${p.name} quvvati">
      <span class="small">Hozir mavjud: <b id="${p.id}Avail"></b> MW · maksimal: ${p.max} MW</span>
      <button data-toggle="${p.id}"></button>
    </div>`).join("");

  document.querySelectorAll("[data-plant]").forEach(el => el.addEventListener("input", e => {
    const p = plants.find(x => x.id === e.target.dataset.plant);
    p.setpoint = +e.target.value;
    update();
  }));
  document.querySelectorAll("[data-toggle]").forEach(el => el.addEventListener("click", e => {
    const p = plants.find(x => x.id === e.target.dataset.toggle);
    p.enabled = !p.enabled;
    update();
  }));
}

function buildLoadControls() {
  $("loadControls").innerHTML = consumers.map(c => `
    <div class="card">
      <h3>${c.icon} ${c.name}</h3>
      <div class="value"><span id="${c.id}Demand">${fmt(c.demand)}</span> MW</div>
      <input data-load="${c.id}" type="range" min="0" max="${c.id === "homes" ? 30 : 5}" step="0.1" value="${c.demand}" aria-label="${c.name} talabi">
      <small>Prioritet: ${c.priority === 1 ? "juda yuqori" : c.priority === 2 ? "yuqori" : "oddiy"}</small>
    </div>`).join("");

  document.querySelectorAll("[data-load]").forEach(el => el.addEventListener("input", e => {
    const c = consumers.find(x => x.id === e.target.dataset.load);
    c.demand = +e.target.value;
    update();
  }));
}

function buildDispatch() {
  const head = `<tr><th>Manba → Yuklama</th>${consumers.map(c => `<th>${c.icon}<br>${c.name}</th>`).join("")}<th>Berilgan / Mavjud</th></tr>`;
  const body = plants.map(p => `<tr><th>${p.icon} ${p.name}</th>${
    consumers.map(c => `<td><div class="cell"><input type="checkbox" data-wire="${p.id}|${c.id}" title="Simni ulash / uzish" aria-label="${p.name} → ${c.name} simi"><input data-route="${p.id}|${c.id}" type="number" min="0" step="0.1" aria-label="${p.name} → ${c.name}"></div></td>`).join("")
  }<td id="sent-${p.id}"></td></tr>`).join("");
  const foot = `<tr class="foot"><th>Olingan / Talab</th>${consumers.map(c => `<td id="got-${c.id}"></td>`).join("")}<td></td></tr>`;
  $("dispatchTable").innerHTML = head + body + foot;

  document.querySelectorAll("[data-route]").forEach(el => el.addEventListener("input", e => {
    const [p, c] = e.target.dataset.route.split("|");
    if (!wires[p][c]) return; // uzilgan simga quvvat yozib bo'lmaydi
    routes[p][c] = Math.max(0, parseFloat(e.target.value) || 0);
    update();
  }));
  document.querySelectorAll("[data-wire]").forEach(el => el.addEventListener("change", e => {
    const [p, c] = e.target.dataset.wire.split("|");
    toggleWire(p, c);
  }));
}

function buildNetwork() {
  $("sourceColumn").innerHTML = plants.map(p => `
    <div class="node source" id="node-${p.id}" style="--accent:${p.color}">
      <div>${p.icon} <b>${p.name}</b></div>
      <div class="mw" id="nodeMw-${p.id}"></div>
      <small id="nodeSub-${p.id}"></small>
    </div>`).join("");

  $("consumerColumn").innerHTML = consumers.map(c => `
    <div class="node consumer" id="node-${c.id}">
      <div>${c.icon} <b>${c.name}</b></div>
      <div class="mw" id="nodeMw-${c.id}"></div>
      <div class="bar"><i id="nodeBar-${c.id}"></i></div>
      <small id="nodeSub-${c.id}"></small>
    </div>`).join("");

  $("legend").innerHTML = plants.map(p => `<span style="--c:${p.color}">${p.icon} ${p.name}</span>`).join("")
    + `<span style="--c:#5f7db0">Ulangan, quvvat oqmayapti</span>`
    + `<span style="--c:#3b5278">Uzilgan sim (qo‘l rejimida bosib ulang)</span>`
    + `<span style="--c:#ff6b6b">Xato: mavjud bo‘lmagan quvvat</span>`;
}

/* ============ YANGILASH ============ */
function refreshPlantCards() {
  plants.forEach(p => {
    $(`${p.id}Out`).textContent = fmt(output(p));
    $(`${p.id}Set`).textContent = fmt(p.setpoint);
    $(`${p.id}Avail`).textContent = fmt(available(p));
    const slider = document.querySelector(`[data-plant="${p.id}"]`);
    if (+slider.value !== p.setpoint) slider.value = p.setpoint;
    slider.disabled = !p.enabled;
    const btn = document.querySelector(`[data-toggle="${p.id}"]`);
    btn.textContent = p.enabled ? "YOQILGAN" : "O‘CHIRILGAN";
    btn.classList.toggle("off", !p.enabled);
  });
}

function refreshLoadCards() {
  consumers.forEach(c => {
    $(`${c.id}Demand`).textContent = fmt(c.demand);
    const slider = document.querySelector(`[data-load="${c.id}"]`);
    if (+slider.value !== c.demand) slider.value = c.demand;
  });
}

function refreshDispatch() {
  document.querySelectorAll("[data-route]").forEach(el => {
    const [p, c] = el.dataset.route.split("|");
    if (document.activeElement !== el) el.value = fmt(routes[p][c] || 0);
    el.disabled = autoDispatch || !wires[p][c];
  });
  document.querySelectorAll("[data-wire]").forEach(el => {
    const [p, c] = el.dataset.wire.split("|");
    el.checked = wires[p][c];
    el.disabled = autoDispatch;
  });
  plants.forEach(p => {
    const s = sentBy(p), o = output(p);
    const cell = $(`sent-${p.id}`);
    cell.innerHTML = `<b>${fmt(s)}</b> / ${fmt(o)}`;
    cell.className = s > o + EPS ? "bad" : "";
  });
  consumers.forEach(c => {
    const got = receivedBy(c);
    const cell = $(`got-${c.id}`);
    cell.innerHTML = `<b>${fmt(got)}</b> / ${fmt(c.demand)}`;
    cell.className = Math.abs(got - c.demand) <= EPS ? "ok" : "warn";
  });
}

function refreshNodes() {
  plants.forEach(p => {
    const o = output(p), s = sentBy(p);
    const node = $(`node-${p.id}`);
    node.classList.toggle("off", !p.enabled);
    node.classList.toggle("over", s > o + EPS);
    $(`nodeMw-${p.id}`).textContent = `${fmt(o)} MW`;
    $(`nodeSub-${p.id}`).textContent = p.enabled ? `Yetkazilmoqda: ${fmt(s * scaleOf(p))} MW` : "O‘chirilgan";
  });
  consumers.forEach(c => {
    const got = receivedBy(c);
    const pct = c.demand > EPS ? Math.min(100, got / c.demand * 100) : 100;
    const node = $(`node-${c.id}`);
    node.classList.toggle("ok", got + EPS >= c.demand);
    node.classList.toggle("short", got + EPS < c.demand);
    $(`nodeMw-${c.id}`).textContent = `${fmt(got)} / ${fmt(c.demand)} MW`;
    $(`nodeBar-${c.id}`).style.width = pct + "%";
    $(`nodeSub-${c.id}`).textContent = `${fmt(pct)}% ta’minlangan`;
  });
}

// Har bir stansiyadan har bir iste'molchiga alohida sim (jami: stansiyalar × iste'molchilar).
// Qo'l rejimida sim ustiga (yoki jadvaldagi belgiga) bosib uni ulash / uzish mumkin.
// Rangli va animatsiyali — quvvat oqyapti; xira punktir — uzilgan; xira yaxlit — ulangan, lekin 0 MW;
// qizil — jadvalda yozilgan, lekin manbada quvvat yo'q.
function drawFlows() {
  const svg = $("flowSvg");
  if (getComputedStyle(svg).display === "none") return;
  svg.classList.toggle("manual", !autoDispatch);
  const grid = $("grid").getBoundingClientRect();
  const idle = [], active = [], hits = [];
  plants.forEach((p, pi) => consumers.forEach((c, ci) => {
    const on = wires[p.id][c.id];
    const planned = routes[p.id][c.id] || 0;
    const flow = deliveredFrom(p, c);
    const a = $(`node-${p.id}`).getBoundingClientRect();
    const b = $(`node-${c.id}`).getBoundingClientRect();
    // har bir sim o'z ulanish nuqtasiga ega
    const x1 = a.right - grid.left;
    const y1 = a.top + a.height * (ci + 1) / (consumers.length + 1) - grid.top;
    const x2 = b.left - grid.left;
    const y2 = b.top + b.height * (pi + 1) / (plants.length + 1) - grid.top;
    const mx = (x1 + x2) / 2;
    const d = `M${x1.toFixed(1)},${y1.toFixed(1)} C${mx.toFixed(1)},${y1.toFixed(1)} ${mx.toFixed(1)},${y2.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`;
    let tip;
    if (!on) {
      tip = `${p.name} → ${c.name}: sim uzilgan`;
      idle.push(`<path class="flow off" d="${d}"><title>${tip}</title></path>`);
    } else if (flow > EPS) {
      const width = Math.min(8, 1.5 + flow * 0.5);
      const extra = planned - flow > EPS ? ` (rejalashtirilgan: ${fmt(planned)} MW)` : "";
      tip = `${p.name} → ${c.name}: ${fmt(flow)} MW${extra}`;
      active.push(`<path class="flow" d="${d}" stroke="${p.color}" stroke-width="${width.toFixed(1)}"><title>${tip}</title></path>`);
    } else if (planned > EPS) {
      tip = `${p.name} → ${c.name}: ${fmt(planned)} MW rejalashtirilgan, lekin quvvat yo‘q`;
      active.push(`<path class="flow bad" d="${d}"><title>${tip}</title></path>`);
    } else {
      tip = `${p.name} → ${c.name}: ulangan, 0.00 MW`;
      idle.push(`<path class="flow idle" d="${d}"><title>${tip}</title></path>`);
    }
    const action = autoDispatch ? "" : (on ? " — bosib uzing" : " — bosib ulang");
    hits.push(`<path class="hit" d="${d}" data-p="${p.id}" data-c="${c.id}"><title>${tip}${action}</title></path>`);
  }));
  const html = `<!--${grid.width}x${grid.height}-->` + idle.join("") + active.join("") + hits.join("");
  if (html === lastFlowHTML) return; // animatsiya qayta boshlanmasligi uchun
  lastFlowHTML = html;
  svg.setAttribute("viewBox", `0 0 ${grid.width} ${grid.height}`);
  svg.innerHTML = html;
}

// Qo'l rejimida simni ulash / uzish
function toggleWire(pid, cid) {
  if (autoDispatch) return;
  const p = plants.find(x => x.id === pid), c = consumers.find(x => x.id === cid);
  if (wires[pid][cid]) {
    wires[pid][cid] = false;   // sim uzildi — quvvat o'tmaydi, manba quvvati bo'shaydi
    routes[pid][cid] = 0;
  } else {
    wires[pid][cid] = true;    // sim ulandi — boshlang'ich quvvat: manbaning bo'sh quvvati va
    const spare = Math.max(0, output(p) - sentBy(p));       // iste'molchining yetishmayotgan quvvatidan kichigi
    const need = Math.max(0, c.demand - receivedBy(c));
    routes[pid][cid] = Math.round(Math.min(spare, need) * 1000) / 1000;
  }
  update();
}

function renderLog(t) {
  const list = [];
  if (t.deficit > EPS) {
    list.push(`<li class="bad">⚠️ Yetishmovchilik: ${fmt(t.deficit)} MW. Yuklamani kamaytirish yoki boshqa manbani yoqish kerak.</li>`);
  } else {
    list.push(`<li class="ok">✅ Jami yuklama ta’minlangan.</li>`);
  }
  if (t.generation + EPS < t.demand) {
    list.push(`<li class="bad">⚠️ Jami ishlab chiqarish (${fmt(t.generation)} MW) talabdan (${fmt(t.demand)} MW) kam.</li>`);
  }
  if (t.reserve < 1 - EPS) list.push(`<li class="warn">⚠️ Zaxira juda kichik: ${fmt(t.reserve)} MW.</li>`);
  plants.forEach(p => {
    const s = sentBy(p), o = output(p);
    if (s > o + EPS) list.push(`<li class="bad">❌ ${p.name}: ${fmt(s)} MW yo‘naltirilgan, lekin mavjud quvvat ${fmt(o)} MW.</li>`);
  });
  consumers.forEach(c => {
    const got = receivedBy(c);
    if (got + EPS < c.demand) list.push(`<li class="warn">⚠️ ${c.name}: ${fmt(c.demand - got)} MW yetishmayapti.</li>`);
    else if (got > c.demand + EPS) list.push(`<li class="warn">⚠️ ${c.name}: talabdan ${fmt(got - c.demand)} MW ortiqcha berilgan.</li>`);
  });
  plants.forEach(p => consumers.forEach(c => {
    if (wires[p.id][c.id] && (routes[p.id][c.id] || 0) <= EPS) {
      list.push(`<li class="info">ℹ️ ${p.name} → ${c.name} simi ulangan, lekin 0 MW (manbada bo‘sh quvvat yo‘q yoki iste’molchi talabi qoplangan). Jadvaldan MW kiriting.</li>`);
    }
  }));
  $("log").innerHTML = list.join("");

  const bad = t.deficit > EPS || t.overload;
  $("systemStatus").textContent = bad ? "Ogohlantirish: tizimda muammo bor" : "Tizim normal";
  $("systemDot").style.background = bad ? "#ff6b6b" : (t.reserve < 1 - EPS ? "#ffd166" : "#39d98a");
}

function renderAutoBtn() {
  const btn = $("autoBtn");
  btn.textContent = autoDispatch ? "⚙ AVTOMATIK: YOQILGAN" : "⚙ AVTOMATIK: O‘CHIRILGAN";
  btn.classList.toggle("on", autoDispatch);
  btn.classList.toggle("off", !autoDispatch);
  btn.setAttribute("aria-pressed", autoDispatch);
  $("autoHint").textContent = autoDispatch
    ? "Vaqt va quvvatlar o‘zgarganda iste’molchilar o‘zi ta’minlanadi: avval eng qimmat manba (IES → AES → Quyosh), iste’molchilar esa prioritet bo‘yicha. Jadval va simlar qulflangan."
    : "Qo‘lda rejim: jadvaldagi MW ni o‘zgartiring; simni ulash / uzish uchun animatsiyadagi sim ustiga yoki jadvaldagi belgiga bosing.";
}

function update() {
  if (autoDispatch) {
    runAutoDispatch();
    plants.forEach(p => consumers.forEach(c => { wires[p.id][c.id] = routes[p.id][c.id] > 0; }));
  }
  renderAutoBtn();
  const t = computeTotals();
  $("totalGeneration").textContent = fmt(t.generation) + " MW";
  $("totalDemand").textContent = fmt(t.demand) + " MW";
  $("reserve").textContent = fmt(t.reserve) + " MW";
  $("deficit").textContent = fmt(t.deficit) + " MW";
  refreshPlantCards();
  refreshLoadCards();
  refreshDispatch();
  refreshNodes();
  drawFlows();
  renderLog(t);
}

/* ============ VAQT ============ */
function setHour(h) {
  hour = +h;
  const hh = Math.floor(hour), mm = Math.round((hour - hh) * 60);
  $("hourLabel").textContent = String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0");
  $("hourSlider").value = hour;
  const solar = plants.find(p => p.solar);
  const avail = fmt(available(solar));
  $("timeExplanation").textContent = daylight(hour) > 0
    ? `Kunduz: Quyosh EES bu soatda ${avail} MW gacha quvvat bera oladi (kun bo‘yi o‘zgarib turadi).`
    : "Tun: Quyosh EES quvvati 0 MW. Yetishmagan quvvatni IES va AES qoplashi kerak.";
  update();
}

function stopTimer() { clearInterval(timer); timer = null; }

$("flowSvg").addEventListener("click", e => {
  const w = e.target.closest(".hit");
  if (w) toggleWire(w.dataset.p, w.dataset.c);
});
$("hourSlider").addEventListener("input", e => setHour(e.target.value));
$("playBtn").addEventListener("click", () => {
  if (timer) return;
  timer = setInterval(() => setHour((hour + TIME_STEP) % 24), STEP_MS);
});
$("pauseBtn").addEventListener("click", stopTimer);
$("autoBtn").addEventListener("click", () => {
  autoDispatch = !autoDispatch;
  update();
});
$("resetBtn").addEventListener("click", () => {
  stopTimer();
  plants.forEach(p => { p.enabled = true; p.setpoint = DEFAULT_SETPOINTS[p.id]; });
  consumers.forEach(c => { c.demand = DEFAULT_DEMANDS[c.id]; });
  routes = defaultRoutes();
  wires = defaultWires();
  autoDispatch = false;
  setHour(12);
});
window.addEventListener("resize", () => { lastFlowHTML = ""; drawFlows(); });

/* ============ BOSHLASH ============ */
buildPlantControls();
buildLoadControls();
buildDispatch();
buildNetwork();
setHour(12);
