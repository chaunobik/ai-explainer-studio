import fs from "node:fs";
import path from "node:path";
import {arg} from "./lib/cli";
import {sha256} from "./lib/audio-utils";

const projectDir = path.resolve(arg("project") ?? "examples/fridge-hot-behind");
const assetId = arg("asset");
const status = arg("status");
const qaId = arg("qa-id");

if (!assetId || !status || !["qa_pending", "approved", "rejected"].includes(status)) {
  throw new Error(
    "Usage: npm run video:status -- --asset=VID-S1 --status=approved --qa-id=QA-VID-S1 [--project=...]",
  );
}

const project = JSON.parse(
  fs.readFileSync(path.join(projectDir, "project.json"), "utf8"),
);
const relativeManifest =
  project.paths.video_assets_manifest ?? "video-assets.json";
const manifestPath = path.join(projectDir, relativeManifest);

if (!fs.existsSync(manifestPath)) {
  throw new Error(`Missing video manifest: ${manifestPath}`);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const asset = manifest.assets.find((value: any) => value.asset_id === assetId);
if (!asset) throw new Error(`Unknown video asset ${assetId}.`);

if (status === "approved") {
  if (!qaId) {
    throw new Error(`Approving ${assetId} requires --qa-id=<Video QA result id>.`);
  }
  const filePath = path.resolve(projectDir, asset.file.uri);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Cannot approve ${assetId}: file missing at ${filePath}.`);
  }
  const checksum = sha256(filePath);
  if (checksum !== asset.file.checksum) {
    throw new Error(
      `Cannot approve ${assetId}: checksum mismatch. expected=${asset.file.checksum} actual=${checksum}`,
    );
  }
}

asset.status = status;
if (qaId) {
  asset.qa_result_ids = [...new Set([...(asset.qa_result_ids ?? []), qaId])];
}

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`✓ ${assetId} status → ${status}`);
if (qaId) console.log(`  QA: ${qaId}`);
