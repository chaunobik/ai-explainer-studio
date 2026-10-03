# V1 Pipeline Engine

The codebase now has a deterministic execution backbone in addition to prompt documentation.

## Commands

```bash
npm install
npm run check
npm run dry-run
```

`npm run check` performs:

1. TypeScript type-check
2. compile every JSON Schema
3. unit tests
4. validate canonical example JSON against schemas
5. run cross-stage dry-run invariants

## Cross-stage checks

The validator catches issues that JSON Schema alone cannot catch:

- unknown source IDs
- non-approved claims leaking into scripts
- script claim-set drift
- storyboard narration drift
- missing/duplicated script coverage
- scene-duration total mismatch
- missing visual route/lineage records
- broken transition coverage
- invalid lineage parent order
- unknown visual assets
- execution dependency cycles
- missing per-image ImagePromptSpec
- provider job prompt drift
- provider/reference drift
- derived image assets using unapproved parents

## Pipeline state machine

The state engine uses dependency gates rather than a single linear step counter.

Examples:
- Storyboard requires Script PASS.
- VisualPlan requires Storyboard PASS.
- Voice can begin after Script PASS while visual work continues.
- Final requires both Motion PASS and Voice PASS.
- A stage moves to human review after the configured retry limit.

## Manual boundary

`npm run dry-run` intentionally stops at the first real image action:

```
A0 approved product reference
→ A1 READY
→ A2/A5/A6 BLOCKED until A1 is approved
```

This is the expected V1 human-in-the-loop behavior.
