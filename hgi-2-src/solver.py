"""Murakkab o'zgarmas tok zanjirini aniq (Fraction) hisoblash."""
from fractions import Fraction as Fr
from math import lcm
from circuit import Circuit
from schemes import SCHEMES, TABLE


def det(m):
    m = [[Fr(x) for x in r] for r in m]
    n = len(m)
    if n == 1:
        return m[0][0]
    if n == 2:
        return m[0][0] * m[1][1] - m[0][1] * m[1][0]
    s = Fr(0)
    for j in range(n):
        minor = [r[:j] + r[j + 1:] for r in m[1:]]
        s += (-1) ** j * m[0][j] * det(minor)
    return s


def solve_lin(A, b):
    n = len(A)
    M = [[Fr(x) for x in A[i]] + [Fr(b[i])] for i in range(n)]
    for c in range(n):
        p = next(r for r in range(c, n) if M[r][c] != 0)
        M[c], M[p] = M[p], M[c]
        for r in range(n):
            if r != c and M[r][c] != 0:
                f = M[r][c] / M[c][c]
                M[r] = [a - f * bb for a, bb in zip(M[r], M[c])]
    return [M[i][n] / M[i][i] for i in range(n)]


class Solution:
    def __init__(self, variant):
        self.v = variant
        row = TABLE[variant]
        self.E = {1: row[0], 2: row[1], 3: row[2]}
        self.R = {k: row[2 + k] for k in range(1, 7)}
        self.kcut = row[9]
        self.circ = c = Circuit(SCHEMES[variant])
        self.nodes = [c.names[p] for p in c.nodes]          # ['a','b','c','d']
        self.used_E = sorted({k for b in c.branches for (k, s) in b.emfs})
        # tarmoqlar: k -> dict(start,end (nom), emfs [(j,sign)])
        traced = {}
        for b in c.branches:
            traced[b.k] = dict(start=c.names[b.start], end=c.names[b.end], emfs=list(b.emfs))
        self.traced = traced
        self._node_potentials(traced)
        self._orient()
        self._meshes()
        self._mesh_method()
        self._node_method()
        self._equiv_gen()
        self._power()

    # EYuK yig'indisi tarmoq yo'nalishi bo'yicha
    def Eb(self, emfs):
        return sum(Fr(s * self.E[j]) for (j, s) in emfs)

    def _node_potentials(self, br):
        nodes = self.nodes
        self.ground = nodes[-1]
        idx = {n: i for i, n in enumerate(nodes[:-1])}
        N = len(idx)
        G = [[Fr(0)] * N for _ in range(N)]
        J = [Fr(0)] * N
        for k, b in br.items():
            g = Fr(1, self.R[k])
            s, e = b["start"], b["end"]
            E = self.Eb(b["emfs"])
            for (u, sign) in ((s, -1), (e, 1)):
                if u in idx:
                    G[idx[u]][idx[u]] += g
                    J[idx[u]] += sign * E * g
            if s in idx and e in idx:
                G[idx[s]][idx[e]] -= g
                G[idx[e]][idx[s]] -= g
        phi = solve_lin(G, J)
        self.phi = {n: phi[i] for n, i in idx.items()}
        self.phi[self.ground] = Fr(0)
        self.G, self.J = G, J

    def _orient(self):
        self.br = {}
        self.o = {}
        for k, b in self.traced.items():
            E = self.Eb(b["emfs"])
            I = (self.phi[b["start"]] - self.phi[b["end"]] + E) / self.R[k]
            if I < 0:
                self.br[k] = dict(start=b["end"], end=b["start"], emfs=[(j, -s) for (j, s) in b["emfs"]])
                self.o[k] = -1
                I = -I
            else:
                self.br[k] = dict(b)
                self.o[k] = 1
            self.br[k]["I"] = I
            self.br[k]["E"] = self.Eb(self.br[k]["emfs"])
        self.I = {k: self.br[k]["I"] for k in self.br}

    def _meshes(self):
        ms = self.circ.faces()
        self.meshes = []
        for m in ms:
            edges = [(k, d * self.o[k]) for (k, d) in m["edges"]]   # s: +1 tok yo'nalishida
            # tugunlar ketma-ketligi
            seq = []
            for (k, d) in m["edges"]:
                b = self.traced[k]
                seq.append(b["start"] if d == 1 else b["end"])
            self.meshes.append(dict(edges=edges, seq=seq, center=m["center"]))

    def _mesh_method(self):
        M = self.meshes
        n = len(M)
        s = [{k: sg for (k, sg) in m["edges"]} for m in M]
        A = [[Fr(0)] * n for _ in range(n)]
        B = [Fr(0)] * n
        for i in range(n):
            for j in range(n):
                A[i][j] = sum(Fr(s[i][k] * s[j][k] * self.R[k]) for k in s[i] if k in s[j])
            B[i] = sum(s[i][k] * self.br[k]["E"] for k in s[i])
        self.MA, self.MB, self.ms = A, B, s
        D = det(A)
        Ds = []
        for c in range(n):
            Ac = [[B[r] if j == c else A[r][j] for j in range(n)] for r in range(n)]
            Ds.append(det(Ac))
        self.MD, self.MDs = D, Ds
        self.Imesh = [d / D for d in Ds]
        for k in self.I:
            val = sum(s[i].get(k, 0) * self.Imesh[i] for i in range(n))
            assert val == self.I[k], (self.v, k, val, self.I[k])

    def _node_method(self):
        # butun koeffitsientli sistema
        N = len(self.G)
        rows, rhs, mult = [], [], []
        for i in range(N):
            den = 1
            for x in self.G[i] + [self.J[i]]:
                den = lcm(den, x.denominator)
            rows.append([int(x * den) for x in self.G[i]])
            rhs.append(int(self.J[i] * den))
            mult.append(den)
        self.NA, self.NB, self.Nmult = rows, rhs, mult
        D = det(rows)
        Ds = []
        for c in range(N):
            Ac = [[rhs[r] if j == c else rows[r][j] for j in range(N)] for r in range(N)]
            Ds.append(det(Ac))
        self.ND, self.NDs = int(D), [int(x) for x in Ds]
        for i, n in enumerate(self.nodes[:-1]):
            assert Fr(Ds[i], D) == self.phi[n]

    def _equiv_gen(self):
        kc = self.kcut
        X, Y = self.br[kc]["start"], self.br[kc]["end"]
        self.X, self.Y = X, Y
        others = {k: b for k, b in self.br.items() if k != kc}
        deg = {n: 0 for n in self.nodes}
        for b in others.values():
            deg[b["start"]] += 1; deg[b["end"]] += 1
        main = [n for n in self.nodes if deg[n] >= 3]
        assert len(main) == 2, (self.v, deg)
        P, Q = main  # naming order
        self.P, self.Q = P, Q
        # kompozit tarmoqlar P dan Q ga
        comps = []
        used = set()
        for k, b in others.items():
            if k in used or P not in (b["start"], b["end"]):
                continue
            chain = []
            cur = P
            kk = k
            while True:
                bb = others[kk]
                used.add(kk)
                sgn = 1 if bb["start"] == cur else -1    # +1: tok yo'nalishi P->Q yurish bilan mos
                nxt = bb["end"] if sgn == 1 else bb["start"]
                chain.append((kk, sgn, cur, nxt))
                cur = nxt
                if cur in (P, Q):
                    break
                cand = [k2 for k2, b2 in others.items() if k2 not in used and cur in (b2["start"], b2["end"])]
                assert len(cand) == 1
                kk = cand[0]
            assert cur == Q, (self.v, "kompozit Q ga yetmadi")
            Rc = sum(self.R[x] for (x, _, _, _) in chain)
            # yurish yo'nalishidagi EYuK: har tarmoq EYuKi (tok yo'nalishi bo'yicha) * sgn
            emfs = []
            for (x, sgn, a, bnode) in chain:
                for (j, s) in others[x]["emfs"]:
                    emfs.append((j, s * sgn))
            Ec = Fr(sum(Fr(s * self.E[j]) for (j, s) in emfs))
            comps.append(dict(chain=chain, R=Rc, emfs=emfs, E=Ec))
        assert len(comps) == 3 and sum(len(c["chain"]) for c in comps) == 5, self.v
        # U = phi_P (phi_Q = 0): sum (U + Ec)/Rc = 0
        g = [Fr(1, c["R"]) for c in comps]
        U = -sum(c["E"] * gi for c, gi in zip(comps, g)) / sum(g)
        self.U_PQ = U
        pot = {P: U, Q: Fr(0)}
        for c in comps:
            c["I"] = (U + c["E"]) / c["R"]   # P -> Q yo'nalishida
            phi = U
            c["pts"] = []
            for (x, sgn, a, bnode) in c["chain"]:
                Ex = sum(Fr(s * sgn * self.E[j]) for (j, s) in others[x]["emfs"])
                phi = phi - c["I"] * self.R[x] + Ex
                if bnode not in (P, Q):
                    pot[bnode] = phi
                c["pts"].append((x, sgn, a, bnode, Ex, phi))
            assert abs(phi) < Fr(1, 10 ** 9) or phi == 0, (self.v, phi)
        self.comps = comps
        self.pot_xx = pot
        self.Uxx = pot[X] - pot[Y]
        # R_ekv qisqartirish
        self.Rekv, self.red_steps = reduce_network(
            [(b["start"], b["end"], Fr(self.R[k]), f"R_{k}") for k, b in others.items()], X, Y)
        self.Ek_cut = self.br[kc]["E"]
        self.I_eg = (self.Uxx + self.Ek_cut) / (self.R[kc] + self.Rekv)
        assert self.I_eg == self.I[kc], (self.v, self.I_eg, self.I[kc])

    def _power(self):
        src = []
        for k, b in self.br.items():
            for (j, s) in b["emfs"]:
                src.append((j, s, k, s * self.E[j] * b["I"]))
        src.sort()
        self.src = src
        self.Psrc = sum(x[3] for x in src)
        self.Pload = sum(self.I[k] ** 2 * self.R[k] for k in self.I)
        assert self.Psrc == self.Pload


def reduce_network(edges, X, Y):
    """Passiv zanjirni X–Y qisqichlariga nisbatan qisqartirish. Qadamlar ro'yxatini qaytaradi."""
    E = [list(e) for e in edges]   # [u, v, R, name]
    steps = []
    cnt = [0]
    star = [0]

    def newname():
        cnt[0] += 1
        return f"R_{{e{cnt[0]}}}"

    def deg(n):
        return sum((e[0] == n) + (e[1] == n) for e in E)

    guard = 0
    while not (len(E) == 1 and {E[0][0], E[0][1]} == {X, Y}):
        guard += 1
        assert guard < 50
        # osilib qolgan tarmoq
        dang = None
        for e in E:
            for n in (e[0], e[1]):
                if n not in (X, Y) and deg(n) == 1:
                    dang = e
        if dang:
            E.remove(dang)
            steps.append(("dangling", dang[3]))
            continue
        # parallel
        done = False
        for i in range(len(E)):
            for j in range(i + 1, len(E)):
                a, b = E[i], E[j]
                if {a[0], a[1]} == {b[0], b[1]}:
                    nm = newname()
                    Rn = a[2] * b[2] / (a[2] + b[2])
                    steps.append(("par", nm, a[3], b[3], a[2], b[2], Rn, a[0], a[1]))
                    E[i] = [a[0], a[1], Rn, nm]
                    E.pop(j)
                    done = True
                    break
            if done:
                break
        if done:
            continue
        # ketma-ket
        for n in {x for e in E for x in (e[0], e[1])}:
            if n in (X, Y) or deg(n) != 2:
                continue
            a, b = [e for e in E if n in (e[0], e[1])]
            u = a[0] if a[1] == n else a[1]
            w = b[0] if b[1] == n else b[1]
            nm = newname()
            Rn = a[2] + b[2]
            steps.append(("ser", nm, a[3], b[3], a[2], b[2], Rn, u, w, n))
            E.remove(a); E.remove(b)
            E.append([u, w, Rn, nm])
            done = True
            break
        if done:
            continue
        # uchburchak -> yulduz
        nodes = sorted({x for e in E for x in (e[0], e[1])})

        def edge(u, v):
            for e in E:
                if {e[0], e[1]} == {u, v}:
                    return e
            return None
        tri = None
        from itertools import combinations
        for (u, v, w) in combinations(nodes, 3):
            if edge(u, v) and edge(v, w) and edge(u, w):
                tri = (u, v, w)
                break
        assert tri, "uchburchak topilmadi"
        u, v, w = tri
        euv, evw, euw = edge(u, v), edge(v, w), edge(u, w)
        S = euv[2] + evw[2] + euw[2]
        star[0] += 1
        O = "O" if star[0] == 1 else f"O_{star[0]}"
        Ru = euv[2] * euw[2] / S
        Rv = euv[2] * evw[2] / S
        Rw = euw[2] * evw[2] / S
        nu, nv, nw = f"R_{{{u}}}", f"R_{{{v}}}", f"R_{{{w}}}"
        if star[0] > 1:
            nu, nv, nw = f"R_{{{u}{star[0]}}}", f"R_{{{v}{star[0]}}}", f"R_{{{w}{star[0]}}}"
        steps.append(("dstar", O, (u, v, w), (euv, evw, euw), S, ((u, nu, Ru, euv, euw), (v, nv, Rv, euv, evw), (w, nw, Rw, euw, evw))))
        for e in (euv, evw, euw):
            E.remove(e)
        E += [[u, O, Ru, nu], [v, O, Rv, nv], [w, O, Rw, nw]]
    return E[0][2], steps


if __name__ == "__main__":
    for v in range(1, 31):
        s = Solution(v)
        print(v, "I:", [round(float(s.I[k]), 3) for k in range(1, 7)], "kcut", s.kcut, s.X + "->" + s.Y,
              "Uxx", round(float(s.Uxx), 3), "Rekv", round(float(s.Rekv), 4), "steps", [st[0] for st in s.red_steps],
              "P", round(float(s.Psrc), 2))
