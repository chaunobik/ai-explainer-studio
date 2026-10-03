# Multi-View Reference Prompt QA V3

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
  "check_notes": {
    "subject_lock": "Explain specifically what identity details are locked and why this check passes/fails.",
    "view_coverage": "Explain whether every required view is explicitly covered and readable.",
    "camera_specificity": "Explain whether the camera/capture parameters are concrete and mutually plausible.",
    "cross_view_consistency": "Explain how the prompt prevents product geometry from drifting across views.",
    "photographic_realism": "Explain what makes the requested result look like a real photograph rather than CGI.",
    "technical_safety": "Explain whether hidden mechanisms or unsupported technical details are avoided.",
    "ambiguity": "Explain whether any important visual decision is still left open to the image model."
  },
  "summary": "Concise human-readable conclusion stating whether the prompt is ready to generate A0 and why.",
  "critical_issues": [],
  "repair_actions": []
}

Rules:
- Replace "MVP1" with the exact input prompt_id.
- status: "pass" | "fail" | "needs_human_review".
- every checks value: "pass" | "fail" | "needs_review".
- Every check_notes field is REQUIRED and must contain a concrete explanation, not "OK", "pass", or a copied criterion.
- summary is REQUIRED and should be 1–3 concise sentences.
- If status="pass", critical_issues MUST be [] and repair_actions should normally be [].
- If status="fail", critical_issues and repair_actions must contain concrete strings.
- Do not add any additional top-level, checks, or check_notes properties.
- Before answering, verify JSON.parse(response) succeeds.
