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
→ Master Voice + timestamps
→ Timed Storyboard + QA
→ AssetBible / Visual Plan
→ Canonical A0 + QA
→ Scene assets + QA
→ Motion Router
→ Render
→ Final QA
→ final.mp4
```

Master voice is produced before the timed storyboard so scene durations follow real narration timing.

## Media routing

AI Explainer Studio is the orchestrator, not the model server.

Preferred provider direction:
- image generation/editing → ComfyUI workflows
- realistic image-to-video → Wan2.2
- advanced multi-keyframe video → LTX optional
- Vietnamese narration → VieNeu-compatible VoiceProvider
- engineering diagrams, overlays and deterministic animation → Remotion/SVG
- final composition → Remotion + FFmpeg

The core router lives in `packages/core/src/providers/media-router.ts`.

## Hands-off autopilot

Start with only a topic:

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

## Current state
- Milestone 1 — Content Intelligence: COMPLETE
- Milestone 2 — Visual Intelligence: COMPLETE
- Milestone 3 — Visual Generation: IN PROGRESS
- Hands-off orchestration foundation: IMPLEMENTED
- Media routing + graceful fallback contract: IMPLEMENTED

The canonical end-to-end example remains under `examples/fridge-hot-behind/`.

## Development

```bash
npm install
npm run check
npm run dev
```

Open `http://localhost:3000`.

The browser dashboard remains useful as a supervision/debug surface. Normal production direction is topic-in → final-video-out.
