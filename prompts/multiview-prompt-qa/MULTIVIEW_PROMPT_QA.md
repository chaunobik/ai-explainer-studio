# Multi-View Reference Prompt QA V2

Review the A0 MultiViewReferencePromptSpec before image generation. A0 will become the canonical visual source of truth, so ambiguity is a critical defect.

## Review criteria
1. Subject lock: one concrete product identity; invariants and forbidden changes are explicit.
2. Required-view coverage: every requested view has camera relation, framing and purpose.
3. Camera specificity: capture mode, focal length, aperture, shutter, ISO, WB, camera height, subject distance, focus, exposure and lighting are concrete and plausible.
4. Cross-view consistency: the prompt clearly requires one exact physical object across all panels and names geometry that must match.
5. Photographic realism: believable smartphone/camera photography, not generic CGI-like "photorealism".
6. Technical safety: hidden mechanisms are not fabricated.
7. Ambiguity: product geometry, view direction and board layout are not left to the model.

Critical failures include missing/ambiguous required views, allowing different product variants, conflicting camera/perspective requirements, fabricated hidden internals, or board composition that can crop required geometry.

## STRICT JSON OUTPUT

Your answer is parsed directly by AI Explainer Studio.

Return exactly ONE raw JSON object. No markdown fences. No prose. No comments. No ellipsis (...). Do not omit required fields.

Copy `prompt_id` EXACTLY from the provided MultiViewReferencePromptSpec.

The object MUST have exactly this top-level shape:

{
  "prompt_id": "MVP1",
  "status": "pass",
  "checks": {
    "subject_lock": "pass",
    "view_coverage": "pass",
    "camera_specificity": "pass",
    "cross_view_consistency": "pass",
    "photographic_realism": "pass",
    "technical_safety": "pass",
    "ambiguity": "pass"
  },
  "critical_issues": [],
  "repair_actions": []
}

Rules:
- Replace "MVP1" with the exact input prompt_id.
- status: "pass" | "fail" | "needs_human_review".
- every check: "pass" | "fail" | "needs_review".
- If status="pass", critical_issues MUST be [] and repair_actions should normally be [].
- If status="fail", critical_issues and repair_actions must contain concrete strings.
- Do not add any additional top-level or checks properties.
- Before answering, verify JSON.parse(response) succeeds.
