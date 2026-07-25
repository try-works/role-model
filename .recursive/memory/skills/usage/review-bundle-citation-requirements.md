# Review-bundle citation requirements (usage)

Type: usage
Status: CURRENT
Scope: Phase 3.5 / delegated review when using recursive-review-bundle
Owns-Paths:
Watch-Paths: .recursive/run/; .agents/skills/recursive-review-bundle/
Source-Runs: 79-extension-control-and-recommendations-qa; 80-signed-recommendation-cloud-lifecycle
Validated-At-Commit: working-tree run-80 Phase 8 closeout
Last-Validated: 2026-07-24
Tags: recursive-review-bundle, phase-3.5, citation, audit

## Guidance

- When Phase 3.5 uses a review bundle, record `Review Bundle Path` in the phase artifact and cite that path from the audit narrative.
- The written review must cite upstream artifacts, relevant addenda, prior recursive evidence, and changed files/code refs from the bundle—not only a pass/fail summary.
- Prefer generating the bundle with `recursive-review-bundle` so the handoff inventory stays reproducible under `/.recursive/run/<run-id>/evidence/review-bundles/`.
- Self-audit remains acceptable for receipt-bound reviews when the bundle + diff + evidence are machine-checkable on disk; still keep the citation fields complete.
- Citations must appear in narrative sections the linter scans (for example Review Scope / Verdict), not only in later Findings Summary sections.
