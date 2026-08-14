# Packaged SEA inject unlock needs host join + matching seed scope (issues)

Type: issues
Status: CURRENT
Scope: Phase 5 packaged-runtime inject / recommendation hops for KW gated prompt inject
Owns-Paths:
Watch-Paths: role-model-router/apps/runtime-host-bridge/; scripts/track-b/; .recursive/run/
Source-Runs: 85-kw-gated-router-prompt-inject
Validated-At-Commit: working-tree run-85 Phase 8 reopen closeout
Last-Validated: 2026-07-29
Tags: prompt-inject, sea, host-join, packaged-runtime, recommendations, phase5, auto-arm, join-session

## Issue

Claiming gated live-router prompt-inject unlock from private unit tests alone is insufficient. Without public host join factory + durable auto-arm wired into the packaged SEA, and without recommendation seed/lifecycle using the same `--scope-id` (plus verification key) as launch, Phase 5 hops fail closed or look empty even when private KW is correct.

Post-lock live `pi` inject E2E on run 85 also showed that host join/auto-arm can still fail closed for live traffic when: (1) live map path has no default retrieve query under durable KW ON; (2) auto-arm reads a different bridge path than mutate writes; (3) activate registers under `state.revision` then bumps revision so auto-arm lookup misses; (4) auto-arm keys off client `x-session-id` instead of the host-owned durable join session.

## Guidance

- Re-package the public SEA **after** host join loader / auto-arm wiring; bind rebuild-receipt SHA before inject hop.
- Prove OFF refuse → ON apply → soft-OFF clear on the locked insertion surface (`mapChatCompletionsRequest` / `applyRequestedRoleExecutionPolicy`), not a parallel test-only path.
- After map-surface PASS, also prove live `pi --provider role-model` with inject present in provider capture when KW ON (and absent when soft OFF). Prefer `scripts/track-b/run85-pi-kw-inject-e2e.mjs` / run evidence `other/pi-kw-inject-e2e.json`.
- Auto-arm must read `{stateRoot}/{scopeId}/track-b-production-bridge.json` (same path mutate writes)—not a nested `track-b/` sibling.
- Activate/deactivate must register KW join under the next bridge revision (`state.revision + 1`) so durable auto-arm lookup matches.
- Auto-arm must use the host-owned durable join session, never client `x-session-id`.
- When durable KW ON and no explicit inject query is provided, derive a bounded default retrieve query from the latest user message (empty query refuses retrieve and looks like “inject broken”).
- Launch with `--evidence-root` under the owning run; seed with matching `--scope-id`; pass `--recommendation-verification-key` or download stays empty.
- Cloud `--seed` alone may target the wrong scope (`not_eligible`); prefer `run80-seed-signed-recommendations.mjs --scope-id=<launch-scope>`.
- Fresh packaged scopes may need provider accounts/endpoints copied carefully (not full multi-GB DBs); never commit TEMP credentials.
- Prefer packaged KW probe inject matrix plus SEA hop receipts under the run evidence tree.
