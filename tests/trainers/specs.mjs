// Har bir trenajyor uchun: qaysi DOM elementlari kuzatiladi, to'g'ri yechim va sinov ssenariylari.
//
// Qadam turlari:
//   {w:[a,b]}        a qisqichni, so'ng b qisqichni bosish (sim ulash)
//   {t:id}           bitta qisqichni bosish
//   {c:id}           tugmani bosish (DOM)
//   {down:id}/{up:id} tugmani bosib turish / qo'yib yuborish (START/STOP)
//   {sel:[id,val]}   <select> qiymati;  {range:[id,val]} <input type=range> qiymati
//   {part:id}        (08) ro'yxatdan detalni tanlash;  {place:id} detalni o'z joyiga sudrab qo'yish
//   {placeAt:[x,y]}  (08) tanlangan detalni (x,y) nuqtaga sudrab qo'yish
//   {solve:"learn"|"full"} to'g'ri yechimdagi barcha simlar (learn: oldindan ulangan namuna simsiz)
//   har qadamda ixtiyoriy  then:"JS shart" — shart bajarilguncha kutib, keyin holatni yozish.
// Har qadamdan keyin yoziladi: shu orada chiqqan holat xabarlari (matn va ohang) va DOM o'zgarishlari.

const T = (id) => `document.getElementById(${JSON.stringify(id)}).textContent`;
const has = (id, s) => `${T(id)}.includes(${JSON.stringify(s)})`;
const is = (id, s) => `${T(id)}===${JSON.stringify(s)}`;
// oxirgi yozilgan holatdan beri shunday xabar chiqdimi
const said = (s) => `window.__h.log.some(m=>m[0].includes(${JSON.stringify(s)}))`;

const WIRING_IDS = ["status2", "power", "prog:h", "pdone", "exam:h", "wcount", "undo", "clear", "hint", "check", "m-learn", "m-exam"];
const WIRING_LISTS = { steps: "#steps li", report: "#report li" };

const chain = (nets) => nets.flatMap((t) => t.slice(1).map((x, i) => [t[i], x]));

// ---------------------------------------------------------------- 07
const SHIT_FULL = [
  ["src.l", "ab.li"], ["src.n", "ab.ni"],
  ["ab.lo", "rcd.li"], ["ab.no", "rcd.ni"], ["rcd.lo", "m.1"], ["rcd.no", "m.3"],
  ["m.2", "ab1.i"], ["ab1.i", "ab2.i"], ["ab2.i", "ab3.i"],
  ["ab1.o", "k1.l"], ["ab2.o", "k2.l"], ["ab3.o", "k3.l"],
  ["m.4", "nb1"], ["nb2", "k1.n"], ["nb3", "k2.n"], ["nb4", "k3.n"],
  ["src.pe", "pb1"], ["pb2", "k1.pe"], ["pb3", "k2.pe"], ["pb4", "k3.pe"],
];

// ---------------------------------------------------------------- 09
const VFD_FULL = [
  ["src.l1", "vfd.r"], ["src.l2", "vfd.s"], ["src.l3", "vfd.t"],
  ["src.e", "vfd.pe"], ["src.e", "mot.pe"],
  ["vfd.u", "mot.u"], ["vfd.v", "mot.v"], ["vfd.w", "mot.w"],
  ["vfd.p", "res.1"], ["vfd.pb", "res.2"],
  ["vfd.v10", "pot.3"], ["vfd.ai", "pot.2"], ["vfd.gnd", "pot.1"],
  ["vfd.m0", "bs.23"], ["vfd.com", "bs.24"], ["vfd.m2", "bt.11"], ["vfd.com", "bt.12"],
];

// ---------------------------------------------------------------- 10
const REV_FULL = chain([
  ["src.l1", "qf.1"], ["src.l2", "qf.3"], ["src.l3", "qf.5"],
  ["qf.2", "km1.l1", "km2.l1"], ["qf.4", "km1.l2", "km2.l2"], ["qf.6", "km1.l3", "km2.l3"],
  ["km1.t1", "km2.t3", "mot.u"], ["km1.t2", "km2.t2", "mot.v"], ["km1.t3", "km2.t1", "mot.w"],
  ["src.e", "psu.pe", "mot.pe"], ["src.l", "psu.l", "k1.c1", "k2.c1"], ["src.n", "psu.n", "km1.a2", "km2.a2"],
  ["psu.vp1", "psu.vp2", "s1.bn", "s2.bn"], ["psu.vm1", "psu.vm2", "s1.bu", "s2.bu", "k1.a2", "k2.a2"],
  ["s1.bk", "k1.a1"], ["s2.bk", "k2.a1"],
  ["k2.nc1", "k1.c2", "km1.53"], ["k1.no2", "km1.54", "km2.61"], ["km2.62", "km1.a1"],
  ["k1.nc1", "k2.c2", "km2.53"], ["k2.no2", "km2.54", "km1.61"], ["km1.62", "km2.a1"],
]);

// ---------------------------------------------------------------- 11
const HOME_FULL = chain([
  ["src.l", "mt.1"], ["src.n", "mt.3"], ["mt.2", "qf1.l1"], ["mt.4", "qf1.n1"],
  ["qf1.l2", "kv.li"], ["qf1.n2", "kv.ni"],
  ["kv.lo", "d1.l1", "d2.l1", "d3.l1", "qf2.l1"], ["kv.no", "d1.n1", "d2.n1", "d3.n1", "lamp.n"],
  ["d1.l2", "x1.l"], ["d1.n2", "x1.n"], ["d2.l2", "x2.l"], ["d2.n2", "x2.n"], ["d3.l2", "x3.l"], ["d3.n2", "x3.n"],
  ["src.e", "x1.pe", "x2.pe", "x3.pe"], ["qf2.l2", "sw.l"], ["sw.l1", "lamp.l"],
]);

// ---------------------------------------------------------------- 08 (detallar joyi, manba: avtomat-yigish/index.html addPart snap)
export const MCB_SNAP = {
  t1: [-36.4, -20], t2: [36.4, -20], chute: [-16, -21], arm: [18, -3], coil: [-14, 6], core: [-6, 6],
  bi: [-31, 4], shA: [-27, 16], shB: [4, 18], mech: [-4, 24], handle: [-7, 38], din: [0, -37],
};
const MCB_ORDER = ["t1", "t2", "chute", "arm", "coil", "core", "bi", "shA", "shB", "mech", "handle", "din"];
const placeAll = (order) => order.flatMap((id) => [{ part: id }, { place: id, then: `document.querySelector('#plist li[data-id="${id}"]').classList.contains("done")` }]);

export const TRAINERS = {
  "shit-montaji": {
    no: "07", kind: "wiring", full: SHIT_FULL, prewired: 2,
    ids: [...WIRING_IDS, "faults:h", "fshort", "fleak", "ftest", "freset", "fclear", "fnote", "fg"],
    lists: WIRING_LISTS,
    scenarios: {
      learn: [
        { t: "ab.lo" }, { t: "ab.lo" },
        { w: ["ab.lo", "rcd.ni"] }, { w: ["ab.lo", "pb1"] }, { w: ["ab.no", "pb1"] },
        { w: ["rcd.li", "rcd.lo"] }, { w: ["ab.lo", "m.1"] },
        { w: ["ab.lo", "rcd.li"] }, { w: ["rcd.li", "ab.lo"] },
        { c: "hint" }, { c: "undo" },
        { solve: "learn" },
        { c: "power" }, { t: "k1.l" },
        { c: "fshort", then: said("AB-1 o'chdi") },
        { c: "freset", then: said("AB-1 o'chdi") },
        { c: "fclear" }, { c: "freset" },
        { sel: ["fg", "1"] }, { c: "fleak", then: said("УЗО o'chdi") },
        { c: "freset", then: said("УЗО o'chdi") }, { c: "fclear" }, { c: "freset" },
        { c: "ftest", then: said("Test tugmasi") },
        { c: "freset" },
        { sel: ["fg", "2"] }, { c: "fshort", then: said("AB-3 o'chdi") },
        { c: "power" }, { c: "clear" },
      ],
      exam: [
        { c: "m-exam" },
        { w: ["src.l", "ab.ni"] }, { w: ["src.l", "ab.li"] }, { w: ["ab.lo", "ab.no"] }, { w: ["src.pe", "pb1"] },
        { c: "check" }, { c: "clear" },
        { solve: "full" }, { w: ["src.l", "src.n"] }, { c: "check" }, { c: "undo" }, { c: "check" },
        { c: "power" }, { c: "power" }, { c: "m-learn" },
      ],
    },
  },

  "avtomat-yigish": {
    no: "08", kind: "parts", profile: "funcTouch",
    norm: [["Vaqt: \\d+:\\d\\d", "Vaqt: M:SS"]],
    ids: ["status2", "pdone", "info", "result", "test:h", "tstate", "t-handle", "t-over", "t-short", "cover", "hint", "reset", "m-learn", "m-exam"],
    lists: { plist: "#plist li" },
    scenarios: {
      learn: [
        { c: "hint" },
        { placeAt: [0, -37] },
        { part: "arm" }, { place: "arm" },
        { part: "t1" }, { placeAt: [36.4, -20] },
        ...placeAll(MCB_ORDER),
        { c: "cover" }, { c: "cover" },
        { c: "t-handle" }, { c: "t-over", then: has("tstate", "o'zi o'chdi") },
        { c: "t-handle" }, { c: "t-handle" }, { c: "t-short" },
        { c: "t-handle" }, { c: "t-handle" }, { c: "t-handle" },
        { c: "reset" },
      ],
      exam: [
        { c: "m-exam" },
        { part: "mech" }, { place: "mech" },
        { part: "t1" }, { placeAt: [0, 30] },
        ...placeAll(MCB_ORDER),
        { c: "m-learn" },
      ],
    },
  },

  "chastota-yigish": {
    no: "09", kind: "wiring", full: VFD_FULL, prewired: 1,
    ids: [...WIRING_IDS, "ctl:h", "potv", "pot", "r-state", "b-start", "b-stop", "f-ol", "f-pl", "f-oc", "f-reset", "fnote"],
    lists: WIRING_LISTS,
    scenarios: {
      learn: [
        { t: "vfd.s" }, { t: "vfd.s" },
        { w: ["vfd.r", "vfd.s"] }, { w: ["src.l1", "src.l2"] }, { w: ["src.l", "vfd.s"] }, { w: ["src.l2", "vfd.u"] },
        { w: ["src.l2", "vfd.m0"] }, { w: ["src.l2", "vfd.t"] }, { w: ["src.e", "vfd.u"] }, { w: ["src.e", "src.l1"] },
        { w: ["vfd.s", "mot.u"] }, { w: ["vfd.u", "mot.v"] }, { w: ["vfd.u", "res.1"] }, { w: ["res.1", "vfd.m0"] },
        { w: ["res.1", "pot.1"] }, { w: ["res.1", "vfd.ra"] }, { w: ["pot.1", "bs.23"] },
        { w: ["bs.11", "vfd.m0"] }, { w: ["bs.11", "vfd.com"] }, { w: ["bs.23", "vfd.m2"] },
        { w: ["bt.23", "vfd.m2"] }, { w: ["bt.23", "vfd.com"] }, { w: ["bt.11", "vfd.m0"] }, { w: ["vfd.v10", "pot.1"] },
        { w: ["vfd.m0", "bs.23"] }, { w: ["bs.23", "vfd.com"] }, { w: ["bs.24", "vfd.gnd"] }, { w: ["bs.24", "vfd.com"] },
        { c: "undo" }, { w: ["src.l1", "vfd.r"] },
        { c: "hint" },
        { solve: "learn" },
        { c: "power" }, { t: "mot.u" },
        { c: "f-ol" },
        { down: "b-start" }, { up: "b-start", then: is("r-state", "ishlayapti") },
        { down: "b-stop" }, { up: "b-stop", then: is("r-state", "tayyor") },
        { down: "b-start" }, { up: "b-start", then: is("r-state", "ishlayapti") },
        { c: "f-ol" }, { c: "f-reset" },
        { c: "f-oc" },
        { down: "b-start" }, { up: "b-start", then: is("r-state", "ishlayapti") },
        { c: "f-oc" }, { down: "b-start" }, { up: "b-start" }, { c: "f-reset" },
        { c: "f-pl" }, { c: "f-reset" },
        { range: ["pot", "0"] }, { down: "b-start" }, { up: "b-start" },
        { down: "b-stop" }, { up: "b-stop", then: is("r-state", "tayyor") },
        { range: ["pot", "100"] },
        { c: "power" },
      ],
      exam: [
        { c: "m-exam" },
        { w: ["src.l1", "vfd.s"] }, { w: ["src.l2", "vfd.r"] }, { w: ["vfd.u", "mot.u"] }, { w: ["bs.11", "vfd.m0"] },
        { c: "check" }, { c: "clear" },
        { solve: "full" }, { c: "check" },
        { c: "power" }, { c: "power" }, { c: "m-learn" },
      ],
    },
  },

  "reversiv-yuritma": {
    no: "10", kind: "wiring", full: REV_FULL, prewired: 1,
    ids: [...WIRING_IDS, "ctl:h", "r-qf", "r-mot", "r-s", "r-k", "r-km1", "r-km2", "b-qf", "t-m1", "t-m2", "t-f2", "fnote"],
    lists: WIRING_LISTS,
    scenarios: {
      learn: [
        { t: "km1.l1" }, { t: "km1.l1" },
        { w: ["km1.71", "km1.72"] }, { w: ["km1.71", "psu.l"] }, { w: ["psu.vp1", "psu.vm1"] }, { w: ["km1.l1", "km1.t1"] },
        { w: ["src.l", "psu.vp1"] }, { w: ["src.e", "qf.1"] }, { w: ["km2.t1", "mot.u"] }, { w: ["km1.t1", "mot.v"] },
        { w: ["km1.t1", "km2.t2"] }, { w: ["qf.2", "km1.l2"] }, { w: ["s1.bn", "psu.vm1"] }, { w: ["km1.a1", "k1.no2"] },
        { w: ["s1.bk", "k2.a1"] }, { w: ["s1.bk", "k1.a2"] }, { w: ["k2.nc1", "km2.54"] }, { w: ["k2.nc1", "km1.54"] },
        { w: ["src.l", "km1.a2"] },
        { w: ["src.l2", "qf.3"] }, { w: ["qf.3", "src.l2"] }, { c: "undo" },
        { c: "hint" },
        { solve: "learn" },
        { c: "b-qf" },
        { c: "power", then: is("r-km1", "ulangan") }, { t: "mot.u" },
        { c: "b-qf", then: is("r-km2", "ulangan") },
        { c: "b-qf", then: is("r-mot", "to'xtagan") },
        { c: "b-qf", then: is("r-km1", "ulangan") },
        { c: "t-m1" }, { c: "t-m2", then: `${is("r-km1", "uzilgan")}&&${is("r-km2", "uzilgan")}&&${is("r-mot", "to'xtagan")}` },
        { c: "t-m1" }, { c: "t-m2", then: is("r-km1", "ulangan") },
        { c: "t-f2", then: is("r-qf", "o'chdi (himoya)") },
        { c: "t-f2" },
        { c: "power" },
      ],
      exam: [
        { c: "m-exam" },
        { w: ["src.l1", "qf.3"] }, { w: ["km2.t1", "mot.u"] }, { w: ["src.e", "psu.pe"] },
        { c: "check" }, { c: "clear" },
        { solve: "full" }, { c: "check" },
        { c: "power", then: is("r-km1", "ulangan") }, { c: "power" }, { c: "m-learn" },
      ],
    },
  },

  "uy-elektr-shiti": {
    no: "11", kind: "wiring", full: HOME_FULL, prewired: 1,
    ids: [...WIRING_IDS, "ctl:h", "uv", "u", "r-u", "r-kv", "r-ub", "r-i", "r-p", "r-x1", "r-x2", "r-x3", "b-qf1", "b-d1", "b-d2", "b-d3", "b-qf2", "b-sw", "t-d1", "t-d2", "t-d3", "a-x1", "a-x2", "a-x3"],
    lists: WIRING_LISTS,
    norm: [["kutish \\d+ s", "kutish N s"]],
    scenarios: {
      learn: [
        { t: "mt.3" }, { t: "mt.3" },
        { w: ["sw.l2", "lamp.l"] }, { w: ["d1.l1", "d1.l2"] }, { w: ["src.e", "x1.l"] }, { w: ["sw.l", "lamp.n"] },
        { w: ["src.n", "mt.1"] }, { w: ["src.n", "mt.4"] }, { w: ["d1.l2", "d2.l2"] }, { w: ["d1.l2", "x2.l"] },
        { w: ["d1.n2", "kv.no"] }, { w: ["d1.l2", "kv.lo"] }, { w: ["x1.l", "kv.lo"] }, { w: ["kv.lo", "qf1.l2"] },
        { w: ["kv.li", "d1.l1"] }, { w: ["lamp.n", "x1.n"] }, { w: ["lamp.l", "qf2.l1"] }, { w: ["qf1.l1", "kv.li"] },
        { w: ["qf2.l2", "lamp.l"] }, { w: ["mt.2", "kv.li"] },
        { w: ["src.n", "mt.3"] }, { c: "undo" },
        { c: "hint" },
        { solve: "learn" },
        { c: "b-qf1" },
        { c: "power" }, { t: "x1.l" },
        { c: "b-qf1", then: said("ichki kontaktini yopdi") },
        { c: "b-d1" }, { c: "b-d2" }, { c: "b-d3" }, { c: "b-qf2" }, { c: "b-sw" },
        { sel: ["a-x1", "kettle"] }, { sel: ["a-x2", "tv"] },
        { c: "t-d1" }, { c: "b-d1" },
        { sel: ["a-x3", "leak"], then: said("sizyapti") }, { sel: ["a-x3", "none"] }, { c: "b-d3" },
        { sel: ["a-x3", "short"], then: said("shnurda qisqa tutashuv") }, { sel: ["a-x3", "none"] }, { c: "b-d3" },
        { sel: ["a-x2", "strip"], then: said("ortiqcha yuk") }, { sel: ["a-x2", "none"] }, { c: "b-d2" },
        { sel: ["a-x1", "oven"] }, { sel: ["a-x2", "oven"] }, { sel: ["a-x3", "oven"], then: said("QF1 (32 A)") },
        { sel: ["a-x1", "none"] }, { sel: ["a-x2", "none"] }, { sel: ["a-x3", "none"] },
        { c: "b-qf1", then: said("ichki kontaktini yopdi") },
        { range: ["u", "260"], then: said("250 V dan yuqori") },
        { range: ["u", "170"], then: said("180 V dan past") },
        { range: ["u", "230"], then: said("ichki kontaktini yopdi") },
        { c: "b-sw" }, { c: "power" },
      ],
      exam: [
        { c: "m-exam" },
        { w: ["src.l", "mt.3"] }, { w: ["src.e", "x1.n"] }, { w: ["d1.l2", "x1.l"] },
        { c: "check" }, { c: "clear" },
        { solve: "full" }, { c: "check" },
        { c: "power" }, { c: "power" }, { c: "m-learn" },
      ],
    },
  },
};
