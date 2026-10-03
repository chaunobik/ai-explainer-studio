
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
});
