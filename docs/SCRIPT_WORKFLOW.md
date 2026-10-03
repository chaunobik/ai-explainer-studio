# Script Workflow

```
Approved Claim[]
      ↓
ScriptRequest
      ↓
SCRIPT_PROMPT
      ↓
ScriptSpec
      ↓
schema validation
      ↓
SCRIPT_QA_PROMPT
      ↓
Script QAResult
```

## Gate
Storyboard generation is allowed only when Script QA returns `pass`.

## Core invariant
**No factual sentence may enter the script unless it is traceable to an approved claim.**

This applies to:
- hook
- body segments
- payoff

The hook/payoff are structured objects specifically so they cannot become untraceable factual loopholes.

## Repair loop
On failure:
1. keep all passing parts unchanged;
2. repair only parts named in `repair_actions`;
3. run Script QA again;
4. after 3 failed attempts, move to `needs_human_review`.

## Style target
Default channel voice:
- curious
- technically grounded
- easy to follow
- spoken Vietnamese rather than formal essay prose
- engaging without sensationalism

## Duration
The duration estimate is a planning value, not a guarantee. Final voice timing will be checked again during Voice QA.
