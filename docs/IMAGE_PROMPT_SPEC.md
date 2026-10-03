# Detailed Per-Asset Image Prompts

VisualPlan answers **what each scene should communicate**. It is not precise enough to be sent directly to an image model.

Milestone 3 therefore inserts a mandatory prompt-compilation stage:

VisualPlan
→ ImagePromptSpec
→ Prompt QA
→ ImageProvider
→ ImageAsset
→ Visual QA

## Why generic prompts failed

A request such as 'same refrigerator, show the back and add heat flow' leaves too many decisions to the image model:
- exact camera angle
- how much rear panel is visible
- whether the front remains visible
- whether the refrigerator is redesigned
- where technical components appear
- arrow direction
- background and lighting continuity
- which parts may change

The model may produce a plausible image that is wrong for the storyboard.

## ImagePromptSpec

Each image asset gets its own specification covering:
- subject identity lock
- narration and visual teaching goal
- exact camera
- composition and crop
- environment
- lighting
- materials/realism
- required visual elements and placement
- technical overlays/directions
- allowed transforms
- continuity constraints
- negative constraints
- output dimensions

## Rule

No image job is sent to ImageProvider until its ImagePromptSpec passes Prompt QA.

## Derived images

For A2/A5/A6 the final prompt must explicitly state that the supplied approved A1 reference is authoritative and that the model must edit/derive rather than redesign the refrigerator.