# Codex / ChatGPT Autonomous Workflow

AI Explainer Studio supports a one-topic, hands-off execution mode in addition to the guided browser workflow.

## Target experience

Normal input:

> Tạo video giải thích: Tại sao tủ lạnh nóng phía sau?

Normal output:

- `final.mp4`
- thumbnail/cover asset when configured
- script and metadata
- QA summary

The system should not stop for canonical, storyboard, or final approval when the run mode is `hands_off`.

## Default stage order

```
Topic
→ Research + QA
→ Script + QA
→ Master Voice + timing
→ Timed Storyboard + QA
→ AssetBible / visual plan
→ A0 canonical generation + QA
→ scene prompts / keyframes
→ scene generation + QA
→ Motion Router
→ scene motion/video generation
→ subtitles / composition
→ final render
→ final QA
→ complete
```

Generating master narration before the storyboard lets the visual timeline use measured speech duration instead of estimated scene timing.

## Auto-gates

The legacy checkpoint stage names remain in the state machine for compatibility:

1. `checkpoint_canonical`
2. `checkpoint_storyboard`
3. `checkpoint_final`

In `hands_off` mode they are automatic QA gates. When the preceding QA has passed, the state machine marks the gate approved and continues immediately.

Use `--mode guided` to restore interactive checkpoint behavior.

## One-command CLI

For normal production, the user should run only:

```bash
npm run create-video -- "Tại sao tủ lạnh nóng phía sau?"
```

The runner performs Codex preflight/auth checks, initializes or resumes the hands-off state, then invokes `codex exec --full-auto` non-interactively. The production prompt is passed through stdin so long topics/instructions do not depend on Windows command-line length.

Codex is required to return a structured `CreateVideoResult`. The wrapper independently verifies that the returned final video file exists before declaring success.

Optional explicit topic syntax:

```bash
npm run create-video -- --topic "Tại sao tủ lạnh nóng phía sau?"
```

Optional model override:

```bash
npm run create-video -- --topic "Tại sao tủ lạnh nóng phía sau?" --model <codex-model>
```

## Low-level state CLI

Start only the autonomous state machine without launching Codex:

```bash
npm run autopilot -- --topic "Tại sao tủ lạnh nóng phía sau?"
```

Start a guided run:

```bash
npm run autopilot -- --topic "Tại sao tủ lạnh nóng phía sau?" --mode guided
```

Resume:

```bash
npm run autopilot -- --slug tai-sao-tu-lanh-nong-phia-sau
```

Existing state files without `runMode` are treated as `guided` for backward compatibility.

## Media routing and fallback

The orchestrator should not send every scene to a generative video model.

Preferred routing:
- realistic motion → Wan2.2 I2V;
- multi-keyframe / complex generative scene → LTX;
- technical diagram / engineering overlay → Remotion + SVG;
- static explanatory visual → deterministic pan/zoom;
- repeated provider failure → bounded retry then fallback route.

The routing contract lives in `packages/core/src/providers/media-router.ts`.

## Repair policy

Default maximum attempts per machine stage: 3.

```
FAIL
→ diagnose smallest defect
→ repair prompt/spec
→ regenerate affected artifact
→ QA
```

A scene failure should repair that scene, not rebuild unrelated passing scenes. Provider failure should degrade gracefully to a deterministic render when that still satisfies the scene goal.

## Tool/provider boundary

Full hands-off media generation requires configured provider access. AI Explainer Studio remains the orchestrator; ComfyUI/Wan/LTX/TTS servers are execution backends.

When no valid provider or fallback can satisfy a required stage, record the exact missing capability and escalate instead of fabricating success.
