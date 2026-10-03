# Architecture V1

## System view

```
Topic
  ↓
Content Pipeline
  ├─ Research
  ├─ Research QA
  ├─ Script
  ├─ Script QA
  ├─ Storyboard
  └─ Storyboard QA
        ↓
VideoSpec
        ↓
Visual Intelligence
  ├─ AssetBible
  ├─ Visual Router
  ├─ Scene Lineage
  └─ Continuity QA
        ↓
ImagePromptSpec
  ├─ exact camera/composition
  ├─ identity lock
  ├─ technical overlays
  └─ negative/continuity constraints
        ↓
Image Prompt QA
        ↓
ImageProvider
        ↓
Visual Assets + Visual QA
        ↓
MotionSpec
        ↓
Codex + Remotion/SVG/FFmpeg
        ↓
VoiceProvider
        ↓
Final Composer
        ↓
Final QA
        ↓
final.mp4
```

## Source of truth
`VideoSpec` is the central project state.

Modules do not pass unconstrained prose to each other. Each stage reads the current spec and writes only its owned section.

Suggested ownership:
- Research module → `research`, `claims`
- Script module → `script`
- Storyboard module → `scenes`
- Visual module → `asset_bible`, visual fields in scenes
- Motion module → motion fields
- Voice module → `voice`
- QA engine → `qa`
- Renderer → `render`

## Planned repository layout

```
apps/
  web/
  api/

packages/
  core/
  research/
  script/
  storyboard/
  visual/
  qa/
  voice/
  renderer/

schemas/
prompts/
renderer/
  remotion/

docs/
examples/
tests/
```

The implementation will be added milestone by milestone rather than scaffolding every package immediately.

## QA subsystem
QA should be reusable instead of duplicated independently in each module.

Conceptual interface:

```ts
qaEngine.run({
  type: "script" | "storyboard" | "image" | "motion" | "voice" | "final",
  artifact,
  spec,
  context
})
```

QA classes:
1. deterministic checks
2. semantic AI evaluation
3. cross-stage consistency checks

## Visual continuity model
Each scene should declare:
- its primary entities
- anchor asset
- parent scene when applicable
- relationship to the parent
- intended camera change
- intended visual transform
- transition rationale when changing context

This allows continuity to be tested instead of treated as prompt wording only.

## Provider abstractions
Even when V1 uses one provider, integrations should sit behind interfaces.

Examples:
```ts
interface VoiceProvider {
  generate(spec: VoiceSpec): Promise<AudioAsset>;
}
```

and later:
```ts
interface ImageProvider {
  generate(spec: ImageSpec): Promise<ImageAsset>;
  edit(spec: ImageEditSpec): Promise<ImageAsset>;
}
```

This prevents the pipeline from depending on one vendor.
