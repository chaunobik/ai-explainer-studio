# Image generation now uses PromptSpec

Old flow (too ambiguous):

VisualPlan → generic visual_goal → ImageProvider

New required flow:

VisualPlan
→ ImagePromptSpec Generator
→ ImagePromptSpec
→ Image Prompt QA
→ compileImagePrompt()
→ ImageProviderJob
→ image generation/edit
→ Visual QA

## Important

`visual_goal` is not an image prompt. It is only the teaching objective.

ImagePromptSpec is the production instruction set. It resolves camera, composition, identity, environment, technical overlays, continuity and negative constraints before generation.

## Reference-first anchor

Anchor generation may now use reference assets. For the refrigerator example:
- A0 = user-supplied product reference used to lock the exact appliance design
- A1 = canonical kitchen/rear-three-quarter anchor derived from A0
- A2/A5/A6 = edits derived from approved A1

This is safer than asking the image model to invent the appliance identity from text.