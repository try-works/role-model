# pi CLI verification against the rebuilt development runtime (`:3458`)

Operator request (2026-10-01): "send some requests from pi to 3458 to verify", using
`hybrid.remote-only`, and "also test the configured agent strategies".

Setup: `D:\pi\agent\models.json` was pointed at `http://127.0.0.1:3458/v1` (backup:
`E:\tmp\run103-evidence\models.json.pre-pi-verify`) and restored to `:3457` afterwards. Requests were sent
with `pi --no-session --provider role-model --model <alias> -p <prompt>`.

| Request | Alias | Outcome (`pi` output) | Receipt highlights |
| --- | --- | --- | --- |
| 1 | `hybrid.remote-only` | `PI-VERIFY-1` | `routingMode {source: alias-default, aliasMode: hybrid, effectiveMode: hybrid}`; `hybridArbitration {active, finalStrategy: cost, dominantSignal: controller}`; `controllerRouting {active, discardedStrategy: latency}`; `latencySelection` present because the override was enabled during this window (see below) |
| 2 | `tester.remote-only` | `PI-VERIFY-TESTER` | `aliasPostureBinding {aliasId: tester.remote-only, kind: role, roleId: tester, roleSource: preset, scoringStrategy: quality}`; `strategyResolution {strategy: quality, source: operator}` |
| 3 | `batch.remote-only` | `PI-VERIFY-BATCH` | `aliasPostureBinding {kind: workload, roleId: null, roleSource: none, scoringStrategy: cost}` |
| 4 | `embedding.remote-only` | `400 capability_eligibility_error (no_eligible_target)` | refused pre-execution; `requiredCapabilities` includes `knowledge.retrieval`, `excludedTargets: []` because the alias published no candidates at all — the page's "4 scopes cannot resolve" and the request outcome now agree |

Note on the measured-latency override: during the earlier UI checks on the same page the override was left
enabled (policy version 4), which is why request 1 carries a full `latencySelection` block — four measured
candidates with `p50LatencyMs`/`p95LatencyMs`/effective latency, `bucketUpperBoundTokens: 50000` and
`reason: "the best candidate improves effective latency by 155.75ms, inside the configured 2000ms delta"`.
That delta is the private registry default `latencySelectionMaxDeltaMs = 2000`, i.e. the `R7` release
dependency recorded in `06-decisions-update.md` is still open. The override was set back to the shipped
default (disabled, policy version 5) after this evidence was captured.

Raw files: `pi-verify-<alias>.txt` (the `pi` output) and `pi-verify-<alias>.receipt.json` (the runtime's
decision readback for that request).
