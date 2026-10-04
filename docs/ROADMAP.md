# Roadmap

## Milestone 1 — Content Intelligence ✅ COMPLETE
Goal: research and produce a fact-checked script/story structure from one topic.

## Milestone 2 — Visual Intelligence ✅ COMPLETE
Goal: create AssetBible, lineage, routing and continuity contracts.

## Milestone 3 — Visual Generation 🚧 IN PROGRESS
Goal: generate canonical and scene assets with selective QA/repair.

Deliverables:
- ImageProvider abstraction
- ComfyUI adapter/workflow contract
- A0 canonical generation
- derived-scene generation
- VLM visual QA
- asset cache/reuse
- bounded retry

Exit condition:
A project can automatically create a coherent set of scene assets without manual approval.

## Milestone 4 — Media Engine 🚧 FOUNDATION IMPLEMENTED
Goal: route each scene to the correct motion engine instead of generative video everywhere.

Implemented foundation:
- media kind classification
- Wan-first realistic motion route
- deterministic Remotion/SVG route
- static pan/zoom route
- bounded provider retry + fallback chain

Next:
- ComfyUI job adapter
- Wan2.2 workflow template
- generated-video semantic QA
- scene-level cache

Exit condition:
Every scene can produce motion through a primary provider or safe fallback.

## Milestone 5 — Voice-First Timing 🚧 FOUNDATION IMPLEMENTED
Goal: make narration timing authoritative.

Implemented foundation:
- autonomous stage order now places `master_voice` before storyboard
- hands-off state supports voice-first timing

Next:
- VieNeu-compatible API provider
- master audio generation
- sentence/word alignment
- storyboard duration derivation from measured audio
- subtitle timestamps generated from alignment

Exit condition:
Storyboard and captions are timed from actual narration audio.

## Milestone 6 — Hands-off Production 🚧 FOUNDATION IMPLEMENTED
Goal: topic-in → final-video-out.

Implemented:
- `hands_off` default run mode
- guided compatibility mode
- canonical/storyboard/final checkpoints become auto-gates in hands-off mode
- three-attempt repair model retained
- provider fallback contract

Next:
- executable provider runner
- asset cache
- final semantic video QA
- thumbnail/metadata outputs
- end-to-end integration tests with configured media providers

Exit condition:
10–20 different topics complete without routine human interaction and without critical factual/continuity failures.

## Later candidates
- additional TTS providers
- advanced voice direction
- additional image/video models
- long-form YouTube
- auto publishing
- analytics feedback loop
- SaaS/multi-user support
