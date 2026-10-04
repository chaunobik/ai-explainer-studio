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
→ storyboard (draft scene IDs/narration)
→ master_voice (VieNeu + measured timing sync)
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
npm run image:generate -- --prompt "<complete prompt>" --out <output.png> --project <project-dir> --asset <asset-id>
npm run image:generate -- --prompt "<complete prompt>" --reference <approved-A0-board.png> --crop x,y,w,h --out <output.png> --project <project-dir> --asset <asset-id>
```

Before generation, declare A0/A1/... in both image asset manifests using the ImageAsset schema. Generated ComfyUI assets are registered as `qa_pending`.

Use A0 as the source-of-truth reference for derived product scenes.

**Default V1 canonical strategy: one image, not an 8-view board.**

Generate A0 as one clean, full-product hero reference. Prefer a front three-quarter camera angle that makes the product's proportions, door layout, trim, handles, material and silhouette easy to judge. A normal portrait or 4:3 image is preferred over a collage.

Do NOT make a 4×2 / 8-view board a blocking requirement for a generic SDXL checkpoint. Multi-view boards are optional capability upgrades only when the configured provider can reliably generate them.

Inspect A0 with Codex `view_image`. Approve it when:
- exactly one intended product is present;
- identity-defining geometry is clear and physically plausible;
- materials/color/trim/handles are readable;
- there is no severe AI warping or duplicate geometry;
- it is strong enough to condition later scene generation.

For derived scenes:

```
npm run image:generate -- --prompt "<complete scene prompt>" --reference <approved-A0.png> --out <output.png> --project <project-dir> --asset <asset-id>
```

Do not use `--crop` unless the actual approved reference is intentionally a contact sheet. For large viewpoint changes such as a rear view, keep A0 as the identity reference, repeat the exact subject-lock geometry in the prompt, and QA the derived image independently. If a rear/hidden surface is not established by A0 or approved research, do not invent unsupported fine detail.

After semantic image QA passes:

```
npm run image:status -- --project=<project-dir> --asset=<asset-id> --status=approved --qa-id=<qa-id>
```

### Vietnamese narration — VieNeu-TTS

Single file:

```
npm run voice:generate -- --text "<narration>" --out <output.wav>
```

VoiceSpec batch:

```
npm run voice:generate -- --spec <voice-spec.json> --project <project-dir>
npm run voice:sync-timing -- --project=<project-dir>
```

Create the draft storyboard first so stable `scene_id` values exist. Then build VoiceSpec from those scene IDs. `voice:sync-timing` updates VoiceSpec targets and storyboard durations from the measured WAV files, runs deterministic voice timing QA, and approves passing voice assets.

### Realistic motion — Wan2.2

```
npm run video:generate -- --image <approved-keyframe.png> --prompt "<motion-only prompt>" --out <scene.mp4> --project <project-dir> --scene-id <scene-id> --asset-id <video-asset-id>
```

Generated videos enter `qa_pending`. Sample frames first:

```
npm run video:frames -- --video <scene.mp4> --count 5
```

Inspect every sampled frame with Codex `view_image` for subject identity, physical correctness, temporal drift and forbidden objects. After semantic video QA passes:

```
npm run video:status -- --project=<project-dir> --asset=<video-asset-id> --status=approved --qa-id=<qa-id>
```

If Wan is unavailable or fails after bounded retries, use the image keyframe plus deterministic Remotion motion. Wan failure alone must not block the project.

### Final composition — Remotion

Use:

```
npm run render:project -- --project=<project-dir>
npm run final:preflight -- --project=<project-dir>
npm run project:doctor -- --project=<project-dir>
```

The renderer automatically prefers an approved scene video from `video-assets.json`; otherwise it renders the approved image source with deterministic motion. Do not mark final QA PASS unless deterministic preflight and project doctor pass.

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

Topic artifact workspace:

```
.ai-explainer/projects/<slug>/
```

Never modify the canonical example while producing a user topic.

Detailed provider setup is in `docs/PROVIDER_SETUP.md`. Detailed stage responsibilities are in `prompts/orchestrator/AUTONOMOUS_ORCHESTRATOR.md`.
