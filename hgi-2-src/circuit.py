"""Sxema grafini qurish: tugunlar, tarmoqlar, konturlar (yuzalar)."""
import math
from collections import defaultdict
from fractions import Fraction as Fr


def parse_el(tok):
    if tok[0] == "R":
        return ("R", int(tok[1:]), 0)
    k = int(tok[1:-1])
    return ("E", k, 1 if tok[-1] == "+" else -1)


class Branch:
    def __init__(self, start, end, pts, elems):
        self.start, self.end = start, end   # tugun koordinatalari
        self.pts = pts                      # start dan end ga polyline nuqtalari
        self.elems = elems                  # [(type, k, sign_wrt_start_to_end, pos(x,y), orient)]
        rs = [e for e in elems if e[0] == "R"]
        assert len(rs) == 1, ("har tarmoqda bitta R bo'lishi kerak", pts, elems)
        self.k = rs[0][1]
        self.emfs = [(e[1], e[2]) for e in elems if e[0] == "E"]

    def reverse(self):
        b = Branch.__new__(Branch)
        b.start, b.end = self.end, self.start
        b.pts = list(reversed(self.pts))
        b.elems = [(t, k, -s, p, o) for (t, k, s, p, o) in reversed(self.elems)]
        b.k = self.k
        b.emfs = [(k, -s) for (k, s) in self.emfs]
        return b


def element_positions(segs):
    """Har segment elementining markaz koordinatasini hisoblaydi."""
    out = []
    for (p1, p2, els) in segs:
        n = len(els)
        orient = "h" if p1[1] == p2[1] else "v"
        L = math.dist(p1, p2)
        placed = []
        for i, tok in enumerate(els):
            if n == 1:
                f = 0.5
            elif L <= 2.01:
                m1 = 0.78 if p1 == (2, 2) else 0.5
                m2 = 0.78 if p2 == (2, 2) else 0.5
                f = (m1 + i * (L - m1 - m2) / (n - 1)) / L
            else:
                f = (i + 1) / (n + 1)
            pos = (p1[0] + (p2[0] - p1[0]) * f, p1[1] + (p2[1] - p1[1]) * f)
            t, k, s = parse_el(tok)
            placed.append((t, k, s, pos, orient, f))
        out.append(placed)
    return out


class Circuit:
    def __init__(self, segs):
        self.segs = segs
        self.placed = element_positions(segs)
        adj = defaultdict(list)   # point -> [(other, seg_index, forward)]
        for i, (p1, p2, _) in enumerate(segs):
            adj[p1].append((p2, i, True))
            adj[p2].append((p1, i, False))
        self.adj = adj
        nodes = [p for p in adj if len(adj[p]) >= 3]
        # o'qish tartibi: yuqoridan pastga, chapdan o'ngga
        nodes.sort(key=lambda p: (-p[1], p[0]))
        self.nodes = nodes
        self.names = {p: "abcdefgh"[i] for i, p in enumerate(nodes)}
        self.branches = self._trace()
        self.branches.sort(key=lambda b: b.k)
        self.bk = {b.k: b for b in self.branches}

    def _trace(self):
        used = set()
        brs = []
        for n in self.nodes:
            for (nxt, si, fwd) in self.adj[n]:
                if si in used:
                    continue
                pts = [n]
                elems = []
                cur, seg, f = n, si, fwd
                prev = n
                while True:
                    used.add(seg)
                    p1, p2, _ = self.segs[seg]
                    els = self.placed[seg]
                    if f:
                        for (t, k, s, pos, o, _) in els:
                            elems.append((t, k, s, pos, o))
                        nxtp = p2
                    else:
                        for (t, k, s, pos, o, _) in reversed(els):
                            elems.append((t, k, -s, pos, o))
                        nxtp = p1
                    pts.append(nxtp)
                    if nxtp in self.nodes:
                        break
                    # davom: nxtp dagi ikkinchi segment
                    cand = [(o2, s2, f2) for (o2, s2, f2) in self.adj[nxtp] if s2 != seg]
                    assert len(cand) == 1
                    _, seg, f = cand[0]
                brs.append(Branch(n, pts[-1], pts, elems))
        return brs

    # ---- planar yuzalar (konturlar) ----
    def faces(self):
        # half-edge: (branch index, dir) ; dir=+1 start->end
        out_edges = defaultdict(list)  # node -> [(angle, bi, dir)]
        for bi, b in enumerate(self.branches):
            p0, p1 = b.pts[0], b.pts[1]
            out_edges[b.start].append((math.atan2(p1[1] - p0[1], p1[0] - p0[0]), bi, 1))
            q0, q1 = b.pts[-1], b.pts[-2]
            out_edges[b.end].append((math.atan2(q1[1] - q0[1], q1[0] - q0[0]), bi, -1))
        for n in out_edges:
            out_edges[n].sort()
        visited = set()
        faces = []
        for bi, b in enumerate(self.branches):
            for d in (1, -1):
                if (bi, d) in visited:
                    continue
                face = []
                he = (bi, d)
                while he not in visited:
                    visited.add(he)
                    face.append(he)
                    br = self.branches[he[0]]
                    v = br.end if he[1] == 1 else br.start
                    # kelgan yo'nalishning teskarisi (v dan chiquvchi) burchagi
                    if he[1] == 1:
                        q0, q1 = br.pts[-1], br.pts[-2]
                    else:
                        q0, q1 = br.pts[0], br.pts[1]
                    ang = math.atan2(q1[1] - q0[1], q1[0] - q0[0])
                    lst = out_edges[v]
                    idx = [i for i, e in enumerate(lst) if e[1] == he[0] and e[2] == -he[1]][0]
                    # soat mili bo'yicha keyingi (burchak kamayadigan tomonga)
                    nxt = lst[(idx - 1) % len(lst)]
                    he = (nxt[1], nxt[2])
                faces.append(face)
        res = []
        for f in faces:
            poly = []
            for (bi, d) in f:
                pts = self.branches[bi].pts if d == 1 else list(reversed(self.branches[bi].pts))
                poly.extend(pts[:-1])
            A = 0
            for i in range(len(poly)):
                x1, y1 = poly[i]; x2, y2 = poly[(i + 1) % len(poly)]
                A += x1 * y2 - x2 * y1
            A /= 2
            cx = sum(p[0] for p in poly) / len(poly)
            cy = sum(p[1] for p in poly) / len(poly)
            res.append((A, f, poly, (cx, cy)))
        # tashqi yuza — modul bo'yicha eng katta
        res.sort(key=lambda r: abs(r[0]))
        inner = res[:-1]
        meshes = []
        for (A, f, poly, c) in inner:
            edges = [(self.branches[bi].k, d) for (bi, d) in f]
            if A > 0:  # soat miliga teskari -> soat mili bo'yicha qilib olamiz
                edges = [(k, -d) for (k, d) in reversed(edges)]
                poly = list(reversed(poly))
            xs = [p[0] for p in poly]; ys = [p[1] for p in poly]
            c = ((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2)
            meshes.append({"edges": edges, "center": c, "poly": poly})
        meshes.sort(key=lambda m: (-m["center"][1], m["center"][0]))
        return meshes
