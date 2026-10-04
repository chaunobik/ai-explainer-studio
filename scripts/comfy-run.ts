import fs from "node:fs";
import path from "node:path";
import {
  applyWorkflowBindings,
  ComfyUiClient,
  parseBinding,
  type WorkflowBinding,
} from "../packages/core/src/index";

function valueArg(name: string): string | undefined {
  const prefix = "--" + name + "=";
  const inline = process.argv.find((value) => value.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf("--" + name);
  if (index >= 0) return process.argv[index + 1];
  return undefined;
}

function repeatedArg(name: string): string[] {
  const result: string[] = [];
  for (let i = 0; i < process.argv.length; i += 1) {
    const value = process.argv[i];
    const prefix = "--" + name + "=";
    if (value.startsWith(prefix)) result.push(value.slice(prefix.length));
    else if (value === "--" + name && process.argv[i + 1]) {
      result.push(process.argv[i + 1]);
      i += 1;
    }
  }
  return result;
}

function mimeExtension(filename: string): string {
  const ext = path.extname(filename);
  return ext || ".bin";
}

async function main(): Promise<void> {
  const workflowPath = valueArg("workflow");
  const outputPath = valueArg("out");

  if (!workflowPath || !outputPath) {
    throw new Error(
      [
        "Usage:",
        "npm run comfy:run -- --workflow=<api-workflow.json> --out=<file> [--set=NODE.INPUT=VALUE] [--upload=NODE.INPUT=path]",
        "",
        "The workflow must be ComfyUI API format (File -> Export (API)).",
      ].join("\n"),
    );
  }

  const workflow = JSON.parse(
    fs.readFileSync(path.resolve(workflowPath), "utf8"),
  ) as Record<string, unknown>;

  const client = new ComfyUiClient({
    baseUrl: process.env.COMFYUI_URL ?? "http://127.0.0.1:8188",
    pollIntervalMs: Number(process.env.COMFYUI_POLL_MS ?? 1000),
    timeoutMs: Number(process.env.COMFYUI_TIMEOUT_MS ?? 1200000),
  });

  const health = await client.health();
  if (!health.ok) {
    throw new Error(`ComfyUI unavailable at ${client.baseUrl}: ${health.detail}`);
  }

  const bindings: WorkflowBinding[] = repeatedArg("set").map(parseBinding);

  for (const upload of repeatedArg("upload")) {
    const equals = upload.indexOf("=");
    if (equals <= 0) {
      throw new Error(
        `Invalid --upload "${upload}". Expected NODE.INPUT=FILE_PATH.`,
      );
    }
    const target = upload.slice(0, equals);
    const file = path.resolve(upload.slice(equals + 1));
    if (!fs.existsSync(file)) {
      throw new Error(`Upload file does not exist: ${file}`);
    }
    const dot = target.indexOf(".");
    if (dot <= 0) {
      throw new Error(
        `Invalid upload target "${target}". Expected NODE.INPUT.`,
      );
    }

    const uploaded = await client.uploadImage(
      fs.readFileSync(file),
      path.basename(file),
      true,
    );
    bindings.push({
      nodeId: target.slice(0, dot),
      input: target.slice(dot + 1),
      value: uploaded.name,
    });
  }

  const bound = applyWorkflowBindings(workflow, bindings);
  const history = await client.run(bound);
  const outputs = client.collectOutputs(history);

  if (outputs.length === 0) {
    throw new Error(
      "ComfyUI completed but produced no downloadable images/gifs/videos in history outputs.",
    );
  }

  const selected = outputs[outputs.length - 1];
  const bytes = await client.downloadOutput(selected);
  let target = path.resolve(outputPath);

  if (!path.extname(target)) {
    target += mimeExtension(selected.filename);
  }
  fs.mkdirSync(path.dirname(target), {recursive: true});
  fs.writeFileSync(target, bytes);

  console.log(
    JSON.stringify(
      {
        ok: true,
        provider: "comfyui",
        source: selected,
        output: path.relative(process.cwd(), target),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
