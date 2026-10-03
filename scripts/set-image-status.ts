import fs from "node:fs";
import path from "node:path";

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
    "Usage: npm run image:status -- --asset=A0 --status=approved [--qa-id=QA-REF-A0] [--project=...]",
  );
}

const project = JSON.parse(
  fs.readFileSync(path.join(projectDir, "project.json"), "utf8"),
);
const manifestPath = path.join(projectDir, project.paths.image_assets_manifest);
if (!fs.existsSync(manifestPath)) {
  throw new Error(
    `Missing actual image manifest ${manifestPath}. Run image:import first.`,
  );
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const asset = manifest.assets.find((value: any) => value.asset_id === assetId);
if (!asset) throw new Error(`Unknown image asset ${assetId}.`);

if (status === "approved") {
  if (!asset.file?.uri) {
    throw new Error(`Cannot approve ${assetId}: no imported file URI.`);
  }

  const filePath = path.resolve(projectDir, asset.file.uri);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Cannot approve ${assetId}: file is missing at ${filePath}.`);
  }

  for (const parentId of asset.parent_asset_ids ?? []) {
    const parent = manifest.assets.find((value: any) => value.asset_id === parentId);
    if (!parent) {
      throw new Error(`Cannot approve ${assetId}: unknown parent ${parentId}.`);
    }
    if (parent.status !== "approved") {
      throw new Error(
        `Cannot approve ${assetId}: parent ${parentId} is ${parent.status}, expected approved.`,
      );
    }
  }

  if (!qaId) {
    throw new Error(
      `Approving ${assetId} requires --qa-id=<QA result id or manual review id>.`,
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
