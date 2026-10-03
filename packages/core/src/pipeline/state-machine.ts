import type {
  PipelineStage,
  ProjectPipelineState,
  StageState,
  StageStatus,
} from "./types";

export const DEFAULT_MAX_STAGE_ATTEMPTS = 3;

export const STAGE_DEPENDENCIES: Record<PipelineStage, PipelineStage[]> = {
  research: [],
  script: ["research"],
  storyboard: ["script"],
  visual_plan: ["storyboard"],
  image_prompt: ["visual_plan"],
  visual_assets: ["image_prompt"],
  motion: ["visual_assets"],
  voice: ["script"],
  final: ["motion", "voice"],
};

const allStages = Object.keys(STAGE_DEPENDENCIES) as PipelineStage[];

function makeStage(stage: PipelineStage, maxAttempts: number): StageState {
  return {
    stage,
    status: STAGE_DEPENDENCIES[stage].length === 0 ? "ready" : "blocked",
    attempt: 0,
    maxAttempts,
    artifactIds: [],
    blockers: [...STAGE_DEPENDENCIES[stage]],
  };
}

export function createPipelineState(
  projectId: string,
  maxAttempts = DEFAULT_MAX_STAGE_ATTEMPTS,
): ProjectPipelineState {
  const stages = Object.fromEntries(
    allStages.map((stage) => [stage, makeStage(stage, maxAttempts)]),
  ) as Record<PipelineStage, StageState>;

  return refreshPipelineState({ projectId, stages });
}

export function refreshPipelineState(
  state: ProjectPipelineState,
): ProjectPipelineState {
  const stages = structuredClone(state.stages);

  for (const stage of allStages) {
    const current = stages[stage];

    if (
      current.status === "passed" ||
      current.status === "in_progress" ||
      current.status === "needs_human_review"
    ) {
      continue;
    }

    const blockers = STAGE_DEPENDENCIES[stage].filter(
      (dependency) => stages[dependency].status !== "passed",
    );

    current.blockers = blockers;
    current.status = blockers.length === 0 ? "ready" : "blocked";
  }

  return { ...state, stages };
}

export function beginStage(
  state: ProjectPipelineState,
  stage: PipelineStage,
): ProjectPipelineState {
  const refreshed = refreshPipelineState(state);
  const current = refreshed.stages[stage];

  if (current.status !== "ready" && current.status !== "failed") {
    throw new Error(
      `Cannot begin stage ${stage} from status ${current.status}. Blockers: ${current.blockers.join(", ")}`,
    );
  }

  const stages = structuredClone(refreshed.stages);
  stages[stage].status = "in_progress";
  stages[stage].blockers = [];

  return { ...refreshed, stages };
}

export function completeStage(
  state: ProjectPipelineState,
  stage: PipelineStage,
  result: "pass" | "fail" | "needs_human_review",
  artifactIds: string[] = [],
): ProjectPipelineState {
  const stages = structuredClone(state.stages);
  const current = stages[stage];

  if (current.status !== "in_progress") {
    throw new Error(
      `Stage ${stage} must be in_progress before completion. Current status: ${current.status}.`,
    );
  }

  const nextAttempt = current.attempt + 1;
  current.attempt = nextAttempt;
  current.artifactIds = [...new Set([...current.artifactIds, ...artifactIds])];

  if (result === "pass") {
    current.status = "passed";
  } else if (
    result === "needs_human_review" ||
    nextAttempt >= current.maxAttempts
  ) {
    current.status = "needs_human_review";
  } else {
    current.status = "failed";
  }

  return refreshPipelineState({ ...state, stages });
}

export function retryStage(
  state: ProjectPipelineState,
  stage: PipelineStage,
): ProjectPipelineState {
  const stages = structuredClone(state.stages);
  const current = stages[stage];

  if (current.status !== "failed") {
    throw new Error(
      `Only failed stages can be retried. ${stage} is ${current.status}.`,
    );
  }

  current.status = "ready";
  return refreshPipelineState({ ...state, stages });
}

export function getReadyStages(state: ProjectPipelineState): PipelineStage[] {
  const refreshed = refreshPipelineState(state);
  return allStages.filter((stage) => refreshed.stages[stage].status === "ready");
}

export function getOverallStatus(
  state: ProjectPipelineState,
): "in_progress" | "needs_human_review" | "complete" {
  if (state.stages.final.status === "passed") return "complete";

  if (
    allStages.some(
      (stage) => state.stages[stage].status === "needs_human_review",
    )
  ) {
    return "needs_human_review";
  }

  return "in_progress";
}

export function isTerminalStatus(status: StageStatus): boolean {
  return status === "passed" || status === "needs_human_review";
}
