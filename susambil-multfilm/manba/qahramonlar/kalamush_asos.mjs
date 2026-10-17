// Kalamush (1 va 2 uchun umumiy shakl): ochko'z, tez-tez qo'rqadi. Faqat rangi bilan farqlanadi.
// Ko'rinish kadri: 420x360, yer chizig'i y=330. Masshtab boshqa qahramonlar bilan bir xil.
// Panjalar: 1 — oldingi chap, 2 — oldingi o'ng, 3 — orqa chap, 4 — orqa o'ng.
import { path, ellipse, circle, rect, line, layer, SOYA } from "../lib.mjs";

const W = 420;
const H = 360;

export default function kalamush(nom, bolim, rang, qatorY) {
  const n = (s) => `${nom}_${s}`;
  const panjaYon = (x, uzoq) => [
    rect(x - 7, 284, 14, 46, 7, rang),
    uzoq ? rect(x - 7, 284, 14, 46, 7, "toq", SOYA) : "",
    ellipse(x + 5, 329, 12, 5, "qaymoq"),
    uzoq ? ellipse(x + 5, 329, 12, 5, "toq", SOYA) : "",
  ];

  // ---------- YON (o'ngga qaragan) ----------
  const yon = {
    w: W,
    h: H,
    layers: [
      layer(n("soya"), ellipse(204, 333, 104, 9, "toq", SOYA)),
      layer(n("dum"), line("M 116 284 C 64 292 36 262 44 226 C 50 202 74 196 86 210", rang, 9), { pivot: [118, 284] }),
      layer(n("panja_4"), panjaYon(168, true), { pivot: [168, 288] }),
      layer(n("panja_2"), panjaYon(268, true), { pivot: [268, 288] }),
      layer(n("panja_3"), panjaYon(146, false), { pivot: [146, 288] }),
      layer(n("panja_1"), panjaYon(246, false), { pivot: [246, 288] }),
      layer(n("tana"), [
        path("M 110 282 C 100 222 160 192 220 200 C 270 208 292 250 282 290 C 272 320 152 324 122 306 C 114 300 110 292 110 282 Z", rang),
        path("M 170 302 C 200 282 250 282 278 296 C 266 316 190 322 170 302 Z", "qaymoq"),
      ]),
      layer(n("quloq_ong"), [circle(290, 160, 22, rang), circle(290, 160, 22, "toq", SOYA)], { pivot: [288, 176] }),
      layer(
        n("bosh"),
        [
          path("M 240 180 C 272 164 312 180 342 204 C 352 212 352 222 342 228 C 310 240 270 246 245 233 C 224 222 222 192 240 180 Z", rang),
          ellipse(348, 214, 8, 7, "qizil"),
          line("M 336 218 L 372 210", "toq", 2.5, SOYA),
          line("M 336 222 L 374 224", "toq", 2.5, SOYA),
          line("M 334 226 L 368 236", "toq", 2.5, SOYA),
        ],
        { pivot: [246, 220] }
      ),
      layer(n("quloq_chap"), [circle(262, 168, 27, rang), circle(264, 170, 17, "qaymoq")], { pivot: [266, 186] }),
      layer(n("koz_ochiq"), [ellipse(298, 196, 13, 15, "qaymoq"), ellipse(301, 198, 8, 10, "toq"), circle(304, 193, 3, "qaymoq")]),
      layer(n("koz_yumuq"), line("M 286 198 Q 298 206 310 198", "toq", 4), { hidden: true }),
      layer(n("koz_xursand"), line("M 286 201 Q 298 189 310 201", "toq", 4), { hidden: true }),
      layer(n("koz_qorqqan"), [ellipse(298, 194, 16, 18, "qaymoq"), circle(300, 196, 4, "toq")], { hidden: true }),
      layer(n("qosh_qorqqan"), line("M 286 174 L 310 168", "toq", 5), { hidden: true }),
      layer(n("qosh_jahldor"), line("M 284 172 L 312 184", "toq", 6), { hidden: true }),
      layer(n("ogiz_1"), line("M 314 226 Q 324 232 334 225", "toq", 3.5)),
      layer(n("ogiz_2"), path("M 314 224 Q 324 230 334 223 Q 331 238 323 238 Q 315 236 314 224 Z", "toq"), { hidden: true }),
      layer(
        n("ogiz_3"),
        [path("M 312 222 Q 324 230 336 220 Q 334 246 322 246 Q 312 242 312 222 Z", "toq"), ellipse(323, 240, 7, 4, "qizil"), rect(317, 224, 6, 9, 2, "qaymoq"), rect(324, 223, 6, 9, 2, "qaymoq")],
        { hidden: true }
      ),
      layer(n("ogiz_xafa"), line("M 314 231 Q 324 224 334 231", "toq", 3.5), { hidden: true }),
    ],
  };

  // ---------- OLD (tomoshabinga qaragan) ----------
  const mx = (x) => 420 - x; // o'rta chiziq x=210
  const X2 = (s, x) => (s === 1 ? x : mx(x));
  const ikki = (f) => [f(1), f(-1)].flat();
  const quloqOld = (s) => [circle(X2(s, 260), 122, 30, rang), circle(X2(s, 260), 124, 19, "qaymoq")];

  const old = {
    w: W,
    h: H,
    layers: [
      layer(n("soya"), ellipse(210, 333, 84, 9, "toq", SOYA)),
      layer(n("dum"), line("M 262 300 C 312 306 334 280 326 248 C 320 226 300 222 290 236", rang, 9), { pivot: [262, 300] }),
      layer(n("panja_4"), [rect(170, 290, 16, 34, 8, rang), ellipse(176, 327, 15, 6, "qaymoq")], { pivot: [178, 292] }),
      layer(n("panja_3"), [rect(234, 290, 16, 34, 8, rang), ellipse(244, 327, 15, 6, "qaymoq")], { pivot: [242, 292] }),
      layer(n("tana"), [ellipse(210, 270, 72, 62, rang), ellipse(210, 286, 44, 40, "qaymoq")]),
      layer(n("panja_2"), [ellipse(186, 252, 14, 11, rang), ellipse(184, 256, 9, 7, "qaymoq")], { pivot: [178, 244] }),
      layer(n("panja_1"), [ellipse(234, 252, 14, 11, rang), ellipse(236, 256, 9, 7, "qaymoq")], { pivot: [242, 244] }),
      layer(n("quloq_chap"), quloqOld(1), { pivot: [244, 144] }),
      layer(n("quloq_ong"), quloqOld(-1), { pivot: [176, 144] }),
      layer(
        n("bosh"),
        [
          ellipse(210, 170, 62, 55, rang),
          ellipse(210, 196, 30, 22, rang),
          ellipse(210, 188, 8, 7, "qizil"),
          ...ikki((s) => [
            line(`M ${X2(s, 228)} 194 L ${X2(s, 266)} 186`, "toq", 2.5, SOYA),
            line(`M ${X2(s, 228)} 200 L ${X2(s, 268)} 202`, "toq", 2.5, SOYA),
          ]),
        ],
        { pivot: [210, 220] }
      ),
      layer(n("koz_ochiq"), ikki((s) => [ellipse(X2(s, 232), 160, 13, 15, "qaymoq"), ellipse(X2(s, 231), 162, 8, 10, "toq"), circle(X2(s, 234), 157, 3, "qaymoq")])),
      layer(n("koz_yumuq"), ikki((s) => line(`M ${X2(s, 220)} 162 Q ${X2(s, 232)} 170 ${X2(s, 244)} 162`, "toq", 4)), { hidden: true }),
      layer(n("koz_xursand"), ikki((s) => line(`M ${X2(s, 220)} 165 Q ${X2(s, 232)} 153 ${X2(s, 244)} 165`, "toq", 4)), { hidden: true }),
      layer(n("koz_qorqqan"), ikki((s) => [ellipse(X2(s, 232), 158, 16, 18, "qaymoq"), circle(X2(s, 231), 160, 4, "toq")]), { hidden: true }),
      layer(n("qosh_qorqqan"), ikki((s) => line(`M ${X2(s, 222)} 136 L ${X2(s, 246)} 142`, "toq", 5)), { hidden: true }),
      layer(n("qosh_jahldor"), ikki((s) => line(`M ${X2(s, 220)} 148 L ${X2(s, 248)} 136`, "toq", 6)), { hidden: true }),
      layer(n("ogiz_1"), line("M 200 204 Q 210 211 220 204", "toq", 3.5)),
      layer(n("ogiz_2"), path("M 200 202 Q 210 207 220 202 Q 218 216 210 216 Q 202 216 200 202 Z", "toq"), { hidden: true }),
      layer(
        n("ogiz_3"),
        [path("M 197 200 Q 210 207 223 200 Q 221 222 210 222 Q 199 222 197 200 Z", "toq"), ellipse(210, 217, 7, 3.5, "qizil"), rect(203, 202, 6, 9, 2, "qaymoq"), rect(211, 202, 6, 9, 2, "qaymoq")],
        { hidden: true }
      ),
      layer(n("ogiz_xafa"), line("M 200 210 Q 210 203 220 210", "toq", 3.5), { hidden: true }),
    ],
  };

  const ifoda = {
    xursand: { [n("koz_ochiq")]: false, [n("koz_xursand")]: true, [n("ogiz_1")]: false, [n("ogiz_3")]: true },
    qorqqan: { [n("koz_ochiq")]: false, [n("koz_qorqqan")]: true, [n("qosh_qorqqan")]: true, [n("ogiz_1")]: false, [n("ogiz_2")]: true },
    jahldor: { [n("qosh_jahldor")]: true, [n("ogiz_1")]: false, [n("ogiz_xafa")]: true },
  };

  return {
    nom,
    bolim,
    qatorY,
    views: { yon, old },
    ifodalar: { yon: ifoda, old: ifoda },
    holatlar: {
      yon: {
        "og'iz_1 (yopiq)": {},
        "og'iz_2 (yarim)": { [n("ogiz_1")]: false, [n("ogiz_2")]: true },
        "og'iz_3 (ochiq)": { [n("ogiz_1")]: false, [n("ogiz_3")]: true },
        "ko'z yumuq": { [n("koz_ochiq")]: false, [n("koz_yumuq")]: true },
      },
    },
    kesimMasshtab: 1.8,
    boshKesim: { yon: [220, 120, 170, 140], old: [130, 80, 160, 150] },
  };
}
