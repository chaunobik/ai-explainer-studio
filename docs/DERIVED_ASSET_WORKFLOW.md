# Derived Scene Asset Workflow

Derived assets must preserve visual identity from approved references. They are edits/derivations, not independent generations.

## Flow

Approved anchor/parent asset
→ DerivedGenerationInput
→ assertApprovedReferences()
→ buildDerivedGenerationSpec()
→ ImageProvider.deriveScene()
→ manual/API generation
→ import/result registration
→ Visual QA
→ approved derived asset

## Hard gate

Every reference asset must have status approved. A planned, awaiting_import, qa_pending, rejected, or needs_human_review asset cannot be used as a parent.

## Prompt rule

The deterministic derived prompt explicitly says:
- use supplied approved reference assets
- do not redesign or independently regenerate the primary entity
- apply only requested transforms
- preserve listed identity features
- inherit all unspecified details from the reference

## Local repair

If one derived scene fails QA, repair only that scene from its approved parent assets. Do not replace the canonical anchor or regenerate passing siblings.