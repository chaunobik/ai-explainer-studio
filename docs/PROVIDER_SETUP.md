# Provider Setup — One-time machine configuration

The application code is wired to real providers. Large external model weights are intentionally not committed to this repository.

External model repositories and weights are intentionally machine dependencies, not source files in AI Explainer Studio.

After this one-time setup, normal production is:

```powershell
npm run create-video -- "Chủ đề video"
```

`create-video` automatically starts ComfyUI and VieNeu when their start commands are configured in `.env`, checks provider health, launches Codex non-interactively, and renders the result.

## 1. Create local configuration

```powershell
Copy-Item .env.example .env
```

Edit `.env` for the paths on your machine.

## 2. ComfyUI — required for image generation

Source: https://github.com/Comfy-Org/ComfyUI

Run ComfyUI as a local server, normally on:

```
http://127.0.0.1:8188
```

Put a photorealistic SD/SDXL-compatible checkpoint under:

```
ComfyUI/models/checkpoints/
```

Then set the exact filename:

```dotenv
COMFYUI_CHECKPOINT=your-model.safetensors
```

The built-in AI Explainer workflow uses only core ComfyUI nodes:
- CheckpointLoaderSimple
- CLIPTextEncode
- EmptyLatentImage / LoadImage
- VAEEncode / VAEDecode
- KSampler
- SaveImage

No custom node pack is required for the image adapter.

To let `create-video` start ComfyUI automatically:

```dotenv
COMFYUI_START_COMMAND=python D:\AI\ComfyUI\main.py --listen 127.0.0.1 --port 8188
```

## 3. VieNeu-TTS v3 Turbo — required for Vietnamese narration

Source: https://github.com/pnnbao97/VieNeu-TTS

VieNeu exposes an OpenAI-compatible endpoint:

```
POST /v1/audio/speech
```

and health endpoint:

```
GET /health
```

Start the local API using the upstream project, for example:

```powershell
uv run python -m apps.openai_speech
```

Default AI Explainer configuration:

```dotenv
VIENEU_BASE_URL=http://127.0.0.1:8000
VIENEU_VOICE=Mai Anh
```

Optional auto-start example:

```dotenv
VIENEU_START_COMMAND=cd /d D:\AI\vieneu-tts && uv run python -m apps.openai_speech
```

## 4. Wan2.2 — optional enhancement

Source: https://github.com/Wan-Video/Wan2.2

AI Explainer invokes the official `generate.py` CLI. The default configuration uses the official consumer-GPU TI2V-5B path:

```dotenv
WAN_REPO_DIR=D:\AI\Wan2.2
WAN_MODEL_DIR=D:\AI\Wan2.2-TI2V-5B
WAN_PYTHON=python
WAN_TASK=ti2v-5B
WAN_SIZE=704*1280
```

The upstream Wan2.2 documentation states TI2V-5B is the consumer-GPU model and supports image-to-video at 720p. If Wan is not configured or generation fails, AI Explainer falls back to deterministic Remotion motion rather than blocking the complete video.

## 5. Verify everything

```powershell
npm run provider:ensure
npm run provider:doctor
```

Expected minimum result:

```
✓ ComfyUI
✓ VieNeu-TTS
! or ✓ Wan2.2
✓ Media output directory
```

ComfyUI and VieNeu are required. Wan is optional because Remotion is its safe fallback.

## Provider commands

These are internal production commands normally called by Codex:

```powershell
npm run image:generate -- --prompt "..." --out output.png
npm run image:generate -- --prompt "..." --reference A0.png --out scene.png

npm run voice:generate -- --text "Xin chào" --out voice.wav
npm run voice:generate -- --spec path\voice-spec.json --project path\project

npm run video:generate -- --image scene.png --prompt "subtle camera push-in" --out scene.mp4
npm run video:status -- --project=path\project --asset=VID-S1 --status=approved --qa-id=QA-VID-S1
```

Normal users should not need to run these manually.
