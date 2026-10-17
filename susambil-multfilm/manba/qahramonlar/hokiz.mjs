// Ho'kiz: kuchli, jahldor, lekin mehribon. To'q jigarrang, oq (qaymoq) dog'lar.
// Ko'rinish kadri: 900x760, yer chizig'i y=700 (eshak bilan bir xil o'lchov).
// "chap"/"ong" — ho'kizning o'z chapi/o'ngi. Oyoqlar: 1 — oldingi chap, 2 — oldingi o'ng, 3 — orqa chap, 4 — orqa o'ng.
import { path, ellipse, circle, rect, line, layer, SOYA } from "../lib.mjs";

const W = 900;
const H = 760;

const oyoq = (x, w, top, bottom, uzoq) => [
  rect(x, top, w, bottom - top, w / 2.4, "jigarrang"),
  uzoq ? rect(x, top, w, bottom - top, w / 2.4, "toq", SOYA) : "",
  rect(x - 4, bottom - 32, w + 8, 36, 12, "toq"),
  rect(x + w / 2 - 2, bottom - 30, 4, 34, 2, "jigarrang"),
];

// ---------- YON (o'ngga qaragan) ----------
const yon = {
  w: W,
  h: H,
  layers: [
    layer("hokiz_soya", ellipse(440, 702, 250, 20, "toq", SOYA)),
    layer(
      "hokiz_dum",
      [line("M 226 352 C 204 396 198 452 206 512", "jigarrang", 14), path("M 206 494 C 228 508 230 552 206 574 C 182 552 184 508 206 494 Z", "toq")],
      { pivot: [228, 352] }
    ),
    layer("hokiz_oyoq_4", oyoq(318, 60, 470, 694, true), { pivot: [348, 490] }),
    layer("hokiz_oyoq_2", oyoq(568, 60, 470, 694, true), { pivot: [598, 490] }),
    layer("hokiz_oyoq_3", oyoq(262, 64, 470, 700, false), { pivot: [294, 490] }),
    layer("hokiz_oyoq_1", oyoq(514, 64, 470, 700, false), { pivot: [546, 490] }),
    layer(
      "hokiz_shox_ong",
      [
        path("M 748 282 C 748 240 776 206 826 192 C 806 218 796 250 790 288 Z", "qum"),
        path("M 748 282 C 748 240 776 206 826 192 C 806 218 796 250 790 288 Z", "toq", SOYA),
      ],
      { pivot: [768, 284] }
    ),
    layer("hokiz_shox_chap", path("M 704 300 C 696 248 718 204 768 184 C 748 212 744 250 748 298 Z", "qum"), { pivot: [722, 292] }),
    layer(
      "hokiz_quloq_ong",
      [path("M 730 300 C 714 280 692 270 668 270 C 676 294 698 306 730 312 Z", "jigarrang"), path("M 730 300 C 714 280 692 270 668 270 C 676 294 698 306 730 312 Z", "toq", SOYA)],
      { pivot: [728, 304] }
    ),
    layer("hokiz_tana", [
      path("M 248 330 C 300 286 470 280 560 296 C 624 286 674 330 676 404 C 680 484 646 544 592 560 C 500 584 320 584 258 556 C 196 528 192 380 248 330 Z", "jigarrang"),
      path("M 316 326 C 360 306 424 314 434 350 C 444 386 402 406 366 398 C 328 390 292 360 316 326 Z", "qaymoq"),
      path("M 520 476 C 548 460 594 470 594 498 C 594 526 552 538 528 524 C 506 514 500 486 520 476 Z", "qaymoq"),
    ]),
    layer(
      "hokiz_bosh",
      [
        // yo'g'on bo'yin
        path("M 578 330 C 626 302 690 304 726 332 L 744 452 C 700 474 640 472 600 456 Z", "jigarrang"),
        // bosh
        ellipse(746, 350, 98, 90, "jigarrang"),
        // tumshuq
        ellipse(798, 420, 84, 60, "qum", undefined, -8),
        ellipse(846, 404, 9, 13, "toq", undefined, -8),
        // kokil
        path("M 708 270 C 720 248 750 242 764 260 C 774 248 796 252 800 270 C 768 274 736 276 708 270 Z", "jigarrang"),
        path("M 708 270 C 720 248 750 242 764 260 C 774 248 796 252 800 270 C 768 274 736 276 708 270 Z", "toq", SOYA),
      ],
      { pivot: [620, 410] }
    ),
    layer(
      "hokiz_quloq_chap",
      [path("M 706 324 C 686 300 658 284 626 282 C 636 312 664 332 706 340 Z", "jigarrang"), path("M 696 324 C 680 308 662 298 644 294 C 652 314 670 326 696 332 Z", "toq", SOYA)],
      { pivot: [704, 330] }
    ),
    layer("hokiz_koz_ochiq", [ellipse(766, 334, 27, 31, "qaymoq"), ellipse(774, 339, 15, 19, "toq"), circle(780, 329, 5, "qaymoq")]),
    layer("hokiz_koz_yumuq", line("M 740 338 Q 766 354 792 338", "toq", 6), { hidden: true }),
    layer("hokiz_koz_xursand", line("M 740 346 Q 766 320 792 346", "toq", 6), { hidden: true }),
    layer("hokiz_koz_qorqqan", [ellipse(766, 332, 31, 36, "qaymoq"), circle(772, 336, 7, "toq")], { hidden: true }),
    layer("hokiz_qosh_qorqqan", line("M 740 292 L 792 278", "toq", 8), { hidden: true }),
    layer("hokiz_qosh_jahldor", line("M 736 294 L 796 318", "toq", 10), { hidden: true }),
    layer("hokiz_ogiz_1", line("M 780 456 Q 806 468 834 450", "toq", 5)),
    layer("hokiz_ogiz_2", path("M 778 452 Q 806 466 836 446 Q 828 478 806 480 Q 784 476 778 452 Z", "toq"), { hidden: true }),
    layer(
      "hokiz_ogiz_3",
      [path("M 774 446 Q 806 464 840 440 Q 836 496 808 500 Q 778 494 774 446 Z", "toq"), ellipse(808, 488, 18, 8, "qizil")],
      { hidden: true }
    ),
    layer("hokiz_ogiz_xafa", line("M 780 466 Q 806 450 834 462", "toq", 5), { hidden: true }),
  ],
};

// ---------- OLD (tomoshabinga qaragan) ----------
const mx = (x) => 900 - x;
const X2 = (s, x) => (s === 1 ? x : mx(x));
const ikki = (f) => [f(1), f(-1)].flat();

const old = {
  w: W,
  h: H,
  layers: [
    layer("hokiz_soya", ellipse(450, 702, 230, 20, "toq", SOYA)),
    layer(
      "hokiz_dum",
      [line("M 624 410 C 660 430 670 470 666 520", "jigarrang", 14), path("M 666 504 C 688 518 690 560 666 580 C 642 560 644 518 666 504 Z", "toq")],
      { pivot: [624, 410] }
    ),
    layer("hokiz_oyoq_4", oyoq(294, 54, 500, 688, true), { pivot: [321, 520] }),
    layer("hokiz_oyoq_3", oyoq(552, 54, 500, 688, true), { pivot: [579, 520] }),
    layer("hokiz_oyoq_2", oyoq(354, 64, 520, 700, false), { pivot: [386, 540] }),
    layer("hokiz_oyoq_1", oyoq(482, 64, 520, 700, false), { pivot: [514, 540] }),
    layer("hokiz_tana", [
      ellipse(450, 476, 190, 136, "jigarrang"),
      ellipse(450, 512, 84, 76, "qaymoq"),
      path("M 560 402 C 590 392 620 410 616 440 C 612 466 580 470 562 454 C 546 440 540 410 560 402 Z", "qaymoq"),
    ]),
    layer(
      "hokiz_shox_chap",
      path("M 528 214 C 582 212 630 182 652 112 C 674 176 632 240 546 248 Z", "qum"),
      { pivot: [538, 230] }
    ),
    layer("hokiz_shox_ong", path("M 372 214 C 318 212 270 182 248 112 C 226 176 268 240 354 248 Z", "qum"), { pivot: [362, 230] }),
    layer(
      "hokiz_quloq_chap",
      [path("M 556 252 C 596 238 640 246 664 270 C 632 292 590 292 556 282 Z", "jigarrang"), path("M 566 260 C 594 256 622 262 640 272 C 616 282 590 282 566 276 Z", "toq", SOYA)],
      { pivot: [560, 266] }
    ),
    layer(
      "hokiz_quloq_ong",
      [path("M 344 252 C 304 238 260 246 236 270 C 268 292 310 292 344 282 Z", "jigarrang"), path("M 334 260 C 306 256 278 262 260 272 C 284 282 310 282 334 276 Z", "toq", SOYA)],
      { pivot: [340, 266] }
    ),
    layer(
      "hokiz_bosh",
      [
        rect(380, 340, 140, 120, 50, "jigarrang"),
        ellipse(450, 280, 126, 112, "jigarrang"),
        ellipse(450, 374, 102, 64, "qum"),
        ellipse(412, 368, 10, 13, "toq"),
        ellipse(488, 368, 10, 13, "toq"),
        path("M 450 176 C 478 196 484 232 450 258 C 416 232 422 196 450 176 Z", "qaymoq"),
        path("M 400 178 C 414 152 446 146 458 166 C 470 150 498 154 500 176 C 466 172 432 174 400 178 Z", "jigarrang"),
        path("M 400 178 C 414 152 446 146 458 166 C 470 150 498 154 500 176 C 466 172 432 174 400 178 Z", "toq", SOYA),
      ],
      { pivot: [450, 440] }
    ),
    layer(
      "hokiz_koz_ochiq",
      ikki((s) => [ellipse(X2(s, 502), 284, 27, 31, "qaymoq"), ellipse(X2(s, 498), 290, 15, 19, "toq"), circle(X2(s, 505), 279, 5, "qaymoq")])
    ),
    layer("hokiz_koz_yumuq", ikki((s) => line(`M ${X2(s, 476)} 288 Q ${X2(s, 502)} 306 ${X2(s, 528)} 288`, "toq", 6)), { hidden: true }),
    layer("hokiz_koz_xursand", ikki((s) => line(`M ${X2(s, 476)} 296 Q ${X2(s, 502)} 268 ${X2(s, 528)} 296`, "toq", 6)), { hidden: true }),
    layer("hokiz_koz_qorqqan", ikki((s) => [ellipse(X2(s, 502), 282, 31, 36, "qaymoq"), circle(X2(s, 500), 286, 7, "toq")]), { hidden: true }),
    layer("hokiz_qosh_qorqqan", ikki((s) => line(`M ${X2(s, 478)} 232 L ${X2(s, 530)} 244`, "toq", 8)), { hidden: true }),
    layer("hokiz_qosh_jahldor", ikki((s) => line(`M ${X2(s, 474)} 260 L ${X2(s, 534)} 238`, "toq", 10)), { hidden: true }),
    layer("hokiz_ogiz_1", line("M 416 404 Q 450 424 484 404", "toq", 5)),
    layer("hokiz_ogiz_2", path("M 416 398 Q 450 410 484 398 Q 478 430 450 432 Q 422 430 416 398 Z", "toq"), { hidden: true }),
    layer(
      "hokiz_ogiz_3",
      [path("M 408 394 Q 450 408 492 394 Q 488 436 450 438 Q 412 436 408 394 Z", "toq"), ellipse(450, 426, 22, 8, "qizil")],
      { hidden: true }
    ),
    layer("hokiz_ogiz_xafa", line("M 416 418 Q 450 398 484 418", "toq", 5), { hidden: true }),
  ],
};

const ifoda = {
  xursand: { hokiz_koz_ochiq: false, hokiz_koz_xursand: true, hokiz_ogiz_1: false, hokiz_ogiz_3: true },
  qorqqan: { hokiz_koz_ochiq: false, hokiz_koz_qorqqan: true, hokiz_qosh_qorqqan: true, hokiz_ogiz_1: false, hokiz_ogiz_2: true },
  jahldor: { hokiz_qosh_jahldor: true, hokiz_ogiz_1: false, hokiz_ogiz_xafa: true },
};

export default {
  nom: "hokiz",
  bolim: "Ho'kiz",
  views: { yon, old },
  ifodalar: { yon: ifoda, old: ifoda },
  holatlar: {
    yon: {
      "og'iz_1 (yopiq)": {},
      "og'iz_2 (yarim)": { hokiz_ogiz_1: false, hokiz_ogiz_2: true },
      "og'iz_3 (ochiq)": { hokiz_ogiz_1: false, hokiz_ogiz_3: true },
      "ko'z yumuq": { hokiz_koz_ochiq: false, hokiz_koz_yumuq: true },
    },
  },
  boshKesim: { yon: [560, 150, 340, 370], old: [250, 90, 400, 380] },
};
