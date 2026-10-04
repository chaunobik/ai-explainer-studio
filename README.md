# AI Explainer Studio

AI Explainer Studio is an autonomous pipeline for creating accurate, visually continuous, short-form science and engineering explainer videos.

> Core principle: **Research → Verify → Narrate → Time → Visualize → Verify → Render**

## V1 target
- TikTok + YouTube Shorts
- 9:16, 1080×1920
- Vietnamese
- 45–60 seconds
- 6–10 scenes
- one-topic input
- hands-off by default
- QA after every stage
- visual continuity as a first-class requirement
- graceful provider fallback instead of blocking the whole run

## Production workflow

```
Topic
→ Research + QA
→ Script + QA
→ Draft Storyboard + QA
→ VieNeu Voice + measured timing sync
→ AssetBible / Visual Plan
→ Canonical A0 + QA
→ Scene assets + QA
→ Motion Router
→ Render
→ Final QA
→ final.mp4
```

The draft storyboard establishes stable scene IDs and verbatim narration. VieNeu then generates the real WAV files, and measured audio duration is synchronized back into Storyboard + VoiceSpec before visual planning.

## Media routing

AI Explainer Studio is the orchestrator, not the model server.

Preferred provider direction:
- image generation/editing → ComfyUI workflows
- realistic image-to-video → Wan2.2
- Vietnamese narration → VieNeu-compatible VoiceProvider
- engineering diagrams, overlays and deterministic animation → Remotion/SVG
- final composition → Remotion + FFmpeg

The core router lives in `packages/core/src/providers/media-router.ts`.

## One-command production

The normal user-facing command is now:

```bash
npm run create-video -- "Tại sao tủ lạnh nóng phía sau?"
```

This command:
- verifies Codex CLI is installed and authenticated;
- initializes an isolated topic project under `.ai-explainer/projects/<slug>/`;
- auto-starts ComfyUI/VieNeu when start commands are configured;
- runs provider health checks;
- initializes/resumes the persistent hands-off run;
- invokes `codex exec` non-interactively;
- tells Codex to execute the complete pipeline rather than merely describe it;
- writes the structured agent result under `.ai-explainer/runs/<slug>/codex-result.json`;
- only reports `complete` when the returned final video path actually exists.

Equivalent explicit form:

```bash
npm run create-video -- --topic "Tại sao tủ lạnh nóng phía sau?"
```

Provider installation/model weights are a one-time machine setup; they are not committed into this repository. Follow [Provider Setup](docs/PROVIDER_SETUP.md) once, then normal usage is only the one command above.

The lower-level `autopilot` command remains available for development/state debugging:

```bash
npm run autopilot -- --topic "Tại sao tủ lạnh nóng phía sau?"
```

Default mode is `hands_off`. Legacy checkpoint stages are retained as compatibility gates but auto-approve after the preceding QA passes.

To use interactive checkpoints:

```bash
npm run autopilot -- --topic "Tại sao tủ lạnh nóng phía sau?" --mode guided
```

The orchestrator retries repairable failures up to 3 times, then follows provider fallbacks where possible. It escalates only when no safe provider/fallback can satisfy the stage.

See [Codex / ChatGPT Autonomous Workflow](docs/CODEX_AUTONOMOUS_WORKFLOW.md).

## Core contracts
- [VideoSpec](schemas/video-spec.schema.json)
- [SceneSpec](schemas/scene-spec.schema.json)
- [AssetBible](schemas/asset-bible.schema.json)
- [VisualPlan](schemas/visual-plan.schema.json)
- [SceneLineage](schemas/scene-lineage.schema.json)
- [TransitionSpec](schemas/transition-spec.schema.json)
- [QAResult](schemas/qa-result.schema.json)
- [AutonomousRunState](schemas/autonomous-run-state.schema.json)
- [CreateVideoResult](schemas/create-video-result.schema.json)

## Current state
- Milestone 1 — Content Intelligence: COMPLETE
- Milestone 2 — Visual Intelligence: COMPLETE
- Milestone 3 — Visual Generation runtime: IMPLEMENTED (ComfyUI HTTP + manifest lifecycle)
- VieNeu-TTS runtime: IMPLEMENTED (OpenAI-compatible HTTP + measured timing sync)
- Wan2.2 runtime: IMPLEMENTED as optional I2V enhancement with Remotion fallback
- Hands-off orchestration: IMPLEMENTED
- Generated scene video composition: IMPLEMENTED
- Remaining hardening: semantic VLM QA automation, asset cache, and real-GPU end-to-end qualification

The canonical end-to-end example remains under `examples/fridge-hot-behind/`.

## Development

```bash
npm install
npm run check
npm run dev
```

Open `http://localhost:3000`.

The browser dashboard remains useful as a supervision/debug surface. Normal production direction is topic-in → final-video-out.
