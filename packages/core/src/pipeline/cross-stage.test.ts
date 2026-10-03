import { describe, expect, it } from "vitest";
import { validateCrossStageArtifacts } from "./cross-stage";

describe("cross-stage validator", () => {
  it("detects provider prompt drift and storyboard narration drift", () => {
    const report = validateCrossStageArtifacts({
      researchResult: {
        sources: [{ source_id: "SRC1" }],
        findings: [{ finding_id: "F1", source_ids: ["SRC1"] }],
      },
      claims: [
        {
          claim_id: "C1",
          source_ids: ["SRC1"],
          status: "approved",
          allowed_for_script: true,
        },
      ],
      script: {
        hook: { spoken_text: "Hook", claim_ids: [] },
        segments: [{ segment_id: "SG1", spoken_text: "Fact", claim_ids: ["C1"] }],
        payoff: { spoken_text: "End", claim_ids: ["C1"] },
        approved_claim_ids: ["C1"],
        target_duration_sec: 50,
        estimated_duration_sec: 50,
      },
      storyboard: {
        target_duration_sec: 50,
        total_duration_sec: 50,
        scenes: [
          { scene_id: "S1", script_part_ids: ["hook"], narration: "Wrong hook", duration_sec: 10 },
          { scene_id: "S2", script_part_ids: ["SG1"], narration: "Fact", duration_sec: 20 },
          { scene_id: "S3", script_part_ids: ["payoff"], narration: "End", duration_sec: 20 },
        ],
      },
      visualPlan: {
        asset_bible: { assets: [{ asset_id: "A1" }] },
        routes: [
          { scene_id: "S1", input_asset_ids: [], planned_output_asset_ids: ["A1"] },
          { scene_id: "S2", input_asset_ids: ["A1"], planned_output_asset_ids: ["A1"] },
          { scene_id: "S3", input_asset_ids: ["A1"], planned_output_asset_ids: ["A1"] },
        ],
        lineage: [
          { scene_id: "S1", relationship: "anchor", parent_scene_id: null },
          { scene_id: "S2", relationship: "derived", parent_scene_id: "S1" },
          { scene_id: "S3", relationship: "derived", parent_scene_id: "S2" },
        ],
        transitions: [
          { from_scene_id: "S1", to_scene_id: "S2" },
          { from_scene_id: "S2", to_scene_id: "S3" },
        ],
      },
      executionPlan: {
        assets: [
          {
            asset_id: "A1",
            executor: "image_provider",
            operation: "generate_anchor",
            depends_on_approved_assets: [],
          },
        ],
      },
      imagePromptSpecs: [
        {
          prompt_id: "IP1",
          asset_id: "A1",
          operation: "generate_anchor",
          reference_asset_ids: [],
          final_prompt: "x".repeat(250),
        },
      ],
      providerJobs: [
        {
          output_asset_id: "A1",
          prompt_spec_id: "IP1",
          prompt: "DIFFERENT",
          reference_asset_ids: [],
        },
      ],
    });

    expect(report.ok).toBe(false);
    expect(report.errors.map((value) => value.code)).toContain(
      "STORYBOARD_NARRATION_DRIFT",
    );
    expect(report.errors.map((value) => value.code)).toContain(
      "PROVIDER_PROMPT_DRIFT",
    );
  });
});
