"use client";

import { useState } from "react";
import { NORMS } from "../../data/norms";
import { MODE_RULES } from "../../data/rules";
import { absorption } from "../../engine/protocol";
import type { InsulationProtocolForm } from "../../engine/types";
import { uz } from "../../i18n/uz";
import { useSession } from "../../store/session";
import { fmt } from "../text";
import { useDerived } from "../useDerived";
import { PrintButton, field } from "./common";

const D = uz.docs;

export default function ProtocolPanel() {
  const { ctx, sim } = useDerived();
  const dispatch = useSession((s) => s.dispatch);
  const spec = ctx?.scenario.protocol;
  const [rows, setRows] = useState<Record<string, { r15: string; r60: string }>>({});
  const [temp, setTemp] = useState("");
  const [conclusion, setConclusion] = useState<"fit" | "unfit" | "">("");
  if (!ctx || !sim) return null;
  if (!spec) return <p className="text-sm text-muted">{D.protocolNotNeeded}</p>;
  const running = sim.status === "running";
  const saved = sim.protocols.at(-1);
  const training = MODE_RULES[ctx.mode].hints === "full";
  const num = (s: string) => Number(s.replace(",", "."));

  const submit = () => {
    if (!conclusion) return;
    const form: InsulationProtocolForm = {
      kind: "insulation",
      tempC: num(temp),
      rows: spec.readings.filter((r) => rows[r.winding]).map((r) => ({ winding: r.winding, r15: num(rows[r.winding].r15), r60: num(rows[r.winding].r60) })),
      conclusion,
    };
    dispatch({ type: "protocol", form });
  };

  return (
    <section className="flex flex-col gap-3" aria-labelledby="proto-h">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 id="proto-h" className="font-bold">
            {D.protocol}
          </h4>
          <p className="text-xs text-muted">{D.protocolHint}</p>
        </div>
        {saved && <PrintButton doc="protocol" />}
      </div>

      <div className="rounded-xl border border-accent/40 bg-ink-950 p-3 font-mono text-xs" aria-label={D.instrument}>
        <p className="mb-2 font-sans text-xs font-semibold text-accent">📟 {D.instrument} · {spec.tempC} °C</p>
        <table className="w-full">
          <thead className="text-muted">
            <tr>
              <th className="text-left font-normal">{D.winding}</th>
              <th className="text-right font-normal">R15</th>
              <th className="text-right font-normal">R60</th>
              <th className="text-right font-normal">{D.factory}</th>
            </tr>
          </thead>
          <tbody>
            {spec.readings.map((r) => (
              <tr key={r.winding}>
                <td className="py-0.5 pr-2 font-sans">{r.label}</td>
                <td className="text-right text-ok">{r.r15}</td>
                <td className="text-right text-ok">{r.r60}</td>
                <td className="text-right text-muted">{r.factoryR60}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-1 font-sans text-[11px] text-muted">{D.MOhm}</p>
      </div>

      {saved ? (
        <p className="rounded-lg bg-ok/10 p-2 text-sm text-ok">
          ✓ {D.protocolSaved}: {saved.conclusion === "fit" ? D.fit : D.unfit}
        </p>
      ) : (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label className="text-xs text-muted">
            {D.temp}
            <input className={`${field} mt-1 w-28`} value={temp} onChange={(e) => setTemp(e.target.value)} inputMode="decimal" required />
          </label>
          {spec.readings.map((r) => {
            const v = rows[r.winding] ?? { r15: "", r60: "" };
            const k = absorption(num(v.r15), num(v.r60));
            const ratio = r.factoryR60 > 0 ? num(v.r60) / r.factoryR60 : 0;
            return (
              <fieldset key={r.winding} className="rounded-lg border border-line/60 p-2">
                <legend className="px-1 text-xs text-muted">{r.label}</legend>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs text-muted">
                    R15, {D.MOhm}
                    <input className={`${field} mt-1`} inputMode="decimal" value={v.r15} onChange={(e) => setRows((x) => ({ ...x, [r.winding]: { ...v, r15: e.target.value } }))} />
                  </label>
                  <label className="text-xs text-muted">
                    R60, {D.MOhm}
                    <input className={`${field} mt-1`} inputMode="decimal" value={v.r60} onChange={(e) => setRows((x) => ({ ...x, [r.winding]: { ...v, r60: e.target.value } }))} />
                  </label>
                </div>
                <p className="mt-1 font-mono text-xs text-muted">
                  {D.kabs} = {k ? k.toFixed(2) : "—"} · {D.ratio} = {ratio ? `${Math.round(ratio * 100)}%` : "—"}
                </p>
              </fieldset>
            );
          })}
          {training && (
            <p className="text-xs text-accent">
              {fmt(D.normHint, { kabs: String(NORMS.absorptionMin.value), ratio: String(Math.round(NORMS.insulationFactoryRatioMin.value * 100)) })}
            </p>
          )}
          <fieldset className="rounded-lg border border-line/60 p-2" role="radiogroup">
            <legend className="px-1 text-xs text-muted">{D.conclusion}</legend>
            {(["fit", "unfit"] as const).map((c) => (
              <label key={c} className="flex items-center gap-2 py-0.5 text-sm">
                <input type="radio" name="conclusion" className="accent-[var(--color-accent)]" checked={conclusion === c} onChange={() => setConclusion(c)} />
                {c === "fit" ? D.fit : D.unfit}
              </label>
            ))}
          </fieldset>
          <button type="submit" className="btn-primary" disabled={!running || !conclusion}>
            {D.protocolSave}
          </button>
        </form>
      )}
    </section>
  );
}
