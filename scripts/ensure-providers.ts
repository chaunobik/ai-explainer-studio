import {spawn} from "node:child_process";
import {ComfyUiClient} from "./lib/comfyui-client";
import {VieNeuClient} from "./lib/vieneu-client";
import {loadDotEnv} from "./lib/runtime-env";

loadDotEnv();

async function waitUntil(
  label: string,
  check: () => Promise<void>,
  timeoutMs = 120_000,
): Promise<void> {
  const started = Date.now();
  let lastError = "unknown";
  while (Date.now() - started < timeoutMs) {
    try {
      await check();
      console.log(`✓ ${label} ready`);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  throw new Error(`${label} did not become ready: ${lastError}`);
}

function start(command: string, label: string): void {
  console.log(`Starting ${label}: ${command}`);
  const child = spawn(command, {
    cwd: process.cwd(),
    shell: true,
    detached: true,
    stdio: "ignore",
    env: process.env,
  });
  child.unref();
}

async function ensure(
  label: string,
  check: () => Promise<void>,
  startCommand: string | undefined,
): Promise<void> {
  try {
    await check();
    console.log(`✓ ${label} already running`);
    return;
  } catch (error) {
    if (!startCommand) {
      throw new Error(
        `${label} is not reachable and no start command is configured. ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  start(startCommand, label);
  await waitUntil(label, check);
}

async function main(): Promise<void> {
  const comfy = new ComfyUiClient();
  const voice = new VieNeuClient();

  await ensure(
    "ComfyUI",
    () => comfy.health(),
    process.env.COMFYUI_START_COMMAND,
  );
  await ensure(
    "VieNeu-TTS",
    async () => {
      await voice.health();
    },
    process.env.VIENEU_START_COMMAND,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(2);
});
