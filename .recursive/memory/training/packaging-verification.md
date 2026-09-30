---
Type: pattern
Status: CURRENT
Scope: packaging-verification
Owns-Paths:
Watch-Paths:
- ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT
- pnpm runtime:package-sea
- role-model-router/apps/runtime-host-bridge/
Source-Runs: 81-kw-activation-browser-recommendation-evidence, 79-extension-control-and-recommendations-qa
Validated-At-Commit:
Last-Validated: 2026-07-24T23:06:57.816152+00:00
Tags: training, reasoningbank, training-free-grpo
---

# Training Memory: packaging-verification

Reasoning items extracted from recursive-mode runs for `packaging-verification` tasks.


## Extracted Reasoning Items (2026-07-24T23:06:57.816152+00:00)

### RB-9: Package SEA with Track B root

**Description:** Packaged runtime needs ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT for ExtensionHost

**Content:** 1. Set ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT to private dist/run00-dev (or equivalent) before pnpm runtime:package-sea. The pair has two halves since run 103: first rebuild the private distribution against this public worktree with `ROLE_MODEL_PUBLIC_WORKTREE=<public worktree>` in `role-model-internal/scripts/track-b/build-runtime-distribution.mjs`, then package the public SEA with `ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT=<private dist/run00-dev>`. Doing only the second half pairs a fresh SEA with a stale private distribution whose manifest `publicSourceTree` no longer matches. 2. Without it ExtensionHost will not register the thirteen packages. 3. Keep core /api/role-model readiness independent of full extension registration.

```yaml
rb_id: "RB-9"
title: "Package SEA with Track B root"
description: "Packaged runtime needs ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT for ExtensionHost"
task_type: "packaging-verification"
subsystem: "role-model-router"
source_runs: ["81-kw-activation-browser-recommendation-evidence", "79-extension-control-and-recommendations-qa"]
applies_to: ["ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT", "pnpm runtime:package-sea", "role-model-router/apps/runtime-host-bridge/"]
success_rate: 1.00
status: active
created_at: "2026-07-24T23:06:57.816152+00:00"
```
