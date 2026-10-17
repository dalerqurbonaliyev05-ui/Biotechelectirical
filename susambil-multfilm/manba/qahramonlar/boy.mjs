// Boy (xo'jayin): semiz, zolim, xasis. Qizil to'n, katta salla, qora soqol, qo'lida xalacho'p.
// Ko'rinish kadri: 640x760, yer chizig'i y=700. Masshtab hayvonlar bilan bir xil (eshakdan baland).
// Teri rangi: olov + qaymoq 45% (palitra qoidasi bo'yicha yorug'lik) — shaftoli tus.
// "chap"/"ong" — boyning o'z chapi/o'ngi. Oyoq: 1 — chap, 2 — o'ng. Xalacho'p chap qo'lda (qol_chap bilan birga harakatlanadi).
import { path, ellipse, circle, line, layer, SOYA, YORUGLIK } from "../lib.mjs";

const W = 640;
const H = 760;

// teri: olov ustiga qaymoq 45%
const teri = (shape) => [shape("olov"), shape("qaymoq", YORUGLIK)];

// ---------- YON (o'ngga qaragan) ----------
const yon = {
  w: W,
  h: H,
  layers: [
    layer("boy_soya", ellipse(326, 702, 170, 16, "toq", SOYA)),
    layer(
      "boy_qol_ong",
      [
        path("M 262 352 C 236 380 222 430 222 484 L 252 490 C 254 440 266 398 290 372 Z", "qizil"),
        path("M 262 352 C 236 380 222 430 222 484 L 252 490 C 254 440 266 398 290 372 Z", "toq", SOYA),
        ...teri((c, o) => circle(236, 498, 19, c, o)),
      ],
      { pivot: [270, 360] }
    ),
    layer("boy_oyoq_2", [path("M 262 660 L 314 660 L 318 700 L 252 700 C 248 684 252 668 262 660 Z", "toq")], { pivot: [288, 640] }),
    layer("boy_oyoq_1", [path("M 322 662 L 366 662 C 388 668 410 680 410 698 L 322 700 Z", "toq")], { pivot: [344, 640] }),
    layer("boy_tana", [
      path("M 252 332 C 196 352 160 470 178 590 C 188 650 214 676 240 680 L 420 680 C 446 674 468 640 474 590 C 490 470 452 352 392 332 Z", "qizil"),
      line("M 398 338 C 452 410 478 520 466 676", "qum", 10),
      path("M 178 466 Q 330 506 482 466 L 482 502 Q 330 542 178 502 Z", "olov"),
      path("M 194 626 C 270 648 390 648 464 620 C 456 652 440 672 420 680 L 240 680 C 220 676 204 656 194 626 Z", "toq", SOYA),
    ]),
    layer(
      "boy_bosh",
      [
        ...teri((c, o) => circle(330, 252, 64, c, o)),
        // quloq
        ...teri((c, o) => circle(298, 258, 13, c, o)),
        circle(298, 258, 13, "toq", SOYA),
        // soqol
        path("M 274 256 C 276 330 326 352 372 330 C 396 316 404 290 400 266 C 380 300 300 300 274 256 Z", "toq"),
        // mo'ylov
        path("M 352 276 C 368 266 392 266 404 278 C 392 284 372 286 352 276 Z", "toq"),
        // burun
        ellipse(398, 254, 19, 16, "olov"),
      ],
      { pivot: [326, 318] }
    ),
    layer(
      "boy_salla",
      [
        ellipse(334, 124, 32, 16, "olov"),
        path("M 252 214 C 240 154 286 114 340 114 C 402 116 432 162 422 216 C 380 230 292 230 252 214 Z", "qaymoq"),
        line("M 262 190 C 300 160 370 150 416 176", "toq", 3, SOYA),
        line("M 258 208 C 300 182 380 176 420 200", "toq", 3, SOYA),
        line("M 284 146 C 320 132 380 134 406 150", "toq", 3, SOYA),
      ],
      { pivot: [336, 214] }
    ),
    layer(
      "boy_xalachop",
      [line("M 428 470 L 470 694", "jigarrang", 12), circle(426, 466, 10, "jigarrang")],
      { pivot: [432, 506] }
    ),
    layer(
      "boy_qol_chap",
      [
        path("M 340 342 C 384 352 424 420 438 492 L 404 504 C 392 446 364 396 330 376 Z", "qizil"),
        path("M 340 342 C 384 352 424 420 438 492 L 404 504 C 392 446 364 396 330 376 Z", "toq", SOYA),
        line("M 404 500 L 438 490", "qum", 8),
        ...teri((c, o) => circle(424, 508, 21, c, o)),
      ],
      { pivot: [350, 356] }
    ),
    layer("boy_koz_ochiq", [ellipse(362, 236, 14, 16, "qaymoq"), ellipse(366, 239, 9, 11, "toq"), circle(369, 234, 3, "qaymoq")]),
    layer("boy_koz_yumuq", line("M 348 238 Q 362 247 376 238", "toq", 5), { hidden: true }),
    layer("boy_koz_xursand", line("M 348 242 Q 362 228 376 242", "toq", 5), { hidden: true }),
    layer("boy_koz_qorqqan", [ellipse(362, 234, 17, 19, "qaymoq"), circle(364, 236, 4.5, "toq")], { hidden: true }),
    layer("boy_qosh_qorqqan", line("M 346 208 L 378 200", "toq", 7), { hidden: true }),
    layer("boy_qosh_jahldor", line("M 344 208 L 382 224", "toq", 9), { hidden: true }),
    layer("boy_ogiz_1", line("M 366 294 Q 380 298 392 292", "qizil", 5)),
    layer("boy_ogiz_2", path("M 364 290 Q 380 296 394 288 Q 390 310 378 310 Q 366 306 364 290 Z", "qizil"), { hidden: true }),
    layer("boy_ogiz_3", [path("M 360 286 Q 380 294 398 282 Q 396 324 378 324 Q 362 318 360 286 Z", "qizil"), path("M 364 296 Q 380 300 394 292 Q 390 318 378 318 Q 366 314 364 296 Z", "toq")], { hidden: true }),
    layer("boy_ogiz_xafa", line("M 366 300 Q 380 290 392 300", "qizil", 5), { hidden: true }),
  ],
};

// ---------- OLD (tomoshabinga qaragan) ----------
const mx = (x) => 640 - x; // o'rta chiziq x=320
const X2 = (s, x) => (s === 1 ? x : mx(x));
const ikki = (f) => [f(1), f(-1)].flat();
const qolOld = (s) => [
  path(`M ${X2(s, 408)} 352 C ${X2(s, 452)} 380 ${X2(s, 474)} 440 ${X2(s, 476)} 500 L ${X2(s, 440)} 506 C ${X2(s, 436)} 456 ${X2(s, 420)} 410 ${X2(s, 392)} 384 Z`, "qizil"),
  path(`M ${X2(s, 408)} 352 C ${X2(s, 452)} 380 ${X2(s, 474)} 440 ${X2(s, 476)} 500 L ${X2(s, 440)} 506 C ${X2(s, 436)} 456 ${X2(s, 420)} 410 ${X2(s, 392)} 384 Z`, "toq", SOYA),
  line(`M ${X2(s, 440)} 502 L ${X2(s, 476)} 496`, "qum", 8),
  ...teri((c, o) => circle(X2(s, 458), 516, 21, c, o)),
];

const old = {
  w: W,
  h: H,
  layers: [
    layer("boy_soya", ellipse(320, 702, 170, 16, "toq", SOYA)),
    layer("boy_oyoq_2", path("M 252 660 L 304 660 L 306 700 L 236 700 C 236 680 242 666 252 660 Z", "toq"), { pivot: [280, 640] }),
    layer("boy_oyoq_1", path("M 388 660 L 336 660 L 334 700 L 404 700 C 404 680 398 666 388 660 Z", "toq"), { pivot: [360, 640] }),
    layer("boy_tana", [
      path("M 236 334 C 170 360 140 480 156 600 C 166 652 196 676 226 680 L 414 680 C 444 676 474 652 484 600 C 500 480 470 360 404 334 Z", "qizil"),
      line("M 300 340 L 300 676", "qum", 10),
      line("M 340 340 L 340 676", "qum", 10),
      path("M 156 470 Q 320 510 484 470 L 486 506 Q 320 546 154 506 Z", "olov"),
      path("M 172 626 C 260 650 380 650 468 626 C 460 656 442 676 414 680 L 226 680 C 198 676 180 656 172 626 Z", "toq", SOYA),
    ]),
    layer("boy_qol_ong", qolOld(-1), { pivot: [222, 360] }),
    layer(
      "boy_bosh",
      [
        ...ikki((s) => [...teri((c, o) => circle(X2(s, 384), 258, 13, c, o)), circle(X2(s, 384), 258, 13, "toq", SOYA)]),
        ...teri((c, o) => circle(320, 252, 66, c, o)),
        path("M 256 262 C 260 336 300 356 320 356 C 340 356 380 336 384 262 C 362 300 278 300 256 262 Z", "toq"),
        path("M 280 284 C 296 272 312 274 320 282 C 328 274 344 272 360 284 C 344 292 330 292 320 286 C 310 292 296 292 280 284 Z", "toq"),
        ellipse(320, 262, 19, 16, "olov"),
      ],
      { pivot: [320, 318] }
    ),
    layer(
      "boy_salla",
      [
        ellipse(320, 124, 32, 16, "olov"),
        path("M 236 214 C 226 154 270 114 320 114 C 370 114 414 154 404 214 C 364 230 276 230 236 214 Z", "qaymoq"),
        line("M 246 190 C 290 162 350 162 394 190", "toq", 3, SOYA),
        line("M 242 208 C 290 182 350 182 398 208", "toq", 3, SOYA),
        line("M 264 146 C 300 132 340 132 376 146", "toq", 3, SOYA),
      ],
      { pivot: [320, 214] }
    ),
    layer("boy_xalachop", [line("M 466 476 L 492 694", "jigarrang", 12), circle(464, 472, 10, "jigarrang")], { pivot: [458, 516] }),
    layer("boy_qol_chap", qolOld(1), { pivot: [418, 360] }),
    layer("boy_koz_ochiq", ikki((s) => [ellipse(X2(s, 344), 236, 14, 16, "qaymoq"), ellipse(X2(s, 343), 239, 9, 11, "toq"), circle(X2(s, 346), 234, 3, "qaymoq")])),
    layer("boy_koz_yumuq", ikki((s) => line(`M ${X2(s, 330)} 238 Q ${X2(s, 344)} 247 ${X2(s, 358)} 238`, "toq", 5)), { hidden: true }),
    layer("boy_koz_xursand", ikki((s) => line(`M ${X2(s, 330)} 242 Q ${X2(s, 344)} 228 ${X2(s, 358)} 242`, "toq", 5)), { hidden: true }),
    layer("boy_koz_qorqqan", ikki((s) => [ellipse(X2(s, 344), 234, 17, 19, "qaymoq"), circle(X2(s, 343), 236, 4.5, "toq")]), { hidden: true }),
    layer("boy_qosh_qorqqan", ikki((s) => line(`M ${X2(s, 330)} 204 L ${X2(s, 362)} 212`, "toq", 7)), { hidden: true }),
    layer("boy_qosh_jahldor", ikki((s) => line(`M ${X2(s, 328)} 222 L ${X2(s, 366)} 204`, "toq", 9)), { hidden: true }),
    layer("boy_ogiz_1", line("M 304 302 Q 320 308 336 302", "qizil", 5)),
    layer("boy_ogiz_2", path("M 302 298 Q 320 304 338 298 Q 334 320 320 320 Q 306 320 302 298 Z", "qizil"), { hidden: true }),
    layer("boy_ogiz_3", [path("M 298 294 Q 320 302 342 294 Q 340 334 320 334 Q 300 334 298 294 Z", "qizil"), path("M 302 302 Q 320 308 338 302 Q 334 328 320 328 Q 306 328 302 302 Z", "toq")], { hidden: true }),
    layer("boy_ogiz_xafa", line("M 304 308 Q 320 298 336 308", "qizil", 5), { hidden: true }),
  ],
};

const ifoda = {
  xursand: { boy_koz_ochiq: false, boy_koz_xursand: true, boy_ogiz_1: false, boy_ogiz_3: true },
  qorqqan: { boy_koz_ochiq: false, boy_koz_qorqqan: true, boy_qosh_qorqqan: true, boy_ogiz_1: false, boy_ogiz_2: true },
  jahldor: { boy_qosh_jahldor: true, boy_ogiz_1: false, boy_ogiz_3: true },
};

export default {
  nom: "boy",
  bolim: "Boy",
  views: { yon, old },
  ifodalar: { yon: ifoda, old: ifoda },
  holatlar: {
    yon: {
      "og'iz_1 (yopiq)": {},
      "og'iz_2 (yarim)": { boy_ogiz_1: false, boy_ogiz_2: true },
      "og'iz_3 (baqirish)": { boy_ogiz_1: false, boy_ogiz_3: true },
      "ko'z yumuq": { boy_koz_ochiq: false, boy_koz_yumuq: true },
    },
  },
  boshKesim: { yon: [230, 90, 230, 290], old: [210, 90, 220, 290] },
};
