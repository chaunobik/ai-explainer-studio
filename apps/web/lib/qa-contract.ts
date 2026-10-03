import fs from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020";

export type QaContractKind =
  | "image_prompt_qa"
  | "multiview_prompt_qa"
  | "multiview_qa"
  | "motion_qa"
  | "final_qa";

const schemaFileByKind: Record<QaContractKind, string> = {
  image_prompt_qa: "image-prompt-qa-output.schema.json",
  multiview_prompt_qa: "multiview-prompt-qa-output.schema.json",
  multiview_qa: "multiview-qa-output.schema.json",
  motion_qa: "motion-qa-output.schema.json",
  final_qa: "final-qa-output.schema.json",
};

function repositoryRoot(): string {
  return path.resolve(process.cwd(), "../..");
}

function readSchema(fileName: string): any {
  return JSON.parse(
    fs.readFileSync(path.join(repositoryRoot(), "schemas", fileName), "utf8"),
  );
}

export function buildQaContractAppendix(kind: QaContractKind): string {
  const schema = readSchema(schemaFileByKind[kind]);
  const usesQaResult = JSON.stringify(schema).includes("qa-result.schema.json");
  const qaResult = usesQaResult ? readSchema("qa-result.schema.json") : null;

  return [
    "",
    "=== STRICT MACHINE-READABLE OUTPUT CONTRACT ===",
    "Your response is consumed directly by code.",
    "ABSOLUTE OUTPUT RULES:",
    "1. Return exactly ONE JSON object and nothing else.",
    "2. Do NOT wrap JSON in markdown code fences.",
    "3. Do NOT add prose before or after the JSON.",
    "4. Do NOT use comments, trailing commas, ellipsis (...), placeholders, or pseudo-JSON.",
    "5. Include EVERY required field from the schema, even when arrays are empty.",
    "6. Use only the exact enum strings from the schema, including lowercase spelling.",
    "7. Do NOT add properties where additionalProperties=false.",
    "8. Copy IDs from the provided input exactly; never invent a different prompt_id, asset_id, scene_id, or reference_prompt_id.",
    "9. If there are no issues, use empty arrays [] rather than omitting fields.",
    "10. Before answering, mentally validate that JSON.parse(response) succeeds and the object matches the schema.",
    "",
    "AUTHORITATIVE OUTPUT JSON SCHEMA:",
    JSON.stringify(schema, null, 2),
    ...(qaResult
      ? [
          "",
          "REFERENCED qa-result.schema.json:",
          JSON.stringify(qaResult, null, 2),
        ]
      : []),
    "=== END STRICT OUTPUT CONTRACT ===",
  ].join("\n");
}

function stripSingleCodeFence(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/^\`\`\`(?:json)?\s*([\s\S]*?)\s*\`\`\`$/i);
  return match ? match[1].trim() : trimmed;
}

export function parseAndValidateQaJson(
  raw: string,
  kind: QaContractKind,
): any {
  const normalized = stripSingleCodeFence(raw);
  let value: any;
  try {
    value = JSON.parse(normalized);
  } catch (error) {
    throw new Error(
      "JSON không hợp lệ. ChatGPT phải trả đúng 1 JSON object, không prose/markdown. " +
        (error instanceof Error ? error.message : String(error)),
    );
  }

  const ajv = new Ajv2020({allErrors: true, strict: false});
  const qaResult = readSchema("qa-result.schema.json");
  ajv.addSchema(qaResult);
  const schema = readSchema(schemaFileByKind[kind]);
  const validate = ajv.compile(schema);

  if (!validate(value)) {
    const details = (validate.errors ?? [])
      .slice(0, 12)
      .map((error) => {
        const where = error.instancePath || "/";
        return where + " " + (error.message ?? "schema error");
      })
      .join(" | ");
    throw new Error(
      "JSON đúng cú pháp nhưng sai contract " +
        schema.title +
        ". " +
        details,
    );
  }

  return value;
}
