import {describe, expect, it} from "vitest";
import {validateVoiceAssets, validateVoiceSpecAgainstStoryboard} from "./voice-qa";
import type {VoiceAsset, VoiceSpec} from "./types";

const spec: VoiceSpec = {
  voice_plan_id: "VPLAN",
  project_id: "P1",
  language: "vi-VN",
  provider_id: "manual-tts",
  segments: [
    {scene_id: "S1", text: "Một câu.", target_duration_sec: 2, output_asset_id: "V1"},
  ],
};

describe("voice QA", () => {
  it("rejects text drift and audio overrun", () => {
    const assets: VoiceAsset[] = [
      {
        asset_id: "V1",
        project_id: "P1",
        scene_id: "S1",
        status: "qa_pending",
        text: "Một câu bị đổi.",
        attempt: 0,
        provider_id: "manual-tts",
        file: {uri: "voice/V1.mp3", mime_type: "audio/mpeg", duration_sec: 3},
      },
    ];

    const report = validateVoiceAssets(spec, assets);
    const codes = report.errors.map((value) => value.code);
    expect(codes).toContain("VOICE_TEXT_DRIFT");
    expect(codes).toContain("VOICE_OVERRUN");
  });
});


it("rejects VoiceSpec narration drift from storyboard", () => {
  const drifted: VoiceSpec = {
    ...spec,
    segments: [
      {
        ...spec.segments[0],
        text: "Nội dung khác.",
      },
    ],
  };

  const report = validateVoiceSpecAgainstStoryboard(drifted, {
    scenes: [{scene_id: "S1", narration: "Một câu.", duration_sec: 2}],
  });

  expect(report.errors.map((value) => value.code)).toContain(
    "VOICE_SPEC_TEXT_DRIFT",
  );
});
