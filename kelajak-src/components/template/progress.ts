"use client";
// Loyiha bo'yicha talaba progressi: bajarilgan qadamlar va quiz javoblari localStorage da (try/catch bilan, lib/storage).
// XP shu holatdan hisoblanadi, shuning uchun qayta urinish bilan XP "yig'ib" bo'lmaydi.
import { useMemo } from "react";
import type { Project } from "@/content/future/types";
import { useRawStored, writeRaw } from "@/lib/storage";

export const XP = { step: 50, quiz: 10, final: 20 } as const;

export interface ProgressState {
  done: string[];
  /** `${stepId}:${questionId}` yoki `final:${questionId}` → tanlangan variant */
  answers: Record<string, number>;
}

const EMPTY: ProgressState = { done: [], answers: {} };

function parse(raw: string): ProgressState {
  try {
    const v = JSON.parse(raw) as Partial<ProgressState>;
    return {
      done: Array.isArray(v.done) ? v.done.filter((x): x is string => typeof x === "string") : [],
      answers: v.answers && typeof v.answers === "object" ? (v.answers as Record<string, number>) : {},
    };
  } catch {
    return EMPTY;
  }
}

export function useProgress(project: Project) {
  const key = `kelajak:${project.slug}:v1`;
  const raw = useRawStored(key, "{}");
  const state = useMemo(() => parse(raw), [raw]);

  const save = (next: ProgressState) => writeRaw(key, JSON.stringify(next));

  const correctOf = (qid: string): number | undefined => {
    if (qid.startsWith("final:")) return project.finalQuiz.find((q) => `final:${q.id}` === qid)?.correct;
    const [sid, id] = qid.split(":");
    return project.steps.find((s) => s.id === sid)?.quiz.find((q) => q.id === id)?.correct;
  };

  let xp = 0;
  let maxXp = 0;
  for (const s of project.steps) {
    maxXp += XP.step + s.quiz.length * XP.quiz;
    if (state.done.includes(s.id)) xp += XP.step;
    for (const q of s.quiz) if (state.answers[`${s.id}:${q.id}`] === q.correct) xp += XP.quiz;
  }
  let finalCorrect = 0;
  for (const q of project.finalQuiz) {
    maxXp += XP.final;
    if (state.answers[`final:${q.id}`] === q.correct) {
      xp += XP.final;
      finalCorrect++;
    }
  }
  const finalAnswered = project.finalQuiz.filter((q) => state.answers[`final:${q.id}`] !== undefined).length;

  return {
    state,
    xp,
    maxXp,
    finalCorrect,
    finalAnswered,
    isDone: (id: string) => state.done.includes(id),
    toggleDone: (id: string) =>
      save({ ...state, done: state.done.includes(id) ? state.done.filter((x) => x !== id) : [...state.done, id] }),
    answer: (qid: string, choice: number) => save({ ...state, answers: { ...state.answers, [qid]: choice } }),
    clearAnswer: (qid: string) => {
      const answers = { ...state.answers };
      delete answers[qid];
      save({ ...state, answers });
    },
    isCorrect: (qid: string) => state.answers[qid] !== undefined && state.answers[qid] === correctOf(qid),
    reset: () => save(EMPTY),
  };
}

export type Progress = ReturnType<typeof useProgress>;
