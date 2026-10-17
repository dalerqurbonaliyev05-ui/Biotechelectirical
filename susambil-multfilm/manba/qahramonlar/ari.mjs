// Ari: to'da bo'lib uchadi, "g'uvv" qiladi, chaqadi. Sariq-qora.
// Ko'rinish kadri: 260x220 (uchib yuradi — yer va soya yo'q).
// Masshtab: ifodasi ko'rinishi uchun ataylab kattalashtirilgan (kalamush boshi kattaligida).
// Qanotlar alohida (tez qoqish uchun), nesh (nayza) alohida (chaqish uchun).
import { path, ellipse, circle, line, layer, SOYA } from "../lib.mjs";

const W = 260;
const H = 220;

const qanot = (cx, cy, rx, ry, rot, uzoq) => [
  ellipse(cx, cy, rx, ry, "qaymoq", undefined, rot),
  line(`M ${cx} ${cy + ry * 0.7} L ${cx} ${cy - ry * 0.6}`, "toq", 2.5, SOYA).replace("/>", ` transform="rotate(${rot} ${cx} ${cy})"/>`),
  uzoq ? ellipse(cx, cy, rx, ry, "toq", SOYA, rot) : "",
];

// ---------- YON (o'ngga qaragan) ----------
const yon = {
  w: W,
  h: H,
  layers: [
    layer("ari_qanot_ong", qanot(134, 66, 24, 42, 22, true), { pivot: [140, 98] }),
    layer("ari_nesh", path("M 58 118 L 28 128 L 58 138 Z", "toq"), { pivot: [58, 128] }),
    layer("ari_tana", [
      line("M 100 166 L 96 184", "toq", 4),
      line("M 120 168 L 118 186", "toq", 4),
      line("M 140 164 L 142 182", "toq", 4),
      ellipse(110, 125, 58, 44, "qum"),
      path("M 92 84 C 104 100 104 150 92 166 L 76 162 C 86 146 86 104 76 88 Z", "toq"),
      path("M 132 83 C 142 100 142 150 132 167 L 116 168 C 126 150 126 100 116 82 Z", "toq"),
    ]),
    layer(
      "ari_bosh",
      [
        line("M 176 76 C 172 60 164 50 156 42", "toq", 4),
        circle(155, 40, 6, "toq"),
        line("M 192 74 C 196 58 204 48 214 42", "toq", 4),
        circle(215, 41, 6, "toq"),
        circle(184, 106, 36, "qum"),
      ],
      { pivot: [156, 116] }
    ),
    layer("ari_qanot_chap", qanot(112, 62, 24, 42, -18, false), { pivot: [122, 96] }),
    layer("ari_koz_ochiq", [ellipse(196, 100, 11, 13, "qaymoq"), ellipse(199, 102, 7, 9, "toq"), circle(201, 98, 2.5, "qaymoq")]),
    layer("ari_koz_yumuq", line("M 186 102 Q 196 109 206 102", "toq", 3.5), { hidden: true }),
    layer("ari_koz_xursand", line("M 186 105 Q 196 95 206 105", "toq", 3.5), { hidden: true }),
    layer("ari_koz_qorqqan", [ellipse(196, 98, 13, 15, "qaymoq"), circle(198, 100, 3.5, "toq")], { hidden: true }),
    layer("ari_qosh_qorqqan", line("M 186 82 L 206 77", "toq", 4), { hidden: true }),
    layer("ari_qosh_jahldor", line("M 184 80 L 208 90", "toq", 5), { hidden: true }),
    layer("ari_ogiz_1", line("M 198 122 Q 206 128 214 121", "toq", 3)),
    layer("ari_ogiz_2", path("M 198 120 Q 206 125 214 119 Q 212 132 206 132 Q 199 131 198 120 Z", "toq"), { hidden: true }),
    layer("ari_ogiz_3", [path("M 196 118 Q 206 124 216 116 Q 214 138 206 138 Q 197 136 196 118 Z", "toq"), ellipse(206, 133, 5, 3, "qizil")], { hidden: true }),
    layer("ari_ogiz_xafa", line("M 198 127 Q 206 120 214 127", "toq", 3), { hidden: true }),
  ],
};

// ---------- OLD (tomoshabinga qaragan) ----------
const mx = (x) => 260 - x; // o'rta chiziq x=130
const X2 = (s, x) => (s === 1 ? x : mx(x));
const ikki = (f) => [f(1), f(-1)].flat();

const old = {
  w: W,
  h: H,
  layers: [
    layer("ari_qanot_ong", qanot(78, 92, 24, 42, -32, false), { pivot: [104, 112] }),
    layer("ari_qanot_chap", qanot(182, 92, 24, 42, 32, false), { pivot: [156, 112] }),
    layer("ari_nesh", path("M 122 186 L 130 206 L 138 186 Z", "toq"), { pivot: [130, 186] }),
    layer("ari_tana", [
      line("M 108 182 L 104 196", "toq", 4),
      line("M 152 182 L 156 196", "toq", 4),
      ellipse(130, 150, 46, 40, "qum"),
      path("M 86 140 Q 130 150 174 140 L 175 152 Q 130 162 85 152 Z", "toq"),
      path("M 94 164 Q 130 174 166 164 L 162 176 Q 130 186 98 176 Z", "toq"),
    ]),
    layer(
      "ari_bosh",
      [
        line(`M 116 66 C 110 50 102 42 94 36`, "toq", 4),
        circle(93, 35, 6, "toq"),
        line(`M 144 66 C 150 50 158 42 166 36`, "toq", 4),
        circle(167, 35, 6, "toq"),
        circle(130, 98, 38, "qum"),
      ],
      { pivot: [130, 132] }
    ),
    layer("ari_koz_ochiq", ikki((s) => [ellipse(X2(s, 146), 94, 11, 13, "qaymoq"), ellipse(X2(s, 145), 96, 7, 9, "toq"), circle(X2(s, 148), 92, 2.5, "qaymoq")])),
    layer("ari_koz_yumuq", ikki((s) => line(`M ${X2(s, 136)} 96 Q ${X2(s, 146)} 103 ${X2(s, 156)} 96`, "toq", 3.5)), { hidden: true }),
    layer("ari_koz_xursand", ikki((s) => line(`M ${X2(s, 136)} 99 Q ${X2(s, 146)} 89 ${X2(s, 156)} 99`, "toq", 3.5)), { hidden: true }),
    layer("ari_koz_qorqqan", ikki((s) => [ellipse(X2(s, 146), 92, 13, 15, "qaymoq"), circle(X2(s, 145), 94, 3.5, "toq")]), { hidden: true }),
    layer("ari_qosh_qorqqan", ikki((s) => line(`M ${X2(s, 138)} 74 L ${X2(s, 158)} 79`, "toq", 4)), { hidden: true }),
    layer("ari_qosh_jahldor", ikki((s) => line(`M ${X2(s, 136)} 84 L ${X2(s, 160)} 74`, "toq", 5)), { hidden: true }),
    layer("ari_ogiz_1", line("M 121 116 Q 130 123 139 116", "toq", 3)),
    layer("ari_ogiz_2", path("M 121 114 Q 130 119 139 114 Q 137 127 130 127 Q 123 127 121 114 Z", "toq"), { hidden: true }),
    layer("ari_ogiz_3", [path("M 119 112 Q 130 118 141 112 Q 139 132 130 132 Q 121 132 119 112 Z", "toq"), ellipse(130, 127, 5, 3, "qizil")], { hidden: true }),
    layer("ari_ogiz_xafa", line("M 121 121 Q 130 114 139 121", "toq", 3), { hidden: true }),
  ],
};

const ifoda = {
  xursand: { ari_koz_ochiq: false, ari_koz_xursand: true, ari_ogiz_1: false, ari_ogiz_3: true },
  qorqqan: { ari_koz_ochiq: false, ari_koz_qorqqan: true, ari_qosh_qorqqan: true, ari_ogiz_1: false, ari_ogiz_2: true },
  jahldor: { ari_qosh_jahldor: true, ari_ogiz_1: false, ari_ogiz_xafa: true },
};

export default {
  nom: "ari",
  bolim: "Ari",
  views: { yon, old },
  ifodalar: { yon: ifoda, old: ifoda },
  holatlar: {
    yon: {
      "og'iz_1 (yopiq)": {},
      "og'iz_2 (yarim)": { ari_ogiz_1: false, ari_ogiz_2: true },
      "og'iz_3 (ochiq)": { ari_ogiz_1: false, ari_ogiz_3: true },
      "ko'z yumuq": { ari_koz_ochiq: false, ari_koz_yumuq: true },
    },
  },
  kesimMasshtab: 1.5,
  boshKesim: { yon: [10, 10, 240, 200], old: [30, 10, 200, 210] },
};
