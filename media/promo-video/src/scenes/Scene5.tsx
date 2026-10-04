import React from 'react';
import { useCurrentFrame } from 'remotion';
import { prog, usePop, useP, useBeatHit } from '../anim';
import { Phone } from '../components/Phone';
import { Sticker, SceneBG, TitleBlock } from '../components/Layout';
import { BuyerTrack, CourierMapScreen } from '../components/ui';

const SWITCH = 100; // kuryer ilovasidan xaridor kuzatuviga o'tish

/** 18–24 soniya: eng yaqin kuryer avtomatik biriktiriladi, yo'l chiziladi, taom yetib keladi. */
export const Scene5: React.FC = () => {
  const p = useP();
  const f = useCurrentFrame();
  const enter = usePop(4, 13, 120);
  const hit = useBeatHit();
  const near = usePop(50, 9);
  const arrive = usePop(176, 8, 200);
  const sw = prog(f, SWITCH - 2, SWITCH + 12);
  const move = prog(f, 106, 174);
  return (
    <SceneBG color={p.cream} circle={p.accentSoft}>
      <TitleBlock line1={p.courierTitle1} line2={p.courierTitle2} c1={p.ink} c2={p.accent} size1={128} size2={86} />
      <div style={{ position: 'absolute', left: 220, top: 590, transform: `translateY(${(1 - enter) * 1300}px) scale(${1 + hit * 0.006})`, transformOrigin: '50% 100%' }}>
        <Phone width={640} screenshot={f < SWITCH ? p.screens.courierMap : p.screens.buyerTrack}>
          <div style={{ position: 'absolute', inset: 0, transform: `translateY(${-sw * 844}px)` }}><CourierMapScreen f={f} /></div>
          <div style={{ position: 'absolute', inset: 0, transform: `translateY(${(1 - sw) * 844}px)` }}><BuyerTrack f={Math.max(0, f - SWITCH)} stage={2} move={move} /></div>
        </Phone>
      </div>
      <Sticker bg="#2f7cf6" color="#fff" rotate={-7} size={64} style={{ left: 24, top: 1560, transform: `rotate(-7deg) scale(${near})`, opacity: near }}>🛵 1,2 km<br />eng yaqin</Sticker>
      <Sticker bg={p.ink} color="#fff" rotate={6} size={62} style={{ right: 34, top: 1240, transform: `rotate(6deg) scale(${arrive})`, opacity: arrive }}>Yetib keldi! {p.dishEmoji}</Sticker>
    </SceneBG>
  );
};
