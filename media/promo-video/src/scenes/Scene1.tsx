import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { FONT } from '../theme';
import { Pop, PopWords, prog, titleStyle, useBeatHit, useP, usePop } from '../anim';
import { SceneBG } from '../components/Layout';
import { AppIcon, Bowl } from '../components/Food';

/** 0–3 soniya: katta brend nomi va slogan. */
export const Scene1: React.FC = () => {
  const p = useP();
  const frame = useCurrentFrame();
  const hit = useBeatHit();
  const bowl = usePop(2, 10, 150);
  const sticker = usePop(34, 9);
  const orbit = ['🥟', '🍲', '🥣', '🌯'];
  return (
    <SceneBG color={p.accent}>
      {/* ritmga urilib turuvchi konsentrik doiralar */}
      {[1500, 1100, 720].map((d, i) => (
        <div key={d} style={{ position: 'absolute', left: 540 - d / 2, top: 800 - d / 2, width: d, height: d, borderRadius: '50%', background: i % 2 === 0 ? p.accentDark : '#ff8a3d', opacity: 0.55,
          transform: `scale(${interpolate(prog(frame, i * 3, 18 + i * 3), [0, 1], [0.2, 1]) * (1 + hit * 0.02 * (i + 1))})` }} />
      ))}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 150, display: 'grid', placeItems: 'center' }}>
        <Pop delay={4} from={0.2}><AppIcon size={170} /></Pop>
      </div>
      <div style={{ position: 'absolute', left: 140, top: 430, transform: `translateY(${(1 - bowl) * 900}px) scale(${0.85 + bowl * 0.15})` }}>
        <Bowl size={800} />
      </div>
      {orbit.map((e, i) => {
        const s = usePop(16 + i * 5, 8);
        const a = (i / orbit.length) * Math.PI * 2 + frame / 40;
        return <div key={i} style={{ position: 'absolute', left: 540 + Math.cos(a) * 430 - 60, top: 800 + Math.sin(a) * 250 - 60, fontSize: 120, transform: `scale(${s})`, opacity: s }}>{e}</div>;
      })}
      <div style={{ position: 'absolute', left: 40, right: 40, top: 1190 }}>
        <PopWords text={p.brandName} delay={12} style={{ ...titleStyle(210, '#fff'), textShadow: '0 12px 0 rgba(23,23,28,0.18)' }} />
      </div>
      <AbsoluteFill style={{ pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 1460, display: 'grid', placeItems: 'center' }}>
          <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 104, letterSpacing: '-0.035em', color: '#fff', background: p.ink, padding: '14px 54px 24px', borderRadius: 60,
            transform: `rotate(-3deg) scale(${sticker * (1 + hit * 0.03)})`, opacity: sticker, boxShadow: '0 22px 44px rgba(23,23,28,0.35)' }}>{p.slogan}</div>
        </div>
      </AbsoluteFill>
    </SceneBG>
  );
};
