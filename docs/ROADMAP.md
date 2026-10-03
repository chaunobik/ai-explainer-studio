# Roadmap

## Milestone 1 — Content Intelligence
Goal: produce a validated storyboard from a topic.

Deliverables:
- VideoSpec base model
- research result format
- claim/evidence format
- script format
- storyboard format
- QA result format
- prompt templates for Research, Research QA, Script, Script QA, Storyboard, Storyboard QA
- manual ChatGPT Web workflow documented
- example topic processed end-to-end

Exit condition:
A topic can consistently produce structured, reviewable JSON through the content pipeline.

## Milestone 2 — Visual Intelligence
Goal: turn storyboard scenes into a coherent visual plan.

Deliverables:
- AssetBible
- entity model
- anchor asset strategy
- SceneLineage
- Visual Router
- TransitionSpec
- continuity QA rules

Exit condition:
Each storyboard scene has a deliberate visual source and relationship to adjacent scenes.

## Milestone 3 — Visual Generation
Goal: generate/edit scene assets and validate them.

Deliverables:
- image provider abstraction
- anchor image workflow
- derived-scene workflow
- visual QA
- continuity QA
- repair/retry logic

Exit condition:
A project can create a visually coherent set of approved scene assets.

## Milestone 4 — Video Engine
Goal: animate approved visuals.

Deliverables:
- MotionSpec
- Remotion project
- reusable motion primitives
- SVG overlays
- Codex rendering workflow
- scene-level render
- motion QA
- selective scene repair

Exit condition:
Approved assets can be rendered into scene MP4s and re-rendered individually.

## Milestone 5 — Production
Goal: assemble final publishable short video.

Deliverables:
- VoiceProvider abstraction
- OpenAI/basic voice implementation
- subtitle generation
- audio/video synchronization
- final compositor
- final QA
- final 1080×1920 export

Exit condition:
10–20 different topics can complete the pipeline without critical QA failures.

## V2 candidates
- ElevenLabs
- advanced voice direction
- additional image/video providers
- full generative video for selected scenes
- YouTube long-form
- auto publishing
- analytics feedback loop
- SaaS/multi-user support
