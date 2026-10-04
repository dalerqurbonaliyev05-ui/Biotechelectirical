import React from 'react';
import { Pop, PopWords, titleStyle, useBeatHit, useP, usePop } from '../anim';
import { SceneBG } from '../components/Layout';
import { AppIcon } from '../components/Food';
import { FONT } from '../theme';

/** 28–30 soniya: yakuniy ekran: 3 ta ilova va yuklab olish chaqiruvi. */
export const Scene7: React.FC = () => {
  const p = useP();
  const hit = useBeatHit();
  const cta = usePop(24, 9, 230);
  const apps = [
    { name: p.appBuyer, emoji: '🍽️', bg: 'linear-gradient(135deg,#ff8a3d,#ff5a00)' },
    { name: p.appSeller, emoji: '👩‍🍳', bg: 'linear-gradient(135deg,#46e0b4,#17a05d)' },
    { name: p.appCourier, emoji: '🛵', bg: 'linear-gradient(135deg,#6db1ff,#2f7cf6)' },
  ];
  return (
    <SceneBG color={p.accent} circle={p.accentDark}>
      <div style={{ position: 'absolute', left: 60, right: 60, top: 260 }}>
        <PopWords text={p.outroTitle} delay={0} style={titleStyle(132, '#fff')} />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 640, display: 'flex', justifyContent: 'center', gap: 44 }}>
        {apps.map((a, i) => (
          <Pop key={a.name} delay={4 + i * 4} from={0.2} y={120} style={{ display: 'grid', justifyItems: 'center', gap: 22 }}>
            <AppIcon size={270} emoji={a.emoji} bg={a.bg} />
            <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 50, color: '#fff', letterSpacing: '-0.02em' }}>{a.name}</div>
          </Pop>
        ))}
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1130, display: 'grid', placeItems: 'center' }}>
        <div style={{ transform: `scale(${cta * (1 + hit * 0.04)})`, opacity: cta, background: '#fff', color: p.ink, borderRadius: 999, padding: '34px 70px', display: 'flex', alignItems: 'center', gap: 28,
          fontFamily: FONT, fontWeight: 800, fontSize: 64, letterSpacing: '-0.03em', boxShadow: '0 26px 60px rgba(23,23,28,0.35)' }}>
          <svg width="64" height="64" viewBox="0 0 64 64"><path d="M14 6l40 26-40 26z" fill={p.accent} /></svg>
          {p.ctaText}
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1330, textAlign: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 48, color: 'rgba(255,255,255,0.92)', opacity: usePop(34, 12) }}>{p.ctaNote}</div>
    </SceneBG>
  );
};
