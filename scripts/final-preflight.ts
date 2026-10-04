import fs from "node:fs";
import path from "node:path";
import {getVideoMetadata} from "@remotion/renderer";
import {arg} from "./lib/cli";

async function main(): Promise<void> {
  const projectDir = path.resolve(arg("project") ?? "examples/fridge-hot-behind");
  const projectPath = path.join(projectDir, "project.json");
  if (!fs.existsSync(projectPath)) {
    throw new Error(`Missing project.json: ${projectPath}`);
  }

  const project = JSON.parse(fs.readFileSync(projectPath, "utf8"));
  const output = path.resolve(projectDir, project.paths.output_file);
  const motionPath = path.resolve(projectDir, project.paths.motion_spec);
  const storyboardPath = path.resolve(projectDir, project.paths.storyboard_spec);
  const imageManifestPath = path.resolve(projectDir, project.paths.image_assets_manifest);

  if (!fs.existsSync(output)) {
    throw new Error(`Final output does not exist: ${output}`);
  }
  const bytes = fs.statSync(output).size;
  if (bytes < 100_000) {
    throw new Error(
      `Final output is suspiciously small (${bytes} bytes): ${output}`,
    );
  }
  if (!fs.existsSync(motionPath)) {
    throw new Error(`Missing MotionSpec: ${motionPath}`);
  }

  const motion = JSON.parse(fs.readFileSync(motionPath, "utf8"));
  const storyboard = fs.existsSync(storyboardPath)
    ? JSON.parse(fs.readFileSync(storyboardPath, "utf8"))
    : null;
  const imageManifest = fs.existsSync(imageManifestPath)
    ? JSON.parse(fs.readFileSync(imageManifestPath, "utf8"))
    : null;

  const expectedDuration = motion.scenes.reduce(
    (sum: number, scene: any) => sum + Number(scene.duration_sec),
    0,
  );
  const metadata = await getVideoMetadata(output, {logLevel: "error"});

  const failures: string[] = [];
  if (metadata.width !== 1080 || metadata.height !== 1920) {
    failures.push(
      `resolution ${metadata.width}x${metadata.height}, expected 1080x1920`,
    );
  }
  if (Math.abs(metadata.fps - Number(motion.fps)) > 0.01) {
    failures.push(`fps ${metadata.fps}, expected ${motion.fps}`);
  }

  if (metadata.durationInSeconds == null) {
    failures.push("duration could not be read");
  } else {
    if (Math.abs(metadata.durationInSeconds - expectedDuration) > 0.75) {
      failures.push(
        `duration ${metadata.durationInSeconds.toFixed(3)}s, expected motion duration ${expectedDuration.toFixed(3)}s`,
      );
    }

    const targetDuration = Number(storyboard?.target_duration_sec ?? 0);
    if (targetDuration > 0) {
      const tolerance = Math.max(5, targetDuration * 0.12);
      if (Math.abs(metadata.durationInSeconds - targetDuration) > tolerance) {
        failures.push(
          `final duration ${metadata.durationInSeconds.toFixed(3)}s drifts too far from storyboard target ${targetDuration.toFixed(3)}s (tolerance ${tolerance.toFixed(3)}s)`,
        );
      }
    }
  }

  const sceneCount = Array.isArray(motion.scenes) ? motion.scenes.length : 0;
  const assetUsage = new Map<string, number>();
  let longestSameSourceRun = 0;
  let currentSourceKey = "";
  let currentRun = 0;

  for (const scene of motion.scenes ?? []) {
    const ids = [...new Set((scene.source_asset_ids ?? []) as string[])].sort();
    for (const id of ids) {
      assetUsage.set(id, (assetUsage.get(id) ?? 0) + 1);
    }

    const key = ids.join("+");
    if (key && key === currentSourceKey) {
      currentRun += 1;
    } else {
      currentSourceKey = key;
      currentRun = key ? 1 : 0;
    }
    longestSameSourceRun = Math.max(longestSameSourceRun, currentRun);
  }

  let dominantAsset: {asset_id: string; scene_count: number; ratio: number} | null = null;
  for (const [assetId, count] of assetUsage.entries()) {
    const ratio = sceneCount > 0 ? count / sceneCount : 0;
    if (!dominantAsset || ratio > dominantAsset.ratio) {
      dominantAsset = {asset_id: assetId, scene_count: count, ratio};
    }
  }

  if (sceneCount >= 6 && dominantAsset && dominantAsset.ratio > 0.6) {
    failures.push(
      `visual source repetition: asset ${dominantAsset.asset_id} appears in ${dominantAsset.scene_count}/${sceneCount} scenes (${(dominantAsset.ratio * 100).toFixed(0)}%); final explainer should not be dominated by one static source image`,
    );
  }

  if (sceneCount >= 6 && longestSameSourceRun > 2) {
    failures.push(
      `visual source repetition: the same source asset set is reused for ${longestSameSourceRun} consecutive scenes; maximum allowed is 2 without an explicit continuous-shot design`,
    );
  }

  const approvedImageChecksums = new Set<string>();
  if (imageManifest?.assets) {
    for (const asset of imageManifest.assets) {
      if (asset.status === "approved" && asset.file?.checksum) {
        approvedImageChecksums.add(asset.file.checksum);
      }
    }
  }

  const report = {
    ok: failures.length === 0,
    output: path.relative(projectDir, output).replace(/\\/g, "/"),
    bytes,
    metadata,
    expected_duration_sec: Number(expectedDuration.toFixed(3)),
    storyboard_target_duration_sec:
      storyboard?.target_duration_sec == null
        ? null
        : Number(storyboard.target_duration_sec),
    visual_source_audit: {
      scene_count: sceneCount,
      dominant_asset: dominantAsset,
      longest_same_source_run: longestSameSourceRun,
      approved_image_checksum_count: approvedImageChecksums.size,
    },
    failures,
  };

  const reportPath = path.join(projectDir, "final-preflight.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));

  if (!report.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
