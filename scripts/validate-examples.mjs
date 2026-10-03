import fs from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const root = process.cwd();
const schemaDir = path.join(root, "schemas");
const exampleDir = path.join(root, "examples", "fridge-hot-behind");

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  allowUnionTypes: true,
});
addFormats(ajv);

for (const name of fs.readdirSync(schemaDir).filter((value) => value.endsWith(".json"))) {
  const schema = JSON.parse(fs.readFileSync(path.join(schemaDir, name), "utf8"));
  ajv.addSchema(schema);
}

const cases = [
  ["research-request.json", "research-request.schema.json"],
  ["research-result.json", "research-result.schema.json"],
  ["research-qa-output.json", "research-qa-output.schema.json"],
  ["script-request.json", "script-request.schema.json"],
  ["script-spec.json", "script-spec.schema.json"],
  ["script-qa-output.json", "script-qa-output.schema.json"],
  ["storyboard-request.json", "storyboard-request.schema.json"],
  ["storyboard-spec.json", "storyboard-spec.schema.json"],
  ["storyboard-qa-output.json", "storyboard-qa-output.schema.json"],
  ["visual-plan-request.json", "visual-plan-request.schema.json"],
  ["asset-bible.json", "asset-bible.schema.json"],
  ["visual-plan.json", "visual-plan.schema.json"],
  ["continuity-qa-output.json", "continuity-qa-output.schema.json"],
  ["anchor-generation-input.json", "anchor-generation-input.schema.json"],
  ["anchor-provider-job.json", "image-provider-job.schema.json"],
  ["derived-s2-generation-input.json", "derived-generation-input.schema.json"],
  ["derived-s2-provider-job.json", "image-provider-job.schema.json"],
  ["derived-s5-generation-input.json", "derived-generation-input.schema.json"],
  ["derived-s5-provider-job.template.json", "image-provider-job.schema.json"],
  ["derived-s6-generation-input.json", "derived-generation-input.schema.json"],
  ["derived-s6-provider-job.template.json", "image-provider-job.schema.json"],
  ["approved-anchor-manifest.example.json", "image-asset.schema.json"],
  ["reference-a0-manifest.template.json", "image-asset.schema.json"],
  ["image-prompt-a1.json", "image-prompt-spec.schema.json"],
  ["image-prompt-a2.json", "image-prompt-spec.schema.json"],
  ["image-prompt-a5.json", "image-prompt-spec.schema.json"],
  ["image-prompt-a6.json", "image-prompt-spec.schema.json"],
  ["image-prompt-qa-a1.example.json", "image-prompt-qa-output.schema.json"],
  ["image-prompt-qa-a2.example.json", "image-prompt-qa-output.schema.json"],
  ["visual-qa-a2-candidate.example.json", "image-asset.schema.json"],
  ["visual-qa-a2-fail.example.json", "visual-qa-output.schema.json"],
  ["asset-execution-plan.json", "asset-execution-plan.schema.json"],
  ["motion-spec.json", "motion-spec.schema.json"],
  ["voice-spec.json", "voice-spec.schema.json"],
  ["voice-jobs.json", "voice-jobs.schema.json"],
  ["voice-assets.template.json", "voice-assets-manifest.schema.json"],
];

const failures = [];

for (const [exampleName, schemaName] of cases) {
  const examplePath = path.join(exampleDir, exampleName);
  if (!fs.existsSync(examplePath)) {
    failures.push(`${exampleName}: missing example file`);
    continue;
  }

  const schema = JSON.parse(fs.readFileSync(path.join(schemaDir, schemaName), "utf8"));
  const validate = ajv.getSchema(schema.$id);
  if (!validate) {
    failures.push(`${exampleName}: validator not found for ${schemaName}`);
    continue;
  }

  const data = JSON.parse(fs.readFileSync(examplePath, "utf8"));
  const ok = validate(data);
  if (!ok) {
    const detail = (validate.errors ?? [])
      .map((error) => `${error.instancePath || "/"} ${error.message}`)
      .join("; ");
    failures.push(`${exampleName} -> ${schemaName}: ${detail}`);
  }
}

if (failures.length > 0) {
  console.error("Canonical example validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`✓ Validated ${cases.length} canonical example artifacts.`);
