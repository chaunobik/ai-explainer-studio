# Autonomous Orchestrator

## Goal

Turn one topic into a finished short-form explainer without routine human interaction.

Default V1 constraints:
- Vietnamese
- 9:16
- 45–60 seconds
- 6–10 scenes
- science/engineering accuracy first
- visual continuity first
- A0 is the canonical visual source of truth

## Stage responsibilities

### research
Research the topic, produce ResearchResult and verify factual claims.

### script
Create the script from verified claims only. Run Script QA and repair automatically.

### storyboard
Convert the approved script into StoryboardSpec without narration drift. Until master-audio timing migration is complete, keep existing scene contracts valid.

### asset_plan
Build visual plan, AssetBible, lineage, transition plan and execution plan. Reuse approved canonical assets instead of redefining identities.

### canonical_prompt
Create the complete A0 multi-view reference prompt and PhotoCaptureSpec. Run Multi-View Prompt QA.

### canonical_generation
Generate A0 through the configured ImageProvider.

### canonical_qa
Run Multi-View Consistency QA. Repair/regenerate automatically for repairable failures.

### checkpoint_canonical
Automatic compatibility gate. Never stop the user. Advance immediately because canonical QA already passed.

### scene_prompts
Generate complete per-scene ImagePromptSpec/provider jobs from the canonical identity.

### storyboard_preview
Prepare representative keyframes/previews and validate them.

### checkpoint_storyboard
Automatic compatibility gate. Never stop the user.

### scene_generation
Generate scenes. Run independent work in parallel when dependencies allow.

### scene_qa
Check technical correctness, continuity, identity, camera and required content. Repair only failed scenes.

### voice
Generate narration through the configured VoiceProvider. Validate exact text and timing. Prefer Vietnamese VieNeu-compatible provider when available.

### motion
Route each scene by intent:
- realistic physical motion -> configured video provider (default Wan I2V through ComfyUI);
- technical diagram/programmatic scene -> Remotion/SVG;
- provider failure -> deterministic Remotion pan/zoom/highlight fallback over approved image.

### final_render
Assemble scenes, narration and subtitles.

### final_qa
Run final QA. Repair only affected downstream stages.

### checkpoint_final
Automatic compatibility gate. A passing final QA completes the run.

## Repair and fallback rules

- Maximum automatic attempts: 3 per stage.
- Repair the smallest affected scope.
- Keep approved parents and unrelated artifacts unchanged.
- Preserve immutable IDs during prompt repair.
- If a generative motion provider fails after retries, downgrade only that scene to deterministic motion.
- Do not downgrade factual or identity QA requirements.
- Provider unavailability is not success. Use another configured provider or deterministic fallback; otherwise surface the exact missing capability.

## Codex state protocol

Start:

    npm run autopilot -- --topic "<topic>"

Before machine work:

    npm run autopilot -- --slug <slug> --begin

After validation passes:

    npm run autopilot -- --slug <slug> --result pass

After validation fails:

    npm run autopilot -- --slug <slug> --result fail --note "<failure summary>"

Human intervention is only for an unavoidable provider/capability boundary or exhausted non-degradable failure.

Do not mark PASS until contract validation and the relevant QA have passed.
