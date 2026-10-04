import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import { OVERLAP, SCENES, VideoProps } from './theme';
import { IrisIn, PropsCtx } from './anim';
import { Scene1, Scene2, Scene3, Scene4, Scene5, Scene6, Scene7 } from './scenes';

const COMPONENTS = [Scene1, Scene2, Scene3, Scene4, Scene5, Scene6, Scene7];
/** Har sahna oldingisi ustiga doira bo'lib ochiladi; doira markazi sahnadan sahnaga o'zgaradi (dinamika uchun). */
const IRIS_ORIGINS: [number, number][] = [[50, 50], [50, 70], [18, 82], [82, 30], [50, 62], [78, 78], [50, 50]];

export const PromoVideo: React.FC<VideoProps> = (props) => (
  <PropsCtx.Provider value={props}>
    <AbsoluteFill style={{ background: props.ink }}>
      {SCENES.map((s, i) => {
        const Scene = COMPONENTS[i];
        const duration = s.to - s.from + (i < SCENES.length - 1 ? OVERLAP : 0);
        return (
          <Sequence key={s.id} name={`${i + 1}. ${s.id}`} from={s.from} durationInFrames={duration} layout="none">
            {i === 0 ? <Scene /> : <IrisIn x={IRIS_ORIGINS[i][0]} y={IRIS_ORIGINS[i][1]}><Scene /></IrisIn>}
          </Sequence>
        );
      })}
      {props.audioSrc ? <Audio src={staticFile(props.audioSrc)} volume={props.audioVolume} /> : null}
    </AbsoluteFill>
  </PropsCtx.Provider>
);
