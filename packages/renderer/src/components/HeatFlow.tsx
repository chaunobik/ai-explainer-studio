import React from "react";
import {useCurrentFrame, useVideoConfig} from "remotion";
import {windowOpacity} from "./fade";

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
  const opacity = windowOpacity(frame, start, end, 8);

  return (
    <svg
      width={width}
      height={height}
      style={{position: "absolute", inset: 0, opacity, pointerEvents: "none"}}
    >
      <defs>
        <filter id="heat-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <marker
          id="heat-arrow"
          markerWidth="7"
          markerHeight="7"
          refX="6"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L7,3 z" fill="#ff9d00" />
        </marker>
      </defs>
      {paths.map((path, index) => (
        <line
          key={index}
          x1={path.x1 * width}
          y1={path.y1 * height}
          x2={path.x2 * width}
          y2={path.y2 * height}
          stroke="#ff9d00"
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray="18 16"
          strokeDashoffset={dashOffset}
          markerEnd="url(#heat-arrow)"
          filter="url(#heat-glow)"
        />
      ))}
    </svg>
  );
};
