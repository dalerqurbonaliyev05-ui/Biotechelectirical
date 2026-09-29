/* =========================================================
   Stsenariylar: O'zbekiston (2026) va Yevropa (EU o'rtacha tarkibi)
   Barcha qiymatlar o'quv modeli uchun taxminiy.
   Manbalar ro'yxati sahifaning "Ma'lumotlar manbalari" bo'limida.

   kind: solar | wind | hydro | nuclear | thermal | bio | battery | pumped | import
   cap     — standart o'rnatilgan quvvat, MW
   capMax  — slider chegarasi, MW
   min     — texnik minimum (mavjud quvvatdan ulush), fasl bo'yicha bo'lishi mumkin
   ramp    — 15 daqiqada o'zgarish tezligi (o'rnatilgan quvvatdan ulush)
   cost    — marjinal xarajat, valyuta/MWh (Yevropada CO2 narxi bilan)
   co2     — t CO2 / MWh
   avail   — texnik tayyorlik (ta'mir, avariya, yozgi issiqda quvvat pasayishi)
   gas     — gaz ta'minoti slideriga bog'liq
   ========================================================= */
(function (root) {
    "use strict";

    const SCENARIOS = {
        uz: {
            id: "uz",
            seed: 3,
            currency: "$",
            lossPct: 12,            // tarmoq yo'qotishlari, % (taxminiy)
            reserveReq: 600,        // N-1: eng katta blok + zaxira, MW
            largestUnit: { plant: "ccgt", mw: 450 },
            voll: 1000,             // taqchillik narxi (yetkazilmagan energiya qiymati)
            storageValue: 36,       // akkumulyator energiyasining ichki qiymati
            exportCap: 400,         // Afg'onistonga eksport liniyalari
            exportPrice: 30,
            demandScale: 1,
            eveningPeak: 20.4,
            // quyosh chiqishi, botishi, peshindagi maksimal ulush (Toshkent, UTC+5)
            sun: {
                winter: [7.9, 17.2, 0.55],
                spring: [6.3, 18.9, 0.80],
                summer: [5.0, 19.8, 0.82],
                autumn: [6.6, 18.2, 0.70]
            },
            windSeason: { winter: 0.24, spring: 0.36, summer: 0.33, autumn: 0.26 },
            windDiurnal: { peak: 15, amp: 0.12 },
            hydroSeason: { winter: 0.22, spring: 0.45, summer: 0.65, autumn: 0.28 },
            plants: [
                { id: "solar",   kind: "solar",   cap: 4500, capMax: 20000, icon: "☀️", color: "#ffb020", co2: 0 },
                { id: "wind",    kind: "wind",    cap: 1900, capMax: 25000, icon: "💨", color: "#22c7ff", co2: 0 },
                { id: "hydro",   kind: "hydro",   cap: 2200, capMax: 4500,  icon: "💧", color: "#3b82f6", co2: 0, min: 0.4, ramp: 1, cost: 18 },
                { id: "nuclear", kind: "nuclear", cap: 2100, capMax: 4200,  icon: "⚛️", color: "#8b5cf6", co2: 0, min: 0.85, ramp: 0.02, cost: 12, avail: 0.9, off: true, future: true },
                { id: "coal",    kind: "thermal", cap: 2000, capMax: 3000,  icon: "⛏️", color: "#475569", co2: 1.1, min: 0.4, ramp: 0.08, cost: 27, avail: 0.6 },
                { id: "ccgt",    kind: "thermal", cap: 8000, capMax: 16000, icon: "🔥", color: "#ff7a45", co2: 0.36, min: 0, ramp: 0.25, cost: 24, gas: true,
                  avail: { winter: 0.9, spring: 0.9, summer: 0.84, autumn: 0.9 } },
                { id: "chp",     kind: "thermal", cap: 1000, capMax: 2000,  icon: "♨️", color: "#e879a0", co2: 0.45, ramp: 0.15, cost: 28, avail: 0.9, gas: true,
                  min: { winter: 0.75, spring: 0.35, summer: 0.2, autumn: 0.4 } },
                { id: "steam",   kind: "thermal", cap: 4500, capMax: 6000,  icon: "🏭", color: "#dc2626", co2: 0.55, min: 0, ramp: 0.12, cost: 36, avail: 0.75, gas: true },
                { id: "engines", kind: "thermal", cap: 1200, capMax: 3000,  icon: "⚙️", color: "#991b1b", co2: 0.5, min: 0, ramp: 1, cost: 42, avail: 0.92, gas: true },
                { id: "battery", kind: "battery", cap: 500,  capMax: 5000,  icon: "🔋", color: "#10b981", co2: 0, hours: 3, eff: 0.88, ramp: 1 },
                { id: "import",  kind: "import",  cap: 1500, capMax: 4000,  icon: "🔌", color: "#a16207", co2: 0.35, ramp: 1,
                  price: { winter: 58, spring: 30, summer: 22, autumn: 45 } }
            ],
            consumers: [
                { id: "residential", shape: "residential", base: 3700, prio: 2, icon: "🏠", color: "#6d4aff",
                  season: { winter: 1.15, spring: 0.9, summer: 0.86, autumn: 0.95 }, weekend: 1.06 },
                { id: "climate", shape: "climate", base: 1, prio: 2, icon: "🌡️", color: "#ff5c8a",
                  amp: { winter: 2900, spring: 450, summer: 3900, autumn: 700 },
                  modes: { winter: "heat", spring: "mix", summer: "cool", autumn: "heat" } },
                { id: "industry", shape: "industry", base: 3000, prio: 2, icon: "🏗️", color: "#475569",
                  season: { winter: 0.97, spring: 1, summer: 1, autumn: 1 }, weekend: 0.88 },
                { id: "commercial", shape: "commercial", base: 1400, prio: 3, icon: "🛍️", color: "#ffb020", weekend: 0.7 },
                { id: "irrigation", shape: "irrigation", base: 1500, prio: 3, icon: "🚿", color: "#3b82f6",
                  season: { winter: 0.08, spring: 0.55, summer: 1.0, autumn: 0.45 } },
                { id: "transport", shape: "transport", base: 380, prio: 1, icon: "🚇", color: "#0891b2" },
                { id: "critical", shape: "critical", base: 750, prio: 1, icon: "🏥", color: "#e11d48" },
                { id: "datacenters", shape: "flat", base: 450, prio: 3, icon: "🖥️", color: "#8b5cf6" },
                { id: "lighting", shape: "lighting", base: 230, prio: 2, icon: "💡", color: "#eab308" }
            ]
        },

        eu: {
            id: "eu",
            seed: 11,
            currency: "€",
            lossPct: 6,
            reserveReq: 1100,
            largestUnit: { plant: "nuclear", mw: 1000 },
            voll: 3000,
            storageValue: 110,
            exportCap: 3000,
            exportPrice: 40,
            demandScale: 1,
            eveningPeak: 19.3,
            // ~50° shimoliy kenglik, CET (yozda DST)
            sun: {
                winter: [8.1, 16.4, 0.30],
                spring: [6.3, 19.6, 0.60],
                summer: [5.2, 21.5, 0.70],
                autumn: [7.3, 18.6, 0.45]
            },
            windSeason: { winter: 0.40, spring: 0.29, summer: 0.19, autumn: 0.31 },
            windDiurnal: { peak: 2, amp: 0.05 },
            hydroSeason: { winter: 0.39, spring: 0.55, summer: 0.42, autumn: 0.33 },
            plants: [
                { id: "solar",    kind: "solar",   cap: 13000, capMax: 40000, icon: "☀️", color: "#ffb020", co2: 0 },
                { id: "wind",     kind: "wind",    cap: 4600,  capMax: 25000, icon: "💨", color: "#22c7ff", co2: 0 },
                { id: "offshore", kind: "wind",    cap: 600,   capMax: 12000, icon: "🌊", color: "#0891b2", co2: 0, offshore: true },
                { id: "hydro",    kind: "hydro",   cap: 3300,  capMax: 5000,  icon: "💧", color: "#3b82f6", co2: 0, min: 0.35, ramp: 1, cost: 30 },
                { id: "nuclear",  kind: "nuclear", cap: 3000,  capMax: 6000,  icon: "⚛️", color: "#8b5cf6", co2: 0, min: 0.8, ramp: 0.03, cost: 10,
                  avail: { winter: 0.92, spring: 0.85, summer: 0.80, autumn: 0.88 } },
                { id: "bio",      kind: "bio",     cap: 1400,  capMax: 3000,  icon: "🌿", color: "#65a30d", co2: 0, min: 0.3, ramp: 0.2, cost: 100, avail: 0.85 },
                { id: "coal",     kind: "thermal", cap: 2900,  capMax: 5000,  icon: "⛏️", color: "#475569", co2: 1.0, min: 0.3, ramp: 0.08, cost: 112, avail: 0.85 },
                { id: "ccgt",     kind: "thermal", cap: 4700,  capMax: 10000, icon: "🔥", color: "#ff7a45", co2: 0.36, min: 0, ramp: 0.25, cost: 96, avail: 0.9, gas: true },
                { id: "ocgt",     kind: "thermal", cap: 1500,  capMax: 4000,  icon: "⚙️", color: "#991b1b", co2: 0.55, min: 0, ramp: 1, cost: 140, avail: 0.92, gas: true },
                { id: "battery",  kind: "battery", cap: 1200,  capMax: 8000,  icon: "🔋", color: "#10b981", co2: 0, hours: 2, eff: 0.9, ramp: 1 },
                { id: "pumped",   kind: "pumped",  cap: 1500,  capMax: 4000,  icon: "⛰️", color: "#1e40af", co2: 0, hours: 8, eff: 0.75, ramp: 1 },
                { id: "import",   kind: "import",  cap: 3000,  capMax: 8000,  icon: "🔌", color: "#a16207", co2: 0.22, ramp: 1,
                  price: { winter: 118, spring: 98, summer: 92, autumn: 104 } }
            ],
            consumers: [
                { id: "residential", shape: "residential", base: 3300, prio: 2, icon: "🏠", color: "#6d4aff",
                  season: { winter: 1.15, spring: 0.95, summer: 0.85, autumn: 1.0 }, weekend: 1.08 },
                { id: "climate", shape: "climate", base: 1, prio: 2, icon: "🌡️", color: "#ff5c8a",
                  amp: { winter: 2600, spring: 700, summer: 650, autumn: 1000 },
                  modes: { winter: "heat", spring: "heat", summer: "cool", autumn: "heat" } },
                { id: "industry", shape: "industry", base: 3500, prio: 2, icon: "🏗️", color: "#475569", weekend: 0.85 },
                { id: "commercial", shape: "commercial", base: 2500, prio: 3, icon: "🛍️", color: "#ffb020", weekend: 0.65 },
                { id: "agriculture", shape: "flat", base: 220, prio: 3, icon: "🚜", color: "#65a30d",
                  season: { winter: 0.8, spring: 1, summer: 1.1, autumn: 1 } },
                { id: "transport", shape: "transportEV", base: 800, prio: 1, icon: "🚆", color: "#0891b2" },
                { id: "critical", shape: "critical", base: 650, prio: 1, icon: "🏥", color: "#e11d48" },
                { id: "datacenters", shape: "flat", base: 800, prio: 3, icon: "🖥️", color: "#8b5cf6" },
                { id: "lighting", shape: "lighting", base: 230, prio: 2, icon: "💡", color: "#eab308" }
            ]
        }
    };

    if (typeof module !== "undefined" && module.exports) module.exports = SCENARIOS;
    else root.SCENARIOS = SCENARIOS;
})(typeof window !== "undefined" ? window : globalThis);
