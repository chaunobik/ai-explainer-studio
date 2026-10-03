# M3 Prompt-First Multi-View Image Run

The canonical visual workflow no longer starts from a real product photograph.

## Visual source of truth

```
Detailed A0 Multi-View Prompt
→ A0 Prompt QA
→ Generate A0 with ChatGPT Image
→ Import generated A0 board
→ Multi-View Consistency QA
→ APPROVED A0
→ scene prompt QA
→ A1 / A2 / A5 / A6 generation
```

A0 is an AI-generated canonical multi-view reference board. It locks the product's external identity and geometry across front, 45-degree, side, and rear views.

## Normal operator path

Use the guided dashboard:

```bash
npm run dev
```

Open `http://localhost:3000` and follow **Next Action**. The dashboard recalculates readiness after every successful action.

## A0 capture profile

The refrigerator canonical example uses a realistic smartphone-documentation profile:

- modern flagship-class smartphone main camera;
- 26 mm full-frame-equivalent lens;
- f/1.8;
- 1/125 s;
- ISO 80;
- white balance 5000 K;
- camera height 1.35 m;
- subject distance 2.4 m;
- natural restrained computational photography;
- no studio flash, no CGI/showroom styling.

## A0 required views

The canonical board contains:

1. front;
2. front-left 45°;
3. front-right 45°;
4. left;
5. right;
6. rear-left 45°;
7. rear-right 45°;
8. rear.

Every panel must depict the exact same physical product.

## Multi-View QA gate

A0 cannot unlock scene generation until Multi-View QA passes:

- same object identity;
- coherent width/height/depth;
- identical door/handle/divider geometry;
- material/color consistency;
- complete required-view coverage;
- plausible smartphone perspective;
- photographic realism;
- no invented hidden refrigeration internals.

## Scene generation

After A0 approval:

- A1 uses rear-oriented A0 views to build the first vertical scene;
- A2 uses A0 geometry + A1 scene continuity;
- A5 uses A0 side/rear views + A1 continuity;
- A6 uses A0 geometry + A1 continuity;
- A3/A4/A7 remain deterministic renderer assets.

Every physical scene prompt also carries a concrete PhotoCaptureSpec so realism does not disappear after A0.

## Repair rule

If one image fails QA, repair only that image. Do not replace an approved A0 unless Multi-View QA itself proves A0 is inconsistent.
