---
Type: pattern
Status: CURRENT
Scope: qa-verification
Owns-Paths:
Watch-Paths:
- evidence/binder.json
- evidence/logs/browser-dev-lifecycle.log
- role-model-router/apps/runtime-ui/e2e/
Source-Runs: 81-kw-activation-browser-recommendation-evidence, 79-extension-control-and-recommendations-qa
Validated-At-Commit:
Last-Validated: 2026-07-24T23:06:57.817520+00:00
Tags: training, reasoningbank, training-free-grpo
---

# Training Memory: qa-verification

Reasoning items extracted from recursive-mode runs for `qa-verification` tasks.


## Extracted Reasoning Items (2026-07-24T23:06:57.817520+00:00)

### RB-11: Browser lifecycle on rebuilt SEA

**Description:** Run 81 closed recommendation UX on a freshly rebuilt packaged SEA

**Content:** 1. Rebuild packaged public SEA before browser QA. 2. Capture Playwright download to preview to apply to dismiss evidence under the run binder. 3. Cite browser-dev-lifecycle logs and recommendation row receipts; keep hop ids in evidence not memory.

```yaml
rb_id: "RB-11"
title: "Browser lifecycle on rebuilt SEA"
description: "Run 81 closed recommendation UX on a freshly rebuilt packaged SEA"
task_type: "qa-verification"
subsystem: "role-model-router"
source_runs: ["81-kw-activation-browser-recommendation-evidence", "79-extension-control-and-recommendations-qa"]
applies_to: ["role-model-router/apps/runtime-ui/e2e/", "evidence/logs/browser-dev-lifecycle.log", "evidence/binder.json"]
success_rate: 1.00
status: active
created_at: "2026-07-24T23:06:57.817520+00:00"
```
