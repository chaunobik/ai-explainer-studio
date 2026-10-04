import fs from "node:fs";
import path from "node:path";
import {arg} from "./lib/cli";

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

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n");
}

const topic = arg("topic");
if (!topic) {
  throw new Error('Usage: npm run project:init -- --topic "Chủ đề video"');
}

const slug = arg("slug") ?? slugify(topic);
const projectDir = path.resolve(
  arg("dir") ?? path.join(".ai-explainer", "projects", slug),
);
const projectFile = path.join(projectDir, "project.json");

if (fs.existsSync(projectFile)) {
  const current = JSON.parse(fs.readFileSync(projectFile, "utf8"));
  if (current.topic !== topic) {
    throw new Error(
      `Project ${projectDir} already belongs to topic "${current.topic}".`,
    );
  }
  console.log(projectDir);
  process.exit(0);
}

fs.mkdirSync(path.join(projectDir, "assets", "voice"), {recursive: true});
fs.mkdirSync(path.join(projectDir, "assets", "video"), {recursive: true});
fs.mkdirSync(path.join(projectDir, "output"), {recursive: true});

const projectId = arg("project-id") ?? `AUTO-${slug.toUpperCase()}`;

const manifest = {
  project_id: projectId,
  topic,
  language: "vi-VN",
  paths: {
    research_result: "research-result.json",
    research_qa_output: "research-qa-output.json",
    script_spec: "script-spec.json",
    script_qa_output: "script-qa-output.json",
    storyboard_spec: "storyboard-spec.json",
    storyboard_qa_output: "storyboard-qa-output.json",
    visual_plan: "visual-plan.json",
    continuity_qa_output: "continuity-qa-output.json",
    asset_execution_plan: "asset-execution-plan.json",
    motion_spec: "motion-spec.json",
    voice_spec: "voice-spec.json",
    image_prompt_specs: ["image-prompt-a1.json"],
    image_provider_jobs: ["image-provider-job-a1.json"],
    image_assets_manifest: "image-assets.json",
    image_assets_template: "image-assets.template.json",
    voice_assets_manifest: "voice-assets.json",
    voice_assets_template: "voice-assets.template.json",
    images_dir: "assets",
    output_file: "output/final.mp4",
    final_qa_output: "final-qa-output.json",
    image_prompt_qa_outputs: ["image-prompt-qa-a1.json"],
    motion_qa_output: "motion-qa-output.json",
    multiview_reference_prompt: "multiview-reference-prompt-a0.json",
    multiview_provider_job: "multiview-provider-job-a0.json",
    multiview_prompt_qa_output: "multiview-prompt-qa-a0.json",
    multiview_qa_output: "multiview-qa-a0.json"
  }
};

writeJson(projectFile, manifest);
writeJson(path.join(projectDir, "image-assets.template.json"), {
  project_id: projectId,
  assets: [],
});
writeJson(path.join(projectDir, "image-assets.json"), {
  project_id: projectId,
  assets: [],
});
writeJson(path.join(projectDir, "voice-assets.template.json"), {
  project_id: projectId,
  assets: [],
});
writeJson(path.join(projectDir, "video-assets.json"), {
  project_id: projectId,
  provider_id: "wan2.2",
  generated_at: new Date().toISOString(),
  assets: [],
});

console.log(projectDir);
