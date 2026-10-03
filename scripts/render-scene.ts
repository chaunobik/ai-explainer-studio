import fs from "node:fs";
import path from "node:path";
import {bundle} from "@remotion/bundler";
import {getCompositions, renderMedia} from "@remotion/renderer";
import {validateMotionSpec} from "../packages/core/src/index";

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

function mime(ext: string): string {
  switch (ext.toLowerCase()) {
    case ".png": return "image/png";
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    case ".webp": return "image/webp";
    default: throw new Error(`Unsupported image extension: ${ext}`);
  }
}

function resolveAsset(assetsDir: string, assetId: string): string {
  for (const ext of [".png", ".jpg", ".jpeg", ".webp"]) {
    const file = path.join(assetsDir, assetId + ext);
    if (fs.existsSync(file)) {
      const data = fs.readFileSync(file).toString("base64");
      return `data:${mime(ext)};base64,${data}`;
    }
  }

  throw new Error(
    `Missing source asset ${assetId}. Expected ${assetId}.png/.jpg/.jpeg/.webp in ${assetsDir}`,
  );
}

const root = process.cwd();
const motionPath = path.resolve(arg("motion") ?? "examples/fridge-hot-behind/motion-spec.json");
const assetsDir = path.resolve(arg("assets") ?? "examples/fridge-hot-behind/assets");
const sceneId = arg("scene");
if (!sceneId) throw new Error("Usage: npm run render:scene -- --scene=S1 [--motion=...] [--assets=...] [--out=...]");

const motion = JSON.parse(fs.readFileSync(motionPath, "utf8"));
const scene = motion.scenes.find((value: any) => value.scene_id === sceneId);
if (!scene) throw new Error(`Scene ${sceneId} not found in ${motionPath}`);

const single = {...motion, scenes: [scene]};
const report = validateMotionSpec(single);
if (!report.ok) {
  throw new Error(report.errors.map((value) => `[${value.code}] ${value.message}`).join("\n"));
}

const assets: Record<string, string> = {};
for (const assetId of scene.source_asset_ids) {
  assets[assetId] = resolveAsset(assetsDir, assetId);
}

const inputProps = {motionSpec: single, assets};
const serveUrl = await bundle({
  entryPoint: path.join(root, "packages", "renderer", "src", "entry.tsx"),
});

const compositions = await getCompositions(serveUrl, {inputProps});
const composition = compositions.find((value) => value.id === "ExplainerVideo");
if (!composition) throw new Error("Remotion composition ExplainerVideo not found.");

const output = path.resolve(arg("out") ?? path.join("out", `${sceneId}.mp4`));
fs.mkdirSync(path.dirname(output), {recursive: true});

await renderMedia({
  composition,
  serveUrl,
  codec: "h264",
  outputLocation: output,
  inputProps,
});

console.log(`✓ Rendered ${sceneId} → ${output}`);
