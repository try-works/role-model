---
Type: training
Status: CURRENT
Scope: extension-policy
Owns-Paths:
Watch-Paths:
- extensions/knowledge-worker/index.mjs
- role-model-router/apps/runtime-ui/app/routes/extensions.tsx
- tests/track-b/tb10.test.mjs
Source-Runs: 81-kw-activation-browser-recommendation-evidence, 79-extension-control-and-recommendations-qa
Validated-At-Commit:
Last-Validated: 2026-07-24T23:06:57.816892+00:00
Tags: training, reasoningbank, training-free-grpo
---

# Training Memory: extension-policy

Reasoning items extracted from recursive-mode runs for `extension-policy` tasks.


## Extracted Reasoning Items (2026-07-24T23:06:57.816892+00:00)

### RB-10: KW unlock is gated

**Description:** Knowledge Worker activation stays policy-gated and distinct from Set mode

**Content:** 1. Keep static/class productionActivation false. 2. Unlock instance activation only under policy v1 + attestation activate-production + verified knowledge_validation claims + shadow candidate. 3. Do not equate Set mode or recommendation apply with KW activation.

```yaml
rb_id: "RB-10"
title: "KW unlock is gated"
description: "Knowledge Worker activation stays policy-gated and distinct from Set mode"
task_type: "extension-policy"
subsystem: "role-model-router"
source_runs: ["81-kw-activation-browser-recommendation-evidence", "79-extension-control-and-recommendations-qa"]
applies_to: ["extensions/knowledge-worker/index.mjs", "tests/track-b/tb10.test.mjs", "role-model-router/apps/runtime-ui/app/routes/extensions.tsx"]
success_rate: 1.00
status: active
created_at: "2026-07-24T23:06:57.816892+00:00"
```

