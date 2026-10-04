import path from "node:path";
import {arg} from "./lib/cli";
import {loadDotEnv} from "./lib/runtime-env";
import {runWanImageToVideo} from "./lib/wan-runner";

loadDotEnv();

function main(): void {
  const image = arg("image");
  const prompt = arg("prompt");
  const out = arg("out");
  if (!image || !prompt || !out) {
    throw new Error(
      'Usage: npm run video:generate -- --image keyframe.png --prompt "motion description" --out scene.mp4',
    );
  }

  runWanImageToVideo({
    imagePath: path.resolve(image),
    prompt,
    outputPath: path.resolve(out),
  });
  console.log(`✓ Wan video generated: ${path.resolve(out)}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 2;
}
