import React from "react";
import {Composition} from "remotion";
import type {ExplainerVideoProps} from "./types";
import {ExplainerVideo} from "./ExplainerVideo";

const defaultProps: ExplainerVideoProps = {
  motionSpec: {
    motion_plan_id: "default",
    project_id: "default",
    fps: 30,
    width: 1080,
    height: 1920,
    scenes: [
      {
        scene_id: "S1",
        duration_sec: 1,
        source_asset_ids: [],
        background: "solid",
        solid_background: "#111",
        operations: [],
      },
    ],
  },
  assets: {},
  audioByScene: {},
  subtitleCues: [],
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="ExplainerVideo"
      component={ExplainerVideo as unknown as React.FC<Record<string, unknown>>}
      durationInFrames={30}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={defaultProps as unknown as Record<string, unknown>}
      calculateMetadata={({props}) => {
        const typed = props as unknown as ExplainerVideoProps;
        return {
          fps: typed.motionSpec.fps,
          width: typed.motionSpec.width,
          height: typed.motionSpec.height,
          durationInFrames: Math.max(
            1,
            Math.round(
              typed.motionSpec.scenes.reduce(
                (sum, scene) => sum + scene.duration_sec,
                0,
              ) * typed.motionSpec.fps,
            ),
          ),
        };
      }}
    />
  );
};
