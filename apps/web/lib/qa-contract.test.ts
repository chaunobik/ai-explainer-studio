import {describe, expect, it} from "vitest";
import {buildQaContractAppendix, parseAndValidateQaJson} from "./qa-contract";

describe("QA contracts", () => {
  it("includes schema text", () => {
    expect(buildQaContractAppendix("multiview_prompt_qa")).toContain("AUTHORITATIVE OUTPUT JSON SCHEMA");
  });

  it("accepts valid prompt QA JSON", () => {
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
    expect(parseAndValidateQaJson(raw, "multiview_prompt_qa").status).toBe("pass");
  });
});
