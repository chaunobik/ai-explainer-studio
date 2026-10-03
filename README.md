# AI Explainer Studio

AI Explainer Studio is an AI-assisted pipeline for creating accurate, visually continuous, short-form science and engineering explainer videos.

> Core principle: **Research → Verify → Explain → Visualize → Verify → Render**

## V1 target
- TikTok + YouTube Shorts
- 9:16, 1080×1920
- Vietnamese
- 45–60 seconds
- 6–10 scenes
- image-first, motion-later
- QA after every stage
- visual continuity as a first-class requirement

## Foundation docs
- [Project Concept V1.0](docs/PROJECT_CONCEPT.md)
- [Architecture V1](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)

## Core schemas
- [VideoSpec](schemas/video-spec.schema.json)
- [SceneSpec](schemas/scene-spec.schema.json)
- [AssetBible](schemas/asset-bible.schema.json)
- [QAResult](schemas/qa-result.schema.json)

## Current development phase
**Milestone 1 — Content Intelligence**

```
Topic
→ Research
→ Research QA
→ Script
→ Script QA
→ Storyboard
→ Storyboard QA
```

The first implementation goal is to make this pipeline produce structured, reviewable JSON before adding visual generation and rendering.
