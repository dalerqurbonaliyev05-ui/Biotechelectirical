import React from 'react';
import { Audio, Sequence, staticFile, useVideoConfig } from 'remotion';
import { SFX_EVENTS, SFX_SECONDS } from './sfx';

/** Barcha ovoz effektlarini o'z kadrida ijro etadi (sfxEnabled / sfxVolume proplari bilan boshqariladi). */
export const Sfx: React.FC<{ enabled: boolean; volume: number }> = ({ enabled, volume }) => {
  const { fps } = useVideoConfig();
  if (!enabled) return null;
  return (
    <>
      {SFX_EVENTS.map((ev, i) => (
        <Sequence key={`${ev.name}-${i}`} from={Math.max(0, ev.frame)} durationInFrames={Math.ceil((SFX_SECONDS[ev.name] ?? 1) * fps) + 2} layout="none">
          <Audio src={staticFile(`sfx/${ev.name}.wav`)} volume={Math.min(1, volume * (ev.volume ?? 1))} />
        </Sequence>
      ))}
    </>
  );
};
