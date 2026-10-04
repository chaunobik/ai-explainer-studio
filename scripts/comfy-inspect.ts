import fs from "node:fs";
import path from "node:path";

function valueArg(name: string): string | undefined {
  const prefix = "--" + name + "=";
  const inline = process.argv.find((value) => value.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf("--" + name);
  if (index >= 0) return process.argv[index + 1];
  return undefined;
}

const workflowPath = valueArg("workflow");
if (!workflowPath) {
  throw new Error(
    "Usage: npm run comfy:inspect -- --workflow=workflows/comfy/image-api.json",
  );
}

const workflow = JSON.parse(
  fs.readFileSync(path.resolve(workflowPath), "utf8"),
) as Record<string, {class_type?: string; inputs?: Record<string, unknown>}>;

const summary = Object.entries(workflow).map(([nodeId, node]) => ({
  node_id: nodeId,
  class_type: node.class_type ?? "unknown",
  inputs: Object.keys(node.inputs ?? {}),
  scalar_inputs: Object.fromEntries(
    Object.entries(node.inputs ?? {}).filter(([, value]) => !Array.isArray(value)),
  ),
}));

console.log(JSON.stringify(summary, null, 2));
