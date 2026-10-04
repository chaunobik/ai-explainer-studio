import path from "node:path";
import {arg} from "./lib/cli";
import {ComfyUiClient} from "./lib/comfyui-client";
import {
  imageToImageWorkflow,
  textToImageWorkflow,
} from "./lib/image-workflows";
import {loadDotEnv, env, envNumber} from "./lib/runtime-env";

loadDotEnv();

async function main(): Promise<void> {
  const prompt = arg("prompt");
  const out = arg("out");
  if (!prompt || !out) {
    throw new Error(
      'Usage: npm run image:generate -- --prompt "..." --out path/to/image.png [--reference path/to/reference.png]',
    );
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
    });
  } else {
    workflow = textToImageWorkflow(options);
  }

  const outputPath = path.resolve(out);
  const promptId = await client.runToFile(workflow, outputPath);
  console.log(`✓ Image generated: ${outputPath}`);
  console.log(`  ComfyUI prompt: ${promptId}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
