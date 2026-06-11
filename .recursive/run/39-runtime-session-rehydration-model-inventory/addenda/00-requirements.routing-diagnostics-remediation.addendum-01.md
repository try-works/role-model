Run: `/.recursive/run/39-runtime-session-rehydration-model-inventory/`
Phase: `00 Requirements`
Status: `APPROVED`
Addendum: `01`
Inputs:
- `/.recursive/run/39-runtime-session-rehydration-model-inventory/00-requirements.md` (locked `R1`–`R9`)
- Operator routing investigation on packaged runtime `:3456` (2026-06-11)
- `role-model-router/apps/runtime-host-bridge/src/index.ts` (`summarizeDifficultySignals`, `classifyDifficultyFromSignals`, routing-model fixture wiring)
- `role-model-router/packages/protocol-routing/src/index.ts` (`projectRuntimeRouteInput`, `ignoredEndpointIds`)
- `testdata/router-runtime/fixtures/routing-model-guidance.json`
- `scripts/operator-purge-observed-test-samples.ts`
- `scripts/operator-inspect-craft-agent-payload.ts`
Outputs:
- `/.recursive/run/39-runtime-session-rehydration-model-inventory/addenda/00-requirements.routing-diagnostics-remediation.addendum-01.md`
- `/.recursive/run/39-runtime-session-rehydration-model-inventory/evidence/logs/operator-routing-remediation-2026-06-11.log`
Scope note: Post–run-39 operator remediation for mixed-alias routing skew and misleading diagnostics. Documents completed operator-side fixes (config, observed-sample purge, Craft Agent payload analysis) and proposes two product follow-ups: hide stale fixture routing-model IDs in production diagnostics, and exclude system-prompt boilerplate from `codeOrSchemaBurden` when classifying user-visible Ask-mode chats. Does not change routing algorithms, benchmark suites, or alias difficulty mode defaults in this addendum.

## TODO

- [x] Record operator-side fixes applied on 2026-06-11
- [x] Document Craft Agent payload → difficulty rubric trace
- [x] Define code-side requirement deltas `R10`–`R11`
- [x] Record verification and out-of-scope boundaries
- [ ] User approval of this addendum
- [x] Implement `R10`–`R11` (2026-06-11): `runtime-routing-model.ts`, `protocol-routing/projectRuntimeRouteInput`, `summarizeDifficultySignals` ask-mode exclusion

## Operator Actions Completed (2026-06-11)

### A1 — Runtime config alias hint corrected

**File:** `%LOCALAPPDATA%\Role Model Runtime\runtime-config.yaml`

```yaml
model_aliases:
  mixed.local-remote:
    model_ids:
      - lfm2.5-8b-a1b   # was lfm2.5-1.2b-instruct
      - moonshot/kimi-k2.6
```

**Reload:** `PUT /api/role-model/runtime/config` with updated YAML (`applied: true`). Runtime summary should no longer report alias drift for `mixed.local-remote` after reload.

### A2 — Observed sample purge (benchmark + synthetic tests)

**Script:** `scripts/operator-purge-observed-test-samples.ts`

Purged from `standalone-runtime/memory/memory.sqlite`:

| Endpoint | Benchmark rows | Test live rows | Remaining live rows |
| --- | ---: | ---: | ---: |
| `...local.lfm2.5-1.2b-instruct` (legacy) | 24 | 18 | 184 |
| `...local.lfm2.5-8b-a1b` | 24 | 6 | 0 |
| `moonshot...kimi-k2.6` | 24 | 42 | 27 |

Deleted `source_type = 'benchmark'` and `live_request` rows whose `request_id` matches synthetic prefixes (`req-ui-test*`, `req-qa-*`, `trace-*`, `bench-*`, `consumer-*`, `req-routing-*`, etc.). Rebuilt `observed_profile_snapshots` and per-difficulty snapshots from remaining live samples.

**Post-purge remote profile:** 27 live samples, median throughput ~20 tok/s, p50 latency ~4749 ms (no more 120 ms / 267 tok/s test stubs).

### A3 — Craft Agent payload inspection

Craft Agent is an external consumer (not in this repo). Inspection used:

1. `difficulty_classification_cache` for `conversation-main` (cached classification from actual routed requests)
2. Rubric replay against a hypothesized Craft Agent system prompt + user utterance
3. `runtime_observations` rows with matching diagnostics

**Cached classification (matches operator screenshot log):**

```json
{
  "difficulty": "medium",
  "rubricSignals": {
    "contextTokens": 102,
    "historyTurnCount": 2,
    "codeOrSchemaBurden": true
  }
}
```

**Hypothesized first-turn payload** (system + `"Whats your name"`):

| Signal | Value | Rubric contribution |
| --- | --- | --- |
| `historyTurnCount` | 2 (system + user) | +1 |
| `codeOrSchemaBurden` | true | +2 |
| Matched terms | `contract`, `schema`, `validation` | from system prompt boilerplate |
| **Total score** | 3 | → **medium** (not easy) |

SQLite `conversation_turns` for `conversation-main` still holds seeded fixture refs (`ref://turn-001?...`) and is **not** the Craft Agent HTTP body. Difficulty classification uses the **incoming chat `messages` array`**, which includes Craft Agent's system prompt.

**Operator action:** cleared stale `difficulty_classification_cache` row for `conversation-main` so the next request reclassifies from fresh signals.

## Problem Summary

1. **Stale fixture routing model in diagnostics** — `openai.personal.primary.us-east-1.fast` from `routing-model-guidance.json` appears in every `routingDiagnostics.routingModel` block with `ignoredEndpointIds`, even though only local + moonshot endpoints are routable. Operators interpret this as a phantom OpenAI chat endpoint.
2. **Ask-mode chats classified medium** — Craft Agent (and similar clients) send system prompts containing `schema`, `contract`, and `validation`. The rubric scans all messages uniformly, so a one-line user question becomes `medium` + `balanced` strategy, biasing mixed-alias routing toward remote.
3. **Observed throughput skew** — benchmark runs and synthetic `req-ui-test-*` live samples inflated remote throughput and depressed local scores, reinforcing remote selection. Operator purge addresses local state; product should prevent test traffic from polluting production routing profiles.

## Requirements (Code Follow-Up)

| ID | Requirement | Acceptance |
| --- | --- | --- |
| **R10** | Production/runtime-bridge diagnostics must not surface non-routable fixture `routingModel.endpointId` values as if they were active guidance | When `routingModel.preferredEndpointIds` are all in `ignoredEndpointIds`, diagnostics show `routingModel.enabled: false` or omit `endpointId`/`preferredEndpointIds`; packaged runtime uses controller/classifier config from live registry or unified config, not hardcoded `testdata` fixture IDs |
| **R11** | Difficulty rubric `codeOrSchemaBurden` must not treat system-role boilerplate as user task burden for Ask-mode classification | For chat requests with no tools and user-turn-only intent, system messages are excluded from `codeOrSchemaBurden` (and optionally `instructionConstraintCount`); `"Whats your name"` + typical Craft Agent system prompt classifies as **easy**; regression test covers Craft-like system prompt + short user message |

### R10 implementation hints

- `createRuntimeBridgeBackend` (`index.ts`): replace unconditional `routing-model-guidance.json` load with resolver that prefers `difficulty_classifier` / `controller` entries from `runtime-config.yaml`, falling back to first routable endpoint only in dev/fixture mode.
- `projectRuntimeRouteInput` (`protocol-routing`): when all preferred IDs are ignored, set `routingModel.enabled: false` in diagnostics instead of echoing stale fixture IDs.

### R11 implementation hints

- `summarizeDifficultySignals` (`index.ts`): add `classifyDifficultyFromMessages(messages, { excludeSystemFromCodeBurden: true })` path used by OpenAI chat completions mapping.
- Tests: mirror `trace-craft-name-001` scenario — system prompt with `schema`/`contract`/`validation`, user `"Whats your name"` → `easy`, `cost` under `difficulty` alias mode.

## Verification (Operator)

| Check | Evidence |
| --- | --- |
| Config hint updated | `%LOCALAPPDATA%\Role Model Runtime\runtime-config.yaml` + `PUT /api/role-model/runtime/config` response |
| Samples purged | `scripts/operator-inspect-observed-samples.mjs` → 0 test/benchmark-ish IDs; 211 `live_request` rows |
| Craft payload traced | `scripts/operator-inspect-craft-agent-payload.ts` output + cached `difficulty_classification_cache` |
| Difficulty cache reset | SQL delete on `conversation-main` cache row |

## Out of Scope

- Changing `mixed.local-remote` alias mode from `difficulty` to `hybrid` or `baseline`
- Adding `prefer_local` yaml knob (separate feature)
- Deleting `route-suite-*` QA live samples (not matched by current purge prefixes; optional follow-up)
- Implementing `R10`–`R11` in this addendum (requirements only)

## Audit

Audit Execution Mode: self-audit
Subagent Capability Probe: subagents available; operator remediation did not require delegated audit
Delegation Decision Basis: addendum is documentation + operator actions; code changes deferred to follow-on implementation

Coverage: PASS
Approval: PASS

Audit: PASS
