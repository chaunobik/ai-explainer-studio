# V1 Code-Ready Full Rerun Checklist

This is the single end-to-end rerun checklist after the V1 codebase has passed automated hardening.

## Phase 0 — Baseline

```bash
git pull
npm install
npm run check
npm run project:doctor
npm run project:status
```

Expected:
- full self-check passes;
- renderer smoke passes in CI;
- project status stops only at intentional human/manual asset gates.

## Phase 1 — Generate the canonical A0 multi-view reference pack

No real product photo is required.

The dashboard first asks for **A0 Multi-View Prompt QA**. The canonical A0 prompt includes:
- one locked product identity;
- eight required views;
- smartphone capture metadata;
- environment/lighting rules;
- cross-view geometry constraints;
- realism and negative constraints.

After Prompt QA passes:
1. copy the A0 generation prompt from the dashboard;
2. generate the board in ChatGPT Image;
3. upload the generated A0 board back to the dashboard;
4. run Multi-View Consistency QA;
5. A0 is approved only when Multi-View QA passes.

Expected dependency state after A0 approval:

```
A0 multi-view reference pack  APPROVED
A1                           READY FOR PROMPT QA
A2/A5/A6                     BLOCKED UNTIL A1
```

## Phase 2 — Image Prompt QA and A1 from A0

Use:
- approved A0 multi-view reference pack;
- `image-prompt-a1.json`;
- `prompts/image-prompt-qa/IMAGE_PROMPT_QA_PROMPT.md`;
- `anchor-provider-job.json`.

A1 uses the selected rear-oriented A0 view(s) as geometry references.

Do not generate A1 until Prompt QA passes.

After generating A1:

```bash
npm run image:import -- --asset=A1 --file="<path-to-A1>"
```

Run real Visual QA against A0 + A1. If PASS:

```bash
npm run image:status -- --asset=A1 --status=approved --qa-id="<actual-A1-visual-qa-id>"
```

Then run doctor/status again.

## Phase 3 — Derived images A2, A5, A6

For each asset independently:

1. run Prompt QA for its `image-prompt-*.json`;
2. generate/edit strictly from approved A1;
3. import through `image:import`;
4. run Visual QA;
5. approve with the actual QA ID;
6. rerun doctor/status.

Assets:
- A2: cutaway/heat transfer
- A5: rear-vs-side heat-rejection design comparison
- A6: realistic warm-surface return shot

A failure repairs only that asset. Do not regenerate A1 or passing siblings.

## Phase 4 — Voice

Generate/import V1–V7 without changing approved narration.

Example:

```bash
npm run voice:import -- --asset=V1 --file="<path-to-V1.mp3>" --duration=<seconds>
npm run voice:status -- --asset=V1 --status=approved --qa-id="<actual-voice-qa-id>"
```

Repeat scene-by-scene. Then:

```bash
npm run project:doctor
npm run project:status
```

## Phase 5 — Motion preview and Motion QA

Programmatic assets A3/A4/A7 are produced by the Remotion/SVG renderer, not by image generation.

Render individual scene previews as needed:

```bash
npm run render:scene -- --scene=S1
```

Run Motion QA and save the actual `motion-qa-output.json` with PASS status before final render.

## Phase 6 — Final render

Final render is deliberately blocked unless all critical gates pass:

- Research QA PASS
- Script QA PASS
- Storyboard QA PASS
- Continuity QA PASS
- Image Prompt QA PASS
- required image assets approved, present and checksum-valid
- voice assets approved, present and checksum-valid
- Motion QA PASS

Then:

```bash
npm run render:project
```

## Phase 7 — Final Video QA

The MP4 is not publishable merely because rendering succeeds.

Run Final Video QA and save `final-qa-output.json`.

- PASS → project complete
- FAIL → apply only listed repair actions, re-render affected parts, rerun Final QA
- NEEDS_HUMAN_REVIEW → stop automatic progression

Finally:

```bash
npm run project:doctor
npm run project:status
```

Expected final state: `COMPLETE`.

## Failure rule

At any point:

```bash
npm run project:doctor
npm run project:status
```

before manually editing JSON. The CLI is the source of operational truth for the V1 rerun.
