export const AUTONOMOUS_STAGE_ORDER = [
  "research",
  "script",
  "storyboard",
  "asset_plan",
  "canonical_prompt",
  "canonical_generation",
  "canonical_qa",
  "checkpoint_canonical",
  "scene_prompts",
  "storyboard_preview",
  "checkpoint_storyboard",
  "scene_generation",
  "scene_qa",
  "voice",
  "motion",
  "final_render",
  "final_qa",
  "checkpoint_final",
  "complete",
] as const;

export type AutonomousStage = (typeof AUTONOMOUS_STAGE_ORDER)[number];
export type AutonomousCheckpoint =
  | "checkpoint_canonical"
  | "checkpoint_storyboard"
  | "checkpoint_final";
export type AutonomousStageStatus =
  | "waiting"
  | "ready"
  | "running"
  | "passed"
  | "auto_repair"
  | "needs_human_review"
  | "approved"
  | "complete";

export interface AutonomousStageState {
  stage: AutonomousStage;
  status: AutonomousStageStatus;
  attempt: number;
  maxAttempts: number;
  lastMessage: string | null;
}

export interface AutonomousRevision {
  checkpoint: AutonomousCheckpoint;
  targetStage: AutonomousStage;
  note: string;
  createdAt: string;
}

export interface AutonomousRunState {
  runId: string;
  projectId: string;
  topic: string;
  currentStage: AutonomousStage;
  stages: Record<AutonomousStage, AutonomousStageState>;
  revisionHistory: AutonomousRevision[];
  createdAt: string;
  updatedAt: string;
}

export type AutonomousDirectiveKind =
  | "run_stage"
  | "repair_and_retry"
  | "human_intervention"
  | "complete";

export interface AutonomousDirective {
  kind: AutonomousDirectiveKind;
  stage: AutonomousStage;
  message: string;
  allowedActions: string[];
}

export const AUTONOMOUS_CHECKPOINTS: Record<
  AutonomousCheckpoint,
  {label: string; summary: string}
> = {
  checkpoint_canonical: {
    label: "Automatic Gate A — Canonical asset",
    summary:
      "A0 is accepted automatically when canonical QA passes; no operator approval is required.",
  },
  checkpoint_storyboard: {
    label: "Automatic Gate B — Storyboard and keyframes",
    summary:
      "Storyboard/keyframes advance automatically after QA; no operator approval is required.",
  },
  checkpoint_final: {
    label: "Automatic Gate C — Final output",
    summary:
      "A passing final QA completes the run automatically.",
  },
};

const checkpointSet = new Set<AutonomousStage>(
  Object.keys(AUTONOMOUS_CHECKPOINTS) as AutonomousCheckpoint[],
);

const revisionTargets: Record<AutonomousCheckpoint, AutonomousStage[]> = {
  checkpoint_canonical: ["canonical_prompt", "canonical_generation"],
  checkpoint_storyboard: ["storyboard", "asset_plan", "scene_prompts", "storyboard_preview"],
  checkpoint_final: ["scene_generation", "scene_qa", "voice", "motion", "final_render"],
};

const invalidationByTarget: Partial<Record<AutonomousStage, AutonomousStage[]>> = {
  canonical_prompt: [
    "canonical_prompt",
    "canonical_generation",
    "canonical_qa",
    "checkpoint_canonical",
  ],
  canonical_generation: [
    "canonical_generation",
    "canonical_qa",
    "checkpoint_canonical",
  ],
  storyboard: [
    "storyboard",
    "asset_plan",
    "scene_prompts",
    "storyboard_preview",
    "checkpoint_storyboard",
  ],
  asset_plan: [
    "asset_plan",
    "scene_prompts",
    "storyboard_preview",
    "checkpoint_storyboard",
  ],
  scene_prompts: ["scene_prompts", "storyboard_preview", "checkpoint_storyboard"],
  storyboard_preview: ["storyboard_preview", "checkpoint_storyboard"],
  scene_generation: [
    "scene_generation",
    "scene_qa",
    "motion",
    "final_render",
    "final_qa",
    "checkpoint_final",
  ],
  scene_qa: ["scene_qa", "motion", "final_render", "final_qa", "checkpoint_final"],
  voice: ["voice", "final_render", "final_qa", "checkpoint_final"],
  motion: ["motion", "final_render", "final_qa", "checkpoint_final"],
  final_render: ["final_render", "final_qa", "checkpoint_final"],
};

function nowIso(): string {
  return new Date().toISOString();
}

function stageIndex(stage: AutonomousStage): number {
  return AUTONOMOUS_STAGE_ORDER.indexOf(stage);
}

function nextStage(stage: AutonomousStage): AutonomousStage {
  const index = stageIndex(stage);
  if (index < 0 || index >= AUTONOMOUS_STAGE_ORDER.length - 1) {
    return "complete";
  }
  return AUTONOMOUS_STAGE_ORDER[index + 1];
}

function advanceAcrossAutomaticGates(
  state: AutonomousRunState,
  requestedStage: AutonomousStage,
): AutonomousRunState {
  const stages = structuredClone(state.stages);
  let stage = requestedStage;

  while (checkpointSet.has(stage)) {
    const checkpoint = stage as AutonomousCheckpoint;
    stages[checkpoint].status = "approved";
    stages[checkpoint].lastMessage =
      "Automatically approved because the upstream QA gate passed.";
    stage = nextStage(checkpoint);
  }

  if (stage === "complete") {
    stages.complete.status = "complete";
  } else {
    stages[stage].status = "ready";
  }

  return {
    ...state,
    currentStage: stage,
    stages,
    updatedAt: nowIso(),
  };
}

export function createAutonomousRunState(input: {
  runId: string;
  projectId: string;
  topic: string;
  maxAttempts?: number;
  createdAt?: string;
}): AutonomousRunState {
  const maxAttempts = input.maxAttempts ?? 3;
  const createdAt = input.createdAt ?? nowIso();
  const stages = Object.fromEntries(
    AUTONOMOUS_STAGE_ORDER.map((stage) => [
      stage,
      {
        stage,
        status: "waiting",
        attempt: 0,
        maxAttempts,
        lastMessage: null,
      } satisfies AutonomousStageState,
    ]),
  ) as Record<AutonomousStage, AutonomousStageState>;

  stages.research.status = "ready";

  return {
    runId: input.runId,
    projectId: input.projectId,
    topic: input.topic,
    currentStage: "research",
    stages,
    revisionHistory: [],
    createdAt,
    updatedAt: createdAt,
  };
}

export function beginAutonomousStage(
  state: AutonomousRunState,
): AutonomousRunState {
  const stage = state.currentStage;
  if (checkpointSet.has(stage) || stage === "complete") {
    throw new Error(`Cannot begin machine work for ${stage}.`);
  }

  const current = state.stages[stage];
  if (current.status !== "ready" && current.status !== "auto_repair") {
    throw new Error(
      `Stage ${stage} must be ready or auto_repair. Current status: ${current.status}.`,
    );
  }

  const stages = structuredClone(state.stages);
  stages[stage].status = "running";
  stages[stage].attempt += 1;
  return {...state, stages, updatedAt: nowIso()};
}

export function recordAutonomousStageResult(
  state: AutonomousRunState,
  result: "pass" | "fail" | "needs_human_review",
  message: string | null = null,
): AutonomousRunState {
  const stage = state.currentStage;
  if (checkpointSet.has(stage) || stage === "complete") {
    throw new Error(`Use automatic-gate or completion actions for ${stage}.`);
  }

  const current = state.stages[stage];
  if (current.status !== "running") {
    throw new Error(
      `Stage ${stage} must be running before recording a result. Current status: ${current.status}.`,
    );
  }

  const stages = structuredClone(state.stages);
  stages[stage].lastMessage = message;

  if (result === "pass") {
    stages[stage].status = "passed";
    return advanceAcrossAutomaticGates(
      {...state, stages, updatedAt: nowIso()},
      nextStage(stage),
    );
  }

  if (result === "needs_human_review") {
    stages[stage].status = "needs_human_review";
    return {...state, stages, updatedAt: nowIso()};
  }

  if (stages[stage].attempt >= stages[stage].maxAttempts) {
    stages[stage].status = "needs_human_review";
  } else {
    stages[stage].status = "auto_repair";
  }

  return {...state, stages, updatedAt: nowIso()};
}

export function resumeAutonomousStageAfterHumanReview(
  state: AutonomousRunState,
  message: string | null = null,
): AutonomousRunState {
  const stage = state.currentStage;
  if (checkpointSet.has(stage) || stage === "complete") {
    throw new Error("Automatic gate stages do not require human review.");
  }
  if (state.stages[stage].status !== "needs_human_review") {
    throw new Error(`Stage ${stage} is not waiting for human review.`);
  }

  const stages = structuredClone(state.stages);
  stages[stage].status = "ready";
  stages[stage].attempt = 0;
  stages[stage].lastMessage = message;
  return {...state, stages, updatedAt: nowIso()};
}

/**
 * Backward-compatible helper for old state files that were persisted while
 * checkpoints still required manual approval. New runs skip these gates.
 */
export function approveAutonomousCheckpoint(
  state: AutonomousRunState,
): AutonomousRunState {
  const checkpoint = state.currentStage;
  if (!checkpointSet.has(checkpoint)) {
    throw new Error(`Current stage ${checkpoint} is not a checkpoint.`);
  }

  const typedCheckpoint = checkpoint as AutonomousCheckpoint;
  const stages = structuredClone(state.stages);
  stages[typedCheckpoint].status = "approved";
  stages[typedCheckpoint].lastMessage = "Approved while migrating a legacy run.";
  return advanceAcrossAutomaticGates(
    {...state, stages, updatedAt: nowIso()},
    nextStage(typedCheckpoint),
  );
}

export function reviseAutonomousCheckpoint(
  state: AutonomousRunState,
  targetStage: AutonomousStage,
  note: string,
): AutonomousRunState {
  const checkpoint = state.currentStage;
  if (!checkpointSet.has(checkpoint)) {
    throw new Error(`Current stage ${checkpoint} is not a checkpoint.`);
  }

  const typedCheckpoint = checkpoint as AutonomousCheckpoint;
  if (!revisionTargets[typedCheckpoint].includes(targetStage)) {
    throw new Error(
      `Cannot revise ${targetStage} from ${typedCheckpoint}. Allowed targets: ${revisionTargets[
        typedCheckpoint
      ].join(", ")}.`,
    );
  }

  const invalidated = invalidationByTarget[targetStage] ?? [targetStage];
  const stages = structuredClone(state.stages);
  for (const stage of invalidated) {
    stages[stage].status = "waiting";
    stages[stage].attempt = 0;
    stages[stage].lastMessage = null;
  }
  stages[targetStage].status = "ready";

  const revision: AutonomousRevision = {
    checkpoint: typedCheckpoint,
    targetStage,
    note,
    createdAt: nowIso(),
  };

  return {
    ...state,
    currentStage: targetStage,
    stages,
    revisionHistory: [...state.revisionHistory, revision],
    updatedAt: revision.createdAt,
  };
}

export function getAutonomousDirective(
  state: AutonomousRunState,
): AutonomousDirective {
  const stage = state.currentStage;
  const current = state.stages[stage];

  if (stage === "complete" || current.status === "complete") {
    return {
      kind: "complete",
      stage: "complete",
      message: "Autonomous run is complete.",
      allowedActions: [],
    };
  }

  if (checkpointSet.has(stage)) {
    return {
      kind: "run_stage",
      stage,
      message:
        "Legacy checkpoint detected. Auto-approve this gate and continue; do not interrupt the user.",
      allowedActions: ["auto_approve"],
    };
  }

  if (current.status === "auto_repair") {
    return {
      kind: "repair_and_retry",
      stage,
      message:
        current.lastMessage ??
        `${stage} failed validation. Diagnose, minimally repair and retry automatically.`,
      allowedActions: ["repair", "retry"],
    };
  }

  if (current.status === "needs_human_review") {
    return {
      kind: "human_intervention",
      stage,
      message:
        current.lastMessage ??
        `${stage} still fails after automatic repair attempts or a required provider is unavailable.`,
      allowedActions: ["edit", "resume"],
    };
  }

  return {
    kind: "run_stage",
    stage,
    message:
      current.status === "running"
        ? `Continue ${stage} until its artifacts and QA are complete.`
        : `Execute ${stage} automatically and validate the result.`,
    allowedActions: ["begin", "pass", "fail"],
  };
}
