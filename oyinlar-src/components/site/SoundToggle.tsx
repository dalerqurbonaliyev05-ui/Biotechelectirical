"use client";
import { MUTE_KEY, setMuted, sfx } from "@/lib/games/audio";
import { useStored } from "@/lib/games/storage";
import { useT } from "@/lib/i18n";

export default function SoundToggle({ className }: { className?: string }) {
  const t = useT();
  const muted = useStored<boolean>(MUTE_KEY, false);
  return (
    <button
      type="button"
      className={className}
      aria-pressed={!muted}
      aria-label={muted ? t("sound.turnOn") : t("sound.turnOff")}
      title={muted ? t("sound.turnOn") : t("sound.turnOff")}
      onClick={() => {
        setMuted(!muted);
        if (muted) setTimeout(() => sfx.doira(true), 30);
      }}
    >
      <span aria-hidden="true">{muted ? "🔇" : "🔊"}</span>
    </button>
  );
}
