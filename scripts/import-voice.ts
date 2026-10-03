import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

function mimeFor(ext: string): string {
  switch (ext.toLowerCase()) {
    case ".mp3": return "audio/mpeg";
    case ".wav": return "audio/wav";
    case ".m4a":
    case ".mp4": return "audio/mp4";
    default: throw new Error(`Unsupported audio extension: ${ext}`);
  }
}

function wavDuration(buffer: Buffer): number | null {
  if (
    buffer.length < 44 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WAVE"
  ) return null;

  let offset = 12;
  let byteRate: number | null = null;
  let dataSize: number | null = null;

  while (offset + 8 <= buffer.length) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const dataStart = offset + 8;
    if (dataStart + size > buffer.length) break;

    if (id === "fmt " && size >= 16) {
      byteRate = buffer.readUInt32LE(dataStart + 8);
    } else if (id === "data") {
      dataSize = size;
    }

    offset = dataStart + size + (size % 2);
  }

  if (!byteRate || dataSize == null) return null;
  return dataSize / byteRate;
}

const projectDir = path.resolve(arg("project") ?? "examples/fridge-hot-behind");
const assetId = arg("asset");
const sourceArg = arg("file");
const durationArg = arg("duration");

if (!assetId || !sourceArg) {
  throw new Error(
    "Usage: npm run voice:import -- --asset=V1 --file=/path/audio.mp3 [--duration=4.2] [--project=...]",
  );
}

const source = path.resolve(sourceArg);
if (!fs.existsSync(source)) throw new Error(`Source audio does not exist: ${source}`);

const project = JSON.parse(fs.readFileSync(path.join(projectDir, "project.json"), "utf8"));
const actualManifest = path.join(projectDir, project.paths.voice_assets_manifest);
const templateManifest = path.join(projectDir, project.paths.voice_assets_template);

if (!fs.existsSync(actualManifest)) {
  if (!fs.existsSync(templateManifest)) {
    throw new Error(`Missing voice manifest template: ${templateManifest}`);
  }
  fs.copyFileSync(templateManifest, actualManifest);
}

const manifest = JSON.parse(fs.readFileSync(actualManifest, "utf8"));
const asset = manifest.assets.find((value: any) => value.asset_id === assetId);
if (!asset) throw new Error(`Voice asset ${assetId} is not declared in manifest.`);

const ext = path.extname(source).toLowerCase();
const mime = mimeFor(ext);
const bytes = fs.readFileSync(source);

let duration =
  durationArg != null && durationArg !== "" ? Number(durationArg) : null;
if (duration != null && (!Number.isFinite(duration) || duration <= 0)) {
  throw new Error("--duration must be a positive number of seconds.");
}
if (duration == null && ext === ".wav") duration = wavDuration(bytes);
if (duration == null) {
  throw new Error(
    `Duration is required for ${ext}. Provide --duration=<seconds>. WAV files can be measured automatically.`,
  );
}

const voiceDir = path.join(projectDir, "voice");
fs.mkdirSync(voiceDir, {recursive: true});
const target = path.join(voiceDir, `${assetId}${ext}`);
fs.copyFileSync(source, target);

asset.status = "qa_pending";
asset.file.uri = path.relative(projectDir, target).replaceAll(path.sep, "/");
asset.file.mime_type = mime;
asset.file.duration_sec = duration;
asset.file.checksum = crypto.createHash("sha256").update(bytes).digest("hex");

fs.writeFileSync(actualManifest, JSON.stringify(manifest, null, 2) + "\n");

console.log(`✓ Imported ${assetId} → ${asset.file.uri}`);
console.log(`  status: qa_pending`);
console.log(`  duration: ${duration.toFixed(3)}s`);
console.log(`  sha256: ${asset.file.checksum}`);
