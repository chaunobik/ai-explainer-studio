import {ComfyUiClient, VieNeuClient} from "../packages/core/src/index";

async function main(): Promise<void> {
  const comfy = new ComfyUiClient({
    baseUrl: process.env.COMFYUI_URL ?? "http://127.0.0.1:8188",
  });
  const vieneu = new VieNeuClient({
    baseUrl: process.env.VIENEU_URL ?? "http://127.0.0.1:8000",
    model: process.env.VIENEU_MODEL ?? "vieneu-v3-turbo",
    voice: process.env.VIENEU_VOICE ?? "Mai Anh",
  });

  const [comfyHealth, voiceHealth] = await Promise.all([
    comfy.health(),
    vieneu.health(),
  ]);

  const result = {
    comfyui: {
      url: comfy.baseUrl,
      ok: comfyHealth.ok,
      detail: comfyHealth.detail,
    },
    vieneu: {
      url: vieneu.baseUrl,
      ok: voiceHealth.ok,
      detail: voiceHealth.detail,
      model: vieneu.model,
      voice: vieneu.voice,
    },
  };

  console.log(JSON.stringify(result, null, 2));

  if (!comfyHealth.ok || !voiceHealth.ok) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
