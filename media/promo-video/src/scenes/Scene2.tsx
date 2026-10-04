import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Pop, prog, titleStyle, usePop, useP, useBeatHit } from '../anim';
import { Phone } from '../components/Phone';
import { Sticker, SceneBG, TitleBlock } from '../components/Layout';
import { BuyerFood, BuyerHome } from '../components/ui';

const SWITCH = 104; // taom sahifasiga o'tish kadri

/** 3–8 soniya: xaridor ilovasi: kategoriyalar tez skroll, mastavaga 10 kishiga buyurtma. */
export const Scene2: React.FC = () => {
  const p = useP();
  const f = useCurrentFrame();
  const enter = usePop(8, 13, 120);
  const hit = useBeatHit();
  const slide = prog(f, SWITCH - 2, SWITCH + 12);
  const sticker = usePop(SWITCH + 8, 9);
  return (
    <SceneBG color={p.cream} circle={p.accentSoft}>
      <TitleBlock line1={p.orderTitle1} line2={p.orderTitle2} c1={p.ink} c2={p.accent} />
      <div style={{ position: 'absolute', left: 220, top: 590, transform: `translateY(${(1 - enter) * 1300}px) rotate(${(1 - enter) * -8}deg) scale(${1 + hit * 0.006})`, transformOrigin: '50% 100%' }}>
        <Phone width={640} screenshot={f < SWITCH ? p.screens.buyerHome : p.screens.buyerFood}>
          <div style={{ position: 'absolute', inset: 0, transform: `translateX(${-slide * 390}px)` }}><BuyerHome f={f} /></div>
          <div style={{ position: 'absolute', inset: 0, transform: `translateX(${(1 - slide) * 390}px)` }}><BuyerFood f={Math.max(0, f - SWITCH)} /></div>
        </Phone>
      </div>
      <Sticker bg={p.ink} color="#fff" rotate={7} size={70} style={{ right: 40, top: 1000, transform: `rotate(7deg) scale(${sticker})`, opacity: sticker }}>
        {p.dishEmoji} {p.people} kishiga<br /><span style={{ color: p.accent }}>{p.dish.toLowerCase()}</span>
      </Sticker>
      <Pop delay={30} from={0.1}><div style={{ ...titleStyle(60, p.accent), position: 'absolute', left: 50, top: 1060, transform: 'rotate(-8deg)' }}>🥟 🍲</div></Pop>
    </SceneBG>
  );
};
