# AI Explainer Studio — Codex Autopilot

This repository supports a fully autonomous workflow. When the user gives a topic or asks to create an explainer, treat that topic as the only required input unless the user explicitly overrides defaults.

## Primary behavior

1. Start or resume the autonomous state:
   - New topic: `npm run autopilot -- --topic "<topic>"`
   - Resume: `npm run autopilot -- --slug <slug>`
2. Follow the returned directive in a loop.
3. Do not ask the user for approval at canonical asset, storyboard/keyframe, or final-output gates. They are automatic QA gates.
4. Validate every generated artifact with the existing schemas, QA contracts and deterministic checks.
5. On failure, diagnose the smallest repair, apply it, and retry automatically.
6. Allow up to 3 automatic attempts per stage.
7. After retries are exhausted, prefer graceful degradation before human interruption:
   - generative video -> deterministic Remotion motion over an approved image;
   - preferred image provider -> alternate configured image provider;
   - preferred voice provider -> alternate configured voice provider.
8. Interrupt only when a required capability is genuinely unavailable and no configured fallback can produce a valid artifact.
9. Preserve passing artifacts. Revisions must invalidate only affected downstream work.

## Automatic QA gates

These legacy checkpoint stage names remain in the state schema for backward compatibility, but new runs auto-approve them:

- `checkpoint_canonical`: auto-approve after canonical QA passes.
- `checkpoint_storyboard`: auto-approve after storyboard/keyframe QA passes.
- `checkpoint_final`: auto-complete after final QA passes.

Never stop a new run merely because one of these stage names exists in the schema.

## Preferred production stack

Use provider abstractions rather than coupling orchestration to a model:

- Content/orchestration: Codex / ChatGPT
- Image workflow server: ComfyUI
- Realistic motion: Wan image-to-video through ComfyUI
- Advanced multi-keyframe video: optional LTX provider
- Vietnamese TTS: VieNeu-compatible HTTP provider
- Technical/diagram motion and fallback: Remotion + SVG
- Final composition: Remotion + FFmpeg

If a media provider is not configured in the current environment, surface the missing provider exactly; never pretend an asset was generated.

## Timing principle

For new pipeline work, narration timing should inform scene timing. Prefer generating or estimating narration timing as early as contracts allow, then make storyboard/motion durations follow real audio rather than forcing audio into arbitrary scene durations.

Existing scene-based VoiceSpec contracts remain authoritative until their migration is complete.

## Automatic repair

Use:

FAIL -> diagnose -> minimally repair prompt/spec -> regenerate -> QA again.

Keep approved parents and unrelated assets unchanged. When an edit affects one scene only, do not regenerate passing scenes.

## Existing contracts are authoritative

Reuse:
- `schemas/`
- `prompts/`
- `packages/core/src/`
- `docs/CONTENT_CONTRACTS.md`
- canonical example: `examples/fridge-hot-behind/`

Keep IDs stable across repair revisions unless a schema explicitly requires a new artifact ID.

## State

Autopilot state is stored under `.ai-explainer/runs/<slug>/state.json` and is intentionally gitignored. Read it before resuming interrupted work.

Detailed stage responsibilities are in `prompts/orchestrator/AUTONOMOUS_ORCHESTRATOR.md`.
