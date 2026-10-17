"use client";

// O'yin ovozlari: amal natijasi, yangi signal, stsenariy yakuni (session holatiga obuna).

import { useEffect } from "react";
import { playSound } from "../lib/sound";
import { useSession } from "../store/session";

export default function SoundEffects() {
  useEffect(
    () =>
      useSession.subscribe((s, prev) => {
        const fb = s.feedback.at(-1);
        if (fb && fb !== prev.feedback.at(-1)) {
          if (fb.severity === "critical") playSound("critical");
          else if (fb.severity === "violation") playSound("error");
          else if (fb.applied && fb.action.type === "switch") playSound("switch");
          else if (fb.stepId) playSound("ok");
        }
        const active = (x: typeof s) => x.sim?.alarms.filter((a) => a.active).length ?? 0;
        if (s.sim && prev.sim && active(s) > active(prev)) playSound("alarm");
        if (s.sim?.status !== prev.sim?.status && prev.sim?.status === "running" && s.ctx === prev.ctx) {
          playSound(s.sim?.status === "failed" ? "fail" : "success");
        }
      }),
    [],
  );
  return null;
}
