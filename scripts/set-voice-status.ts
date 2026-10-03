import fs from "node:fs";
import path from "node:path";
import {validateVoiceAssets} from "../packages/core/src/index";

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

const allowed = new Set([
  "qa_pending",
  "approved",
  "rejected",
  "needs_human_review",
  "awaiting_import",
  "awaiting_generation",
  "planned",
]);

const projectDir = path.resolve(arg("project") ?? "examples/fridge-hot-behind");
const assetId = arg("asset");
const status = arg("status");
const qaId = arg("qa-id");

if (!assetId || !status || !allowed.has(status)) {
  throw new Error(
    "Usage: npm run voice:status -- --asset=V1 --status=approved --qa-id=QA-VOICE-V1 [--project=...]",
  );
}

const project = JSON.parse(fs.readFileSync(path.join(projectDir, "project.json"), "utf8"));
const manifestPath = path.join(projectDir, project.paths.voice_assets_manifest);
if (!fs.existsSync(manifestPath)) {
  throw new Error(`Missing actual voice manifest ${manifestPath}. Run voice:import first.`);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const asset = manifest.assets.find((value: any) => value.asset_id === assetId);
if (!asset) throw new Error(`Unknown voice asset ${assetId}.`);

if (status === "approved") {
  if (!qaId) {
    throw new Error(`Approving ${assetId} requires --qa-id=<Voice QA result id>.`);
  }
  if (!asset.file?.uri || asset.file?.duration_sec == null) {
    throw new Error(`Cannot approve ${assetId}: imported file/duration metadata is missing.`);
  }
  const filePath = path.resolve(projectDir, asset.file.uri);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Cannot approve ${assetId}: audio file is missing at ${filePath}.`);
  }

  const fullSpec = JSON.parse(
    fs.readFileSync(path.join(projectDir, project.paths.voice_spec), "utf8"),
  );
  const segment = fullSpec.segments.find(
    (value: any) => value.output_asset_id === assetId,
  );
  if (!segment) {
    throw new Error(`Cannot approve ${assetId}: no matching VoiceSpec segment.`);
  }

  const singleSpec = {...fullSpec, segments: [segment]};
  const report = validateVoiceAssets(singleSpec, [asset], {requireApproved: false});
  if (!report.ok) {
    throw new Error(
      `Cannot approve ${assetId}: deterministic Voice QA failed:\n` +
        report.errors.map((value) => `[${value.code}] ${value.message}`).join("\n"),
    );
  }
}

asset.status = status;
if (qaId) asset.qa_result_ids = [...new Set([...(asset.qa_result_ids ?? []), qaId])];

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`✓ ${assetId} status → ${status}`);
if (qaId) console.log(`  QA: ${qaId}`);
