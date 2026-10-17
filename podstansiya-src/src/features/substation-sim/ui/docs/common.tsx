import { TOPOLOGY } from "../../data/equipment";
import { usePrint, type PrintDoc } from "../../store/print";
import { uz } from "../../i18n/uz";

export const field =
  "w-full rounded-lg border border-line bg-ink-900 px-3 py-2 text-sm text-text placeholder:text-muted/60 focus:border-accent";

/** Uskuna yoki tugunning o'qiladigan nomi. */
export function itemLabel(id: string): string {
  return TOPOLOGY.nodes.find((n) => n.id === id)?.label ?? id;
}

export function PrintButton({ doc }: { doc: PrintDoc }) {
  const print = usePrint((s) => s.print);
  return (
    <button type="button" className="btn-ghost px-2.5 py-1 text-xs" onClick={() => print(doc)}>
      🖨 {uz.docs.print}
    </button>
  );
}

export function CheckList({
  legend,
  options,
  value,
  onChange,
  render = itemLabel,
}: {
  legend: string;
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  render?: (id: string) => string;
}) {
  return (
    <fieldset className="rounded-lg border border-line/60 p-2">
      <legend className="px-1 text-xs text-muted">{legend}</legend>
      <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
        {options.map((o) => (
          <label key={o} className="flex items-center gap-2 py-0.5 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--color-accent)]"
              checked={value.includes(o)}
              onChange={() => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o])}
            />
            <span className="font-mono text-xs">{render(o)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
