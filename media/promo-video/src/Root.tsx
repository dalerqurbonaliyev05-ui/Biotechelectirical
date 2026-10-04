import React, { useEffect, useState } from 'react';
import { Composition, continueRender, delayRender } from 'remotion';
import '@fontsource-variable/manrope/wght.css';
import { DURATION, FPS, HEIGHT, WIDTH, defaultProps, propsSchema } from './theme';
import { PromoVideo } from './PromoVideo';

/** Shrift to'liq yuklanmaguncha kadr chizilmaydi (aks holda matn boshqa shriftda chiqib qoladi). */
const useFonts = () => {
  const [handle] = useState(() => delayRender('Manrope shrifti'));
  useEffect(() => {
    Promise.all([400, 700, 800].map((w) => document.fonts.load(`${w} 64px "Manrope Variable"`)))
      .catch(() => undefined)
      .finally(() => continueRender(handle));
  }, [handle]);
};

const Video: React.FC<React.ComponentProps<typeof PromoVideo>> = (props) => {
  useFonts();
  return <PromoVideo {...props} />;
};

export const Root: React.FC = () => (
  <Composition id="PromoVideo" component={Video} durationInFrames={DURATION} fps={FPS} width={WIDTH} height={HEIGHT} schema={propsSchema} defaultProps={defaultProps} />
);
