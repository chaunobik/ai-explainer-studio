# AI Explainer Studio — Codex Autopilot

This repository supports an autonomous, checkpointed workflow. When the user gives a topic or asks to create an explainer, treat that topic as the only required input unless the user explicitly overrides the defaults.

## Primary behavior

1. Start or resume the autonomous state:
   - New topic: `npm run autopilot -- --topic "<topic>"`
   - Resume: `npm run autopilot -- --slug <slug>`
2. Follow the returned directive in a loop.
3. For machine-verifiable work, do not ask the user for confirmation.
4. Validate every generated artifact with the existing schemas, QA contracts and deterministic checks.
5. On failure, diagnose the smallest repair, apply it, and retry automatically.
6. Allow up to 3 automatic attempts. Only then request human intervention.
7. Stop only at defined human checkpoints or when a required provider/tool is genuinely unavailable.
8. Preserve approved artifacts. Revisions must invalidate only affected downstream work.

## Human checkpoints

- Checkpoint A — Canonical asset: show A0 preview plus short QA summary. Actions: Approve, Edit, Regenerate.
- Checkpoint B — Storyboard and keyframes: show scene purpose, key visual, narration summary and duration. Actions: Approve all, Edit scene, Regenerate scene, Add/Remove scene.
- Checkpoint C — Final output: show final preview and final QA summary. Actions: Approve & export, Edit scene, Edit narration/text, Regenerate.

After approval, continue immediately. Never ask for a second confirmation.

## Automatic repair

A QA failure is not a user checkpoint.

Use this loop:

FAIL -> diagnose -> minimally repair prompt/spec -> regenerate -> QA again.

When a user requests an edit, merge the request into the complete existing master spec. Never replace a detailed prompt with only the short edit sentence.

## Existing contracts are authoritative

Reuse the current repository contracts instead of inventing parallel formats:
- `schemas/`
- `prompts/`
- `packages/core/src/`
- `docs/CONTENT_CONTRACTS.md`
- canonical example: `examples/fridge-hot-behind/`

Keep IDs stable across repair revisions unless a schema explicitly requires a new artifact ID.

## Provider/tool boundary

Use image/audio/video generation tools directly when they are available in the current Codex/ChatGPT environment. If a required provider is not available, do not pretend generation succeeded. Mark the current machine stage as `needs_human_review` with the exact missing capability and the already-prepared provider prompt/job so the user only handles that unavoidable boundary.

## State

Autopilot state is stored under `.ai-explainer/runs/<slug>/state.json` and is intentionally gitignored. Read it before resuming interrupted work. Do not restart a run from the topic if a valid state already exists.

Detailed stage responsibilities are in `prompts/orchestrator/AUTONOMOUS_ORCHESTRATOR.md`.
