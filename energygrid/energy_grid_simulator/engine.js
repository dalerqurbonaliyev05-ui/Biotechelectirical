/* =========================================================
   Energy Grid Simulator v2 — hisoblash dvigateli (engine)
   Sof funksiyalar: DOM ishlatilmaydi, Node'da ham test qilinadi.

   Model (soddalashtirilgan, lekin real mantiqqa asoslangan):
   - 24 soat, 15 daqiqalik qadam (96 qadam).
   - Iste'molchilar talabi: fasl, kun turi va soatga bog'liq profil.
   - Quyosh / shamol: fasl, ob-havo va soatga bog'liq mavjud quvvat.
   - Dispetcher: merit-order (avval arzon manba), texnik minimum,
     ramp (quvvatni o'zgartirish tezligi) cheklovlari.
   - Akkumulyator / GAES: ortiqcha energiyada zaryad, cho'qqida razryad.
   - Import / eksport, curtailment, yuklamani prioritet bo'yicha o'chirish.
   - Chastota, aylanma zaxira (N-1), narx va CO2.
   ========================================================= */
(function (root) {
    "use strict";

    const DT = 0.25;          // soat
    const STEPS = 96;         // 24 / 0.25
    const EPS = 1e-6;
    const SEASONS = ["winter", "spring", "summer", "autumn"];

    const WEATHER = {
        sunny:  { solar: 1.00, wind: 0.85, cloudNoise: 0.04 },
        cloudy: { solar: 0.32, wind: 1.15, cloudNoise: 0.28 },
        windy:  { solar: 0.80, wind: 1.90, cloudNoise: 0.15 },
        calm:   { solar: 0.97, wind: 0.25, cloudNoise: 0.04 }
    };

    /* ---------- yordamchi funksiyalar ---------- */
    const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

    // 24 soatlik aylana bo'yicha Gauss "do'ngligi"
    function bump(h, c, w) {
        let d = Math.abs(h - c);
        d = Math.min(d, 24 - d);
        return Math.exp(-0.5 * (d / w) * (d / w));
    }
    function smoothstep(e0, e1, x) {
        const t = clamp((x - e0) / (e1 - e0), 0, 1);
        return t * t * (3 - 2 * t);
    }
    // deterministik psevdo-tasodifiy son [-1, 1]
    function hash(n) {
        const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
        return (x - Math.floor(x)) * 2 - 1;
    }
    // silliq shovqin (bir xil kirishda doim bir xil natija)
    function noise(seed, t) {
        const i = Math.floor(t), f = t - i;
        const a = hash(seed * 131 + i), b = hash(seed * 131 + i + 1);
        const s = f * f * (3 - 2 * f);
        return a + (b - a) * s;
    }
    function seasonal(v, season) {
        if (v == null) return 0;
        return typeof v === "object" ? (v[season] ?? 0) : v;
    }
    function envSeed(sc, env) {
        return sc.seed * 17 + SEASONS.indexOf(env.season) * 5 + Object.keys(WEATHER).indexOf(env.weather) + 1;
    }

    /* ---------- tabiiy manbalar ---------- */
    function solarFactor(sc, env, h) {
        const [rise, set, peak] = sc.sun[env.season];
        if (h <= rise || h >= set) return 0;
        const x = (h - rise) / (set - rise);
        const base = Math.pow(Math.sin(Math.PI * x), 1.25) * peak;
        const w = WEATHER[env.weather];
        const n = 1 + w.cloudNoise * noise(envSeed(sc, env) + 3, h * 1.6);
        return clamp(base * w.solar * n, 0, 1);
    }

    function windFactor(sc, env, h, offshore) {
        const base = sc.windSeason[env.season];
        const di = 1 + sc.windDiurnal.amp * Math.cos((h - sc.windDiurnal.peak) / 24 * 2 * Math.PI);
        let cf = base * di * WEATHER[env.weather].wind * (offshore ? 1.35 : 1);
        cf *= 1 + 0.18 * noise(envSeed(sc, env) + (offshore ? 29 : 7), h * 0.7);
        return clamp(cf, 0.02, 0.93);
    }

    function daylight(sc, env, h) {
        const [rise, set] = sc.sun[env.season];
        return smoothstep(rise - 0.2, rise + 0.7, h) * (1 - smoothstep(set - 0.7, set + 0.2, h));
    }

    /* ---------- iste'molchilar profili ---------- */
    const SHAPES = {
        residential: (h, sc) => 0.42 + 0.22 * bump(h, 7.5, 1.4) + 0.58 * bump(h, sc.eveningPeak, 2.0),
        industry:    (h) => 0.86 + 0.14 * bump(h, 11, 4),
        commercial:  (h) => 0.32 + 0.68 * bump(h, 13.8, 4.2),
        irrigation:  (h) => 0.82 + 0.18 * bump(h, 2.5, 4),
        transport:   (h) => 0.35 + 0.45 * bump(h, 8.3, 1.4) + 0.50 * bump(h, 18.3, 1.7),
        transportEV: (h) => 0.30 + 0.35 * bump(h, 8, 1.4) + 0.35 * bump(h, 17.8, 1.6) + 0.45 * bump(h, 21.5, 2.2) + 0.15 * bump(h, 13, 2),
        critical:    (h) => 0.80 + 0.20 * bump(h, 11, 5),
        flat:        (h) => 0.97 + 0.03 * bump(h, 15, 6),
        heat:        (h) => 0.50 + 0.35 * bump(h, 7, 2) + 0.50 * bump(h, 20, 3) - 0.15 * bump(h, 14, 3),
        cool:        (h) => 0.20 + 0.80 * bump(h, 16, 3.2)
    };

    function consumerDemand(sc, c, env, h, settings) {
        let shape;
        let amp = c.base;
        if (c.shape === "climate") {
            const mode = c.modes[env.season];
            amp = c.amp[env.season];
            shape = mode === "mix" ? 0.5 * SHAPES.heat(h) + 0.5 * SHAPES.cool(h) : SHAPES[mode](h);
        } else if (c.shape === "lighting") {
            shape = 0.05 + 0.95 * (1 - daylight(sc, env, h));
        } else {
            shape = SHAPES[c.shape](h, sc);
        }
        const season = c.season ? seasonal(c.season, env.season) : 1;
        const weekend = env.day === "weekend" ? (c.weekend ?? 1) : 1;
        const wobble = 1 + 0.02 * noise(envSeed(sc, env) + c.base % 97, h * 0.9);
        const scale = settings.scales[c.id] ?? 1;
        return Math.max(0, amp * shape * season * weekend * wobble * scale * sc.demandScale);
    }

    /* ---------- stansiyalar ---------- */
    const isStorage = p => p.kind === "battery" || p.kind === "pumped";
    const isVRE = p => p.kind === "solar" || p.kind === "wind";

    function effectiveCap(sc, p, settings) {
        if (!settings.enabled[p.id]) return 0;
        let cap = settings.caps[p.id] ?? p.cap;
        if (settings.trip && sc.largestUnit && sc.largestUnit.plant === p.id) cap = Math.max(0, cap - sc.largestUnit.mw);
        return cap;
    }

    function plantAvail(sc, p, env, h, settings) {
        const cap = effectiveCap(sc, p, settings);
        if (cap <= 0) return 0;
        switch (p.kind) {
            case "solar": return cap * solarFactor(sc, env, h);
            case "wind":  return cap * windFactor(sc, env, h, p.offshore);
            case "hydro": return cap * sc.hydroSeason[env.season];
            case "battery":
            case "pumped":
            case "import": return cap;
            default: {
                let a = p.avail == null ? 1 : seasonal(p.avail, env.season);
                if (p.gas) a *= settings.gasSupply;
                return cap * a;
            }
        }
    }

    function costOf(sc, p, env) {
        if (p.kind === "import") return seasonal(p.price, env.season);
        return seasonal(p.cost, env.season);
    }

    /* ---------- merit-order ---------- */
    function merit(items, load) {
        const o = {};
        let sum = 0;
        items.forEach(it => { o[it.id] = it.lo; sum += it.lo; });
        let rem = load - sum;
        if (rem < -EPS) return { o, unmet: 0, surplus: -rem, marginal: null };
        let marginal = null;
        const sorted = items.slice().sort((a, b) => a.cost - b.cost);
        for (const it of sorted) {
            if (rem <= EPS) break;
            const room = it.up - it.lo;
            if (room <= EPS) continue;
            const x = Math.min(room, rem);
            o[it.id] += x;
            rem -= x;
            marginal = it;
        }
        return { o, unmet: Math.max(0, rem), surplus: 0, marginal };
    }

    /* ---------- bitta 15 daqiqalik qadam ---------- */
    function step(sc, settings, env, s, thr, prev, soc) {
        const lossK = 1 + sc.lossPct / 100;
        const items = [];
        const lower = {}, upper = {};
        let vreUp = 0;

        sc.plants.forEach(p => {
            if (isStorage(p) || p.kind === "import") return;
            const a = s.avail[p.id];
            let lo = 0, up = a;
            if (!isVRE(p)) {
                lo = a * seasonal(p.min, env.season);
                if (prev && p.ramp < 1) {
                    const r = p.ramp * (settings.caps[p.id] ?? p.cap);
                    const pv = prev[p.id] || 0;
                    up = Math.max(0, Math.min(a, pv + r));
                    lo = Math.max(0, Math.min(up, Math.max(lo, pv - r)));
                }
            } else {
                vreUp += a;
            }
            lower[p.id] = lo; upper[p.id] = up;
            const cost = isVRE(p) ? (p.offshore ? -0.9 : p.kind === "solar" ? -1 : -0.95) : costOf(sc, p, env);
            items.push({ id: p.id, lo, up, cost, price: Math.max(0, cost) });
        });

        // akkumulyatorlar
        const stor = sc.plants.filter(isStorage).map(p => {
            const P = effectiveCap(sc, p, settings);
            const E = P * p.hours;
            const s0 = Math.min(soc[p.id] ?? E * 0.5, E);
            const [qLow, qHigh] = thr[p.kind];
            return {
                p, P, E, soc: s0,
                cMax: Math.max(0, Math.min(P, (E - s0) / (p.eff * DT))),
                dMax: Math.max(0, Math.min(P, s0 / DT)),
                mode: s.net <= qLow ? "charge" : s.net >= qHigh ? "discharge" : "idle",
                charge: 0, discharge: 0
            };
        });

        // import / eksport
        const impP = sc.plants.find(p => p.kind === "import");
        const impCap = impP ? effectiveCap(sc, impP, settings) : 0;
        const expCap = impCap > 0 ? sc.exportCap : 0;

        // A bosqich: ortiqcha arzon energiya bo'lsa — zaryad, eksport
        let L = s.req;
        let exp = 0;
        const loSum = items.reduce((t, it) => t + it.lo, 0);
        let excess = loSum + vreUp - L;
        if (excess > EPS) {
            stor.forEach(st => {
                const c = Math.min(st.cMax, excess);
                st.charge = c; excess -= c; L += c;
            });
            if (excess > EPS) { exp = Math.min(expCap, excess); excess -= exp; L += exp; }
        }

        // razryad va import elementlari
        const buildItems = () => {
            const list = items.slice();
            stor.forEach(st => {
                const up = st.charge > EPS ? 0 : st.dMax;
                const planned = st.mode === "discharge";
                list.push({ id: st.p.id, lo: 0, up, cost: planned ? 0.5 + (st.p.kind === "pumped" ? 0.1 : 0) : 900 + (st.p.kind === "pumped" ? 1 : 0), price: sc.storageValue, storage: true });
            });
            if (impCap > 0 && exp <= EPS) list.push({ id: impP.id, lo: 0, up: impCap, cost: costOf(sc, impP, env), price: costOf(sc, impP, env) });
            return list;
        };

        let all = buildItems();
        let res = merit(all, L);

        // B bosqich: rejalashtirilgan zaryad (arzon bo'sh quvvatdan)
        let replan = false;
        stor.forEach(st => {
            if (st.mode !== "charge" || st.cMax - st.charge <= EPS) return;
            const limit = sc.storageValue * st.p.eff;
            let spare = 0;
            all.forEach(it => {
                if (it.storage || it.cost > limit) return;
                spare += Math.max(0, it.up - res.o[it.id]);
            });
            const extra = Math.min(st.cMax - st.charge, spare);
            if (extra > EPS) { st.charge += extra; L += extra; replan = true; }
        });
        if (replan) { all = buildItems(); res = merit(all, L); }

        // natijalar
        const gen = {};
        sc.plants.forEach(p => { if (!isStorage(p) && p.kind !== "import") gen[p.id] = res.o[p.id] || 0; });
        stor.forEach(st => {
            st.discharge = st.charge > EPS ? 0 : (res.o[st.p.id] || 0);
            soc[st.p.id] = clamp(st.soc + st.charge * st.p.eff * DT - st.discharge * DT, 0, st.E);
        });
        const imp = impP ? (res.o[impP.id] || 0) : 0;

        let vreOut = 0;
        sc.plants.forEach(p => { if (isVRE(p)) vreOut += gen[p.id]; });
        const curt = Math.max(0, vreUp - vreOut);

        // yuklamani o'chirish (load shedding) — avval past prioritet
        const unmet = res.unmet;
        const shedBy = {}, served = {};
        sc.consumers.forEach(c => { shedBy[c.id] = 0; served[c.id] = s.dem[c.id]; });
        let shedNeed = unmet / lossK;
        [3, 2, 1].forEach(pr => {
            if (shedNeed <= EPS) return;
            const group = sc.consumers.filter(c => c.prio === pr);
            const tot = group.reduce((t, c) => t + s.dem[c.id], 0);
            if (tot <= EPS) return;
            const take = Math.min(tot, shedNeed);
            group.forEach(c => {
                const x = take * s.dem[c.id] / tot;
                shedBy[c.id] = x; served[c.id] = s.dem[c.id] - x;
            });
            shedNeed -= take;
        });
        const shed = Object.values(shedBy).reduce((a, b) => a + b, 0);

        // narx
        let price;
        if (unmet > 1) price = sc.voll;
        else if (curt > 1 || res.surplus > 1) price = 0;
        else if (res.marginal) price = res.marginal.price;
        else price = 0;

        // CO2 (t/soat) va xarajat (valyuta/soat)
        let co2 = 0, cost = 0;
        sc.plants.forEach(p => {
            if (isStorage(p) || p.kind === "import") return;
            co2 += gen[p.id] * (p.co2 || 0);
            if (!isVRE(p)) cost += gen[p.id] * Math.max(0, costOf(sc, p, env));
        });
        if (impP) { co2 += imp * impP.co2; cost += imp * costOf(sc, impP, env); }
        cost -= exp * sc.exportPrice;

        // aylanma zaxira (15 daqiqa ichida qo'shish mumkin bo'lgan quvvat)
        let reserve = 0;
        sc.plants.forEach(p => {
            if (isStorage(p) || p.kind === "import" || isVRE(p)) return;
            const capP = settings.caps[p.id] ?? p.cap;
            const head = Math.min(s.avail[p.id], gen[p.id] + p.ramp * capP) - gen[p.id];
            reserve += Math.max(0, head);
        });
        stor.forEach(st => { reserve += st.charge + Math.max(0, st.dMax - st.discharge); });
        if (impP) reserve += Math.max(0, impCap - imp);

        // chastota (avtomatik choralardan oldingi og'ish)
        let fPre = 50;
        if (unmet > 1) fPre = clamp(50 - 25 * unmet / s.req, 47, 50);
        else if (res.surplus > 1) fPre = clamp(50 + 20 * res.surplus / s.req, 50, 52);

        const charge = {}, discharge = {}, socOut = {};
        stor.forEach(st => { charge[st.p.id] = st.charge; discharge[st.p.id] = st.discharge; socOut[st.p.id] = soc[st.p.id]; });

        const genTotal = Object.values(gen).reduce((a, b) => a + b, 0);
        return {
            h: s.h, dem: s.dem, dc: s.dc, req: s.req, loss: s.req - s.dc,
            avail: s.avail, gen, genTotal, charge, discharge, soc: socOut,
            imp, exp, curt, vreUp, vreOut, unmet, surplus: res.surplus, shed, shedBy, served,
            price, co2, cost, reserve, fPre, net: s.net,
            marginal: unmet > 1 ? null : (res.marginal ? res.marginal.id : null)
        };
    }

    /* ---------- bir kunlik simulyatsiya ---------- */
    function prepare(sc, settings, env) {
        const lossK = 1 + sc.lossPct / 100;
        const pre = [];
        for (let i = 0; i < STEPS; i++) {
            const h = i * DT;
            const dem = {};
            let dc = 0;
            sc.consumers.forEach(c => { const v = consumerDemand(sc, c, env, h, settings); dem[c.id] = v; dc += v; });
            const avail = {};
            let vre = 0;
            sc.plants.forEach(p => {
                avail[p.id] = plantAvail(sc, p, env, h, settings);
                if (isVRE(p)) vre += avail[p.id];
            });
            const req = dc * lossK;
            pre.push({ h, dem, dc, req, avail, net: req - vre });
        }
        return pre;
    }

    function thresholds(pre) {
        const nets = pre.map(s => s.net).sort((a, b) => a - b);
        const q = f => nets[Math.min(STEPS - 1, Math.floor(f * STEPS))];
        return { battery: [q(0.30), q(0.72)], pumped: [q(0.38), q(0.62)] };
    }

    function runPass(sc, settings, env, pre, thr, prev0, soc0) {
        const soc = Object.assign({}, soc0);
        let prev = prev0;
        const steps = [];
        pre.forEach(s => {
            const r = step(sc, settings, env, s, thr, prev, soc);
            steps.push(r);
            prev = r.gen;
        });
        return { steps, last: prev, soc };
    }

    function simulateDay(sc, settings) {
        const env = { season: settings.season, weather: settings.weather, day: settings.dayType };
        const pre = prepare(sc, settings, env);
        const thr = thresholds(pre);
        const soc0 = {};
        sc.plants.filter(isStorage).forEach(p => { soc0[p.id] = effectiveCap(sc, p, settings) * p.hours * 0.5; });
        // 1-o'tish: boshlang'ich holatni topish; 2-o'tish: kun oxiridagi holatdan boshlab (davriy kun)
        const p1 = runPass(sc, settings, env, pre, thr, null, soc0);
        const p2 = runPass(sc, settings, env, pre, thr, p1.last, p1.soc);
        return { env, steps: p2.steps, summary: summarize(sc, p2.steps) };
    }

    function summarize(sc, steps) {
        const bySource = {};
        sc.plants.forEach(p => { bySource[p.id] = 0; });
        let cons = 0, req = 0, served = 0, shed = 0, curt = 0, co2 = 0, cost = 0, imp = 0, exp = 0, gen = 0, chg = 0, dis = 0;
        let peak = { v: -1, h: 0 }, low = { v: Infinity, h: 0 }, shedSteps = 0, minRes = { v: Infinity, h: 0 };
        steps.forEach(s => {
            Object.keys(s.gen).forEach(k => { bySource[k] += s.gen[k] * DT; gen += s.gen[k] * DT; });
            Object.keys(s.discharge).forEach(k => { bySource[k] += s.discharge[k] * DT; dis += s.discharge[k] * DT; });
            Object.keys(s.charge).forEach(k => { chg += s.charge[k] * DT; });
            cons += s.dc * DT; req += s.req * DT; shed += s.shed * DT; served += (s.dc - s.shed) * DT;
            curt += s.curt * DT; co2 += s.co2 * DT; cost += s.cost * DT; imp += s.imp * DT; exp += s.exp * DT;
            if (s.req > peak.v) peak = { v: s.req, h: s.h };
            if (s.req < low.v) low = { v: s.req, h: s.h };
            if (s.shed > 1) shedSteps++;
            if (s.reserve < minRes.v) minRes = { v: s.reserve, h: s.h };
        });
        const impId = (sc.plants.find(p => p.kind === "import") || {}).id;
        if (impId) bySource[impId] = imp;
        const domestic = gen;
        const renewable = sc.plants.filter(p => ["solar", "wind", "hydro", "bio"].includes(p.kind)).reduce((t, p) => t + bySource[p.id], 0);
        const nuclear = sc.plants.filter(p => p.kind === "nuclear").reduce((t, p) => t + bySource[p.id], 0);
        const supply = domestic + imp;
        return {
            bySource, cons, req, served, shed, curt, co2, cost, imp, exp, gen: domestic, chg, dis,
            reShare: domestic > 0 ? renewable / domestic : 0,
            lowCarbonShare: domestic > 0 ? (renewable + nuclear) / domestic : 0,
            intensity: supply > 0 ? co2 / supply * 1000 : 0,
            peak, low, shedSteps, minRes
        };
    }

    const api = { DT, STEPS, SEASONS, WEATHER, simulateDay, daylight, consumerDemand, plantAvail, solarFactor, windFactor, costOf, effectiveCap, isStorage, isVRE, seasonal };
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    else root.GridEngine = api;
})(typeof window !== "undefined" ? window : globalThis);
