import {describe, expect, it} from "vitest";
import {
  isOperatorReviewedImageMode,
  manualOperatorReviewId,
  shouldMigrateManualImageToApproved,
  statusAfterImageImport,
} from "./review-policy";

describe("manual image review policy", () => {
  it("treats a manual upload as already operator-reviewed", () => {
    expect(isOperatorReviewedImageMode("manual")).toBe(true);
    expect(statusAfterImageImport("manual")).toBe("approved");
    expect(manualOperatorReviewId("A0")).toBe("MANUAL-OPERATOR-REVIEW:A0");
  });

  it("keeps API-generated images behind visual QA", () => {
    expect(isOperatorReviewedImageMode("api")).toBe(false);
    expect(statusAfterImageImport("api")).toBe("qa_pending");
  });

  it("migrates old manual review states only when the file exists", () => {
    expect(
      shouldMigrateManualImageToApproved({
        providerMode: "manual",
        status: "needs_human_review",
        fileExists: true,
      }),
    ).toBe(true);
    expect(
      shouldMigrateManualImageToApproved({
        providerMode: "api",
        status: "needs_human_review",
        fileExists: true,
      }),
    ).toBe(false);
    expect(
      shouldMigrateManualImageToApproved({
        providerMode: "manual",
        status: "rejected",
        fileExists: true,
      }),
    ).toBe(false);
  });
});
