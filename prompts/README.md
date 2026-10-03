# Prompt Pipeline

V1 uses structured prompt stages. During early development these prompts may be run manually in ChatGPT Web to leverage an existing Plus subscription and make prompt iteration easy.

Planned prompt groups:

```
prompts/
  research/
  research-qa/
  script/
  script-qa/
  storyboard/
  storyboard-qa/
  visual/
  continuity-qa/
```

Every prompt must:
1. receive structured context,
2. return structured data,
3. avoid silently adding unsupported factual claims,
4. make failures explicit,
5. be replaceable later by API execution without changing downstream schemas.
