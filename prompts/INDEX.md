# Prompt Index

## Research
- research/RESEARCH_PROMPT.md — source-aware topic research
- research-qa/RESEARCH_QA_PROMPT.md — adversarial verification + approved claim whitelist

## Script
- script/SCRIPT_PROMPT.md — grounded spoken Vietnamese script
- script-qa/SCRIPT_QA_PROMPT.md — factual, duration, language and visualizability QA

## Storyboard
- storyboard/STORYBOARD_PROMPT.md — verbatim script-to-scene decomposition
- storyboard-qa/STORYBOARD_QA_PROMPT.md — timing, coverage, visual fit, feasibility and continuity-intent QA

## Image Prompting
- image-prompt/IMAGE_PROMPT_SPEC_PROMPT.md — compile one precise per-asset visual instruction package
- image-prompt-qa/IMAGE_PROMPT_QA_PROMPT.md — reject ambiguous or technically unsafe image prompts before generation

## Visual Intelligence
- visual/VISUAL_PLAN_PROMPT.md — AssetBible, routing, lineage and transition planning
- continuity-qa/CONTINUITY_QA_PROMPT.md — identity, routing and transition continuity QA

## Contract rule
All prompt inputs and outputs are structured. A prompt is not allowed to bypass its upstream QA gate.