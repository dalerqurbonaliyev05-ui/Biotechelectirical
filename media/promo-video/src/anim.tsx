import React, { createContext, useContext } from 'react';
import { Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT, VideoProps } from './theme';

export const PropsCtx = createContext<VideoProps | null>(null);
export const useP = (): VideoProps => {
  const p = useContext(PropsCtx);
  if (!p) throw new Error('PropsCtx yo\'q');
  return p;
};

/** Musiqa ritmi: bir "beat" necha kadr (120 BPM @30fps = 15 kadr). */
export const useBeat = () => {
  const { bpm } = useP();
  const { fps } = useVideoConfig();
  return (fps * 60) / bpm;
};

export const ease = Easing.bezier(0.22, 1, 0.36, 1);
export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** [a,b] oralig'ida 0..1 (yumshoq tezlanish bilan). */
export const prog = (frame: number, a: number, b: number) => interpolate(frame, [a, b], [0, 1], { ...clamp, easing: ease });

/** "Pop" sakrash: 0 dan 1 gacha oshib o'tib (bounce) yetadi. */
export const usePop = (delay = 0, damping = 11, stiffness = 210) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, mass: 0.7, stiffness } });
};

/** Beat'ga mos urg'u: har beat boshida 1 dan tushadi (0..1). */
export const useBeatHit = (offset = 0) => {
  const frame = useCurrentFrame();
  const beat = useBeat();
  const t = (((frame - offset) % beat) + beat) % beat;
  return Math.max(0, 1 - t / (beat * 0.6));
};

export const Pop: React.FC<{ delay?: number; from?: number; y?: number; children: React.ReactNode; style?: React.CSSProperties; damping?: number }> = ({
  delay = 0, from = 0.3, y = 50, children, style, damping = 11,
}) => {
  const s = usePop(delay, damping);
  return (
    <div style={{ transform: `translateY(${(1 - s) * y}px) scale(${interpolate(s, [0, 1], [from, 1])})`, opacity: Math.min(1, s * 3), transformOrigin: '50% 60%', ...style }}>
      {children}
    </div>
  );
};

/** Matn so'zma-so'z "pop" bo'lib chiqadi. */
export const PopWords: React.FC<{ text: string; delay?: number; stagger?: number; style?: React.CSSProperties; color?: string }> = ({ text, delay = 0, stagger = 4, style, color }) => {
  const words = text.split(' ');
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: '0.28em', ...style }}>
      {words.map((w, i) => (
        <Pop key={i} delay={delay + i * stagger} from={0.2} y={60} style={{ display: 'inline-block', color }}>{w}</Pop>
      ))}
    </div>
  );
};

/** Katta sarlavha uslubi (Uzum Tezkor / Yandex Eats: yirik, qalin, siqiq). */
export const titleStyle = (size = 128, color = '#17171c'): React.CSSProperties => ({
  fontFamily: FONT, fontWeight: 800, fontSize: size, lineHeight: 0.98, letterSpacing: '-0.035em', color, textAlign: 'center',
});

/** Sahna ochilishi: oldingi sahna ustidan doira ("iris") kengayib chiqadi. */
export const IrisIn: React.FC<{ children: React.ReactNode; x?: number; y?: number; frames?: number }> = ({ children, x = 50, y = 62, frames = 12 }) => {
  const frame = useCurrentFrame();
  const r = interpolate(frame, [0, frames], [0, 150], { ...clamp, easing: Easing.bezier(0.5, 0, 0.2, 1) });
  return <div style={{ position: 'absolute', inset: 0, clipPath: `circle(${r}% at ${x}% ${y}%)` }}>{children}</div>;
};

/** Deterministik konfetti portlashi. */
export const Confetti: React.FC<{ start: number; x: number; y: number; count?: number; colors?: string[]; spread?: number; seed?: string }> = ({
  start, x, y, count = 36, colors = ['#ff6a13', '#ffb020', '#2fd6a3', '#22c7ff', '#ff5c8a', '#ffffff'], spread = 700, seed = 'c',
}) => {
  const frame = useCurrentFrame();
  const t = frame - start;
  if (t < 0 || t > 60) return null;
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const ang = random(`${seed}a${i}`) * Math.PI * 2;
        const sp = (0.35 + random(`${seed}s${i}`) * 0.65) * spread;
        const life = t / 40;
        const px = x + Math.cos(ang) * sp * (1 - Math.pow(1 - Math.min(1, life), 3));
        const py = y + Math.sin(ang) * sp * (1 - Math.pow(1 - Math.min(1, life), 3)) + 520 * life * life;
        const size = 14 + random(`${seed}z${i}`) * 22;
        const rot = random(`${seed}r${i}`) * 720 * life;
        const round = random(`${seed}q${i}`) > 0.5;
        return (
          <div key={i} style={{ position: 'absolute', left: px, top: py, width: size, height: round ? size : size * 0.5, borderRadius: round ? '50%' : 4,
            background: colors[i % colors.length], transform: `rotate(${rot}deg)`, opacity: Math.max(0, 1 - Math.max(0, t - 36) / 24) }} />
        );
      })}
    </>
  );
};
