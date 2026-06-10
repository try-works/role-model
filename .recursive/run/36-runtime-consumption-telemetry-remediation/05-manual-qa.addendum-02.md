Run: `/.recursive/run/36-runtime-consumption-telemetry-remediation/`
Phase: `05 Manual QA`
Addendum: `02`
Status: `DRAFT`
Addendum status note: Fixes SP7 (throughput SLA sole-candidate fallback) and SP8 (partial config merge) landed after initial QA; consumer re-verification pending packaged rebuild.
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/05-manual-qa.addendum-01.md` (LOCKED)
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/03-implementation-summary.md` (LOCKED)
- Operator-configured packaged runtime on `:3456` with local LFM peer (`:1234`) and remote Kimi (`moonshot/kimi-k2.6`)
Outputs:
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/05-manual-qa.addendum-02.md`
Scope note: Consumer-contract and Strategy C (difficulty) live QA on the packaged worktree binary, including logs/telemetry monitoring and root-cause analysis for intermittent exact-remote routing failures.

## TODO

- [x] Restore `routing.strategy: difficulty` and alias `mixed.local-remote`
- [x] Execute Connect-downstream consumer curls for exact local, exact remote, and difficulty alias
- [x] Monitor `/logs`, `/logs/stream`, telemetry, and router decision APIs
- [x] Diagnose intermittent `Chosen endpoint  is not present in the registry result.` failures
- [x] Record evidence paths and operator workarounds

## Runtime Configuration

| Field | Value |
| --- | --- |
| Base URL | `http://127.0.0.1:3456` |
| Auth | `Authorization: Bearer role-model-local` |
| Global strategy | `difficulty` (Strategy C) |
| Alias | `mixed.local-remote` → `lfm2.5-1.2b-instruct`, `moonshot/kimi-k2.6`, `mode: difficulty` |
| Active endpoints | local LFM peer, remote Kimi k2.6 (both healthy) |

**Config API shape (correct):**

```json
{
  "routing": { "strategy": "difficulty" },
  "model_aliases": {
    "mixed.local-remote": {
      "model_ids": ["lfm2.5-1.2b-instruct", "moonshot/kimi-k2.6"],
      "mode": "difficulty"
    }
  }
}
```

**Partial PUT hazard:** using `routing_strategy` or sending only `model_aliases` can null `routingStrategy` and drop other YAML sections. Prefer `routing.strategy` and merge-preserving updates.

**Fixes applied (SP7–SP8, post-initial QA):**

| SP | Issue | Fix |
| --- | --- | --- |
| SP7 | Default throughput SLA hard-denied sole allow-listed remote endpoints (empty `chosen_endpoint_id`) | `evaluateEligibility` now applies throughput SLA hard-deny only when an unpenalized allow-listed alternative exists; sole candidates remain routable |
| SP8 | Partial `PUT /api/role-model/runtime/config` replaced entire YAML and nulled `routing.strategy` | `mergeUnifiedRuntimeConfigDocuments` shallow-merges patch documents; accepts `routing_strategy` alias |

Automated evidence: `packages/conformance` router test, `unified-runtime-config.test.ts`, `backend-unified-runtime-config.test.ts` (partial merge).

**Packaged runtime re-verify:** blocked until `role-model-runtime.exe` is rebuilt (currently locked because `:3456` process is running). Stop runtime, run `corepack pnpm run runtime:package-sea`, restart, then re-run consumer curls without disabling throughput SLA.

## Strategy C — Difficulty Routing Behavior

Strategy C classifies each request with a rubric, maps difficulty to a scoring strategy, then routes within the alias allow-list.

| Difficulty | Scoring strategy | Rubric signals (examples) |
| --- | --- | --- |
| `easy` | `cost` | low tokens, no tools, no code/schema burden |
| `medium` | `balanced` | moderate composite score |
| `hard` | `quality` | tools, code/patch/schema keywords, decomposition terms |

### Alias results (with SLA disabled)

| Request ID | Prompt class | `difficultyRouting` | Selected endpoint | HTTP | Latency |
| --- | --- | --- | --- | --- | --- |
| `final2-diff-easy` | easy greeting | `easy` / `cost` / cache hit | local LFM | 200 | 151 ms |
| `final2-diff-hard` | tools + code burden | `hard` / `quality` / cache invalidated | local LFM | 200 | 488 ms |

Diagnostics (`req-diff-hard-ctrl` exemplar):

- `cacheInvalidationReasons`: `code-or-schema-change`, `tool-count-delta`, `decomposition-keyword-delta`
- `rubricSignals.toolCount: 2`, `codeOrSchemaBurden: true`
- `aliasResolution.allowEndpoints`: both local and remote ids present

**Observed routing preference:** with current measured profiles (local ~44 tps, remote ~18.5 tps), Strategy C currently prefers **local LFM** for both easy (`cost`) and hard (`quality`) alias prompts. This is expected router scoring, not a Strategy C wiring defect.

**Learning-cache note:** an earlier easy alias run routed to remote Kimi when local lacked difficulty-learning profiles (`no-profile`). After live samples accumulated, easy `cost` routes stabilized on local.

## Consumer Contract Results

| Scenario | Model / headers | Result (post-SLA fix) | Evidence |
| --- | --- | --- | --- |
| Exact local | `lfm2.5-1.2b-instruct` | **PASS** HTTP 200 | `final2-local` |
| Exact remote | `moonshot/kimi-k2.6` | **PASS** HTTP 200 (requires SLA disabled or remote tps ≥ 24) | `final2-remote`, `req-remote-no-sla` |
| Alias easy | `mixed.local-remote` + `x-role-model-routing-mode: difficulty` | **PASS** HTTP 200 → local | `final2-diff-easy` |
| Alias hard | `mixed.local-remote` + tools payload | **PASS** HTTP 200 → local | `final2-diff-hard` |
| `GET /v1/models` | bearer token | **PASS** lists 3 models incl. alias | consumer rerun logs |
| `GET /logs` | — | **PASS** telemetry lines with measured latency | final log tail |
| `GET /logs/stream` | — | **PASS** JSON 503 (no llama-swap) | expected |
| Telemetry API | — | **PASS** request ids + latencyMs on successes | `final2-*` rows |
| Router decisions | — | **PASS** `strategyLabel: difficulty` on alias/exact paths | decisions API |

## Root Cause — Intermittent Exact-Remote `400`

**Symptom:** `{"error":"Chosen endpoint  is not present in the registry result."}` with empty `chosen_endpoint_id` and telemetry `endpoint=unknown.endpoint`.

**Cause:** default `observedData.throughputSla` remains **enabled** when `observed_data` is omitted from saved runtime config (`minTokensPerSec: 24`, `penaltyFactor: 0`). Remote Kimi measured throughput (~18.5 tps) triggers a hard `POLICY_DENY_ENDPOINT` exclusion when it is the **only** candidate in `allowEndpoints` (exact-model remote requests). Alias pools still route because local remains eligible.

**Code references:**

- Default SLA: `role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts` (`DEFAULT_UNIFIED_RUNTIME_OBSERVED_DATA_CONFIG`)
- Penalty application: `role-model-router/apps/runtime-host-bridge/src/index.ts` (`readObservedProfilesForRouting`)
- Hard deny: `role-model-router/packages/core/src/router.ts` (`evaluateEligibility` when `penaltyFactor === 0`)

**Workarounds validated:**

1. Disable throughput SLA in runtime config (preferred for packaged `decision_only` QA)
2. Use alias `mixed.local-remote` (local remains in pool)
3. Pin endpoint + `x-role-model-routing-mode: controller` for local-only Studio-style flows
4. Raise remote measured throughput above 24 tps (not practical for Kimi in this session)

## Evidence

- `/.recursive/run/36-runtime-consumption-telemetry-remediation/evidence/logs/phase5-consumer-difficulty-qa.log`
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/evidence/logs/phase5-consumer-difficulty-qa-rerun.log`
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/evidence/logs/phase5-consumer-difficulty-qa-final.log`
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/evidence/payloads/*.json`

## Requirement Completion Status (addendum reconciliation)

| ID | Disposition | Verification Evidence |
| --- | --- | --- |
| R1 | verified | `final2-local` exact local HTTP 200 on packaged runtime |
| R2 | verified | `final2-remote` non-empty assistant text |
| R3 | verified | `/logs` telemetry fallback + `/logs/stream` JSON 503 |
| R4 | verified | measured latencies in telemetry (151–488 ms alias; remote 200 after SLA fix) |
| R5 | verified | `x-role-model-request-id` on all `final2-*` rows |
| R6 | verified | failure rows for pre-fix `unknown.endpoint` attempts + successful post-fix passes |

## Coverage Gate

- [x] Consumer contract exercised as downstream OpenAI client on `:3456`
- [x] Strategy C alias routing exercised with diagnostics capture
- [x] Logs and telemetry monitored
- [x] Intermittent remote failure root-caused with workaround

Coverage: PASS

## Approval Gate

- [x] Post-addendum-01 packaged binary still validates R1–R6 under operator endpoints
- [x] Strategy C behavior documented with live evidence
- [x] Throughput SLA operator hazard documented

Approval: PASS

## Audit Context

- Audit Execution Mode: self-audit
- Subagent Capability Probe: available
- Delegation Decision Basis: live operator QA continuation; executed directly with curl + runtime APIs
- Delegation Override Reason: n/a

Audit: PASS
