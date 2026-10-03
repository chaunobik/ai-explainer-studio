import fs from "node:fs";
import path from "node:path";
import {bundle} from "@remotion/bundler";
import {getCompositions, renderMedia} from "@remotion/renderer";
import {
  buildSubtitleCues,
  validateMotionSpec,
  validateVoiceAssets,
  validateVoiceSpecAgainstStoryboard,
} from "../packages/core/src/index";

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

function dataUri(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mime =
    ext === ".png" ? "image/png" :
    ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" :
    ext === ".webp" ? "image/webp" :
    ext === ".mp3" ? "audio/mpeg" :
    ext === ".wav" ? "audio/wav" :
    ext === ".m4a" || ext === ".mp4" ? "audio/mp4" :
    null;

  if (!mime) throw new Error(`Unsupported media extension: ${ext}`);
  return `data:${mime};base64,${fs.readFileSync(filePath).toString("base64")}`;
}

function findImage(assetsDir: string, assetId: string): string {
  for (const ext of [".png", ".jpg", ".jpeg", ".webp"]) {
    const candidate = path.join(assetsDir, assetId + ext);
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(
    `Missing image asset ${assetId}. Expected ${assetId}.png/.jpg/.jpeg/.webp in ${assetsDir}`,
  );
}

const root = process.cwd();
const exampleDir = path.resolve(arg("project") ?? "examples/fridge-hot-behind");
const motionPath = path.resolve(arg("motion") ?? path.join(exampleDir, "motion-spec.json"));
const storyboardPath = path.resolve(arg("storyboard") ?? path.join(exampleDir, "storyboard-spec.json"));
const voiceSpecPath = path.resolve(arg("voice-spec") ?? path.join(exampleDir, "voice-spec.json"));
const voiceAssetsPath = path.resolve(arg("voice-assets") ?? path.join(exampleDir, "voice-assets.json"));
const imagesDir = path.resolve(arg("images") ?? path.join(exampleDir, "assets"));
const output = path.resolve(arg("out") ?? path.join("out", "final.mp4"));

if (!fs.existsSync(voiceAssetsPath)) {
  throw new Error(
    `Missing ${voiceAssetsPath}. Copy voice-assets.template.json to voice-assets.json and fill approved audio file metadata first.`,
  );
}

const motion = JSON.parse(fs.readFileSync(motionPath, "utf8"));
const storyboard = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));
const voiceSpec = JSON.parse(fs.readFileSync(voiceSpecPath, "utf8"));
const voiceManifest = JSON.parse(fs.readFileSync(voiceAssetsPath, "utf8"));

const durations = new Map<string, number>(
  storyboard.scenes.map((scene: any) => [scene.scene_id, Number(scene.duration_sec)]),
);
const motionReport = validateMotionSpec(motion, durations);
if (!motionReport.ok) {
  throw new Error(
    "Motion preflight failed:\n" +
      motionReport.errors.map((value) => `[${value.code}] ${value.message}`).join("\n"),
  );
}

const voiceSpecReport = validateVoiceSpecAgainstStoryboard(voiceSpec, storyboard);
if (!voiceSpecReport.ok) {
  throw new Error(
    "VoiceSpec preflight failed:\n" +
      voiceSpecReport.errors.map((value) => `[${value.code}] ${value.message}`).join("\n"),
  );
}

const voiceReport = validateVoiceAssets(voiceSpec, voiceManifest.assets, {
  requireApproved: true,
});
if (!voiceReport.ok) {
  throw new Error(
    "Voice asset preflight failed:\n" +
      voiceReport.errors.map((value) => `[${value.code}] ${value.message}`).join("\n"),
  );
}

const assets: Record<string, string> = {};
const requiredImages = new Set<string>(
  motion.scenes.flatMap((scene: any) => scene.source_asset_ids),
);
for (const assetId of requiredImages) {
  assets[assetId] = dataUri(findImage(imagesDir, assetId));
}

const audioByScene: Record<string, string> = {};
for (const voiceAsset of voiceManifest.assets) {
  if (!voiceAsset.file.uri) {
    throw new Error(`Voice asset ${voiceAsset.asset_id} has no file.uri.`);
  }
  const audioPath = path.isAbsolute(voiceAsset.file.uri)
    ? voiceAsset.file.uri
    : path.resolve(exampleDir, voiceAsset.file.uri);
  if (!fs.existsSync(audioPath)) {
    throw new Error(`Missing audio file for ${voiceAsset.asset_id}: ${audioPath}`);
  }
  audioByScene[voiceAsset.scene_id] = dataUri(audioPath);
}

const subtitleCues = buildSubtitleCues(voiceSpec, voiceManifest.assets, 6);
const inputProps = {motionSpec: motion, assets, audioByScene, subtitleCues};

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
