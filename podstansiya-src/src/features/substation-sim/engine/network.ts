// Tarmoq hisobi: qaysi tugun kuchlanish ostida, qaysi qism yerlangan, iste'molchilar ta'minoti
// va transformatorlar yuklamasi. Hisob "galvanik seksiyalar" orqali: yopiq o'chirgich va
// ajratkichlar bilan bog'langan tugunlar bitta seksiya; seksiyalar transformatorlar orqali bog'lanadi.

import type { SwitchPos, Topology } from "./types";

export interface Section {
  index: number;
  nodes: string[];
  kv: number;
  energized: boolean;
  grounded: boolean;
}

export interface NetworkState {
  sectionOf: Record<string, number>;
  sections: Section[];
  /** Kuchlanish ostidagi transformatorlar (biror o'rami kuchlanishda bo'lsa) */
  transformerEnergized: Record<string, boolean>;
  /** Iste'molchi ta'minlanyaptimi */
  loadSupplied: Record<string, boolean>;
  /** Transformator yuklamasi, MVA (iste'molchilar teng taqsimlanadi) */
  transformerMva: Record<string, number>;
  /** Transformator YK tomondan (manbadan) ta'minlanyaptimi */
  transformerFedFromHv: Record<string, boolean>;
  /** Kuchlanish ostidagi va bir vaqtda yerlangan seksiya bormi — qisqa tutashuv */
  shortCircuit: boolean;
}

class UnionFind {
  private parent = new Map<string, string>();
  find(x: string): string {
    let p = this.parent.get(x) ?? x;
    if (p !== x) {
      p = this.find(p);
      this.parent.set(x, p);
    }
    return p;
  }
  union(a: string, b: string) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}

export interface NetworkInput {
  devices: Record<string, SwitchPos>;
  sourcesAvailable?: Record<string, boolean>;
  loadFactor?: number;
  powerFactor?: number;
}

export function computeNetwork(topology: Topology, input: NetworkInput): NetworkState {
  const { devices } = input;
  const uf = new UnionFind();
  for (const s of topology.switches) {
    if (devices[s.id] === "closed") uf.union(s.a, s.b);
  }

  // Seksiyalarni raqamlash
  const rootIndex = new Map<string, number>();
  const sections: Section[] = [];
  const sectionOf: Record<string, number> = {};
  for (const node of topology.nodes) {
    const r = uf.find(node.id);
    let idx = rootIndex.get(r);
    if (idx === undefined) {
      idx = sections.length;
      rootIndex.set(r, idx);
      sections.push({ index: idx, nodes: [], kv: node.kv, energized: false, grounded: false });
    }
    sections[idx].nodes.push(node.id);
    sectionOf[node.id] = idx;
  }

  for (const e of topology.earthSwitches) {
    if (devices[e.id] === "closed") sections[sectionOf[e.node]].grounded = true;
  }

  // Seksiyalar orasidagi transformator bog'lanishlari
  const windingSections = (t: Topology["transformers"][number]) =>
    [t.hv, t.mv, t.lv].filter((x): x is string => !!x).map((n) => sectionOf[n]);

  // 1) To'liq kuchlanish tarqalishi (ikki tomonlama — teskari ta'minot ham hisobga olinadi)
  const queue: number[] = [];
  for (const src of topology.sources) {
    if (input.sourcesAvailable?.[src.id] === false) continue;
    const idx = sectionOf[src.node];
    if (!sections[idx].energized) {
      sections[idx].energized = true;
      queue.push(idx);
    }
  }
  while (queue.length) {
    const cur = queue.shift()!;
    for (const t of topology.transformers) {
      const ws = windingSections(t);
      if (!ws.includes(cur)) continue;
      for (const w of ws) {
        if (!sections[w].energized) {
          sections[w].energized = true;
          queue.push(w);
        }
      }
    }
  }

  const transformerEnergized: Record<string, boolean> = {};
  for (const t of topology.transformers) {
    transformerEnergized[t.id] = windingSections(t).some((w) => sections[w].energized);
  }

  // 2) Yo'nalishli ta'minot (yuklamani taqsimlash uchun): manbadan YK o'ramiga, so'ng past tomonga
  const fedFromHv: Record<string, boolean> = {};
  const hvReached = new Set<number>();
  for (const src of topology.sources) {
    if (input.sourcesAvailable?.[src.id] === false) continue;
    hvReached.add(sectionOf[src.node]);
  }
  for (const t of topology.transformers) fedFromHv[t.id] = hvReached.has(sectionOf[t.hv]);

  const loadSupplied: Record<string, boolean> = {};
  const transformerMva: Record<string, number> = {};
  for (const t of topology.transformers) transformerMva[t.id] = 0;
  const lf = input.loadFactor ?? 1;
  const pf = input.powerFactor ?? 0.9;
  for (const load of topology.loads) {
    const sIdx = sectionOf[load.node];
    const sec = sections[sIdx];
    loadSupplied[load.id] = sec.energized && !sec.grounded;
    if (!loadSupplied[load.id]) continue;
    const suppliers = topology.transformers.filter(
      (t) => fedFromHv[t.id] && [t.mv, t.lv].some((w) => w && sectionOf[w] === sIdx),
    );
    const mva = (load.mw * lf) / pf;
    for (const t of suppliers) transformerMva[t.id] += mva / suppliers.length;
  }

  return {
    sectionOf,
    sections,
    transformerEnergized,
    loadSupplied,
    transformerMva,
    transformerFedFromHv: fedFromHv,
    shortCircuit: sections.some((s) => s.energized && s.grounded),
  };
}

export function isNodeEnergized(net: NetworkState, nodeId: string): boolean {
  return net.sections[net.sectionOf[nodeId]]?.energized ?? false;
}

export function isNodeGrounded(net: NetworkState, nodeId: string): boolean {
  return net.sections[net.sectionOf[nodeId]]?.grounded ?? false;
}

/** Yuklama obyektlari (iste'molchilar + transformatorlar) — ajratkich bilan kommutatsiya tekshiruvi uchun. */
export function suppliedObjects(topology: Topology, net: NetworkState): Set<string> {
  const out = new Set<string>();
  for (const l of topology.loads) if (net.loadSupplied[l.id]) out.add(l.id);
  for (const t of topology.transformers) if (net.transformerEnergized[t.id]) out.add(t.id);
  return out;
}

/** O'rta/past kuchlanish seksiyasini parallel ta'minlayotgan transformatorlar juftliklari ("T-1|T-2"). */
export function parallelPairs(topology: Topology, net: NetworkState): Set<string> {
  const out = new Set<string>();
  const bySection = new Map<number, string[]>();
  for (const t of topology.transformers) {
    if (!net.transformerFedFromHv[t.id]) continue;
    for (const w of [t.mv, t.lv]) {
      if (!w) continue;
      const sec = net.sectionOf[w];
      if (!net.sections[sec].energized) continue;
      bySection.set(sec, [...(bySection.get(sec) ?? []), t.id]);
    }
  }
  for (const ids of bySection.values()) {
    const u = [...new Set(ids)].sort();
    for (let i = 0; i < u.length; i++) for (let j = i + 1; j < u.length; j++) out.add(`${u[i]}|${u[j]}`);
  }
  return out;
}
