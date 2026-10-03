# Motion & Remotion Renderer

Milestone 4 converts approved visuals into deterministic motion.

## Contract
`MotionSpec` is declarative. The renderer does not decide scientific content.

Supported primitives:
- camera
- heat_flow
- highlight
- label
- opacity

## Deterministic QA
`validateMotionSpec()` checks:
- scene coverage against storyboard
- exact scene duration match
- operation windows stay inside their scene
- non-zero heat-flow paths
- required source assets
- duplicate scene IDs

## Scene rendering

After real image assets exist under a project assets folder:

```bash
npm run render:scene -- --scene=S1 --assets=examples/fridge-hot-behind/assets
```

The script converts local images into data URLs, bundles Remotion, and renders only the selected scene. This enables local repair without rerendering the entire video.

## Canonical routing
- S1 → A1
- S2 → A2
- S3 → A1 + code overlays
- S4 → A1 + code heat-flow animation
- S5 → A5
- S6 → A6
- S7 → A6 + code summary overlay

A3/A4/A7 therefore do not need generative-image binaries; their explanatory content is generated deterministically by MotionSpec + Remotion.
