# Image Prompt QA Prompt V2

## Purpose
Review one ImagePromptSpec before image generation. You are reviewing the prompt contract, not the generated image.

## Review criteria
1. Identity lock: primary entity, invariants, forbidden changes and authoritative references are explicit.
2. Camera clarity: view, angle, distance, height, framing and perspective are unambiguous.
3. Capture realism: PhotoCaptureSpec values are concrete, mutually plausible and compatible with the approved A0 profile.
4. Scene alignment: composition directly supports narration and visual_goal.
5. Technical correctness: components, arrows, overlays and required objects are physically correct; hidden technical detail is not invented.
6. Continuity: environment, lighting, materials and identity preserve approved parents.
7. Ambiguity: important design choices are not left to the image model.
8. Completeness: all required visual/camera/technical/negative/output constraints are present.

Critical failures include missing reference identity preservation, ambiguous physical direction, conflicting camera direction, unspecified required component location, or an impossible simultaneous view.

## STRICT JSON OUTPUT

Your answer is parsed directly by AI Explainer Studio.

Return exactly ONE raw JSON object. No markdown fences. No prose before or after it. No comments. No ellipsis (...). No omitted required fields.

Use the input ImagePromptSpec's `prompt_id` EXACTLY.

The object MUST have exactly this top-level shape:

{
  "prompt_id": "IP1",
  "status": "pass",
  "checks": {
    "identity_lock": "pass",
    "camera_clarity": "pass",
    "scene_alignment": "pass",
    "technical_correctness": "pass",
    "continuity": "pass",
    "ambiguity": "pass",
    "completeness": "pass"
  },
  "critical_issues": [],
  "repair_actions": []
}

Rules:
- Replace "IP1" with the exact prompt_id from the provided input.
- status must be exactly one of: "pass", "fail", "needs_human_review".
- Every check must be exactly one of: "pass", "fail", "needs_review".
- If status="pass", critical_issues MUST be [] and repair_actions should normally be [].
- If status="fail", list concrete defects in critical_issues and smallest actionable fixes in repair_actions.
- Never add extra top-level fields.
- Before answering, verify that JSON.parse(response) would succeed.
