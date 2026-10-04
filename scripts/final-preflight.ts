import fs from "node:fs";
import path from "node:path";
import {getVideoMetadata} from "@remotion/renderer";
import {arg} from "./lib/cli";

async function main(): Promise<void> {
  const projectDir = path.resolve(arg("project") ?? "examples/fridge-hot-behind");
  const projectPath = path.join(projectDir, "project.json");
  if (!fs.existsSync(projectPath)) {
    throw new Error(`Missing project.json: ${projectPath}`);
  }

  const project = JSON.parse(fs.readFileSync(projectPath, "utf8"));
  const output = path.resolve(projectDir, project.paths.output_file);
  const motionPath = path.resolve(projectDir, project.paths.motion_spec);

  if (!fs.existsSync(output)) {
    throw new Error(`Final output does not exist: ${output}`);
  }
  const bytes = fs.statSync(output).size;
  if (bytes < 100_000) {
    throw new Error(
      `Final output is suspiciously small (${bytes} bytes): ${output}`,
    );
  }
  if (!fs.existsSync(motionPath)) {
    throw new Error(`Missing MotionSpec: ${motionPath}`);
  }

  const motion = JSON.parse(fs.readFileSync(motionPath, "utf8"));
  const expectedDuration = motion.scenes.reduce(
    (sum: number, scene: any) => sum + Number(scene.duration_sec),
    0,
  );
  const metadata = await getVideoMetadata(output, {logLevel: "error"});

  const failures: string[] = [];
  if (metadata.width !== 1080 || metadata.height !== 1920) {
    failures.push(
      `resolution ${metadata.width}x${metadata.height}, expected 1080x1920`,
    );
  }
  if (Math.abs(metadata.fps - Number(motion.fps)) > 0.01) {
    failures.push(`fps ${metadata.fps}, expected ${motion.fps}`);
  }
  if (metadata.durationInSeconds == null) {
    failures.push("duration could not be read");
  } else if (Math.abs(metadata.durationInSeconds - expectedDuration) > 0.75) {
    failures.push(
      `duration ${metadata.durationInSeconds.toFixed(3)}s, expected ${expectedDuration.toFixed(3)}s`,
    );
  }

  const report = {
    ok: failures.length === 0,
    output: path.relative(projectDir, output).replace(/\\/g, "/"),
    bytes,
    metadata,
    expected_duration_sec: Number(expectedDuration.toFixed(3)),
    failures,
  };

  const reportPath = path.join(projectDir, "final-preflight.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));

  if (!report.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
