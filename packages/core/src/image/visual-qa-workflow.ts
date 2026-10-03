import type { BaseImageSpec, ImageAsset } from "./types";

export const DEFAULT_MAX_VISUAL_ATTEMPTS = 3;

export interface VisualQaAssessment {
  qaId: string;
  status: "pass" | "fail" | "needs_human_review";
  repairActions: string[];
  criticalViolations: string[];
}

export interface VisualQaDecision {
  action: "approve" | "retry" | "human_review";
  asset: ImageAsset;
  nextAttempt?: number;
}

export function applyVisualQa(
  asset: ImageAsset,
  assessment: VisualQaAssessment,
  maxAttempts = DEFAULT_MAX_VISUAL_ATTEMPTS,
): VisualQaDecision {
  const qaResultIds = [...(asset.qaResultIds ?? []), assessment.qaId];

  if (assessment.status === "pass" && assessment.criticalViolations.length === 0) {
    return {
      action: "approve",
      asset: {
        ...asset,
        status: "approved",
        qaResultIds,
      },
    };
  }

  if (assessment.status === "needs_human_review") {
    return {
      action: "human_review",
      asset: {
        ...asset,
        status: "needs_human_review",
        qaResultIds,
      },
    };
  }

  const nextAttempt = asset.attempt + 1;

  if (nextAttempt >= maxAttempts) {
    return {
      action: "human_review",
      asset: {
        ...asset,
        status: "needs_human_review",
        qaResultIds,
      },
    };
  }

  return {
    action: "retry",
    nextAttempt,
    asset: {
      ...asset,
      status: "rejected",
      qaResultIds,
    },
  };
}

export function withVisualRepair<T extends BaseImageSpec>(
  spec: T,
  repairActions: string[],
  nextAttempt: number,
): T {
  return {
    ...spec,
    technicalConstraints: [
      ...spec.technicalConstraints,
      ...repairActions.map((action) => `Repair requirement: ${action}`),
    ],
    attempt: nextAttempt,
  };
}
