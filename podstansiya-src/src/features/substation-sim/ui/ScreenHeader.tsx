import Link from "next/link";
import Icon from "./Icon";
import { uz } from "../i18n/uz";

export default function ScreenHeader({ title, subtitle, backHref = "/" }: { title: string; subtitle?: string; backHref?: string }) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <Link href={backHref} className="btn-ghost shrink-0 px-3" aria-label={uz.common.back}>
        <Icon name="back" />
      </Link>
      <div className="min-w-0">
        <h1 className="h-display text-xl font-bold sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
    </div>
  );
}
