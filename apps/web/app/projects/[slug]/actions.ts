
"use server";

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {revalidatePath} from "next/cache";
import {projectDirForSlug, repoRoot} from "../../../lib/project-runtime";
import {renderFinalProject, renderScenePreview} from "../../../lib/render-service";
import {parseAndValidateQaJson} from "../../../lib/qa-contract";
import {
  manualOperatorReviewId,
  statusAfterImageImport,
  validateVoiceAssets,
} from "../../../../../packages/core/src/index";

function readJson(filePath: string): any {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), {recursive: true});
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n");
}

function extensionFor(file: File): string {
  const fromName = path.extname(file.name).toLowerCase();
  if ([".png", ".jpg", ".jpeg", ".webp"].includes(fromName)) return fromName;
  if (file.type === "image/png") return ".png";
  if (file.type === "image/jpeg") return ".jpg";
  if (file.type === "image/webp") return ".webp";
  throw new Error("Chỉ hỗ trợ PNG, JPG/JPEG hoặc WEBP.");
}

function mimeFor(ext: string): string {
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  throw new Error(`Unsupported image extension: ${ext}`);
}

function imageDimensions(
  buffer: Buffer,
  ext: string,
): {width: number; height: number} | null {
  if (
    ext === ".png" &&
    buffer.length >= 24 &&
    buffer.subarray(0, 8).toString("hex") === "89504e470d0a1a0a"
  ) {
    return {width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20)};
  }

  if (
    (ext === ".jpg" || ext === ".jpeg") &&
    buffer.length >= 4 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8
  ) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if (length < 2 || offset + 2 + length > buffer.length) break;
      const sof =
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf);
      if (sof && length >= 7) {
        return {
          height: buffer.readUInt16BE(offset + 5),
          width: buffer.readUInt16BE(offset + 7),
        };
      }
      offset += 2 + length;
    }
  }

  return null;
}

function refresh(slug: string): void {
  revalidatePath("/projects/" + slug);
}

function actionError(error: unknown): never {
  throw new Error(error instanceof Error ? error.message : String(error));
}

export async function uploadImageAction(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "");
  try {
    const assetId = String(formData.get("assetId") ?? "");
    const file = formData.get("file");
    if (!assetId) throw new Error("Thiếu asset ID.");
    if (!(file instanceof File) || file.size === 0) {
      throw new Error("Bạn chưa chọn file ảnh.");
    }
    if (file.size > 20 * 1024 * 1024) {
      throw new Error("Ảnh vượt quá giới hạn 20 MB.");
    }

    const projectDir = projectDirForSlug(slug);
    const project = readJson(path.join(projectDir, "project.json"));
    const actualManifest = path.join(projectDir, project.paths.image_assets_manifest);
    const templateManifest = path.join(projectDir, project.paths.image_assets_template);

    if (!fs.existsSync(actualManifest)) {
      if (!fs.existsSync(templateManifest)) {
        throw new Error("Không tìm thấy image-assets template.");
      }
      fs.copyFileSync(templateManifest, actualManifest);
    }

    const manifest = readJson(actualManifest);
    const asset = manifest.assets.find((value: any) => value.asset_id === assetId);
    if (!asset) throw new Error(`Không tìm thấy asset ${assetId}.`);

    const ext = extensionFor(file);
    const bytes = Buffer.from(await file.arrayBuffer());
    const imagesDir = path.resolve(projectDir, project.paths.images_dir);
    const target = path.join(imagesDir, `${assetId}${ext}`);
    fs.mkdirSync(imagesDir, {recursive: true});
    fs.writeFileSync(target, bytes);

    const dimensions = imageDimensions(bytes, ext);

    const nextStatus = statusAfterImageImport(asset.provenance.provider_mode);
    if (nextStatus === "approved") {
      for (const parentId of asset.parent_asset_ids ?? []) {
        const parent = manifest.assets.find((value: any) => value.asset_id === parentId);
        if (!parent || parent.status !== "approved") {
          throw new Error(`Parent ${parentId} phải approved trước ${assetId}.`);
        }
      }
      asset.qa_result_ids = [
        ...new Set([
          ...(asset.qa_result_ids ?? []),
          manualOperatorReviewId(assetId),
        ]),
      ];
    }
    asset.status = nextStatus;
    asset.provenance.source_uri = file.name;
    asset.file.uri = path.relative(projectDir, target).replaceAll(path.sep, "/");
    asset.file.mime_type = mimeFor(ext);
    asset.file.width = dimensions?.width ?? null;
    asset.file.height = dimensions?.height ?? null;
    asset.file.checksum = crypto.createHash("sha256").update(bytes).digest("hex");

    writeJson(actualManifest, manifest);
    refresh(slug);
  } catch (error) {
    actionError(error);
  }
}

export async function setImageDecisionAction(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "");
  try {
    const assetId = String(formData.get("assetId") ?? "");
    const decision = String(formData.get("decision") ?? "");
    const qaIdInput = String(formData.get("qaId") ?? "").trim();
    if (!["approved", "rejected"].includes(decision)) {
      throw new Error("Decision không hợp lệ.");
    }

    const projectDir = projectDirForSlug(slug);
    const project = readJson(path.join(projectDir, "project.json"));
    const manifestPath = path.join(projectDir, project.paths.image_assets_manifest);
    if (!fs.existsSync(manifestPath)) {
      throw new Error("Chưa có image-assets.json. Hãy import ảnh trước.");
    }

    const manifest = readJson(manifestPath);
    const asset = manifest.assets.find((value: any) => value.asset_id === assetId);
    if (!asset) throw new Error(`Không tìm thấy asset ${assetId}.`);

    if (decision === "approved") {
      const qaId = qaIdInput || (assetId === "A0" ? "MANUAL-REF-A0" : "");
      if (!qaId) {
        throw new Error("Asset sinh bởi AI cần QA ID thực tế trước khi approve.");
      }
      if (!asset.file?.uri) throw new Error("Asset chưa có file.");
      const actualFile = path.resolve(projectDir, asset.file.uri);
      if (!fs.existsSync(actualFile)) throw new Error("File asset không tồn tại.");

      for (const parentId of asset.parent_asset_ids ?? []) {
        const parent = manifest.assets.find((value: any) => value.asset_id === parentId);
        if (!parent || parent.status !== "approved") {
          throw new Error(`Parent ${parentId} phải approved trước ${assetId}.`);
        }
      }

      asset.status = "approved";
      asset.qa_result_ids = [...new Set([...(asset.qa_result_ids ?? []), qaId])];
    } else {
      asset.status = "rejected";
      if (qaIdInput) {
        asset.qa_result_ids = [...new Set([...(asset.qa_result_ids ?? []), qaIdInput])];
      }
    }

    writeJson(manifestPath, manifest);
    refresh(slug);
  } catch (error) {
    actionError(error);
  }
}

export async function savePromptQaAction(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "");
  try {
    const assetId = String(formData.get("assetId") ?? "");
    const raw = String(formData.get("qaJson") ?? "").trim();
    if (!raw) throw new Error("Hãy dán Prompt QA JSON từ ChatGPT.");

    const qa = parseAndValidateQaJson(raw, "image_prompt_qa");

    const projectDir = projectDirForSlug(slug);
    const project = readJson(path.join(projectDir, "project.json"));
    const promptSpecPath = (project.paths.image_prompt_specs as string[])
      .map((relative: string) => ({
        relative,
        value: readJson(path.join(projectDir, relative)),
      }))
      .find((item) => item.value.asset_id === assetId);

    if (!promptSpecPath) throw new Error(`Không tìm thấy ImagePromptSpec của ${assetId}.`);
    if (qa.prompt_id !== promptSpecPath.value.prompt_id) {
      throw new Error(
        `prompt_id không khớp. Mong đợi ${promptSpecPath.value.prompt_id}, nhận ${qa.prompt_id ?? "missing"}.`,
      );
    }
    if (!["pass", "fail", "needs_human_review"].includes(qa.status)) {
      throw new Error("QA status phải là pass, fail hoặc needs_human_review.");
    }

    const qaPath = (project.paths.image_prompt_qa_outputs as string[]).find((relative) =>
      path.basename(relative).toLowerCase().includes(assetId.toLowerCase()),
    );
    if (!qaPath) throw new Error(`Không tìm thấy QA output path cho ${assetId}.`);

    writeJson(path.join(projectDir, qaPath), qa);
    refresh(slug);
  } catch (error) {
    actionError(error);
  }
}


function audioExtension(file: File): string {
  const ext = path.extname(file.name).toLowerCase();
  if ([".mp3", ".wav", ".m4a", ".mp4"].includes(ext)) return ext;
  if (file.type === "audio/mpeg") return ".mp3";
  if (file.type === "audio/wav" || file.type === "audio/x-wav") return ".wav";
  if (file.type === "audio/mp4") return ".m4a";
  throw new Error("Chỉ hỗ trợ MP3, WAV hoặc M4A.");
}

function audioMime(ext: string): string {
  if (ext === ".mp3") return "audio/mpeg";
  if (ext === ".wav") return "audio/wav";
  if (ext === ".m4a" || ext === ".mp4") return "audio/mp4";
  throw new Error("Audio extension không hợp lệ.");
}

function wavDuration(buffer: Buffer): number | null {
  if (
    buffer.length < 44 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WAVE"
  ) {
    return null;
  }

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

export async function uploadVoiceAction(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "");
  try {
    const assetId = String(formData.get("assetId") ?? "");
    const file = formData.get("file");
    const durationInput = String(formData.get("duration") ?? "").trim();

    if (!assetId) throw new Error("Thiếu voice asset ID.");
    if (!(file instanceof File) || file.size === 0) {
      throw new Error("Bạn chưa chọn file audio.");
    }
    if (file.size > 30 * 1024 * 1024) {
      throw new Error("Audio vượt quá giới hạn 30 MB.");
    }

    const projectDir = projectDirForSlug(slug);
    const project = readJson(path.join(projectDir, "project.json"));
    const actualManifest = path.join(projectDir, project.paths.voice_assets_manifest);
    const templateManifest = path.join(projectDir, project.paths.voice_assets_template);

    if (!fs.existsSync(actualManifest)) {
      if (!fs.existsSync(templateManifest)) {
        throw new Error("Không tìm thấy voice-assets template.");
      }
      fs.copyFileSync(templateManifest, actualManifest);
    }

    const manifest = readJson(actualManifest);
    const asset = manifest.assets.find((value: any) => value.asset_id === assetId);
    if (!asset) throw new Error("Không tìm thấy voice asset " + assetId + ".");

    const ext = audioExtension(file);
    const bytes = Buffer.from(await file.arrayBuffer());
    let duration =
      durationInput.length > 0 ? Number(durationInput) : null;

    if (duration != null && (!Number.isFinite(duration) || duration <= 0)) {
      throw new Error("Duration phải là số giây > 0.");
    }
    if (duration == null && ext === ".wav") {
      duration = wavDuration(bytes);
    }
    if (duration == null) {
      throw new Error("MP3/M4A cần nhập duration thực tế theo giây.");
    }

    const voiceDir = path.join(projectDir, "voice");
    fs.mkdirSync(voiceDir, {recursive: true});
    const target = path.join(voiceDir, assetId + ext);
    fs.writeFileSync(target, bytes);

    asset.status = "qa_pending";
    asset.file.uri = path.relative(projectDir, target).replaceAll(path.sep, "/");
    asset.file.mime_type = audioMime(ext);
    asset.file.duration_sec = duration;
    asset.file.checksum = crypto.createHash("sha256").update(bytes).digest("hex");

    writeJson(actualManifest, manifest);
    refresh(slug);
  } catch (error) {
    actionError(error);
  }
}

export async function setVoiceDecisionAction(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "");
  try {
    const assetId = String(formData.get("assetId") ?? "");
    const decision = String(formData.get("decision") ?? "");
    const qaId = String(formData.get("qaId") ?? "").trim();

    if (!["approved", "rejected"].includes(decision)) {
      throw new Error("Decision không hợp lệ.");
    }

    const projectDir = projectDirForSlug(slug);
    const project = readJson(path.join(projectDir, "project.json"));
    const manifestPath = path.join(projectDir, project.paths.voice_assets_manifest);
    if (!fs.existsSync(manifestPath)) {
      throw new Error("Chưa có voice-assets.json. Hãy import audio trước.");
    }

    const manifest = readJson(manifestPath);
    const asset = manifest.assets.find((value: any) => value.asset_id === assetId);
    if (!asset) throw new Error("Không tìm thấy voice asset " + assetId + ".");

    if (decision === "approved") {
      if (!qaId) throw new Error("Approve voice cần QA ID.");
      if (!asset.file?.uri || asset.file?.duration_sec == null) {
        throw new Error("Voice asset thiếu file hoặc duration.");
      }
      const filePath = path.resolve(projectDir, asset.file.uri);
      if (!fs.existsSync(filePath)) throw new Error("File audio không tồn tại.");

      const fullSpec = readJson(path.join(projectDir, project.paths.voice_spec));
      const segment = fullSpec.segments.find(
        (value: any) => value.output_asset_id === assetId,
      );
      if (!segment) throw new Error("Không có VoiceSpec segment tương ứng.");

      const report = validateVoiceAssets(
        {...fullSpec, segments: [segment]},
        [asset],
        {requireApproved: false},
      );
      if (!report.ok) {
        throw new Error(
          "Deterministic Voice QA failed: " +
            report.errors.map((value) => "[" + value.code + "] " + value.message).join(" | "),
        );
      }

      asset.status = "approved";
      asset.qa_result_ids = [...new Set([...(asset.qa_result_ids ?? []), qaId])];
    } else {
      asset.status = "rejected";
      if (qaId) {
        asset.qa_result_ids = [...new Set([...(asset.qa_result_ids ?? []), qaId])];
      }
    }

    writeJson(manifestPath, manifest);
    refresh(slug);
  } catch (error) {
    actionError(error);
  }
}


function parseQaJson(raw: string, expectedStage: "motion" | "final"): any {
  if (!raw.trim()) throw new Error("Hãy dán QA JSON.");
  const qa = parseAndValidateQaJson(
    raw,
    expectedStage === "motion" ? "motion_qa" : "final_qa",
  );

  if (qa?.qa_result?.stage !== expectedStage) {
    throw new Error("qa_result.stage phải là " + expectedStage + ".");
  }

  return qa;
}

export async function renderScenePreviewAction(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "");
  try {
    const sceneId = String(formData.get("sceneId") ?? "");
    if (!/^S[0-9]+$/.test(sceneId)) throw new Error("Scene ID không hợp lệ.");

    await renderScenePreview({
      repoRoot: repoRoot(),
      projectDir: projectDirForSlug(slug),
      sceneId,
    });

    refresh(slug);
  } catch (error) {
    actionError(error);
  }
}

export async function saveMotionQaAction(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "");
  try {
    const raw = String(formData.get("qaJson") ?? "");
    const qa = parseQaJson(raw, "motion");
    const projectDir = projectDirForSlug(slug);
    const project = readJson(path.join(projectDir, "project.json"));
    writeJson(path.join(projectDir, project.paths.motion_qa_output), qa);
    refresh(slug);
  } catch (error) {
    actionError(error);
  }
}

export async function renderFinalAction(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "");
  try {
    await renderFinalProject({
      repoRoot: repoRoot(),
      projectDir: projectDirForSlug(slug),
    });
    refresh(slug);
  } catch (error) {
    actionError(error);
  }
}

export async function saveFinalQaAction(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "");
  try {
    const raw = String(formData.get("qaJson") ?? "");
    const qa = parseQaJson(raw, "final");
    const projectDir = projectDirForSlug(slug);
    const project = readJson(path.join(projectDir, "project.json"));
    writeJson(path.join(projectDir, project.paths.final_qa_output), qa);
    refresh(slug);
  } catch (error) {
    actionError(error);
  }
}


export async function saveMultiviewPromptQaAction(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "");
  try {
    const raw = String(formData.get("qaJson") ?? "").trim();
    if (!raw) throw new Error("Hãy dán Multi-View Prompt QA JSON từ ChatGPT.");

    const qa = parseAndValidateQaJson(raw, "multiview_prompt_qa");

    const projectDir = projectDirForSlug(slug);
    const project = readJson(path.join(projectDir, "project.json"));
    const prompt = readJson(
      path.join(projectDir, project.paths.multiview_reference_prompt),
    );

    if (qa.prompt_id !== prompt.prompt_id) {
      throw new Error(
        `prompt_id không khớp. Mong đợi ${prompt.prompt_id}, nhận ${qa.prompt_id ?? "missing"}.`,
      );
    }
    if (!["pass", "fail", "needs_human_review"].includes(qa.status)) {
      throw new Error("QA status phải là pass, fail hoặc needs_human_review.");
    }

    writeJson(
      path.join(projectDir, project.paths.multiview_prompt_qa_output),
      qa,
    );
    refresh(slug);
  } catch (error) {
    actionError(error);
  }
}

export async function saveMultiviewQaAction(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "");
  try {
    const raw = String(formData.get("qaJson") ?? "").trim();
    if (!raw) throw new Error("Hãy dán Multi-View QA JSON từ ChatGPT.");

    const qa = parseAndValidateQaJson(raw, "multiview_qa");

    const projectDir = projectDirForSlug(slug);
    const project = readJson(path.join(projectDir, "project.json"));
    const prompt = readJson(
      path.join(projectDir, project.paths.multiview_reference_prompt),
    );

    if (qa.asset_id !== "A0") {
      throw new Error(`asset_id phải là A0, nhận ${qa.asset_id ?? "missing"}.`);
    }
    if (qa.reference_prompt_id !== prompt.prompt_id) {
      throw new Error(
        `reference_prompt_id phải là ${prompt.prompt_id}, nhận ${qa.reference_prompt_id ?? "missing"}.`,
      );
    }
    const status = qa?.qa_result?.status;
    if (!["pass", "fail", "needs_human_review"].includes(status)) {
      throw new Error(
        "qa_result.status phải là pass, fail hoặc needs_human_review.",
      );
    }

    const manifestPath = path.join(projectDir, project.paths.image_assets_manifest);
    if (!fs.existsSync(manifestPath)) {
      throw new Error("Chưa có image-assets.json. Hãy generate/import A0 trước.");
    }
    const manifest = readJson(manifestPath);
    const a0 = manifest.assets.find((asset: any) => asset.asset_id === "A0");
    if (!a0) throw new Error("Không tìm thấy A0 trong image manifest.");
    if (!a0.file?.uri || !fs.existsSync(path.resolve(projectDir, a0.file.uri))) {
      throw new Error("A0 chưa có file ảnh hợp lệ.");
    }

    writeJson(path.join(projectDir, project.paths.multiview_qa_output), qa);

    const qaId = String(qa.qa_result?.qa_id ?? "").trim();
    if (status === "pass") {
      if (!qaId) throw new Error("Multi-View QA PASS phải có qa_result.qa_id.");
      a0.status = "approved";
      a0.qa_result_ids = [...new Set([...(a0.qa_result_ids ?? []), qaId])];
    } else if (status === "needs_human_review") {
      a0.status = "needs_human_review";
      if (qaId) {
        a0.qa_result_ids = [...new Set([...(a0.qa_result_ids ?? []), qaId])];
      }
    } else {
      a0.status = "rejected";
      a0.attempt = Number(a0.attempt ?? 0) + 1;
      if (qaId) {
        a0.qa_result_ids = [...new Set([...(a0.qa_result_ids ?? []), qaId])];
      }
    }

    writeJson(manifestPath, manifest);
    refresh(slug);
  } catch (error) {
    actionError(error);
  }
}
