"use client";
import { useId, type ReactNode } from "react";

export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  const id = useId();
  return (
    <div className="ft-ctl">
      <label htmlFor={id}>
        <span>{label}</span>
        <output htmlFor={id}>{format ? format(value) : value}</output>
      </label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

export function Seg<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="ft-ctl">
      <span className="ft-ctl-label">{label}</span>
      <div className="ft-seg" role="group" aria-label={label}>
        {options.map((o) => (
          <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Readout({ label, value, accent, wide }: { label: string; value: ReactNode; accent?: boolean; wide?: boolean }) {
  return (
    <div className={`ft-read${accent ? " accent" : ""}${wide ? " wide" : ""}`}>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

/** Kanvas paneli + boshqaruv paneli: har bir tajriba shu ikki bo'lakni qaytaradi. */
export function Panels({ canvas, controls }: { canvas: ReactNode; controls: ReactNode }) {
  return (
    <>
      <div className="ft-panel">{canvas}</div>
      <div className="ft-panel">{controls}</div>
    </>
  );
}
