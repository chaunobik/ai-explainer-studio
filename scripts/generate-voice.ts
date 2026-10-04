import fs from "node:fs";
import path from "node:path";
import {arg} from "./lib/cli";
import {sha256, wavDurationSeconds} from "./lib/audio-utils";
import {loadDotEnv} from "./lib/runtime-env";
import {VieNeuClient} from "./lib/vieneu-client";

loadDotEnv();

function readText(): string {
  const text = arg("text");
  if (text) return text;
  const textFile = arg("text-file");
  if (textFile) return fs.readFileSync(path.resolve(textFile), "utf8").trim();
  throw new Error("Provide --text or --text-file.");
}

async function generateSingle(client: VieNeuClient): Promise<void> {
  const out = arg("out");
  if (!out) {
    throw new Error(
      'Usage: npm run voice:generate -- --text "..." --out path/to/voice.wav',
    );
  }
  const outputPath = path.resolve(out);
  await client.synthesize({
    text: readText(),
    outputPath,
    voice: arg("voice") ?? process.env.VIENEU_VOICE ?? "Mai Anh",
  });
  const duration = wavDurationSeconds(outputPath);
  console.log(`✓ Voice generated: ${outputPath}`);
  console.log(`  duration_sec=${duration.toFixed(3)} sha256=${sha256(outputPath)}`);
}

async function generateSpec(client: VieNeuClient, specPath: string): Promise<void> {
  const spec = JSON.parse(fs.readFileSync(path.resolve(specPath), "utf8"));
  const projectDir = path.resolve(arg("project") ?? path.dirname(path.resolve(specPath)));
  const outputDir = path.resolve(
    arg("out-dir") ?? path.join(projectDir, "assets", "voice"),
  );
  const manifestPath = path.resolve(
    arg("manifest") ?? path.join(projectDir, "voice-assets.json"),
  );
  fs.mkdirSync(outputDir, {recursive: true});

  const assets = [];
  for (const segment of spec.segments ?? []) {
    const filePath = path.join(outputDir, `${segment.scene_id}.wav`);
    await client.synthesize({
      text: segment.text,
      outputPath: filePath,
      voice: arg("voice") ?? process.env.VIENEU_VOICE ?? "Mai Anh",
    });

    const duration = wavDurationSeconds(filePath);
    const target = Number(segment.target_duration_sec);
    const tolerance = Math.max(1.25, target * 0.35);
    if (Math.abs(duration - target) > tolerance) {
      throw new Error(
        `Voice timing QA failed for ${segment.scene_id}: generated ${duration.toFixed(
          2,
        )}s vs target ${target.toFixed(2)}s.`,
      );
    }

    assets.push({
      asset_id: segment.output_asset_id,
      project_id: spec.project_id,
      scene_id: segment.scene_id,
      status: "approved",
      text: segment.text,
      attempt: 1,
      provider_id: "vieneu-v3-turbo",
      file: {
        uri: path.relative(projectDir, filePath).replace(/\\/g, "/"),
        mime_type: "audio/wav",
        duration_sec: Number(duration.toFixed(3)),
        checksum: sha256(filePath),
      },
      qa_result_ids: [`AUTO-VIENEU-${segment.scene_id}`],
    });
    console.log(
      `✓ ${segment.scene_id}: ${duration.toFixed(2)}s -> ${filePath}`,
    );
  }

  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        project_id: spec.project_id,
        provider_id: "vieneu-v3-turbo",
        generated_at: new Date().toISOString(),
        assets,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`✓ Voice manifest: ${manifestPath}`);
}

async function main(): Promise<void> {
  const client = new VieNeuClient();
  await client.health();
  const spec = arg("spec");
  if (spec) await generateSpec(client, spec);
  else await generateSingle(client);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
