import React from 'react';
import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig } from 'remotion';
import { Confetti, usePop, useP, useBeatHit } from '../anim';
import { Phone } from '../components/Phone';
import { Sticker, SceneBG, TitleBlock } from '../components/Layout';
import { BuyerReview } from '../components/ui';
import { LoveFace } from '../components/Food';

/** 24–28 soniya: yetkazildi, 5 yulduzli baho, qoniqish. */
export const Scene6: React.FC = () => {
  const p = useP();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = usePop(3, 13, 120);
  const hit = useBeatHit();
  const marks = [26, 33, 40, 47, 54];
  const stars = marks.filter((m) => f >= m).length;
  const last = stars > 0 ? marks[stars - 1] : 0;
  const pop = stars > 0 ? Math.max(0, 1 - spring({ frame: f - last, fps, config: { damping: 8, stiffness: 240 } })) + 0 : 0;
  const love = usePop(58, 6, 170);
  return (
    <SceneBG color="#ffb020" circle="#ffc84d">
      <TitleBlock line1={p.ratingTitle1} line2={p.ratingTitle2} c1={p.ink} c2="#fff" size1={150} size2={104} />
      <div style={{ position: 'absolute', left: 220, top: 590, transform: `translateY(${(1 - enter) * 1300}px) scale(${1 + hit * 0.006})`, transformOrigin: '50% 100%' }}>
        <Phone width={640} screenshot={p.screens.buyerReview}><BuyerReview f={f} stars={stars} pop={pop} /></Phone>
      </div>
      <div style={{ position: 'absolute', right: 6, top: 930, transform: `scale(${love}) rotate(${12 + Math.sin(f / 4) * 5}deg)`, opacity: love, filter: 'drop-shadow(0 26px 24px rgba(0,0,0,0.25))' }}><LoveFace size={310} /></div>
      <Sticker bg={p.ink} color="#fff" rotate={-6} size={74} style={{ left: 30, top: 1330, transform: `rotate(-6deg) scale(${usePop(40, 9)})` }}>5 <span style={{ color: '#ffb020' }}>★</span> Rahmat!</Sticker>
      <AbsoluteFill style={{ pointerEvents: 'none' }}><Confetti start={56} x={760} y={1100} seed="rate" colors={['#fff', '#17171c', '#ff6a13', '#2fd6a3', '#22c7ff']} /></AbsoluteFill>
    </SceneBG>
  );
};
