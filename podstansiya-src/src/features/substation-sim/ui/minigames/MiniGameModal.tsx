"use client";

import { uz } from "../../i18n/uz";
import { useAchievements } from "../../store/achievements";
import Modal from "../Modal";
import type { MiniGameResult } from "./common";
import { MINI_GAMES, type MiniGameKind } from "./index";

/** Mini-o'yin oynasi: o'yinni kechiktirib yuklaydi; "o'tkazib yuborish" — natijani darhol olish. */
export default function MiniGameModal({
  kind,
  title,
  props,
  onDone,
  onClose,
  allowSkip = true,
}: {
  kind: MiniGameKind;
  title?: string;
  props?: Record<string, unknown>;
  onDone: (r: MiniGameResult) => void;
  onClose: () => void;
  allowSkip?: boolean;
}) {
  const Game = MINI_GAMES[kind];
  return (
    <Modal title={title ?? uz.mini.games[kind].title} onClose={onClose}>
      <Game
        {...props}
        onDone={(r: MiniGameResult) => {
          if (r.score !== null) useAchievements.getState().report({ type: "minigame", kind, score: r.score });
          onDone(r);
        }}
      />
      {allowSkip && (
        <button type="button" className="mt-4 text-xs text-muted underline hover:text-text" onClick={() => onDone({ score: null })}>
          {uz.mini.skip}
        </button>
      )}
    </Modal>
  );
}
