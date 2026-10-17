"use client";

// Chop etish uchun oq fonli hujjat (portal body ichiga). Ekranda ko'rinmaydi.

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { formatClock } from "../../engine/journal";
import { uz } from "../../i18n/uz";
import { usePrint } from "../../store/print";
import { useDerived } from "../useDerived";
import { PermitSummary } from "./PermitPanel";

const D = uz.docs;

export default function PrintArea() {
  const doc = usePrint((s) => s.doc);
  const clear = usePrint((s) => s.clear);
  const { ctx, sim } = useDerived();

  useEffect(() => {
    if (!doc) return;
    document.body.classList.add("printing");
    const done = () => {
      document.body.classList.remove("printing");
      clear();
    };
    window.addEventListener("afterprint", done);
    return () => {
      window.removeEventListener("afterprint", done);
      document.body.classList.remove("printing");
    };
  }, [doc, clear]);

  if (!doc || !ctx || !sim || typeof document === "undefined") return null;
  const sc = ctx.scenario;
  const label = (id: string) => sc.steps.find((s) => s.id === id)?.label ?? sc.blank?.distractors.find((d) => d.id === id)?.label ?? id;

  return createPortal(
    <div className="print-area">
      <p className="text-xs">«Yangiobod» 110/35/10 kV podstansiyasi · {sc.id}: {sc.title}</p>
      {doc === "permit" && sim.permit && (
        <>
          <h1 className="my-3 text-xl font-bold">{D.permit}</h1>
          <PermitSummary permit={sim.permit} />
          <h2 className="mt-4 font-bold">{D.log}</h2>
          <ul>
            {sim.permitLog.map((l, i) => (
              <li key={i}>
                {formatClock(l.t)} — {l.kind === "admit" ? D.logAdmit : D.logFinish}
              </li>
            ))}
          </ul>
        </>
      )}
      {doc === "blank" && sim.blank && (
        <>
          <h1 className="my-3 text-xl font-bold">{D.blank}</h1>
          <ol className="list-decimal pl-6">
            {sim.blank.order.map((id) => (
              <li key={id} className="py-0.5">
                {label(id)} {sim.doneSteps.includes(id) ? "✓" : ""}
              </li>
            ))}
          </ol>
        </>
      )}
      {doc === "protocol" && sc.protocol && sim.protocols.at(-1) && (
        <>
          <h1 className="my-3 text-xl font-bold">{D.protocol}</h1>
          <p>
            {D.temp}: {sim.protocols.at(-1)!.tempC}
          </p>
          <table className="mt-2 w-full border-collapse">
            <thead>
              <tr>
                <th className="border p-1 text-left">{D.winding}</th>
                <th className="border p-1">R15</th>
                <th className="border p-1">R60</th>
                <th className="border p-1">{D.kabs}</th>
              </tr>
            </thead>
            <tbody>
              {sim.protocols.at(-1)!.rows.map((r) => (
                <tr key={r.winding}>
                  <td className="border p-1">{sc.protocol!.readings.find((x) => x.winding === r.winding)?.label}</td>
                  <td className="border p-1 text-right">{r.r15}</td>
                  <td className="border p-1 text-right">{r.r60}</td>
                  <td className="border p-1 text-right">{(r.r60 / r.r15).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 font-bold">
            {D.conclusion}: {sim.protocols.at(-1)!.conclusion === "fit" ? D.fit : D.unfit}
          </p>
        </>
      )}
      {doc === "journal" && (
        <>
          <h1 className="my-3 text-xl font-bold">{D.journal}</h1>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border p-1">{D.time}</th>
                <th className="border p-1">{D.from}</th>
                <th className="border p-1">{D.order}</th>
                <th className="border p-1">{D.done}</th>
                <th className="border p-1">{D.executor}</th>
              </tr>
            </thead>
            <tbody>
              {sim.journal.map((j, i) => (
                <tr key={i}>
                  <td className="border p-1">{j.time}</td>
                  <td className="border p-1">{j.from}</td>
                  <td className="border p-1">{j.orderText}</td>
                  <td className="border p-1">{j.doneText}</td>
                  <td className="border p-1">{j.executor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      <p className="mt-6 text-xs">{uz.app.disclaimer}</p>
    </div>,
    document.body,
  );
}
