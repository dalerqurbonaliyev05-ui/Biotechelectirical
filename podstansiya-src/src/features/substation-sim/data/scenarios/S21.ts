// Smena rejimi: 8 soatlik smena, hodisalar pulidan urug' bo'yicha tanlangan 4 ta hodisa oqimi.
// Har bir hodisa — mustaqil "modul" (xabar, qadamlar, hodisa, qaror/o'lchov); smena oxirida umumiy baho.

import type { DecisionDef, DispatcherMessage, Goal, MeasurementDef, ScenarioDef, StepDef, TimelineEvent } from "../../engine/scenario";
import { createRng } from "../../engine/events";
import { journalStep, order, readbackStep, reportStep, switchStep } from "./helpers";

interface Module {
  messages: DispatcherMessage[];
  steps: StepDef[];
  timeline: TimelineEvent[];
  decisions?: DecisionDef[];
  measurements?: MeasurementDef[];
  goals?: Goal[];
  allowedOutages?: string[];
  freeSwitching?: string[];
}

type ModuleFactory = (p: string, at: string) => Module;

const hide = (steps: StepDef[], messageId: string): StepDef[] => steps.map((s) => ({ ...s, hiddenUntilMessage: messageId }));
const msgEvent = (p: string, at: string, messageId: string): TimelineEvent => ({ id: `${p}-msg`, trigger: { at }, event: { kind: "message", messageId } });

const MODULES: Record<string, ModuleFactory> = {
  // F10-2 ni ta'mirga o'chirish
  feeder: (p, at) => {
    const m = `${p}-m`;
    return {
      messages: [
        {
          ...order(m, "Yangiobod PS. F10-2 fiderini ta'mirga o'chiring: Q-F10-2, so'ng QS-F10-2B.", "Tushundim: Q-F10-2 ni o'chiraman, so'ng QS-F10-2B ni ajrataman.", [["Tushundim: QS-F10-2B ni ajrataman, so'ng Q-F10-2 ni o'chiraman.", "Tartib teskari."]], {
            report: { afterStep: `${p}-j`, text: "F10-2 o'chirildi va ajratildi." },
          }),
          trigger: { afterEvent: `${p}-msg` },
        },
      ],
      timeline: [msgEvent(p, at, m)],
      steps: hide(
        [
          readbackStep(`${p}-rb`, m),
          switchStep(`${p}-q`, "Q-F10-2", "open", "Q-F10-2 ni o'chirish", [`${p}-rb`], "Avval o'chirgich."),
          switchStep(`${p}-qs`, "QS-F10-2B", "open", "QS-F10-2B ni ajratish", [`${p}-q`], "So'ng aravacha."),
          journalStep(`${p}-j`, [`${p}-qs`]),
          reportStep(`${p}-rep`, m, [`${p}-j`]),
        ],
        m,
      ),
      allowedOutages: ["L-F10-2"],
    };
  },
  // Kuchlanish past — T-1 RPN
  voltage: (p, at) => {
    const m = `${p}-m`;
    return {
      messages: [
        {
          ...order(m, "Yangiobod PS. 10 kV I seksiyada kuchlanish past. T-1 RPN bilan 10,3–10,6 kV ga keltiring.", "Tushundim: T-1 RPN bilan 10 kV I seksiya kuchlanishini 10,3–10,6 kV ga keltiraman.", [["Tushundim: T-1 quvvatini RPN bilan oshiraman.", "RPN quvvatni oshirmaydi."]], {
            report: { afterStep: `${p}-tap`, text: "T-1 RPN pog'onasi o'zgartirildi, kuchlanish me'yorda.", requireGoals: true },
          }),
          trigger: { afterEvent: `${p}-msg` },
        },
      ],
      timeline: [msgEvent(p, at, m), { id: `${p}-kv`, trigger: { at }, event: { kind: "sourceKv", kv: 106 } }],
      steps: hide(
        [
          readbackStep(`${p}-rb`, m),
          { id: `${p}-tap`, label: "T-1 RPN: kuchlanishni oshirish (bittadan, pauza bilan)", match: { type: "tap", transformerId: "T-1", dir: 1 }, after: [`${p}-rb`], explain: "Pog'ona bir-bir o'zgartiriladi." },
          reportStep(`${p}-rep`, m, [`${p}-tap`]),
        ],
        m,
      ),
      goals: [{ type: "voltageInRange", transformerId: "T-1", winding: "lv", min: 10.3, max: 10.6 }],
    };
  },
  // 10 kV da yerga tutashuv
  earth: (p, at) => {
    const m = `${p}-m`;
    return {
      messages: [
        {
          ...order(m, "Yangiobod PS. 10 kV II seksiyada yerga tutashuv. Fiderlarni navbat bilan uzib toping, topilganini o'chirilgan holda qoldiring.", "Tushundim: fiderlarni navbat bilan uzib, shikastlanganini topaman va o'chirilgan holda qoldiraman.", [["Tushundim: seksiyani butunlay o'chiraman.", "1-toifa iste'molchilar keraksiz uziladi."]], {
            report: { afterStep: `${p}-find`, text: "Yerga tutashuv F10-4 da, F10-4 o'chirilgan.", requireGoals: true },
          }),
          trigger: { afterEvent: `${p}-msg` },
        },
      ],
      timeline: [msgEvent(p, at, m), { id: `${p}-ef`, trigger: { at }, event: { kind: "earthFault", nodeId: "F10-4", phase: "C", severity: 0.95 } }],
      steps: hide(
        [
          readbackStep(`${p}-rb`, m),
          switchStep(`${p}-find`, "Q-F10-4", "open", "Shikastlangan fiderni topish va o'chirish", [`${p}-rb`], "Signal yo'qolgan fider — shikastlangan."),
          reportStep(`${p}-rep`, m, [`${p}-find`]),
        ],
        m,
      ),
      goals: [{ type: "noActiveAlarm", code: "earthFault" }],
      allowedOutages: ["L-F10-4"],
      freeSwitching: ["Q-F10-3", "Q-F10-4"],
    };
  },
  // Ortiqcha yuklanish: ventilyatorlar
  overload: (p, at) => {
    const m = `${p}-m`;
    return {
      messages: [
        {
          ...order(m, "Yangiobod PS. T-2 yuklamasi oshmoqda, ventilyatorlar avtomatikasi signal berdi. Sovutishni ta'minlang va xabar bering.", "Tushundim: T-2 sovutishini ta'minlab, xabar beraman.", [["Tushundim: T-2 ni o'chiraman.", "Ortiqcha yuklanishda avval sovutish va yuklamani boshqarish."]], {
            report: { afterStep: `${p}-fans`, text: "T-2 ventilyatorlari qo'lda yoqildi, harorat nazoratda." },
          }),
          trigger: { afterEvent: `${p}-msg` },
        },
      ],
      timeline: [msgEvent(p, at, m), { id: `${p}-ff`, trigger: { at }, event: { kind: "fansFail", transformerId: "T-2" } }],
      steps: hide(
        [
          readbackStep(`${p}-rb`, m),
          { id: `${p}-fans`, label: "T-2 ventilyatorlarini qo'lda yoqish", match: { type: "fans", transformerId: "T-2", on: true }, after: [`${p}-rb`], explain: "Avtomatika ishlamasa — qo'lda." },
          reportStep(`${p}-rep`, m, [`${p}-fans`]),
        ],
        m,
      ),
    };
  },
  // Gaz relesi signali (havo)
  gas: (p, at) => {
    const m = `${p}-m`;
    return {
      messages: [
        {
          ...order(m, "Yangiobod PS. T-1 gaz relesi signali. Gaz namunasini olib, xulosa bering.", "Tushundim: T-1 gaz relesidan namuna olib, xulosa beraman.", [["Tushundim: signalni o'chirib qo'yaman.", "Signal tekshirilmasdan e'tiborsiz qoldirilmaydi."]], {
            report: { afterStep: `${p}-d`, text: "Gaz rangsiz, yonmaydi — havo. Havo chiqarildi, kuzatuv davom etmoqda." },
          }),
          trigger: { afterEvent: `${p}-msg` },
        },
      ],
      timeline: [msgEvent(p, at, m), { id: `${p}-al`, trigger: { at }, event: { kind: "alarm", code: "gasSignal", params: { transformer: "T-1" } } }],
      measurements: [{ id: `${p}-gas`, label: "T-1 gaz relesidan gaz namunasi", targetId: "T-1", kind: "gasSample", durationSec: 900, fixed: 0, variants: [{ category: "air", values: { Rangi: "rangsiz", Yonuvchanligi: "yonmaydi" } }] }],
      decisions: [
        {
          id: `${p}-d`,
          prompt: "Gaz namunasi bo'yicha xulosa:",
          after: `${p}-gas`,
          options: [
            { id: "air", text: "Havo — chiqarib yuborib, kuzatishni davom ettirish", correctWhen: { measurementId: `${p}-gas`, categories: ["air"] } },
            { id: "off", text: "Ichki nosozlik — T-1 ni darhol o'chirish", why: "Rangsiz, yonmaydigan gaz — havo (masalan, moy quyishdan keyin)." },
          ],
        },
      ],
      steps: hide(
        [
          readbackStep(`${p}-rb`, m),
          { id: `${p}-gas`, label: "Gaz namunasini olish", match: { type: "measure", measurementId: `${p}-gas` }, after: [`${p}-rb`], explain: "Rang va yonuvchanlik." },
          { id: `${p}-d`, label: "Xulosa", match: { type: "choice", decisionId: `${p}-d` }, after: [`${p}-gas`], explain: "Natija bo'yicha." },
          reportStep(`${p}-rep`, m, [`${p}-d`]),
        ],
        m,
      ),
    };
  },
};

const SLOTS = ["09:00", "10:40", "12:30", "14:20"];

/** Urug' bo'yicha smena stsenariysini quradi (bir xil urug' — bir xil smena). */
export function buildShiftScenario(seed: number): ScenarioDef {
  const rng = createRng(seed);
  const pool = Object.keys(MODULES);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const chosen = pool.slice(0, 4);
  const mods = chosen.map((key, i) => MODULES[key](`e${i + 1}`, SLOTS[i]));
  const lastSteps = mods.map((m) => m.steps[m.steps.length - 1].id);

  return {
    id: "S21",
    level: 4,
    title: "Smena rejimi",
    objective: "8 soatlik smena, tasodifiy hodisalar oqimi",
    briefing:
      "08:00 dan 16:00 gacha navbatchilik. Smena davomida turli vaqtda hodisalar va buyruqlar keladi (har smenada boshqacha). Har birini qabul qiling, bajaring, xabar bering. Hodisalar orasida «⏩ Keyingi voqeagacha» tugmasi bilan vaqtni o'tkazing. Smena oxirida jurnalni yakunlang — umumiy baho beriladi.",
    kind: "journal",
    situation: { timeStart: "08:00", weather: "clear", season: "summer", ambientC: 30, loadFactor: 0.85 },
    orderRequired: true,
    allowedOutages: mods.flatMap((m) => m.allowedOutages ?? []),
    freeSwitching: mods.flatMap((m) => m.freeSwitching ?? []),
    timeline: mods.flatMap((m) => m.timeline),
    messages: mods.flatMap((m) => m.messages),
    decisions: mods.flatMap((m) => m.decisions ?? []),
    measurements: mods.flatMap((m) => m.measurements ?? []),
    steps: [...mods.flatMap((m) => m.steps), journalStep("shiftJournal", lastSteps, "Smena oxirida operativ jurnalni yakunlash")],
    goals: mods.flatMap((m) => m.goals ?? []),
    journal: { required: true },
    analysis:
      "Smena — bir nechta mustaqil vazifalar oqimi: har bir buyruq qaytarib o'qiladi, bajariladi, jurnalga yoziladi va hisobot beriladi. Signallarga tez, lekin tartib bilan javob berish, ustuvorlikni to'g'ri belgilash va hujjatlarni vaqtida yuritish — operatorning asosiy ko'nikmalari.",
  };
}

export const S21: ScenarioDef = buildShiftScenario(1);
