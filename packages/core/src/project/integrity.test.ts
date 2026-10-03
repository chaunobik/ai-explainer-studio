import {describe, expect, it} from "vitest";
import {
  validateImageManifestIntegrity,
  validatePromptQaIntegrity,
} from "./integrity";

describe("project integrity", () => {
  it("rejects approved derived assets whose parent is not approved", () => {
    const report = validateImageManifestIntegrity({
      project_id: "P1",
      assets: [
        {
          asset_id: "A1",
          project_id: "P1",
          status: "qa_pending",
          parent_asset_ids: [],
          file: {uri: "assets/A1.png"},
        },
        {
          asset_id: "A2",
          project_id: "P1",
          status: "approved",
          parent_asset_ids: ["A1"],
          file: {uri: "assets/A2.png", checksum: "abc"},
        },
      ],
    });

    expect(report.ok).toBe(false);
    expect(report.errors.map((value) => value.code)).toContain(
      "IMAGE_APPROVED_WITH_UNAPPROVED_PARENT",
    );
  });

  it("maps prompt QA by prompt_id and catches duplicate/orphan QA", () => {
    const report = validatePromptQaIntegrity(
      [
        {prompt_id: "IP1"},
        {prompt_id: "IP2"},
      ],
      [
        {prompt_id: "IP2", status: "pass"},
        {prompt_id: "IP2", status: "pass"},
        {prompt_id: "IP9", status: "pass"},
      ],
    );

    expect(report.ok).toBe(false);
    expect(report.errors.map((value) => value.code)).toContain("PROMPT_QA_DUP_ID");
    expect(report.errors.map((value) => value.code)).toContain("PROMPT_QA_ORPHAN");
    expect(report.warnings.map((value) => value.code)).toContain("PROMPT_QA_MISSING");
  });
});
