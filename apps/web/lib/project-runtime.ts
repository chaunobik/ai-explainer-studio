
import fs from "node:fs";
import path from "node:path";
import {
  buildReadinessReport,
  deriveGuidedNextAction,
  evaluateImageReadiness,
  evaluateVoiceReadiness,
  validateCrossStageArtifacts,
  validateImageManifestIntegrity,
  validateMotionSpec,
  validatePromptQaIntegrity,
  validateVoiceSpecAgainstStoryboard,
  type GuidedNextAction,
  type ProjectReadinessReport,
  type ReadinessCheck,
} from "../../../packages/core/src/index";

export interface ProjectSummary {
  slug: string;
  project_id: string;
  topic: string;
  language: string;
}

export interface DashboardData {
  slug: string;
  projectDir: string;
  manifest: any;
  report: ProjectReadinessReport;
  guided: GuidedNextAction;
  promptSpecs: any[];
  promptQaById: Record<string, any>;
  promptQaTemplate: string;
  imageManifest: any;
  voiceManifest: any;
  usingImageTemplate: boolean;
  usingVoiceTemplate: boolean;
  health: {
    errors: number;
    warnings: number;
  };
}

export function repoRoot(): string {
  return path.resolve(process.cwd(), "../..");
}

export function examplesRoot(): string {
  return path.join(repoRoot(), "examples");
}

export function projectDirForSlug(slug: string): string {
  if (!/^[A-Za-z0-9._-]+$/.test(slug)) {
    throw new Error("Invalid project slug.");
  }
  const base = examplesRoot();
  const dir = path.resolve(base, slug);
  if (!(dir === base || dir.startsWith(base + path.sep))) {
    throw new Error("Project path escapes examples directory.");
  }
  return dir;
}

function readJson(filePath: string): any {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function qaCheck(
  id: string,
  stage: string,
  qa: any,
  label: string,
  onError: () => void,
): ReadinessCheck {
  const status = qa?.qa_result?.status;
  if (status === "pass") {
    return {id, stage, status: "pass", message: `${label} passed.`, action: null};
  }
  if (status === "needs_human_review") {
    return {
      id,
      stage,
      status: "needs_human_review",
      message: `${label} requires human review.`,
      action: `Review ${label}.`,
    };
  }
  onError();
  return {
    id,
    stage,
    status: "blocked",
    message: `${label} is not PASS.`,
    action: null,
  };
}

export function listProjects(): ProjectSummary[] {
  const base = examplesRoot();
  if (!fs.existsSync(base)) return [];

  return fs
    .readdirSync(base, {withFileTypes: true})
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const projectPath = path.join(base, entry.name, "project.json");
      if (!fs.existsSync(projectPath)) return [];
      try {
        const manifest = readJson(projectPath);
        return [{
          slug: entry.name,
          project_id: manifest.project_id,
          topic: manifest.topic,
          language: manifest.language,
        }];
      } catch {
        return [];
      }
    });
}

export function loadProjectDashboard(slug: string): DashboardData {
  const projectDir = projectDirForSlug(slug);
  const projectPath = path.join(projectDir, "project.json");
  if (!fs.existsSync(projectPath)) {
    throw new Error(`Project not found: ${slug}`);
  }

  const manifest = readJson(projectPath);
  const p = manifest.paths;
  const rel = (name: string): string => path.resolve(projectDir, name);
  let contractErrors = 0;
  let warnings = 0;

  const requiredJson = (relativePath: string, label: string): any => {
    const file = rel(relativePath);
    if (!fs.existsSync(file)) {
      contractErrors += 1;
      throw new Error(`Missing required ${label}: ${file}`);
    }
    return readJson(file);
  };

  const research = requiredJson(p.research_result, "research result");
  const researchQa = requiredJson(p.research_qa_output, "research QA");
  const script = requiredJson(p.script_spec, "script");
  const scriptQa = requiredJson(p.script_qa_output, "script QA");
  const storyboard = requiredJson(p.storyboard_spec, "storyboard");
  const storyboardQa = requiredJson(p.storyboard_qa_output, "storyboard QA");
  const visualPlan = requiredJson(p.visual_plan, "visual plan");
  const continuityQa = requiredJson(p.continuity_qa_output, "continuity QA");
  const executionPlan = requiredJson(p.asset_execution_plan, "asset execution plan");
  const motion = requiredJson(p.motion_spec, "motion spec");
  const voiceSpec = requiredJson(p.voice_spec, "voice spec");

  const promptSpecs = p.image_prompt_specs.map((file: string) =>
    requiredJson(file, "image prompt spec"),
  );
  const providerJobs = p.image_provider_jobs.map((file: string) =>
    requiredJson(file, "image provider job"),
  );

  const deterministicChecks: ReadinessCheck[] = [];
  const cross = validateCrossStageArtifacts({
    researchResult: research,
    claims: researchQa.claims,
    script,
    storyboard,
    visualPlan,
    imagePromptSpecs: promptSpecs,
    providerJobs,
    executionPlan,
  });

  if (cross.ok) {
    deterministicChecks.push({
      id: "cross-stage",
      stage: "pipeline",
      status: "pass",
      message: "Cross-stage traceability and dependency invariants pass.",
      action: null,
    });
  } else {
    contractErrors += cross.errors.length;
    deterministicChecks.push({
      id: "cross-stage",
      stage: "pipeline",
      status: "blocked",
      message: cross.errors.map((e) => `[${e.code}] ${e.message}`).join(" | "),
      action: null,
    });
  }

  const addError = () => { contractErrors += 1; };
  deterministicChecks.push(
    qaCheck("research-qa", "research", researchQa, "Research QA", addError),
    qaCheck("script-qa", "script", scriptQa, "Script QA", addError),
    qaCheck("storyboard-qa", "storyboard", storyboardQa, "Storyboard QA", addError),
    qaCheck("continuity-qa", "visual_plan", continuityQa, "Continuity QA", addError),
  );

  const storyboardDurations = new Map<string, number>(
    storyboard.scenes.map((scene: any) => [scene.scene_id, Number(scene.duration_sec)]),
  );
  const motionReport = validateMotionSpec(motion, storyboardDurations);
  if (motionReport.ok) {
    deterministicChecks.push({
      id: "motion-spec",
      stage: "motion",
      status: "pass",
      message: "MotionSpec passes deterministic timing and coverage checks.",
      action: null,
    });
  } else {
    contractErrors += motionReport.errors.length;
    deterministicChecks.push({
      id: "motion-spec",
      stage: "motion",
      status: "blocked",
      message: motionReport.errors.map((e) => `[${e.code}] ${e.message}`).join(" | "),
      action: null,
    });
  }

  const voicePlanReport = validateVoiceSpecAgainstStoryboard(voiceSpec, storyboard);
  if (voicePlanReport.ok) {
    deterministicChecks.push({
      id: "voice-spec",
      stage: "voice",
      status: "pass",
      message: "VoiceSpec exactly matches storyboard narration and timing.",
      action: null,
    });
  } else {
    contractErrors += voicePlanReport.errors.length;
    deterministicChecks.push({
      id: "voice-spec",
      stage: "voice",
      status: "blocked",
      message: voicePlanReport.errors.map((e) => `[${e.code}] ${e.message}`).join(" | "),
      action: null,
    });
  }

  const promptQaById = new Map<string, any>();
  for (const relativeQaPath of p.image_prompt_qa_outputs as string[]) {
    const qaPath = rel(relativeQaPath);
    if (!fs.existsSync(qaPath)) continue;
    const qa = readJson(qaPath);
    if (typeof qa?.prompt_id === "string") promptQaById.set(qa.prompt_id, qa);
  }

  for (const prompt of promptSpecs) {
    const qa = promptQaById.get(prompt.prompt_id);
    if (!qa) {
      deterministicChecks.push({
        id: `prompt-qa:${prompt.asset_id}`,
        stage: "image_prompt",
        status: "action_required",
        message: `Prompt QA result is missing for ${prompt.asset_id} (${prompt.prompt_id}).`,
        action: `Run Image Prompt QA for ${prompt.asset_id}.`,
      });
    } else if (qa.status === "pass") {
      deterministicChecks.push({
        id: `prompt-qa:${prompt.asset_id}`,
        stage: "image_prompt",
        status: "pass",
        message: `Image Prompt QA passed for ${prompt.asset_id}.`,
        action: null,
      });
    } else if (qa.status === "needs_human_review") {
      deterministicChecks.push({
        id: `prompt-qa:${prompt.asset_id}`,
        stage: "image_prompt",
        status: "needs_human_review",
        message: `Image Prompt QA for ${prompt.asset_id} needs human review.`,
        action: `Review prompt ${prompt.prompt_id}.`,
      });
    } else {
      deterministicChecks.push({
        id: `prompt-qa:${prompt.asset_id}`,
        stage: "image_prompt",
        status: "action_required",
        message: `Image Prompt QA failed for ${prompt.asset_id}.`,
        action: `Repair prompt ${prompt.prompt_id} and rerun Prompt QA.`,
      });
    }
  }

  const promptIntegrity = validatePromptQaIntegrity(
    promptSpecs,
    [...promptQaById.values()],
  );
  contractErrors += promptIntegrity.errors.length;
  warnings += promptIntegrity.warnings.length;
  if (!promptIntegrity.ok) {
    deterministicChecks.push({
      id: "prompt-qa-integrity",
      stage: "image_prompt",
      status: "blocked",
      message: promptIntegrity.errors.map((e) => `[${e.code}] ${e.message}`).join(" | "),
      action: null,
    });
  }

  const imageManifestPath = rel(p.image_assets_manifest);
  const usingImageTemplate = !fs.existsSync(imageManifestPath);
  const imageManifest = readJson(
    usingImageTemplate ? rel(p.image_assets_template) : imageManifestPath,
  );
  const imageIntegrity = validateImageManifestIntegrity(imageManifest);
  contractErrors += imageIntegrity.errors.length;
  warnings += imageIntegrity.warnings.length;

  const imageAssets = imageManifest.assets.map((asset: any) => ({
    assetId: asset.asset_id,
    projectId: asset.project_id,
    sceneId: asset.scene_id ?? undefined,
    assetRole: asset.asset_role,
    status: asset.status,
    entityIds: asset.entity_ids,
    parentAssetIds: asset.parent_asset_ids,
    attempt: asset.attempt,
    provenance: {
      providerId: asset.provenance.provider_id,
      providerMode: asset.provenance.provider_mode,
      operation: asset.provenance.operation,
      sourceUri: asset.provenance.source_uri ?? undefined,
      promptSnapshot: asset.provenance.prompt_snapshot ?? undefined,
      notes: asset.provenance.notes,
    },
    file: {
      uri: asset.file.uri ?? undefined,
      mimeType: asset.file.mime_type ?? undefined,
      width: asset.file.width ?? undefined,
      height: asset.file.height ?? undefined,
      checksum: asset.file.checksum ?? undefined,
    },
    qaResultIds: asset.qa_result_ids,
  }));

  let imageChecks = evaluateImageReadiness(
    executionPlan.assets,
    providerJobs,
    imageAssets,
  );

  if (usingImageTemplate) {
    imageChecks.unshift({
      id: "image-manifest",
      stage: "visual_assets",
      status: "action_required",
      message: "Actual image-assets.json does not exist; the template is being used.",
      action: "Import the first real image asset; the UI will create image-assets.json automatically.",
    });
  }

  for (const asset of imageManifest.assets) {
    if (asset.status !== "approved") continue;
    const uri = asset.file?.uri;
    if (!(typeof uri === "string" && fs.existsSync(rel(uri)))) {
      imageChecks.push({
        id: `image-file:${asset.asset_id}`,
        stage: "visual_assets",
        status: "action_required",
        message: `${asset.asset_id} is approved but its file is missing.`,
        action: `Re-import ${asset.asset_id}.`,
      });
    }
  }

  const visualInputsReady = imageChecks.every((check) => check.status === "pass");
  const motionQaPath = rel(p.motion_qa_output);
  if (fs.existsSync(motionQaPath)) {
    deterministicChecks.push(
      qaCheck("motion-qa", "motion", readJson(motionQaPath), "Motion QA", addError),
    );
  } else if (visualInputsReady) {
    deterministicChecks.push({
      id: "motion-qa",
      stage: "motion",
      status: "action_required",
      message: "Motion QA result is missing.",
      action: "Render previews, run Motion QA, then save the result.",
    });
  } else {
    deterministicChecks.push({
      id: "motion-qa",
      stage: "motion",
      status: "blocked",
      message: "Motion QA waits until required visual assets are approved.",
      action: null,
    });
  }

  const voiceManifestPath = rel(p.voice_assets_manifest);
  const usingVoiceTemplate = !fs.existsSync(voiceManifestPath);
  const voiceManifest = readJson(
    usingVoiceTemplate ? rel(p.voice_assets_template) : voiceManifestPath,
  );
  let voiceChecks = evaluateVoiceReadiness(voiceSpec, voiceManifest.assets);

  if (usingVoiceTemplate) {
    voiceChecks.unshift({
      id: "voice-manifest",
      stage: "voice",
      status: "action_required",
      message: "Actual voice-assets.json does not exist; the template is being used.",
      action: "Import the first voice clip; the UI will create voice-assets.json automatically.",
    });
  }

  for (const asset of voiceManifest.assets) {
    if (asset.status !== "approved") continue;
    const uri = asset.file?.uri;
    if (!(typeof uri === "string" && fs.existsSync(rel(uri)))) {
      voiceChecks.push({
        id: `voice-file:${asset.asset_id}`,
        stage: "voice",
        status: "action_required",
        message: `${asset.asset_id} is approved but its audio file is missing.`,
        action: `Re-import ${asset.asset_id}.`,
      });
    }
  }

  const outputExists = fs.existsSync(rel(p.output_file));
  let finalQaStatus: "pass" | "fail" | "needs_human_review" | null = null;
  const finalQaPath = rel(p.final_qa_output);
  if (fs.existsSync(finalQaPath)) {
    const finalQa = readJson(finalQaPath);
    finalQaStatus = finalQa?.qa_result?.status ?? null;
    if (finalQaStatus === "fail") {
      deterministicChecks.push({
        id: "final-qa-failed",
        stage: "final",
        status: "action_required",
        message: "Final Video QA failed.",
        action: Array.isArray(finalQa.repair_actions)
          ? finalQa.repair_actions.join(" | ")
          : "Repair affected scenes and rerun Final QA.",
      });
    }
  }

  const report = buildReadinessReport({
    projectId: manifest.project_id,
    deterministicChecks,
    imageChecks,
    voiceChecks,
    outputExists,
    finalQaStatus,
  });

  const promptIdByAsset = Object.fromEntries(
    promptSpecs.map((prompt: any) => [prompt.asset_id, prompt.prompt_id]),
  );

  const guided = deriveGuidedNextAction(report, {promptIdByAsset});

  return {
    slug,
    projectDir,
    manifest,
    report,
    guided,
    promptSpecs,
    promptQaById: Object.fromEntries(promptQaById),
    promptQaTemplate: fs.readFileSync(
      path.join(repoRoot(), "prompts", "image-prompt-qa", "IMAGE_PROMPT_QA_PROMPT.md"),
      "utf8",
    ),
    imageManifest,
    voiceManifest,
    usingImageTemplate,
    usingVoiceTemplate,
    health: {errors: contractErrors, warnings},
  };
}
