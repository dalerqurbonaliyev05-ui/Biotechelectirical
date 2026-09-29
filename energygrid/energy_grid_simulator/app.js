/* =========================================================
   Energy Grid Simulator v2 — interfeys
   engine.js (hisob), scenarios.js (ma'lumot), i18n.js (tarjima)
   ========================================================= */
(function () {
    "use strict";

    const E = window.GridEngine;
    const SC = window.SCENARIOS;
    const L = window.I18N_SIM;
    const $ = id => document.getElementById(id);
    const LANG_KEY = "energyvibe-lang";   // bosh sahifa bilan umumiy
    const STACK_ORDER = ["nuclear", "coal", "chp", "bio", "hydro", "ccgt", "steam", "engines", "ocgt", "import", "pumped", "battery", "offshore", "wind", "solar"];
    const SPEED_MS = { 1: 700, 4: 180, 12: 60 };

    /* ---------- holat ---------- */
    const month = new Date().getMonth();
    const defaultSeason = [0, 1, 11].includes(month) ? "winter" : month <= 4 ? "spring" : month <= 7 ? "summer" : "autumn";

    const state = {
        lang: "uz", scen: "uz", mode: "real",
        season: defaultSeason, weather: "sunny", dayType: "work",
        gas: 100, trip: false, step: 48, speed: 1, timer: null,
        per: {}
    };
    let sim = null;          // real rejim natijasi (bir kun)
    let train = null;        // o'quv rejimi hisob-kitobi (joriy soat)

    function defaultsFor(id) {
        const sc = SC[id];
        const d = { caps: {}, enabled: {}, scales: {}, setpoints: {}, routes: {}, auto: true };
        sc.plants.forEach(p => { d.caps[p.id] = p.cap; d.enabled[p.id] = !p.off; d.setpoints[p.id] = 0; });
        sc.consumers.forEach(c => { d.scales[c.id] = 1; });
        return d;
    }
    Object.keys(SC).forEach(id => { state.per[id] = defaultsFor(id); });
    const sc = () => SC[state.scen];
    const per = () => state.per[state.scen];

    /* ---------- tarjima va formatlash ---------- */
    function t(key, vars) {
        let s = (L[state.lang] && L[state.lang][key]) ?? L.uz[key] ?? key;
        if (vars) Object.keys(vars).forEach(k => { s = s.split("{" + k + "}").join(vars[k]); });
        return s;
    }
    const plantName = p => { const k = "p." + p.id + "." + state.scen; return (L[state.lang][k] || L.uz[k]) ? t(k) : t("p." + p.id); };
    const consName = c => { const k = "c." + c.id + "." + state.scen; return (L[state.lang][k] || L.uz[k]) ? t(k) : t("c." + c.id); };
    // o'zbekcha yozuv: bo'shliq bilan guruhlash va vergulli kasr (8,93 · 6 454) — ru-RU formati bilan bir xil
    const locale = () => ({ uz: "ru-RU", ru: "ru-RU", en: "en-GB" })[state.lang];
    const nf = (v, d = 0) => {
        const r = Math.abs(v) < 0.5 * Math.pow(10, -d) ? 0 : v;   // "-0" chiqmasligi uchun
        try { return new Intl.NumberFormat(locale(), { minimumFractionDigits: d, maximumFractionDigits: d }).format(r); } catch (e) { return r.toFixed(d); }
    };
    const MW = v => nf(Math.round(v)) + " " + t("unit.mw");
    const GW = (v, d = 2) => nf(v / 1000, d) + " " + t("unit.gw");
    const pct = v => nf(v * 100, 0) + "%";
    const hhmm = step => { const m = step * 15; return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); };
    const esc = s => String(s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
    const money = v => sc().currency + nf(Math.round(v));

    function settings() {
        const ps = per();
        return {
            season: state.season, weather: state.weather, dayType: state.dayType,
            gasSupply: state.gas / 100, trip: state.trip,
            caps: ps.caps, enabled: ps.enabled, scales: ps.scales
        };
    }

    /* ---------- statik matnlar ---------- */
    function applyStatic() {
        document.documentElement.lang = state.lang;
        document.title = t("pageTitle");
        document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
        document.querySelectorAll(".lang-btn").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.lang === state.lang)));
        $("flowDesc").textContent = t(state.mode === "real" ? "flow.desc.real" : "flow.desc.train");
        $("plantsDesc").textContent = t(state.mode === "real" ? "plants.desc.real" : "plants.desc.train");
    }

    function syncControls() {
        document.querySelectorAll(".scen").forEach(b => b.setAttribute("aria-checked", String(b.dataset.scen === state.scen)));
        document.querySelectorAll(".seg[data-group]").forEach(g => {
            const v = String(state[g.dataset.group]);
            g.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.val === v)));
        });
        $("gasSlider").value = state.gas;
        $("gasVal").textContent = state.gas + "%";
        $("tripBtn").setAttribute("aria-pressed", String(state.trip));
        $("matrixPanel").hidden = state.mode !== "train";
        $("hourSlider").value = state.step;
        $("playBtn").textContent = t(state.timer ? "ctl.pause" : "ctl.play");
    }

    /* =========================================================
       KARTALAR (stansiyalar va iste'molchilar)
       ========================================================= */
    function capStep(p) { return p.capMax > 10000 ? 100 : p.capMax > 3000 ? 50 : 10; }

    function buildPlants() {
        const s = sc(), ps = per();
        $("plants").innerHTML = s.plants.map(p => {
            const cost = p.kind === "import" ? E.costOf(s, p, { season: state.season }) : p.cost;
            const meta = [];
            if (cost != null) meta.push(t("plant.cost") + " " + s.currency + cost + "/MWh");
            if (p.co2) meta.push("CO₂ " + nf(p.co2, 2) + " t/MWh");
            if (E.isStorage(p)) meta.push(nf(p.hours) + "h · η " + Math.round(p.eff * 100) + "%");
            const isTrain = state.mode === "train";
            const max = isTrain ? Math.max(1, ps.caps[p.id]) : p.capMax;
            const val = isTrain ? ps.setpoints[p.id] : ps.caps[p.id];
            return `
            <div class="card" id="pc-${p.id}" style="--c:${p.color}">
                <div class="card-top">
                    <span class="card-ico" aria-hidden="true">${p.icon}</span>
                    <div><div class="card-name">${esc(plantName(p))}</div><div class="card-sub">${esc(meta.join(" · "))}</div></div>
                </div>
                <div class="card-v"><span data-v>0</span><small data-vs></small></div>
                <div class="meter"><i class="avail" data-avail></i><i data-out></i></div>
                <div class="card-meta"><span data-m1></span><span data-m2></span></div>
                <div class="card-ctl">
                    <label for="pr-${p.id}"><span>${t(isTrain ? "plant.set" : "plant.cap")}</span><b data-capv></b></label>
                    <input id="pr-${p.id}" type="range" min="0" max="${max}" step="${capStep(p)}" value="${val}" data-plant="${p.id}">
                </div>
                <div class="card-foot">
                    <span data-pill></span>
                    <button type="button" class="onoff" data-toggle="${p.id}"></button>
                </div>
            </div>`;
        }).join("");

        $("plants").querySelectorAll("[data-plant]").forEach(el => el.addEventListener("input", e => {
            const id = e.target.dataset.plant, v = +e.target.value;
            if (state.mode === "train") { per().setpoints[id] = v; per().auto = false; renderAll(); }
            else { per().caps[id] = v; recompute(); }
        }));
        $("plants").querySelectorAll("[data-toggle]").forEach(el => el.addEventListener("click", e => {
            const id = e.currentTarget.dataset.toggle;
            per().enabled[id] = !per().enabled[id];
            recompute();
        }));
    }

    function buildConsumers() {
        const s = sc();
        $("consumers").innerHTML = s.consumers.map(c => `
            <div class="card" id="cc-${c.id}" style="--c:${c.color}">
                <div class="card-top">
                    <span class="card-ico" aria-hidden="true">${c.icon}</span>
                    <div><div class="card-name">${esc(consName(c))}</div><div class="card-sub"><span class="pill p${c.prio}">${t("cons.prio")}: ${t("prio." + c.prio)}</span></div></div>
                </div>
                <div class="card-v"><span data-v>0</span><small data-vs></small></div>
                <div class="meter"><i data-out></i></div>
                <div class="card-meta"><span data-m1></span><span data-m2></span></div>
                <div class="card-ctl">
                    <label for="cr-${c.id}"><span>${t("cons.scale")}</span><b data-scalev></b></label>
                    <input id="cr-${c.id}" type="range" min="0" max="200" step="5" value="${Math.round(per().scales[c.id] * 100)}" data-cons="${c.id}">
                </div>
            </div>`).join("");
        $("consumers").querySelectorAll("[data-cons]").forEach(el => el.addEventListener("input", e => {
            per().scales[e.target.dataset.cons] = +e.target.value / 100;
            recompute();
        }));
    }

    /* =========================================================
       REAL REJIM: kunlik simulyatsiya
       ========================================================= */
    function recompute() {
        sim = E.simulateDay(sc(), settings());
        renderAll();
    }

    /* =========================================================
       O'QUV REJIMI
       ========================================================= */
    function trainSources() {
        return sc().plants;   // barcha manbalar (akkumulyator razryadda, import manba sifatida)
    }
    function trainCompute() {
        const s = sc(), ps = per(), st = settings();
        const env = { season: state.season, weather: state.weather, day: state.dayType };
        const h = state.step * E.DT;
        const real = sim.steps[state.step];
        if (ps.auto) {
            // dispetcher topshiriqlari (real rejim natijasi)
            s.plants.forEach(p => {
                const v = p.kind === "import" ? real.imp : E.isStorage(p) ? real.discharge[p.id] : real.gen[p.id];
                ps.setpoints[p.id] = Math.round(v || 0);
            });
        }
        const avail = {}, out = {};
        trainSources().forEach(p => {
            avail[p.id] = E.plantAvail(s, p, env, h, st);
            out[p.id] = ps.enabled[p.id] ? Math.min(ps.setpoints[p.id], avail[p.id]) : 0;
        });
        const demand = {};
        s.consumers.forEach(c => { demand[c.id] = E.consumerDemand(s, c, env, h, st); });
        if (ps.auto) autoRoutes(out, demand);
        // haqiqiy yetkazilgan quvvat
        const sent = {}, scale = {}, got = {};
        trainSources().forEach(p => {
            sent[p.id] = s.consumers.reduce((a, c) => a + (ps.routes[p.id]?.[c.id] || 0), 0);
            scale[p.id] = sent[p.id] <= out[p.id] + 1e-6 ? 1 : (sent[p.id] > 0 ? out[p.id] / sent[p.id] : 0);
        });
        s.consumers.forEach(c => {
            got[c.id] = trainSources().reduce((a, p) => a + (ps.routes[p.id]?.[c.id] || 0) * scale[p.id], 0);
        });
        const totalDemand = Object.values(demand).reduce((a, b) => a + b, 0);
        const totalOut = Object.values(out).reduce((a, b) => a + b, 0);
        const served = s.consumers.reduce((a, c) => a + Math.min(got[c.id], demand[c.id]), 0);
        const deficit = Math.max(0, totalDemand - served);
        return { avail, out, demand, sent, scale, got, totalDemand, totalOut, served, deficit };
    }

    function srcCost(p) {
        const s = sc();
        if (E.isVRE(p)) return -1;
        if (E.isStorage(p)) return s.storageValue;
        return E.costOf(s, p, { season: state.season });
    }

    function autoRoutes(out, demand) {
        const s = sc(), ps = per();
        ps.routes = {};
        const remaining = {};
        s.plants.forEach(p => { ps.routes[p.id] = {}; remaining[p.id] = out[p.id]; });
        const sources = s.plants.slice().sort((a, b) => srcCost(a) - srcCost(b));
        s.consumers.slice().sort((a, b) => a.prio - b.prio).forEach(c => {
            let need = demand[c.id];
            sources.forEach(p => {
                if (need <= 1e-6) return;
                const x = Math.min(remaining[p.id], need);
                if (x > 1e-6) { ps.routes[p.id][c.id] = Math.round(x); remaining[p.id] -= x; need -= x; }
            });
        });
    }

    function buildMatrix() {
        const s = sc();
        const head = `<thead><tr><th>${t("matrix.head")}</th>${s.consumers.map(c => `<th>${c.icon}<br>${esc(consName(c))}</th>`).join("")}<th>${t("matrix.sent")}</th></tr></thead>`;
        const body = trainSources().map(p => `<tr><th>${p.icon} ${esc(plantName(p))}</th>${
            s.consumers.map(c => `<td><input type="number" min="0" step="10" data-r="${p.id}|${c.id}" aria-label="${esc(plantName(p))} → ${esc(consName(c))}"></td>`).join("")
        }<td id="ms-${p.id}"></td></tr>`).join("");
        const foot = `<tr class="foot"><th>${t("matrix.got")}</th>${s.consumers.map(c => `<td id="mg-${c.id}"></td>`).join("")}<td></td></tr>`;
        $("matrix").innerHTML = head + "<tbody>" + body + foot + "</tbody>";
        $("matrix").querySelectorAll("[data-r]").forEach(el => el.addEventListener("input", e => {
            const [p, c] = e.target.dataset.r.split("|");
            const ps = per();
            ps.auto = false;
            ps.routes[p] = ps.routes[p] || {};
            ps.routes[p][c] = Math.max(0, parseFloat(e.target.value) || 0);
            renderAll();
        }));
    }

    /* =========================================================
       CHIZISH
       ========================================================= */
    function renderAll() {
        if (state.mode === "train") train = trainCompute();
        syncControls();
        renderClock();
        renderKPIs();
        renderPlants();
        renderConsumers();
        if (state.mode === "train") renderMatrix();
        renderFlow();
        drawChart();
        renderSummary();
        renderLog();
    }

    function renderClock() {
        $("clock").textContent = hhmm(state.step);
        const env = { season: state.season, weather: state.weather, day: state.dayType };
        $("clockIco").textContent = E.daylight(sc(), env, state.step * E.DT) > 0.2 ? "☀️" : "🌙";
    }

    function setKPI(id, value, sub, cls) {
        const el = $(id);
        el.querySelector(".kpi-v").innerHTML = value;
        el.querySelector(".kpi-s").textContent = sub;
        el.classList.remove("good", "warn", "bad");
        if (cls) el.classList.add(cls);
    }

    function kpiValues() {
        const s = sc();
        if (state.mode === "real") {
            const st = sim.steps[state.step];
            const dis = Object.values(st.discharge).reduce((a, b) => a + b, 0);
            const supply = st.genTotal + dis + st.imp;
            const reGen = s.plants.filter(p => ["solar", "wind", "hydro", "bio"].includes(p.kind)).reduce((a, p) => a + (st.gen[p.id] || 0), 0);
            const nuc = s.plants.filter(p => p.kind === "nuclear").reduce((a, p) => a + (st.gen[p.id] || 0), 0);
            let fShown = 50 + 0.012 * Math.sin(state.step * 1.7);
            if (st.shed > 1) fShown = 49.8;
            else if (st.surplus > 1) fShown = 50.2;
            else if (st.reserve < s.reserveReq) fShown = 49.96;
            const marg = st.marginal ? s.plants.find(p => p.id === st.marginal) : null;
            return {
                demand: st.req, loss: s.lossPct, supply, imp: st.imp, fShown, fPre: st.fPre, shed: st.shed, surplus: st.surplus,
                reserve: st.reserve, price: st.price, priceBy: marg ? plantName(marg) : null, curt: st.curt,
                co2: st.co2, intensity: supply > 0 ? st.co2 / supply * 1000 : 0,
                re: st.genTotal > 0 ? reGen / st.genTotal : 0, lowc: st.genTotal > 0 ? (reGen + nuc) / st.genTotal : 0
            };
        }
        // o'quv rejimi
        const tr = train;
        const delivered = {};
        let dTot = 0, co2 = 0, reGen = 0, nuc = 0, maxCost = null, marg = null;
        s.plants.forEach(p => {
            const d = tr.sent[p.id] * tr.scale[p.id];
            delivered[p.id] = d; dTot += d;
            co2 += d * (p.co2 || 0);
            if (["solar", "wind", "hydro", "bio"].includes(p.kind)) reGen += d;
            if (p.kind === "nuclear") nuc += d;
            if (d > 1) { const c = srcCost(p); if (maxCost == null || c > maxCost) { maxCost = c; marg = p; } }
        });
        const reserve = s.plants.reduce((a, p) => a + Math.max(0, tr.out[p.id] - delivered[p.id]), 0);
        const short = tr.deficit;
        const fPre = short > 1 ? Math.max(47, 50 - 25 * short / Math.max(1, tr.totalDemand)) : 50;
        return {
            demand: tr.totalDemand, loss: 0, supply: dTot, imp: delivered.import || 0,
            fShown: fPre, fPre, shed: short, surplus: 0, reserve,
            price: short > 1 ? s.voll : Math.max(0, maxCost || 0), priceBy: marg ? plantName(marg) : null, curt: 0,
            co2, intensity: dTot > 0 ? co2 / dTot * 1000 : 0,
            re: dTot > 0 ? reGen / dTot : 0, lowc: dTot > 0 ? (reGen + nuc) / dTot : 0
        };
    }

    function renderKPIs() {
        const s = sc(), k = kpiValues();
        setKPI("k-demand", GW(k.demand), k.loss ? t("kpi.demand.sub", { v: k.loss }) : "");
        setKPI("k-gen", GW(k.supply), t("kpi.gen.sub", { v: nf(Math.round(k.imp)) }));
        const fBad = k.shed > 1, fHigh = k.surplus > 1;
        setKPI("k-freq", nf(k.fShown, 2) + "<small>" + t("unit.hz") + "</small>",
            fBad ? t("kpi.freq.pre", { v: nf(k.fPre, 2) }) : fHigh ? t("kpi.freq.high") : t("kpi.freq.ok"),
            fBad || fHigh ? "bad" : (state.mode === "real" && k.reserve < s.reserveReq ? "warn" : "good"));
        const fNeedle = fBad ? k.fPre : fHigh ? 50.6 : k.fShown;
        $("freqNeedle").style.left = Math.max(0, Math.min(100, (fNeedle - 48) / 4 * 100)) + "%";
        const resCls = k.reserve >= s.reserveReq ? "good" : k.reserve >= s.reserveReq * 0.5 ? "warn" : "bad";
        setKPI("k-reserve", MW(k.reserve), t("kpi.reserve.sub", { v: nf(s.reserveReq) }), state.mode === "real" ? resCls : null);
        let priceSub = k.priceBy ? t("kpi.price.sub", { v: k.priceBy }) : "";
        if (k.shed > 1) priceSub = t("kpi.price.voll");
        else if (k.price === 0 && (k.curt > 1 || k.surplus > 1)) priceSub = t("kpi.price.zero");
        setKPI("k-price", money(k.price) + "<small>/MWh</small>", priceSub, k.shed > 1 ? "bad" : null);
        setKPI("k-co2", nf(Math.round(k.intensity)) + "<small>" + t("unit.gkwh") + "</small>", t("kpi.co2.sub", { v: nf(Math.round(k.co2)) }),
            k.intensity < 150 ? "good" : k.intensity < 400 ? null : "warn");
        setKPI("k-re", pct(k.re), t("kpi.re.sub", { v: nf(k.lowc * 100, 0) }), k.re >= 0.5 ? "good" : null);
        setKPI("k-shed", MW(k.shed), k.shed > 1 ? t("kpi.shed.some") : t("kpi.shed.none"), k.shed > 1 ? "bad" : "good");
    }

    function renderPlants() {
        const s = sc(), ps = per();
        const isTrain = state.mode === "train";
        const st = isTrain ? null : sim.steps[state.step];
        s.plants.forEach(p => {
            const card = $("pc-" + p.id);
            if (!card) return;
            const cap = ps.caps[p.id];
            const on = ps.enabled[p.id];
            let v = 0, vs = t("unit.mw") + " " + t("plant.now"), avail = 0, m2 = "", pill = "";
            if (isTrain) {
                avail = train.avail[p.id];
                v = train.sent[p.id] * train.scale[p.id];
                m2 = t("plant.set") + ": " + MW(ps.setpoints[p.id]);
            } else {
                avail = st.avail[p.id] ?? 0;
                if (E.isStorage(p)) {
                    const c = st.charge[p.id] || 0, d = st.discharge[p.id] || 0;
                    v = d > 0.5 ? d : -c;
                    const E0 = E.effectiveCap(s, p, settings()) * p.hours;
                    const socPct = E0 > 0 ? st.soc[p.id] / E0 : 0;
                    m2 = t("plant.soc") + " " + pct(socPct) + " · " + t(c > 0.5 ? "plant.charging" : d > 0.5 ? "plant.discharging" : "plant.idle");
                } else if (p.kind === "import") {
                    v = st.imp > 0.5 ? st.imp : -st.exp;
                    if (st.exp > 0.5) m2 = t("plant.export") + " " + MW(st.exp);
                } else {
                    v = st.gen[p.id] || 0;
                    if (E.isVRE(p) && avail - v > 1) m2 = t("plant.curt") + " " + MW(avail - v);
                    else if (p.min && on) m2 = t("plant.min") + " " + pct(E.seasonal(p.min, state.season));
                }
            }
            card.querySelector("[data-v]").textContent = nf(Math.round(v));
            card.querySelector("[data-vs]").textContent = vs;
            const denom = Math.max(1, cap);
            let outW = Math.abs(v) / denom;
            if (!isTrain && E.isStorage(p)) {
                const E0 = E.effectiveCap(s, p, settings()) * p.hours;
                outW = E0 > 0 ? st.soc[p.id] / E0 : 0;
            }
            card.querySelector("[data-out]").style.width = Math.min(100, outW * 100) + "%";
            card.querySelector("[data-avail]").style.width = Math.min(100, avail / denom * 100) + "%";
            card.querySelector("[data-m1]").textContent = t("plant.avail") + ": " + MW(avail);
            card.querySelector("[data-m2]").textContent = m2;
            card.querySelector("[data-capv]").textContent = MW(isTrain ? ps.setpoints[p.id] : cap);
            const slider = card.querySelector("[data-plant]");
            if (document.activeElement !== slider) slider.value = isTrain ? ps.setpoints[p.id] : cap;
            slider.disabled = isTrain ? (ps.auto || !on) : false;
            const btn = card.querySelector("[data-toggle]");
            btn.textContent = t(on ? "plant.on" : "plant.off");
            btn.classList.toggle("is-off", !on);
            card.classList.toggle("off", !on);
            if (p.future) pill = `<span class="pill future">${t("plant.future")}</span>`;
            else if (state.trip && s.largestUnit.plant === p.id) pill = `<span class="pill bad">N-1 −${nf(s.largestUnit.mw)} MW</span>`;
            else if (p.gas && state.gas < 100) pill = `<span class="pill warn">⛽ ${state.gas}%</span>`;
            card.querySelector("[data-pill]").innerHTML = pill;
        });
    }

    function renderConsumers() {
        const s = sc();
        const st = state.mode === "real" ? sim.steps[state.step] : null;
        s.consumers.forEach(c => {
            const card = $("cc-" + c.id);
            if (!card) return;
            const dem = st ? st.dem[c.id] : train.demand[c.id];
            const got = st ? st.served[c.id] : Math.min(train.got[c.id], dem);
            const shed = st ? st.shedBy[c.id] : Math.max(0, dem - got);
            const share = dem > 0.5 ? got / dem : 1;
            card.querySelector("[data-v]").textContent = nf(Math.round(got));
            card.querySelector("[data-vs]").textContent = "/ " + MW(dem);
            card.querySelector("[data-out]").style.width = Math.min(100, share * 100) + "%";
            card.querySelector("[data-m1]").textContent = t("cons.served") + " " + pct(share);
            card.querySelector("[data-m2]").textContent = shed > 1 ? t("cons.shed") + " " + MW(shed) : "";
            card.querySelector("[data-scalev]").textContent = Math.round(per().scales[c.id] * 100) + "%";
            card.classList.toggle("short", shed > 1);
        });
    }

    function renderMatrix() {
        const s = sc(), ps = per(), tr = train;
        $("autoBtn").textContent = t(ps.auto ? "matrix.autoOn" : "matrix.autoOff");
        $("autoBtn").setAttribute("aria-pressed", String(ps.auto));
        $("matrix").querySelectorAll("[data-r]").forEach(el => {
            const [p, c] = el.dataset.r.split("|");
            const v = ps.routes[p]?.[c] || 0;
            if (document.activeElement !== el) el.value = v ? Math.round(v) : "";
            el.placeholder = "0";
            el.disabled = ps.auto || !ps.enabled[p];
        });
        s.plants.forEach(p => {
            const cell = $("ms-" + p.id);
            if (!cell) return;
            cell.innerHTML = `<b>${nf(Math.round(tr.sent[p.id]))}</b> / ${nf(Math.round(tr.out[p.id]))}`;
            cell.className = tr.sent[p.id] > tr.out[p.id] + 1 ? "bad" : "";
        });
        s.consumers.forEach(c => {
            const cell = $("mg-" + c.id);
            cell.innerHTML = `<b>${nf(Math.round(tr.got[c.id]))}</b> / ${nf(Math.round(tr.demand[c.id]))}`;
            cell.className = Math.abs(tr.got[c.id] - tr.demand[c.id]) <= Math.max(2, tr.demand[c.id] * 0.005) ? "ok" : "warn";
        });
    }

    /* ---------- energiya oqimi (SVG) ---------- */
    let flowKey = "";
    function buildFlow() {
        const s = sc();
        const svg = $("flow");
        const W = 1000, rowH = 46, nL = s.plants.length, nR = s.consumers.length;
        const H = Math.max(nL, nR) * rowH + 16;
        const yL = i => 8 + (H - 16) * (i + 0.5) / nL;
        const yR = i => 8 + (H - 16) * (i + 0.5) / nR;
        const isTrain = state.mode === "train";
        let html = "";
        // chiziqlar
        if (isTrain) {
            s.plants.forEach((p, i) => s.consumers.forEach((c, j) => {
                const x1 = 300, y1 = yL(i), x2 = 700, y2 = yR(j), mx = 500;
                html += `<path class="line" id="fl-${p.id}-${c.id}" d="M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}" stroke="${p.color}"/>`;
            }));
        } else {
            s.plants.forEach((p, i) => { html += `<path class="line" id="fl-${p.id}" d="M300,${yL(i)} L455,${yL(i)}" stroke="${p.color}"/>`; });
            s.consumers.forEach((c, j) => { html += `<path class="line" id="fr-${c.id}" d="M545,${yR(j)} L700,${yR(j)}" stroke="${c.color}"/>`; });
            html += `<rect class="bus" x="455" y="4" width="90" height="${H - 8}" rx="14"/>`;
            html += `<text class="bus-label" transform="translate(${500 - 2},${H / 2}) rotate(-90)" text-anchor="middle">${esc(t("flow.bus"))} · ${t("flow.bus2")}</text>`;
        }
        // tugunlar
        s.plants.forEach((p, i) => {
            const y = yL(i) - 18;
            html += `<g class="node" id="fn-${p.id}"><rect x="2" y="${y}" width="296" height="36" rx="10"/>
                <text x="14" y="${y + 15}">${p.icon} ${esc(plantName(p))}</text><text class="mw" x="14" y="${y + 30}" data-t></text></g>`;
        });
        s.consumers.forEach((c, j) => {
            const y = yR(j) - 18;
            html += `<g class="node" id="fc-${c.id}"><rect x="702" y="${y}" width="296" height="36" rx="10"/>
                <text x="714" y="${y + 15}">${c.icon} ${esc(consName(c))}</text><text class="mw" x="714" y="${y + 30}" data-t></text></g>`;
        });
        svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
        svg.innerHTML = html;
        flowKey = state.scen + state.mode + state.lang;
    }

    function setLine(el, mw, max, reverse) {
        if (!el) return;
        if (mw > 1) {
            el.setAttribute("class", "line anim" + (reverse ? " neg" : ""));
            el.style.strokeWidth = (1.5 + 12 * Math.min(1, mw / max)).toFixed(1);
            el.style.animationDirection = reverse ? "reverse" : "normal";
            el.style.stroke = "";
        } else {
            el.setAttribute("class", "line idle");
            el.style.strokeWidth = "";
        }
    }

    function renderFlow() {
        if (flowKey !== state.scen + state.mode + state.lang) buildFlow();
        const s = sc(), ps = per();
        if (state.mode === "real") {
            const st = sim.steps[state.step];
            const vals = {};
            let max = 1;
            s.plants.forEach(p => {
                let v = 0, rev = false;
                if (E.isStorage(p)) { const c = st.charge[p.id] || 0, d = st.discharge[p.id] || 0; v = d > 0.5 ? d : c; rev = c > 0.5; }
                else if (p.kind === "import") { v = st.imp > 0.5 ? st.imp : st.exp; rev = st.exp > 0.5; }
                else v = st.gen[p.id] || 0;
                vals[p.id] = { v, rev };
                max = Math.max(max, v);
            });
            s.consumers.forEach(c => { max = Math.max(max, st.served[c.id]); });
            s.plants.forEach(p => {
                setLine($("fl-" + p.id), vals[p.id].v, max, vals[p.id].rev);
                const g = $("fn-" + p.id);
                g.classList.toggle("off", !ps.enabled[p.id]);
                g.querySelector("[data-t]").textContent = (vals[p.id].rev ? "−" : "") + MW(vals[p.id].v);
            });
            s.consumers.forEach(c => {
                setLine($("fr-" + c.id), st.served[c.id], max, false);
                const g = $("fc-" + c.id);
                g.classList.toggle("short", st.shedBy[c.id] > 1);
                g.querySelector("[data-t]").textContent = MW(st.served[c.id]) + " / " + MW(st.dem[c.id]);
            });
        } else {
            const tr = train;
            let max = 1;
            s.plants.forEach(p => s.consumers.forEach(c => { max = Math.max(max, (ps.routes[p.id]?.[c.id] || 0) * tr.scale[p.id]); }));
            s.plants.forEach(p => {
                s.consumers.forEach(c => setLine($(`fl-${p.id}-${c.id}`), (ps.routes[p.id]?.[c.id] || 0) * tr.scale[p.id], max, false));
                const g = $("fn-" + p.id);
                g.classList.toggle("off", !ps.enabled[p.id]);
                g.querySelector("[data-t]").textContent = MW(tr.sent[p.id] * tr.scale[p.id]) + " / " + MW(tr.out[p.id]);
            });
            s.consumers.forEach(c => {
                const g = $("fc-" + c.id);
                const short = tr.got[c.id] + 1 < tr.demand[c.id];
                g.classList.toggle("short", short);
                g.querySelector("[data-t]").textContent = MW(tr.got[c.id]) + " / " + MW(tr.demand[c.id]);
            });
        }
    }

    /* ---------- 24 soatlik grafik (canvas) ---------- */
    const chart = { canvas: null, ctx: null, w: 0, h: 0, pad: { l: 52, r: 14, t: 14, b: 30 } };

    function sizeChart() {
        const c = $("chart");
        const r = c.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        chart.canvas = c; chart.ctx = c.getContext("2d");
        chart.w = r.width; chart.h = r.height;
        c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr);
        chart.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function stackSeries() {
        const s = sc();
        return STACK_ORDER.map(id => s.plants.find(p => p.id === id)).filter(Boolean);
    }
    function valueOf(st, p) {
        if (p.kind === "import") return st.imp;
        if (E.isStorage(p)) return st.discharge[p.id] || 0;
        return st.gen[p.id] || 0;
    }

    function drawChart() {
        if (!sim) return;
        if (!chart.ctx) sizeChart();
        const { ctx, w, h, pad } = chart;
        const s = sc(), steps = sim.steps, series = stackSeries();
        const N = steps.length;
        ctx.clearRect(0, 0, w, h);

        let maxY = 0, minY = 0;
        steps.forEach(st => {
            let top = 0;
            series.forEach(p => { top += valueOf(st, p); });
            maxY = Math.max(maxY, top + st.curt, st.req);
            const neg = Object.values(st.charge).reduce((a, b) => a + b, 0) + st.exp;
            minY = Math.min(minY, -neg);
        });
        const niceStep = v => { const raw = v / 5; const mag = Math.pow(10, Math.floor(Math.log10(raw))); const n = raw / mag; return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * mag; };
        const tick = niceStep(maxY - minY || 1000);
        maxY = Math.ceil(maxY * 1.04 / tick) * tick;
        minY = minY < 0 ? Math.floor(minY * 1.1 / tick) * tick : 0;
        const X = i => pad.l + (w - pad.l - pad.r) * (i / (N - 1));
        const Y = v => pad.t + (h - pad.t - pad.b) * (1 - (v - minY) / (maxY - minY));

        // tun soyasi
        const [rise, set] = s.sun[state.season];
        ctx.fillStyle = "rgba(109, 74, 255, 0.06)";
        ctx.fillRect(X(0), pad.t, X(rise / 24 * (N - 1)) - X(0), h - pad.t - pad.b);
        ctx.fillRect(X(set / 24 * (N - 1)), pad.t, X(N - 1) - X(set / 24 * (N - 1)), h - pad.t - pad.b);

        // gorizontal chiziqlar
        ctx.font = "600 11px 'JetBrains Mono', monospace";
        ctx.fillStyle = "#57507a"; ctx.strokeStyle = "#ece6f5"; ctx.lineWidth = 1;
        ctx.textAlign = "right"; ctx.textBaseline = "middle";
        for (let v = minY; v <= maxY + 1e-6; v += tick) {
            ctx.beginPath(); ctx.moveTo(pad.l, Y(v)); ctx.lineTo(w - pad.r, Y(v)); ctx.stroke();
            ctx.fillText(nf(v / 1000, tick < 1000 ? 1 : 0), pad.l - 6, Y(v));
        }
        ctx.save(); ctx.translate(12, pad.t + (h - pad.t - pad.b) / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = "center"; ctx.fillText(t("unit.gw"), 0, 0); ctx.restore();
        ctx.textAlign = "center"; ctx.textBaseline = "top";
        for (let hr = 0; hr <= 24; hr += 3) {
            const i = Math.min(N - 1, hr * 4);
            ctx.fillText(String(hr).padStart(2, "0") + ":00", hr === 24 ? X(N - 1) - 14 : X(i), h - pad.b + 8);
        }

        // musbat stek
        const base = new Array(N).fill(0);
        series.forEach(p => {
            const top = steps.map((st, i) => base[i] + valueOf(st, p));
            ctx.beginPath();
            ctx.moveTo(X(0), Y(base[0]));
            for (let i = 0; i < N; i++) ctx.lineTo(X(i), Y(top[i]));
            for (let i = N - 1; i >= 0; i--) ctx.lineTo(X(i), Y(base[i]));
            ctx.closePath();
            ctx.fillStyle = p.color; ctx.globalAlpha = 0.88; ctx.fill(); ctx.globalAlpha = 1;
            for (let i = 0; i < N; i++) base[i] = top[i];
        });
        // cheklangan energiya (curtailment) — shtrixli
        const hatch = (color) => {
            const pc = document.createElement("canvas"); pc.width = 8; pc.height = 8;
            const g = pc.getContext("2d"); g.strokeStyle = color; g.lineWidth = 2;
            g.beginPath(); g.moveTo(0, 8); g.lineTo(8, 0); g.stroke();
            return ctx.createPattern(pc, "repeat");
        };
        if (steps.some(st => st.curt > 1)) {
            ctx.beginPath();
            ctx.moveTo(X(0), Y(base[0]));
            for (let i = 0; i < N; i++) ctx.lineTo(X(i), Y(base[i] + steps[i].curt));
            for (let i = N - 1; i >= 0; i--) ctx.lineTo(X(i), Y(base[i]));
            ctx.closePath(); ctx.fillStyle = hatch("#ffb020"); ctx.fill();
        }
        // o'chirilgan yuklama — qizil shtrix
        if (steps.some(st => st.unmet > 1)) {
            ctx.beginPath();
            ctx.moveTo(X(0), Y(base[0]));
            for (let i = 0; i < N; i++) ctx.lineTo(X(i), Y(base[i] + steps[i].unmet));
            for (let i = N - 1; i >= 0; i--) ctx.lineTo(X(i), Y(base[i]));
            ctx.closePath(); ctx.fillStyle = hatch("#e11d48"); ctx.fill();
        }
        // manfiy stek: zaryad va eksport
        const nb = new Array(N).fill(0);
        const negSeries = s.plants.filter(p => E.isStorage(p) || p.kind === "import");
        negSeries.forEach(p => {
            const vals = steps.map(st => p.kind === "import" ? st.exp : (st.charge[p.id] || 0));
            if (!vals.some(v => v > 1)) return;
            const bot = nb.map((b, i) => b - vals[i]);
            ctx.beginPath();
            ctx.moveTo(X(0), Y(nb[0]));
            for (let i = 0; i < N; i++) ctx.lineTo(X(i), Y(bot[i]));
            for (let i = N - 1; i >= 0; i--) ctx.lineTo(X(i), Y(nb[i]));
            ctx.closePath(); ctx.fillStyle = p.color; ctx.globalAlpha = 0.45; ctx.fill(); ctx.globalAlpha = 1;
            for (let i = 0; i < N; i++) nb[i] = bot[i];
        });
        if (minY < 0) { ctx.strokeStyle = "#1b1440"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.l, Y(0)); ctx.lineTo(w - pad.r, Y(0)); ctx.stroke(); }

        // talab chizig'i
        ctx.beginPath();
        steps.forEach((st, i) => { i ? ctx.lineTo(X(i), Y(st.req)) : ctx.moveTo(X(i), Y(st.req)); });
        ctx.strokeStyle = "#1b1440"; ctx.lineWidth = 2.5; ctx.setLineDash([]); ctx.stroke();

        // joriy vaqt kursori
        const cx = X(state.step);
        ctx.strokeStyle = "#ff5c8a"; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
        ctx.beginPath(); ctx.moveTo(cx, pad.t); ctx.lineTo(cx, h - pad.b); ctx.stroke(); ctx.setLineDash([]);
        const cy = Y(steps[state.step].req);
        ctx.fillStyle = "#fff"; ctx.strokeStyle = "#1b1440"; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        const label = hhmm(state.step) + " · " + GW(steps[state.step].req);
        ctx.font = "700 11px 'JetBrains Mono', monospace";
        const tw = ctx.measureText(label).width + 12;
        const lx = Math.min(Math.max(cx - tw / 2, pad.l), w - pad.r - tw);
        ctx.fillStyle = "#1b1440";
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(lx, pad.t, tw, 20, 6) : ctx.rect(lx, pad.t, tw, 20); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
        ctx.fillText(label, lx + 6, pad.t + 10);
    }

    function buildLegend() {
        const s = sc();
        const items = stackSeries().slice().reverse().map(p => `<span style="--c:${p.color}">${esc(plantName(p))}</span>`);
        items.push(`<span class="line">${t("chart.demand")}</span>`);
        items.push(`<span class="hatch" style="--c:#ffb020">${t("chart.curt")}</span>`);
        items.push(`<span class="hatch" style="--c:#e11d48">${t("chart.shed")}</span>`);
        items.push(`<span style="--c:rgba(16,185,129,.45)">${t("chart.charge")}</span>`);
        $("legend").innerHTML = items.join("");
    }

    /* ---------- kunlik hisobot ---------- */
    function renderSummary() {
        const s = sc(), m = sim.summary;
        const rows = [
            ["sum.cons", GW(m.req, 0).replace(t("unit.gw"), t("unit.gwh"))],
            ["sum.re", pct(m.reShare)],
            ["sum.lowc", pct(m.lowCarbonShare)],
            ["sum.int", nf(Math.round(m.intensity)) + "<small>" + t("unit.gkwh") + "</small>"],
            ["sum.co2", nf(m.co2 / 1000, 1) + "<small>" + t("unit.kt") + "</small>"],
            ["sum.cost", s.currency + nf(m.cost / 1e6, 1) + "<small>mln</small>"],
            ["sum.peak", GW(m.peak.v) + "<small>" + hhmm(Math.round(m.peak.h * 4)) + "</small>"],
            ["sum.low", GW(m.low.v) + "<small>" + hhmm(Math.round(m.low.h * 4)) + "</small>"],
            ["sum.curt", nf(m.curt / 1000, 1) + "<small>" + t("unit.gwh") + "</small>"],
            ["sum.unserved", nf(Math.round(m.shed)) + "<small>" + t("unit.mwh") + "</small>"],
            ["sum.import", nf(m.imp / 1000, 1) + " / " + nf(m.exp / 1000, 1) + "<small>" + t("unit.gwh") + "</small>"]
        ];
        $("summary").innerHTML = rows.map(([k, v]) => `<div><dt>${t(k)}</dt><dd>${v}</dd></div>`).join("");
        const total = Object.values(m.bySource).reduce((a, b) => a + b, 0) || 1;
        $("mixbar").innerHTML = stackSeries().map(p => {
            const share = (m.bySource[p.id] || 0) / total;
            return share > 0.002 ? `<i style="width:${(share * 100).toFixed(2)}%;background:${p.color}" title="${esc(plantName(p))}: ${pct(share)}"></i>` : "";
        }).join("");
    }

    /* ---------- muhandislik nazorati ---------- */
    function renderLog() {
        const s = sc(), ps = per();
        const items = [];
        const add = (cls, text) => items.push(`<li class="${cls}">${esc(text)}</li>`);
        if (state.mode === "train") {
            const tr = train;
            let bad = false;
            s.plants.forEach(p => { if (tr.sent[p.id] > tr.out[p.id] + 1) { bad = true; add("bad", t("log.train.over", { p: plantName(p), s: nf(Math.round(tr.sent[p.id])), a: nf(Math.round(tr.out[p.id])) })); } });
            s.consumers.forEach(c => {
                const d = tr.demand[c.id] - tr.got[c.id];
                if (d > Math.max(2, tr.demand[c.id] * 0.005)) { bad = true; add("warn", t("log.train.deficit", { c: consName(c), v: nf(Math.round(d)) })); }
                else if (-d > Math.max(2, tr.demand[c.id] * 0.005)) add("info", t("log.train.extra", { c: consName(c), v: nf(Math.round(-d)) }));
            });
            if (!bad) items.unshift(`<li class="ok">${esc(t("log.train.ok"))}</li>`);
            $("log").innerHTML = items.join("");
            return;
        }
        const st = sim.steps[state.step], m = sim.summary;
        let problem = false;
        if (st.shed > 1) {
            problem = true;
            const list = s.consumers.filter(c => st.shedBy[c.id] > 1).map(c => consName(c)).join(", ");
            add("bad", t("log.shedNow", { v: nf(Math.round(st.shed)), list }));
        }
        if (m.shedSteps > 0) { problem = true; add("bad", t("log.shedDay", { n: m.shedSteps, v: nf(Math.round(m.shed)) })); }
        if (st.reserve < s.reserveReq) { problem = true; add("warn", t("log.reserve", { v: nf(Math.round(st.reserve)), r: nf(s.reserveReq) })); }
        if (st.surplus > 1) { problem = true; add("bad", t("log.surplus", { v: nf(Math.round(st.surplus)) })); }
        if (st.curt > 1) add("warn", t("log.curt", { v: nf(Math.round(st.curt)) }));
        if (state.trip) { const p = s.plants.find(x => x.id === s.largestUnit.plant); add("warn", t("log.trip", { p: plantName(p), v: nf(s.largestUnit.mw) })); }
        if (state.gas < 100) add("warn", t("log.gas", { v: state.gas }));
        if (st.imp > 1) add("info", t("log.import", { v: nf(Math.round(st.imp)) }));
        if (st.exp > 1) add("info", t("log.export", { v: nf(Math.round(st.exp)) }));
        s.plants.filter(E.isStorage).forEach(p => {
            if (!ps.enabled[p.id]) return;
            const E0 = E.effectiveCap(s, p, settings()) * p.hours;
            if (E0 <= 0) return;
            const c = st.charge[p.id] || 0, d = st.discharge[p.id] || 0;
            add("info", t("log.storage", { p: plantName(p), s: t(c > 0.5 ? "plant.charging" : d > 0.5 ? "plant.discharging" : "plant.idle"), v: nf(st.soc[p.id] / E0 * 100, 0) }));
        });
        const solar = s.plants.find(p => p.id === "solar");
        if (solar && ps.enabled.solar && st.avail.solar < 1) add("info", t("log.night"));
        const nets = sim.steps.map(x => x.net);
        add("info", t("log.duck", { min: nf(Math.round(Math.min(...nets))), max: nf(Math.round(Math.max(...nets))) }));
        const nuc = s.plants.find(p => p.future);
        if (nuc && !ps.enabled[nuc.id]) add("info", t("log.nuclear"));
        if (!problem) items.unshift(`<li class="ok">${esc(t("log.ok"))}</li>`);
        $("log").innerHTML = items.join("");
    }

    /* =========================================================
       HODISALAR
       ========================================================= */
    function setLang(lang) {
        if (!L[lang]) lang = "uz";
        state.lang = lang;
        try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* ixtiyoriy */ }
        applyStatic();
        rebuild();
    }

    function rebuild() {
        buildPlants();
        buildConsumers();
        buildMatrix();
        buildLegend();
        flowKey = "";
        recompute();
    }

    function stopTimer() { clearInterval(state.timer); state.timer = null; }
    function startTimer() {
        stopTimer();
        state.timer = setInterval(() => { state.step = (state.step + 1) % E.STEPS; renderAll(); }, SPEED_MS[state.speed]);
    }

    document.querySelectorAll(".lang-btn").forEach(b => b.addEventListener("click", () => setLang(b.dataset.lang)));

    document.querySelectorAll(".scen").forEach(b => b.addEventListener("click", () => {
        if (state.scen === b.dataset.scen) return;
        state.scen = b.dataset.scen;
        rebuild();
    }));

    document.querySelectorAll(".seg[data-group]").forEach(g => g.addEventListener("click", e => {
        const btn = e.target.closest("button[data-val]");
        if (!btn) return;
        const key = g.dataset.group, val = btn.dataset.val;
        if (key === "speed") { state.speed = +val; if (state.timer) startTimer(); syncControls(); return; }
        if (state[key] === val) return;
        state[key] = val;
        if (key === "mode") { applyStatic(); rebuild(); return; }
        if (key === "season") buildPlants();   // import narxi faslga bog'liq
        recompute();
    }));

    $("gasSlider").addEventListener("input", e => { state.gas = +e.target.value; recompute(); });
    $("tripBtn").addEventListener("click", () => { state.trip = !state.trip; recompute(); });
    $("resetBtn").addEventListener("click", () => {
        stopTimer();
        state.per[state.scen] = defaultsFor(state.scen);
        Object.assign(state, { season: defaultSeason, weather: "sunny", dayType: "work", gas: 100, trip: false, step: 48 });
        rebuild();
    });
    $("playBtn").addEventListener("click", () => { state.timer ? stopTimer() : startTimer(); syncControls(); });
    $("hourSlider").addEventListener("input", e => { state.step = +e.target.value; renderAll(); });
    $("autoBtn").addEventListener("click", () => { per().auto = !per().auto; renderAll(); });
    $("clearBtn").addEventListener("click", () => {
        const ps = per(); ps.auto = false; ps.routes = {};
        sc().plants.forEach(p => { ps.routes[p.id] = {}; });
        renderAll();
    });

    $("chart").addEventListener("click", e => {
        const r = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - r.left;
        const frac = (x - chart.pad.l) / (r.width - chart.pad.l - chart.pad.r);
        state.step = Math.max(0, Math.min(E.STEPS - 1, Math.round(frac * (E.STEPS - 1))));
        renderAll();
    });

    if ("ResizeObserver" in window) new ResizeObserver(() => { sizeChart(); drawChart(); }).observe($("chart").parentElement);
    else window.addEventListener("resize", () => { sizeChart(); drawChart(); });

    /* ---------- boshlash ---------- */
    let saved = null;
    try { saved = localStorage.getItem(LANG_KEY); } catch (e) { /* ixtiyoriy */ }
    state.lang = saved && L[saved] ? saved : "uz";
    applyStatic();
    rebuild();
})();
