import type {ImageAssetStatus, ImageProviderMode} from "./types";

export const MANUAL_OPERATOR_REVIEW_PREFIX = "MANUAL-OPERATOR-REVIEW";

export function isOperatorReviewedImageMode(
  providerMode: ImageProviderMode | "import",
): boolean {
  return providerMode === "manual";
}

export function manualOperatorReviewId(assetId: string): string {
  return `${MANUAL_OPERATOR_REVIEW_PREFIX}:${assetId}`;
}

export function statusAfterImageImport(
  providerMode: ImageProviderMode | "import",
): "approved" | "qa_pending" {
  return isOperatorReviewedImageMode(providerMode) ? "approved" : "qa_pending";
}

export function shouldMigrateManualImageToApproved(input: {
  providerMode: ImageProviderMode | "import";
  status: ImageAssetStatus;
  fileExists: boolean;
}): boolean {
  return (
    isOperatorReviewedImageMode(input.providerMode) &&
    input.fileExists &&
    (input.status === "qa_pending" || input.status === "needs_human_review")
  );
}
