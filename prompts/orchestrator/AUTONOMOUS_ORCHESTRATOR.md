# Autonomous Orchestrator

## Goal

Turn one topic into a finished Vietnamese short-form explainer with no routine human review.

Defaults:
- Vietnamese
- 9:16, 1080×1920
- 45–60 seconds
- 6–10 scenes
- science/engineering accuracy first
- visual continuity first
- A0 remains the canonical visual identity source
- run mode: hands_off

## Stage responsibilities

### research
Research the topic, produce the existing ResearchResult contract and verify factual claims before passing.

### script
Create narration from approved claims only. Run Script QA and repair automatically.

### storyboard
Create a draft StoryboardSpec from the approved script. Establish stable scene IDs, verbatim narration mapping and provisional durations. Run Storyboard QA for content/coverage.

### master_voice
Build VoiceSpec from the draft storyboard scene IDs, generate real WAV files through VieNeu, then run `voice:sync-timing`. Measured audio durations become the authoritative scene durations. Refresh timing-sensitive storyboard QA after synchronization.

### asset_plan
Build the visual plan, AssetBible, lineage, transition plan and execution plan. Prefer reuse of existing approved assets over redefinition.

### canonical_prompt
Create the complete A0 multi-view reference prompt and PhotoCaptureSpec. Run Multi-View Prompt QA.

### canonical_generation
Generate A0 through `image:generate` using ComfyUI. Use a fixed 1536×1024 4×2 canonical board for recurring physical products. Register it as `qa_pending`, inspect it with `view_image`, then approve through `image:status` only after identity/multi-view QA passes.

### canonical_qa
Run Multi-View Consistency QA. Repair/regenerate automatically for repairable failures.

### checkpoint_canonical
In hands_off mode this is an automatic gate: if canonical QA passed, approve and continue. In guided mode retain manual Approve/Edit/Regenerate behavior.

### scene_prompts
Generate complete per-scene image jobs from A0 identity. Never independently redefine the canonical subject.

### storyboard_preview
Prepare keyframes/previews for machine QA and optional supervision UI.

### checkpoint_storyboard
Automatic gate in hands_off mode; interactive checkpoint only in guided mode.

### scene_generation
Declare planned image assets first. Generate scene assets through `image:generate`; for recurring products use an approved A0 panel crop as the reference rather than conditioning on the whole board. Generated assets remain `qa_pending` until semantic QA passes.

### scene_qa
Check factual correctness, continuity, identity, camera and required content. Repair only failed scenes.

### motion
Use the media router:
- realistic natural motion → Wan2.2 I2V;
- complex generative motion → Wan2.2 when feasible;
- technical diagrams/infographics → Remotion/SVG;
- static visuals → deterministic pan/zoom.

For Wan clips, run `video:frames` and inspect sampled frames with `view_image` before `video:status=approved`. Each provider gets bounded retries. On repeated Wan failure, fall back to the approved keyframe plus deterministic Remotion motion.

### final_render
Compose approved assets, master voice, aligned subtitles, music when configured, and motion into the final video.

### final_qa
Run `final:preflight` and `project:doctor` first. Then apply the Final QA prompt for factual integrity, narration/visual synchronization, subtitle coverage, continuity and render integrity. Never return complete when deterministic preflight fails. Repair only affected downstream artifacts.

### checkpoint_final
Automatic gate in hands_off mode. PASS moves directly to complete.

## Repair and fallback rules

- Maximum automatic attempts: 3 per stage/provider unless configured otherwise.
- Repair the smallest affected scope.
- Keep passing parents and unrelated assets unchanged.
- Preserve immutable IDs during prompt repair.
- Do not regenerate A0 for narration-only changes unless timing changes require visual plan changes.
- Do not regenerate passing scenes because one scene failed.
- When generative video fails, degrade to deterministic motion if the visual goal can still be met.
- Never claim PASS until contract validation and relevant QA pass.

## State protocol

Start:
  npm run autopilot -- --topic "<topic>"

Guided compatibility:
  npm run autopilot -- --topic "<topic>" --mode guided

Before machine work:
  npm run autopilot -- --slug <slug> --begin

After validation passes:
  npm run autopilot -- --slug <slug> --result pass

After validation fails:
  npm run autopilot -- --slug <slug> --result fail --note "<failure summary>"

If no provider or fallback can satisfy the stage:
  npm run autopilot -- --slug <slug> --result needs_human_review --note "<exact missing capability>"
