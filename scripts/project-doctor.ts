import fs from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import {
  validateImageManifestIntegrity,
  validatePromptQaIntegrity,
  validateCrossStageArtifacts,
  validateMotionSpec,
  validateVoiceSpecAgainstStoryboard,
} from "../packages/core/src/index";

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

const jsonMode = process.argv.includes("--json");
const root = process.cwd();
const projectDir = path.resolve(arg("project") ?? "examples/fridge-hot-behind");
const manifestPath = path.join(projectDir, "project.json");
const schemaDir = path.join(root, "schemas");

type DoctorIssue = {
  severity: "error" | "warning";
  code: string;
  path: string;
  message: string;
};

const issues: DoctorIssue[] = [];
const add = (
  severity: "error" | "warning",
  code: string,
  targetPath: string,
  message: string,
) => issues.push({severity, code, path: targetPath, message});

if (!fs.existsSync(manifestPath)) {
  throw new Error(`Missing project manifest: ${manifestPath}`);
}

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  allowUnionTypes: true,
});
addFormats(ajv);

for (const file of fs.readdirSync(schemaDir).filter((name) => name.endsWith(".json"))) {
  const schema = JSON.parse(fs.readFileSync(path.join(schemaDir, file), "utf8"));
  ajv.addSchema(schema);
}

const readJson = (filePath: string): any =>
  JSON.parse(fs.readFileSync(filePath, "utf8"));

function validateFile(
  relativePath: string,
  schemaFile: string,
  options: {required?: boolean} = {},
): any | null {
  const fullPath = path.resolve(projectDir, relativePath);
  const insideProject =
    fullPath === projectDir || fullPath.startsWith(projectDir + path.sep);

  if (!insideProject) {
    add(
      "error",
      "PATH_OUTSIDE_PROJECT",
      relativePath,
      "Project artifact paths must stay inside the project directory.",
    );
    return null;
  }

  if (!fs.existsSync(fullPath)) {
    if (options.required ?? true) {
      add("error", "MISSING_FILE", relativePath, `Missing required artifact ${relativePath}.`);
    }
    return null;
  }

  let data: any;
  try {
    data = readJson(fullPath);
  } catch (error) {
    add(
      "error",
      "INVALID_JSON",
      relativePath,
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }

  const schema = readJson(path.join(schemaDir, schemaFile));
  const validate = ajv.getSchema(schema.$id);
  if (!validate) {
    add("error", "MISSING_VALIDATOR", relativePath, `No validator for ${schemaFile}.`);
    return data;
  }

  if (!validate(data)) {
    for (const error of validate.errors ?? []) {
      add(
        "error",
        "SCHEMA_VALIDATION",
        `${relativePath}${error.instancePath || "/"}`,
        error.message ?? "Schema validation failed.",
      );
    }
  }

  return data;
}

const manifest = validateFile("project.json", "project-manifest.schema.json");
if (!manifest) {
  const report = {ok: false, project_dir: projectDir, errors: issues, warnings: []};
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
}

const p = manifest.paths;
const requiredArtifacts: Array<[string, string]> = [
  [p.research_result, "research-result.schema.json"],
  [p.research_qa_output, "research-qa-output.schema.json"],
  [p.script_spec, "script-spec.schema.json"],
  [p.script_qa_output, "script-qa-output.schema.json"],
  [p.storyboard_spec, "storyboard-spec.schema.json"],
  [p.storyboard_qa_output, "storyboard-qa-output.schema.json"],
  [p.visual_plan, "visual-plan.schema.json"],
  [p.continuity_qa_output, "continuity-qa-output.schema.json"],
  [p.asset_execution_plan, "asset-execution-plan.schema.json"],
  [p.motion_spec, "motion-spec.schema.json"],
  [p.voice_spec, "voice-spec.schema.json"],
  [p.multiview_reference_prompt, "multiview-reference-prompt-spec.schema.json"],
  [p.multiview_provider_job, "image-provider-job.schema.json"],
];

for (const [file, schema] of requiredArtifacts) validateFile(file, schema);

const promptSpecs = (p.image_prompt_specs as string[])
  .map((file) => validateFile(file, "image-prompt-spec.schema.json"))
  .filter(Boolean);
const providerJobs = (p.image_provider_jobs as string[])
  .map((file) => validateFile(file, "image-provider-job.schema.json"))
  .filter(Boolean);

const promptQaOutputs = (p.image_prompt_qa_outputs as string[])
  .map((file) => validateFile(file, "image-prompt-qa-output.schema.json", {required: false}))
  .filter(Boolean);

const research = readJson(path.resolve(projectDir, p.research_result));
const researchQa = readJson(path.resolve(projectDir, p.research_qa_output));
const script = readJson(path.resolve(projectDir, p.script_spec));
const storyboard = readJson(path.resolve(projectDir, p.storyboard_spec));
const visualPlan = readJson(path.resolve(projectDir, p.visual_plan));
const executionPlan = readJson(path.resolve(projectDir, p.asset_execution_plan));
const motion = readJson(path.resolve(projectDir, p.motion_spec));
const voiceSpec = readJson(path.resolve(projectDir, p.voice_spec));
const multiviewReferencePrompt = readJson(
  path.resolve(projectDir, p.multiview_reference_prompt),
);

const cross = validateCrossStageArtifacts({
  researchResult: research,
  claims: researchQa.claims,
  script,
  storyboard,
  visualPlan,
  imagePromptSpecs: promptSpecs,
  referencePromptSpecs: [multiviewReferencePrompt],
  providerJobs,
  executionPlan,
});
for (const item of cross.errors) add("error", item.code, item.path, item.message);
for (const item of cross.warnings) add("warning", item.code, item.path, item.message);

const sceneDurations = new Map<string, number>(
  storyboard.scenes.map((scene: any) => [scene.scene_id, Number(scene.duration_sec)]),
);
const motionReport = validateMotionSpec(motion, sceneDurations);
for (const item of motionReport.errors) add("error", item.code, item.path, item.message);
for (const item of motionReport.warnings) add("warning", item.code, item.path, item.message);

const voicePlanReport = validateVoiceSpecAgainstStoryboard(voiceSpec, storyboard);
for (const item of voicePlanReport.errors) add("error", item.code, item.path, item.message);
for (const item of voicePlanReport.warnings) add("warning", item.code, item.path, item.message);

const promptIntegrity = validatePromptQaIntegrity(promptSpecs, promptQaOutputs);
for (const item of promptIntegrity.errors) add("error", item.code, item.path, item.message);
for (const item of promptIntegrity.warnings) add("warning", item.code, item.path, item.message);

const imageManifestRelative = fs.existsSync(path.resolve(projectDir, p.image_assets_manifest))
  ? p.image_assets_manifest
  : p.image_assets_template;
const imageManifest = validateFile(
  imageManifestRelative,
  "image-assets-manifest.schema.json",
);
if (imageManifest) {
  const imageIntegrity = validateImageManifestIntegrity(imageManifest);
  for (const item of imageIntegrity.errors) add("error", item.code, item.path, item.message);
  for (const item of imageIntegrity.warnings) add("warning", item.code, item.path, item.message);

  for (const asset of imageManifest.assets ?? []) {
    if (asset.status !== "approved" || !asset.file?.uri) continue;
    const filePath = path.resolve(projectDir, asset.file.uri);
    if (!fs.existsSync(filePath)) {
      add(
        "error",
        "APPROVED_IMAGE_FILE_MISSING",
        asset.file.uri,
        `Approved image asset ${asset.asset_id} points to a missing file.`,
      );
    }
  }
}

const voiceManifestRelative = fs.existsSync(path.resolve(projectDir, p.voice_assets_manifest))
  ? p.voice_assets_manifest
  : p.voice_assets_template;
const voiceManifest = validateFile(
  voiceManifestRelative,
  "voice-assets-manifest.schema.json",
);
if (voiceManifest) {
  const ids = (voiceManifest.assets ?? []).map((asset: any) => asset.asset_id);
  if (new Set(ids).size !== ids.length) {
    add("error", "VOICE_DUP_ID", voiceManifestRelative, "Voice asset IDs must be unique.");
  }

  for (const asset of voiceManifest.assets ?? []) {
    if (asset.status !== "approved" || !asset.file?.uri) continue;
    const filePath = path.resolve(projectDir, asset.file.uri);
    if (!fs.existsSync(filePath)) {
      add(
        "error",
        "APPROVED_VOICE_FILE_MISSING",
        asset.file.uri,
        `Approved voice asset ${asset.asset_id} points to a missing file.`,
      );
    }
  }
}

validateFile(
  p.multiview_prompt_qa_output,
  "multiview-prompt-qa-output.schema.json",
  {required: false},
);
validateFile(
  p.multiview_qa_output,
  "multiview-qa-output.schema.json",
  {required: false},
);
validateFile(p.motion_qa_output, "motion-qa-output.schema.json", {required: false});
validateFile(p.final_qa_output, "final-qa-output.schema.json", {required: false});

for (const [index, prompt] of promptSpecs.entries()) {
  if (prompt.project_id !== manifest.project_id) {
    add(
      "error",
      "PROJECT_ID_DRIFT",
      p.image_prompt_specs[index],
      `ImagePromptSpec belongs to ${prompt.project_id}, expected ${manifest.project_id}.`,
    );
  }
}

for (const [index, job] of providerJobs.entries()) {
  if (job.project_id !== manifest.project_id) {
    add(
      "error",
      "PROJECT_ID_DRIFT",
      p.image_provider_jobs[index],
      `ImageProviderJob belongs to ${job.project_id}, expected ${manifest.project_id}.`,
    );
  }
}

const errors = issues.filter((value) => value.severity === "error");
const warnings = issues.filter((value) => value.severity === "warning");
const report = {
  ok: errors.length === 0,
  project_id: manifest.project_id,
  project_dir: projectDir,
  errors,
  warnings,
};

if (jsonMode) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`Project doctor — ${manifest.topic}`);
  console.log(report.ok ? "✓ No contract/integrity errors." : `✗ ${errors.length} error(s) found.`);
  for (const error of errors) {
    console.error(`  ✗ [${error.code}] ${error.path}: ${error.message}`);
  }
  for (const warning of warnings) {
    console.warn(`  ! [${warning.code}] ${warning.path}: ${warning.message}`);
  }
}

if (!report.ok) process.exit(1);
