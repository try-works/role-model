---
Type: pattern
Status: CURRENT
Scope: phase-authoring
Owns-Paths:
Watch-Paths:
- .recursive/run/
- 03-implementation-summary.md
- 03.5-code-review.md
- recursive-mode
Source-Runs: 79-extension-control-and-recommendations-qa, 80-signed-recommendation-cloud-lifecycle
Validated-At-Commit:
Last-Validated: 2026-07-24T22:29:02.101074+00:00
Tags: training, reasoningbank, training-free-grpo
---

# Training Memory: phase-authoring

Reasoning items extracted from recursive-mode runs for `phase-authoring` tasks.


## Extracted Reasoning Items (2026-07-24T22:29:02.101074+00:00)

### RB-6: Serial phase authoring

**Description:** Write each phase doc only after that phase's real evidence exists

**Content:** 1. Do not batch-author Phases 3–8. 2. If a subagent recreates anticipatory PASS docs, delete/reopen and controller-author from disk evidence. 3. Lock each phase before advancing; Phases 6–8 own DECISIONS/STATE/memory updates.

```yaml
rb_id: "RB-6"
title: "Serial phase authoring"
description: "Write each phase doc only after that phase's real evidence exists"
task_type: "phase-authoring"
subsystem: ".recursive"
source_runs: ["79-extension-control-and-recommendations-qa", "80-signed-recommendation-cloud-lifecycle"]
applies_to: [".recursive/run/", "recursive-mode", "03-implementation-summary.md", "03.5-code-review.md"]
success_rate: 0.50
status: active
created_at: "2026-07-24T22:29:02.101074+00:00"
```
