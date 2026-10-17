"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MODE_RULES } from "../data/rules";
import { uz } from "../i18n/uz";
import { useSession, type Feedback } from "../store/session";
import { useSettings } from "../store/settings";
import { codeText } from "./text";
import { useDerived } from "./useDerived";

const F = uz.feedback;

export function FeedbackCard({ fb, compact = false, onClose }: { fb: Feedback; compact?: boolean; onClose?: () => void }) {
  const { ctx } = useDerived();
  if (!ctx) return null;
  const step = ctx.scenario.steps.find((s) => s.id === fb.stepId);
  const bad = fb.severity === "violation" || fb.severity === "critical";
  const isVerify = fb.action.type === "verifyDead" && fb.code === "ok";
  const t = codeText(isVerify ? "verifiedDead" : fb.code, fb.params);
  const points = fb.penalties.reduce((a, p) => a + p.points, 0);
  const missing = (fb.missingBefore ?? []).map((id) => ctx.scenario.steps.find((s) => s.id === id)?.label ?? id);
  const tone = bad ? "border-danger/60 bg-danger/10" : fb.severity === "info" ? "border-warn/50 bg-warn/10" : "border-ok/50 bg-ok/10";
  const head = bad ? (fb.blocked ? F.blocked : F.wrong) : fb.severity === "info" ? F.info : step ? F.correct : F.applied;

  return (
    <div className={`rounded-xl border p-3 text-sm shadow-lg backdrop-blur ${tone}`} role={bad ? "alert" : "status"}>
      <div className="flex items-start justify-between gap-2">
        <p className={`font-bold ${bad ? "text-danger" : fb.severity === "info" ? "text-warn" : "text-ok"}`}>
          {bad ? "✗" : fb.severity === "info" ? "ⓘ" : "✓"} {head}
          {points > 0 && (
            <span className="ml-2 font-mono text-xs text-danger">
              −{points} {F.points}
            </span>
          )}
        </p>
        {onClose && (
          <button type="button" className="text-muted hover:text-text" onClick={onClose} aria-label={uz.common.close}>
            ✕
          </button>
        )}
      </div>
      {(bad || fb.severity === "info" || isVerify) && <p className="mt-1 font-semibold">{t.title}</p>}
      {!bad && step && !compact && <p className="mt-1 text-muted">{step.explain}</p>}
      {bad && t.why && (
        <p className="mt-1">
          <b>{F.why}:</b> {t.why}
        </p>
      )}
      {fb.severity === "info" && t.why && <p className="mt-1 text-muted">{t.why}</p>}
      {bad && !compact && t.consequence && (
        <p className="mt-1">
          <b>{F.consequence}:</b> {t.consequence}
        </p>
      )}
      {bad && missing.length > 0 && (
        <div className="mt-1">
          <b>{F.shouldBefore}:</b>
          <ul className="ml-4 list-disc">
            {missing.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}
      {bad && !compact && t.correct && (
        <p className="mt-1 text-ok">
          <b>{F.correctWay}:</b> {t.correct}
        </p>
      )}
    </div>
  );
}

/**
 * Oxirgi amal natijasi (o'qitish va sinov rejimlarida). overlay — sxema ustida (mobil),
 * inline — yon panel tepasida (kompyuter). To'g'ri amal haqidagi karta 6 soniyadan keyin yopiladi.
 */
export default function FeedbackStack({ variant }: { variant: "overlay" | "inline" }) {
  const { ctx } = useDerived();
  const feedback = useSession((s) => s.feedback);
  const dismissed = useSession((s) => s.dismissed);
  const dismiss = useSession((s) => s.dismissFeedback);
  const animations = useSettings((s) => s.animations);
  const rules = ctx ? MODE_RULES[ctx.mode] : null;
  // Faqat eng oxirgi xabar; u yopilsa — hech narsa (eskisi qaytib chiqmaydi)
  const last = rules ? feedback.filter((f) => rules.explainImmediately || f.severity === "info").at(-1) : undefined;
  const latest = last && !dismissed.includes(last.id) ? last : undefined;
  const autoClose = latest && (latest.severity === "ok" || latest.severity === "info") ? latest.id : null;

  useEffect(() => {
    if (autoClose === null) return;
    const t = window.setTimeout(() => dismiss(autoClose), 6000);
    return () => window.clearTimeout(t);
  }, [autoClose, dismiss]);

  if (!rules) return null;
  const wrap =
    variant === "overlay"
      ? "pointer-events-none absolute inset-x-2 bottom-2 z-10 flex flex-col gap-2 lg:hidden"
      : "hidden lg:block";
  return (
    <div className={wrap} aria-live="polite">
      <AnimatePresence initial={false} mode="popLayout">
        {latest && (
          <motion.div
            key={latest.id}
            className="pointer-events-auto w-full"
            initial={animations ? { opacity: 0, y: 12 } : false}
            animate={{ opacity: 1, y: 0 }}
            exit={animations ? { opacity: 0 } : undefined}
          >
            <FeedbackCard fb={latest} compact={variant === "overlay" || rules.hints === "limited"} onClose={() => dismiss(latest.id)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
