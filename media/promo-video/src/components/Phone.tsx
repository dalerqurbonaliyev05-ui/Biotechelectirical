import React from 'react';
import { Img, staticFile } from 'remotion';

export const SCREEN_W = 390;
export const SCREEN_H = 844;

/**
 * Telefon ramkasi. Ichiga 390x844 (haqiqiy ilova o'lchami) mantiqiy pikselda chizilgan interfeys qo'yiladi:
 * ramka uni avtomatik masshtablaydi. `screenshot` berilsa (public/ ichidagi rasm), chizilgan interfeys o'rniga shu rasm ko'rinadi.
 */
export const Phone: React.FC<{ width?: number; children?: React.ReactNode; screenshot?: string; style?: React.CSSProperties; dark?: boolean }> = ({
  width = 640, children, screenshot, style, dark = true,
}) => {
  const bezel = Math.round(width * 0.028);
  const screenW = width - bezel * 2;
  const scale = screenW / SCREEN_W;
  const screenH = SCREEN_H * scale;
  const radius = width * 0.125;
  return (
    <div style={{ width, height: screenH + bezel * 2, borderRadius: radius, background: dark ? '#0e0e12' : '#e9e9ee', padding: bezel, boxSizing: 'border-box', position: 'relative',
      boxShadow: '0 70px 120px rgba(23,23,28,0.38), 0 18px 40px rgba(23,23,28,0.28), inset 0 0 0 3px rgba(255,255,255,0.12)', ...style }}>
      <div style={{ width: screenW, height: screenH, borderRadius: radius - bezel, overflow: 'hidden', position: 'relative', background: '#fff' }}>
        <div style={{ width: SCREEN_W, height: SCREEN_H, transform: `scale(${scale})`, transformOrigin: '0 0', position: 'absolute', left: 0, top: 0 }}>
          {screenshot ? <Img src={staticFile(screenshot)} style={{ width: SCREEN_W, height: SCREEN_H, objectFit: 'cover' }} /> : children}
        </div>
        {/* "orol" (kamera) */}
        <div style={{ position: 'absolute', top: screenW * 0.03, left: '50%', transform: 'translateX(-50%)', width: screenW * 0.27, height: screenW * 0.075, borderRadius: 999, background: '#0e0e12' }} />
      </div>
    </div>
  );
};
