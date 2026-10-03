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
- voice approve/reject.

All actions call local server/core logic directly. The UI does not execute `npm run ...` shell commands behind buttons.

## Sequential behavior

The guided engine intentionally works one dependency chain at a time.

Example:

```
Import A0
→ Review A0
→ Prompt QA A1
→ Generate/import A1
→ Visual QA A1
→ Prompt QA A2
→ Generate/import A2
...
```

It will not ask the operator to QA every future prompt at once.

## Manual ChatGPT boundary

ChatGPT Web remains a human-in-the-loop provider in V1.

For Prompt QA:
1. click **Copy Prompt QA Package**;
2. paste into ChatGPT;
3. copy the returned JSON;
4. paste it into the dashboard;
5. click **Lưu Prompt QA & tiếp tục**.

For image generation:
1. click **Copy Image Prompt**;
2. use the approved reference image(s) in ChatGPT Image;
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
