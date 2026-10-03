# Manual ChatGPT Web Pipeline — Milestone 1

Milestone 1 intentionally supports a manual ChatGPT Web execution boundary so the prompt architecture can be proven before API automation.

## End-to-end flow

1. Create ResearchRequest JSON.
2. Run prompts/research/RESEARCH_PROMPT.md in ChatGPT Web.
3. Save the returned ResearchResult JSON.
4. Validate it against schemas/research-result.schema.json.
5. Run prompts/research-qa/RESEARCH_QA_PROMPT.md.
6. Save claims + research QA output.
7. Continue only when Research QA status is pass.
8. Build ScriptRequest using approved claims only.
9. Run prompts/script/SCRIPT_PROMPT.md.
10. Validate ScriptSpec.
11. Run prompts/script-qa/SCRIPT_QA_PROMPT.md.
12. Continue only when Script QA status is pass.
13. Build StoryboardRequest from the approved ScriptSpec.
14. Run prompts/storyboard/STORYBOARD_PROMPT.md.
15. Validate StoryboardSpec.
16. Run prompts/storyboard-qa/STORYBOARD_QA_PROMPT.md.
17. Continue to Milestone 2 only when Storyboard QA status is pass.

## Repair policy

For every stage:
- preserve passing artifacts;
- repair only the failing artifact or local section;
- re-run the corresponding QA;
- maximum retry count is 3;
- then move the project to needs_human_review.

## Artifact folder suggestion

project/
  research-request.json
  research-result.json
  research-qa-output.json
  script-request.json
  script-spec.json
  script-qa-output.json
  storyboard-request.json
  storyboard-spec.json
  storyboard-qa-output.json

## Important boundary

ChatGPT Web is currently a replaceable execution surface, not part of the domain model. Later automation can swap it for API calls while preserving the same JSON contracts.