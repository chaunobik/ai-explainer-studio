import React from "react";
import {useCurrentFrame, useVideoConfig} from "remotion";
import type {SubtitleCue} from "@ai-explainer-studio/core";
import {windowOpacity} from "./fade";

interface SceneSubtitleProps {
  cues: SubtitleCue[];
}

export const SceneSubtitle: React.FC<SceneSubtitleProps> = ({cues}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const seconds = frame / fps;

  const cue = cues.find(
    (value) => seconds >= value.start_sec && seconds < value.end_sec,
  );
  if (!cue) return null;

  const start = cue.start_sec * fps;
  const end = cue.end_sec * fps;
  const opacity = windowOpacity(frame, start, end, 4);

  return (
    <div
      style={{
        position: "absolute",
        left: width * 0.08,
        right: width * 0.08,
        bottom: height * 0.09,
        display: "flex",
        justifyContent: "center",
        opacity,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          maxWidth: width * 0.84,
          padding: "16px 24px",
          borderRadius: 18,
          background: "rgba(0,0,0,0.62)",
          color: "white",
          fontSize: 52,
          fontWeight: 700,
          lineHeight: 1.2,
          textAlign: "center",
          textShadow: "0 2px 6px rgba(0,0,0,0.8)",
        }}
      >
        {cue.text}
      </div>
    </div>
  );
};
