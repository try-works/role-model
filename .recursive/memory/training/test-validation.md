---
Type: pattern
Status: CURRENT
Scope: test-validation
Owns-Paths:
Watch-Paths:
- .recursive/run/
- 04-test-summary.md
- 05-manual-qa.md
- node:test
Source-Runs: 79-extension-control-and-recommendations-qa, 80-signed-recommendation-cloud-lifecycle
Validated-At-Commit:
Last-Validated: 2026-07-24T22:29:02.099830+00:00
Tags: training, reasoningbank, training-free-grpo
---

# Training Memory: test-validation

Reasoning items extracted from recursive-mode runs for `test-validation` tasks.


## Extracted Reasoning Items (2026-07-24T22:29:02.099830+00:00)

### RB-4: Full test pass required

**Description:** Complete-winner closeout needs every recorded test passing

**Content:** 1. Treat Audit/Coverage/Approval PASS as insufficient when tests_passed < tests_total. 2. Run 80 closed at 56/57 and was classified non-winner versus run 79 at 63/63. 3. Before locking Phase 4/5, re-run the recorded suite until counts match and cite green logs.

```yaml
rb_id: "RB-4"
title: "Full test pass required"
description: "Complete-winner closeout needs every recorded test passing"
task_type: "test-validation"
subsystem: ".recursive"
source_runs: ["79-extension-control-and-recommendations-qa", "80-signed-recommendation-cloud-lifecycle"]
applies_to: ["04-test-summary.md", "05-manual-qa.md", "node:test", ".recursive/run/"]
success_rate: 0.50
status: active
created_at: "2026-07-24T22:29:02.099830+00:00"
```
