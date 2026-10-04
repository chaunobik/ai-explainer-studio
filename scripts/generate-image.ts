import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {arg} from "./lib/cli";
import {ComfyUiClient} from "./lib/comfyui-client";
import {
  imageToImageWorkflow,
  textToImageWorkflow,
  type ImageCropRect,
} from "./lib/image-workflows";
import {loadDotEnv, env, envNumber} from "./lib/runtime-env";

loadDotEnv();

function parseCrop(value: string | undefined): ImageCropRect | undefined {
  if (!value) return undefined;
  const numbers = value.split(",").map(Number);
  if (
    numbers.length !== 4 ||
    numbers.some((number) => !Number.isFinite(number) || number < 0)
  ) {
    throw new Error("--crop must be x,y,width,height with non-negative numbers.");
  }
  const [x, y, width, height] = numbers;
  if (width <= 0 || height <= 0) {
    throw new Error("--crop width and height must be greater than zero.");
  }
  return {x, y, width, height};
}

function pngDimensions(buffer: Buffer): {width: number; height: number} | null {
  if (
    buffer.length < 24 ||
    buffer.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a"
  ) {
    return null;
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function registerGeneratedAsset(
  projectDirArg: string,
  assetId: string,
  generatedPath: string,
  prompt: string,
): void {
  const projectDir = path.resolve(projectDirArg);
  const projectFile = path.join(projectDir, "project.json");
  if (!fs.existsSync(projectFile)) {
    throw new Error(`Missing project.json: ${projectFile}`);
  }

  const project = JSON.parse(fs.readFileSync(projectFile, "utf8"));
  const actualManifest = path.join(
    projectDir,
    project.paths.image_assets_manifest,
  );
  const templateManifest = path.join(
    projectDir,
    project.paths.image_assets_template,
  );

  if (!fs.existsSync(actualManifest)) {
    if (!fs.existsSync(templateManifest)) {
      throw new Error(`Missing image manifest template: ${templateManifest}`);
    }
    fs.copyFileSync(templateManifest, actualManifest);
  }

  const manifest = JSON.parse(fs.readFileSync(actualManifest, "utf8"));
  const asset = manifest.assets.find((value: any) => value.asset_id === assetId);
  if (!asset) {
    throw new Error(
      `Asset ${assetId} is not declared in ${path.basename(actualManifest)}.`,
    );
  }

  for (const parentId of asset.parent_asset_ids ?? []) {
    const parent = manifest.assets.find(
      (value: any) => value.asset_id === parentId,
    );
    if (!parent || parent.status !== "approved") {
      throw new Error(
        `Cannot register ${assetId}: parent ${parentId} must be approved first.`,
      );
    }
  }

  const bytes = fs.readFileSync(generatedPath);
  const dimensions = pngDimensions(bytes);
  const declaredUri =
    asset.file?.uri ??
    path.join(project.paths.images_dir ?? "assets", `${assetId}.png`);
  const target = path.resolve(projectDir, declaredUri);
  if (!(target === projectDir || target.startsWith(projectDir + path.sep))) {
    throw new Error("Target image path escapes the project directory.");
  }

  fs.mkdirSync(path.dirname(target), {recursive: true});
  if (path.resolve(generatedPath) !== target) {
    fs.copyFileSync(generatedPath, target);
  }

  asset.status = "qa_pending";
  asset.attempt = Number(asset.attempt ?? 0) + 1;
  asset.provenance = {
    ...asset.provenance,
    provider_id: "comfyui",
    provider_mode: "api",
    source_uri: generatedPath,
    prompt_snapshot: prompt,
  };
  asset.file = {
    ...asset.file,
    uri: path.relative(projectDir, target).replace(/\\/g, "/"),
    mime_type: "image/png",
    width: dimensions?.width ?? null,
    height: dimensions?.height ?? null,
    checksum: crypto.createHash("sha256").update(bytes).digest("hex"),
  };
  asset.qa_result_ids = [];

  fs.writeFileSync(
    actualManifest,
    JSON.stringify(manifest, null, 2) + "\n",
  );
  console.log(
    `✓ Registered ${assetId} in ${path.relative(process.cwd(), actualManifest)} as qa_pending`,
  );
}

async function main(): Promise<void> {
  const prompt = arg("prompt");
  const out = arg("out");
  if (!prompt || !out) {
    throw new Error(
      'Usage: npm run image:generate -- --prompt "..." --out image.png [--reference A0.png --crop x,y,w,h] [--project <dir> --asset A1]',
    );
  }

  if (path.extname(out).toLowerCase() !== ".png") {
    throw new Error("ComfyUI image output must use a .png path.");
  }

  const options = {
    checkpoint: env("COMFYUI_CHECKPOINT"),
    prompt,
    negativePrompt:
      arg("negative") ??
      process.env.COMFYUI_NEGATIVE_PROMPT ??
      "text, watermark, logo, duplicate object, deformed geometry, inconsistent product design",
    width: Number(arg("width") ?? envNumber("IMAGE_WIDTH", 1024)),
    height: Number(arg("height") ?? envNumber("IMAGE_HEIGHT", 1536)),
    seed: Number(arg("seed") ?? Math.floor(Math.random() * 2_147_483_647)),
    steps: Number(arg("steps") ?? envNumber("IMAGE_STEPS", 28)),
    cfg: Number(arg("cfg") ?? envNumber("IMAGE_CFG", 6)),
    sampler: arg("sampler") ?? process.env.IMAGE_SAMPLER ?? "dpmpp_2m",
    scheduler: arg("scheduler") ?? process.env.IMAGE_SCHEDULER ?? "karras",
    filenamePrefix: "ai-explainer",
  };

  const client = new ComfyUiClient();
  await client.health();

  const reference = arg("reference");
  let workflow: Record<string, unknown>;
  if (reference) {
    const uploaded = await client.uploadImage(path.resolve(reference));
    workflow = imageToImageWorkflow({
      ...options,
      inputFilename: uploaded.subfolder
        ? `${uploaded.subfolder}/${uploaded.filename}`
        : uploaded.filename,
      denoise: Number(arg("denoise") ?? process.env.IMAGE_DENOISE ?? 0.42),
      crop: parseCrop(arg("crop")),
    });
  } else {
    workflow = textToImageWorkflow(options);
  }

  const outputPath = path.resolve(out);
  const promptId = await client.runToFile(workflow, outputPath);
  console.log(`✓ Image generated: ${outputPath}`);
  console.log(`  ComfyUI prompt: ${promptId}`);

  const project = arg("project");
  const asset = arg("asset");
  if ((project && !asset) || (!project && asset)) {
    throw new Error("--project and --asset must be provided together.");
  }
  if (project && asset) {
    registerGeneratedAsset(project, asset, outputPath, prompt);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
