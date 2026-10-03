import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

function pngDimensions(buffer: Buffer): {width: number; height: number} | null {
  if (buffer.length < 24) return null;
  const sig = buffer.subarray(0, 8).toString("hex");
  if (sig !== "89504e470d0a1a0a") return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function jpegDimensions(buffer: Buffer): {width: number; height: number} | null {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2 || offset + 2 + length > buffer.length) return null;

    const isSof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);

    if (isSof && length >= 7) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + length;
  }
  return null;
}

function mimeFor(ext: string): string {
  switch (ext.toLowerCase()) {
    case ".png": return "image/png";
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    case ".webp": return "image/webp";
    default: throw new Error(`Unsupported image extension: ${ext}`);
  }
}

const root = process.cwd();
const projectDir = path.resolve(arg("project") ?? "examples/fridge-hot-behind");
const assetId = arg("asset");
const sourceArg = arg("file");

if (!assetId || !sourceArg) {
  throw new Error(
    "Usage: npm run image:import -- --asset=A0 --file=/path/to/image.png [--project=examples/fridge-hot-behind]",
  );
}

const source = path.resolve(sourceArg);
if (!fs.existsSync(source)) throw new Error(`Source image does not exist: ${source}`);

const project = JSON.parse(
  fs.readFileSync(path.join(projectDir, "project.json"), "utf8"),
);
const actualManifest = path.join(projectDir, project.paths.image_assets_manifest);
const templateManifest = path.join(projectDir, project.paths.image_assets_template);

if (!fs.existsSync(actualManifest)) {
  if (!fs.existsSync(templateManifest)) {
    throw new Error(`Missing image manifest template: ${templateManifest}`);
  }
  fs.copyFileSync(templateManifest, actualManifest);
}

const manifest = JSON.parse(fs.readFileSync(actualManifest, "utf8"));
const asset = manifest.assets.find((value: any) => value.asset_id === assetId);
if (!asset) throw new Error(`Asset ${assetId} is not declared in image manifest.`);

const ext = path.extname(source).toLowerCase();
mimeFor(ext);

let targetRelative = asset.file?.uri as string | null | undefined;
if (!targetRelative) {
  targetRelative = path.join(project.paths.images_dir, `${assetId}${ext}`);
}

const target = path.resolve(projectDir, targetRelative);
if (!(target === projectDir || target.startsWith(projectDir + path.sep))) {
  throw new Error("Target asset path escapes the project directory.");
}

fs.mkdirSync(path.dirname(target), {recursive: true});
fs.copyFileSync(source, target);

const bytes = fs.readFileSync(target);
const dimensions =
  ext === ".png"
    ? pngDimensions(bytes)
    : ext === ".jpg" || ext === ".jpeg"
      ? jpegDimensions(bytes)
      : null;

asset.status = "qa_pending";
asset.provenance.source_uri = source;
asset.file.uri = path.relative(projectDir, target).replaceAll(path.sep, "/");
asset.file.mime_type = mimeFor(ext);
asset.file.width = dimensions?.width ?? null;
asset.file.height = dimensions?.height ?? null;
asset.file.checksum = crypto.createHash("sha256").update(bytes).digest("hex");

fs.writeFileSync(actualManifest, JSON.stringify(manifest, null, 2) + "\n");

console.log(`✓ Imported ${assetId} → ${asset.file.uri}`);
console.log(`  status: qa_pending`);
console.log(`  sha256: ${asset.file.checksum}`);
if (dimensions) {
  console.log(`  size: ${dimensions.width}x${dimensions.height}`);
} else {
  console.log("  size: unavailable from built-in parser; keep null and verify manually if needed.");
}
