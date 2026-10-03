# Milestone 1 — Content Contracts

This document defines the structured contracts between the Content Intelligence stages.

## Design rule
The pipeline is **incremental**. A project starts with topic metadata and progressively gains research, claims, script and storyboard artifacts.

Each stage must:
1. read only the approved upstream artifacts it needs,
2. write a schema-valid artifact,
3. preserve source/claim traceability,
4. stop on critical QA failure,
5. never silently introduce unsupported factual claims.

## Contract flow

```
Topic
  ↓
ResearchResult
  ↓
Claim[]
  ↓
ScriptSpec
  ↓
StoryboardSpec
  ↓
SceneSpec[]
```

## ResearchResult
Purpose: capture source-backed understanding before writing.

Required:
- research questions
- sources
- findings mapped to sources
- unresolved uncertainties

A research finding is not automatically an approved script claim.

## Claim
Purpose: create the factual whitelist for the script.

Only claims with:
```
status = approved
allowed_for_script = true
```
may be used by Script Writer.

Every claim keeps source IDs and confidence.

Critical claims require stronger review than low-impact contextual claims.

## ScriptSpec
Purpose: produce spoken Vietnamese, not essay prose.

Every factual statement in the hook, body segments, and payoff maps back to approved claim IDs.

Script QA must check:
- factual consistency
- unsupported additions
- estimated duration
- spoken naturalness
- visualizability
- unnecessary repetition

## StoryboardSpec
Purpose: translate an approved spoken script into feasible scenes.

Each scene must declare:
- source script part IDs
- verbatim narration
- visual goal
- visual type
- relationship to prior/anchor scene
- required objects
- intended visual transforms

Storyboard QA must verify:
- narration ↔ visual match
- total duration
- scene feasibility
- information density
- continuity intent

## Validation invariants
The application should enforce these rules in addition to JSON Schema:

1. Every `Claim.source_ids[]` must exist in `ResearchResult.sources[]`.
2. Every script `claim_id` must exist and be approved.
3. No rejected or pending claim may appear in script.
4. Every storyboard narration must be verbatim from its referenced approved script parts.
5. Sum of scene durations should be close to target duration.
6. Scene IDs must be unique.
7. A `derived` or `continuation` scene should name a valid parent or anchor.
8. A `context_switch` should explain why the switch is needed.
9. Critical QA failure blocks advancement.
10. Retry count reaching the configured limit moves the artifact to human review.

## Manual ChatGPT Web workflow
During early development:

```
structured input JSON
   ↓
ChatGPT Web prompt
   ↓
structured output JSON
   ↓
schema validation
   ↓
QA prompt
   ↓
approved/repaired artifact
```

This manual boundary is temporary. Because all stage boundaries are structured, it can later be replaced by API execution without changing downstream contracts.
