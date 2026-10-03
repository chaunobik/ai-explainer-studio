import {describe, expect, it} from "vitest";
import {ManualVoiceProvider} from "./manual-voice-provider";
import type {VoiceSpec} from "./types";

const spec: VoiceSpec = {
  voice_plan_id: "VPLAN",
  project_id: "P1",
  language: "vi-VN",
  provider_id: "manual-tts",
  segments: [
    {
      scene_id: "S1",
      text: "Xin chào.",
      target_duration_sec: 2,
      output_asset_id: "V1",
    },
  ],
};

describe("ManualVoiceProvider", () => {
  it("creates exact-text manual jobs", () => {
    const jobs = new ManualVoiceProvider().createJobs(spec);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].text).toBe("Xin chào.");
    expect(jobs[0].status).toBe("requires_user_action");
  });
});
