import fs from "node:fs";
import path from "node:path";
import {
  buildReadinessReport,
  evaluateImageReadiness,
  evaluateVoiceReadiness,
  validateCrossStageArtifacts,
  validateMotionSpec,
  validateVoiceSpecAgainstStoryboard,
  type ReadinessCheck,
} from "../packages/core/src/index";

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

const jsonMode = process.argv.includes("--json");
const ciMode = process.argv.includes("--ci");
const root = process.cwd();
const projectDir = path.resolve(arg("project") ?? "examples/fridge-hot-behind");
const projectPath = path.join(projectDir, "project.json");

function readJson(filePath: string): any {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function rel(name: string): string {
  return path.resolve(projectDir, name);
}

if (!fs.existsSync(projectPath)) {
  throw new Error(`Missing project manifest: ${projectPath}`);
}

const manifest = readJson(projectPath);
const p = manifest.paths;
let contractErrors = 0;

function requiredJson(relativePath: string, label: string): any {
  const file = rel(relativePath);
  if (!fs.existsSync(file)) {
    contractErrors += 1;
    throw new Error(`Missing required ${label}: ${file}`);
  }
  return readJson(file);
}

function qaCheck(
  id: string,
  stage: string,
  qa: any,
  label: string,
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

  contractErrors += 1;
  return {
    id,
    stage,
    status: "blocked",
    message: `${label} is not PASS.`,
    action: null,
  };
}

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

const imagePromptSpecs = p.image_prompt_specs.map((file: string) =>
  requiredJson(file, "image prompt spec"),
);
const providerJobs = p.image_provider_jobs.map((file: string) =>
  requiredJson(file, "image provider job"),
);

const cross = validateCrossStageArtifacts({
  researchResult: research,
  claims: researchQa.claims,
  script,
  storyboard,
  visualPlan,
  imagePromptSpecs,
  providerJobs,
  executionPlan,
});

const deterministicChecks: ReadinessCheck[] = [];

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

deterministicChecks.push(
  qaCheck("research-qa", "research", researchQa, "Research QA"),
  qaCheck("script-qa", "script", scriptQa, "Script QA"),
  qaCheck("storyboard-qa", "storyboard", storyboardQa, "Storyboard QA"),
  qaCheck("continuity-qa", "visual_plan", continuityQa, "Continuity QA"),
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

for (let i = 0; i < p.image_prompt_qa_outputs.length; i += 1) {
  const qaPath = rel(p.image_prompt_qa_outputs[i]);
  const prompt = imagePromptSpecs[i];
  if (!fs.existsSync(qaPath)) {
    deterministicChecks.push({
      id: `prompt-qa:${prompt.asset_id}`,
      stage: "image_prompt",
      status: "action_required",
      message: `Prompt QA result is missing for ${prompt.asset_id} (${prompt.prompt_id}).`,
      action: `Run Image Prompt QA for ${prompt.asset_id} and save ${p.image_prompt_qa_outputs[i]}.`,
    });
    continue;
  }

  const qa = readJson(qaPath);
  if (qa.status === "pass") {
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
      action: `Repair only prompt ${prompt.prompt_id}, rerun Prompt QA, then regenerate its provider job if needed.`,
    });
  }
}

const imageManifestPath = rel(p.image_assets_manifest);
const usingImageTemplate = !fs.existsSync(imageManifestPath);
const imageManifest = readJson(
  usingImageTemplate ? rel(p.image_assets_template) : imageManifestPath,
);

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
    message: "Actual image-assets.json does not exist; status is being evaluated from the template.",
    action: `Copy ${p.image_assets_template} to ${p.image_assets_manifest} before importing real image assets.`,
  });
}

for (const asset of imageManifest.assets) {
  if (asset.status !== "approved") continue;
  const uri = asset.file?.uri;
  const fileExists = typeof uri === "string" && fs.existsSync(rel(uri));
  if (!fileExists) {
    imageChecks.push({
      id: `image-file:${asset.asset_id}`,
      stage: "visual_assets",
      status: "action_required",
      message: `${asset.asset_id} is marked approved but its file is missing.`,
      action: `Place the approved file for ${asset.asset_id} at ${uri ?? "the manifest URI"}.`,
    });
  }
}

const visualInputsReady = imageChecks.every((check) => check.status === "pass");
const motionQaPath = rel(p.motion_qa_output);
if (fs.existsSync(motionQaPath)) {
  const motionQa = readJson(motionQaPath);
  deterministicChecks.push(qaCheck("motion-qa", "motion", motionQa, "Motion QA"));
} else if (visualInputsReady) {
  deterministicChecks.push({
    id: "motion-qa",
    stage: "motion",
    status: "action_required",
    message: "Motion QA result is missing.",
    action: `Render scene previews, run Motion QA, and save ${p.motion_qa_output}.`,
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
    message: "Actual voice-assets.json does not exist; status is being evaluated from the template.",
    action: `Copy ${p.voice_assets_template} to ${p.voice_assets_manifest}, generate/import clips, then run Voice QA.`,
  });
}

for (const asset of voiceManifest.assets) {
  if (asset.status !== "approved") continue;
  const uri = asset.file?.uri;
  const fileExists = typeof uri === "string" && fs.existsSync(rel(uri));
  if (!fileExists) {
    voiceChecks.push({
      id: `voice-file:${asset.asset_id}`,
      stage: "voice",
      status: "action_required",
      message: `${asset.asset_id} is marked approved but its audio file is missing.`,
      action: `Place the approved audio for ${asset.asset_id} at ${uri ?? "the manifest URI"}.`,
    });
  }
}

const outputPath = rel(p.output_file);
const finalQaPath = rel(p.final_qa_output);
const outputExists = fs.existsSync(outputPath);
let finalQaStatus: "pass" | "fail" | "needs_human_review" | null = null;
if (fs.existsSync(finalQaPath)) {
  const finalQa = readJson(finalQaPath);
  finalQaStatus = finalQa?.qa_result?.status ?? null;
}

const report = buildReadinessReport({
  projectId: manifest.project_id,
  deterministicChecks,
  imageChecks,
  voiceChecks,
  outputExists,
  finalQaStatus,
});

if (jsonMode) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`AI Explainer Studio — ${manifest.topic}`);
  console.log(`Project: ${manifest.project_id}`);
  console.log(`Overall: ${report.overall_status.toUpperCase()}`);
  console.log("");

  const symbols: Record<string, string> = {
    pass: "✓",
    ready: "→",
    blocked: "·",
    action_required: "!",
    needs_human_review: "?",
  };

  for (const check of report.checks) {
    console.log(`${symbols[check.status] ?? "-"} [${check.stage}] ${check.message}`);
  }

  console.log("");
  console.log("Next actions:");
  if (report.next_actions.length === 0) {
    console.log("  none");
  } else {
    report.next_actions.forEach((action, index) =>
      console.log(`  ${index + 1}. ${action}`),
    );
  }
}

if (ciMode && contractErrors > 0) {
  process.exit(1);
}
