"use client";

import { useState } from "react";
import { formatClock } from "../../engine/journal";
import { PERMIT_ROLES, type PermitRole } from "../../engine/permit";
import type { PermitForm, PermitPerson, SafetyGroup } from "../../engine/types";
import { uz } from "../../i18n/uz";
import { useSession } from "../../store/session";
import { useDerived } from "../useDerived";
import { CheckList, PrintButton, field } from "./common";

const D = uz.docs;
const GROUPS: SafetyGroup[] = [2, 3, 4, 5];
const ROMAN: Record<SafetyGroup, string> = { 2: "II", 3: "III", 4: "IV", 5: "V" };
const PLACES = ["T-1", "T-2", "W1", "W2", "F35-1", "F35-2"];

function PersonRow({ label, value, onChange, onRemove }: { label: string; value: PermitPerson; onChange: (p: PermitPerson) => void; onRemove?: () => void }) {
  return (
    <div className="grid grid-cols-[1fr_4.5rem_auto] items-end gap-2">
      <label className="text-xs text-muted">
        {label}
        <input className={`${field} mt-1`} value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} placeholder={D.name} />
      </label>
      <label className="text-xs text-muted">
        {D.group}
        <select className={`${field} mt-1 px-2`} value={value.group} onChange={(e) => onChange({ ...value, group: Number(e.target.value) as SafetyGroup })}>
          {GROUPS.map((g) => (
            <option key={g} value={g}>
              {ROMAN[g]}
            </option>
          ))}
        </select>
      </label>
      {onRemove ? (
        <button type="button" className="btn-ghost h-[38px] px-2 text-xs" onClick={onRemove} aria-label={D.remove}>
          ✕
        </button>
      ) : (
        <span />
      )}
    </div>
  );
}

/** Rasmiylashtirilgan naryadning qisqa ko'rinishi (ekranda va chop etishda). */
export function PermitSummary({ permit }: { permit: PermitForm }) {
  const row = (k: string, v: string) => (
    <div className="flex justify-between gap-3 border-b border-line/40 py-1 text-xs last:border-0">
      <span className="text-muted">{k}</span>
      <span className="text-right font-semibold">{v}</span>
    </div>
  );
  return (
    <div>
      {row(D.number, `№ ${permit.number}`)}
      {row(D.workName, permit.workName)}
      {row(D.place, permit.place)}
      {row(`${D.startTime} – ${D.endTime}`, `${permit.startTime} – ${permit.endTime}`)}
      {PERMIT_ROLES.map((r) => row(D.roles[r], `${permit[r].name} (${ROMAN[permit[r].group]} ${D.groupShort})`))}
      {row(D.members, permit.members.map((m) => `${m.name} (${ROMAN[m.group]})`).join(", ") || "—")}
      {row(D.switchedOff, permit.switchedOff.join(", "))}
      {row(D.earthing, permit.earthing.join(", "))}
      {row(D.postersFor, permit.posters.join(", "))}
      {row(D.liveParts, permit.liveParts.join(", "))}
    </div>
  );
}

function emptyForm(workName: string, place: string): PermitForm {
  const p = (): PermitPerson => ({ name: "", group: 3 });
  return {
    number: "",
    workName,
    place,
    startTime: "",
    endTime: "",
    issuer: p(),
    admitter: p(),
    leader: p(),
    producer: p(),
    members: [p()],
    switchedOff: [],
    earthing: [],
    posters: [],
    liveParts: [],
  };
}

export default function PermitPanel() {
  const { ctx, sim } = useDerived();
  const dispatch = useSession((s) => s.dispatch);
  const spec = ctx?.scenario.permit;
  const [form, setForm] = useState<PermitForm>(() => emptyForm(spec?.workName ?? "", spec?.place ?? ""));
  if (!ctx || !sim) return null;
  const running = sim.status === "running";
  const needs = !!spec || !!ctx.scenario.initial?.admitted;
  if (!needs) return <p className="text-sm text-muted">{D.notNeeded}</p>;
  const set = <K extends keyof PermitForm>(k: K, v: PermitForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <section aria-labelledby="permit-h" className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 id="permit-h" className="font-bold">
            {D.permit}
          </h4>
          <p className="text-xs text-muted">{D.permitHint}</p>
        </div>
        {sim.permit && <PrintButton doc="permit" />}
      </div>

      {spec && !sim.permit && (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            dispatch({ type: "permitIssue", permit: { ...form, members: form.members.filter((m) => m.name.trim()) } });
          }}
        >
          <div className="grid grid-cols-[5rem_1fr] gap-2">
            <label className="text-xs text-muted">
              {D.number}
              <input className={`${field} mt-1`} value={form.number} onChange={(e) => set("number", e.target.value)} required />
            </label>
            <label className="text-xs text-muted">
              {D.workName}
              <input className={`${field} mt-1`} value={form.workName} onChange={(e) => set("workName", e.target.value)} required />
            </label>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <label className="text-xs text-muted">
              {D.place}
              <select className={`${field} mt-1 px-2`} value={form.place} onChange={(e) => set("place", e.target.value)}>
                <option value="">—</option>
                {PLACES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-muted">
              {D.startTime}
              <input className={`${field} mt-1`} value={form.startTime} onChange={(e) => set("startTime", e.target.value)} placeholder="09:00" required />
            </label>
            <label className="text-xs text-muted">
              {D.endTime}
              <input className={`${field} mt-1`} value={form.endTime} onChange={(e) => set("endTime", e.target.value)} placeholder="17:00" required />
            </label>
          </div>
          {PERMIT_ROLES.map((r: PermitRole) => (
            <PersonRow key={r} label={D.roles[r]} value={form[r]} onChange={(p) => set(r, p)} />
          ))}
          <fieldset className="flex flex-col gap-2 rounded-lg border border-line/60 p-2">
            <legend className="px-1 text-xs text-muted">{D.members}</legend>
            {form.members.map((m, i) => (
              <PersonRow
                key={i}
                label={`${i + 1}`}
                value={m}
                onChange={(p) => set("members", form.members.map((x, j) => (j === i ? p : x)))}
                onRemove={() => set("members", form.members.filter((_, j) => j !== i))}
              />
            ))}
            <button type="button" className="btn-ghost self-start px-2.5 py-1 text-xs" onClick={() => set("members", [...form.members, { name: "", group: 3 }])}>
              {D.addMember}
            </button>
          </fieldset>
          <CheckList legend={D.switchedOff} options={spec.candidates.switchedOff} value={form.switchedOff} onChange={(v) => set("switchedOff", v)} />
          <CheckList legend={D.earthing} options={spec.candidates.earthing} value={form.earthing} onChange={(v) => set("earthing", v)} />
          <CheckList legend={D.postersFor} options={spec.candidates.posters} value={form.posters} onChange={(v) => set("posters", v)} />
          <CheckList
            legend={D.liveParts}
            options={spec.candidates.liveParts}
            value={form.liveParts}
            onChange={(v) => set("liveParts", v)}
          />
          <button type="submit" className="btn-primary" disabled={!running}>
            {D.issue}
          </button>
        </form>
      )}

      {sim.permit && (
        <div className="rounded-xl border border-ok/40 bg-ok/5 p-3">
          <p className="mb-2 text-sm font-semibold text-ok">✓ {D.issued}</p>
          <PermitSummary permit={sim.permit} />
        </div>
      )}

      <div className="flex flex-col gap-2">
        {!sim.admitted && !sim.workFinished && spec && (
          <button type="button" className="btn-ghost" disabled={!running} onClick={() => dispatch({ type: "admit" })}>
            {D.admit}
          </button>
        )}
        {sim.admitted && <p className="rounded-lg bg-warn/10 p-2 text-sm text-warn">👷 {D.admitted}</p>}
        {sim.admitted && (
          <button type="button" className="btn-ghost" disabled={!running} onClick={() => dispatch({ type: "finishWork" })}>
            {D.finishWork}
          </button>
        )}
        {sim.workFinished && <p className="text-sm text-muted">✓ {D.workFinished}</p>}
      </div>

      {sim.permitLog.length > 0 && (
        <div>
          <h5 className="text-xs font-semibold text-muted">{D.log}</h5>
          <ul className="mt-1 text-xs">
            {sim.permitLog.map((l, i) => (
              <li key={i}>
                <span className="font-mono text-accent">{formatClock(l.t)}</span> — {l.kind === "admit" ? D.logAdmit : D.logFinish}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
