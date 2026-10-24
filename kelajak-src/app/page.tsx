import Link from "next/link";
import type { CSSProperties } from "react";
import { CARDS } from "@/content/future";
import { meta } from "@/lib/seo";

export const metadata = meta(
  "/",
  "Kelajak loyihalari",
  "Uchta kelajak loyihasi: aqlli hisoblagich, simsiz elektr energiya uzatish va vodorod motori — har biri 7 qadamda, animatsiya va simulyator bilan.",
);

export default function Home() {
  return (
    <div className="kl-wrap kl-index">
      <header className="kl-index-head">
        <span className="kl-tag">Laboratoriya</span>
        <h1>Kelajak loyihalari</h1>
        <p>Har bir loyiha 7 qadamda: animatsiyali sxema, o‘zingiz boshqaradigan simulyator, formulalar, real xatolar va mini-quiz. Qadamlarni tugatib XP va nishon yig‘ing.</p>
      </header>
      <ol className="kl-cards">
        {CARDS.map((c, k) => (
          <li key={c.slug} className={`kl-card${c.ready ? "" : " soon"}`} style={{ "--accent": c.accent } as CSSProperties}>
            <span className="kl-card-no">{String(k + 1).padStart(2, "0")}</span>
            <h2>{c.title}</h2>
            <p>{c.short}</p>
            {c.ready ? (
              <Link className="kl-btn kl-btn-primary" href={`/${c.slug}/`}>
                O‘rganishni boshlash →
              </Link>
            ) : (
              <span className="kl-soon">Tez orada</span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
