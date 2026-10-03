import fs from "node:fs";
import path from "node:path";
import {
  approveAutonomousCheckpoint,
  beginAutonomousStage,
  createAutonomousRunState,
  getAutonomousDirective,
  recordAutonomousStageResult,
  resumeAutonomousStageAfterHumanReview,
  reviseAutonomousCheckpoint,
  type AutonomousRunState,
  type AutonomousStage,
} from "../packages/core/src/index";

function valueArg(name: string): string | undefined {
  const index = process.argv.indexOf("--" + name);
  if (index < 0) return undefined;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) return undefined;
  return value;
}

function hasFlag(name: string): boolean {
  return process.argv.includes("--" + name);
}

function slugify(value: string): string {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return slug || "untitled";
}

function statePath(slug: string): string {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    throw new Error("Invalid slug. Use lowercase letters, numbers and hyphens.");
  }
  return path.join(process.cwd(), ".ai-explainer", "runs", slug, "state.json");
}

function readState(file: string): AutonomousRunState {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeState(file: string, state: AutonomousRunState): void {
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, JSON.stringify(state, null, 2) + "\n");
}

const topic = valueArg("topic");
let slug = valueArg("slug");

if (!slug && topic) slug = slugify(topic);
if (!slug) {
  throw new Error(
    'Provide --topic "..." to start a run or --slug <slug> to resume one.',
  );
}

const file = statePath(slug);
let state: AutonomousRunState;

if (topic && !fs.existsSync(file)) {
  const projectId = valueArg("project-id") ?? "AUTO-" + slug.toUpperCase();
  state = createAutonomousRunState({
    runId: "RUN-" + slug,
    projectId,
    topic,
  });
  writeState(file, state);
} else {
  if (!fs.existsSync(file)) {
    throw new Error(
      `No autonomous state found for ${slug}. Start it with --topic first.`,
    );
  }
  state = readState(file);
  if (topic && state.topic !== topic) {
    throw new Error(
      `Run ${slug} already exists with topic "${state.topic}". Use a different --slug for a new topic.`,
    );
  }
}

if (hasFlag("begin")) {
  state = beginAutonomousStage(state);
}

const result = valueArg("result");
if (result) {
  if (!["pass", "fail", "needs_human_review"].includes(result)) {
    throw new Error("--result must be pass, fail or needs_human_review.");
  }
  state = recordAutonomousStageResult(
    state,
    result as "pass" | "fail" | "needs_human_review",
    valueArg("note") ?? null,
  );
}

if (hasFlag("approve")) {
  state = approveAutonomousCheckpoint(state);
}

const revise = valueArg("revise");
if (revise) {
  state = reviseAutonomousCheckpoint(
    state,
    revise as AutonomousStage,
    valueArg("note") ?? "User requested a revision.",
  );
}

if (hasFlag("resume-human")) {
  state = resumeAutonomousStageAfterHumanReview(
    state,
    valueArg("note") ?? null,
  );
}

writeState(file, state);

console.log(
  JSON.stringify(
    {
      state_file: path.relative(process.cwd(), file),
      run_id: state.runId,
      project_id: state.projectId,
      topic: state.topic,
      current_stage: state.currentStage,
      directive: getAutonomousDirective(state),
    },
    null,
    2,
  ),
);
