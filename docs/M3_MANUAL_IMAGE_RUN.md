# Milestone 3 Manual Image Run — Canonical Fridge Example

Milestone 3 is now ready to execute at the manual ChatGPT Image boundary.

## Step 1 — Generate A1

Open `examples/fridge-hot-behind/anchor-provider-job.json`.
Use its prompt package in ChatGPT Image.
Save/import the resulting 1080×1920 image as the project A1 candidate.

Do not generate A2, A5, or A6 yet.

## Step 2 — Visual QA A1

Create/update an ImageAsset manifest for A1 with status `qa_pending`.
Upload A1 together with the VisualQARequest context to ChatGPT and run `prompts/visual-qa/VISUAL_QA_PROMPT.md`.

If QA passes:
- set A1 status to `approved`
- derived image jobs are unlocked

If QA fails:
- keep AssetBible unchanged
- append only the returned repair actions
- regenerate A1 at the next attempt
- maximum total attempts: 3

## Step 3 — Generate derived image scenes

After A1 is approved:
- S2/A2: use `derived-s2-provider-job.json`
- S5/A5: use `derived-s5-provider-job.template.json`
- S6/A6: use `derived-s6-provider-job.template.json`

Each output must independently pass Visual QA before it can be used downstream.

## Step 4 — Do not use GPT Image for programmatic scenes

A3, A4 and A7 are intentionally routed to the renderer:
- A3: technical diagram
- A4: animated heat rejection overlay
- A7: final animated heat-path summary

These belong to Milestone 4 (Remotion/SVG), which is more deterministic and easier to QA.

## Why Milestone 3 is not marked complete yet

The contracts, provider, anchor workflow, derived workflow, QA and retry loop are implemented. Completion now requires actual imported image files and real Visual QA results for A1/A2/A5/A6.

This is an intentional human-in-the-loop boundary for V1, not missing automation.