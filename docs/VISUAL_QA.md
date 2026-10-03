# Visual QA and Repair Loop

Every imported/generated image enters qa_pending before it can be used as an approved reference or passed to rendering.

## State flow

qa_pending → approved
qa_pending → rejected → local retry
qa_pending → needs_human_review

## Retry policy

DEFAULT_MAX_VISUAL_ATTEMPTS = 3.

Attempt numbers start at 0. A failed attempt creates a local retry using the original approved parent/reference assets plus explicit repair actions.

If the next attempt would reach the maximum attempt count, the asset moves to needs_human_review instead of looping indefinitely.

## Critical failures

Critical failures override average quality scores. Examples include:
- wrong physical direction
- changed primary entity identity
- contradictory mechanism
- wrong/missing required component

## Local repair

withVisualRepair() appends only the QA repair actions to the existing generation spec and increments the attempt. Passing siblings and the approved anchor remain unchanged.