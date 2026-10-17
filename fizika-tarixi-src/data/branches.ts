import { l } from "@/lib/i18n/types";
import type { Branch, BranchId } from "./types";

export const BRANCHES: Branch[] = [
  {
    id: "mexanika",
    num: "01",
    title: l("Mexanika", "Механика", "Mechanics"),
    desc: l(
      "Harakat, kuch va energiya: Arximeddan Nyutongacha.",
      "Движение, сила и энергия: от Архимеда до Ньютона.",
      "Motion, force and energy: from Archimedes to Newton.",
    ),
  },
  {
    id: "optika",
    num: "02",
    title: l("Optika", "Оптика", "Optics"),
    desc: l(
      "Yorug‘lik tabiati, linzalar va ko‘rish tarixi.",
      "Природа света, линзы и история зрения.",
      "The nature of light, lenses and the science of sight.",
    ),
  },
  {
    id: "elektr",
    num: "03",
    title: l("Elektr va magnetizm", "Электричество и магнетизм", "Electricity & magnetism"),
    desc: l(
      "Faradey tajribalaridan Maksvell tenglamalarigacha.",
      "От опытов Фарадея до уравнений Максвелла.",
      "From Faraday's experiments to Maxwell's equations.",
    ),
  },
  {
    id: "astronomiya",
    num: "04",
    title: l("Astronomiya va tortishish", "Астрономия и тяготение", "Astronomy & gravity"),
    desc: l(
      "Samarqand rasadxonasidan Nyuton qonunigacha.",
      "От самаркандской обсерватории до закона Ньютона.",
      "From the Samarkand observatory to Newton's law.",
    ),
  },
  {
    id: "kvant",
    num: "05",
    title: l("Kvant va atom fizikasi", "Квантовая и атомная физика", "Quantum & atomic physics"),
    desc: l(
      "Plank, Kyuri va mikroolamning g‘alati qonunlari.",
      "Планк, Кюри и странные законы микромира.",
      "Planck, Curie and the strange laws of the micro-world.",
    ),
  },
  {
    id: "nisbiylik",
    num: "06",
    title: l("Nisbiylik nazariyasi", "Теория относительности", "Relativity"),
    desc: l(
      "Fazo, vaqt va tortishish haqidagi yangi qarash.",
      "Новый взгляд на пространство, время и тяготение.",
      "A new view of space, time and gravity.",
    ),
  },
];

export const BRANCH_BY_ID = Object.fromEntries(BRANCHES.map((b) => [b.id, b])) as Record<BranchId, Branch>;
