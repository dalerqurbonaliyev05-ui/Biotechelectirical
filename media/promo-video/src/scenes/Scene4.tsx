import React from 'react';
import { useCurrentFrame } from 'remotion';
import { usePop, useP, useBeatHit } from '../anim';
import { Phone } from '../components/Phone';
import { Sticker, SceneBG, TitleBlock } from '../components/Layout';
import { SellerOrders } from '../components/ui';

/** 13–18 soniya: sotuvchiga bildirishnoma keladi, u qabul qiladi. */
export const Scene4: React.FC = () => {
  const p = useP();
  const f = useCurrentFrame();
  const enter = usePop(4, 13, 120);
  const hit = useBeatHit();
  const bell = usePop(24, 6, 260);
  const ok = usePop(94, 8, 200);
  const shake = f >= 24 && f < 40 ? Math.sin(f * 2.4) * 10 * (1 - (f - 24) / 16) : 0;
  return (
    <SceneBG color={p.accent} circle={p.accentDark}>
      <TitleBlock line1={p.sellerTitle1} line2={p.sellerTitle2} c1="#fff" c2={p.ink} size1={136} size2={66} />
      <div style={{ position: 'absolute', left: 220, top: 600, transform: `translate(${shake}px, ${(1 - enter) * 1300}px) scale(${1 + hit * 0.006})`, transformOrigin: '50% 100%' }}>
        <Phone width={640} screenshot={p.screens.sellerOrder}><SellerOrders f={f} /></Phone>
      </div>
      <div style={{ position: 'absolute', left: 36, top: 840, fontSize: 190, transform: `scale(${bell}) rotate(${Math.sin(f * 1.3) * 12 * (f < 60 ? 1 : 0)}deg)`, opacity: bell, filter: 'drop-shadow(0 20px 20px rgba(0,0,0,0.25))' }}>🔔</div>
      <Sticker bg="#fff" color="#17a05d" rotate={6} size={78} style={{ right: 30, top: 1250, transform: `rotate(6deg) scale(${ok})`, opacity: ok }}>✓ Qabul qilindi</Sticker>
    </SceneBG>
  );
};
