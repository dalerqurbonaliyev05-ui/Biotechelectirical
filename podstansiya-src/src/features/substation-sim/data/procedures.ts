// Kommutatsiya tartibi bo'yicha qadamlar quruvchilari. Tartib data/rules.ts dagi SWITCHING_ORDER dan
// olinadi — mahalliy yo'riqnoma boshqacha bo'lsa, faqat o'sha sozlamani o'zgartirish kifoya.

import type { StepDef } from "../engine/scenario";
import { SWITCHING_ORDER } from "./rules";

type Side = "110" | "35" | "10";
const SIDES: Side[] = ["110", "35", "10"];
const SIDE_NAME: Record<Side, string> = { "110": "110 kV", "35": "35 kV", "10": "10 kV" };

/** "T-1" → "T1" (uskuna nomlaridagi qisqa shakl) */
export const shortT = (t: string) => t.replace("-", "");

/**
 * Transformatorni ta'mirga chiqarish: o'chirgichlar (past tomondan) → ajratkichlar (har tomonda
 * avval transformator tomoni, keyin shina tomoni) → kuchlanish yo'qligini tekshirish → yerlash → plakatlar.
 * @param after — o'chirgichlardan oldin bajarilishi kerak bo'lgan qadamlar (masalan yuklamani o'tkazish)
 */
export function transformerOutageSteps(t: string, after: Partial<Record<Side, string[]>>): StepDef[] {
  const T = shortT(t);
  const o = SWITCHING_ORDER.outage;
  const steps: StepDef[] = [];
  const breakerStep = (side: Side) => `off-Q-${side}`;

  // O'chirgichlar (guruhlar ketma-ket, guruh ichida ixtiyoriy tartib)
  o.breakers.forEach((group, gi) => {
    const prev = o.breakers.slice(0, gi).flat().map(breakerStep);
    for (const side of group) {
      const isLastGroup = gi === o.breakers.length - 1;
      steps.push({
        id: breakerStep(side),
        label: `Q-${T}-${side} o'chirgichini o'chirish (${SIDE_NAME[side]})`,
        match: { type: "switch", deviceId: `Q-${T}-${side}`, to: "open" },
        after: [...(after[side] ?? []), ...prev],
        explain: isLastGroup
          ? "Yuqori kuchlanish o'chirgichi oxirida o'chiriladi: avval yuklama past tomonlardan olinadi, keyin transformator salt yurishdan uziladi."
          : "Avval yuklama tomoni (past kuchlanish) o'chirgichi o'chiriladi — yuklama tokini o'chirgich uzadi, ajratkich emas.",
        hint: isLastGroup ? "Past tomonlar o'chirilgandan keyin." : undefined,
      });
      if (o.checkBreakerPosition) {
        steps.push({
          id: `chk-Q-${side}`,
          label: `Q-${T}-${side} ning o'chiq holatini joyida tekshirish`,
          match: { type: "checkPosition", deviceId: `Q-${T}-${side}` },
          after: [breakerStep(side)],
          optional: true,
          explain: "Ajratkichni ochishdan oldin o'chirgich haqiqatan o'chganini mexanik ko'rsatkich bo'yicha joyida tekshirish xavfsizlikni oshiradi.",
        });
      }
    }
  });

  const allBreakers = o.breakers.flat().map(breakerStep);

  // Ajratkichlar: har tomonda tartib bilan
  for (const side of SIDES) {
    const [first, second] = o.disconnectors.map((pos) => (pos === "equipment" ? `QS-${T}-${side}T` : `QS-${T}-${side}B`));
    steps.push({
      id: `open-${first}`,
      label: `${first} ajratkichini ochish (${SIDE_NAME[side]}, ${o.disconnectors[0] === "equipment" ? "transformator" : "shina"} tomoni)`,
      match: { type: "switch", deviceId: first, to: "open" },
      after: [...allBreakers],
      explain: "Ajratkich faqat o'chirgich o'chirilgandan keyin ochiladi (tok yo'q). Har tomonda avval transformator tomonidagi, keyin shina tomonidagi ajratkich ochiladi.",
      hint: `Avval ${T} ning barcha o'chirgichlari o'chirilsin.`,
    });
    steps.push({
      id: `open-${second}`,
      label: `${second} ajratkichini ochish (${SIDE_NAME[side]}, ${o.disconnectors[1] === "bus" ? "shina" : "transformator"} tomoni)`,
      match: { type: "switch", deviceId: second, to: "open" },
      after: [`open-${first}`],
      explain: "Shina tomonidagi ajratkich ikkinchi bo'lib ochiladi — agar o'chirgich noto'g'ri holatda bo'lsa, yoy shina tomonida emas, liniya/transformator tomonida bo'ladi.",
    });
  }
  const allDisconnectors = SIDES.flatMap((side) => [`open-QS-${T}-${side}T`, `open-QS-${T}-${side}B`]);

  // Plakatlar: shina tomonidagi ajratkich yuritmalariga
  for (const side of SIDES) {
    steps.push({
      id: `poster-QS-${side}B`,
      label: `QS-${T}-${side}B yuritmasiga «Ulamang — odamlar ishlamoqda» plakatini osish`,
      match: { type: "poster", targetId: `QS-${T}-${side}B`, poster: "doNotSwitch" },
      after: [`open-QS-${T}-${side}B`],
      explain: "Plakat ish joyiga kuchlanish berishi mumkin bo'lgan ajratkich yuritmasiga osiladi — uni hech kim xato bilan ulamasligi uchun.",
    });
  }

  // Kuchlanish yo'qligini tekshirish va yerlash
  const node: Record<Side, string> = { "110": `${T}:H`, "35": `${T}:M`, "10": `${T}:L` };
  for (const side of SIDES) {
    steps.push({
      id: `verify-${side}`,
      label: `${SIDE_NAME[side]} tomonida kuchlanish yo'qligini ko'rsatkich bilan tekshirish`,
      match: { type: "verifyDead", nodeIds: [node[side]] },
      after: [...allDisconnectors],
      explain: "Yerlagichni ulashdan oldin kuchlanish yo'qligi shu joyning o'zida tekshiriladi. Transformator magnit bog'langani uchun barcha tomonlar uzilgach tekshiriladi.",
      hint: "Yerlagich kartasidagi «Kuchlanish yo'qligini tekshirish» tugmasi.",
    });
    steps.push({
      id: `earth-${side}`,
      label: `QSG-${T}-${side} yerlagichini ulash`,
      match: { type: "switch", deviceId: `QSG-${T}-${side}`, to: "closed" },
      after: [`verify-${side}`],
      explain: "Har tomondan yerlash — transformator har qanday tomondan (shu jumladan teskari ta'minot yoki induksiya orqali) kuchlanishga tushib qolsa ham ishchilarni himoya qiladi.",
    });
  }

  steps.push({
    id: "poster-work",
    label: `${t} ga «Shu yerda ishlang» plakatini osish va ish joyini to'sish`,
    match: { type: "poster", targetId: t, poster: "workHere" },
    after: SIDES.map((s) => `earth-${s}`),
    explain: "Ish joyi aniq belgilanadi, brigada boshqa (kuchlanish ostidagi) uskunaga adashib o'tmasligi uchun.",
  });
  return steps;
}

/**
 * Ta'mirdan keyin ishga tushirish (teskari tartib): naryad yopiladi, plakatlar va yerlagichlar olinadi,
 * ajratkichlar (avval shina tomoni) yopiladi, keyin manba (YK) o'chirgichi — salt yurish, keyin yuklama tomonlari.
 */
export function transformerEnergizeSteps(t: string, first: string | string[], beforeEnergize: string[] = []): StepDef[] {
  const firstDeps = Array.isArray(first) ? first : [first];
  const T = shortT(t);
  const e = SWITCHING_ORDER.energize;
  const steps: StepDef[] = [];
  steps.push({
    id: "poster-work-off",
    label: `${t} dagi «Shu yerda ishlang» plakatini olish`,
    match: { type: "poster", targetId: t, poster: "workHere", on: false },
    after: firstDeps,
    explain: "Brigada olib chiqilgach va naryad yopilgach plakatlar olinadi.",
  });
  for (const side of SIDES) {
    steps.push({
      id: `unearth-${side}`,
      label: `QSG-${T}-${side} yerlagichini olish`,
      match: { type: "switch", deviceId: `QSG-${T}-${side}`, to: "open" },
      after: firstDeps,
      explain: "Yerlagichlar faqat ish tugab, brigada olib chiqilgandan keyin olinadi. Yerlagich ulangan holda kuchlanish berish — qisqa tutashuv.",
    });
    steps.push({
      id: `poster-off-${side}`,
      label: `QS-${T}-${side}B dagi «Ulamang» plakatini olish`,
      match: { type: "poster", targetId: `QS-${T}-${side}B`, poster: "doNotSwitch", on: false },
      after: firstDeps,
      explain: "Plakat olinmaguncha bu ajratkichni ulash taqiqlanadi.",
    });
  }
  const unearthed = SIDES.map((s) => `unearth-${s}`);
  const postersOff = SIDES.map((s) => `poster-off-${s}`);
  for (const side of SIDES) {
    const [a, b] = e.disconnectors.map((pos) => (pos === "bus" ? `QS-${T}-${side}B` : `QS-${T}-${side}T`));
    steps.push({
      id: `close-${a}`,
      label: `${a} ajratkichini yopish (${SIDE_NAME[side]}, shina tomoni)`,
      match: { type: "switch", deviceId: a, to: "closed" },
      after: [...unearthed, ...postersOff],
      explain: "Ulashda ajratkichlar avval shina (manba) tomonidan yopiladi; o'chirgich ochiq — tok yo'q.",
    });
    steps.push({
      id: `close-${b}`,
      label: `${b} ajratkichini yopish (${SIDE_NAME[side]}, transformator tomoni)`,
      match: { type: "switch", deviceId: b, to: "closed" },
      after: [`close-${a}`],
      explain: "Keyin transformator tomonidagi ajratkich yopiladi.",
    });
  }
  const allDisc = SIDES.flatMap((side) => [`close-QS-${T}-${side}B`, `close-QS-${T}-${side}T`]);
  e.breakers.forEach((group, gi) => {
    const prev = gi === 0 ? [...allDisc, ...beforeEnergize] : e.breakers.slice(0, gi).flat().map((x) => `on-Q-${x}`);
    for (const side of group) {
      steps.push({
        id: `on-Q-${side}`,
        label:
          gi === 0
            ? `Q-${T}-${side} ni ulash — transformatorni salt yurishda kuchlanishga qo'yish`
            : `Q-${T}-${side} ni ulash — ${SIDE_NAME[side]} yuklamasini olish`,
        match: { type: "switch", deviceId: `Q-${T}-${side}`, to: "closed" },
        after: prev,
        explain:
          gi === 0
            ? "Avval manba tomonidagi o'chirgich ulanadi: transformator salt yurishda kuchlanishga tushadi, nosozlik bo'lsa himoya uni darhol uzadi."
            : "Salt yurishda transformator normal ishlayotgani ko'rilgach, yuklama tomoni o'chirgichi ulanadi.",
      });
    }
  });
  return steps;
}

/** Kommutatsiya blankasiga kiradigan qadamlar: majburiy kommutatsiya, kuchlanishni tekshirish va plakatlar. */
export function blankStepIds(steps: StepDef[]): string[] {
  return steps
    .filter((s) => !s.optional)
    .filter((s) => (Array.isArray(s.match) ? s.match : [s.match]).some((m) => m.type === "switch" || m.type === "verifyDead" || m.type === "poster"))
    .map((s) => s.id);
}

/** Transformator yacheykalari apparatlari (naryad shakli uchun). */
export function transformerBayDevices(t: string) {
  const T = shortT(t);
  return {
    breakers: SIDES.map((side) => `Q-${T}-${side}`),
    disconnectors: SIDES.flatMap((side) => [`QS-${T}-${side}T`, `QS-${T}-${side}B`]),
    busDisconnectors: SIDES.map((side) => `QS-${T}-${side}B`),
    earthing: SIDES.map((side) => `QSG-${T}-${side}`),
  };
}
