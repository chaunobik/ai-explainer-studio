
import {describe, expect, it} from "vitest";
import {deriveGuidedNextAction} from "./guidance";
import type {ProjectReadinessReport} from "./readiness";

function report(checks: ProjectReadinessReport["checks"]): ProjectReadinessReport {
  return {
    project_id: "P1",
    overall_status: "action_required",
    checks,
    next_actions: checks.flatMap((check) => (check.action ? [check.action] : [])),
  };
}

describe("deriveGuidedNextAction", () => {
  it("prioritizes importing A0 before unrelated prompt QA", () => {
    const next = deriveGuidedNextAction(
      report([
        {id: "prompt-qa:A1", stage: "image_prompt", status: "action_required", message: "Prompt QA missing", action: "Run Prompt QA"},
        {id: "image-reference:A0", stage: "visual_assets", status: "action_required", message: "A0 is waiting for an imported file.", action: "Import A0"},
        {id: "image:A1", stage: "visual_assets", status: "blocked", message: "A1 is blocked by A0.", action: null},
      ]),
      {promptIdByAsset: {A1: "IP1"}},
    );
    expect(next.kind).toBe("upload_image");
    expect(next.asset_id).toBe("A0");
  });

  it("keeps each asset sequential: prompt QA before generation", () => {
    const next = deriveGuidedNextAction(
      report([
        {id: "image-reference:A0", stage: "visual_assets", status: "pass", message: "A0 approved", action: null},
        {id: "prompt-qa:A1", stage: "image_prompt", status: "action_required", message: "Prompt QA missing", action: "Run Prompt QA"},
        {id: "image:A1", stage: "visual_assets", status: "ready", message: "A1 is ready for generation.", action: "Generate A1"},
        {id: "prompt-qa:A2", stage: "image_prompt", status: "action_required", message: "Prompt QA missing", action: "Run Prompt QA"},
      ]),
      {promptIdByAsset: {A1: "IP1", A2: "IP2"}},
    );
    expect(next.kind).toBe("prompt_qa");
    expect(next.asset_id).toBe("A1");
    expect(next.prompt_id).toBe("IP1");
  });

  it("switches failed prompt QA into repair guidance", () => {
    const next = deriveGuidedNextAction(
      report([
        {id: "image-reference:A0", stage: "visual_assets", status: "pass", message: "A0 approved", action: null},
        {id: "prompt-qa:A1", stage: "image_prompt", status: "action_required", message: "Image Prompt QA failed for A1.", action: "Repair prompt IP1"},
        {id: "image:A1", stage: "visual_assets", status: "ready", message: "A1 is ready for generation.", action: "Generate A1"},
      ]),
      {promptIdByAsset: {A1: "IP1"}},
    );

    expect(next.kind).toBe("prompt_qa");
    expect(next.title).toContain("Sửa prompt");
    expect(next.instructions.join(" ")).toContain("Repair Package");
  });

  it("moves to A1 review after import", () => {
    const next = deriveGuidedNextAction(
      report([
        {id: "image-reference:A0", stage: "visual_assets", status: "pass", message: "A0 approved", action: null},
        {id: "prompt-qa:A1", stage: "image_prompt", status: "pass", message: "Prompt QA passed", action: null},
        {id: "image:A1", stage: "visual_assets", status: "action_required", message: "A1 is imported and waiting for Visual QA.", action: "Run Visual QA for A1."},
      ]),
      {promptIdByAsset: {A1: "IP1"}},
    );
    expect(next.kind).toBe("review_image");
    expect(next.asset_id).toBe("A1");
  });
  it("starts prompt-first projects with A0 multi-view Prompt QA", () => {
    const next = deriveGuidedNextAction(
      report([
        {id: "multiview-prompt-qa:A0", stage: "image_prompt", status: "action_required", message: "missing", action: "run"},
        {id: "image:A0", stage: "visual_assets", status: "ready", message: "A0 is ready for generation.", action: "generate"},
        {id: "image:A1", stage: "visual_assets", status: "blocked", message: "blocked by A0", action: null},
      ]),
      {
        referencePackAssetIds: ["A0"],
        referencePromptIdByAsset: {A0: "MVP1"},
      },
    );

    expect(next.kind).toBe("multiview_prompt_qa");
    expect(next.asset_id).toBe("A0");
    expect(next.prompt_id).toBe("MVP1");
  });

  it("moves from A0 prompt PASS to reference-pack generation", () => {
    const next = deriveGuidedNextAction(
      report([
        {id: "multiview-prompt-qa:A0", stage: "image_prompt", status: "pass", message: "pass", action: null},
        {id: "image:A0", stage: "visual_assets", status: "ready", message: "A0 is ready for generation.", action: "generate"},
      ]),
      {
        referencePackAssetIds: ["A0"],
        referencePromptIdByAsset: {A0: "MVP1"},
      },
    );

    expect(next.kind).toBe("generate_reference_pack");
  });

  it("moves imported A0 to Multi-View QA", () => {
    const next = deriveGuidedNextAction(
      report([
        {id: "multiview-prompt-qa:A0", stage: "image_prompt", status: "pass", message: "pass", action: null},
        {id: "image:A0", stage: "visual_assets", status: "action_required", message: "A0 is imported and waiting for Visual QA.", action: "qa"},
        {id: "multiview-qa:A0", stage: "visual_assets", status: "action_required", message: "Multi-View QA missing", action: "qa"},
      ]),
      {
        referencePackAssetIds: ["A0"],
        referencePromptIdByAsset: {A0: "MVP1"},
      },
    );

    expect(next.kind).toBe("multiview_qa");
  });
});
