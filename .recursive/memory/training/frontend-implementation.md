---
Type: training
Status: CURRENT
Scope: frontend-implementation
Owns-Paths:
Watch-Paths:
- POST /api/role-model/extensions/mutate
- role-model-router/apps/runtime-host-bridge/src/track-b-operations.ts
- role-model-router/apps/runtime-ui/app/routes/extensions.tsx
Source-Runs: 81-kw-activation-browser-recommendation-evidence, 79-extension-control-and-recommendations-qa
Validated-At-Commit:
Last-Validated: 2026-07-24T23:06:57.811122+00:00
Tags: training, reasoningbank, training-free-grpo
---

# Training Memory: frontend-implementation

Reasoning items extracted from recursive-mode runs for `frontend-implementation` tasks.


## Extracted Reasoning Items (2026-07-24T23:06:57.811122+00:00)

### RB-8: Set mode for extensions

**Description:** Extensions UI uses one Set mode control including disabled

**Content:** 1. Prefer public mutate set_mode (including mode disabled) as the sole enablement authority. 2. Do not invent a UI-only enablement store. 3. Treat intentional disable as neutral status, not ErrorState; clear stale operator_disabled health on re-enable.

```yaml
rb_id: "RB-8"
title: "Set mode for extensions"
description: "Extensions UI uses one Set mode control including disabled"
task_type: "frontend-implementation"
subsystem: "role-model-router"
source_runs: ["81-kw-activation-browser-recommendation-evidence", "79-extension-control-and-recommendations-qa"]
applies_to: ["role-model-router/apps/runtime-ui/app/routes/extensions.tsx", "role-model-router/apps/runtime-host-bridge/src/track-b-operations.ts", "POST /api/role-model/extensions/mutate"]
success_rate: 1.00
status: active
created_at: "2026-07-24T23:06:57.811122+00:00"
```

