# Provider Setup — One-time machine configuration

AI Explainer Studio is wired to real local providers. Large external repositories and model weights are machine dependencies and are intentionally **not** committed into this Git repository.

After this one-time setup, normal production is one command:

```powershell
npm run create-video -- "Chủ đề video"
```

The command initializes an isolated project, starts/checks providers, enables Codex live web research, runs the hands-off production workflow, and verifies the final MP4 before reporting success.

## 1. Create local configuration

```powershell
Copy-Item .env.example .env
```

Edit `.env` for the actual paths on your machine. `.env` is ignored by Git; `.env.example` is the committed template.

## 2. ComfyUI — required for still images/keyframes

Source: https://github.com/Comfy-Org/ComfyUI

Run ComfyUI as a local server, normally:

```
http://127.0.0.1:8188
```

Put a photorealistic SD/SDXL-compatible checkpoint under:

```
ComfyUI/models/checkpoints/
```

Set its exact filename:

```dotenv
COMFYUI_BASE_URL=http://127.0.0.1:8188
COMFYUI_CHECKPOINT=your-model.safetensors
```

The built-in adapter uses core ComfyUI nodes only:
- CheckpointLoaderSimple
- CLIPTextEncode
- EmptyLatentImage / LoadImage
- ImageCrop / ImageScale
- VAEEncode / VAEDecode
- KSampler
- SaveImage

No custom node pack is required for the built-in image workflow.

Optional auto-start example:

```dotenv
COMFYUI_START_COMMAND=python D:\AI\ComfyUI\main.py --listen 127.0.0.1 --port 8188
```

## 3. VieNeu-TTS v3 Turbo — required for Vietnamese narration

Canonical source: https://github.com/pnnbao97/VieNeu-TTS

VieNeu exposes:
- `POST /v1/audio/speech`
- `GET /v1/voices`
- `GET /health`

Upstream local server example:

```powershell
uv run python -m apps.openai_speech
```

AI Explainer defaults:

```dotenv
VIENEU_BASE_URL=http://127.0.0.1:8000
VIENEU_VOICE=Mai Anh
```

Optional auto-start example:

```dotenv
VIENEU_START_COMMAND=cd /d D:\AI\VieNeu-TTS && uv run python -m apps.openai_speech
```

## 4. Wan2.2 — optional realistic I2V

Source: https://github.com/Wan-Video/Wan2.2

Wan is intentionally optional because Remotion is the deterministic fallback.

Example local configuration:

```dotenv
WAN_REPO_DIR=D:\AI\Wan2.2
WAN_MODEL_DIR=D:\AI\Wan2.2-TI2V-5B
WAN_PYTHON=python
WAN_TASK=ti2v-5B
WAN_SIZE=704*1280
```

The adapter invokes the upstream `generate.py` CLI. If Wan is absent or fails after bounded retries, the approved keyframe is rendered with deterministic Remotion motion instead of blocking the entire video.

## 5. Verify machine setup once

```powershell
npm run provider:ensure
npm run provider:doctor
```

Expected minimum:

```
✓ ComfyUI
✓ VieNeu-TTS
! or ✓ Wan2.2
✓ Media output directory
```

ComfyUI and VieNeu are required. Wan may show a warning and the system can still produce a video through Remotion fallback.

## Exact internal media lifecycle

These commands are normally called by Codex automatically. They are listed here for debugging.

### Image generation

Generate and register A0:

```powershell
npm run image:generate -- --prompt "..." --width 1536 --height 1024 --out <A0.png> --project <project-dir> --asset A0
```

After Codex inspects A0 and semantic QA passes:

```powershell
npm run image:status -- --project=<project-dir> --asset=A0 --status=approved --qa-id=QA-A0
```

Generate a derived scene from one canonical panel:

```powershell
npm run image:generate -- --prompt "..." --reference <A0.png> --crop 384,0,384,512 --out <scene.png> --project <project-dir> --asset A1
```

Then approve only after semantic image QA:

```powershell
npm run image:status -- --project=<project-dir> --asset=A1 --status=approved --qa-id=QA-A1
```

### Voice generation and authoritative timing

```powershell
npm run voice:generate -- --spec <project-dir>\voice-spec.json --project <project-dir>
npm run voice:sync-timing -- --project=<project-dir>
```

The first command produces real WAV files. The second measures those WAVs, synchronizes Storyboard + VoiceSpec durations, runs deterministic timing QA, and approves passing voice assets.

### Wan scene video

```powershell
npm run video:generate -- --image <scene.png> --prompt "subtle realistic motion only" --out <scene.mp4> --project <project-dir> --scene-id S1 --asset-id VID-S1
npm run video:frames -- --video <scene.mp4> --count 5
```

Codex inspects the sampled frames before approval:

```powershell
npm run video:status -- --project=<project-dir> --asset=VID-S1 --status=approved --qa-id=QA-VID-S1
```

### Final render and deterministic verification

```powershell
npm run render:project -- --project=<project-dir>
npm run final:preflight -- --project=<project-dir>
npm run project:doctor -- --project=<project-dir>
```

`final:preflight` verifies the actual MP4 exists and checks resolution, FPS and duration against MotionSpec. `project:doctor` verifies project contracts/integrity.

## Normal use after setup

Do not run the internal commands above manually for every video. Use only:

```powershell
npm run create-video -- "Tại sao tủ lạnh nóng phía sau?"
```

Output is stored under:

```
.ai-explainer/projects/<topic-slug>/output/final.mp4
```
