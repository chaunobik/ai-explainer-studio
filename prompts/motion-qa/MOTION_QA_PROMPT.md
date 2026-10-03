# Motion QA Prompt V2

Review rendered scene previews against the approved storyboard and MotionSpec.

Check narration/visual alignment, physical arrow direction, labels, camera visibility, timing windows, continuity, explanatory value, clipping/off-screen content and abrupt discontinuities.

Critical failures include reversed physical direction, wrong component labels, changed entity identity, motion contradicting narration, or a required explanation being hidden.

Set qa_result.stage EXACTLY to "motion".

## STRICT JSON OUTPUT

Return exactly ONE raw JSON object and nothing else. No markdown fences, prose, comments, ellipsis or omitted required fields.

Output one scene_checks item for every reviewed scene_id. Use scene IDs exactly as provided.

Required shape:

{
  "qa_result": {
    "qa_id": "QA-MOTION-001",
    "stage": "motion",
    "artifact_id": "motion-preview",
    "status": "pass",
    "critical_failures": []
  },
  "scene_checks": [
    {
      "scene_id": "S1",
      "status": "pass",
      "issues": []
    }
  ],
  "repair_actions": []
}

Rules:
- qa_result.status: "pass" | "fail" | "needs_human_review".
- scene_checks[].status: "pass" | "fail" | "needs_review".
- issues and repair_actions are always arrays; use [] when empty.
- Repair actions must name only the smallest failed scene/operation.
- Do not add extra top-level or scene_check properties.
- Before answering, verify JSON.parse(response) succeeds.
