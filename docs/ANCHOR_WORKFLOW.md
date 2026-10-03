# Anchor Asset Workflow

The anchor is the master visual identity for a primary physical entity. Derived scenes must not begin until the anchor is approved.

## Flow

AssetBible primary entity
→ AnchorGenerationInput
→ buildAnchorGenerationSpec()
→ ImageProvider.generateAnchor()
→ manual or API generation
→ import/result registration
→ Visual QA
→ approved anchor
→ derived scene generation unlocked

## Deterministic prompt builder

The anchor prompt is assembled from structured AssetBible data rather than being written ad hoc for each video.

It includes:
- canonical description
- invariant features
- realism/camera/lighting/environment guidance
- forbidden variations
- continuity constraints
- technical constraints

This reduces prompt drift and makes later repairs reproducible.

## Approval gate

`assertApprovedAnchor()` blocks downstream derivation unless:
- asset_role is anchor
- status is approved

An image that merely exists is not enough. It must pass Visual QA first.

## Manual ChatGPT Plus path

1. Build AnchorGenerationInput.
2. Convert it to GenerateAnchorSpec.
3. ManualImageProvider returns a requires_user_action job.
4. User runs the job in ChatGPT Image.
5. User imports the resulting image into the project.
6. Asset status becomes qa_pending.
7. Visual QA decides approved/rejected/needs_human_review.

## API path

A future API provider consumes the same GenerateAnchorSpec and can return a completed ImageAsset directly. No upstream contract changes are needed.