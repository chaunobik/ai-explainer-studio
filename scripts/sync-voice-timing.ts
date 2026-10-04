import fs from "node:fs";
import path from "node:path";
import {
  validateVoiceAssets,
  validateVoiceSpecAgainstStoryboard,
} from "../packages/core/src/index";
import {arg} from "./lib/cli";
import {loadDotEnv, envNumber} from "./lib/runtime-env";

loadDotEnv();

function readJson(filePath: string): any {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n");
}

function main(): void {
  const projectDir = path.resolve(arg("project") ?? "examples/fridge-hot-behind");
  const projectFile = path.join(projectDir, "project.json");
  if (!fs.existsSync(projectFile)) {
    throw new Error(`Missing project.json: ${projectFile}`);
  }

  const project = readJson(projectFile);
  const p = project.paths;
  const storyboardPath = path.join(projectDir, p.storyboard_spec);
  const voiceSpecPath = path.join(projectDir, p.voice_spec);
  const voiceAssetsPath = path.join(projectDir, p.voice_assets_manifest);

  for (const filePath of [storyboardPath, voiceSpecPath, voiceAssetsPath]) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing voice timing input: ${filePath}`);
    }
  }

  const storyboard = readJson(storyboardPath);
  const voiceSpec = readJson(voiceSpecPath);
  const voiceManifest = readJson(voiceAssetsPath);
  const tailPad = Number(
    arg("tail-pad") ?? envNumber("VOICE_TAIL_PAD_SEC", 0.15),
  );

  const assetById = new Map(
    voiceManifest.assets.map((asset: any) => [asset.asset_id, asset]),
  );

  for (const segment of voiceSpec.segments) {
    const asset: any = assetById.get(segment.output_asset_id);
    if (!asset?.file?.duration_sec) {
      throw new Error(
        `Missing measured audio duration for ${segment.output_asset_id}.`,
      );
    }
    const scene = storyboard.scenes.find(
      (value: any) => value.scene_id === segment.scene_id,
    );
    if (!scene) {
      throw new Error(
        `Voice segment ${segment.output_asset_id} references unknown scene ${segment.scene_id}.`,
      );
    }
    if (scene.narration !== segment.text) {
      throw new Error(
        `Narration drift for ${segment.scene_id}; VoiceSpec text must exactly match storyboard narration.`,
      );
    }

    const timedDuration = Number(
      (Number(asset.file.duration_sec) + tailPad).toFixed(3),
    );
    scene.duration_sec = timedDuration;
    segment.target_duration_sec = timedDuration;
  }

  storyboard.total_duration_sec = Number(
    storyboard.scenes
      .reduce((sum: number, scene: any) => sum + Number(scene.duration_sec), 0)
      .toFixed(3),
  );

  const specReport = validateVoiceSpecAgainstStoryboard(voiceSpec, storyboard);
  if (!specReport.ok) {
    throw new Error(
      "VoiceSpec/storyboard timing sync failed:\n" +
        specReport.errors
          .map((value) => `[${value.code}] ${value.message}`)
          .join("\n"),
    );
  }

  const assetReport = validateVoiceAssets(voiceSpec, voiceManifest.assets, {
    requireApproved: false,
  });
  if (!assetReport.ok) {
    throw new Error(
      "Deterministic Voice QA failed after timing sync:\n" +
        assetReport.errors
          .map((value) => `[${value.code}] ${value.message}`)
          .join("\n"),
    );
  }

  for (const asset of voiceManifest.assets) {
    asset.status = "approved";
    asset.qa_result_ids = [
      ...new Set([
        ...(asset.qa_result_ids ?? []),
        `AUTO-VOICE-TIMING-${asset.scene_id}`,
      ]),
    ];
  }

  writeJson(storyboardPath, storyboard);
  writeJson(voiceSpecPath, voiceSpec);
  writeJson(voiceAssetsPath, voiceManifest);

  console.log(
    `✓ Voice timing synchronized from measured audio. total=${storyboard.total_duration_sec}s tail_pad=${tailPad}s`,
  );
  for (const scene of storyboard.scenes) {
    console.log(`  ${scene.scene_id}: ${scene.duration_sec}s`);
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
}
