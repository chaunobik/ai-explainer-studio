# Codex / ChatGPT Autonomous Workflow

AI Explainer Studio now has a Codex-native execution mode in addition to the guided browser dashboard.

## User experience

For normal operation, the user should only need to provide a topic, for example:

> Tạo video giải thích: Tại sao tủ lạnh nóng phía sau?

Codex starts the autonomous run, generates and validates artifacts, repairs machine-detectable failures automatically, and only interrupts at meaningful review points.

## Checkpoints

There are three planned checkpoints:

1. **Canonical asset (A0)** — approve/edit/regenerate the visual source of truth.
2. **Storyboard + keyframes** — approve the creative plan before full scene generation.
3. **Final output** — approve/export or request a targeted revision.

A QA failure is not automatically a checkpoint. The orchestrator retries up to three times before escalating.

## VS Code with Codex

Open this repository and give Codex the topic directly. Root `AGENTS.md` instructs Codex to initialize and maintain the run state.

The underlying state helper is:

    npm run autopilot -- --topic "Tại sao tủ lạnh nóng phía sau?"

Resume later with:

    npm run autopilot -- --slug tai-sao-tu-lanh-nong-phia-sau

The command prints the current stage and next directive. Codex should continue until it reaches a checkpoint.

## ChatGPT / Codex app

Use the same repository and give the same topic. When the environment exposes image/audio/video generation tools, the agent should invoke them directly. The state file keeps the run resumable across interruptions.

## State storage

Runtime state is saved to:

    .ai-explainer/runs/<slug>/state.json

This directory is gitignored because it is execution state, not source code.

## Automatic repair

The state engine supports:

    FAIL
      -> auto_repair
      -> retry
      -> PASS

After the configured maximum attempts (default 3), the stage becomes `needs_human_review`.

## Editing at checkpoints

User edits do not restart the project. The checkpoint revision command reopens only an affected branch.

Examples:

    npm run autopilot -- --slug demo --revise canonical_prompt --note "Make the handle smaller"

    npm run autopilot -- --slug demo --revise voice --note "Shorten narration in scene 5"

The core state engine preserves earlier passing stages and invalidates only the configured affected work.

## Relationship to the existing dashboard

The browser dashboard remains available for manual/guided operation. Autopilot is an additional execution surface, not a destructive migration.

Over time the dashboard can consume the same autonomous state so it becomes a supervision UI instead of a sequence of copy/paste forms.

## Tool limitations

Full hands-off media generation requires the current Codex/ChatGPT environment to expose the relevant media tools or a configured provider API. If a required provider is unavailable, the agent must surface that exact boundary instead of pretending an asset was generated.
