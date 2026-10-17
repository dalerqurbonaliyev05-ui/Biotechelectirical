// Eshak: yumshoq, sabrli, orzuchi. Kulrang-jigarrang, och qorin.
// Ko'rinish kadri: 900x760, yer chizig'i y=700.
// "chap"/"ong" — eshakning o'z chapi/o'ngi. Yon ko'rinishda (o'ngga qaragan) tomoshabinga chap tomoni ko'rinadi.
// Oyoqlar: 1 — oldingi chap, 2 — oldingi o'ng, 3 — orqa chap, 4 — orqa o'ng.
import { path, ellipse, circle, rect, line, layer, SOYA } from "../lib.mjs";

const W = 900;
const H = 760;

const oyoq = (x, w, top, bottom, uzoq) => [
  rect(x, top, w, bottom - top, w / 2, "eshakrang"),
  uzoq ? rect(x, top, w, bottom - top, w / 2, "toq", SOYA) : "",
  rect(x - 3, bottom - 30, w + 6, 34, 12, "toq"),
];

// ---------- YON (o'ngga qaragan) ----------
const yon = {
  w: W,
  h: H,
  layers: [
    layer("eshak_soya", ellipse(432, 702, 215, 18, "toq", SOYA)),
    layer(
      "eshak_dum",
      [
        line("M 258 368 C 224 388 210 434 216 482", "eshakrang", 18),
        path("M 216 466 C 240 480 242 522 216 542 C 190 522 192 480 216 466 Z", "jigarrang"),
      ],
      { pivot: [258, 370] }
    ),
    layer("eshak_oyoq_4", oyoq(336, 48, 450, 694, true), { pivot: [360, 470] }),
    layer("eshak_oyoq_2", oyoq(540, 48, 450, 694, true), { pivot: [564, 470] }),
    layer("eshak_oyoq_3", oyoq(290, 52, 450, 700, false), { pivot: [316, 470] }),
    layer("eshak_oyoq_1", oyoq(496, 52, 450, 700, false), { pivot: [522, 470] }),
    layer(
      "eshak_quloq_ong",
      [
        path("M 692 150 C 696 100 714 56 744 30 C 768 72 756 122 732 158 Z", "eshakrang"),
        path("M 692 150 C 696 100 714 56 744 30 C 768 72 756 122 732 158 Z", "toq", SOYA),
      ],
      { pivot: [712, 152] }
    ),
    layer("eshak_tana", [
      path("M 280 352 C 330 318 520 314 568 350 C 612 382 612 486 566 514 C 512 546 334 546 282 516 C 232 488 230 384 280 352 Z", "eshakrang"),
      path("M 312 498 C 372 476 510 474 570 492 C 550 528 362 538 312 498 Z", "qaymoq"),
    ]),
    layer(
      "eshak_bosh",
      [
        // bo'yin
        path("M 512 420 C 516 340 556 262 616 222 L 704 268 C 664 306 626 360 596 430 Z", "eshakrang"),
        // yol
        path(
          "M 636 198 C 616 198 600 210 592 224 C 576 222 566 238 568 254 C 552 258 546 276 550 290 C 536 296 532 316 538 330 C 526 340 524 358 530 372 C 520 384 518 400 524 410 C 536 396 548 372 560 346 C 574 316 590 286 610 258 C 624 238 640 222 654 210 Z",
          "jigarrang"
        ),
        // bosh
        ellipse(700, 200, 112, 86, "eshakrang", undefined, 20),
        // tumshuq
        ellipse(790, 258, 72, 58, "qaymoq", undefined, 20),
        ellipse(828, 242, 8, 11, "toq", undefined, 20),
        // peshonadagi kokil
        path("M 652 136 C 664 112 694 106 708 124 C 716 112 736 116 740 132 C 716 140 680 142 652 136 Z", "jigarrang"),
      ],
      { pivot: [560, 400] }
    ),
    layer(
      "eshak_quloq_chap",
      [
        path("M 640 158 C 592 124 576 70 588 30 C 630 46 676 104 684 146 Z", "eshakrang"),
        path("M 646 146 C 612 118 600 84 602 58 C 630 76 658 110 668 140 Z", "qaymoq"),
      ],
      { pivot: [662, 152] }
    ),
    layer("eshak_koz_ochiq", [
      ellipse(716, 178, 30, 35, "qaymoq"),
      ellipse(724, 183, 17, 22, "toq"),
      circle(731, 172, 6, "qaymoq"),
    ]),
    layer("eshak_koz_yumuq", line("M 688 182 Q 716 200 744 182", "toq", 6), { hidden: true }),
    layer("eshak_koz_xursand", line("M 688 190 Q 716 162 744 190", "toq", 6), { hidden: true }),
    layer("eshak_koz_qorqqan", [ellipse(716, 176, 34, 39, "qaymoq"), circle(722, 180, 8, "toq")], { hidden: true }),
    layer("eshak_qosh_qorqqan", line("M 692 134 L 742 120", "toq", 7), { hidden: true }),
    layer("eshak_qosh_jahldor", line("M 690 138 L 746 160", "toq", 8), { hidden: true }),
    layer("eshak_ogiz_1", line("M 776 296 Q 801 310 826 292", "toq", 5)),
    layer("eshak_ogiz_2", path("M 774 292 Q 801 306 828 288 Q 820 318 798 320 Q 778 316 774 292 Z", "toq"), { hidden: true }),
    layer(
      "eshak_ogiz_3",
      [
        path("M 770 288 Q 801 304 832 282 Q 828 336 800 340 Q 772 332 770 288 Z", "toq"),
        ellipse(801, 328, 17, 8, "qizil"),
      ],
      { hidden: true }
    ),
    layer("eshak_ogiz_xafa", line("M 776 306 Q 801 290 826 304", "toq", 5), { hidden: true }),
  ],
};

// ---------- OLD (tomoshabinga qaragan) ----------
const mx = (x) => 900 - x; // ko'zgu (o'rta chiziq x=450)
const quloqOld = (s) => {
  // s=1: eshakning chap qulog'i (tomoshabinga o'ngda), s=-1: o'ng qulog'i
  const X = (x) => (s === 1 ? x : mx(x));
  return [
    path(`M ${X(486)} 186 C ${X(516)} 126 ${X(544)} 62 ${X(580)} 26 C ${X(604)} 72 ${X(576)} 146 ${X(526)} 200 Z`, "eshakrang"),
    path(`M ${X(500)} 178 C ${X(526)} 128 ${X(550)} 80 ${X(574)} 54 C ${X(584)} 92 ${X(564)} 140 ${X(526)} 182 Z`, "qaymoq"),
  ];
};
const ikki = (f) => [f(1), f(-1)].flat();
const X2 = (s, x) => (s === 1 ? x : mx(x));

const old = {
  w: W,
  h: H,
  layers: [
    layer("eshak_soya", ellipse(450, 702, 200, 18, "toq", SOYA)),
    layer(
      "eshak_dum",
      [line("M 600 430 C 636 448 648 478 646 510", "eshakrang", 16), path("M 646 496 C 666 508 668 546 646 562 C 624 546 626 508 646 496 Z", "jigarrang")],
      { pivot: [600, 430] }
    ),
    layer("eshak_oyoq_4", oyoq(318, 42, 480, 688, true), { pivot: [339, 500] }),
    layer("eshak_oyoq_3", oyoq(540, 42, 480, 688, true), { pivot: [561, 500] }),
    layer("eshak_oyoq_2", oyoq(372, 48, 500, 700, false), { pivot: [396, 520] }),
    layer("eshak_oyoq_1", oyoq(480, 48, 500, 700, false), { pivot: [504, 520] }),
    layer("eshak_tana", [ellipse(450, 478, 162, 124, "eshakrang"), ellipse(450, 520, 82, 72, "qaymoq")]),
    layer("eshak_quloq_chap", quloqOld(1), { pivot: [506, 192] }),
    layer("eshak_quloq_ong", quloqOld(-1), { pivot: [394, 192] }),
    layer(
      "eshak_bosh",
      [
        rect(396, 320, 108, 120, 44, "eshakrang"),
        ellipse(450, 240, 116, 104, "eshakrang"),
        ellipse(450, 338, 90, 66, "qaymoq"),
        ellipse(420, 326, 8, 11, "toq"),
        ellipse(480, 326, 8, 11, "toq"),
        path("M 404 160 C 412 128 444 118 458 138 C 470 122 500 130 498 156 C 470 150 432 152 404 160 Z", "jigarrang"),
      ],
      { pivot: [450, 420] }
    ),
    layer(
      "eshak_koz_ochiq",
      ikki((s) => [ellipse(X2(s, 494), 232, 28, 33, "qaymoq"), ellipse(X2(s, 490), 238, 15, 20, "toq"), circle(X2(s, 497), 227, 6, "qaymoq")])
    ),
    layer("eshak_koz_yumuq", ikki((s) => line(`M ${X2(s, 468)} 236 Q ${X2(s, 494)} 254 ${X2(s, 520)} 236`, "toq", 6)), { hidden: true }),
    layer("eshak_koz_xursand", ikki((s) => line(`M ${X2(s, 468)} 244 Q ${X2(s, 494)} 216 ${X2(s, 520)} 244`, "toq", 6)), { hidden: true }),
    layer("eshak_koz_qorqqan", ikki((s) => [ellipse(X2(s, 494), 230, 32, 37, "qaymoq"), circle(X2(s, 492), 234, 8, "toq")]), { hidden: true }),
    layer("eshak_qosh_qorqqan", ikki((s) => line(`M ${X2(s, 472)} 178 L ${X2(s, 522)} 190`, "toq", 7)), { hidden: true }),
    layer("eshak_qosh_jahldor", ikki((s) => line(`M ${X2(s, 470)} 204 L ${X2(s, 524)} 184`, "toq", 8)), { hidden: true }),
    layer("eshak_ogiz_1", line("M 420 362 Q 450 382 480 362", "toq", 5)),
    layer("eshak_ogiz_2", path("M 420 356 Q 450 368 480 356 Q 474 390 450 392 Q 426 390 420 356 Z", "toq"), { hidden: true }),
    layer(
      "eshak_ogiz_3",
      [
        path("M 412 350 Q 450 364 488 350 Q 484 398 450 402 Q 416 398 412 350 Z", "toq"),
        ellipse(450, 388, 20, 9, "qizil"),
        rect(436, 355, 13, 14, 3, "qaymoq"),
        rect(451, 355, 13, 14, 3, "qaymoq"),
      ],
      { hidden: true }
    ),
    layer("eshak_ogiz_xafa", line("M 420 374 Q 450 356 480 374", "toq", 5), { hidden: true }),
  ],
};

// Ifodalar: qaysi qatlamlar ko'rinadi (asosiy holatga nisbatan)
const ifoda = {
  xursand: { eshak_koz_ochiq: false, eshak_koz_xursand: true, eshak_ogiz_1: false, eshak_ogiz_3: true },
  qorqqan: { eshak_koz_ochiq: false, eshak_koz_qorqqan: true, eshak_qosh_qorqqan: true, eshak_ogiz_1: false, eshak_ogiz_2: true },
  jahldor: { eshak_qosh_jahldor: true, eshak_ogiz_1: false, eshak_ogiz_xafa: true },
};

export default {
  nom: "eshak",
  bolim: "Eshak",
  views: { yon, old },
  ifodalar: { yon: ifoda, old: ifoda },
  // Animatsiya holatlari (ifodalar varag'ining pastki qatori)
  holatlar: {
    yon: {
      "og'iz_1 (yopiq)": {},
      "og'iz_2 (yarim)": { eshak_ogiz_1: false, eshak_ogiz_2: true },
      "og'iz_3 (ochiq)": { eshak_ogiz_1: false, eshak_ogiz_3: true },
      "ko'z yumuq": { eshak_koz_ochiq: false, eshak_koz_yumuq: true },
    },
  },
  // Ifodalar varag'ida boshni kesib ko'rsatish uchun ramka [x, y, w, h]
  boshKesim: { yon: [540, 10, 340, 350], old: [280, 10, 340, 410] },
};
