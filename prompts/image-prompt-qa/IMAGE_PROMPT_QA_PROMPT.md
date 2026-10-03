# Image Prompt QA Prompt V3

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
  "check_notes": {
    "identity_lock": "Explain what identity features and reference constraints are locked.",
    "camera_clarity": "Explain why the requested view, framing and perspective are unambiguous.",
    "scene_alignment": "Explain how the prompt supports the intended narration and visual goal.",
    "technical_correctness": "Explain whether technical content, directions and component relationships are physically correct.",
    "continuity": "Explain how the prompt preserves the approved A0/parent identity, environment and materials.",
    "ambiguity": "Explain whether any important visual decision is left open to the model.",
    "completeness": "Explain whether all required visual, camera, technical, continuity, negative and output constraints are present."
  },
  "summary": "Concise human-readable conclusion stating whether this prompt is ready for image generation and why.",
  "critical_issues": [],
  "repair_actions": []
}

Rules:
- Replace "IP1" with the exact prompt_id from the provided input.
- status: "pass" | "fail" | "needs_human_review".
- Every checks value: "pass" | "fail" | "needs_review".
- Every check_notes field is REQUIRED and must be a concrete explanation.
- summary is REQUIRED and should be 1–3 concise sentences.
- If status="pass", critical_issues MUST be [] and repair_actions should normally be [].
- If status="fail", list concrete defects in critical_issues and smallest actionable fixes in repair_actions.
- Never add extra top-level, checks, or check_notes fields.
- Before answering, verify JSON.parse(response) succeeds.
