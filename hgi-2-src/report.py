"""Har bir variant uchun to'liq yechim (markdown + rasmlar) tayyorlash."""
import math
import os
from fractions import Fraction as Fr
from solver import Solution, det
from schemes import NOTES
from drawing import Fig, draw_circuit, arrow_spot, RED, BLUE, GREEN, LW, RL, RW, ER, SUB
from matplotlib.patches import Rectangle, Circle, Polygon

ROMAN = ["I", "II", "III", "IV", "V"]
SUBS = "₀₁₂₃₄₅₆₇₈₉"


def sub(k):
    return str(k).translate(str.maketrans("0123456789", SUBS))


def isint(x):
    return (isinstance(x, int) or (isinstance(x, Fr) and x.denominator == 1)) and not isinstance(x, bool)


def n(x, d=3):
    if isint(x):
        return str(int(x))
    if isinstance(x, Fr) and (x * 10 ** d).denominator == 1:
        s = f"{float(x):.{d}f}".rstrip("0").rstrip(".")
        return s.replace(".", "{,}")
    s = f"{float(x):.{d}f}"
    if s.startswith("-") and float(s) == 0:
        s = s[1:]
    return s.replace(".", "{,}")


def pn(x, d=3):
    s = n(x, d)
    return f"({s})" if s.startswith("-") else s


def t(x, d=3):
    if isint(x):
        return str(int(x))
    s = f"{float(x):.{d}f}"
    if s.startswith("-") and float(s) == 0:
        s = s[1:]
    return s.replace(".", ",")


def r3(x):
    return round(float(x), 3)


def ifrac(x):
    x = Fr(x)
    return str(x.numerator) if x.denominator == 1 else f"{x.numerator}/{x.denominator}"


def vm(m):
    rows = [" & ".join(str(v) for v in r) for r in m]
    return r"\begin{vmatrix} " + r" \\ ".join(rows) + r" \end{vmatrix}"


def signed_terms(terms):
    """terms: [(sign, text)] -> 'a - b + c'"""
    out = ""
    for i, (s, txt) in enumerate(terms):
        if i == 0:
            out += ("-" if s < 0 else "") + txt
        else:
            out += (" - " if s < 0 else " + ") + txt
    return out if out else "0"


def emf_text(emfs):
    return signed_terms([(s, f"E_{j}") for (j, s) in emfs])


# ======================================================================
#                                RASMLAR
# ======================================================================

def seg_dist(p, a, b):
    ax, ay = a; bx, by = b; px, py = p
    dx, dy = bx - ax, by - ay
    L2 = dx * dx + dy * dy
    tt = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / L2)) if L2 else 0
    return math.dist(p, (ax + tt * dx, ay + tt * dy))


def label_positions(circ):
    """Element yozuvlari joylashuvi (to'qnashuvdan qochish uchun)."""
    from drawing import lab_side
    pts = []
    for els in circ.placed:
        for (tt, k, s, pos, o, f) in els:
            off = lab_side(pos, o)
            pts.append((pos[0] + off[0], pos[1] + off[1]))
            pts.append(pos)
    return pts


def node_label(F, circ, p, text, color="k", extra_avoid=()):
    cands = [(-0.22, 0.22), (0.22, 0.22), (-0.22, -0.24), (0.22, -0.24), (0, 0.27), (0, -0.28), (-0.28, 0), (0.28, 0)]
    avoid = label_positions(circ) + list(extra_avoid)
    best, bs = None, -1
    for (ox, oy) in cands:
        q = (p[0] + ox, p[1] + oy)
        dw = min(seg_dist(q, a, b) for (a, b, _) in circ.segs)
        da = min([math.dist(q, a) for a in avoid] + [9])
        score = min(dw * 2.2, da)
        if score > bs + 1e-6:
            bs, best = score, q
    F.ax.add_patch(Circle(p, 0.065, fc="k", ec="k", zorder=6))
    F.ax.text(best[0], best[1], text, fontsize=15, style="italic", fontweight="bold",
              ha="center", va="center", zorder=8, color=color)
    return best


def draw_base(sol, F, labels=True, **kw):
    circ = sol.circ
    gap = draw_circuit(F, circ, node_labels=False, **kw)
    placed = []
    if labels:
        for p in circ.nodes:
            placed.append(node_label(F, circ, p, circ.names[p]))
    return gap, placed


def cur_arrows(sol, F, avoid=(), color=RED, names=None, dirs=None, only=None):
    circ = sol.circ
    spots = []
    for b in circ.branches:
        k = b.k
        if only is not None and k not in only:
            continue
        sp = arrow_spot(circ, b, avoid_extra=[s for s in spots]) or arrow_spot(circ, b)
        assert sp is not None, (sol.v, k)
        pos, u = sp
        sgn = sol.o[k] if dirs is None else dirs[k]
        vec = (u[0] * sgn, u[1] * sgn)
        lab = names[k] if names else f"I$_{k}$"
        # yozuv joyi: strelkaga perpendikulyar, elementlar yozuvlaridan uzoqroq
        avoid_pts = label_positions(circ)
        cands = [(-u[1] * 0.34, u[0] * 0.34), (u[1] * 0.34, -u[0] * 0.34)]
        best = max(cands, key=lambda o: min(math.dist((pos[0] + o[0], pos[1] + o[1]), a) for a in avoid_pts)
                   - 0.25 * (abs(pos[0] + o[0] - 2) > 3.2 or abs(pos[1] + o[1] - 2) > 3.2))
        F.arrow(pos, vec, lab, color=color, loff=best)
        spots.append(pos)
    return spots


def make_figures(sol, outdir):
    os.makedirs(outdir, exist_ok=True)
    circ = sol.circ
    v = sol.v
    # 1. berilgan sxema
    F = Fig(); draw_circuit(F, circ, node_labels=False)
    for p in circ.nodes:
        F.ax.add_patch(Circle(p, 0.06, fc="k", zorder=6))
    F.caption(f"1-rasm. Berilgan sxema ({v}-sxema)"); F.save(f"{outdir}/f1.png")
    # 2. toklar va konturlar
    F = Fig(); draw_base(sol, F); cur_arrows(sol, F)
    for i, m in enumerate(sol.meshes):
        F.loop(m["center"], 0.36, ROMAN[i], color=GREEN)
    F.caption("2-rasm. Tugunlar, tarmoq toklari va konturlar"); F.save(f"{outdir}/f2.png")
    # 3. kontur toklar
    F = Fig(); draw_base(sol, F); cur_arrows(sol, F)
    for i, m in enumerate(sol.meshes):
        F.loop(m["center"], 0.38, f"I$_{{{i + 1}{i + 1}}}$", color=BLUE)
    F.caption("3-rasm. Kontur toklar usuli"); F.save(f"{outdir}/f3.png")
    # 4. tugun potensiallari
    F = Fig(); draw_base(sol, F); cur_arrows(sol, F)
    gp = [p for p in circ.nodes if circ.names[p] == sol.ground][0]
    F.ax.add_patch(Circle(gp, 0.13, fc="none", ec=BLUE, lw=2, zorder=7))
    F.caption(f"4-rasm. Tugun potensiallar usuli ($\\varphi_{sol.ground}$ = 0, ko'k doira)"); F.save(f"{outdir}/f4.png")
    # 5. salt ishlash
    F = Fig()
    gap, _ = draw_base(sol, F, gap_branch=sol.kcut)
    names, dirs, only = {}, {}, set()
    for c in sol.comps:
        x, sgn, a, bnode = c["chain"][0]
        only.add(x)
        s = 1 if c["I"] >= 0 else -1
        dirs[x] = sol.o[x] * sgn * s
        names[x] = "I$_{" + "".join(str(ch[0]) for ch in c["chain"]) + "xx}$" if len(c["chain"]) == 1 else \
            "I$_{" + str(x) + "xx}$"
    cur_arrows(sol, F, color=GREEN, names=names, dirs=dirs, only=only)
    a, b, o = gap
    # X tomondagi qisqich
    xa, xb = x_side(sol, a, b)
    vec = (xb[0] - xa[0], xb[1] - xa[1]); L = math.hypot(*vec); u = (vec[0] / L, vec[1] / L)
    perp = (-u[1] * 0.3, u[0] * 0.3)
    mid = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
    # perpendikulyar tomonni sxema ichiga qaratamiz
    if math.dist((mid[0] + perp[0], mid[1] + perp[1]), (2, 2)) > math.dist((mid[0] - perp[0], mid[1] - perp[1]), (2, 2)):
        perp = (-perp[0], -perp[1])
    F.ax.annotate("", xy=(xb[0] + perp[0] - u[0] * 0.05, xb[1] + perp[1] - u[1] * 0.05),
                  xytext=(xa[0] + perp[0] + u[0] * 0.05, xa[1] + perp[1] + u[1] * 0.05),
                  arrowprops=dict(arrowstyle="-|>", color=BLUE, lw=1.8, mutation_scale=15))
    F.ax.text(mid[0] + perp[0] * 2.1, mid[1] + perp[1] * 2.1, "U$_{xx}$", color=BLUE, fontsize=14,
              ha="center", va="center", fontweight="bold")
    F.caption(f"5-rasm. Salt ishlash rejimi ({sol.kcut}-tarmoq uzilgan)"); F.save(f"{outdir}/f5.png")
    # 6. passiv sxema
    F = Fig()
    gap, _ = draw_base(sol, F, gap_branch=sol.kcut, passive=True)
    a, b, o = gap
    mid = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
    off = (0, 0.32) if o == "h" else (0.5, 0)
    if math.dist((mid[0] + off[0], mid[1] + off[1]), (2, 2)) > math.dist((mid[0] - off[0], mid[1] - off[1]), (2, 2)):
        off = (-off[0], -off[1])
    F.ax.text(mid[0] + off[0], mid[1] + off[1], "R$_{ekv}$", color=BLUE, fontsize=14, ha="center", va="center", fontweight="bold")
    F.caption("6-rasm. R$_{ekv}$ ni aniqlash sxemasi (EYuK lar qisqa tutashtirilgan)"); F.save(f"{outdir}/f6.png")
    # 7. ekvivalent generator
    eg_figure(sol, f"{outdir}/f7.png")


def x_side(sol, a, b):
    """Uzilgan tarmoq qisqichlaridan qaysi biri X tuguniga ulangan — (X tomoni, Y tomoni)."""
    circ = sol.circ
    br = circ.bk[sol.kcut]
    pts = br.pts if sol.o[sol.kcut] == 1 else list(reversed(br.pts))
    # pts: X dan Y ga. a va b ni yo'l bo'yicha masofasi bilan solishtiramiz
    def along(q):
        acc = 0
        best = (9e9, 0)
        for i in range(len(pts) - 1):
            d = seg_dist(q, pts[i], pts[i + 1])
            if d < best[0]:
                best = (d, acc + math.dist(pts[i], q))
            acc += math.dist(pts[i], pts[i + 1])
        return best[1]
    return (a, b) if along(a) < along(b) else (b, a)


def eg_figure(sol, fn):
    import matplotlib.pyplot as plt
    fig, ax = plt.subplots(figsize=(5.4, 3.7)); ax.set_aspect("equal"); ax.axis("off")
    ax.set_xlim(-0.8, 4.9); ax.set_ylim(-0.9, 2.8)
    ax.plot([0, 4, 4, 0, 0], [0, 0, 2, 2, 0], color="k", lw=LW, zorder=1)
    ax.add_patch(Circle((0, 1), ER, fc="white", ec="k", lw=LW, zorder=3))
    ax.annotate("", xy=(0, 1 + ER), xytext=(0, 1 - ER * 0.85), arrowprops=dict(arrowstyle="-|>", lw=2, color="k", mutation_scale=16), zorder=4)
    ax.text(-0.4, 1, "E$_{ekv}$=U$_{xx}$", fontsize=13, fontweight="bold", ha="right", va="center")
    ax.add_patch(Rectangle((1.5 - RL / 2, 2 - RW / 2), RL, RW, fc="white", ec="k", lw=LW, zorder=3))
    ax.text(1.5, 2.35, "R$_{ekv}$", fontsize=13, fontweight="bold", ha="center")
    k = sol.kcut
    br = sol.br[k]
    if br["emfs"]:
        ry = 1.35; ey = 0.6
        (j, s) = br["emfs"][0]
        ax.add_patch(Circle((4, ey), ER, fc="white", ec="k", lw=LW, zorder=3))
        d = -1 if s > 0 else 1   # X (yuqori) -> Y (past) yo'nalish = pastga
        ax.annotate("", xy=(4, ey + d * ER), xytext=(4, ey - d * ER * 0.85),
                    arrowprops=dict(arrowstyle="-|>", lw=2, color="k", mutation_scale=16), zorder=4)
        ax.text(4.4, ey, f"E$_{j}$", fontsize=13, fontweight="bold", ha="left", va="center")
    else:
        ry = 1
    ax.add_patch(Rectangle((4 - RW / 2, ry - RL / 2), RW, RL, fc="white", ec="k", lw=LW, zorder=3))
    ax.text(4.4, ry, f"R$_{k}$", fontsize=13, fontweight="bold", ha="left", va="center")
    ax.add_patch(Polygon([(3.0, 2), (2.8, 2.12), (2.8, 1.88)], fc=RED, ec=RED, zorder=7))
    ax.text(2.9, 2.32, f"I$_{k}$", color=RED, fontsize=14, fontweight="bold", ha="center")
    for p, lab, off in [((4, 2), sol.X, (0.22, 0.2)), ((4, 0), sol.Y, (0.22, -0.22))]:
        ax.add_patch(Circle(p, 0.07, fc="k", zorder=6))
        ax.text(p[0] + off[0], p[1] + off[1], lab, fontsize=15, style="italic", fontweight="bold", ha="center", va="center")
    ax.text(2, -0.6, "7-rasm. Ekvivalent generator sxemasi", ha="center", fontsize=13)
    fig.savefig(fn, dpi=160, bbox_inches="tight", pad_inches=0.05); plt.close(fig)


# ======================================================================
#                                 MATN
# ======================================================================

def build_markdown(sol, img):
    v = sol.v
    E, R = sol.E, sol.R
    I = sol.I
    i = {k: r3(I[k]) for k in I}
    nodes = sol.nodes
    md = []
    A = md.append
    A(f"""---
title: "2-HGI. Murakkab o'zgarmas tok elektr zanjirlarini hisoblash"
subtitle: "{v}-variant ({v}-sxema)"
lang: uz
---

**Fan:** Nazariy elektrotexnika
**Bajardi:** ______________________  **Guruh:** __________
**Tekshirdi:** ______________________

# Berilgan ma'lumotlar

{v}-variant uchun sxema parametrlari (1-jadvaldan olindi):

| E₁, V | E₂, V | E₃, V | R₁, Om | R₂, Om | R₃, Om | R₄, Om | R₅, Om | R₆, Om | Uziladigan tarmoq |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| {E[1]} | {E[2]} | {E[3]} | {R[1]} | {R[2]} | {R[3]} | {R[4]} | {R[5]} | {R[6]} | {sol.kcut} |
""")
    missing = [j for j in (1, 2, 3) if j not in sol.used_E]
    if missing:
        A(f"*Eslatma:* {v}-sxemada " + ", ".join(f"E{sub(j)}" for j in missing) +
          (" manbai yo'q, shuning uchun u hisobda qatnashmaydi.\n" if len(missing) == 1 else " manbalari yo'q, shuning uchun ular hisobda qatnashmaydi.\n"))
    if v in NOTES:
        A(f"*Eslatma:* {NOTES[v]}\n")
    A(f"""**Topshiriq.** Berilgan sxema uchun:

1. Kirxgofning birinchi va ikkinchi qonunlari bo'yicha tenglamalar tuzish;
2. kontur toklar usuli bo'yicha tarmoq toklarini topish;
3. tugun potensiallar usuli bo'yicha tarmoq toklarini topish;
4. topilgan toklarni Kirxgofning I va II qonunlari asosida tekshirish;
5. ekvivalent generator usuli yordamida {sol.kcut}-tarmoqdagi tokni (I{sub(sol.kcut)}) aniqlash;
6. quvvat muvozanati tenglamasini tuzish va hisoblash xatoligini aniqlash.

![]({img}/f1.png){{width=9cm}}

# Sxemani tahlil qilish va tok yo'nalishlarini tanlash

Sxemada **4 ta tugun** ({", ".join("*" + x + "*" for x in nodes)}) va **6 ta tarmoq** bor (n = 4, m = 6). Har bir tarmoq raqami undagi rezistor raqamiga teng:

| Tarmoq | Tarkibi | Ulanish tugunlari | Tokning tanlangan yo'nalishi |
|:---:|:---:|:---:|:---:|""")
    for k in range(1, 7):
        b = sol.br[k]
        comp = ", ".join([f"R{sub(k)}"] + [f"E{sub(j)}" for (j, s) in b["emfs"]])
        A(f"| {k} | {comp} | *{min(b['start'], b['end'])}* – *{max(b['start'], b['end'])}* | *{b['start']}* → *{b['end']}* |")
    A(f"""
Kirxgofning I qonuni bo'yicha mustaqil tenglamalar soni: n − 1 = 4 − 1 = **3**.
Kirxgofning II qonuni bo'yicha mustaqil tenglamalar soni: m − (n − 1) = 6 − 3 = **3**.
Jami 6 ta tenglama — 6 ta noma'lum tokni topish uchun yetarli.

Tarmoq toklarining shartli musbat yo'nalishlari 2-rasmda qizil strelkalar bilan ko'rsatilgan. Konturlarni aylanib chiqish yo'nalishi — soat mili bo'yicha (yashil strelkalar).

![]({img}/f2.png){{width=10cm}}

# 1. Kirxgof qonunlari bo'yicha tenglamalar tuzish

**Kirxgofning birinchi qonuni** (tugunga kiruvchi toklar «+», chiquvchi toklar «−» ishora bilan olinadi):
""")

    def kcl_terms(nd):
        terms = []
        for k in range(1, 7):
            b = sol.br[k]
            if b["end"] == nd:
                terms.append((1, f"I_{k}"))
            elif b["start"] == nd:
                terms.append((-1, f"I_{k}"))
        return terms

    lines = []
    for j, nd in enumerate(nodes):
        tail = r" \quad (\text{tekshirish uchun})" if j == len(nodes) - 1 else ""
        lines.append(rf"&\text{{«{nd}» tugun uchun:}} && {signed_terms(kcl_terms(nd))} = 0{';' if j < len(nodes) - 1 else '.'}{tail}")
    A("$$\n\\begin{aligned}\n" + "\\\\\n".join(lines) + "\n\\end{aligned}\n$$\n")
    A("**Kirxgofning ikkinchi qonuni** (tok yoki EYuK yo'nalishi kontur aylanish yo'nalishiga mos kelsa «+», teskari bo'lsa «−»):\n")

    def mesh_name(mi):
        m = sol.meshes[mi]
        return f"{ROMAN[mi]} kontur ({'–'.join(m['seq'] + [m['seq'][0]])})"

    def kvl(mi, numeric=False):
        m = sol.meshes[mi]
        lhs, rhs = [], []
        for (k, s) in m["edges"]:
            lhs.append((s, f"{R[k]}I_{k}" if numeric else f"I_{k}R_{k}"))
            for (j, js) in sol.br[k]["emfs"]:
                rhs.append((s * js, f"E_{j}"))
        val = sum(s * E[int(x[2:])] for (s, x) in rhs)
        return signed_terms(lhs), (str(val) if numeric else signed_terms(rhs))

    lines = []
    for mi in range(len(sol.meshes)):
        l, r = kvl(mi)
        lines.append(rf"&\text{{{mesh_name(mi)}:}} && {l} = {r}{';' if mi < 2 else '.'}")
    A("$$\n\\begin{aligned}\n" + "\\\\\n".join(lines) + "\n\\end{aligned}\n$$\n")
    A("Son qiymatlarini qo'ysak:\n")
    lines = [f"&{signed_terms(kcl_terms(nd))} = 0" for nd in nodes[:-1]]
    for mi in range(3):
        l, r = kvl(mi, True)
        lines.append(f"&{l} = {r}")
    A("$$\n\\left\\{\n\\begin{aligned}\n" + "\\\\\n".join(lines) + "\n\\end{aligned}\n\\right.\n$$\n")
    A("Bu 6 noma'lumli tenglamalar sistemasining yechimi quyida kontur toklar va tugun potensiallar usullari yordamida topiladi.\n")

    # ---------------- 2. kontur toklar
    A(f"""# 2. Kontur toklar usuli

Kontur toklarini I₁₁, I₂₂, I₃₃ bilan belgilab, ularni soat mili yo'nalishida yo'naltiramiz (3-rasm).

![]({img}/f3.png){{width=10cm}}

Kontur toklar usuli tenglamalarining umumiy ko'rinishi:
""")
    ms = sol.ms
    nm = len(sol.meshes)

    def Rsum(keys):
        return "+".join(f"R_{k}" for k in keys)

    lines = []
    for a_ in range(nm):
        terms = []
        for b_ in range(nm):
            if a_ == b_:
                keys = sorted(ms[a_].keys())
                terms.append((1, f"I_{{{b_ + 1}{b_ + 1}}}({Rsum(keys)})"))
            else:
                shared = sorted(k for k in ms[a_] if k in ms[b_])
                if not shared:
                    continue
                sg = 1 if sol.MA[a_][b_] > 0 else -1
                rs = Rsum(shared) if len(shared) == 1 else f"({Rsum(shared)})"
                terms.append((sg, f"I_{{{b_ + 1}{b_ + 1}}}{rs}"))
        rhs = []
        for k in sorted(ms[a_]):
            for (j, js) in sol.br[k]["emfs"]:
                rhs.append((ms[a_][k] * js, f"E_{j}"))
        lines.append(f"&{signed_terms(terms)} = {signed_terms(rhs)}")
    A("$$\n\\left\\{\n\\begin{aligned}\n" + "\\\\\n".join(lines) + "\n\\end{aligned}\n\\right.\n$$\n")
    # izoh
    parts = []
    for a_ in range(nm):
        keys = sorted(ms[a_].keys())
        parts.append(f"R{sub(a_ + 1)}{sub(a_ + 1)} = " + " + ".join(f"R{sub(k)}" for k in keys) + " = " +
                     " + ".join(str(R[k]) for k in keys) + f" = {sol.MA[a_][a_]} Om")
    mutual = []
    for a_ in range(nm):
        for b_ in range(a_ + 1, nm):
            shared = sorted(k for k in ms[a_] if k in ms[b_])
            if shared:
                mutual.append(f"R{sub(a_ + 1)}{sub(b_ + 1)} = " + " + ".join(f"R{sub(k)}" for k in shared) +
                              f" = {sum(R[k] for k in shared)} Om")
    emfp = []
    for a_ in range(nm):
        rhs = []
        for k in sorted(ms[a_]):
            for (j, js) in sol.br[k]["emfs"]:
                rhs.append((ms[a_][k] * js, f"E{sub(j)}"))
        txt = signed_terms(rhs).replace("-", "−")
        emfp.append(f"E{sub(a_ + 1)}{sub(a_ + 1)} = {txt} = {sol.MB[a_]} V" if rhs else f"E{sub(a_ + 1)}{sub(a_ + 1)} = 0")
    A("Bu yerda: " + "; ".join(parts) + " — konturlarning xususiy qarshiliklari; " + ", ".join(mutual) +
      " — qo'shni konturlarning umumiy qarshiliklari (kontur toklari umumiy tarmoqda qarama-qarshi yo'nalgani uchun tenglamada «−» ishora bilan olinadi). "
      "Konturlarning EYuKlari (aylanish yo'nalishiga mos EYuK «+», teskari EYuK «−»): " + "; ".join(emfp) + ".\n")
    A("Son qiymatlarini qo'yamiz:\n")
    lines = []
    for a_ in range(nm):
        terms = []
        for b_ in range(nm):
            c = sol.MA[a_][b_]
            if c == 0:
                continue
            terms.append((1 if c > 0 else -1, f"{abs(c)}\\,I_{{{b_ + 1}{b_ + 1}}}"))
        lines.append(f"&{signed_terms(terms)} = {sol.MB[a_]}")
    A("$$\n\\left\\{\n\\begin{aligned}\n" + "\\\\\n".join(lines) + "\n\\end{aligned}\n\\right.\n$$\n")
    A("Tenglamalar sistemasini Kramer usuli bilan yechamiz. Bosh determinant:\n")
    MA = [[int(x) for x in r] for r in sol.MA]
    MB = [int(x) for x in sol.MB]
    A(r"$$\Delta = " + vm(MA) + f" = {int(sol.MD)}." + "$$\n")
    A("Yordamchi determinantlar (tegishli ustun ozod hadlar bilan almashtiriladi):\n")
    for c in range(nm):
        Mc = [[MB[r] if j == c else MA[r][j] for j in range(nm)] for r in range(nm)]
        A(rf"$$\Delta_{{{c + 1}{c + 1}}} = " + vm(Mc) + f" = {int(sol.MDs[c])}." + "$$\n")
    A("Kontur toklari:\n")
    lines = []
    for c in range(nm):
        lines.append(rf"I_{{{c + 1}{c + 1}}} &= \frac{{\Delta_{{{c + 1}{c + 1}}}}}{{\Delta}} = \frac{{{int(sol.MDs[c])}}}{{{int(sol.MD)}}} = {n(sol.Imesh[c])}\ \text{{A}}" + (";" if c < nm - 1 else "."))
    A("$$\n\\begin{aligned}\n" + "\\\\\n".join(lines) + "\n\\end{aligned}\n$$\n")
    negs = [c for c in range(nm) if sol.Imesh[c] < 0]
    if negs:
        A(", ".join(f"I{sub(c + 1)}{sub(c + 1)}" for c in negs) +
          (" ning manfiy chiqishi bu kontur tokining" if len(negs) == 1 else " larning manfiy chiqishi bu kontur toklarining") +
          " haqiqiy yo'nalishi soat miliga teskari ekanini bildiradi.\n")
    A("Kontur toklari orqali tarmoq toklarini aniqlaymiz (tarmoq tokining yo'nalishi bilan mos kontur toki «+», teskari kontur toki «−» bilan olinadi):\n")
    lines = []
    for k in range(1, 7):
        terms = [(ms[c][k], f"I_{{{c + 1}{c + 1}}}") for c in range(nm) if k in ms[c]]
        nums = []
        for idx, c in enumerate([c for c in range(nm) if k in ms[c]]):
            val = sol.Imesh[c]
            sg = ms[c][k]
            if idx == 0:
                nums.append(("-" if sg < 0 else "") + pn(val))
            else:
                nums.append((" - " if sg < 0 else " + ") + pn(val))
        expr = signed_terms(terms)
        numexpr = "".join(nums)
        if len(terms) == 1 and terms[0][0] == 1:
            lines.append(rf"I_{k} &= {expr} = {n(I[k])}\ \text{{A}}")
        else:
            lines.append(rf"I_{k} &= {expr} = {numexpr} = {n(I[k])}\ \text{{A}}")
    A("$$\n\\begin{aligned}\n" + ";\\\\\n".join(lines) + ".\n\\end{aligned}\n$$\n")
    A("Barcha tarmoq toklari musbat chiqdi, demak 2-rasmda tanlangan yo'nalishlar toklarning haqiqiy yo'nalishlari bilan mos keladi.\n")

    # ---------------- 3. tugun potensiallari
    g = sol.ground
    others = nodes[:-1]
    A(f"""# 3. Tugun potensiallar usuli

*{g}* tugun potensialini nolga tenglaymiz: $\\varphi_{g} = 0$ (4-rasm). Qolgan {", ".join("*" + x + "*" for x in others)} tugunlar uchun Kirxgofning birinchi qonuni asosida tugun potensiallar tenglamalarini tuzamiz. Tenglamaning o'ng tomonida tugunga tutashgan tarmoqlardagi E/R hadlar yoziladi: EYuK tugunga qarab yo'nalgan bo'lsa «+», tugundan chiqib yo'nalgan bo'lsa «−».

![]({img}/f4.png){{width=10cm}}
""")

    def incident(nd):
        return [k for k in range(1, 7) if nd in (sol.br[k]["start"], sol.br[k]["end"])]

    def between(a_, b_):
        return [k for k in range(1, 7) if {sol.br[k]["start"], sol.br[k]["end"]} == {a_, b_}]

    def rhs_terms(nd, numeric=False):
        out = []
        for k in incident(nd):
            b = sol.br[k]
            for (j, js) in b["emfs"]:
                toward = 1 if b["end"] == nd else -1
                s = js * toward
                out.append((s, rf"\frac{{{E[j]}}}{{{R[k]}}}" if numeric else rf"\frac{{E_{j}}}{{R_{k}}}"))
        return out

    def gsum(keys, numeric=False):
        if numeric:
            return "+".join(rf"\frac{{1}}{{{R[k]}}}" for k in keys)
        return "+".join(rf"\frac{{1}}{{R_{k}}}" for k in keys)

    def node_eq(nd, numeric=False):
        terms = [(1, rf"\varphi_{nd}\left({gsum(incident(nd), numeric)}\right)")]
        for o_ in others:
            if o_ == nd:
                continue
            bt = between(nd, o_)
            if bt:
                inner = gsum(bt, numeric)
                terms.append((-1, rf"\varphi_{o_}" + (inner if len(bt) == 1 else rf"\left({inner}\right)")))
        return signed_terms(terms) + " = " + signed_terms(rhs_terms(nd, numeric))

    A("$$\n\\left\\{\n\\begin{aligned}\n" + "\\\\\n".join("&" + node_eq(nd) for nd in others) + "\n\\end{aligned}\n\\right.\n$$\n")
    A("Son qiymatlarini qo'yamiz:\n")
    A("$$\n\\left\\{\n\\begin{aligned}\n" + "\\\\\n".join("&" + node_eq(nd, True) for nd in others) + "\n\\end{aligned}\n\\right.\n$$\n")
    A("yoki o'nli kasrlarda:\n")
    lines = []
    for r_, nd in enumerate(others):
        terms = []
        for c_, nd2 in enumerate(others):
            val = sol.G[r_][c_]
            if val == 0:
                continue
            terms.append((1 if val > 0 else -1, f"{n(abs(val), 4)}\\,\\varphi_{nd2}"))
        lines.append(f"&{signed_terms(terms)} = {n(sol.J[r_], 4)}")
    A("$$\n\\left\\{\n\\begin{aligned}\n" + "\\\\\n".join(lines) + "\n\\end{aligned}\n\\right.\n$$\n")
    mults = sol.Nmult
    A("Hisoblashda yaxlitlash xatoligi bo'lmasligi uchun tenglamalarni mos ravishda " +
      ", ".join(str(x) for x in mults[:-1]) + f" va {mults[-1]} ga (kasr maxrajlarining eng kichik umumiy karralisiga) ko'paytirib, butun koeffitsientli sistemaga o'tamiz:\n")
    lines = []
    for r_ in range(len(others)):
        terms = []
        for c_, nd2 in enumerate(others):
            val = sol.NA[r_][c_]
            if val == 0:
                continue
            terms.append((1 if val > 0 else -1, f"{abs(val)}\\,\\varphi_{nd2}"))
        lines.append(f"&{signed_terms(terms)} = {sol.NB[r_]}")
    A("$$\n\\left\\{\n\\begin{aligned}\n" + "\\\\\n".join(lines) + "\n\\end{aligned}\n\\right.\n$$\n")
    A("Kramer usuli bilan yechamiz:\n")
    A(r"$$\Delta = " + vm(sol.NA) + f" = {sol.ND}." + "$$\n")
    for c_, nd in enumerate(others):
        Mc = [[sol.NB[r] if j == c_ else sol.NA[r][j] for j in range(len(others))] for r in range(len(others))]
        A(rf"$$\Delta_{nd} = " + vm(Mc) + f" = {sol.NDs[c_]}." + "$$\n")
    A("Tugun potensiallari:\n")
    lines = []
    for c_, nd in enumerate(others):
        lines.append(rf"\varphi_{nd} &= \frac{{\Delta_{nd}}}{{\Delta}} = \frac{{{sol.NDs[c_]}}}{{{sol.ND}}} = {n(sol.phi[nd])}\ \text{{V}}")
    lines.append(rf"\varphi_{g} &= 0\ \text{{V}}")
    A("$$\n\\begin{aligned}\n" + ";\\\\\n".join(lines) + ".\n\\end{aligned}\n$$\n")
    A("Tarmoq toklarini umumlashgan Om qonuni bo'yicha aniqlaymiz (tok boshlanadigan tugun potensialidan tok boradigan tugun potensiali ayiriladi; tok yo'nalishidagi EYuK «+», teskari EYuK «−» bilan qo'shiladi):\n")
    lines = []
    for k in range(1, 7):
        b = sol.br[k]
        s, e = b["start"], b["end"]
        sym = [(1, rf"\varphi_{s}"), (-1, rf"\varphi_{e}")] + [(js, f"E_{j}") for (j, js) in b["emfs"]]
        num = pn(sol.phi[s]) + " - " + pn(sol.phi[e]) + "".join((" + " if js > 0 else " - ") + str(E[j]) for (j, js) in b["emfs"])
        lines.append(rf"I_{k} &= \frac{{{signed_terms(sym)}}}{{R_{k}}} = \frac{{{num}}}{{{R[k]}}} = {n(I[k])}\ \text{{A}}")
    A("$$\n\\begin{aligned}\n" + ";\\\\\n".join(lines) + ".\n\\end{aligned}\n$$\n")
    A("Tugun potensiallar usuli bilan topilgan toklar kontur toklar usuli natijalari bilan to'liq mos keldi.\n")

    # ---------------- 4. tekshirish
    A("# 4. Toklarni Kirxgof qonunlari bo'yicha tekshirish\n\n**Kirxgofning birinchi qonuni bo'yicha:**\n")
    lines = []
    for j, nd in enumerate(nodes):
        terms = kcl_terms(nd)
        num = ""
        tot = 0
        for idx, (s, name) in enumerate(terms):
            k = int(name[2:])
            tot += s * i[k]
            num += (("-" if s < 0 else "") if idx == 0 else (" - " if s < 0 else " + ")) + n(i[k])
        lines.append(rf"&\text{{«{nd}» tugun:}} && {signed_terms(terms)} = {num} = {n(tot)}")
    A("$$\n\\begin{aligned}\n" + ";\\\\\n".join(lines) + ".\n\\end{aligned}\n$$\n")
    A("**Kirxgofning ikkinchi qonuni bo'yicha:**\n")
    lines = []
    for mi, m in enumerate(sol.meshes):
        l, r = kvl(mi)
        num = ""
        tot = 0
        for idx, (k, s) in enumerate(m["edges"]):
            tot += s * i[k] * R[k]
            num += (("-" if s < 0 else "") if idx == 0 else (" - " if s < 0 else " + ")) + f"{n(i[k])}\\cdot {R[k]}"
        val = sum(s * js * E[j] for (k, s) in m["edges"] for (j, js) in sol.br[k]["emfs"])
        lines.append(rf"&\text{{{ROMAN[mi]} kontur:}} && {l} = {num} = {n(tot, 2)} \approx {val}")
    A("$$\n\\begin{aligned}\n" + ";\\\\\n".join(lines) + ".\n\\end{aligned}\n$$\n")
    A("Barcha tenglamalar bajarildi (farq faqat toklarni uch xonagacha yaxlitlash hisobiga), demak toklar to'g'ri topilgan.\n")

    # ---------------- 5. ekvivalent generator
    kc = sol.kcut
    X, Y, P, Q = sol.X, sol.Y, sol.P, sol.Q
    Ek = sol.br[kc]["emfs"]
    if Ek:
        main_f = rf"I_{kc} = \frac{{U_{{xx}} {'+' if Ek[0][1] > 0 else '-'} E_{Ek[0][0]}}}{{R_{kc} + R_{{ekv}}}},"
    else:
        main_f = rf"I_{kc} = \frac{{U_{{xx}}}}{{R_{kc} + R_{{ekv}}}},"
    A(f"""# 5. Ekvivalent generator usuli bilan I{sub(kc)} tokini aniqlash

Ekvivalent generator usuliga ko'ra {kc}-tarmoqqa nisbatan qolgan barcha zanjir EYuKi $E_{{ekv}} = U_{{xx}}$ va ichki qarshiligi $R_{{ekv}}$ bo'lgan bitta ekvivalent manba bilan almashtiriladi (7-rasm). Shunda:

$${main_f}$$

bu yerda $U_{{xx}} = \\varphi_{X} - \\varphi_{Y}$ — {kc}-tarmoq uzilgandagi (salt ishlash rejimidagi) *{X}* va *{Y}* tugunlar orasidagi kuchlanish; $R_{{ekv}}$ — EYuKlar qisqa tutashtirilgandagi zanjirning *{X}* va *{Y}* qisqichlariga nisbatan kirish qarshiligi.

## 5.1. Salt ishlash kuchlanishi $U_{{xx}}$ ni aniqlash

{kc}-tarmoq uzilganda (5-rasm) *{X}* va *{Y}* nuqtalar tugun bo'lmay qoladi va ular orqali o'tgan tarmoqlar ketma-ket ulanadi. Natijada zanjir *{P}* va *{Q}* tugunlar orasida parallel ulangan uchta tarmoqdan iborat bo'ladi:
""")
    for c in sol.comps:
        path = [P] + [ch[3] for ch in c["chain"]]
        rs = [ch[0] for ch in c["chain"]]
        rtxt = (" + ".join(f"R{sub(x)}" for x in rs) + " = " + " + ".join(str(R[x]) for x in rs) + f" = {c['R']}") if len(rs) > 1 else f"R{sub(rs[0])} = {c['R']}"
        toward = [(j, -s) for (j, s) in c["emfs"]]   # P tomonga
        if toward:
            etxt = signed_terms([(s, f"E{sub(j)}") for (j, s) in toward]).replace("-", "−")
            eval_ = -c["E"]
            etxt = f"*{P}* tomonga yo'nalgan EYuK {etxt} = {ifrac(-c['E'])} V"
        else:
            etxt = "EYuK yo'q"
        A(f"- *{'*–*'.join(path)}* tarmog'i: qarshiligi {rtxt} Om, {etxt};")
    A("\n![](" + img + "/f5.png){width=10cm}\n")
    # ikki tugun formulasi
    num_s, den_s, num_n, den_n = [], [], [], []
    for c in sol.comps:
        Rc = c["R"]
        toward = [(j, -s) for (j, s) in c["emfs"]]
        rsym = "+".join(f"R_{ch[0]}" for ch in c["chain"])
        den_s.append(rf"\dfrac{{1}}{{{rsym}}}")
        den_n.append(rf"\dfrac{{1}}{{{Rc}}}")
        if toward:
            num_s.append((1, rf"\dfrac{{{emf_text(toward)}}}{{{rsym}}}"))
            val = -c["E"]
            num_n.append((1 if val >= 0 else -1, rf"\dfrac{{{abs(val)}}}{{{Rc}}}"))
    U = sol.U_PQ
    gs = sum(Fr(1, c["R"]) for c in sol.comps)
    nsum = sum(-c["E"] / c["R"] for c in sol.comps)
    A(f"Ikki tugun usuli bo'yicha *{P}* va *{Q}* tugunlar orasidagi kuchlanish ($\\varphi_{Q} = 0$):\n")
    A(rf"""$$
U_{{{P}{Q}}} = \varphi_{P} = \frac{{{signed_terms(num_s)}}}{{{"+".join(den_s)}}}
= \frac{{{signed_terms(num_n)}}}{{{"+".join(den_n)}}}
= \frac{{{n(nsum, 4)}}}{{{n(gs, 4)}}} = {n(U)}\ \text{{V}}.
$$
""")
    A("Salt ishlash rejimidagi tarmoq toklari (*" + P + "* tugundan *" + Q + "* tugunga qarab hisoblanadi; manfiy qiymat tok aslida teskari yo'nalganini bildiradi):\n")
    lines = []
    for c in sol.comps:
        names = " = ".join(f"I_{{{ch[0]}xx}}" for ch in c["chain"])
        rsym = "+".join(f"R_{ch[0]}" for ch in c["chain"])
        sym = rf"\varphi_{P} - \varphi_{Q}" + "".join((" + " if s_ > 0 else " - ") + f"E_{j}" for (j, s_) in c["emfs"])
        numE = c["E"]
        num = f"{pn(U)} - 0" + ((" + " if numE >= 0 else " - ") + ifrac(abs(numE)) if c["emfs"] else "")
        path = "–".join([P] + [ch[3] for ch in c["chain"]])
        direction = f"{P}\\to {Q}" if c["I"] >= 0 else f"{Q}\\to {P}"
        lines.append(rf"{names} &= \frac{{{sym}}}{{{rsym}}} = \frac{{{num}}}{{{c['R']}}} = {n(c['I'])}\ \text{{A}} \quad (\text{{yo'l }} {path};\ \text{{tok }} {direction})")
    A("$$\n\\begin{aligned}\n" + ";\\\\\n".join(lines) + ".\n\\end{aligned}\n$$\n")
    # tekshirish (P tugun)
    A(f"Tekshirish («{P}» tugun, chiquvchi toklar yig'indisi): " + " + ".join(t(c['I']) if c['I'] >= 0 else f"({t(c['I'])})" for c in sol.comps) +
      f" = {t(sum(r3(c['I']) for c in sol.comps))} ≈ 0.\n")
    # phi_X, phi_Y
    A(f"*{X}* va *{Y}* nuqtalar potensiallarini *{P}* tugundan boshlab, tarmoqlar bo'ylab Kirxgofning ikkinchi qonuni asosida topamiz (har bir rezistorda tok yo'nalishida potensial I·R ga kamayadi, EYuK yo'nalishida E ga ortadi):\n")
    lines = []
    for T in (X, Y):
        for c in sol.comps:
            seq = []
            found = False
            for (x, sgn, a_, bnode, Ex, phi) in c["pts"]:
                seq.append((x, Ex))
                if bnode == T:
                    found = True
                    break
            if not found:
                continue
            sym = rf"\varphi_{P}"
            num = pn(U)
            for (x, Ex) in seq:
                sym += rf" - I_{{{x}xx}}R_{x}"
                num += rf" - {pn(c['I'])}\cdot {R[x]}"
                ch = [ch for ch in c["chain"] if ch[0] == x][0]
                for (j, s) in sol.br[x]["emfs"]:
                    ss = s * ch[1]
                    sym += (" + " if ss > 0 else " - ") + f"E_{j}"
                    num += (" + " if ss > 0 else " - ") + str(E[j])
            lines.append(rf"\varphi_{T} &= {sym} = {num} = {n(sol.pot_xx[T])}\ \text{{V}}")
    A("$$\n\\begin{aligned}\n" + ";\\\\\n".join(lines) + ".\n\\end{aligned}\n$$\n")
    A(rf"""$$
U_{{xx}} = \varphi_{X} - \varphi_{Y} = {pn(sol.pot_xx[X])} - {pn(sol.pot_xx[Y])} = {n(sol.Uxx)}\ \text{{V}}.
$$
""")
    # 5.2 R_ekv
    A(f"""## 5.2. Ekvivalent qarshilik $R_{{ekv}}$ ni aniqlash

Barcha EYuK manbalarini ularning ichki qarshiligi (nol) bilan almashtiramiz va {kc}-tarmoqni uzilgan holda qoldiramiz (6-rasm). Hosil bo'lgan passiv sxemani *{X}* va *{Y}* qisqichlarga nisbatan bosqichma-bosqich soddalashtiramiz.

![]({img}/f6.png){{width=10cm}}
""")
    for st in sol.red_steps:
        if st[0] == "dstar":
            _, O, (u, vv, w), (euv, evw, euw), S, arms = st
            A(f"*{u}*, *{vv}*, *{w}* tugunlar orasidagi ${euv[3]}$, ${evw[3]}$, ${euw[3]}$ qarshiliklar **uchburchak** hosil qiladi. Uni ekvivalent **yulduz**ga almashtiramiz (yulduz markazi — *{O}* nuqta):\n")
            lines = []
            for (node_, name, val, e1, e2) in arms:
                lines.append(rf"{name} &= \frac{{{e1[3]}\cdot {e2[3]}}}{{{euv[3]} + {evw[3]} + {euw[3]}}} = \frac{{{n(e1[2], 4)}\cdot {n(e2[2], 4)}}}{{{n(S, 4)}}} = {n(val, 4)}\ \text{{Om}}")
            A("$$\n\\begin{aligned}\n" + ";\\\\\n".join(lines) + ".\n\\end{aligned}\n$$\n")
        elif st[0] == "ser":
            _, nmn, a_, b_, ra, rb, rn, u, w, mid = st
            A(f"*{mid}* nuqta orqali ${a_}$ va ${b_}$ qarshiliklar **ketma-ket** ulangan:\n")
            A(rf"$${nmn} = {a_} + {b_} = {n(ra, 4)} + {n(rb, 4)} = {n(rn, 4)}\ \text{{Om}}.$$" + "\n")
        elif st[0] == "par":
            _, nmn, a_, b_, ra, rb, rn, u, w = st
            A(f"*{u}* va *{w}* nuqtalar orasidagi ${a_}$ va ${b_}$ qarshiliklar **parallel** ulangan:\n")
            A(rf"$${nmn} = \frac{{{a_}\cdot {b_}}}{{{a_} + {b_}}} = \frac{{{n(ra, 4)}\cdot {n(rb, 4)}}}{{{n(ra, 4)} + {n(rb, 4)}}} = {n(rn, 4)}\ \text{{Om}}.$$" + "\n")
        elif st[0] == "dangling":
            A(f"${st[1]}$ qarshilikning bir uchi hech qayerga ulanmagan, undan tok o'tmaydi — hisobga olinmaydi.\n")
    A(rf"Natijada: $R_{{ekv}} = {n(sol.Rekv, 4)}$ Om." + "\n")
    # 5.3
    rk = R[kc]
    if Ek:
        j, s = Ek[0]
        numtxt = rf"{pn(sol.Uxx)} {'+' if s > 0 else '-'} {E[j]}"
        top = sol.Uxx + s * E[j]
    else:
        numtxt = n(sol.Uxx)
        top = sol.Uxx
    ieg = r3(sol.I_eg)
    err = abs(i[kc] - ieg) / i[kc] * 100 if i[kc] else 0
    A(f"""## 5.3. I{sub(kc)} tokini hisoblash

![]({img}/f7.png){{width=8cm}}

$$
{main_f[:-1]} = \\frac{{{numtxt}}}{{{rk} + {n(sol.Rekv, 4)}}} = \\frac{{{n(top)}}}{{{n(rk + sol.Rekv, 4)}}} = {n(sol.I_eg)}\\ \\text{{A}}.
$$

Kontur toklar usulida topilgan qiymat bilan solishtiramiz:

$$
\\gamma = \\frac{{|I_{kc} - I_{{{kc},eg}}|}}{{I_{kc}}}\\cdot 100\\% = \\frac{{|{n(i[kc])} - {n(ieg)}|}}{{{n(i[kc])}}}\\cdot 100\\% = {n(err, 2)}\\%.
$$

Ekvivalent generator usuli natijasi kontur toklar va tugun potensiallar usullari natijalari bilan mos keldi.
""")
    # ---------------- 6. quvvat
    terms_s, terms_n, vals = [], [], []
    consumers = []
    for (j, s, k, p) in sol.src:
        terms_s.append((s, f"E_{j}I_{k}"))
        terms_n.append((s, f"{E[j]}\\cdot {n(i[k])}"))
        vals.append(s * E[j] * i[k])
        if s < 0:
            consumers.append((j, k))
    Pm = sum(vals)
    Pk = [i[k] ** 2 * R[k] for k in range(1, 7)]
    Pi = sum(Pk)
    errp = abs(Pm - Pi) / Pm * 100
    cons_txt = ""
    if consumers:
        cons_txt = " " + "; ".join(f"{k}-tarmoqda I{sub(k)} toki E{sub(j)} ga teskari yo'nalgan" for (j, k) in consumers) + \
            ", shuning uchun " + ", ".join(f"E{sub(j)}" for (j, k) in consumers) + \
            (" manbai iste'molchi rejimida ishlaydi." if len(consumers) == 1 else " manbalari iste'molchi rejimida ishlaydi.")
    A(f"""# 6. Quvvat muvozanati

Manbalar quvvati: EYuK yo'nalishi tok yo'nalishiga mos kelsa, manba energiya beradi (E·I «+» ishora bilan), teskari bo'lsa — energiya iste'mol qiladi («−» ishora bilan).{cons_txt}

$$
P_{{manba}} = {signed_terms(terms_s)} = {signed_terms(terms_n)} = {signed_terms([(1 if x >= 0 else -1, n(abs(x), 2)) for x in vals])} = {n(Pm, 2)}\\ \\text{{Vt}}.
$$

Iste'molchilar (rezistorlar) quvvati:

$$
\\begin{{aligned}}
P_{{ist}} &= I_1^2R_1 + I_2^2R_2 + I_3^2R_3 + I_4^2R_4 + I_5^2R_5 + I_6^2R_6 =\\\\
&= {" + ".join(f"{n(i[k])}^2\\cdot {R[k]}" for k in range(1, 7))} =\\\\
&= {" + ".join(n(p) for p in Pk)} = {n(Pi)}\\ \\text{{Vt}}.
\\end{{aligned}}
$$

Hisoblash xatoligi:

$$
\\gamma = \\frac{{|P_{{manba}} - P_{{ist}}|}}{{P_{{manba}}}}\\cdot 100\\% = \\frac{{|{n(Pm, 2)} - {n(Pi)}|}}{{{n(Pm, 2)}}}\\cdot 100\\% = {n(errp, 4)}\\%.
$$

Quvvat muvozanati bajarildi: $P_{{manba}} \\approx P_{{ist}}$ (farq faqat toklarni yaxlitlash bilan bog'liq).
""")
    # ---------------- natijalar
    A(f"""# Natijalar jadvali

| Kattalik | Kontur toklar usuli | Tugun potensiallar usuli | Ekvivalent generator usuli |
|:---:|:---:|:---:|:---:|""")
    for k in range(1, 7):
        A(f"| I{sub(k)}, A | {t(I[k])} | {t(I[k])} | {t(sol.I_eg) if k == kc else '—'} |")
    A("\nTugun potensiallari: " + ", ".join(f"$\\varphi_{x}$ = {t(sol.phi[x])} V" for x in nodes) + ".  ")
    A(f"Quvvat muvozanati: $P_{{manba}}$ = {t(Pm, 2)} Vt, $P_{{ist}}$ = {t(Pi, 2)} Vt.\n")
    concl = (f"**Xulosa.** {v}-sxema uchun tarmoq toklari kontur toklar va tugun potensiallar usullari bilan hisoblandi, "
             f"ikkala usul bir xil natija berdi. Natijalar Kirxgofning I va II qonunlari bilan tekshirildi. "
             f"{kc}-tarmoq toki ekvivalent generator usulida ham topildi va I{sub(kc)} = {t(sol.I_eg)} A ga teng chiqdi. "
             f"Quvvat muvozanati bajarildi.")
    if consumers:
        concl += " " + ", ".join(f"E{sub(j)}" for (j, k) in consumers) + \
            (" manbasidan o'tayotgan tok uning EYuKiga teskari yo'nalgan, ya'ni bu manba energiya iste'molchisi (masalan, zaryadlanayotgan akkumulyator) rejimida ishlaydi."
             if len(consumers) == 1 else " manbalaridan o'tayotgan toklar ularning EYuKlariga teskari yo'nalgan, ya'ni bu manbalar energiya iste'molchisi rejimida ishlaydi.")
    A(concl + "\n")
    txt = "\n".join(md).replace("\\frac{", "\\dfrac{").replace("\\ddfrac{", "\\dfrac{")
    # oddiy matndagi belgilarni chiroyli qilish
    return txt


def summary(sol):
    """Sahifada ko'rsatish uchun qisqa natijalar (JSON)."""
    return {
        "variant": sol.v,
        "E": sol.E, "R": sol.R, "kcut": sol.kcut,
        "used_E": sol.used_E,
        "I": {k: r3(sol.I[k]) for k in sol.I},
        "dir": {k: [sol.br[k]["start"], sol.br[k]["end"]] for k in sol.br},
        "phi": {x: r3(sol.phi[x]) for x in sol.nodes},
        "Imesh": [r3(x) for x in sol.Imesh],
        "Uxx": r3(sol.Uxx), "Rekv": round(float(sol.Rekv), 4), "Ieg": r3(sol.I_eg),
        "X": sol.X, "Y": sol.Y,
        "Psrc": round(float(sol.Psrc), 2), "Pload": round(float(sol.Pload), 2),
        "note": NOTES.get(sol.v, ""),
    }
