import { describe, expect, it } from "vitest";
import { TOPOLOGY, normalDevicePositions } from "../data/equipment";
import { computeNetwork, isNodeEnergized } from "./network";

const base = () => normalDevicePositions();

describe("network", () => {
  it("normal holatda barcha shinalar va iste'molchilar kuchlanishda", () => {
    const n = computeNetwork(TOPOLOGY, { devices: base() });
    for (const b of ["B110-1", "B110-2", "B35-1", "B35-2", "B10-1", "B10-2"]) expect(isNodeEnergized(n, b)).toBe(true);
    expect(Object.values(n.loadSupplied).every(Boolean)).toBe(true);
    expect(n.shortCircuit).toBe(false);
  });

  it("T-1 ning 10 kV o'chirgichi uzilsa B10-1 iste'molchilari ta'minotsiz qoladi", () => {
    const n = computeNetwork(TOPOLOGY, { devices: { ...base(), "Q-T1-10": "open" } });
    expect(isNodeEnergized(n, "B10-1")).toBe(false);
    expect(n.loadSupplied["L-F10-1"]).toBe(false);
    expect(n.loadSupplied["L-F10-3"]).toBe(true);
  });

  it("SV-10 ulansa B10-1 T-2 dan ta'minlanadi, yuklama T-2 ga o'tadi", () => {
    const n = computeNetwork(TOPOLOGY, { devices: { ...base(), "Q-SV10": "closed", "Q-T1-10": "open" } });
    expect(n.loadSupplied["L-F10-1"]).toBe(true);
    // T-1 faqat 35 kV yuklamasini oladi (6 MVt / 0.9)
    expect(n.transformerMva["T-1"]).toBeCloseTo(6 / 0.9, 5);
    expect(n.transformerMva["T-2"]).toBeCloseTo((5 + 2 + 2 + 1.5 + 3) / 0.9, 5);
  });

  it("parallel ishlashda yuklama teng taqsimlanadi", () => {
    const n = computeNetwork(TOPOLOGY, { devices: { ...base(), "Q-SV10": "closed" } });
    const tenKv = (1.5 + 3 + 2 + 2) / 0.9;
    expect(n.transformerMva["T-1"] + n.transformerMva["T-2"]).toBeCloseTo(tenKv + 11 / 0.9, 5);
  });

  it("teskari ta'minot: YK o'chirgichi ochiq, lekin 10 kV ulangan bo'lsa transformator kuchlanishda", () => {
    const n = computeNetwork(TOPOLOGY, {
      devices: { ...base(), "Q-SV10": "closed", "Q-T1-110": "open", "Q-T1-35": "open" },
    });
    expect(n.transformerEnergized["T-1"]).toBe(true);
    expect(isNodeEnergized(n, "T1:H")).toBe(true);
  });

  it("kuchlanishdagi seksiya yerlansa — qisqa tutashuv", () => {
    const n = computeNetwork(TOPOLOGY, { devices: { ...base(), "QSG-F10-1": "closed" } });
    expect(n.shortCircuit).toBe(true);
  });

  it("manba yo'q bo'lsa seksiya kuchlanishsiz", () => {
    const n = computeNetwork(TOPOLOGY, { devices: base(), sourcesAvailable: { "SRC-W1": false } });
    expect(isNodeEnergized(n, "B110-1")).toBe(false);
    expect(isNodeEnergized(n, "B110-2")).toBe(true);
  });
});
