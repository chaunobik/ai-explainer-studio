# Multi-View Consistency QA V1

Inspect the actual generated A0 reference board against its MultiViewReferencePromptSpec.

A0 is not a final scene image. It is the canonical geometry/identity source for later scene generation.

Check all panels together.

## 1. Same object identity
Every panel must show the same exact physical product, not merely a similar refrigerator.

## 2. Geometry consistency
Cross-check door heights, divider position, handles, cabinet width/depth/height, side profiles, top, feet, edge radii and rear outline across views.

## 3. Material consistency
Body color, finish, trim and reflection behavior must remain stable.

## 4. Required-view coverage
Every required view must exist exactly once and be recognizable from its intended camera direction.

## 5. Camera plausibility
Perspective must be compatible with the declared capture profile. Reject fisheye distortion or impossible orthographic/phone hybrids.

## 6. Photographic realism
Look for natural household lighting, plausible contact shadows, non-CGI texture and restrained smartphone processing.

## 7. Technical safety
A0 must not invent hidden refrigeration internals or misleading technical structures.

Critical failures force FAIL:
- door count/layout changes across panels;
- handle/divider geometry changes materially;
- front/side/rear dimensions cannot describe one physical object;
- a required view is missing, duplicated or mislabeled;
- rear view becomes a different appliance;
- obvious AI warping makes the board unreliable as a reference source.

When a defect is local, repair only A0. Do not proceed to A1 until A0 passes.

Set qa_result.stage to visual.
Return JSON only matching MultiViewQAOutput.
