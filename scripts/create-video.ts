import {spawn, spawnSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function valueArg(name: string): string | undefined {
  const index = process.argv.indexOf("--" + name);
  if (index < 0) return undefined;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) return undefined;
  return value;
}

function positionalTopic(): string | undefined {
  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--topic" || arg === "--model") {
      index += 1;
      continue;
    }
    if (!arg.startsWith("--")) return arg;
  }
  return undefined;
}

function slugify(value: string): string {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return slug || "untitled";
}

function npmCommand(): string {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function resolveCodexCommand(): string {
  const candidates =
    process.platform === "win32"
      ? ["codex.exe", "codex.cmd", "codex"]
      : ["codex"];

  for (const candidate of candidates) {
    const probe = spawnSync(candidate, ["--version"], {
      cwd: process.cwd(),
      encoding: "utf8",
      shell: false,
    });
    if (!probe.error && probe.status === 0) return candidate;
  }

  throw new Error(
    [
      "Codex CLI is not installed or is not on PATH.",
      "Install it on Windows with:",
      '  powershell -ExecutionPolicy ByPass -c "irm https://chatgpt.com/codex/install.ps1 | iex"',
      "Then run: codex login",
    ].join("\n"),
  );
}

function runOrThrow(executable: string, args: string[], label: string): void {
  const result = spawnSync(executable, args, {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: false,
  });
  if (result.error) {
    throw new Error(`${label}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`${label} exited with code ${result.status ?? "unknown"}.`);
  }
}

function preflightCodex(): string {
  const executable = resolveCodexCommand();
  const login = spawnSync(executable, ["login", "status"], {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: false,
  });

  const authOutput = `${login.stdout ?? ""}\n${login.stderr ?? ""}`;
  if (login.error || login.status !== 0 || !/Logged in/i.test(authOutput)) {
    throw new Error(
      [
        "Codex CLI is installed but is not authenticated.",
        "Run:",
        "  codex login",
        "and sign in with your ChatGPT account, then retry create-video.",
      ].join("\n"),
    );
  }

  return executable;
}

async function main(): Promise<void> {
  const topic = valueArg("topic") ?? positionalTopic();
  if (!topic?.trim()) {
    throw new Error(
      [
        "Missing topic.",
        "Use either:",
        '  npm run create-video -- "Tại sao tủ lạnh nóng phía sau?"',
        "or:",
        '  npm run create-video -- --topic "Tại sao tủ lạnh nóng phía sau?"',
      ].join("\n"),
    );
  }

  const codexCommand = preflightCodex();

  const slug = slugify(topic);
  const runDir = path.join(process.cwd(), ".ai-explainer", "runs", slug);
  const projectDir = path.join(
    process.cwd(),
    ".ai-explainer",
    "projects",
    slug,
  );
  fs.mkdirSync(runDir, {recursive: true});

  const requestFile = path.join(runDir, "request.txt");
  const resultFile = path.join(runDir, "codex-result.json");
  fs.writeFileSync(requestFile, topic.trim() + "\n", "utf8");
  if (fs.existsSync(resultFile)) fs.rmSync(resultFile);

  // Create an isolated artifact workspace for this topic.
  runOrThrow(
    npmCommand(),
    ["run", "project:init", "--", "--topic", topic.trim(), "--slug", slug],
    "Project initialization",
  );

  // Ensure required media services are running before handing the workflow to Codex.
  runOrThrow(
    npmCommand(),
    ["run", "provider:ensure"],
    "Provider startup",
  );
  runOrThrow(
    npmCommand(),
    ["run", "provider:doctor"],
    "Provider preflight",
  );

  // Initialize or resume the persistent hands-off state before delegating to Codex.
  runOrThrow(
    npmCommand(),
    ["run", "autopilot", "--", "--topic", topic.trim()],
    "Autopilot initialization",
  );

  const schemaPath = path.join(
    process.cwd(),
    "schemas",
    "create-video-result.schema.json",
  );

  const prompt = [
    "You are the hands-off production agent for AI Explainer Studio.",
    "",
    `TOPIC: ${topic.trim()}`,
    `RUN SLUG: ${slug}`,
    `PROJECT DIR: ${path.relative(process.cwd(), projectDir).replace(/\\/g, "/")}`,
    "",
    "Execute the project from topic to final output. Do not merely explain what should be done.",
    "Read and obey AGENTS.md and prompts/orchestrator/AUTONOMOUS_ORCHESTRATOR.md before doing work.",
    "Use the persistent autonomous state for this run and continue stage-by-stage until complete.",
    "",
    "Required behavior:",
    "- hands_off mode: do not stop for canonical, storyboard, or final review checkpoints;",
    "- Research -> Script -> Draft Storyboard -> VieNeu Voice + timing sync -> Asset Plan -> A0 -> Scenes -> Motion -> Final Render -> Final QA;",
    "- run the relevant schema/QA checks before marking any stage PASS;",
    "- automatically diagnose and repair failures, with bounded retries;",
    "- preserve passing upstream artifacts and repair only the smallest failing scope;",
    "- use the project provider commands instead of inventing ad-hoc integrations:",
    "  npm run image:generate -- --prompt \"...\" --out <png> --project <project-dir> --asset <asset-id> [--reference <png> --crop x,y,w,h];",
    "  npm run image:status -- --project=<project-dir> --asset=<asset-id> --status=approved --qa-id=<qa-id>;",
    "  npm run voice:generate -- --spec <voice-spec.json> --project <project-dir>;",
    "  npm run voice:sync-timing -- --project=<project-dir>;",
    "  npm run video:generate -- --image <png> --prompt \"...\" --out <mp4> --project <project-dir> --scene-id <id> --asset-id <id>;",
    "  npm run video:status -- --project=<project-dir> --asset=<id> --status=approved --qa-id=<qa-id>;",
    "- route realistic motion to Wan, deterministic technical scenes to Remotion/SVG, and use configured fallbacks;",
    "- provider:doctor already passed before this agent started; if Wan itself is unavailable use deterministic motion fallback rather than blocking;",
    "- keep every artifact for this run inside PROJECT DIR; never modify examples/fridge-hot-behind;",
    "- before image generation, declare planned A0/A1/... assets in both image-assets.template.json and image-assets.json using the existing ImageAsset schema;",
    "- generated ComfyUI images are qa_pending; use Codex view_image to inspect them against the visual goal/identity constraints before image:status approval;",
    "- for recurring physical products, generate A0 as a 1536x1024 4x2 board using the canonical panel order from AGENTS.md and crop the selected panel for derived scenes;",
    "- generate scene voice only after draft storyboard has stable scene IDs, then run voice:sync-timing so measured WAV duration becomes storyboard timing;",
    "- after voice timing sync, refresh any timing-sensitive storyboard QA/motion planning before passing downstream stages;",
    "- after each Wan generation, run video:frames and inspect every sampled frame with view_image before video approval;",
    "- after final render, run final:preflight and project:doctor; deterministic failure means the run is not complete;",
    "- never fabricate an image, audio file, video, provider result, or successful QA result;",
    "- if a required provider is unavailable and no valid fallback can satisfy the scene, mark the run blocked with the exact missing capability;",
    "- if the final video is produced, verify the actual file exists before returning status=complete.",
    "",
    "Keep all topic artifacts under PROJECT DIR and write the final video to PROJECT DIR/output/final.mp4.",
    "Do not ask the user for routine confirmation. This is a non-interactive production run.",
    "",
    "Your final response is consumed by the create-video runner and MUST conform to the supplied JSON output schema.",
  ].join("\n");

  const args = [
    "exec",
    "--full-auto",
    "--output-schema",
    schemaPath,
    "--output-last-message",
    resultFile,
  ];

  const model = valueArg("model");
  if (model) args.push("--model", model);

  args.push("-");

  console.log("\n=== AI Explainer Studio: hands-off production ===");
  console.log(`Topic: ${topic.trim()}`);
  console.log(`Run:   ${slug}`);
  console.log("Codex is now executing the complete workflow.\n");

  const child = spawn(codexCommand, args, {
    cwd: process.cwd(),
    stdio: ["pipe", "inherit", "inherit"],
    shell: false,
  });

  child.stdin.write(prompt);
  child.stdin.end();

  const exitCode = await new Promise<number>((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });

  if (exitCode !== 0) {
    throw new Error(`Codex execution failed with exit code ${exitCode}.`);
  }

  if (!fs.existsSync(resultFile)) {
    throw new Error(
      `Codex finished without writing its structured result: ${resultFile}`,
    );
  }

  const result = JSON.parse(fs.readFileSync(resultFile, "utf8")) as {
    status: "complete" | "blocked";
    topic: string;
    run_slug: string;
    output_file: string | null;
    blocker: string | null;
    summary: string;
  };

  console.log("\n=== Production result ===");
  console.log(`Status: ${result.status}`);
  console.log(result.summary);

  if (result.status === "blocked") {
    console.error(`Blocker: ${result.blocker ?? "Unknown blocker"}`);
    process.exitCode = 2;
    return;
  }

  if (!result.output_file) {
    throw new Error("Codex reported complete but did not provide output_file.");
  }

  const outputPath = path.isAbsolute(result.output_file)
    ? result.output_file
    : path.join(process.cwd(), result.output_file);

  if (!fs.existsSync(outputPath)) {
    throw new Error(
      `Codex reported complete, but the final video does not exist: ${outputPath}`,
    );
  }

  console.log(`Final video: ${path.relative(process.cwd(), outputPath)}`);
}

main().catch((error) => {
  console.error("\ncreate-video failed:");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
