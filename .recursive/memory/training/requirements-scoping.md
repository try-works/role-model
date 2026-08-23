---
Type: pattern
Status: CURRENT
Scope: requirements-scoping
Owns-Paths:
Watch-Paths:
- 03-implementation-summary.md
- evidence/other/public-product-change-set.md
- role-model-router/
Source-Runs: 81-kw-activation-browser-recommendation-evidence, 79-extension-control-and-recommendations-qa
Validated-At-Commit:
Last-Validated: 2026-07-24T23:06:57.818661+00:00
Tags: training, reasoningbank, training-free-grpo
---

# Training Memory: requirements-scoping

Reasoning items extracted from recursive-mode runs for `requirements-scoping` tasks.


## Extracted Reasoning Items (2026-07-24T23:06:57.818661+00:00)

### RB-12: Absolute public RCS paths

**Description:** Dual-repo Changed Files need absolute public worktree paths

**Content:** 1. When private and public worktrees pair, record absolute public paths in Requirement Completion Status Changed Files. 2. Relative private-only paths fail dual-repo RCS checks. 3. Prefer public-product-change-set inventory plus host-bridge/runtime-ui absolute refs.

```yaml
rb_id: "RB-12"
title: "Absolute public RCS paths"
description: "Dual-repo Changed Files need absolute public worktree paths"
task_type: "requirements-scoping"
subsystem: "role-model-router"
source_runs: ["81-kw-activation-browser-recommendation-evidence", "79-extension-control-and-recommendations-qa"]
applies_to: ["03-implementation-summary.md", "evidence/other/public-product-change-set.md", "role-model-router/"]
success_rate: 1.00
status: active
created_at: "2026-07-24T23:06:57.818661+00:00"
```
