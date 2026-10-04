# AI Explainer Studio — Codex Autopilot

This repository is a one-topic autonomous production system. Treat the topic as the only normal user input.

## Normal entry point

Users run:

```
npm run create-video -- "<topic>"
```

Do not ask them to manually run individual provider commands during normal production.

## Default behavior

The default run mode is **hands_off**.

1. Continue the persistent autonomous state until `complete`.
2. Do not ask for confirmation for machine-verifiable work.
3. Validate every artifact with schemas, QA contracts and cross-stage checks.
4. On failure, repair the smallest scope and retry up to 3 times.
5. Preserve passing upstream artifacts.
6. Never fabricate generated media, provider results or QA passes.

## Canonical stage order

```
research
→ script
→ master_voice
→ storyboard
→ asset_plan
→ canonical_prompt
→ canonical_generation
→ canonical_qa
→ checkpoint_canonical (auto-gate)
→ scene_prompts
→ storyboard_preview
→ checkpoint_storyboard (auto-gate)
→ scene_generation
→ scene_qa
→ motion
→ final_render
→ final_qa
→ checkpoint_final (auto-gate)
→ complete
```

## Runtime provider commands

Provider startup and health checks have already run before Codex is invoked by `create-video`.

Use the repository commands below. Do not invent a parallel provider integration.

### Images — ComfyUI

```
npm run image:generate -- --prompt "<complete prompt>" --out <output.png>
npm run image:generate -- --prompt "<complete prompt>" --reference <approved-reference.png> --out <output.png>
```

Use A0 as the source-of-truth reference for derived product scenes.

### Vietnamese narration — VieNeu-TTS

Single file:

```
npm run voice:generate -- --text "<narration>" --out <output.wav>
```

VoiceSpec batch:

```
npm run voice:generate -- --spec <voice-spec.json> --project <project-dir>
```

### Realistic motion — Wan2.2

```
npm run video:generate -- --image <approved-keyframe.png> --prompt "<motion-only prompt>" --out <scene.mp4> --project <project-dir> --scene-id <scene-id> --asset-id <video-asset-id>
```

Generated videos enter `qa_pending`. After semantic video QA passes:

```
npm run video:status -- --project=<project-dir> --asset=<video-asset-id> --status=approved --qa-id=<qa-id>
```

If Wan is unavailable or fails after bounded retries, use the image keyframe plus deterministic Remotion motion. Wan failure alone must not block the project.

### Final composition — Remotion

Use the existing `render:project` workflow. It automatically prefers an approved scene video from `video-assets.json`; otherwise it renders the approved image source with deterministic motion.

## Media routing

V1 deliberately uses a small stack:

- realistic product motion → Wan2.2 when available;
- technical diagram / engineering overlay → Remotion/SVG;
- static or Wan-fallback scene → Remotion pan/zoom;
- images/keyframes → ComfyUI;
- Vietnamese speech → VieNeu-TTS.

LTX and other experimental providers are not part of the V1 production stack.

## Automatic repair

```
FAIL
→ diagnose
→ minimal repair
→ regenerate only affected artifact
→ QA again
→ PASS
```

Do not restart the whole topic for a localized failure.

## State

Runtime state:

```
.ai-explainer/runs/<slug>/state.json
```

Detailed provider setup is in `docs/PROVIDER_SETUP.md`. Detailed stage responsibilities are in `prompts/orchestrator/AUTONOMOUS_ORCHESTRATOR.md`.
