import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Confetti, usePop, useP, useBeatHit } from '../anim';
import { Phone } from '../components/Phone';
import { Plate } from '../components/Food';
import { Sticker, SceneBG, TitleBlock } from '../components/Layout';
import { BuyerCart } from '../components/ui';
import { money } from '../theme';

/** 8–13 soniya: promokod kiritiladi, narx pasayadi. */
export const Scene3: React.FC = () => {
  const p = useP();
  const f = useCurrentFrame();
  const enter = usePop(6, 13, 120);
  const hit = useBeatHit();
  const burst = usePop(54, 8, 190);
  const discount = Math.round((p.pricePerPerson * p.people * p.discountPercent) / 100);
  return (
    <SceneBG color={p.ink} circle="#262630">
      <div style={{ position: 'absolute', left: 560, top: 1180, opacity: 0.9, transform: 'rotate(10deg)' }}><Plate size={780} /></div>
      <TitleBlock line1={p.promoTitle1} line2={p.promoTitle2} c1="#fff" c2={p.accent} />
      <div style={{ position: 'absolute', left: 100, top: 590, transform: `translateY(${(1 - enter) * 1300}px) rotate(${(1 - enter) * 8}deg) scale(${1 + hit * 0.006})`, transformOrigin: '50% 100%' }}>
        <Phone width={640} screenshot={p.screens.buyerCart}><BuyerCart f={f} /></Phone>
      </div>
      <Sticker bg={p.accent} color="#fff" round size={112} style={{ right: 26, top: 900, width: 300, height: 300, transform: `rotate(-8deg) scale(${burst})`, opacity: burst }}>
        −{p.discountPercent}%
      </Sticker>
      <Sticker bg="#fff" color={p.ink} rotate={5} size={50} style={{ right: 30, top: 1250, padding: '18px 26px', transform: `rotate(5deg) scale(${usePop(64, 9)})` }}>
        <span style={{ color: '#17a05d' }}>−{money(discount).replace('\u00a0so\'m', '')}<br />so'm</span>
      </Sticker>
      <AbsoluteFill style={{ pointerEvents: 'none' }}><Confetti start={54} x={900} y={1060} seed="promo" /></AbsoluteFill>
    </SceneBG>
  );
};
