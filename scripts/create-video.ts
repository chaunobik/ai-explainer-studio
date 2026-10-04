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

interface CodexRuntime {
  executable: string;
  rootHelp: string;
  execHelp: string;
}

function helpText(executable: string, args: string[]): string {
  const result = spawnSync(executable, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: false,
  });
  return `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
}

function preflightCodex(): CodexRuntime {
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

  const rootHelp = helpText(executable, ["--help"]);
  const execHelp = helpText(executable, ["exec", "--help"]);

  if (!execHelp.includes("--output-schema") || !execHelp.includes("--output-last-message")) {
    throw new Error(
      "Installed Codex CLI is too old for structured create-video runs. Update Codex and retry.",
    );
  }

  return {executable, rootHelp, execHelp};
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

  const codex = preflightCodex();

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

  // Recover legacy runs that exhausted retries on the old mandatory 4x2 A0
  // strategy. Preserve all passing upstream work and restart only canonical A0.
  const stateFile = path.join(runDir, "state.json");
  if (fs.existsSync(stateFile)) {
    const state = JSON.parse(fs.readFileSync(stateFile, "utf8")) as {
      currentStage?: string;
      stages?: Record<string, {status?: string; lastMessage?: string | null}>;
    };
    const current = state.currentStage;
    const currentStatus = current ? state.stages?.[current]?.status : undefined;
    const canonicalDeadEnd =
      (current === "canonical_generation" || current === "canonical_qa") &&
      currentStatus === "needs_human_review";

    if (canonicalDeadEnd) {
      runOrThrow(
        npmCommand(),
        [
          "run",
          "autopilot",
          "--",
          "--slug",
          slug,
          "--recover",
          "canonical_prompt",
          "--note",
          "Recover from legacy mandatory multi-view A0 strategy; use one canonical hero reference.",
        ],
        "Canonical strategy recovery",
      );
    }
  }

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
    "  npm run image:generate -- --prompt \"...\" --out <png> --project <project-dir> --asset <asset-id> [--reference <png>];",
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
    "- if an older run is blocked on a failed 4x2 A0, rewrite the canonical prompt to a single-view A0, regenerate only A0, preserve already-passing research/script/voice artifacts, then continue;",
    "- for recurring physical products, default A0 to ONE clean canonical hero image; do not require a 4x2/8-view board from a generic SDXL checkpoint; use multi-view only when provider capability is explicitly proven;",
    "- generate scene voice only after draft storyboard has stable scene IDs, then run voice:sync-timing so measured WAV duration becomes storyboard timing;",
    "- after voice timing sync, refresh any timing-sensitive storyboard QA/motion planning before passing downstream stages;",
    "- after each Wan generation, run video:frames and inspect every sampled frame with view_image before video approval;",
    "- after final render, run final:preflight and project:doctor; deterministic failure means the run is not complete;",
    "- then run video:frames on the FINAL mp4 with at least 12 samples (or at least one frame per scene) and inspect the complete sequence with view_image before final QA;",
    "- final QA MUST fail a repeated-background slideshow, a rear/inside component labelled on a front exterior, decorative arrows that do not map to a truthful mechanism, or captions with obvious orphan fragments;",
    "- for 6-10 scene explainers, create at least 3 meaningfully different visual states and never let one static hero image dominate most scenes;",
    "- if final QA fails visual variety/spatial correctness, repair asset_plan/scene_generation/motion as appropriate; do not simply re-render the same assets;",
    "- preserve the intended storyboard target duration; if real voice timing makes the result materially shorter, revise/expand the script/storyboard instead of silently shipping a much shorter video;",
    "- never fabricate an image, audio file, video, provider result, or successful QA result;",
    "- if a required provider is unavailable and no valid fallback can satisfy the scene, mark the run blocked with the exact missing capability;",
    "- if the final video is produced, verify the actual file exists before returning status=complete.",
    "",
    "Keep all topic artifacts under PROJECT DIR and write the final video to PROJECT DIR/output/final.mp4.",
    "Do not ask the user for routine confirmation. This is a non-interactive production run.",
    "",
    "Your final response is consumed by the create-video runner and MUST conform to the supplied JSON output schema.",
  ].join("\n");

  const args: string[] = [];

  // --search is a root/global option in current Codex builds. Detect it rather
  // than assuming a specific CLI version.
  if (codex.rootHelp.includes("--search")) args.push("--search");

  args.push("exec");

  // Prefer the convenience alias when supported; otherwise use explicit
  // non-interactive workspace-write settings.
  if (codex.execHelp.includes("--full-auto")) {
    args.push("--full-auto");
  } else {
    args.push("--sandbox", "workspace-write");
    args.push("-c", 'approval_policy="never"');
  }

  // Media providers and web research need network access from Codex commands.
  args.push("-c", "sandbox_workspace_write.network_access=true");
  if (!codex.rootHelp.includes("--search")) {
    args.push("-c", 'web_search="live"');
  }

  args.push(
    "--output-schema",
    schemaPath,
    "--output-last-message",
    resultFile,
  );

  const model = valueArg("model");
  if (model) args.push("--model", model);

  args.push("-");

  console.log("\n=== AI Explainer Studio: hands-off production ===");
  console.log(`Topic: ${topic.trim()}`);
  console.log(`Run:   ${slug}`);
  console.log("Codex is now executing the complete workflow.\n");

  const child = spawn(codex.executable, args, {
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
