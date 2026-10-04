# AI Explainer Studio — Codex Autopilot

This repository supports a one-topic autonomous workflow. Treat the topic as the only required input unless the user explicitly overrides defaults.

## Default behavior

The default run mode is **hands_off**.

1. Start or resume the autonomous state:
   - New topic: `npm run autopilot -- --topic "<topic>"`
   - Guided compatibility mode: `npm run autopilot -- --topic "<topic>" --mode guided`
   - Resume: `npm run autopilot -- --slug <slug>`
2. Follow the returned directive until `complete`.
3. Do not ask for confirmation for machine-verifiable work.
4. Validate every artifact with schemas, QA contracts and cross-stage checks.
5. On failure, repair the smallest scope and retry up to 3 times.
6. If a media provider fails repeatedly, use the configured fallback route instead of blocking the whole video when a safe fallback exists.
7. Human intervention is reserved for an unavailable required capability or an unrecoverable validation failure.
8. Preserve passing upstream artifacts and invalidate only affected downstream work.

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
→ checkpoint_canonical (auto-gate in hands_off)
→ scene_prompts
→ storyboard_preview
→ checkpoint_storyboard (auto-gate in hands_off)
→ scene_generation
→ scene_qa
→ motion
→ final_render
→ final_qa
→ checkpoint_final (auto-gate in hands_off)
→ complete
```

The master voice is generated before the timed storyboard so scene durations are derived from real narration timing rather than guessed first.

## Media routing

Route scenes by intent, not by one universal video model:
- realistic natural motion → Wan image-to-video first;
- multi-keyframe / complex generative motion → LTX first;
- technical diagrams and deterministic overlays → Remotion/SVG;
- simple stills → deterministic pan/zoom;
- on provider failure → bounded retry, then fallback provider.

Use `packages/core/src/providers/media-router.ts` as the routing contract.

## Automatic repair

```
FAIL
→ diagnose
→ minimal repair
→ regenerate only affected artifact
→ QA again
→ PASS
```

Do not restart the project from the topic after a localized failure.

## Existing contracts are authoritative

Reuse:
- `schemas/`
- `prompts/`
- `packages/core/src/`
- `docs/CONTENT_CONTRACTS.md`
- canonical example under `examples/fridge-hot-behind/`

Keep IDs stable across repair revisions unless a schema requires a new ID.

## Provider boundary

AI Explainer Studio is the orchestrator, not the model server. External/local providers should sit behind provider interfaces. Preferred production direction:
- image workflows: ComfyUI;
- realistic I2V: Wan2.2;
- advanced/keyframe video: LTX optional;
- Vietnamese voice: VieNeu-compatible API;
- deterministic motion/composition: Remotion/SVG/FFmpeg.

If a provider is unavailable, never pretend generation succeeded. Fall back when the route allows it; otherwise mark the stage `needs_human_review` with the exact missing capability.

## State

Runtime state is stored under:

```
.ai-explainer/runs/<slug>/state.json
```

This is execution state and remains gitignored.

Detailed stage responsibilities are in `prompts/orchestrator/AUTONOMOUS_ORCHESTRATOR.md`.
