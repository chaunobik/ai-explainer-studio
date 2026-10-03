import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type {MotionOperation, MotionScene} from "@ai-explainer-studio/core";
import type {RendererAssetMap} from "../types";
import {HeatFlow} from "./HeatFlow";
import {Highlight} from "./Highlight";
import {Label} from "./Label";

interface SceneFrameProps {
  scene: MotionScene;
  assets: RendererAssetMap;
}

function cameraStyle(
  operations: MotionOperation[],
  seconds: number,
): React.CSSProperties {
  const camera = operations.find((operation) => operation.type === "camera");
  if (!camera || camera.type !== "camera") return {};

  const progress = interpolate(
    seconds,
    [camera.start_sec, camera.end_sec],
    [0, 1],
    {extrapolateLeft: "clamp", extrapolateRight: "clamp"},
  );
  const scale = camera.from_scale + (camera.to_scale - camera.from_scale) * progress;
  const x = camera.from_x + (camera.to_x - camera.from_x) * progress;
  const y = camera.from_y + (camera.to_y - camera.from_y) * progress;

  return {
    transform: `translate(${x * 100}%, ${y * 100}%) scale(${scale})`,
    transformOrigin: "center center",
  };
}

function opacityValue(operations: MotionOperation[], seconds: number): number {
  const op = operations.find((operation) => operation.type === "opacity");
  if (!op || op.type !== "opacity") return 1;
  return interpolate(
    seconds,
    [op.start_sec, op.end_sec],
    [op.from_opacity, op.to_opacity],
    {extrapolateLeft: "clamp", extrapolateRight: "clamp"},
  );
}

export const SceneFrame: React.FC<SceneFrameProps> = ({scene, assets}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const seconds = frame / fps;
  const source = scene.source_asset_ids.map((id) => assets[id]).find(Boolean);
  const background = scene.solid_background ?? "#111";

  return (
    <AbsoluteFill style={{backgroundColor: background, overflow: "hidden"}}>
      <AbsoluteFill style={{...cameraStyle(scene.operations, seconds), opacity: opacityValue(scene.operations, seconds)}}>
        {source ? (
          <Img
            src={source}
            style={{width: "100%", height: "100%", objectFit: "cover"}}
          />
        ) : null}
      </AbsoluteFill>

      {scene.operations.map((operation, index) => {
        if (operation.type === "heat_flow") {
          return (
            <HeatFlow
              key={index}
              paths={operation.paths}
              startSec={operation.start_sec}
              endSec={operation.end_sec}
              speed={operation.speed}
            />
          );
        }

        if (operation.type === "highlight") {
          return (
            <Highlight
              key={index}
              startSec={operation.start_sec}
              endSec={operation.end_sec}
              x={operation.x}
              y={operation.y}
              widthNorm={operation.width}
              heightNorm={operation.height}
              opacity={operation.opacity}
              label={operation.label}
            />
          );
        }

        if (operation.type === "label") {
          return (
            <Label
              key={index}
              startSec={operation.start_sec}
              endSec={operation.end_sec}
              text={operation.text}
              x={operation.x}
              y={operation.y}
              fontSize={operation.font_size}
              align={operation.align}
            />
          );
        }

        return null;
      })}
    </AbsoluteFill>
  );
};
