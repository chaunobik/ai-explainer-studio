import fs from "node:fs";
import path from "node:path";
import {
  ManualVoiceProvider,
  validateVoiceSpecAgainstStoryboard,
} from "../packages/core/src/index";

const root = process.cwd();
const dir = path.join(root, "examples", "fridge-hot-behind");
const spec = JSON.parse(fs.readFileSync(path.join(dir, "voice-spec.json"), "utf8"));
const storyboard = JSON.parse(
  fs.readFileSync(path.join(dir, "storyboard-spec.json"), "utf8"),
);
const storedJobs = JSON.parse(
  fs.readFileSync(path.join(dir, "voice-jobs.json"), "utf8"),
);

const report = validateVoiceSpecAgainstStoryboard(spec, storyboard);
if (!report.ok) {
  console.error("VoiceSpec validation failed:");
  for (const error of report.errors) {
    console.error(`- [${error.code}] ${error.path}: ${error.message}`);
  }
  process.exit(1);
}

const generated = new ManualVoiceProvider().createJobs(spec);
if (JSON.stringify(generated) !== JSON.stringify(storedJobs.jobs)) {
  console.error("Stored voice-jobs.json has drifted from ManualVoiceProvider output.");
  process.exit(1);
}

console.log(`✓ VoiceSpec matches all ${storyboard.scenes.length} storyboard scenes and manual jobs are reproducible.`);
