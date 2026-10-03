import React from "react";
import {AbsoluteFill, Audio, Sequence} from "remotion";
import type {ExplainerVideoProps} from "./types";
import {SceneFrame} from "./components/SceneFrame";
import {SceneSubtitle} from "./components/SceneSubtitle";

export const ExplainerVideo: React.FC<ExplainerVideoProps> = ({
  motionSpec,
  assets,
  audioByScene = {},
  subtitleCues = [],
}) => {
  let from = 0;

  return (
    <AbsoluteFill>
      {motionSpec.scenes.map((scene) => {
        const durationInFrames = Math.max(
          1,
          Math.round(scene.duration_sec * motionSpec.fps),
        );
        const start = from;
        from += durationInFrames;
        const audio = audioByScene[scene.scene_id];
        const cues = subtitleCues.filter(
          (cue) => cue.scene_id === scene.scene_id,
        );

        return (
          <Sequence
            key={scene.scene_id}
            from={start}
            durationInFrames={durationInFrames}
            name={scene.scene_id}
          >
            <SceneFrame scene={scene} assets={assets} />
            {audio ? <Audio src={audio} /> : null}
            <SceneSubtitle cues={cues} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
