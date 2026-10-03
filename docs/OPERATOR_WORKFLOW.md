# V1 Operator Workflow

Use this flow when running a project manually.

## 1. Baseline self-check

```bash
npm install
npm run check
```

This runs type-checking, schema compilation, unit tests, canonical-example validation, project doctor, motion/voice checks, cross-stage dry run, and readiness reporting.

## 2. Inspect current state

```bash
npm run project:status
npm run project:doctor
```

- `project:status` tells you the next human action.
- `project:doctor` searches for contract, schema, manifest, parent/reference, and file-integrity errors.

## 3. Import a real image

Example for the user-supplied refrigerator reference A0:

```bash
npm run image:import -- --asset=A0 --file="D:/path/refrigerator.png"
```

The command:
- copies the image into the project;
- creates `image-assets.json` from the template if needed;
- sets the asset to `qa_pending`;
- calculates SHA-256;
- reads PNG/JPEG dimensions when supported;
- records provenance.

It never auto-approves an image.

## 4. Approve/reject after QA

```bash
npm run image:status -- --asset=A0 --status=approved --qa-id=MANUAL-REF-A0
```

For A1/A2/A5/A6, use the actual Visual QA result ID.

Approval is blocked when:
- the file does not exist;
- the declared parent does not exist;
- any parent is not approved;
- no QA/review ID is provided.

## 5. Recheck

```bash
npm run project:doctor
npm run project:status
```

Do this after every import/approval. The readiness report should unlock only the next valid action.

## Key safety rule

Do not edit `image-assets.json` manually unless debugging the tool. Use the CLI so checksum, file metadata, dependency gates, and status changes stay consistent.


## 6. Import voice clips

```bash
npm run voice:import -- --asset=V1 --file="D:/path/V1.mp3" --duration=4.8
```

- WAV duration can be measured automatically.
- MP3/M4A require `--duration=<seconds>`.
- Import sets the clip to `qa_pending` and records SHA-256.

Approve only after Voice QA:

```bash
npm run voice:status -- --asset=V1 --status=approved --qa-id=QA-VOICE-V1
```

The approval command re-runs deterministic voice checks and rejects clips with text/timing metadata problems.
