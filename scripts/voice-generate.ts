import fs from "node:fs";
import path from "node:path";
import {VieNeuClient} from "../packages/core/src/index";

function valueArg(name: string): string | undefined {
  const prefix = "--" + name + "=";
  const inline = process.argv.find((value) => value.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf("--" + name);
  if (index >= 0) return process.argv[index + 1];
  return undefined;
}

async function main(): Promise<void> {
  const text = valueArg("text");
  const textFile = valueArg("text-file");
  const out = valueArg("out");

  if ((!text && !textFile) || !out) {
    throw new Error(
      'Usage: npm run voice:generate -- --text="Xin chào" --out=voice.wav OR --text-file=script.txt --out=voice.wav',
    );
  }

  const input = text ?? fs.readFileSync(path.resolve(textFile!), "utf8");
  const client = new VieNeuClient({
    baseUrl: process.env.VIENEU_URL ?? "http://127.0.0.1:8000",
    model: valueArg("model") ?? process.env.VIENEU_MODEL ?? "vieneu-v3-turbo",
    voice: valueArg("voice") ?? process.env.VIENEU_VOICE ?? "Mai Anh",
  });

  const health = await client.health();
  if (!health.ok) {
    throw new Error(`VieNeu unavailable at ${client.baseUrl}: ${health.detail}`);
  }

  const bytes = await client.synthesize(input, {
    voice: valueArg("voice") ?? client.voice,
    model: valueArg("model") ?? client.model,
    format: "wav",
  });

  const output = path.resolve(out);
  fs.mkdirSync(path.dirname(output), {recursive: true});
  fs.writeFileSync(output, bytes);

  console.log(
    JSON.stringify(
      {
        ok: true,
        provider: "vieneu",
        model: valueArg("model") ?? client.model,
        voice: valueArg("voice") ?? client.voice,
        output: path.relative(process.cwd(), output),
        bytes: bytes.byteLength,
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
