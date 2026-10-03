import {describe, expect, it} from "vitest";
import {buildQaContractAppendix, parseAndValidateQaJson} from "./qa-contract";

describe("QA contracts", () => {
  it("includes schema text", () => {
    expect(buildQaContractAppendix("multiview_prompt_qa")).toContain("AUTHORITATIVE OUTPUT JSON SCHEMA");
  });

  it("accepts valid prompt QA JSON with human-readable notes", () => {
    const raw = JSON.stringify({
      prompt_id: "MVP1",
      status: "pass",
      checks: {
        subject_lock: "pass",
        view_coverage: "pass",
        camera_specificity: "pass",
        cross_view_consistency: "pass",
        photographic_realism: "pass",
        technical_safety: "pass",
        ambiguity: "pass"
      },
      check_notes: {
        subject_lock: "Identity and immutable product features are explicit.",
        view_coverage: "Every required camera view is explicitly requested.",
        camera_specificity: "Capture parameters are concrete and mutually plausible.",
        cross_view_consistency: "The same exact product geometry is required in every panel.",
        photographic_realism: "Lighting and processing target believable smartphone photography.",
        technical_safety: "Unsupported hidden internals are explicitly forbidden.",
        ambiguity: "No important product or camera decision is left open."
      },
      summary: "The prompt is sufficiently constrained to generate the canonical A0 reference pack.",
      critical_issues: [],
      repair_actions: []
    });
    expect(parseAndValidateQaJson(raw, "multiview_prompt_qa").status).toBe("pass");
  });

  it("rejects the old status-only format because it is not informative enough", () => {
    const raw = JSON.stringify({
      prompt_id: "MVP1",
      status: "pass",
      checks: {
        subject_lock: "pass",
        view_coverage: "pass",
        camera_specificity: "pass",
        cross_view_consistency: "pass",
        photographic_realism: "pass",
        technical_safety: "pass",
        ambiguity: "pass"
      },
      critical_issues: [],
      repair_actions: []
    });
    expect(() => parseAndValidateQaJson(raw, "multiview_prompt_qa")).toThrow(/sai contract/);
  });
});
