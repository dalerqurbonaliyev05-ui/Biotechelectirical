import { describe, expect, it } from "vitest";
import { TRANSFORMER_MODELS } from "../data/transformers";
import { decodeMark, toCyrillic } from "./markDecoder";

const groups = (m: string) => decodeMark(m).letters.map((l) => `${l.group}:${l.code}`);

describe("marka dekoderi", () => {
  it("ТДТН-25000/110: uch fazali, D sovutish, uch o'ramli, RPN", () => {
    const d = decodeMark("ТДТН-25000/110");
    expect(d.ok).toBe(true);
    expect(groups("ТДТН-25000/110")).toEqual(["phases:Т", "cooling:Д", "windings:Т", "regulation:Н"]);
    expect(d.ratedKva).toBe(25000);
    expect(d.hvClassKv).toBe(110);
  });
  it("lotin yozuvi ham o'qiladi va kirillga keltiriladi", () => {
    expect(toCyrillic("trdn-25000/110")).toBe("ТРДН-25000/110");
    expect(groups("TRDN-25000/110")).toEqual(["phases:Т", "split:Р", "cooling:Д", "regulation:Н"]);
    expect(groups("TMG-630/10")).toEqual(["phases:Т", "cooling:М", "protection:Г"]);
  });
  it("ДЦ va avtotransformator", () => {
    expect(groups("АТДЦТН-125000/220")).toEqual(["auto:А", "phases:Т", "cooling:ДЦ", "windings:Т", "regulation:Н"]);
    expect(groups("ATDTsTN-125000/220")).toEqual(groups("АТДЦТН-125000/220"));
  });
  it("iqlim qo'shimchasi", () => {
    expect(decodeMark("ТМН-6300/35-У1").climate).toBe("mo'tadil iqlim, ochiq havoda");
    expect(decodeMark("ТМГ-1000/10-ХЛ1").climate).toBe("sovuq iqlim, ochiq havoda");
  });
  it("noto'g'ri markalar xato beradi", () => {
    expect(decodeMark("ХYZ-1/1").ok).toBe(false);
    expect(decodeMark("ТМ").ok).toBe(false);
    expect(decodeMark("ТМ-abc").ok).toBe(false);
  });
  it("ma'lumotlar bazasidagi barcha modellar xatosiz o'qiladi va quvvat pasportga mos", () => {
    for (const m of Object.values(TRANSFORMER_MODELS)) {
      const d = decodeMark(m.markCyr);
      expect(d.errors, m.key).toEqual([]);
      expect(d.ratedKva, m.key).toBeCloseTo(m.ratedMva.value * 1000);
      expect(decodeMark(m.markLat).normalized).toBe(d.normalized);
    }
  });
});
