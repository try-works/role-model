---
Type: domain
Status: CURRENT
Scope: .recursive
Owns-Paths: .recursive/run/79-extension-control-and-recommendations-qa/00-requirements.md, .recursive/run/79-extension-control-and-recommendations-qa/00-worktree.md, .recursive/run/79-extension-control-and-recommendations-qa/01-as-is.md, .recursive/run/79-extension-control-and-recommendations-qa/02-to-be-plan.md, .recursive/run/79-extension-control-and-recommendations-qa/03-implementation-summary.md, .recursive/run/79-extension-control-and-recommendations-qa/evidence/logs/green-sp1-mutate-dismiss.log, .recursive/run/79-extension-control-and-recommendations-qa/evidence/logs/green-sp1-regression.log, .recursive/run/79-extension-control-and-recommendations-qa/evidence/logs/green-sp2-ui-helpers.log, .recursive/run/79-extension-control-and-recommendations-qa/evidence/logs/green/sp1-mutate-dismiss.log, .recursive/run/79-extension-control-and-recommendations-qa/evidence/logs/green/sp1-regression.log
Watch-Paths:
Source-Runs: 79-extension-control-and-recommendations-qa, 80-signed-recommendation-cloud-lifecycle
Validated-At-Commit:
Last-Validated: 2026-07-24T22:29:02.098944+00:00
Tags: reasoningbank, training-free-grpo
---

# .recursive

Domain memory for `.recursive`.


## ReasoningBank Items (2026-07-24T22:29:02.098944+00:00)

### RB-0: Full test pass required

**Description:** Complete-winner closeout needs every recorded test passing

**Content:** 1. Treat Audit/Coverage/Approval PASS as insufficient when tests_passed < tests_total. 2. Run 80 closed at 56/57 and was classified non-winner versus run 79 at 63/63. 3. Before locking Phase 4/5, re-run the recorded suite until counts match and cite green logs.

```yaml
rb_id: "RB-0"
title: "Full test pass required"
description: "Complete-winner closeout needs every recorded test passing"
task_type: "test-validation"
subsystem: ".recursive"
source_runs: ["79-extension-control-and-recommendations-qa", "80-signed-recommendation-cloud-lifecycle"]
applies_to: ["04-test-summary.md", "05-manual-qa.md", "node:test", ".recursive/run/"]
success_rate: 0.50
status: active
created_at: "2026-07-24T22:29:02.098944+00:00"
```

### RB-1: Absorb post-lock addenda

**Description:** Operator-verify remediations reopen Phases 6-8 with addenda as inputs

**Content:** 1. When post-lock verify finds packaging/UX gaps, record locked addenda. 2. Use recursive-lock --reopen then re-lock 6→7→8 with addenda listed as Effective Inputs. 3. Promote durable packaging/bootstrap notes into domains/; keep transient paths in evidence.

```yaml
rb_id: "RB-1"
title: "Absorb post-lock addenda"
description: "Operator-verify remediations reopen Phases 6-8 with addenda as inputs"
task_type: "closeout-workflow"
subsystem: ".recursive"
source_runs: ["79-extension-control-and-recommendations-qa", "80-signed-recommendation-cloud-lifecycle"]
applies_to: ["addenda/", "06-decisions-update.md", "07-state-update.md", "08-memory-impact.md", "recursive-lock"]
success_rate: 0.50
status: active
created_at: "2026-07-24T22:29:02.098944+00:00"
```

### RB-2: Serial phase authoring

**Description:** Write each phase doc only after that phase's real evidence exists

**Content:** 1. Do not batch-author Phases 3–8. 2. If a subagent recreates anticipatory PASS docs, delete/reopen and controller-author from disk evidence. 3. Lock each phase before advancing; Phases 6–8 own DECISIONS/STATE/memory updates.

```yaml
rb_id: "RB-2"
title: "Serial phase authoring"
description: "Write each phase doc only after that phase's real evidence exists"
task_type: "phase-authoring"
subsystem: ".recursive"
source_runs: ["79-extension-control-and-recommendations-qa", "80-signed-recommendation-cloud-lifecycle"]
applies_to: [".recursive/run/", "recursive-mode", "03-implementation-summary.md", "03.5-code-review.md"]
success_rate: 0.50
status: active
created_at: "2026-07-24T22:29:02.098944+00:00"
```

### RB-3: Review-bundle citations

**Description:** Put review citations in linter-scanned narrative sections

**Content:** 1. Prefer recursive-review-bundle for Phase 3.5. 2. Place citations in narrative sections the linter scans, not only YAML frontmatter. 3. Cite upstream artifacts, addenda, evidence paths, and changed files from the bundle.

```yaml
rb_id: "RB-3"
title: "Review-bundle citations"
description: "Put review citations in linter-scanned narrative sections"
task_type: "code-review"
subsystem: ".recursive"
source_runs: ["79-extension-control-and-recommendations-qa", "80-signed-recommendation-cloud-lifecycle"]
applies_to: ["03.5-code-review.md", "recursive-review-bundle", "evidence/review-bundles/"]
success_rate: 0.50
status: active
created_at: "2026-07-24T22:29:02.098944+00:00"
```

