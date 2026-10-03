# Guided Local Dashboard

The normal V1 production workflow now has a browser UI. CLI commands remain available for debugging, but the dashboard is intended to be the primary operator surface.

## Start

```bash
git checkout main
git pull
npm install
npm run dev
```

Open:

```
http://localhost:3000
```

## Design rule

After every successful action, the dashboard reloads the project state and derives exactly one structured **Next Action**.

The operator should not need to remember the pipeline.

Each Next Action explains:
- what to do now;
- why it is required;
- required inputs;
- completion criteria;
- the primary control to use.

## Current guided actions

The dashboard currently supports:
- project selection;
- pipeline progress;
- Project Health / readiness checks;
- image upload/import;
- image preview;
- image approve/reject;
- detailed ImagePromptSpec display;
- copyable Prompt QA package;
- paste/save Prompt QA JSON from ChatGPT Web;
- copyable final image-generation prompt;
- import generated/edited image;
- voice narration display;
- voice upload/import;
- local audio preview;
- voice approve/reject;
- per-scene Remotion preview rendering directly from the UI;
- scene preview playback;
- copy/paste Motion QA workflow;
- guarded final render directly from the UI;
- final video playback;
- copy/paste Final Video QA workflow;
- COMPLETE state after Final QA passes.

All actions call local server/core logic directly. The UI does not execute `npm run ...` shell commands behind buttons.

## Sequential behavior

The guided engine intentionally works one dependency chain at a time.

Example:

```
A0 Multi-View Prompt QA
→ Generate A0 Reference Pack with ChatGPT Image
→ Multi-View Consistency QA
→ Prompt QA A1
→ Generate/import A1 from selected A0 view(s)
→ Visual QA A1
→ Prompt QA A2
→ Generate/import A2
...
```

A0 is AI-generated. A real product photo is not required.

It will not ask the operator to QA every future prompt at once.

## Manual ChatGPT boundary

ChatGPT Web remains a human-in-the-loop provider in V1.

For Prompt QA:
1. click **Copy Prompt QA Package**;
2. paste into ChatGPT;
3. copy the returned JSON;
4. paste it into the dashboard;
5. click **Lưu Prompt QA & tiếp tục**.

For A0 reference generation:
1. complete **A0 Multi-View Prompt QA**;
2. click **Copy A0 Generation Prompt**;
3. generate one eight-view reference board in ChatGPT Image without uploading a real product photo;
4. upload the generated board to the dashboard;
5. run **Multi-View Consistency QA**.

For later scene image generation:
1. click **Copy Image Prompt**;
2. use the approved A0 view(s) and A1/approved derivatives requested by the scene prompt;
3. generate/edit the image;
4. return to the dashboard and upload the result.

The dashboard then automatically advances to the next QA/action state.

## Developer fallback

These still exist for diagnostics:

```bash
npm run project:doctor
npm run project:status
npm run check
```

They use the same core readiness concepts as the UI.


## End-to-end guided sequence

For the canonical refrigerator project, the dashboard will guide the operator through a sequence similar to:

```
A0 Multi-View Prompt QA
→ Generate/import AI-created A0 reference board
→ Multi-View Consistency QA / approve A0
→ Prompt QA A1
→ Generate/import A1
→ Visual QA A1
→ Prompt QA A2
→ Generate/import A2
→ Visual QA A2
→ Prompt QA A5
→ Generate/import A5
→ Visual QA A5
→ Prompt QA A6
→ Generate/import A6
→ Visual QA A6
→ Import/review V1…V7
→ Render scene previews
→ Motion QA
→ Final Render
→ Final Video QA
→ COMPLETE
```

The exact next step is recalculated after every successful action. The operator does not need to manually run Project Doctor or Project Status during the normal UI workflow.
