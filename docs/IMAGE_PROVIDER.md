# Image Provider and Asset Lifecycle

Milestone 3 must support two execution modes without changing upstream VisualPlan contracts:

1. Manual mode — use ChatGPT Plus / ChatGPT Image by copying a structured prompt package and importing the result.
2. API mode — a future provider calls an image API and returns the same ImageAsset contract.

## Provider contract

ImageProvider exposes two semantic operations:
- generateAnchor(spec)
- deriveScene(spec)

Both return ImageProviderResult.

An API provider may return kind=completed immediately.
A manual provider returns kind=requires_user_action with an ImageProviderJob.

## Why this matters

The tool must not automate or scrape the ChatGPT web UI. Instead it creates a deterministic handoff package. The user performs the web generation step, then imports the result back into the project.

Later, replacing ManualImageProvider with an API implementation does not change VisualPlan, QA, lineage, or downstream rendering.

## Asset lifecycle

planned
→ awaiting_generation
→ awaiting_import (manual only)
→ qa_pending
→ approved

Failure paths:
- rejected → local retry
- retry limit reached → needs_human_review

## Anchor rule

Derived scene assets must never be created until their required anchor/reference assets are approved.

## Provenance

Every ImageAsset records:
- provider ID and mode
- operation
- parent asset IDs
- prompt snapshot
- source URI when available
- generation attempt
- QA result IDs

This enables reproducibility and selective repair.