import React from "react";
import {interpolate, useCurrentFrame, useVideoConfig} from "remotion";

interface HeatPath {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface HeatFlowProps {
  paths: HeatPath[];
  startSec: number;
  endSec: number;
  speed: number;
}

export const HeatFlow: React.FC<HeatFlowProps> = ({
  paths,
  startSec,
  endSec,
  speed,
}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const start = startSec * fps;
  const end = endSec * fps;

  if (frame < start || frame > end) return null;

  const progress = ((frame - start) * speed) / Math.max(1, fps);
  const dashOffset = -((progress * 80) % 80);
  const opacity = interpolate(
    frame,
    [start, start + Math.min(8, (end - start) / 3), end - Math.min(8, (end - start) / 3), end],
    [0, 1, 1, 0],
    {extrapolateLeft: "clamp", extrapolateRight: "clamp"},
  );

  return (
    <svg
      width={width}
      height={height}
      style={{position: "absolute", inset: 0, opacity, pointerEvents: "none"}}
    >
      <defs>
        <marker
          id="heat-arrow"
          markerWidth="10"
          markerHeight="10"
          refX="8"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L9,3 z" fill="currentColor" />
        </marker>
      </defs>
      {paths.map((path, index) => (
        <line
          key={index}
          x1={path.x1 * width}
          y1={path.y1 * height}
          x2={path.x2 * width}
          y2={path.y2 * height}
          stroke="currentColor"
          color="orange"
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray="24 20"
          strokeDashoffset={dashOffset}
          markerEnd="url(#heat-arrow)"
        />
      ))}
    </svg>
  );
};
