
"use server";

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {revalidatePath} from "next/cache";
import {projectDirForSlug} from "../../../lib/project-runtime";

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
    asset.status = "qa_pending";
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

    let qa: any;
    try {
      qa = JSON.parse(raw);
    } catch {
      throw new Error("Prompt QA không phải JSON hợp lệ.");
    }

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
