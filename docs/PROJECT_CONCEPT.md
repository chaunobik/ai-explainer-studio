# Project Concept V1.0

## Product
**AI Explainer Studio** turns a topic into a short-form Vietnamese science/engineering explainer video through a controlled, QA-gated pipeline.

## Core principle
**Research → Verify → Explain → Visualize → Verify → Render**

The product is not intended to be a generic one-click AI video generator. Its differentiators are:

1. **Accuracy** — claims must be grounded and checked before they reach the script.
2. **Visual continuity** — scenes must feel like a continuous explanation of the same world and objects.
3. **Explainability** — animation and motion exist to clarify the mechanism, not just decorate the video.

## V1 scope
- Platform: TikTok + YouTube Shorts
- Aspect ratio: 9:16
- Target duration: 45–60 seconds
- Language: Vietnamese
- Typical scene count: 6–10
- Content: science, engineering, everyday mechanisms and phenomena
- Rendering: image-first, motion-later
- Motion: Remotion / SVG / code-driven animation
- Coding support: Codex for implementation/rendering tasks
- Voice: OpenAI/basic provider first
- QA: required after every stage

## Pipeline
1. Topic
2. Research
3. Research QA
4. Script
5. Script QA
6. Storyboard
7. Storyboard QA
8. Visual plan
9. Anchor/reference assets
10. Derived scenes
11. Visual + continuity QA
12. Motion spec
13. Code animation
14. Motion QA
15. Voice
16. Voice QA
17. Final composition
18. Final QA
19. Final MP4

## ChatGPT Web strategy for early development
During prompt development, ChatGPT Web may be used manually to reduce API cost and make prompt iteration easy.

The tool should exchange structured artifacts rather than free-form prose so the web/manual step can later be replaced by an API without redesigning the whole system.

Example progression:

```
research.json
→ claims.json
→ script.json
→ storyboard.json
→ asset-bible.json
→ scenes/
→ motion/
→ audio/
→ qa/
→ final.mp4
```

## Codex responsibility
Codex is an implementation/rendering worker, not the source of scientific truth.

Preferred responsibility:
```
MotionSpec + Assets
        ↓
      Codex
        ↓
Remotion / SVG / FFmpeg
        ↓
      MP4
```

Research, factual claims, explanatory structure and script approval belong upstream.

## Visual strategy
### Image-first, motion-later
Do not ask a video model to invent the complete video.

First establish correct key visuals, then animate:
- camera moves
- zoom/pan
- highlights
- labels
- arrows
- path animations
- cutaway reveals
- masks
- rotations
- flow indicators

### Visual routing
A scene may use:
- real photo / footage
- real reference + AI edit
- generated image
- technical diagram
- programmatic animation

Prefer real/reference-based material when it improves realism and trust.

## Visual continuity requirement
Scenes are not independent images.

For the same primary object, later scenes should normally be:
- continuations,
- crops/zooms,
- derived edits,
- overlays,
- cutaways,
- technical abstractions with a deliberate bridge.

Bad:
```
Scene 1: refrigerator A
Scene 2: refrigerator B
Scene 3: refrigerator C
```

Preferred:
```
Anchor refrigerator
  ↓
wide view
  ↓
zoom to rear
  ↓
cutaway
  ↓
heat-flow overlay
  ↓
mechanism animation
```

## QA principle
No stage automatically advances without QA.

```
GENERATE
   ↓
  QA
 /  \
PASS FAIL
 |     |
NEXT  DIAGNOSE
       ↓
     REPAIR
       ↓
      QA
```

Use three QA classes:
- deterministic QA
- semantic/AI QA
- cross-stage QA

Critical errors override average scores.

Examples of critical failures:
- unsupported scientific claim
- physical direction reversed
- missing required component
- scene contradicts narration
- broken continuity of primary entity

Default retry policy:
```
MAX_RETRY = 3
```

After that:
```
NEEDS_HUMAN_REVIEW
```

## Explicitly out of V1
- long-form 10-minute YouTube videos
- multilingual production
- ElevenLabs integration
- AI presenter/avatar
- automatic TikTok publishing
- automatic YouTube publishing
- analytics feedback loop
- full-scene generative video
- multi-user SaaS
- mobile app
- subscriptions/payments

## MVP success criteria
The first MVP should reliably process 10–20 different topics and create projects that contain:
- grounded research
- approved claims
- concise script
- coherent storyboard
- visual continuity plan
- renderable motion
- usable Vietnamese voice
- no critical QA failure
- final 9:16 MP4

Example target topic:
**“Tại sao tủ lạnh nóng phía sau?”**
