import React from "react";
import {useCurrentFrame, useVideoConfig} from "remotion";
import {windowOpacity} from "./fade";

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

  const fade = windowOpacity(frame, start, end, 6);

  return (
    <div
      style={{
        position: "absolute",
        left: x * width,
        top: y * height,
        width: widthNorm * width,
        height: heightNorm * height,
        borderRadius: 24,
        border: `3px solid rgba(255, 157, 0, ${Math.min(0.95, fade)})`,
        background: `rgba(255, 157, 0, ${Math.min(0.16, opacity * fade * 0.4)})`,
        boxShadow: `0 0 28px rgba(255, 157, 0, ${Math.min(0.28, opacity * fade * 0.6)})`,
        pointerEvents: "none",
      }}
    >
      {label ? (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: -62,
            transform: "translateX(-50%)",
            padding: "8px 14px",
            borderRadius: 12,
            background: "rgba(10,12,16,0.76)",
            fontFamily: "Arial, Helvetica, sans-serif",
            fontSize: 34,
            fontWeight: 700,
            color: "white",
            textShadow: "0 2px 6px rgba(0,0,0,0.55)",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </div>
      ) : null}
    </div>
  );
};
