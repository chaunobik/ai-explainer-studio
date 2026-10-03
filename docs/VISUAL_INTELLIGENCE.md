# Visual Intelligence — Milestone 2

Milestone 2 converts a passed storyboard into a production-ready continuity plan before pixels are generated.

## Pipeline

StoryboardSpec
→ VisualPlanRequest
→ Visual Planner
→ AssetBible
→ VisualRouteDecision[]
→ SceneLineage[]
→ TransitionSpec[]
→ Continuity QA

## Core rule

The same primary object should remain the same object across scenes.

Continuity is represented explicitly in data rather than left to prompt wording.

## AssetBible

AssetBible locks identity and style. It defines:
- global realism/camera/environment guidance
- primary/supporting/conceptual entities
- invariant features
- allowed variations
- forbidden variations
- anchor assets
- continuity constraints

## Visual Router

Each scene receives one route:
- real_asset
- reference_edit
- generated_image
- technical_diagram
- programmatic_animation

The route also records source strategy, inputs, planned outputs, tools, and regeneration policy.

## Scene lineage

Lineage answers: where did this scene visually come from?

Typical chain:
anchor → continuation → derived → derived

A context switch is valid only when the explanation intentionally moves to another representation and preserves a clear bridge.

## TransitionSpec

Transitions are semantic bridges, not visual decoration.

Examples:
- zoom_bridge
- cutaway_reveal
- overlay_reveal
- diagram_bridge
- match_cut

## Continuity QA

QA checks identity, route choice, lineage, adjacent transitions, and technical consistency before image generation begins.

Critical identity drift blocks progression to Milestone 3.

## Gate

Visual generation begins only when Continuity QA returns pass.