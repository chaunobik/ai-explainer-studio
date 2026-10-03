# Research Workflow

## Goal
Turn a topic into a compact, verified factual whitelist before script writing begins.

```
ResearchRequest
   ↓
RESEARCH_PROMPT
   ↓
ResearchResult
   ↓
schema validation
   ↓
RESEARCH_QA_PROMPT
   ↓
Claim[] + QAResult
```

## Gate rule
Script generation is allowed only when:
- Research QA status is `pass`;
- the script consumes only claims where `status=approved`;
- those claims have `allowed_for_script=true`.

## Manual V1 workflow
1. Fill `ResearchRequest`.
2. Run `prompts/research/RESEARCH_PROMPT.md` in ChatGPT Web.
3. Save the JSON as the project's research artifact.
4. Validate it against `research-result.schema.json`.
5. Run `prompts/research-qa/RESEARCH_QA_PROMPT.md`.
6. Validate the result against `research-qa-output.schema.json`.
7. If QA fails, apply only the listed repair actions and re-run Research QA.
8. After 3 failed attempts, mark the project `needs_human_review`.

## Why Research and Research QA are separate
The first pass tries to understand the subject. The second pass is adversarial: it asks whether each fact is actually safe to use. This reduces the chance that an elegant script amplifies a weak or hallucinated premise.

## Source policy
Research should prefer authoritative primary/technical sources. A short explainer does not need dozens of links; it needs a small number of sources that actually support the mechanism being explained.

## Important implementation rule
Later API automation must preserve this exact boundary. It may automate the calls, but it should not collapse research and approval into one opaque generation step.
