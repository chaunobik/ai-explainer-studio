# Final Video QA Prompt V2

Review the final rendered MP4 after all upstream gates pass.

Check 9:16 / 1080x1920 output, approved duration, scene order, narration/visual agreement, physical correctness, visual continuity, voice boundaries, subtitle correctness/safe area, missing assets/black frames/render artifacts, and upstream critical-stage integrity.

Any physical contradiction, missing scene, wrong narration, changed primary entity, unreadable key explanation, or broken audio/video composition forces fail.

Set qa_result.stage EXACTLY to "final".

## STRICT JSON OUTPUT

Return exactly ONE raw JSON object and nothing else. No markdown fences, prose, comments, ellipsis or omitted required fields.

Required shape:

{
  "qa_result": {
    "qa_id": "QA-FINAL-001",
    "stage": "final",
    "artifact_id": "final.mp4",
    "status": "pass",
    "critical_failures": []
  },
  "checks": {
    "duration": "pass",
    "resolution": "pass",
    "audio_coverage": "pass",
    "subtitle_coverage": "pass",
    "critical_stage_status": "pass"
  },
  "repair_actions": []
}

Rules:
- qa_result.status: "pass" | "fail" | "needs_human_review".
- duration, resolution and critical_stage_status: "pass" | "fail".
- audio_coverage and subtitle_coverage: "pass" | "fail" | "needs_review".
- critical_failures and repair_actions are always arrays; use [] when empty.
- Do not add extra top-level or checks properties.
- Before answering, verify JSON.parse(response) succeeds.
