import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {bundle} from "@remotion/bundler";
import {getCompositions, renderMedia} from "@remotion/renderer";
import {
  buildSubtitleCues,
  validateImageManifestIntegrity,
  validateMotionSpec,
  validateVoiceAssets,
  validateVoiceSpecAgainstStoryboard,
} from "../packages/core/src/index";

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

function readJson(filePath: string): any {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function dataUri(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mime =
    ext === ".png" ? "image/png" :
    ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" :
    ext === ".webp" ? "image/webp" :
    ext === ".mp3" ? "audio/mpeg" :
    ext === ".wav" ? "audio/wav" :
    ext === ".m4a" ? "audio/mp4" :
    ext === ".mp4" ? "video/mp4" :
    null;

  if (!mime) throw new Error(`Unsupported media extension: ${ext}`);
  return `data:${mime};base64,${fs.readFileSync(filePath).toString("base64")}`;
}

function sha256(filePath: string): string {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(filePath))
    .digest("hex");
}

function requireQaPass(filePath: string, label: string): any {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing ${label}: ${filePath}`);
  }
  const qa = readJson(filePath);
  if (qa?.qa_result?.status !== "pass") {
    throw new Error(
      `${label} must PASS before final rendering. Current status: ${qa?.qa_result?.status ?? "missing"}.`,
    );
  }
  return qa;
}

async function main(): Promise<void> {
  const root = process.cwd();
  const projectDir = path.resolve(arg("project") ?? "examples/fridge-hot-behind");
  const manifestPath = path.join(projectDir, "project.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Missing project manifest: ${manifestPath}`);
  }

  const project = readJson(manifestPath);
  const p = project.paths;
  const resolveProject = (relativePath: string): string =>
    path.resolve(projectDir, relativePath);

  const motionPath = resolveProject(p.motion_spec);
  const storyboardPath = resolveProject(p.storyboard_spec);
  const voiceSpecPath = resolveProject(p.voice_spec);
  const voiceAssetsPath = resolveProject(p.voice_assets_manifest);
  const imageAssetsPath = resolveProject(p.image_assets_manifest);
  const videoAssetsPath = p.video_assets_manifest
    ? resolveProject(p.video_assets_manifest)
    : null;
  const output = path.resolve(arg("out") ?? resolveProject(p.output_file));

  for (const [relative, label] of [
    [p.research_qa_output, "Research QA"],
    [p.script_qa_output, "Script QA"],
    [p.storyboard_qa_output, "Storyboard QA"],
    [p.continuity_qa_output, "Continuity QA"],
    [p.motion_qa_output, "Motion QA"],
  ] as const) {
    requireQaPass(resolveProject(relative), label);
  }

  for (const relativeQaPath of p.image_prompt_qa_outputs as string[]) {
    const qaPath = resolveProject(relativeQaPath);
    if (!fs.existsSync(qaPath)) {
      throw new Error(
        `Missing Image Prompt QA result: ${qaPath}. Final render cannot bypass Prompt QA.`,
      );
    }
    const qa = readJson(qaPath);
    if (qa.status !== "pass") {
      throw new Error(
        `Image Prompt QA ${qa.prompt_id ?? relativeQaPath} must PASS before final rendering.`,
      );
    }
  }

  if (!fs.existsSync(imageAssetsPath)) {
    throw new Error(
      `Missing actual image manifest ${imageAssetsPath}. Templates are never accepted for final rendering.`,
    );
  }
  if (!fs.existsSync(voiceAssetsPath)) {
    throw new Error(
      `Missing actual voice manifest ${voiceAssetsPath}. Templates are never accepted for final rendering.`,
    );
  }

  const motion = readJson(motionPath);
  const storyboard = readJson(storyboardPath);
  const voiceSpec = readJson(voiceSpecPath);
  const voiceManifest = readJson(voiceAssetsPath);
  const imageManifest = readJson(imageAssetsPath);

  const imageIntegrity = validateImageManifestIntegrity(imageManifest);
  if (!imageIntegrity.ok) {
    throw new Error(
      "Image manifest integrity failed:\n" +
        imageIntegrity.errors
          .map((value) => `[${value.code}] ${value.message}`)
          .join("\n"),
    );
  }

  const durations = new Map<string, number>(
    storyboard.scenes.map((scene: any) => [scene.scene_id, Number(scene.duration_sec)]),
  );
  const motionReport = validateMotionSpec(motion, durations);
  if (!motionReport.ok) {
    throw new Error(
      "Motion preflight failed:\n" +
        motionReport.errors
          .map((value) => `[${value.code}] ${value.message}`)
          .join("\n"),
    );
  }

  const voiceSpecReport = validateVoiceSpecAgainstStoryboard(voiceSpec, storyboard);
  if (!voiceSpecReport.ok) {
    throw new Error(
      "VoiceSpec preflight failed:\n" +
        voiceSpecReport.errors
          .map((value) => `[${value.code}] ${value.message}`)
          .join("\n"),
    );
  }

  const voiceReport = validateVoiceAssets(voiceSpec, voiceManifest.assets, {
    requireApproved: true,
  });
  if (!voiceReport.ok) {
    throw new Error(
      "Voice asset preflight failed:\n" +
        voiceReport.errors
          .map((value) => `[${value.code}] ${value.message}`)
          .join("\n"),
    );
  }

  const imageById = new Map(
    imageManifest.assets.map((asset: any) => [asset.asset_id, asset]),
  );
  const assets: Record<string, string> = {};
  const requiredImages = new Set<string>(
    motion.scenes.flatMap((scene: any) => scene.source_asset_ids),
  );

  for (const assetId of requiredImages) {
    const asset: any = imageById.get(assetId);
    if (!asset) {
      throw new Error(`MotionSpec requires ${assetId}, but image manifest has no such asset.`);
    }
    if (asset.status !== "approved") {
      throw new Error(
        `MotionSpec requires ${assetId}, but its status is ${asset.status}; approved is required.`,
      );
    }
    if (!asset.qa_result_ids?.length) {
      throw new Error(`Approved image ${assetId} has no QA result ID.`);
    }
    if (!asset.file?.uri) {
      throw new Error(`Approved image ${assetId} has no file URI.`);
    }

    const imagePath = resolveProject(asset.file.uri);
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Missing approved image file for ${assetId}: ${imagePath}`);
    }
    if (!asset.file.checksum) {
      throw new Error(`Approved image ${assetId} has no checksum. Re-import it through image:import.`);
    }
    const actualChecksum = sha256(imagePath);
    if (actualChecksum !== asset.file.checksum) {
      throw new Error(
        `Checksum mismatch for ${assetId}. Manifest=${asset.file.checksum}, actual=${actualChecksum}.`,
      );
    }

    assets[assetId] = dataUri(imagePath);
  }

  const audioByScene: Record<string, string> = {};
  for (const voiceAsset of voiceManifest.assets) {
    if (voiceAsset.status !== "approved") {
      throw new Error(
        `Voice asset ${voiceAsset.asset_id} is ${voiceAsset.status}; approved is required.`,
      );
    }
    if (!voiceAsset.qa_result_ids?.length) {
      throw new Error(`Approved voice asset ${voiceAsset.asset_id} has no QA result ID.`);
    }
    if (!voiceAsset.file.uri || !voiceAsset.file.checksum) {
      throw new Error(
        `Approved voice asset ${voiceAsset.asset_id} is missing URI/checksum metadata. Re-import through voice:import.`,
      );
    }

    const audioPath = resolveProject(voiceAsset.file.uri);
    if (!fs.existsSync(audioPath)) {
      throw new Error(`Missing audio file for ${voiceAsset.asset_id}: ${audioPath}`);
    }
    const actualChecksum = sha256(audioPath);
    if (actualChecksum !== voiceAsset.file.checksum) {
      throw new Error(
        `Checksum mismatch for ${voiceAsset.asset_id}. Manifest=${voiceAsset.file.checksum}, actual=${actualChecksum}.`,
      );
    }
    audioByScene[voiceAsset.scene_id] = dataUri(audioPath);
  }

  const videoByScene: Record<string, string> = {};
  if (videoAssetsPath && fs.existsSync(videoAssetsPath)) {
    const videoManifest = readJson(videoAssetsPath);
    for (const videoAsset of videoManifest.assets ?? []) {
      if (videoAsset.status !== "approved") continue;
      if (!videoAsset.qa_result_ids?.length) {
        throw new Error(
          `Approved video ${videoAsset.asset_id} has no QA result ID.`,
        );
      }
      const videoPath = resolveProject(videoAsset.file.uri);
      if (!fs.existsSync(videoPath)) {
        throw new Error(
          `Missing approved video file for ${videoAsset.asset_id}: ${videoPath}`,
        );
      }
      const actualChecksum = sha256(videoPath);
      if (actualChecksum !== videoAsset.file.checksum) {
        throw new Error(
          `Checksum mismatch for video ${videoAsset.asset_id}. Manifest=${videoAsset.file.checksum}, actual=${actualChecksum}.`,
        );
      }
      videoByScene[videoAsset.scene_id] = dataUri(videoPath);
    }
  }

  const subtitleCues = buildSubtitleCues(voiceSpec, voiceManifest.assets, 6);
  const inputProps = {
    motionSpec: motion,
    assets,
    audioByScene,
    videoByScene,
    subtitleCues,
  };

  const serveUrl = await bundle({
    entryPoint: path.join(root, "packages", "renderer", "src", "entry.tsx"),
  });
  const compositions = await getCompositions(serveUrl, {inputProps});
  const composition = compositions.find((value) => value.id === "ExplainerVideo");
  if (!composition) throw new Error("ExplainerVideo composition not found.");

  fs.mkdirSync(path.dirname(output), {recursive: true});
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation: output,
    inputProps,
  });

  console.log(`✓ Final render complete: ${output}`);
  console.log("! Final render is NOT publication approval. Run Final Video QA next.");

}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
