import React from "react";
import {interpolate, useCurrentFrame, useVideoConfig} from "remotion";

interface LabelProps {
  startSec: number;
  endSec: number;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  align?: "left" | "center" | "right";
}

export const Label: React.FC<LabelProps> = ({
  startSec,
  endSec,
  text,
  x,
  y,
  fontSize,
  align = "center",
}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const start = startSec * fps;
  const end = endSec * fps;
  if (frame < start || frame > end) return null;

  const opacity = interpolate(
    frame,
    [start, start + 5, end - 5, end],
    [0, 1, 1, 0],
    {extrapolateLeft: "clamp", extrapolateRight: "clamp"},
  );

  const translate =
    align === "center" ? "translateX(-50%)" : align === "right" ? "translateX(-100%)" : undefined;

  return (
    <div
      style={{
        position: "absolute",
        left: x * width,
        top: y * height,
        transform: translate,
        opacity,
        fontSize,
        fontWeight: 700,
        color: "white",
        textShadow: "0 2px 10px rgba(0,0,0,0.75)",
        whiteSpace: "nowrap",
        pointerEvents: "none",
      }}
    >
      {text}
    </div>
  );
};
