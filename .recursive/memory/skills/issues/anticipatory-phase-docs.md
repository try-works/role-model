# Anticipatory phase docs are invalid (issues)

Type: incident
Status: CURRENT
Scope: recursive-mode phase authoring discipline
Owns-Paths:
Watch-Paths: .recursive/run/; .agents/skills/recursive-mode/
Source-Runs: 80-signed-recommendation-cloud-lifecycle; 81-kw-activation-browser-recommendation-evidence; 82-tb00-pin-refreeze-kw-digest-bind-launch-scope; 83-kw-operator-toggle-assemble-live-e2e-argv-equals; 84-kw-ui-toggle-gated-retrieve-eval; 85-kw-gated-router-prompt-inject
Validated-At-Commit: working-tree run-85 Phase 8 reopen closeout
Last-Validated: 2026-07-29
Tags: recursive-mode, phase-docs, closeout, falsification

## Issue

Authoring Phase 3–8 artifacts (or locking them) before that phase’s real work completes falsifies the workflow. Anticipatory “PASS” docs for unfinished implementation, review, tests, or QA must be deleted/reopened; control-plane DECISIONS/STATE/memory must not be updated early. Batch-writing Phases 3.5–8 in one shot is the same failure mode even if earlier phases already passed. Documenting polluted foreign-run evidence as intentional also falsifies the record—restore/fix repo reality first. Inventing assemble PASS without a real Playwright exit-0 receipt is the same class of falsification. Claiming Phase 5 inject unlock without a sha-bound SEA hop is the same class of falsification. Claiming live `pi` inject unlock from map-hop alone (without provider-capture E2E) is the same class of falsification. Closing Phases 6–8 without folding post-lock Phase 5 remediations/addenda also falsifies the control plane—reopen and amend.

## Guidance

- Write `03-implementation-summary.md` only after implementation evidence exists; then lock before 3.5.
- Write `03.5-code-review.md` only after reviewing the real diff (prefer a review bundle); then lock before 4.
- Write `04`/`05` only after running/recording the tests/QA for that phase.
- Write `06`/`07`/`08` only after updating DECISIONS/STATE/memory respectively; never pre-author those receipts.
- Phases 6–8 own DECISIONS/STATE/memory and must update those docs as part of their real work, then leave concise delta receipts.
- If a subagent recreates anticipatory closeout docs, stop it, delete/reopen, and continue controller-authored receipts from disk evidence.
- Runs 81–85 confirmed: user-enforced serial authoring after real work per phase is the correct closeout path; run 83 also confirmed restore polluted foreign-run evidence before claiming Phase 3 audit PASS; run 84 confirmed repair assemble and capture a distinct PASS log rather than relabeling a failure; run 85 confirmed SEA inject hop + host join wiring before Phase 5/6 unlock claims, then reopened Phases 6–8 after post-lock live `pi` inject remediations so DECISIONS/STATE/memory match the addendum.
