import fs from "node:fs";
import path from "node:path";
import {bundle} from "@remotion/bundler";
import {getCompositions, renderMedia} from "@remotion/renderer";

async function main(): Promise<void> {
  const root = process.cwd();
  const output = path.join(root, "out", "renderer-smoke.mp4");

  const inputProps = {
    motionSpec: {
      motion_plan_id: "SMOKE",
      project_id: "SMOKE",
      fps: 10,
      width: 1080,
      height: 1920,
      scenes: [
        {
          scene_id: "S1",
          duration_sec: 0.3,
          source_asset_ids: [],
          background: "solid",
          solid_background: "#111111",
          operations: [
            {
              type: "label",
              start_sec: 0,
              end_sec: 0.3,
              text: "AI Explainer Studio",
              x: 0.5,
              y: 0.5,
              font_size: 54,
              align: "center",
            },
          ],
        },
      ],
    },
    assets: {},
    audioByScene: {},
    subtitleCues: [],
  };

  const serveUrl = await bundle({
    entryPoint: path.join(root, "packages", "renderer", "src", "entry.tsx"),
  });

  const compositions = await getCompositions(serveUrl, {inputProps});
  const composition = compositions.find((value) => value.id === "ExplainerVideo");
  if (!composition) throw new Error("ExplainerVideo composition not found.");

  fs.mkdirSync(path.dirname(output), {recursive: true});
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation: output,
    inputProps,
  });

  const stat = fs.statSync(output);
  if (stat.size <= 0) throw new Error("Renderer smoke output is empty.");

  console.log(`✓ Renderer smoke test produced ${output} (${stat.size} bytes).`);

}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
