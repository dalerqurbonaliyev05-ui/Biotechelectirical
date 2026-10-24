"use client";
// Umumiy loyiha sahifasi shabloni: hero → progress chizig'i → 7 qadam → demo model → yakuniy quiz va nishon.
// Kontent `project` (content/future/*.ts) dan, qadam vizual/simulyatorlari esa registry'dan (lazy) olinadi.
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { REGISTRY } from "@/components/projects/registry";
import type { Project, ProjectCard, Step } from "@/content/future/types";
import { MAIN_SITE_HREF } from "@/lib/seo";
import { Danger, FormulaList, LazyMount, Mistakes, PartsList, Quiz, Replayable } from "./blocks";
import { useProgress, XP, type Progress } from "./progress";

export default function ProjectView({ project, next }: { project: Project; next?: ProjectCard }) {
  const progress = useProgress(project);
  const reg = REGISTRY[project.slug];
  const [active, setActive] = useState(0);

  // Hozir qaysi qadam ekran markazida — progress chizig'ida belgilash uchun.
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-step-index]"));
    if (!els.length || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.stepIndex));
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Sahifa ichidagi "#..." havolalar: bir zumda sakraymiz va lazy bloklar yuklanib balandlik o'zgarsa,
  // nishonni yana joyiga keltiramiz (silliq skrolda yo'ldagi qadamlar yuklanib, manzil siljib ketardi).
  const settle = useRef(0);
  const onAnchorClick = (e: MouseEvent<HTMLDivElement>) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
    const id = a?.getAttribute("href")?.slice(1);
    const el = id ? document.getElementById(id) : null;
    if (!el || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    history.replaceState(null, "", `#${id}`);
    window.clearTimeout(settle.current);
    el.scrollIntoView({ block: "start", behavior: "instant" });
    const want = el.getBoundingClientRect().top;
    let n = 0;
    const tick = () => {
      if (Math.abs(el.getBoundingClientRect().top - want) > 4) el.scrollIntoView({ block: "start", behavior: "instant" });
      if (++n < 12) settle.current = window.setTimeout(tick, 150);
    };
    settle.current = window.setTimeout(tick, 150);
  };
  useEffect(() => () => window.clearTimeout(settle.current), []);

  const style = { "--accent": project.accent, "--accent-ink": project.accentInk } as CSSProperties;
  const doneCount = project.steps.filter((s) => progress.isDone(s.id)).length;
  const firstOpen = project.steps.findIndex((s) => !progress.isDone(s.id));
  const HeroVisual = reg?.Hero;

  return (
    <div className="kl-project" style={style} onClick={onAnchorClick}>
      <section className="kl-hero">
        <div className="kl-wrap kl-hero-in">
          <div className="kl-hero-text">
            <nav className="kl-crumbs" aria-label="Yo‘l">
              <a href={`${MAIN_SITE_HREF}#projects`}>Bosh sahifa</a> <span aria-hidden="true">/</span> <Link href="/">Kelajak loyihalari</Link>
            </nav>
            <h1>{project.title}</h1>
            <p className="kl-promise">{project.promise}</p>
            <ul className="kl-chips">
              <li>
                <span aria-hidden="true">◆</span> Daraja: {project.level}
              </li>
              <li>
                <span aria-hidden="true">⏱</span> ~{project.minutes} daqiqa
              </li>
              <li>
                <span aria-hidden="true">▣</span> {project.steps.length} qadam
              </li>
              <li>
                <span aria-hidden="true">★</span> {progress.maxXp} XP
              </li>
            </ul>
            <div className="kl-hero-cta">
              <a className="kl-btn kl-btn-primary" href={`#qadam-${firstOpen < 0 ? 1 : firstOpen + 1}`}>
                {doneCount === 0 ? "Boshlash" : firstOpen < 0 ? "Qaytadan ko‘rish" : `Davom ettirish: ${firstOpen + 1}-qadam`}
              </a>
              <a className="kl-btn kl-btn-ghost" href="#demo">
                Demo model
              </a>
            </div>
          </div>
          <div className="kl-hero-visual">{HeroVisual ? <HeroVisual /> : null}</div>
        </div>
      </section>

      <ProgressRail project={project} progress={progress} active={active} />

      <div className="kl-wrap kl-body">
        <Danger title={project.danger.title}>
          <ul>
            {project.danger.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </Danger>
        {project.modelNote ? (
          <p className="kl-model-note">
            <span className="kl-tag">O‘quv model</span> {project.modelNote}
          </p>
        ) : null}

        {project.steps.map((s, k) => (
          <StepSection key={s.id} step={s} index={k} total={project.steps.length} slug={project.slug} progress={progress} />
        ))}

        <section id="demo" className="kl-demo">
          <h2>{project.demo.title}</h2>
          <p>{project.demo.intro}</p>
          <div className="kl-grid2">
            <div className="kl-block">
              <h3>Komponentlar</h3>
              <PartsList parts={project.demo.parts} />
            </div>
            <div className="kl-block">
              <h3>Yig‘ish tartibi</h3>
              <ol className="kl-demo-steps">
                {project.demo.steps.map((s, k) => (
                  <li key={k}>{s}</li>
                ))}
              </ol>
            </div>
          </div>
          <Danger title="Xavfsizlik">
            <p>{project.demo.safety}</p>
          </Danger>
        </section>

        <FinalSection project={project} progress={progress} next={next} />
      </div>
    </div>
  );
}

function ProgressRail({ project, progress, active }: { project: Project; progress: Progress; active: number }) {
  const pct = progress.maxXp ? Math.round((progress.xp / progress.maxXp) * 100) : 0;
  const list = useRef<HTMLOListElement>(null);
  // Telefonda faol qadam tugmasi ko'rinib tursin: ro'yxatni gorizontal suramiz (sahifa vertikal surilmaydi).
  useEffect(() => {
    const ol = list.current;
    const item = ol?.children[active] as HTMLElement | undefined;
    if (!ol || !item || ol.scrollWidth <= ol.clientWidth) return;
    ol.scrollTo({ left: item.offsetLeft - ol.clientWidth / 2 + item.offsetWidth / 2, behavior: "smooth" });
  }, [active]);
  return (
    <nav className="kl-rail" aria-label="Qadamlar">
      <div className="kl-wrap kl-rail-in">
        <ol ref={list}>
          {project.steps.map((s, k) => {
            const done = progress.isDone(s.id);
            return (
              <li key={s.id}>
                <a href={`#qadam-${k + 1}`} className={`${done ? "done" : ""}${k === active ? " active" : ""}`} aria-current={k === active ? "step" : undefined} title={s.title}>
                  <span>{done ? "✓" : k + 1}</span>
                  <em>{s.title.split(":")[0]}</em>
                </a>
              </li>
            );
          })}
        </ol>
        <div className="kl-xp" aria-label={`Tajriba: ${progress.xp} / ${progress.maxXp} XP`}>
          <b>{progress.xp}</b>
          <small>/ {progress.maxXp} XP</small>
          <div className="kl-xp-track" aria-hidden="true">
            <i style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </nav>
  );
}

function StepSection({ step, index, total, slug, progress }: { step: Step; index: number; total: number; slug: string; progress: Progress }) {
  const n = index + 1;
  const comp = REGISTRY[slug]?.steps[step.id];
  const done = progress.isDone(step.id);
  return (
    <section id={`qadam-${n}`} className={`kl-step${done ? " is-done" : ""}`} data-step-index={index} aria-labelledby={`qadam-${n}-t`}>
      <header className="kl-step-head">
        <span className="kl-step-no" aria-hidden="true">
          {String(n).padStart(2, "0")}
        </span>
        <div>
          <small>
            {n}-qadam / {total}
          </small>
          <h2 id={`qadam-${n}-t`}>{step.title}</h2>
        </div>
      </header>

      <div className="kl-block kl-what">
        <h3>Nima qilamiz?</h3>
        <p>{step.what}</p>
      </div>

      {step.danger ? (
        <Danger title="Diqqat">
          <p>{step.danger}</p>
        </Danger>
      ) : null}

      {comp?.Visual ? <Replayable Visual={comp.Visual} caption={step.visualCaption} /> : null}

      {comp?.Sim ? (
        <div className="kl-block kl-sim">
          <h3>Laboratoriya: o‘zingiz sinab ko‘ring</h3>
          {step.simTask ? (
            <p className="kl-task">
              <span aria-hidden="true">🎯</span> {step.simTask}
            </p>
          ) : null}
          <LazyMount minHeight={420}>
            <comp.Sim />
          </LazyMount>
        </div>
      ) : null}

      <div className="kl-grid2">
        <div className="kl-block">
          <h3>Asosiy formulalar</h3>
          <FormulaList formulas={step.formulas} />
        </div>
        <div className="kl-block">
          <h3>Kerakli komponentlar</h3>
          <PartsList parts={step.parts} />
        </div>
      </div>

      <div className="kl-block kl-pitfalls">
        <h3>Bu yerda nima xato ketishi mumkin</h3>
        <Mistakes items={step.mistakes} />
      </div>

      <div className="kl-block">
        <h3>Mini-quiz</h3>
        <Quiz questions={step.quiz} prefix={step.id} progress={progress} xp={XP.quiz} />
      </div>

      <div className="kl-step-foot">
        <button type="button" className={`kl-btn ${done ? "kl-btn-done" : "kl-btn-primary"}`} aria-pressed={done} onClick={() => progress.toggleDone(step.id)}>
          {done ? "✓ Qadam bajarildi" : `Qadamni tugatdim (+${XP.step} XP)`}
        </button>
        <a className="kl-btn kl-btn-ghost" href={n < total ? `#qadam-${n + 1}` : "#demo"}>
          {n < total ? "Keyingi qadam →" : "Demo modelga →"}
        </a>
      </div>
    </section>
  );
}

function FinalSection({ project, progress, next }: { project: Project; progress: Progress; next?: ProjectCard }) {
  const total = project.finalQuiz.length;
  const allSteps = project.steps.every((s) => progress.isDone(s.id));
  const need = Math.ceil(total * 0.6);
  const passed = allSteps && progress.finalCorrect >= need;
  return (
    <section id="yakun" className="kl-final">
      <h2>Yakuniy sinov</h2>
      <p>
        Har bir to‘g‘ri javob +{XP.final} XP. Nishonni olish uchun barcha 7 qadamni tugating va kamida {need} ta savolga to‘g‘ri javob bering.
      </p>
      <LazyMount minHeight={300}>
        <Quiz questions={project.finalQuiz} prefix="final" progress={progress} xp={XP.final} />
      </LazyMount>

      <div className={`kl-badge${passed ? " on" : ""}`} aria-live="polite">
        <div className="kl-badge-medal" aria-hidden="true">
          <span>{project.badge.emoji}</span>
        </div>
        <div>
          <small>{passed ? "Nishon olindi!" : "Nishon hali yopiq"}</small>
          <strong>{project.badge.name}</strong>
          <p>
            {passed
              ? project.badge.text
              : `Qadamlar: ${project.steps.filter((s) => progress.isDone(s.id)).length}/${project.steps.length} · Yakuniy sinov: ${progress.finalCorrect}/${total}`}
          </p>
          <p className="kl-badge-xp">
            {progress.xp} / {progress.maxXp} XP
          </p>
        </div>
      </div>

      <div className="kl-final-cta">
        {next ? (
          next.ready ? (
            <Link className="kl-btn kl-btn-primary" href={`/${next.slug}/`}>
              Keyingi loyiha: {next.title} →
            </Link>
          ) : (
            <Link className="kl-btn kl-btn-primary" href="/">
              Keyingi loyiha: {next.title} (tez orada) →
            </Link>
          )
        ) : null}
        <button
          type="button"
          className="kl-btn kl-btn-ghost"
          onClick={() => {
            if (window.confirm("Bu loyiha bo‘yicha barcha progress (XP, javoblar) o‘chiriladi. Davom etasizmi?")) progress.reset();
          }}
        >
          Progressni tozalash
        </button>
      </div>
    </section>
  );
}
