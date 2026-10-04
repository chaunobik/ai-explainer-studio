import fs from "node:fs";
import path from "node:path";
import {arg} from "./lib/cli";
import {sha256} from "./lib/audio-utils";
import {loadDotEnv} from "./lib/runtime-env";
import {runWanImageToVideo} from "./lib/wan-runner";

loadDotEnv();

function main(): void {
  const image = arg("image");
  const prompt = arg("prompt");
  const out = arg("out");
  if (!image || !prompt || !out) {
    throw new Error(
      'Usage: npm run video:generate -- --image keyframe.png --prompt "motion description" --out scene.mp4 [--project=...] [--scene-id=S1 --asset-id=VID-S1]',
    );
  }

  const outputPath = path.resolve(out);
  runWanImageToVideo({
    imagePath: path.resolve(image),
    prompt,
    outputPath,
  });
  console.log(`✓ Wan video generated: ${outputPath}`);

  const sceneId = arg("scene-id");
  const assetId = arg("asset-id");
  const projectArg = arg("project");
  if (!sceneId || !assetId || !projectArg) return;

  const projectDir = path.resolve(projectArg);
  const projectFile = path.join(projectDir, "project.json");
  if (!fs.existsSync(projectFile)) {
    throw new Error(`Missing project.json: ${projectFile}`);
  }

  const project = JSON.parse(fs.readFileSync(projectFile, "utf8"));
  const relativeManifest =
    project.paths.video_assets_manifest ?? "video-assets.json";
  const manifestPath = path.join(projectDir, relativeManifest);
  const manifest = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, "utf8"))
    : {
        project_id: project.project_id,
        provider_id: "wan2.2",
        generated_at: new Date().toISOString(),
        assets: [],
      };

  const asset = {
    asset_id: assetId,
    scene_id: sceneId,
    status: "qa_pending",
    provider_id: "wan2.2",
    prompt,
    file: {
      uri: path.relative(projectDir, outputPath).replace(/\\/g, "/"),
      mime_type: "video/mp4",
      checksum: sha256(outputPath),
    },
    qa_result_ids: [],
  };

  const index = manifest.assets.findIndex(
    (value: any) => value.asset_id === assetId,
  );
  if (index >= 0) manifest.assets[index] = asset;
  else manifest.assets.push(asset);
  manifest.generated_at = new Date().toISOString();

  fs.writeFileSync(
    manifestPath,
    JSON.stringify(manifest, null, 2) + "\n",
  );
  console.log(`✓ Video manifest updated: ${manifestPath}`);
  console.log("! Status is qa_pending; approve only after semantic video QA.");
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 2;
}
