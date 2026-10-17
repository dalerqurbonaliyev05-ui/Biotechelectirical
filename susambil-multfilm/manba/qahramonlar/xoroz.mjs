// Xo'roz: kichkina, baland ovozli, tez xafa bo'ladi. Qizil toj, to'q sariq tana, yashil dum patlari.
// Ko'rinish kadri: 520x520, yer chizig'i y=480. Masshtab eshak/ho'kiz bilan bir xil (kichik qahramon — kichik kadr).
// "chap"/"ong" — xo'rozning o'z chapi/o'ngi. Oyoqlar: 1 — chap, 2 — o'ng.
import { path, ellipse, circle, line, layer, SOYA } from "../lib.mjs";

const W = 520;
const H = 520;

const oyoq = (x1, y1, x2, y2) => {
  const toes = [
    `M ${x2} ${y2} L ${x2 - 22} ${y2 + 8}`,
    `M ${x2} ${y2} L ${x2 + 24} ${y2 + 8}`,
    `M ${x2} ${y2} L ${x2 - 2} ${y2 + 11}`,
  ];
  return [
    line(`M ${x1} ${y1} L ${x2} ${y2}`, "qum", 10),
    ...toes.map((d) => line(d, "qum", 8)),
  ];
};

// ---------- YON (o'ngga qaragan) ----------
const yon = {
  w: W,
  h: H,
  layers: [
    layer("xoroz_soya", ellipse(258, 486, 112, 12, "toq", SOYA)),
    layer(
      "xoroz_dum_patlari",
      [
        path("M 196 322 C 132 304 96 244 106 186 C 130 240 166 276 222 298 Z", "yashil"),
        path("M 196 322 C 132 304 96 244 106 186 C 130 240 166 276 222 298 Z", "toq", SOYA),
        path("M 200 304 C 146 262 128 190 158 130 C 168 194 196 244 238 276 Z", "yashil"),
        path("M 196 336 C 142 344 102 318 90 276 C 128 304 168 312 214 312 Z", "yashil"),
      ],
      { pivot: [206, 312] }
    ),
    layer("xoroz_oyoq_2", oyoq(286, 384, 290, 470), { pivot: [286, 386] }),
    layer("xoroz_oyoq_1", oyoq(242, 384, 238, 472), { pivot: [242, 386] }),
    layer("xoroz_tana", [
      path("M 176 322 C 172 266 230 240 288 246 C 342 252 364 300 354 346 C 344 394 294 410 244 406 C 200 402 178 372 176 322 Z", "olov"),
      path("M 312 262 C 344 274 362 312 350 350 C 340 380 312 392 296 372 C 312 340 314 296 312 262 Z", "qum"),
    ]),
    layer(
      "xoroz_bosh",
      [
        // bo'yin patlari
        path("M 286 218 C 274 252 280 292 302 318 C 330 306 354 282 362 248 C 352 226 318 214 286 218 Z", "qum"),
        circle(330, 204, 52, "olov"),
        // soqol (sirg'a)
        ellipse(372, 252, 12, 19, "qizil"),
      ],
      { pivot: [310, 270] }
    ),
    layer(
      "xoroz_toj",
      path("M 298 166 C 286 140 302 116 322 128 C 320 102 348 94 356 118 C 368 98 394 108 386 136 C 398 146 386 166 368 164 C 346 160 320 162 298 166 Z", "qizil"),
      { pivot: [336, 160] }
    ),
    layer(
      "xoroz_qanot_chap",
      [
        path("M 304 300 C 286 268 236 270 208 296 C 190 316 204 350 236 356 C 272 360 306 336 304 300 Z", "olov"),
        path("M 304 300 C 286 268 236 270 208 296 C 190 316 204 350 236 356 C 272 360 306 336 304 300 Z", "toq", SOYA),
        path("M 208 318 C 216 334 232 344 248 346 C 236 352 220 352 210 344 C 200 336 200 326 208 318 Z", "toq", SOYA),
      ],
      { pivot: [292, 296] }
    ),
    layer("xoroz_koz_ochiq", [ellipse(346, 194, 17, 20, "qaymoq"), ellipse(350, 198, 10, 13, "toq"), circle(354, 191, 3.5, "qaymoq")]),
    layer("xoroz_koz_yumuq", line("M 330 196 Q 346 206 362 196", "toq", 5), { hidden: true }),
    layer("xoroz_koz_xursand", line("M 330 200 Q 346 184 362 200", "toq", 5), { hidden: true }),
    layer("xoroz_koz_qorqqan", [ellipse(346, 192, 20, 23, "qaymoq"), circle(349, 195, 5, "toq")], { hidden: true }),
    layer("xoroz_qosh_qorqqan", line("M 330 168 L 362 160", "toq", 6), { hidden: true }),
    layer("xoroz_qosh_jahldor", line("M 328 166 L 366 180", "toq", 7), { hidden: true }),
    layer("xoroz_tumshuq_1", path("M 372 200 C 394 202 412 210 422 220 C 406 226 388 226 372 222 Z", "qum")),
    layer(
      "xoroz_tumshuq_2",
      [
        path("M 376 208 Q 400 210 414 211 Q 398 224 376 224 Z", "toq"),
        path("M 372 196 C 394 194 414 200 424 208 C 406 212 388 212 372 210 Z", "qum"),
        path("M 372 222 C 388 226 402 232 410 238 C 394 240 380 236 370 230 Z", "qum"),
      ],
      { hidden: true }
    ),
  ],
};

// ---------- OLD (tomoshabinga qaragan) ----------
const mx = (x) => 520 - x; // o'rta chiziq x=260
const X2 = (s, x) => (s === 1 ? x : mx(x));
const ikki = (f) => [f(1), f(-1)].flat();

const old = {
  w: W,
  h: H,
  layers: [
    layer("xoroz_soya", ellipse(260, 486, 100, 12, "toq", SOYA)),
    layer(
      "xoroz_dum_patlari",
      [
        path("M 300 312 C 340 290 370 250 376 196 C 398 244 380 300 320 330 Z", "yashil"),
        path("M 304 322 C 350 310 388 284 406 244 C 414 292 382 330 318 340 Z", "yashil"),
        path("M 304 322 C 350 310 388 284 406 244 C 414 292 382 330 318 340 Z", "toq", SOYA),
        path("M 300 300 C 326 268 340 228 334 186 C 360 226 352 280 314 318 Z", "yashil"),
        path("M 300 300 C 326 268 340 228 334 186 C 360 226 352 280 314 318 Z", "toq", SOYA),
      ],
      { pivot: [306, 318] }
    ),
    layer("xoroz_oyoq_2", oyoq(240, 400, 238, 470), { pivot: [240, 402] }),
    layer("xoroz_oyoq_1", oyoq(280, 400, 282, 470), { pivot: [280, 402] }),
    layer("xoroz_tana", [ellipse(260, 336, 90, 80, "olov"), ellipse(260, 352, 56, 56, "qum")]),
    layer(
      "xoroz_qanot_chap",
      [
        path("M 324 292 C 352 302 362 336 354 366 C 346 388 326 390 320 372 C 314 344 314 312 324 292 Z", "olov"),
        path("M 324 292 C 352 302 362 336 354 366 C 346 388 326 390 320 372 C 314 344 314 312 324 292 Z", "toq", SOYA),
      ],
      { pivot: [332, 296] }
    ),
    layer(
      "xoroz_qanot_ong",
      [
        path("M 196 292 C 168 302 158 336 166 366 C 174 388 194 390 200 372 C 206 344 206 312 196 292 Z", "olov"),
        path("M 196 292 C 168 302 158 336 166 366 C 174 388 194 390 200 372 C 206 344 206 312 196 292 Z", "toq", SOYA),
      ],
      { pivot: [188, 296] }
    ),
    layer(
      "xoroz_bosh",
      [
        path("M 216 220 C 206 252 218 284 260 296 C 302 284 314 252 304 220 C 286 204 234 204 216 220 Z", "qum"),
        circle(260, 200, 54, "olov"),
        ellipse(248, 270, 9, 14, "qizil"),
        ellipse(272, 270, 9, 14, "qizil"),
      ],
      { pivot: [260, 270] }
    ),
    layer(
      "xoroz_toj",
      path("M 226 158 C 218 132 236 116 250 128 C 252 102 280 100 282 124 C 296 110 316 122 306 144 C 302 156 290 160 280 158 C 260 154 242 156 226 158 Z", "qizil"),
      { pivot: [264, 156] }
    ),
    layer(
      "xoroz_koz_ochiq",
      ikki((s) => [ellipse(X2(s, 284), 192, 17, 20, "qaymoq"), ellipse(X2(s, 282), 196, 10, 13, "toq"), circle(X2(s, 286), 189, 3.5, "qaymoq")])
    ),
    layer("xoroz_koz_yumuq", ikki((s) => line(`M ${X2(s, 268)} 194 Q ${X2(s, 284)} 204 ${X2(s, 300)} 194`, "toq", 5)), { hidden: true }),
    layer("xoroz_koz_xursand", ikki((s) => line(`M ${X2(s, 268)} 198 Q ${X2(s, 284)} 182 ${X2(s, 300)} 198`, "toq", 5)), { hidden: true }),
    layer("xoroz_koz_qorqqan", ikki((s) => [ellipse(X2(s, 284), 190, 20, 23, "qaymoq"), circle(X2(s, 283), 193, 5, "toq")]), { hidden: true }),
    layer("xoroz_qosh_qorqqan", ikki((s) => line(`M ${X2(s, 270)} 160 L ${X2(s, 302)} 168`, "toq", 6)), { hidden: true }),
    layer("xoroz_qosh_jahldor", ikki((s) => line(`M ${X2(s, 268)} 176 L ${X2(s, 304)} 162`, "toq", 7)), { hidden: true }),
    layer("xoroz_tumshuq_1", path("M 244 216 C 252 210 268 210 276 216 C 272 228 266 238 260 244 C 254 238 248 228 244 216 Z", "qum")),
    layer(
      "xoroz_tumshuq_2",
      [
        ellipse(260, 231, 11, 6, "toq"),
        path("M 246 208 C 254 204 266 204 274 208 C 271 216 266 224 260 228 C 254 224 249 216 246 208 Z", "qum"),
        path("M 250 234 C 256 232 264 232 270 234 C 267 241 263 247 260 251 C 257 247 253 241 250 234 Z", "qum"),
      ],
      { hidden: true }
    ),
  ],
};

const ifoda = {
  xursand: { xoroz_koz_ochiq: false, xoroz_koz_xursand: true, xoroz_tumshuq_1: false, xoroz_tumshuq_2: true },
  qorqqan: { xoroz_koz_ochiq: false, xoroz_koz_qorqqan: true, xoroz_qosh_qorqqan: true, xoroz_tumshuq_1: false, xoroz_tumshuq_2: true },
  jahldor: { xoroz_qosh_jahldor: true },
};

export default {
  nom: "xoroz",
  bolim: "Xo'roz",
  views: { yon, old },
  ifodalar: { yon: ifoda, old: ifoda },
  holatlar: {
    yon: {
      "tumshuq_1 (yopiq)": {},
      "tumshuq_2 (ochiq)": { xoroz_tumshuq_1: false, xoroz_tumshuq_2: true },
      "ko'z yumuq": { xoroz_koz_ochiq: false, xoroz_koz_yumuq: true },
    },
  },
  kesimMasshtab: 1.6,
  boshKesim: { yon: [250, 90, 210, 200], old: [160, 90, 200, 200] },
};
