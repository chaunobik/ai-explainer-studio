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
→ Draft Storyboard + QA
→ VieNeu Voice + measured timing sync
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

The draft storyboard creates stable scene IDs required by VoiceSpec. VieNeu then generates real scene WAV files and `voice:sync-timing` writes measured durations back into both Storyboard and VoiceSpec before downstream visual/motion planning.

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

The runner performs Codex preflight/auth checks, initializes an isolated topic workspace, starts/checks required providers, initializes or resumes the hands-off state, then invokes `codex exec --full-auto` non-interactively. The production prompt is passed through stdin so long topics/instructions do not depend on Windows command-line length.

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
- complex generative scene → Wan2.2 when feasible;
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

Full hands-off media generation requires configured provider access. AI Explainer Studio remains the orchestrator; ComfyUI/Wan/VieNeu/Remotion servers are execution backends.

When no valid provider or fallback can satisfy a required stage, record the exact missing capability and escalate instead of fabricating success.


## Concrete runtime commands

Normal users do not run these manually; Codex uses them during `create-video`.

```bash
npm run project:init -- --topic "<topic>"
npm run provider:ensure
npm run provider:doctor

npm run image:generate -- --prompt "..." --out <png> --project <project-dir> --asset A0
npm run image:status -- --project=<project-dir> --asset=A0 --status=approved --qa-id=<qa>

npm run voice:generate -- --spec <voice-spec.json> --project <project-dir>
npm run voice:sync-timing -- --project=<project-dir>

npm run video:generate -- --image <png> --prompt "..." --out <mp4> --project <project-dir> --scene-id S1 --asset-id VID-S1
npm run video:frames -- --video <mp4>
npm run video:status -- --project=<project-dir> --asset=VID-S1 --status=approved --qa-id=<qa>

npm run render:project -- --project=<project-dir>
npm run final:preflight -- --project=<project-dir>
npm run project:doctor -- --project=<project-dir>
```

Codex must use its local `view_image` capability to inspect A0, scene images and sampled Wan frames before semantic approval. If Wan is absent, use deterministic Remotion motion instead.
