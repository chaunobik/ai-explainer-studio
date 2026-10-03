# Storyboard Workflow

Approved ScriptSpec → StoryboardRequest → Storyboard Prompt → StoryboardSpec → schema validation → Storyboard QA → QAResult

## Gate
Visual planning begins only when Storyboard QA returns pass.

## Narration rule
Storyboard is a visual decomposition of the approved script, not another writing stage.

Every scene carries script_part_ids and its narration must be verbatim from those parts. This prevents factual drift after Script QA.

## V1 visual rule
The storyboard defines what must be seen, not final image prompts.

It establishes:
- visual goal
- visual type
- primary entities
- continuity relationship
- camera intent
- required objects
- intended transforms

Detailed AssetBible and image-generation instructions belong to Milestone 2 and 3.

## Continuity
Preferred sequence for the same object: anchor → continuation → derived → derived.

A context switch is acceptable only when the explanation genuinely moves into another representational space, for example a real refrigerator into a refrigeration-cycle cutaway.

## Repair loop
1. Keep passing scenes unchanged.
2. Repair only named scenes or timing.
3. Re-run Storyboard QA.
4. After three failed attempts, move to human review.