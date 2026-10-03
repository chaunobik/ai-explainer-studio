import fs from "node:fs";
import path from "node:path";
import {validateMotionSpec, motionTotalDuration} from "../packages/core/src/index";

const root = process.cwd();
const dir = path.join(root, "examples", "fridge-hot-behind");
const motion = JSON.parse(fs.readFileSync(path.join(dir, "motion-spec.json"), "utf8"));
const storyboard = JSON.parse(fs.readFileSync(path.join(dir, "storyboard-spec.json"), "utf8"));

const durations = new Map<string, number>(
  storyboard.scenes.map((scene: any) => [scene.scene_id, Number(scene.duration_sec)]),
);

const report = validateMotionSpec(motion, durations);

if (!report.ok) {
  console.error("MotionSpec validation failed:");
  for (const error of report.errors) {
    console.error(`- [${error.code}] ${error.path}: ${error.message}`);
  }
  process.exit(1);
}

const total = motionTotalDuration(motion);
if (Math.abs(total - Number(storyboard.total_duration_sec)) > 0.001) {
  console.error(
    `Motion total ${total}s does not match storyboard total ${storyboard.total_duration_sec}s.`,
  );
  process.exit(1);
}

console.log(`✓ MotionSpec passes deterministic validation (${motion.scenes.length} scenes, ${total}s).`);
