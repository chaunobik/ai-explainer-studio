import fs from "node:fs";
import path from "node:path";
import {ComfyUiClient} from "./lib/comfyui-client";
import {VieNeuClient} from "./lib/vieneu-client";
import {loadDotEnv} from "./lib/runtime-env";
import {wanAvailable} from "./lib/wan-runner";

loadDotEnv();

async function check(name: string, fn: () => Promise<string>): Promise<boolean> {
  try {
    const detail = await fn();
    console.log(`✓ ${name}: ${detail}`);
    return true;
  } catch (error) {
    console.error(
      `✗ ${name}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return false;
  }
}

async function main(): Promise<void> {
  console.log("AI Explainer Studio provider doctor\n");

  const comfy = await check("ComfyUI", async () => {
    await new ComfyUiClient().health();
    const checkpoint = process.env.COMFYUI_CHECKPOINT;
    if (!checkpoint) {
      throw new Error(
        "server is reachable but COMFYUI_CHECKPOINT is not configured in .env",
      );
    }
    const client = new ComfyUiClient();
    await client.validateCoreImageRuntime(checkpoint);
    return `reachable at ${process.env.COMFYUI_BASE_URL ?? "http://127.0.0.1:8188"}; checkpoint=${checkpoint}; core workflow nodes ready`;
  });

  const voice = await check("VieNeu-TTS", async () => {
    const client = new VieNeuClient();
    const health = await client.health();
    const voices = await client.voices();
    const requested = process.env.VIENEU_VOICE ?? "Mai Anh";
    if (!voices.some((value) => value.id === requested || value.name === requested)) {
      throw new Error(
        `voice "${requested}" not found. Available: ${voices
          .slice(0, 10)
          .map((value) => value.name ?? value.id)
          .join(", ")}`,
      );
    }
    return `${health.backend ?? "ready"} at ${process.env.VIENEU_BASE_URL ?? "http://127.0.0.1:8000"}; voice=${requested}`;
  });

  const wan = wanAvailable();
  if (wan.ok) {
    console.log(
      `✓ Wan2.2: repo=${process.env.WAN_REPO_DIR}; model=${process.env.WAN_MODEL_DIR}`,
    );
  } else {
    console.warn(
      `! Wan2.2: ${wan.reason} Generative video will fall back to Remotion/static motion.`,
    );
  }

  const outputRoot = process.env.MEDIA_OUTPUT_DIR ?? ".ai-explainer/media";
  fs.mkdirSync(path.resolve(outputRoot), {recursive: true});
  console.log(`✓ Media output directory: ${path.resolve(outputRoot)}`);

  if (!comfy || !voice) {
    process.exitCode = 2;
    console.error(
      "\nRequired providers are not ready. Fix ComfyUI/VieNeu before create-video.",
    );
    return;
  }

  console.log(
    "\n✓ Required providers are ready. Wan is optional because a deterministic motion fallback exists.",
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
