# Codex / ChatGPT Autonomous Workflow

AI Explainer Studio uses a one-topic autonomous production mode.

## User experience

Normal operation requires only a topic, for example:

> Tạo video giải thích: Tại sao tủ lạnh nóng phía sau?

The agent generates, validates, repairs, renders and final-QAs the project without waiting for routine approvals.

## Automatic gates

The old manual checkpoints are now automatic gates:

1. Canonical asset gate — advances automatically after A0 QA passes.
2. Storyboard/keyframe gate — advances automatically after plan/keyframe QA passes.
3. Final gate — marks the run complete automatically after final QA passes.

The checkpoint names remain in persisted state for backward compatibility. Existing old runs can still be resumed.

## Failure policy

A QA failure is not a user checkpoint.

The orchestrator retries up to three times:

    FAIL
      -> diagnose
      -> minimally repair
      -> regenerate
      -> QA again

After retries are exhausted, use a configured fallback where possible. Examples:

- Wan/LTX motion fails -> render deterministic Remotion camera/overlay motion from the approved still.
- preferred image provider fails -> try another configured image provider.
- preferred TTS fails -> try another configured TTS provider.

Only stop for human intervention if no valid provider/fallback exists.

## VS Code with Codex

Open this repository and provide the topic directly.

Underlying state helper:

    npm run autopilot -- --topic "Tại sao tủ lạnh nóng phía sau?"

Resume:

    npm run autopilot -- --slug tai-sao-tu-lanh-nong-phia-sau

The command prints the current stage and directive. Codex should continue until `complete`.

## State storage

Runtime state:

    .ai-explainer/runs/<slug>/state.json

This is execution state, not source code, and is gitignored.

## Provider boundary

The orchestration layer must remain provider-independent.

Recommended stack:

- ComfyUI as image/video workflow server
- Wan image-to-video as default realistic motion provider
- LTX as optional advanced video provider
- VieNeu-compatible API as default Vietnamese TTS
- Remotion/SVG as deterministic technical animation and video fallback
- FFmpeg/Remotion for final composition

Full hands-off media generation requires these services or equivalent configured APIs to be reachable from the runtime.
