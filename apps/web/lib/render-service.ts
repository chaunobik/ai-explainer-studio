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
} from "../../../packages/core/src/index";

let cachedBundleRoot: string | null = null;
let cachedServeUrl: Promise<string> | null = null;

function readJson(filePath: string): any {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function dataUri(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mime =
    ext === ".png"
      ? "image/png"
      : ext === ".jpg" || ext === ".jpeg"
        ? "image/jpeg"
        : ext === ".webp"
          ? "image/webp"
          : ext === ".mp3"
            ? "audio/mpeg"
            : ext === ".wav"
              ? "audio/wav"
              : ext === ".m4a" || ext === ".mp4"
                ? "audio/mp4"
                : null;

  if (!mime) throw new Error("Unsupported media extension: " + ext);
  return "data:" + mime + ";base64," + fs.readFileSync(filePath).toString("base64");
}

function sha256(filePath: string): string {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(filePath))
    .digest("hex");
}

async function serveUrl(repoRoot: string): Promise<string> {
  if (!cachedServeUrl || cachedBundleRoot !== repoRoot) {
    cachedBundleRoot = repoRoot;
    cachedServeUrl = bundle({
      entryPoint: path.join(repoRoot, "packages", "renderer", "src", "entry.tsx"),
    });
  }
  return cachedServeUrl;
}

function approvedAssetDataUri(
  projectDir: string,
  imageManifest: any,
  assetId: string,
): string {
  const asset = imageManifest.assets.find((value: any) => value.asset_id === assetId);
  if (!asset) throw new Error("Missing image asset " + assetId + ".");
  if (asset.status !== "approved") {
    throw new Error(assetId + " must be approved before rendering.");
  }
  if (!asset.file?.uri) throw new Error(assetId + " has no file URI.");
  const filePath = path.resolve(projectDir, asset.file.uri);
  if (!fs.existsSync(filePath)) {
    throw new Error("Missing file for " + assetId + ": " + filePath);
  }
  if (!asset.file.checksum) {
    throw new Error(assetId + " has no checksum. Re-import it before rendering.");
  }
  const actual = sha256(filePath);
  if (actual !== asset.file.checksum) {
    throw new Error("Checksum mismatch for " + assetId + ".");
  }
  return dataUri(filePath);
}

export async function renderScenePreview(options: {
  repoRoot: string;
  projectDir: string;
  sceneId: string;
}): Promise<string> {
  const {repoRoot, projectDir, sceneId} = options;
  const project = readJson(path.join(projectDir, "project.json"));
  const motion = readJson(path.join(projectDir, project.paths.motion_spec));
  const imageManifestPath = path.join(projectDir, project.paths.image_assets_manifest);

  if (!fs.existsSync(imageManifestPath)) {
    throw new Error("Actual image-assets.json is required before preview rendering.");
  }

  const imageManifest = readJson(imageManifestPath);
  const integrity = validateImageManifestIntegrity(imageManifest);
  if (!integrity.ok) {
    throw new Error(
      "Image manifest integrity failed: " +
        integrity.errors.map((value) => "[" + value.code + "] " + value.message).join(" | "),
    );
  }

  const scene = motion.scenes.find((value: any) => value.scene_id === sceneId);
  if (!scene) throw new Error("Scene " + sceneId + " not found.");

  const single = {...motion, scenes: [scene]};
  const report = validateMotionSpec(single);
  if (!report.ok) {
    throw new Error(
      report.errors.map((value) => "[" + value.code + "] " + value.message).join(" | "),
    );
  }

  const assets: Record<string, string> = {};
  for (const assetId of scene.source_asset_ids as string[]) {
    assets[assetId] = approvedAssetDataUri(projectDir, imageManifest, assetId);
  }

  const inputProps = {motionSpec: single, assets};
  const url = await serveUrl(repoRoot);
  const compositions = await getCompositions(url, {inputProps});
  const composition = compositions.find((value) => value.id === "ExplainerVideo");
  if (!composition) throw new Error("ExplainerVideo composition not found.");

  const output = path.join(projectDir, "output", "previews", sceneId + ".mp4");
  fs.mkdirSync(path.dirname(output), {recursive: true});

  await renderMedia({
    composition,
    serveUrl: url,
    codec: "h264",
    outputLocation: output,
    inputProps,
  });

  return output;
}

function requireQaPass(filePath: string, label: string): void {
  if (!fs.existsSync(filePath)) {
    throw new Error("Missing " + label + ": " + filePath);
  }
  const qa = readJson(filePath);
  if (qa?.qa_result?.status !== "pass") {
    throw new Error(
      label +
        " must PASS before final rendering. Current status: " +
        (qa?.qa_result?.status ?? "missing") +
        ".",
    );
  }
}

export async function renderFinalProject(options: {
  repoRoot: string;
  projectDir: string;
}): Promise<string> {
  const {repoRoot, projectDir} = options;
  const project = readJson(path.join(projectDir, "project.json"));
  const p = project.paths;
  const rel = (name: string): string => path.resolve(projectDir, name);

  for (const [relative, label] of [
    [p.research_qa_output, "Research QA"],
    [p.script_qa_output, "Script QA"],
    [p.storyboard_qa_output, "Storyboard QA"],
    [p.continuity_qa_output, "Continuity QA"],
    [p.motion_qa_output, "Motion QA"],
  ] as const) {
    requireQaPass(rel(relative), label);
  }

  for (const relativeQaPath of p.image_prompt_qa_outputs as string[]) {
    const qaPath = rel(relativeQaPath);
    if (!fs.existsSync(qaPath)) {
      throw new Error("Missing Image Prompt QA result: " + qaPath);
    }
    const qa = readJson(qaPath);
    if (qa.status !== "pass") {
      throw new Error(
        "Image Prompt QA " + (qa.prompt_id ?? relativeQaPath) + " must PASS.",
      );
    }
  }

  const imageAssetsPath = rel(p.image_assets_manifest);
  const voiceAssetsPath = rel(p.voice_assets_manifest);
  if (!fs.existsSync(imageAssetsPath)) throw new Error("Missing actual image-assets.json.");
  if (!fs.existsSync(voiceAssetsPath)) throw new Error("Missing actual voice-assets.json.");

  const motion = readJson(rel(p.motion_spec));
  const storyboard = readJson(rel(p.storyboard_spec));
  const voiceSpec = readJson(rel(p.voice_spec));
  const voiceManifest = readJson(voiceAssetsPath);
  const imageManifest = readJson(imageAssetsPath);

  const imageIntegrity = validateImageManifestIntegrity(imageManifest);
  if (!imageIntegrity.ok) {
    throw new Error(
      "Image manifest integrity failed: " +
        imageIntegrity.errors
          .map((value) => "[" + value.code + "] " + value.message)
          .join(" | "),
    );
  }

  const durations = new Map<string, number>(
    storyboard.scenes.map((scene: any) => [scene.scene_id, Number(scene.duration_sec)]),
  );
  const motionReport = validateMotionSpec(motion, durations);
  if (!motionReport.ok) {
    throw new Error(
      "Motion preflight failed: " +
        motionReport.errors.map((value) => value.message).join(" | "),
    );
  }

  const voicePlan = validateVoiceSpecAgainstStoryboard(voiceSpec, storyboard);
  if (!voicePlan.ok) {
    throw new Error(
      "VoiceSpec preflight failed: " +
        voicePlan.errors.map((value) => value.message).join(" | "),
    );
  }

  const voiceReport = validateVoiceAssets(voiceSpec, voiceManifest.assets, {
    requireApproved: true,
  });
  if (!voiceReport.ok) {
    throw new Error(
      "Voice asset preflight failed: " +
        voiceReport.errors.map((value) => value.message).join(" | "),
    );
  }

  const assets: Record<string, string> = {};
  const requiredImages = new Set<string>(
    motion.scenes.flatMap((scene: any) => scene.source_asset_ids),
  );
  for (const assetId of requiredImages) {
    assets[assetId] = approvedAssetDataUri(projectDir, imageManifest, assetId);
  }

  const audioByScene: Record<string, string> = {};
  for (const voiceAsset of voiceManifest.assets) {
    if (voiceAsset.status !== "approved") {
      throw new Error(
        "Voice asset " + voiceAsset.asset_id + " must be approved before final render.",
      );
    }
    if (!voiceAsset.qa_result_ids?.length) {
      throw new Error("Approved voice " + voiceAsset.asset_id + " has no QA ID.");
    }
    if (!voiceAsset.file?.uri || !voiceAsset.file?.checksum) {
      throw new Error("Voice " + voiceAsset.asset_id + " is missing file metadata.");
    }
    const filePath = rel(voiceAsset.file.uri);
    if (!fs.existsSync(filePath)) {
      throw new Error("Missing audio file for " + voiceAsset.asset_id + ".");
    }
    if (sha256(filePath) !== voiceAsset.file.checksum) {
      throw new Error("Checksum mismatch for " + voiceAsset.asset_id + ".");
    }
    audioByScene[voiceAsset.scene_id] = dataUri(filePath);
  }

  const subtitleCues = buildSubtitleCues(voiceSpec, voiceManifest.assets, 6);
  const inputProps = {motionSpec: motion, assets, audioByScene, subtitleCues};
  const url = await serveUrl(repoRoot);
  const compositions = await getCompositions(url, {inputProps});
  const composition = compositions.find((value) => value.id === "ExplainerVideo");
  if (!composition) throw new Error("ExplainerVideo composition not found.");

  const output = rel(p.output_file);
  fs.mkdirSync(path.dirname(output), {recursive: true});
  await renderMedia({
    composition,
    serveUrl: url,
    codec: "h264",
    outputLocation: output,
    inputProps,
  });

  return output;
}
