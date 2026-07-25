---
Type: training
Status: CURRENT
Scope: code-review
Owns-Paths:
Watch-Paths:
- 03.5-code-review.md
- evidence/review-bundles/
- recursive-review-bundle
Source-Runs: 79-extension-control-and-recommendations-qa, 80-signed-recommendation-cloud-lifecycle
Validated-At-Commit:
Last-Validated: 2026-07-24T22:29:02.101655+00:00
Tags: training, reasoningbank, training-free-grpo
---

# Training Memory: code-review

Reasoning items extracted from recursive-mode runs for `code-review` tasks.


## Extracted Reasoning Items (2026-07-24T22:29:02.101655+00:00)

### RB-7: Review-bundle citations

**Description:** Put review citations in linter-scanned narrative sections

**Content:** 1. Prefer recursive-review-bundle for Phase 3.5. 2. Place citations in narrative sections the linter scans, not only YAML frontmatter. 3. Cite upstream artifacts, addenda, evidence paths, and changed files from the bundle.

```yaml
rb_id: "RB-7"
title: "Review-bundle citations"
description: "Put review citations in linter-scanned narrative sections"
task_type: "code-review"
subsystem: ".recursive"
source_runs: ["79-extension-control-and-recommendations-qa", "80-signed-recommendation-cloud-lifecycle"]
applies_to: ["03.5-code-review.md", "recursive-review-bundle", "evidence/review-bundles/"]
success_rate: 0.50
status: active
created_at: "2026-07-24T22:29:02.101655+00:00"
```



## Extracted Reasoning Items (2026-07-24T23:06:57.819593+00:00)

### RB-13: Refresh review bundle hash

**Description:** Regenerate the Phase 3.5 review bundle after finalizing the reviewed artifact

**Content:** 1. Prefer recursive-review-bundle for Phase 3.5. 2. After editing the reviewed artifact, regenerate the bundle so hashes match before lock. 3. Put citations in linter-scanned narrative sections, not only frontmatter.

```yaml
rb_id: "RB-13"
title: "Refresh review bundle hash"
description: "Regenerate the Phase 3.5 review bundle after finalizing the reviewed artifact"
task_type: "code-review"
subsystem: "role-model-router"
source_runs: ["81-kw-activation-browser-recommendation-evidence", "79-extension-control-and-recommendations-qa"]
applies_to: ["03.5-code-review.md", "recursive-review-bundle", "evidence/review-bundles/"]
success_rate: 1.00
status: active
created_at: "2026-07-24T23:06:57.819593+00:00"
```

