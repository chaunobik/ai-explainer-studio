import {describe, expect, it} from "vitest";
import {
  buildReadinessReport,
  evaluateImageReadiness,
  evaluateVoiceReadiness,
} from "./readiness";
import type {ImageAsset} from "../image/types";
import type {VoiceSpec} from "../voice/types";

describe("project readiness", () => {
  it("blocks A1 until external A0 reference is approved", () => {
    const entries = [
      {
        asset_id: "A1",
        scene_id: "S1",
        executor: "image_provider" as const,
        operation: "generate_anchor" as const,
        depends_on_approved_assets: [],
        status: "ready",
      },
    ];
    const jobs = [
      {
        output_asset_id: "A1",
        reference_asset_ids: ["A0"],
      },
    ];

    const pendingA0: ImageAsset = {
      assetId: "A0",
      projectId: "P1",
      assetRole: "anchor",
      status: "awaiting_import",
      entityIds: ["x"],
      parentAssetIds: [],
      attempt: 0,
      provenance: {
        providerId: "user",
        providerMode: "import",
        operation: "import_existing",
      },
      file: {},
    };

    const blocked = evaluateImageReadiness(entries, jobs, [pendingA0]);
    expect(blocked.find((c) => c.id === "image:A1")?.status).toBe("blocked");

    const approvedA0 = {...pendingA0, status: "approved" as const};
    const ready = evaluateImageReadiness(entries, jobs, [approvedA0]);
    expect(ready.find((c) => c.id === "image:A1")?.status).toBe("ready");
  });

  it("reports render_ready only when deterministic, image and voice gates all pass", () => {
    const voiceSpec: VoiceSpec = {
      voice_plan_id: "VP",
      project_id: "P1",
      language: "vi-VN",
      provider_id: "manual-tts",
      segments: [
        {scene_id: "S1", text: "A", target_duration_sec: 1, output_asset_id: "V1"},
      ],
    };
    const voiceChecks = evaluateVoiceReadiness(voiceSpec, [
      {
        asset_id: "V1",
        project_id: "P1",
        scene_id: "S1",
        status: "approved",
        text: "A",
        attempt: 0,
        provider_id: "manual-tts",
        file: {uri: "voice/V1.mp3", mime_type: "audio/mpeg", duration_sec: 0.9},
      },
    ]);

    const report = buildReadinessReport({
      projectId: "P1",
      deterministicChecks: [
        {id: "contracts", stage: "pipeline", status: "pass", message: "ok", action: null},
      ],
      imageChecks: [
        {id: "image:A1", stage: "visual_assets", status: "pass", message: "ok", action: null},
      ],
      voiceChecks,
      outputExists: false,
      finalQaStatus: null,
    });

    expect(report.overall_status).toBe("render_ready");
    expect(report.next_actions[0]).toContain("final project render");
  });
});
