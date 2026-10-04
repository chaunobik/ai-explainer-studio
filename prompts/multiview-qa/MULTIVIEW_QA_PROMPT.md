# Canonical Reference QA V4

Inspect the actual generated A0 reference asset against the provided MultiViewReferencePromptSpec. The contract supports both a single canonical reference image and an optional multi-view pack.

A0 is the canonical identity source for later scene generation.

## Mode rule

- If required_views contains exactly ONE view, evaluate A0 as a single canonical reference image. Do NOT fail it for lacking additional angles or a contact-sheet layout.
- If required_views contains TWO OR MORE views, evaluate full cross-view consistency and coverage.

## Review criteria
1. The intended product identity is clear and stable.
2. Geometry is physically plausible and identity-defining proportions/features are readable.
3. Material consistency across color, finish, trim and reflection behavior.
4. Every view explicitly listed in required_views exists exactly once and matches the requested direction.
5. Perspective is compatible with the declared capture profile.
6. Photographic realism is believable: natural lighting, contact shadows, non-CGI texture, restrained processing.
7. No hidden mechanisms or unsupported technical structures are invented.

For single-view A0, same_object_identity and geometry_consistency mean that the one product is internally coherent and suitable as an authoritative reference. Cross-view comparison is not required.

Critical failures force fail: duplicate/unintended products, material/handle/divider drift within the visible product, impossible geometry, a missing explicitly requested view, strong AI warping, or fabricated unsupported technical detail.

Set qa_result.stage EXACTLY to "visual".

## STRICT JSON OUTPUT

Your answer is parsed directly by AI Explainer Studio.

Return exactly ONE raw JSON object. No markdown fences. No prose. No comments. No ellipsis (...). Include all required fields.

Use:
- reference_prompt_id = exact prompt_id from the provided MultiViewReferencePromptSpec.
- asset_id = exact A0 asset id from the provided input.
- qa_result.stage = "visual".
- one view_results item for EVERY required_views[].view_id in the input, in the same order.

Required shape:

{
  "qa_result": {
    "qa_id": "QA-MV-A0-001",
    "stage": "visual",
    "artifact_id": "A0",
    "status": "pass",
    "critical_failures": []
  },
  "reference_prompt_id": "MVP1",
  "asset_id": "A0",
  "checks": {
    "same_object_identity": "pass",
    "geometry_consistency": "pass",
    "material_consistency": "pass",
    "required_view_coverage": "pass",
    "camera_plausibility": "pass",
    "photographic_realism": "pass",
    "technical_safety": "pass"
  },
  "check_notes": {
    "same_object_identity": "For a single-view A0, explain whether exactly one intended product with a clear stable identity is present. For multi-view A0, explain whether all views depict the same exact product.",
    "geometry_consistency": "Explain whether visible dimensions, doors, handles, edges and proportions are coherent; compare across views only when multiple views were requested.",
    "material_consistency": "Explain whether color, finish, trim and reflection behavior remain stable.",
    "required_view_coverage": "Explain whether every requested view is present exactly once and correctly oriented.",
    "camera_plausibility": "Explain whether perspective matches the declared capture profile without impossible distortion.",
    "photographic_realism": "Explain what visual evidence supports or contradicts real-camera realism.",
    "technical_safety": "Explain whether unsupported hidden technical structures were avoided."
  },
  "summary": "Concise human-readable conclusion stating whether A0 is reliable enough to become the canonical identity reference.",
  "view_results": [
    {
      "view_id": "front",
      "status": "pass",
      "notes": "Same canonical refrigerator; requested front view is present and readable."
    }
  ],
  "critical_violations": [],
  "repair_actions": []
}

Rules:
- The view_results example above is NOT enough by itself. Output one item for every required input view_id.
- qa_result.status: "pass" | "fail" | "needs_human_review".
- each checks value and view_results[].status: "pass" | "fail" | "needs_review".
- Every check_notes field is REQUIRED and must provide concrete visual evidence/reasoning.
- summary is REQUIRED and should be 1–3 concise sentences.
- qa_result.critical_failures, critical_violations and repair_actions must always be arrays, using [] when empty.
- If any critical failure exists, qa_result.status must be "fail".
- Do not add extra top-level/check/check_notes/view_result fields.
- Before answering, verify JSON.parse(response) succeeds.
