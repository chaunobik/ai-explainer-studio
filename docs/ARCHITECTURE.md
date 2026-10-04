# Architecture V1

## System view

```
Topic
  ↓
Research + factual QA
  ↓
Script + script QA
  ↓
Draft Storyboard
  ├─ stable scene IDs
  └─ verbatim narration per scene
  ↓
VieNeu Voice
  ├─ real WAV generation
  └─ measured duration
  ↓
Timing Sync
  └─ updates VoiceSpec + Storyboard durations
  ↓
VideoSpec
  ↓
Visual Intelligence
  ├─ AssetBible
  ├─ Visual Router
  ├─ Scene Lineage
  └─ Continuity QA
  ↓
Canonical A0 + scene keyframes
  ↓
Visual QA / selective repair
  ↓
Media Router
  ├─ realistic motion → Wan2.2 I2V
  ├─ diagrams/infographics → Remotion/SVG
  └─ static visual → deterministic pan/zoom
  ↓
Scene motion/video QA
  ↓
Final Composer
  ├─ master voice
  ├─ aligned subtitles
  ├─ music when configured
  └─ Remotion + FFmpeg
  ↓
Final QA
  ↓
final.mp4
```

## Architectural rule

AI Explainer Studio owns orchestration, contracts, QA, state, continuity and fallback policy. Model servers own inference.

Do not load Python AI models inside the TypeScript process. Runtime boundaries are explicit:
- ComfyUI: HTTP provider for still-image generation/editing;
- VieNeu-TTS: OpenAI-compatible HTTP provider for Vietnamese speech;
- Wan2.2: isolated official Python CLI provider for optional I2V;
- Remotion: TypeScript renderer and deterministic fallback.

This keeps GPU/model lifecycle outside the orchestration core while still giving the one-command runner a concrete execution path.

## Source of truth

`VideoSpec` remains the central project state. Runtime progress is tracked by `AutonomousRunState`.

Modules do not pass unconstrained prose to each other. Each stage reads the current contract and writes only its owned section.

## Hands-off state machine

Default stage order:

```
research
→ script
→ storyboard
→ master_voice
→ asset_plan
→ canonical_prompt
→ canonical_generation
→ canonical_qa
→ checkpoint_canonical
→ scene_prompts
→ storyboard_preview
→ checkpoint_storyboard
→ scene_generation
→ scene_qa
→ motion
→ final_render
→ final_qa
→ checkpoint_final
→ complete
```

In `hands_off` mode the three checkpoint stages are automatic gates. In `guided` mode they retain manual approval semantics.

Older run-state files without `runMode` are interpreted as guided by the CLI for backward compatibility.

## QA subsystem

QA has three layers:
1. deterministic contract checks;
2. semantic AI/VLM evaluation;
3. cross-stage consistency checks.

Repair policy:

```
FAIL
→ diagnose smallest defect
→ repair only affected prompt/spec/artifact
→ regenerate
→ QA again
```

Retries are bounded. A provider failure should fall back to a lower-cost deterministic path when the visual goal can still be preserved.

## Visual continuity

Each scene declares:
- primary entities
- anchor asset
- parent scene
- relationship to parent
- intended camera change
- intended visual transform
- transition rationale

A0 remains the canonical identity source for recurring physical subjects.

## Provider abstractions

Provider-specific code must sit behind stable interfaces.

Voice providers should support API-backed implementations without changing orchestration.

Media routing is centralized in:

```
packages/core/src/providers/media-router.ts
```

Current routing contract:
- `realistic_motion` → Wan2.2 → static motion → Remotion
- `complex_generative` → Wan2.2 → static motion → Remotion
- `technical_diagram` / `infographic` → Remotion → static motion
- `static_visual` → static motion → Remotion

This keeps a single provider outage from stopping an otherwise valid video.
