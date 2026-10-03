import fs from "node:fs";
import path from "node:path";
import {
  beginStage,
  completeStage,
  createPipelineState,
  getReadyStages,
  planManualImageActions,
  validateCrossStageArtifacts,
} from "../packages/core/src/index";

const root = process.cwd();
const exampleDir = path.join(root, "examples", "fridge-hot-behind");

function read(name: string): any {
  return JSON.parse(fs.readFileSync(path.join(exampleDir, name), "utf8"));
}

const research = read("research-result.json");
const researchQa = read("research-qa-output.json");
const script = read("script-spec.json");
const storyboard = read("storyboard-spec.json");
const visualPlan = read("visual-plan.json");
const executionPlan = read("asset-execution-plan.json");

const promptFiles = [
  "image-prompt-a1.json",
  "image-prompt-a2.json",
  "image-prompt-a5.json",
  "image-prompt-a6.json",
];
const imagePromptSpecs = promptFiles.map(read);

const multiviewReferencePrompt = read("multiview-reference-prompt-a0.json");

const providerJobFiles = [
  "multiview-provider-job-a0.json",
  "anchor-provider-job.json",
  "derived-s2-provider-job.json",
  "derived-s5-provider-job.template.json",
  "derived-s6-provider-job.template.json",
];
const providerJobs = providerJobFiles.map(read);

const report = validateCrossStageArtifacts({
  researchResult: research,
  claims: researchQa.claims,
  script,
  storyboard,
  visualPlan,
  imagePromptSpecs,
  referencePromptSpecs: [multiviewReferencePrompt],
  providerJobs,
  executionPlan,
});

if (!report.ok) {
  console.error("✗ Cross-stage validation failed.");
  for (const error of report.errors) {
    console.error(`  [${error.code}] ${error.path}: ${error.message}`);
  }
  process.exit(1);
}

for (const warning of report.warnings) {
  console.warn(`! [${warning.code}] ${warning.message}`);
}

let state = createPipelineState("EXAMPLE-FRIDGE-001");
for (const [stage, artifactIds] of [
  ["research", ["R001"]],
  ["script", ["SC001"]],
  ["storyboard", ["SB001"]],
  ["visual_plan", ["VP001"]],
  ["image_prompt", ["IP1", "IP2", "IP5", "IP6"]],
] as const) {
  state = beginStage(state, stage);
  state = completeStage(state, stage, "pass", [...artifactIds]);
}

const a0Template = read("reference-a0-manifest.template.json");
const beforeReferenceApproval = planManualImageActions(providerJobs, [a0Template]);
const blockedA1 = beforeReferenceApproval.find((action) => action.assetId === "A1");
if (blockedA1?.ready) {
  console.error("✗ A1 must remain blocked until generated A0 passes Multi-View QA and is approved.");
  process.exit(1);
}

const simulatedApprovedA0 = {...a0Template, status: "approved"};
const actions = planManualImageActions(providerJobs, [simulatedApprovedA0]);

console.log("✓ Cross-stage invariants pass.");
console.log(`✓ Ready pipeline stages: ${getReadyStages(state).join(", ")}`);
console.log("Manual image dependency simulation:");
console.log("  - A0 reference pack: GENERATE → IMPORT → MULTI-VIEW QA → APPROVE");
for (const action of actions) {
  console.log(
    `  - ${action.assetId}: ${action.ready ? "READY" : "BLOCKED"}${action.blockers.length ? ` — ${action.blockers.join("; ")}` : ""}`,
  );
}

const a1 = actions.find((action) => action.assetId === "A1");
if (!a1?.ready) {
  console.error("✗ Expected A1 to become ready after simulated A0 approval.");
  process.exit(1);
}

const premature = actions.filter(
  (action) => ["A2", "A5", "A6"].includes(action.assetId) && action.ready,
);
if (premature.length > 0) {
  console.error(
    `✗ Derived image jobs became ready before A1 approval: ${premature.map((item) => item.assetId).join(", ")}`,
  );
  process.exit(1);
}

console.log("✓ Dry run confirms the intended gates: A0 Prompt QA → generate/import A0 → Multi-View QA/approve → A1 → derived images.");
