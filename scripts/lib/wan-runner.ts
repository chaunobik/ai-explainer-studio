import {spawnSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export interface WanRunOptions {
  imagePath: string;
  prompt: string;
  outputPath: string;
}

export function wanAvailable(): {ok: boolean; reason?: string} {
  const repo = process.env.WAN_REPO_DIR;
  const model = process.env.WAN_MODEL_DIR;
  if (!repo) return {ok: false, reason: "WAN_REPO_DIR is not configured."};
  if (!model) return {ok: false, reason: "WAN_MODEL_DIR is not configured."};
  if (!fs.existsSync(path.join(repo, "generate.py"))) {
    return {ok: false, reason: `Wan generate.py not found under ${repo}.`};
  }
  if (!fs.existsSync(model)) {
    return {ok: false, reason: `Wan model directory not found: ${model}.`};
  }
  return {ok: true};
}

export function runWanImageToVideo(options: WanRunOptions): void {
  const available = wanAvailable();
  if (!available.ok) throw new Error(available.reason);

  const repo = process.env.WAN_REPO_DIR!;
  const model = process.env.WAN_MODEL_DIR!;
  const python = process.env.WAN_PYTHON ?? "python";
  const task = process.env.WAN_TASK ?? "ti2v-5B";
  const size = process.env.WAN_SIZE ?? "704*1280";

  fs.mkdirSync(path.dirname(options.outputPath), {recursive: true});

  const args = [
    "generate.py",
    "--task",
    task,
    "--size",
    size,
    "--ckpt_dir",
    path.resolve(model),
    "--offload_model",
    "True",
    "--convert_model_dtype",
    "--t5_cpu",
    "--image",
    path.resolve(options.imagePath),
    "--prompt",
    options.prompt,
    "--save_file",
    path.resolve(options.outputPath),
  ];

  const result = spawnSync(python, args, {
    cwd: repo,
    stdio: "inherit",
    shell: false,
    env: process.env,
  });

  if (result.error) {
    throw new Error(`Wan execution failed: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`Wan exited with code ${result.status ?? "unknown"}.`);
  }
  if (!fs.existsSync(options.outputPath)) {
    throw new Error(
      `Wan exited successfully but output was not created: ${options.outputPath}`,
    );
  }
}
