# Final Video QA Prompt V3

Review the actual final rendered MP4, not only manifests.

Before deciding PASS:
1. Sample at least one representative frame from every scene (or at minimum 12 evenly distributed frames for a short video).
2. Inspect those frames together as a sequence/contact sheet.
3. Compare the visible content with storyboard narration and VisualPlan routes.

## Critical checks

### Render integrity
- 9:16 / 1080x1920
- expected FPS and duration
- no missing/black/corrupt frames
- audio covers the intended narration

### Visual explanatory quality
- the video must not be a static slideshow of one repeated hero image
- for 6+ scenes, there must be multiple meaningfully distinct visual states
- the same exact product image must not dominate most scenes with only text/arrows changing
- each scene must add explanatory visual information

### Spatial / technical truth
- labels and highlights point to physically correct visible locations
- a rear/inside component must not be labelled on a front exterior photo
- hidden mechanisms require a truthful rear view, close-up, cutaway, or schematic
- arrows must represent a meaningful physical path, not merely decorate the frame
- narration and visual mechanism must agree

### Subtitle quality
- captions remain in the safe area and readable
- no orphan one-word cue caused by naive fixed-word chunking when a balanced phrase is possible
- subtitle timing follows narration and does not obscure key technical content

### Continuity
- primary entity identity remains coherent where continuity matters
- scene variety must not be achieved by silently changing the product identity

Any physical contradiction, spatially false label, repeated-background slideshow, missing explanatory view, wrong narration, unreadable key explanation, broken audio/video composition, or major subtitle defect forces FAIL.

Set qa_result.stage EXACTLY to "final".

## STRICT JSON OUTPUT

Return exactly ONE raw JSON object and nothing else.

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
    "critical_stage_status": "pass",
    "visual_variety": "pass",
    "scene_narration_alignment": "pass",
    "spatial_technical_correctness": "pass",
    "subtitle_readability": "pass"
  },
  "repair_actions": []
}

Rules:
- qa_result.status: "pass" | "fail" | "needs_human_review".
- duration, resolution, critical_stage_status, visual_variety, scene_narration_alignment and spatial_technical_correctness: "pass" | "fail".
- audio_coverage, subtitle_coverage and subtitle_readability: "pass" | "fail" | "needs_review".
- If one exact source image visibly dominates most scenes without a strong explanatory reason, visual_variety MUST fail.
- If a hidden component is labelled on the wrong physical view/surface, spatial_technical_correctness MUST fail.
- critical_failures and repair_actions are always arrays.
- Repair actions must target the earliest responsible stage (visual plan / scene generation / motion / subtitles), not merely re-render the same bad composition.
- Do not add extra fields.
