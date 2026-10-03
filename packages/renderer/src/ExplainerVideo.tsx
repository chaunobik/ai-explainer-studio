import React from "react";
import {AbsoluteFill, Sequence} from "remotion";
import type {ExplainerVideoProps} from "./types";
import {SceneFrame} from "./components/SceneFrame";

export const ExplainerVideo: React.FC<ExplainerVideoProps> = ({
  motionSpec,
  assets,
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

        return (
          <Sequence
            key={scene.scene_id}
            from={start}
            durationInFrames={durationInFrames}
            name={scene.scene_id}
          >
            <SceneFrame scene={scene} assets={assets} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
