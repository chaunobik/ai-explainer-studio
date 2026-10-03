import type {ImageAsset} from "../image/types";
import type {VoiceAsset, VoiceSpec} from "../voice/types";

export type ReadinessCheckStatus =
  | "pass"
  | "ready"
  | "blocked"
  | "action_required"
  | "needs_human_review";

export interface ReadinessCheck {
  id: string;
  stage: string;
  status: ReadinessCheckStatus;
  message: string;
  action: string | null;
}

export interface ProjectReadinessReport {
  project_id: string;
  overall_status:
    | "blocked"
    | "action_required"
    | "render_ready"
    | "final_qa_required"
    | "complete"
    | "needs_human_review";
  checks: ReadinessCheck[];
  next_actions: string[];
}

export interface ImageExecutionEntryLike {
  asset_id: string;
  scene_id: string;
  executor: "image_provider" | "renderer";
  operation:
    | "generate_anchor"
    | "derive_scene"
    | "technical_diagram"
    | "programmatic_animation";
  depends_on_approved_assets: string[];
  status: string;
}

export interface ImageProviderJobLike {
  output_asset_id: string;
  reference_asset_ids: string[];
}

function imageAction(asset: ImageAsset | undefined, assetId: string): {
  status: ReadinessCheckStatus;
  message: string;
  action: string | null;
} {
  if (!asset) {
    return {
      status: "ready",
      message: `${assetId} has no imported asset record yet.`,
      action: `Generate/import ${assetId}, then run Visual QA.`,
    };
  }

  switch (asset.status) {
    case "approved":
      return {
        status: "pass",
        message: `${assetId} is approved.`,
        action: null,
      };
    case "needs_human_review":
      return {
        status: "needs_human_review",
        message: `${assetId} requires human review.`,
        action: `Review ${assetId} before continuing.`,
      };
    case "qa_pending":
      return {
        status: "action_required",
        message: `${assetId} is imported and waiting for Visual QA.`,
        action: `Run Visual QA for ${assetId}.`,
      };
    case "awaiting_import":
      return {
        status: "action_required",
        message: `${assetId} is waiting for an imported file.`,
        action: `Import the generated/reference file for ${assetId}.`,
      };
    case "rejected":
      return {
        status: "ready",
        message: `${assetId} failed QA and is ready for local repair.`,
        action: `Regenerate only ${assetId} using its repair actions.`,
      };
    case "planned":
    case "awaiting_generation":
    default:
      return {
        status: "ready",
        message: `${assetId} is ready for generation.`,
        action: `Generate ${assetId} from its approved prompt/job.`,
      };
  }
}

export function evaluateImageReadiness(
  executionEntries: ImageExecutionEntryLike[],
  providerJobs: ImageProviderJobLike[],
  assets: ImageAsset[],
): ReadinessCheck[] {
  const checks: ReadinessCheck[] = [];
  const byId = new Map(assets.map((asset) => [asset.assetId, asset]));
  const jobByOutput = new Map(
    providerJobs.map((job) => [job.output_asset_id, job]),
  );
  const outputIds = new Set(providerJobs.map((job) => job.output_asset_id));

  const externalReferences = new Set(
    providerJobs.flatMap((job) =>
      job.reference_asset_ids.filter((id) => !outputIds.has(id)),
    ),
  );

  for (const referenceId of externalReferences) {
    const result = imageAction(byId.get(referenceId), referenceId);
    checks.push({
      id: `image-reference:${referenceId}`,
      stage: "visual_assets",
      ...result,
      message:
        result.status === "pass"
          ? `External reference ${referenceId} is approved.`
          : `External reference ${referenceId} is not approved. ${result.message}`,
    });
  }

  for (const entry of executionEntries) {
    if (entry.executor === "renderer") {
      checks.push({
        id: `renderer-asset:${entry.asset_id}`,
        stage: "motion",
        status: "pass",
        message: `${entry.asset_id} is programmatic and will be produced by the renderer.`,
        action: null,
      });
      continue;
    }

    const job = jobByOutput.get(entry.asset_id);
    const references = [
      ...(entry.depends_on_approved_assets ?? []),
      ...(job?.reference_asset_ids ?? []),
    ];
    const blockers = [...new Set(references)].filter(
      (id) => byId.get(id)?.status !== "approved",
    );

    if (blockers.length > 0) {
      checks.push({
        id: `image:${entry.asset_id}`,
        stage: "visual_assets",
        status: "blocked",
        message: `${entry.asset_id} is blocked by unapproved reference(s): ${blockers.join(", ")}.`,
        action: null,
      });
      continue;
    }

    const result = imageAction(byId.get(entry.asset_id), entry.asset_id);
    checks.push({
      id: `image:${entry.asset_id}`,
      stage: "visual_assets",
      ...result,
    });
  }

  return checks;
}

export function evaluateVoiceReadiness(
  spec: VoiceSpec,
  assets: VoiceAsset[],
): ReadinessCheck[] {
  const byId = new Map(assets.map((asset) => [asset.asset_id, asset]));

  return spec.segments.map((segment) => {
    const asset = byId.get(segment.output_asset_id);
    const id = `voice:${segment.output_asset_id}`;

    if (!asset) {
      return {
        id,
        stage: "voice",
        status: "ready",
        message: `${segment.output_asset_id} has not been generated/imported.`,
        action: `Generate/import narration for ${segment.scene_id} as ${segment.output_asset_id}.`,
      };
    }

    switch (asset.status) {
      case "approved":
        return {
          id,
          stage: "voice",
          status: "pass",
          message: `${segment.output_asset_id} is approved.`,
          action: null,
        };
      case "needs_human_review":
        return {
          id,
          stage: "voice",
          status: "needs_human_review",
          message: `${segment.output_asset_id} requires human review.`,
          action: `Review ${segment.output_asset_id}.`,
        };
      case "qa_pending":
        return {
          id,
          stage: "voice",
          status: "action_required",
          message: `${segment.output_asset_id} is waiting for Voice QA.`,
          action: `Run Voice QA for ${segment.output_asset_id}.`,
        };
      case "rejected":
        return {
          id,
          stage: "voice",
          status: "ready",
          message: `${segment.output_asset_id} failed QA.`,
          action: `Regenerate only ${segment.output_asset_id}.`,
        };
      case "awaiting_import":
        return {
          id,
          stage: "voice",
          status: "action_required",
          message: `${segment.output_asset_id} is waiting for an audio file.`,
          action: `Generate and import ${segment.output_asset_id}.`,
        };
      case "planned":
      case "awaiting_generation":
      default:
        return {
          id,
          stage: "voice",
          status: "ready",
          message: `${segment.output_asset_id} is ready for generation.`,
          action: `Generate narration for ${segment.scene_id}.`,
        };
    }
  });
}

export interface BuildReadinessInput {
  projectId: string;
  deterministicChecks: ReadinessCheck[];
  imageChecks: ReadinessCheck[];
  voiceChecks: ReadinessCheck[];
  outputExists: boolean;
  finalQaStatus?: "pass" | "fail" | "needs_human_review" | null;
}

export function buildReadinessReport(
  input: BuildReadinessInput,
): ProjectReadinessReport {
  const checks = [
    ...input.deterministicChecks,
    ...input.imageChecks,
    ...input.voiceChecks,
  ];

  let overall: ProjectReadinessReport["overall_status"];

  if (
    input.finalQaStatus === "needs_human_review" ||
    checks.some((check) => check.status === "needs_human_review")
  ) {
    overall = "needs_human_review";
  } else if (input.outputExists && input.finalQaStatus === "pass") {
    overall = "complete";
  } else if (input.outputExists) {
    overall = "final_qa_required";
  } else {
    const deterministicPass = input.deterministicChecks.every(
      (check) => check.status === "pass",
    );
    const imagePass = input.imageChecks.every(
      (check) => check.status === "pass",
    );
    const voicePass = input.voiceChecks.every(
      (check) => check.status === "pass",
    );

    if (deterministicPass && imagePass && voicePass) {
      overall = "render_ready";
    } else if (
      checks.some(
        (check) =>
          check.status === "ready" || check.status === "action_required",
      )
    ) {
      overall = "action_required";
    } else {
      overall = "blocked";
    }
  }

  const nextActions = checks
    .filter(
      (check) =>
        check.status === "ready" ||
        check.status === "action_required" ||
        check.status === "needs_human_review",
    )
    .map((check) => check.action)
    .filter((value): value is string => Boolean(value));

  if (overall === "render_ready") {
    nextActions.unshift("Run the final project render.");
  } else if (overall === "final_qa_required") {
    nextActions.unshift("Run Final Video QA on the rendered MP4.");
  } else if (overall === "complete") {
    nextActions.length = 0;
  }

  return {
    project_id: input.projectId,
    overall_status: overall,
    checks,
    next_actions: [...new Set(nextActions)],
  };
}
