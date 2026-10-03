export type ValidationSeverity = "error" | "warning";

export interface ValidationIssue {
  code: string;
  severity: ValidationSeverity;
  path: string;
  message: string;
}

export interface ValidationReport {
  ok: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export type PipelineStage =
  | "research"
  | "script"
  | "storyboard"
  | "visual_plan"
  | "image_prompt"
  | "visual_assets"
  | "motion"
  | "voice"
  | "final";

export type StageStatus =
  | "blocked"
  | "ready"
  | "in_progress"
  | "passed"
  | "failed"
  | "needs_human_review";

export interface StageState {
  stage: PipelineStage;
  status: StageStatus;
  attempt: number;
  maxAttempts: number;
  artifactIds: string[];
  blockers: string[];
}

export interface ProjectPipelineState {
  projectId: string;
  stages: Record<PipelineStage, StageState>;
}

export interface ArtifactRecord<T = unknown> {
  id: string;
  kind: string;
  projectId: string;
  revision: number;
  status: "draft" | "pending_qa" | "approved" | "rejected" | "needs_human_review";
  data: T;
  parentIds: string[];
  createdAt: string;
  updatedAt: string;
}
