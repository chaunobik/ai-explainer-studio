import React from "react";
import {interpolate, useCurrentFrame, useVideoConfig} from "remotion";

interface HighlightProps {
  startSec: number;
  endSec: number;
  x: number;
  y: number;
  widthNorm: number;
  heightNorm: number;
  opacity: number;
  label?: string;
}

export const Highlight: React.FC<HighlightProps> = ({
  startSec,
  endSec,
  x,
  y,
  widthNorm,
  heightNorm,
  opacity,
  label,
}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const start = startSec * fps;
  const end = endSec * fps;

  if (frame < start || frame > end) return null;

  const fade = interpolate(
    frame,
    [start, start + 6, end - 6, end],
    [0, 1, 1, 0],
    {extrapolateLeft: "clamp", extrapolateRight: "clamp"},
  );

  return (
    <div
      style={{
        position: "absolute",
        left: x * width,
        top: y * height,
        width: widthNorm * width,
        height: heightNorm * height,
        borderRadius: 28,
        background: `rgba(255, 140, 0, ${opacity * fade})`,
        boxShadow: `0 0 45px rgba(255, 140, 0, ${Math.min(0.6, opacity * fade)})`,
        pointerEvents: "none",
      }}
    >
      {label ? (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: -56,
            transform: "translateX(-50%)",
            fontSize: 38,
            fontWeight: 700,
            color: "white",
            textShadow: "0 2px 8px rgba(0,0,0,0.65)",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </div>
      ) : null}
    </div>
  );
};
