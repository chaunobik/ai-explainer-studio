import {spawnSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {arg} from "./lib/cli";
import {loadDotEnv} from "./lib/runtime-env";

loadDotEnv();

const video = arg("video");
if (!video) {
  throw new Error(
    "Usage: npm run video:frames -- --video <scene.mp4> [--out-dir <dir>] [--count 5]",
  );
}

const videoPath = path.resolve(video);
if (!fs.existsSync(videoPath)) {
  throw new Error(`Video not found: ${videoPath}`);
}

const outDir = path.resolve(
  arg("out-dir") ?? path.join(path.dirname(videoPath), path.basename(videoPath, ".mp4") + "-qa-frames"),
);
const count = arg("count") ?? "5";
const python = process.env.WAN_PYTHON ?? "python";
const script = path.resolve("scripts/python/extract_video_frames.py");

const result = spawnSync(
  python,
  [script, "--video", videoPath, "--out-dir", outDir, "--count", count],
  {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: false,
    env: process.env,
  },
);

if (result.error) {
  throw new Error(`Frame extraction failed: ${result.error.message}`);
}
if (result.status !== 0) {
  throw new Error(
    `Frame extraction exited with code ${result.status ?? "unknown"}. The configured WAN_PYTHON must include OpenCV, which is part of the official Wan2.2 requirements.`,
  );
}

console.log(`✓ QA frames: ${outDir}`);
