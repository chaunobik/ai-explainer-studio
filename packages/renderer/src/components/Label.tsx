import React from "react";
import {useCurrentFrame, useVideoConfig} from "remotion";
import {windowOpacity} from "./fade";

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

  const opacity = windowOpacity(frame, start, end, 5);

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
        maxWidth: width * 0.72,
        padding: "10px 16px",
        borderRadius: 14,
        background: "rgba(10, 12, 16, 0.72)",
        border: "1px solid rgba(255,255,255,0.14)",
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize,
        fontWeight: 700,
        lineHeight: 1.15,
        color: "white",
        textShadow: "0 2px 8px rgba(0,0,0,0.55)",
        whiteSpace: "normal",
        pointerEvents: "none",
      }}
    >
      {text}
    </div>
  );
};
