"""Sxemalarni chizish (matplotlib)."""
import math
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, Circle, Arc, Polygon
import numpy as np

LW = 2.2
RL, RW = 0.56, 0.20
ER = 0.22
RED = "#C0392B"
BLUE = "#1F5FAD"
GREEN = "#1E8449"
SUB = str.maketrans("0123456789", "₀₁₂₃₄₅₆₇₈₉")


def lab_side(pos, orient):
    x, y = pos
    if orient == "v":
        return (-0.42, 0) if x <= 0.01 else (0.42, 0)
    return (0, 0.36) if y >= 3.99 else (0, -0.36)


class Fig:
    def __init__(self, w=6.0, h=5.6, xlim=(-1.0, 5.0), ylim=(-0.8, 4.75)):
        self.fig, self.ax = plt.subplots(figsize=(w, h))
        self.ax.set_xlim(*xlim); self.ax.set_ylim(*ylim)
        self.ax.set_aspect("equal"); self.ax.axis("off")

    def line(self, p, q, color="k", ls="-", lw=LW):
        self.ax.plot([p[0], q[0]], [p[1], q[1]], color=color, lw=lw, ls=ls, solid_capstyle="round", zorder=1)

    def res(self, c, orient, label, color="k"):
        x, y = c
        if orient == "h":
            self.ax.add_patch(Rectangle((x - RL / 2, y - RW / 2), RL, RW, fc="white", ec=color, lw=LW, zorder=3))
        else:
            self.ax.add_patch(Rectangle((x - RW / 2, y - RL / 2), RW, RL, fc="white", ec=color, lw=LW, zorder=3))
        off = lab_side(c, orient)
        self.ax.text(x + off[0], y + off[1], label, ha="center", va="center", fontsize=14, fontweight="bold", zorder=5, color=color)

    def emf(self, c, vec, label, orient):
        x, y = c
        dx, dy = vec
        self.ax.add_patch(Circle((x, y), ER, fc="white", ec="k", lw=LW, zorder=3))
        self.ax.annotate("", xy=(x + dx * ER, y + dy * ER), xytext=(x - dx * ER * 0.85, y - dy * ER * 0.85),
                         arrowprops=dict(arrowstyle="-|>", lw=2, color="k", mutation_scale=16), zorder=4)
        off = lab_side(c, orient)
        off = (off[0] * 1.12, off[1] * 1.25)
        self.ax.text(x + off[0], y + off[1], label, ha="center", va="center", fontsize=14, fontweight="bold", zorder=5)

    def node(self, p, label):
        self.ax.add_patch(Circle(p, 0.065, fc="k", ec="k", zorder=6))
        if label:
            ox = -0.2 if p[0] < 3 else 0.2
            oy = 0.22 if p[1] > 0 else -0.25
            self.ax.text(p[0] + ox, p[1] + oy, label, fontsize=15, style="italic", fontweight="bold",
                         ha="center", va="center", zorder=6)

    def term(self, p):
        self.ax.add_patch(Circle(p, 0.07, fc="white", ec="k", lw=1.8, zorder=6))

    def arrow(self, p, vec, label, color=RED, loff=None):
        x, y = p
        dx, dy = vec
        s = 0.16
        tip = (x + dx * s, y + dy * s)
        b1 = (x - dx * s + dy * s * 0.75, y - dy * s - dx * s * 0.75)
        b2 = (x - dx * s - dy * s * 0.75, y - dy * s + dx * s * 0.75)
        self.ax.add_patch(Polygon([tip, b1, b2], closed=True, fc=color, ec=color, zorder=7))
        if loff is None:
            loff = (0, 0.3) if dy == 0 else (0.36, 0)
        self.ax.text(x + loff[0], y + loff[1], label, color=color, fontsize=13, fontweight="bold",
                     ha="center", va="center", zorder=7)

    def loop(self, c, r, label, color=BLUE):
        x, y = c
        self.ax.add_patch(Arc((x, y), 2 * r, 2 * r, theta1=120, theta2=420, color=color, lw=1.8, zorder=2))
        ang = np.deg2rad(120)
        px, py = x + r * np.cos(ang), y + r * np.sin(ang)
        tx, ty = (np.sin(ang), -np.cos(ang))
        self.ax.annotate("", xy=(px + tx * 0.12, py + ty * 0.12), xytext=(px - tx * 0.02, py - ty * 0.02),
                         arrowprops=dict(arrowstyle="-|>", color=color, lw=1.8, mutation_scale=16), zorder=4)
        self.ax.text(x, y, label, color=color, fontsize=13, fontweight="bold", ha="center", va="center", zorder=4)

    def caption(self, t):
        self.ax.text(2, -0.68, t, ha="center", va="center", fontsize=13)

    def save(self, fn, dpi=160):
        self.fig.savefig(fn, dpi=dpi, bbox_inches="tight", pad_inches=0.05)
        plt.close(self.fig)


def unit(p, q):
    d = math.dist(p, q)
    return ((q[0] - p[0]) / d, (q[1] - p[1]) / d)


def draw_circuit(F, circ, emfs=True, skip_branch=None, passive=False, node_labels=True, gap_branch=None):
    """Sxemani chizadi. gap_branch: shu tarmoq rezistori o'rniga uzilish (qisqichlar) chiziladi,
    EYuKlari ham olib tashlanadi."""
    gap = None
    for si, (p1, p2, _) in enumerate(circ.segs):
        els = circ.placed[si]
        gb = gap_branch is not None and any(t == "R" and k == gap_branch for (t, k, s, pos, o, f) in els)
        if gb:
            (t, k, s, pos, o, f) = [e for e in els if e[0] == "R"][0]
            u = unit(p1, p2)
            a = (pos[0] - u[0] * 0.32, pos[1] - u[1] * 0.32)
            b = (pos[0] + u[0] * 0.32, pos[1] + u[1] * 0.32)
            F.line(p1, a); F.line(b, p2)
            F.term(a); F.term(b)
            gap = (a, b, o)
            continue
        F.line(p1, p2)
        for (t, k, s, pos, o, f) in els:
            if t == "R":
                F.res(pos, o, f"R{str(k).translate(SUB)}")
            elif emfs and not passive:
                u = unit(p1, p2)
                F.emf(pos, (u[0] * s, u[1] * s), f"E{str(k).translate(SUB)}", o)
    if node_labels:
        for p in circ.nodes:
            F.node(p, circ.names[p])
    else:
        for p in circ.nodes:
            F.node(p, "")
    return gap


def arrow_spot(circ, br, avoid_extra=()):
    """Tarmoq bo'ylab tok strelkasi uchun bo'sh joy topadi."""
    pts = br.pts
    elems = [e[3] for e in br.elems] + list(avoid_extra)
    corners = pts[1:-1]
    best = None
    # path bo'ylab namunalar
    total = 0
    segs = []
    for i in range(len(pts) - 1):
        L = math.dist(pts[i], pts[i + 1])
        segs.append((pts[i], pts[i + 1], total, L))
        total += L
    cands = []
    for thr, endm in ((0.48, 0.3), (0.42, 0.2), (0.36, 0.17), (0.3, 0.14)):
        t = endm
        while t < total - endm:
            for (p, q, s0, L) in segs:
                if s0 <= t <= s0 + L:
                    u = unit(p, q)
                    pos = (p[0] + u[0] * (t - s0), p[1] + u[1] * (t - s0))
                    ok = all(math.dist(pos, e) > thr for e in elems) and all(math.dist(pos, c) > 0.25 for c in corners)
                    if ok:
                        cands.append((t, pos, u))
                    break
            t += 0.03
        if cands:
            break
    if not cands:
        return None
    nodes = list(circ.nodes)
    def score(c):
        pos = c[1]
        dn = min(math.dist(pos, q) for q in nodes)
        de = min([math.dist(pos, e) for e in elems] + [9])
        return min(dn, 0.85) + 0.3 * min(de, 0.9)
    cands.sort(key=lambda c: -score(c))
    t, pos, u = cands[0]
    return pos, u


def arrow_label_off(pos, u):
    x, y = pos
    if abs(u[1]) < 1e-9:  # gorizontal
        return (0, 0.3) if y < 3.9 else (0, -0.3)
    return (0.38, 0) if x < 3.9 else (-0.38, 0)
