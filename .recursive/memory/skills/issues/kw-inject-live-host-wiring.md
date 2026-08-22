# Live KW inject needs aligned host query/bridge/join wiring (issues)

Type: incident
Status: CURRENT
Scope: public runtime-host-bridge durable KW ON → gated prompt inject on live chat/completions and pi
Owns-Paths:
Watch-Paths: role-model-router/apps/runtime-host-bridge/; scripts/track-b/run85-pi-kw-inject-e2e.mjs
Source-Runs: 85-kw-gated-router-prompt-inject
Validated-At-Commit: working-tree run-85 Phase 8 reopen closeout
Last-Validated: 2026-07-29
Tags: prompt-inject, auto-arm, bridge-path, join-session, default-query, live-pi

## Issue

SEA map-surface inject hop can PASS while live `pi` / HTTP chat completions still show no inject. Root causes observed in run-85 post-lock E2E: missing default retrieve query, bridge path mismatch between mutate write and auto-arm read, join session registered under pre-bump revision, and client session id used as KW join key.

## Guidance

- Treat live provider-capture inject as a distinct proof from `mapChatCompletionsRequest` hop evidence.
- Keep mutate write path and auto-arm read path identical: `{stateRoot}/{scopeId}/track-b-production-bridge.json`.
- Register activate/deactivate join sessions under `state.revision + 1`.
- Own the durable join session on the host; ignore client `x-session-id` for KW join lookup.
- Derive `deriveDefaultKwPromptInjectQuery()` (or equivalent) from the latest user message when durable KW ON and no explicit query is set.
- Cite addendum `05-manual-qa.pi-kw-inject-e2e.addendum-01.md` and `evidence/other/pi-kw-inject-e2e.json` when claiming live `pi` inject unlock.
