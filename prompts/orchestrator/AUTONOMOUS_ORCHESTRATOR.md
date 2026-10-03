# Autonomous Orchestrator

## Goal

Turn one topic into a finished short-form explainer while minimizing human interaction.

Default V1 constraints remain:
- Vietnamese
- 9:16
- 45–60 seconds
- 6–10 scenes
- science/engineering accuracy first
- visual continuity first
- A0 is the canonical visual source of truth

## Stage responsibilities

### research
Research the topic and produce the existing ResearchResult contract. Verify factual claims before passing.

### script
Create the script from approved claims only. Run Script QA and repair automatically if required.

### storyboard
Convert the approved script into the StoryboardSpec without narration drift. Run Storyboard QA.

### asset_plan
Build the visual plan, asset bible, lineage, transition plan and execution plan. Prefer reuse of approved canonical assets over redefinition.

### canonical_prompt
Create the complete A0 multi-view reference prompt and PhotoCaptureSpec. Run Multi-View Prompt QA.

### canonical_generation
Generate A0 as one canonical multi-view board when an image tool/provider is available.

### canonical_qa
Run Multi-View Consistency QA. Repair/regenerate A0 automatically for repairable failures.

### checkpoint_canonical
Human checkpoint A. Show only the preview, concise QA result and actions: Approve, Edit, Regenerate.

### scene_prompts
Generate complete per-scene ImagePromptSpec/provider jobs from the approved A0 identity. Do not independently redefine the product.

### storyboard_preview
Prepare representative keyframes/previews so the user can judge the creative plan.

### checkpoint_storyboard
Human checkpoint B. Present scene number, purpose, preview, narration summary and duration. Do not expose unnecessary JSON.

### scene_generation
Generate all approved scenes. Run independent work in parallel when dependencies allow.

### scene_qa
Check technical correctness, continuity, identity, camera and required content. Auto-repair only failed scenes.

### voice
Generate narration/audio from the approved script. Validate timing against scenes.

### motion
Build motion/composition and render scene previews. Validate motion continuity.

### final_render
Assemble the final video from approved scene, voice and motion artifacts.

### final_qa
Run final QA. Repair only affected downstream stages.

### checkpoint_final
Human checkpoint C. Show final preview and concise issues. Approval moves directly to completion.

## Repair rules

- Maximum automatic attempts: 3 per stage.
- Repair the smallest affected scope.
- Keep approved parents and unrelated artifacts unchanged.
- Preserve immutable IDs during prompt repair.
- When an edit affects narration only, do not regenerate A0 or unrelated scenes.
- When an edit affects one scene only, do not regenerate other passing scenes.

## Codex state protocol

Start:
  npm run autopilot -- --topic "<topic>"

Before machine work:
  npm run autopilot -- --slug <slug> --begin

After validation passes:
  npm run autopilot -- --slug <slug> --result pass

After validation fails:
  npm run autopilot -- --slug <slug> --result fail --note "<failure summary>"

If the stage explicitly needs a human because a provider is unavailable or three repairs failed:
  npm run autopilot -- --slug <slug> --result needs_human_review --note "<exact reason>"

At a checkpoint after the user approves:
  npm run autopilot -- --slug <slug> --approve

At a checkpoint after the user requests an edit:
  npm run autopilot -- --slug <slug> --revise <target-stage> --note "<user request>"

Do not mark PASS until contract validation and the relevant QA have passed.
