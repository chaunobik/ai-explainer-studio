# Roadmap

## Milestone 1 — Content Intelligence ✅ COMPLETE
Research, claim verification, script contracts and storyboard contracts are implemented.

## Milestone 2 — Visual Intelligence ✅ COMPLETE
AssetBible, lineage, visual routing, continuity rules and selective repair contracts are implemented.

## Milestone 3 — Visual Generation ✅ RUNTIME WIRED
Implemented:
- ComfyUI HTTP client: upload, queue, history polling and output download
- built-in text-to-image and img2img workflows using core ComfyUI nodes
- canonical board panel crop before derived-scene conditioning
- generated image manifest registration with checksum and `qa_pending`
- explicit semantic QA approval through `image:status`

Remaining hardening:
- provider-specific high-fidelity identity conditioning beyond img2img
- asset cache/deduplication
- automated visual VLM score calibration across many topics

## Milestone 4 — Media Engine ✅ RUNTIME WIRED
Implemented:
- media router
- Wan2.2 official CLI adapter
- TI2V-5B consumer-GPU configuration path
- generated video manifest + checksum + QA gate
- Remotion scene-video playback
- deterministic Remotion fallback when Wan is unavailable
- final composition supports mixed still/diagram/generated-video scenes

Remaining hardening:
- real-GPU performance qualification
- automated semantic video QA thresholds
- scene cache

## Milestone 5 — Voice Timing ✅ RUNTIME WIRED
Implemented:
- VieNeu-TTS v3 Turbo OpenAI-compatible HTTP client
- preset-voice health validation
- real WAV generation
- WAV duration/checksum extraction
- draft storyboard → scene voice → measured timing sync
- deterministic Voice QA and approved voice manifest
- subtitle timing from actual audio duration

Remaining hardening:
- optional word-level forced alignment instead of proportional subtitle chunks
- pronunciation auto-repair loop

## Milestone 6 — Hands-off Production 🚧 INTEGRATION QUALIFICATION
Implemented:
- one-command `create-video`
- Codex non-interactive orchestration
- per-topic isolated project workspace
- provider auto-start hooks
- provider doctor
- hands-off auto-gates
- bounded repair/fallback rules
- final output existence verification

Exit condition still to qualify:
Run 10–20 materially different topics on a configured production machine and confirm no critical factual, visual-continuity, provider or render failures.

## Later candidates
- additional TTS/image/video providers
- long-form YouTube
- auto publishing
- analytics feedback loop
- SaaS/multi-user support
