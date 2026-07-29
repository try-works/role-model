# Packaged SEA inject unlock needs host join + matching seed scope (issues)

Type: issues
Status: CURRENT
Scope: Phase 5 packaged-runtime inject / recommendation hops for KW gated prompt inject
Owns-Paths:
Watch-Paths: role-model-router/apps/runtime-host-bridge/; scripts/track-b/; .recursive/run/
Source-Runs: 85-kw-gated-router-prompt-inject
Validated-At-Commit: working-tree run-85 Phase 8 closeout
Last-Validated: 2026-07-29
Tags: prompt-inject, sea, host-join, packaged-runtime, recommendations, phase5

## Issue

Claiming gated live-router prompt-inject unlock from private unit tests alone is insufficient. Without public host join factory + durable auto-arm wired into the packaged SEA, and without recommendation seed/lifecycle using the same `--scope-id` (plus verification key) as launch, Phase 5 hops fail closed or look empty even when private KW is correct.

## Guidance

- Re-package the public SEA **after** host join loader / auto-arm wiring; bind rebuild-receipt SHA before inject hop.
- Prove OFF refuse → ON apply → soft-OFF clear on the locked insertion surface (`mapChatCompletionsRequest` / `applyRequestedRoleExecutionPolicy`), not a parallel test-only path.
- Launch with `--evidence-root` under the owning run; seed with matching `--scope-id`; pass `--recommendation-verification-key` or download stays empty.
- Cloud `--seed` alone may target the wrong scope (`not_eligible`); prefer `run80-seed-signed-recommendations.mjs --scope-id=<launch-scope>`.
- Fresh packaged scopes may need provider accounts/endpoints copied carefully (not full multi-GB DBs); never commit TEMP credentials.
- Prefer packaged KW probe inject matrix plus SEA hop receipts under the run evidence tree.
