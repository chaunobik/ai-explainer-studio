import fs from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const root = process.cwd();
const schemaDir = path.join(root, "schemas");
const files = fs.readdirSync(schemaDir).filter((name) => name.endsWith(".json")).sort();

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  allowUnionTypes: true,
});
addFormats(ajv);

const schemas = files.map((name) => {
  const fullPath = path.join(schemaDir, name);
  const schema = JSON.parse(fs.readFileSync(fullPath, "utf8"));
  if (!schema.$id) {
    throw new Error(`Schema ${name} is missing $id`);
  }
  ajv.addSchema(schema);
  return { name, schema };
});

const errors = [];
for (const { name, schema } of schemas) {
  try {
    ajv.getSchema(schema.$id) ?? ajv.compile(schema);
  } catch (error) {
    errors.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (errors.length > 0) {
  console.error("Schema compilation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`✓ Compiled ${schemas.length} JSON schemas successfully.`);
