# Voice, Subtitles & Final Production

## Voice strategy
V1 keeps voice behind a provider interface.

Current implementation:
- `ManualVoiceProvider`: creates one exact-text job per scene.
- user generates/records the clip using the chosen TTS source;
- clip is imported as `VoiceAsset`;
- deterministic QA checks exact text metadata and duration;
- semantic Voice QA checks the actual audio.

No voice provider may rewrite the approved script.

## Voice timing
Each scene owns one voice asset. This makes timing and repair local:
```
S3 fails pronunciation
→ regenerate V3 only
→ Voice QA V3
→ no change to V1/V2/V4...
```

## Subtitles
Subtitle cues are generated deterministically from the exact approved narration and actual imported clip duration. V1 uses compact word chunks and scene-local timing.

## Final render
After image and voice assets are approved:

```bash
npm run render:project
```

Default canonical locations:
- images: `examples/fridge-hot-behind/assets/A1.png`, `A2.png`, `A5.png`, `A6.png`
- voice manifest: copy `voice-assets.template.json` → `voice-assets.json`
- audio URI in manifest: e.g. `voice/V1.mp3`

The render command performs MotionSpec and Voice preflight before Remotion starts.

## Final QA
Rendering does not imply approval. The produced MP4 must pass Final Video QA before the project is marked complete.
