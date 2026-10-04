import React from 'react';
import { AbsoluteFill } from 'remotion';
import { FONT } from '../theme';
import { PopWords, titleStyle, useBeatHit } from '../anim';

/** Sahna foni: bitta to'yingan rang + ritmga urilib turadigan dumaloq shakllar. */
export const SceneBG: React.FC<{ color: string; circle?: string; children?: React.ReactNode }> = ({ color, circle, children }) => {
  const hit = useBeatHit();
  return (
    <AbsoluteFill style={{ background: color, fontFamily: FONT, overflow: 'hidden' }}>
      {circle && (
        <>
          <div style={{ position: 'absolute', left: -260, top: 1000, width: 900, height: 900, borderRadius: '50%', background: circle, opacity: 0.55, transform: `scale(${1 + hit * 0.035})` }} />
          <div style={{ position: 'absolute', right: -300, top: -240, width: 820, height: 820, borderRadius: '50%', background: circle, opacity: 0.4, transform: `scale(${1 + hit * 0.025})` }} />
        </>
      )}
      {children}
    </AbsoluteFill>
  );
};

/** Ikki qatorli yirik sarlavha (1-qator asosiy, 2-qator ta'kidli). Xavfsiz maydon: TikTok yon va past paneli uchun joy qoldirilgan. */
export const TitleBlock: React.FC<{ line1: string; line2: string; c1: string; c2: string; size1?: number; size2?: number; top?: number; delay?: number }> = ({
  line1, line2, c1, c2, size1 = 124, size2 = 92, top = 120, delay = 0,
}) => (
  <div style={{ position: 'absolute', left: 70, right: 70, top, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
    <PopWords text={line1} delay={delay} style={titleStyle(size1, c1)} />
    <PopWords text={line2} delay={delay + 14} stagger={3} style={titleStyle(size2, c2)} />
  </div>
);

/** Stiker (qiyshaygan, qalin hoshiyali yorliq). */
export const Sticker: React.FC<{ children: React.ReactNode; bg: string; color: string; rotate?: number; size?: number; style?: React.CSSProperties; round?: boolean }> = ({
  children, bg, color, rotate = -6, size = 64, style, round,
}) => (
  <div style={{ position: 'absolute', background: bg, color, fontFamily: FONT, fontWeight: 800, fontSize: size, letterSpacing: '-0.03em', lineHeight: 1.05, padding: round ? 0 : '22px 40px', borderRadius: round ? '50%' : 48,
    transform: `rotate(${rotate}deg)`, boxShadow: '0 24px 50px rgba(23,23,28,0.3)', display: 'grid', placeItems: 'center', textAlign: 'center', ...style }}>
    {children}
  </div>
);
