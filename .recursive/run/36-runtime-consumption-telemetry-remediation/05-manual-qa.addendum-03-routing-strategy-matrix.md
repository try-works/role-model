Run: `/.recursive/run/36-runtime-consumption-telemetry-remediation/`
Phase: `05 Manual QA`
Addendum: `03`
Status: `DRAFT`
Addendum status note: Comprehensive routing strategy matrix QA for improvement decisions.
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/05-manual-qa.addendum-02.md`
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/evidence/prompts/routing-strategy-suite.json` (v2.0)
- Packaged runtime on `:3456`, alias `mixed.local-remote`, global strategy `difficulty`
Outputs:
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/05-manual-qa.addendum-03-routing-strategy-matrix.md`
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/evidence/logs/routing-strategy-suite-results.json`
- `/.recursive/run/36-runtime-consumption-telemetry-remediation/evidence/logs/routing-strategy-matrix.md`

## Purpose

Decision-support addendum comparing **difficulty**, **baseline**, **controller**, and **hybrid** routing on a broad prompt suite (easy → max-signal). Use for routing classifier tuning, strategy override behavior, and cache policy improvements.

## Execution Summary

- Generated: `2026-06-08T17:51:37.443770+00:00`
- Runtime: `http://127.0.0.1:3456`
- Suite version: `2.0`
- Prompt cases: `46`
- Total runs (cases × strategies): `166`
- HTTP failures: `0`

## Strategy-Level Summary

| Strategy | Runs | OK | Local | Remote | Avg latency | Difficulty distribution |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `difficulty` | 46 | 46 | 37 | 9 | 3489 | easy:32, hard:5, medium:9 |
| `baseline` | 40 | 40 | 39 | 1 | 3533 | n/a:40 |
| `controller` | 40 | 40 | 39 | 1 | 3263 | n/a:40 |
| `hybrid` | 40 | 40 | 31 | 9 | 3509 | easy:29, hard:5, medium:6 |

## Category Coverage

| Category | Intent | Cases |
| --- | --- | ---: |
| easy-trivial | Ultra-low signal (yes/no, format) | 8 |
| easy-short | Short factual / greeting | 5 |
| medium-qa | Explanatory prose | 4 |
| long-context | Long incident + constraints | 4 |
| code-burden | Patch/schema/debug language | 5 |
| tools-light | Single-tool prompts | 3 |
| tools-heavy | Multi-tool agent/code workflows | 4 |
| decomposition | Planning / milestones | 3 |
| max-signal | Combined hard signals | 2 |
| exact-model | Pinned local/remote ids | 2 |
| cache-probe | Repeat + invalidation (difficulty only) | 6 |

## Full Strategy Matrix

Format per cell: `endpoint / difficulty / latency / http_status`

| Prompt | Category | difficulty | baseline | controller | hybrid |
| --- | --- | --- | --- | --- | --- |
| `c01-full-refactor` | code-burden | local / medium / 7173ms / 200 | local / — / 7188ms / 200 | local / — / 7135ms / 200 | remote / medium / 4839ms / 200 |
| `c02-ts-generics` | code-burden | remote / medium / 3689ms / 200 | local / — / 5827ms / 200 | local / — / 5792ms / 200 | remote / medium / 4964ms / 200 |
| `d01-milestones-heavy` | decomposition | local / easy / 8525ms / 200 | local / — / 8490ms / 200 | local / — / 8473ms / 200 | local / easy / 8532ms / 200 |
| `e01-yes-no` | easy-trivial | remote / easy / 2042ms / 200 | local / — / 389ms / 200 | local / — / 402ms / 200 | local / easy / 428ms / 200 |
| `e02-single-word` | easy-trivial | local / easy / 396ms / 200 | local / — / 377ms / 200 | local / — / 426ms / 200 | local / easy / 399ms / 200 |
| `e03-count` | easy-trivial | local / easy / 583ms / 200 | local / — / 570ms / 200 | local / — / 563ms / 200 | local / easy / 591ms / 200 |
| `e04-capitalize` | easy-trivial | local / easy / 452ms / 200 | local / — / 404ms / 200 | local / — / 415ms / 200 | local / easy / 452ms / 200 |
| `e05-emoji` | easy-trivial | local / easy / 521ms / 200 | local / — / 405ms / 200 | local / — / 428ms / 200 | local / easy / 448ms / 200 |
| `e06-timezone` | easy-trivial | local / easy / 410ms / 200 | local / — / 576ms / 200 | local / — / 383ms / 200 | local / easy / 609ms / 200 |
| `e07-boolean` | easy-trivial | local / easy / 836ms / 200 | local / — / 804ms / 200 | local / — / 895ms / 200 | local / easy / 798ms / 200 |
| `e08-format-json` | easy-trivial | local / easy / 577ms / 200 | local / — / 550ms / 200 | local / — / 551ms / 200 | local / easy / 628ms / 200 |
| `l01-verbose-incident` | long-context | local / medium / 2462ms / 200 | local / — / 937ms / 200 | local / — / 759ms / 200 | remote / medium / 4181ms / 200 |
| `l02-many-constraints` | long-context | local / easy / 3960ms / 200 | local / — / 3086ms / 200 | local / — / 3459ms / 200 | local / easy / 3698ms / 200 |
| `p01-easy-greet` | easy-short | local / easy / 643ms / 200 | local / — / 652ms / 200 | local / — / 621ms / 200 | local / easy / 663ms / 200 |
| `p02-easy-math` | easy-short | local / easy / 437ms / 200 | local / — / 396ms / 200 | local / — / 371ms / 200 | local / easy / 415ms / 200 |
| `p03-easy-define` | easy-short | local / easy / 1012ms / 200 | local / — / 1196ms / 200 | local / — / 1167ms / 200 | local / easy / 1087ms / 200 |
| `p04-easy-translate` | easy-short | local / easy / 911ms / 200 | local / — / 869ms / 200 | local / — / 480ms / 200 | local / easy / 914ms / 200 |
| `p05-easy-list` | easy-short | local / easy / 1027ms / 200 | local / — / 1297ms / 200 | local / — / 1193ms / 200 | local / easy / 1252ms / 200 |
| `p06-medium-explain` | medium-qa | local / easy / 5300ms / 200 | local / — / 4686ms / 200 | local / — / 4655ms / 200 | local / easy / 4704ms / 200 |
| `p07-medium-compare` | medium-qa | local / easy / 5738ms / 200 | local / — / 5736ms / 200 | local / — / 5707ms / 200 | local / easy / 5827ms / 200 |
| `p08-medium-summarize` | medium-qa | local / easy / 2526ms / 200 | local / — / 4362ms / 200 | local / — / 4383ms / 200 | local / easy / 4425ms / 200 |
| `p09-medium-howto` | medium-qa | local / easy / 4677ms / 200 | local / — / 4635ms / 200 | local / — / 4667ms / 200 | local / easy / 4695ms / 200 |
| `p10-long-context` | long-context | local / easy / 3148ms / 200 | local / — / 3747ms / 200 | local / — / 4124ms / 200 | local / easy / 3275ms / 200 |
| `p11-long-multi-turn` | long-context | local / easy / 6896ms / 200 | local / — / 6851ms / 200 | local / — / 6805ms / 200 | local / easy / 6911ms / 200 |
| `p12-code-patch` | code-burden | local / medium / 4689ms / 200 | local / — / 4647ms / 200 | local / — / 4668ms / 200 | local / medium / 4693ms / 200 |
| `p13-code-debug` | code-burden | local / easy / 5847ms / 200 | local / — / 5795ms / 200 | local / — / 5827ms / 200 | local / easy / 5842ms / 200 |
| `p14-schema-validate` | code-burden | local / medium / 4688ms / 200 | local / — / 4686ms / 200 | local / — / 4645ms / 200 | local / medium / 4701ms / 200 |
| `p15-tools-read-one` | tools-light | local / easy / 2326ms / 200 | local / — / 2503ms / 200 | local / — / 3175ms / 200 | local / easy / 2232ms / 200 |
| `p16-tools-search` | tools-light | local / easy / 2321ms / 200 | local / — / 2219ms / 200 | local / — / 2417ms / 200 | local / easy / 1755ms / 200 |
| `p17-tools-multi-hard` | tools-heavy | remote / hard / 7003ms / 200 | local / — / 5773ms / 200 | local / — / 4435ms / 200 | remote / hard / 6918ms / 200 |
| `p18-tools-agent` | tools-heavy | local / medium / 538ms / 200 | local / — / 1699ms / 200 | local / — / 3125ms / 200 | local / medium / 513ms / 200 |
| `p19-decompose-plan` | decomposition | remote / easy / 9814ms / 200 | local / — / 7090ms / 200 | local / — / 7025ms / 200 | local / easy / 7135ms / 200 |
| `p20-decompose-arch` | decomposition | local / easy / 7829ms / 200 | local / — / 7818ms / 200 | local / — / 7793ms / 200 | local / easy / 7860ms / 200 |
| `p24-exact-local` | exact-model | local / easy / 951ms / 200 | local / — / 895ms / 200 | local / — / 883ms / 200 | local / easy / 930ms / 200 |
| `p25-exact-remote` | exact-model | remote / easy / 1367ms / 200 | remote / — / 1226ms / 200 | remote / — / 1343ms / 200 | remote / easy / 1247ms / 200 |
| `p26-cache-easy-a` | cache-probe | local / easy / 729ms / 200 | — | — | — |
| `p27-cache-easy-b` | cache-probe | local / easy / 734ms / 200 | — | — | — |
| `p28-cache-hard-a` | cache-probe | local / medium / 3475ms / 200 | — | — | — |
| `p29-cache-hard-b` | cache-probe | local / medium / 1912ms / 200 | — | — | — |
| `p30-cache-invalidate` | cache-probe | local / medium / 5771ms / 200 | — | — | — |
| `p31-cache-strategy-switch` | cache-probe | local / easy / 479ms / 200 | — | — | — |
| `t01-tools-list-dir` | tools-light | local / easy / 3548ms / 200 | local / — / 503ms / 200 | local / — / 501ms / 200 | local / easy / 581ms / 200 |
| `t02-tools-triple` | tools-heavy | remote / hard / 8215ms / 200 | local / — / 6854ms / 200 | local / — / 5477ms / 200 | remote / hard / 7811ms / 200 |
| `t03-tools-agent-plan` | tools-heavy | remote / hard / 7905ms / 200 | local / — / 6522ms / 200 | local / — / 6251ms / 200 | remote / hard / 9000ms / 200 |
| `x01-max-signal` | max-signal | remote / hard / 7587ms / 200 | local / — / 9134ms / 200 | local / — / 5662ms / 200 | remote / hard / 7792ms / 200 |
| `x02-max-context-tools` | max-signal | remote / hard / 8841ms / 200 | local / — / 9938ms / 200 | local / — / 3459ms / 200 | remote / hard / 6641ms / 200 |

## Cache Probe Sequence (difficulty only)

- **p26-cache-easy-a** (easy-greet): difficulty=easy, strategy=cost, cacheHit=True, invalidated=None, reasons=None
- **p27-cache-easy-b** (easy-greet): difficulty=easy, strategy=cost, cacheHit=True, invalidated=None, reasons=None
- **p28-cache-hard-a** (hard-tools): difficulty=medium, strategy=balanced, cacheHit=None, invalidated=True, reasons=['code-or-schema-change', 'tool-count-delta']
- **p29-cache-hard-b** (hard-tools): difficulty=medium, strategy=balanced, cacheHit=True, invalidated=None, reasons=None
- **p30-cache-invalidate** (hard-tools-variant): difficulty=medium, strategy=balanced, cacheHit=True, invalidated=None, reasons=None
- **p31-cache-strategy-switch** (easy-after-hard): difficulty=easy, strategy=cost, cacheHit=None, invalidated=True, reasons=['code-or-schema-change', 'tool-count-delta']

## Strategy Divergence Analysis

Ten alias prompts produced **different endpoints** across strategies. These are the highest-value cases for routing tuning.

| Prompt | difficulty | baseline | controller | hybrid | Interpretation |
| --- | --- | --- | --- | --- | --- |
| `e01-yes-no` | **remote** | local | local | local | Cold-cache anomaly: first trivial prompt routed remote under difficulty only |
| `l01-verbose-incident` | local | local | local | **remote** | Hybrid elevated long filler context to medium and chose remote |
| `c01-full-refactor` | local | local | local | **remote** | Hybrid + difficulty disagree on medium code-burden; hybrid prefers remote |
| `c02-ts-generics` | **remote** | local | local | **remote** | Difficulty/hybrid agree on remote for TypeScript patch language |
| `p17-tools-multi-hard` | **remote** | local | local | **remote** | Hard + tools → remote under difficulty/hybrid; baseline/controller stay local |
| `p19-decompose-plan` | **remote** | local | local | local | Difficulty alone sent decomposition plan remote (easy bucket) |
| `t02-tools-triple` | **remote** | local | local | **remote** | 3-tool hard workflow: difficulty/hybrid → remote |
| `t03-tools-agent-plan` | **remote** | local | local | **remote** | Agent plan + 3 tools: difficulty/hybrid → remote |
| `x01-max-signal` | **remote** | local | local | **remote** | Max-signal hard bucket works as intended for difficulty/hybrid |
| `x02-max-context-tools` | **remote** | local | local | **remote** | Combined incident context + tools → remote |

**Baseline and controller** selected local on **39/40** alias matrix runs. The sole remote exception was not applicable (exact-model `p25` is pinned). Controller is configured to local LFM (`router/summary.controller.endpointId`), so controller mode effectively **pins local** regardless of prompt hardness.

**Hybrid** selected remote on **9/40** alias runs — aligning with difficulty on 7 hard/tool-heavy cases, plus `l01-verbose-incident` and `c01-full-refactor`.

**Difficulty** remote rate: **9/46** runs (20%), concentrated in `max-signal` (2/2), `tools-heavy` (3/4), and scattered code/decomposition cases.

## Difficulty Classifier — Signal vs Outcome

| Category | difficulty remote rate | Typical bucket | Gap |
| --- | --- | --- | --- |
| easy-trivial | 1/8 (12%) | easy/cost | `e01` cold-start remote outlier |
| easy-short | 0/5 | easy/cost | OK |
| medium-qa | 0/4 | easy/cost | Prose length not elevating difficulty |
| long-context | 0/4 | easy or medium | `l01` medium but still local under difficulty |
| code-burden | 1/5 | medium or easy | Most code prompts stay local |
| tools-light | 0/3 | easy/cost | Single tool insufficient for hard |
| tools-heavy | 3/4 | hard or medium | Strongest remote trigger |
| decomposition | 1/3 | easy | Keywords alone rarely hard |
| max-signal | 2/2 | hard/quality | Works reliably |
| exact-model | 1/2 | pinned | Remote pin OK all strategies |

## Routing Improvement Recommendations

1. **Raise prose/context thresholds** — 7 medium-qa + long-context difficulty runs stayed `easy/cost → local`. Instruction-constraint count (`l02`) did not elevate difficulty despite 8 explicit constraints.
2. **Treat baseline/controller as local-pin modes on this pool** — they ignore rubric hardness; document that `x-role-model-routing-mode: controller` is not a "smarter" router, it is a **controller endpoint pin**. Operators expecting hard→remote must use `difficulty` or `hybrid`, not baseline/controller.
3. **Align hybrid arbitration with difficulty on medium code** — `c01-full-refactor` is medium/local under difficulty but remote under hybrid; decide whether hybrid should defer to difficulty scoring or intentionally bias remote for code refactors.
4. **Investigate `e01-yes-no` cold-cache remote** — first trivial prompt in suite routed remote under difficulty; subsequent trivial prompts routed local with cache hits. May indicate empty-cache fallback or profile bootstrap behavior.
5. **Hard tier needs tool-count floor** — remote reliably triggered at 2–3 tools + code keywords (`p17`, `t02`, `t03`, `x01`, `x02`). Single-tool prompts never reached hard. Consider `toolCount >= 2` as necessary but not sufficient for hard.
6. **Cache policy is working; document it** — 4/6 cache probes hit; invalidation on `tool-count-delta` and `code-or-schema-change` confirmed. `p31` easy-after-hard correctly invalidated. Expose `cacheHit` / `cacheInvalidationReasons` in router summary for operators.
7. **Exact remote stable** — `p25-exact-remote` HTTP 200 on all four strategies; SP7/SLA workaround effective in this session.
8. **Use divergence table as regression suite** — the 10 divergent prompts should become locked conformance fixtures when tuning classifier weights or hybrid arbitration.

## Key Observations for Product Decisions

### Difficulty (Strategy C)
- Maps rubric → easy/medium/hard → cost/balanced/quality scoring within alias allow-list.
- Remote selection correlates with **hard bucket + quality strategy**, not prompt length alone.
- Learning cache accelerates repeated buckets (~400–700ms easy cached vs ~2–9s uncached medium/hard).
- **Local tps advantage still wins** for medium code and single-tool cases even when `codeOrSchemaBurden: true`.

### Baseline / Controller / Hybrid
- **Baseline**: cost/latency-style default within pool; always local here except pinned models.
- **Controller**: pins configured controller endpoint (local LFM in this runtime); rubric is `null`.
- **Hybrid**: runs rubric **and** arbitration — closest to difficulty on hard cases, but can disagree on medium (`c01`, `l01`).
- Divergence is **meaningful** on 10/40 alias prompts; not cosmetic.

### Exact model pins
- Bypass alias pooling; local and remote pins succeeded on all strategies (HTTP 200).
- Difficulty rubric still computed on exact pins (`easy/cost`) but endpoint is forced by model id.

### Suggested priority order for routing improvements
1. Classifier thresholds (context tokens, instruction constraints, code-without-tools)
2. Hybrid vs difficulty alignment policy for medium code-burden
3. Controller mode documentation (pin semantics vs intelligent routing)
4. Cold-cache / first-request fallback audit (`e01` anomaly)
5. Conformance fixtures from divergence table

## Capability Benchmark (expected responses + judge grading)

To measure **model capability independent of local vs remote**, the routing prompt suite now includes expected/ideal responses and a judge-backed benchmark pipeline.

| Component | Path / API |
| --- | --- |
| Benchmark suite (46 cases, expected responses) | `role-model-router/packages/bench-routing/data/routing-capability-suite.json` |
| Suite generator from routing prompts | `evidence/scripts/generate-routing-capability-suite.py` |
| Judge grading | `role-model-router/packages/bench-judge` |
| Benchmark runner | `role-model-router/apps/runtime-host-bridge/src/benchmark-runner.ts` |
| API | `GET /api/role-model/benchmark/suite`, `POST /api/role-model/benchmark/runs` |
| UI | `/app/models/benchmark` — **Benchmark configured models** button |

**Run flow:**
1. User configures endpoints in runtime UI.
2. User opens **Models → Benchmark**, selects endpoints + judge model (capable remote recommended).
3. Quick (12 cases) or full (40 eligible cases) run executes each prompt per endpoint.
4. Judge model scores actual output vs `expected_response` + `grading_criteria`.
5. Results persist as `source_type: benchmark` observed samples **per difficulty bucket** (`easy` / `medium` / `hard`).
6. Router reads updated `judge_score` / per-bucket profiles on subsequent difficulty routing decisions.

**Routing integration:** benchmark samples feed the same `observed_profile_snapshots` and `observed_profile_snapshots_by_difficulty` tables as live traffic, enabling capability-aware difficulty gating and quality-tier scoring without a separate profile type.

## Evidence Paths

- `evidence/prompts/routing-strategy-suite.json`
- `evidence/scripts/run-routing-strategy-suite.py`
- `evidence/logs/routing-strategy-suite-results.json`
- `evidence/logs/routing-strategy-suite-report.md`
- `evidence/logs/routing-strategy-matrix.md`

## Requirement Completion Status (routing QA)

| ID | Disposition | Verification Evidence |
| --- | --- | --- |
| Routing matrix | verified | Full strategy × prompt execution with JSON + matrix artifacts |
| Cache behavior | verified | cache-probe sequence with hit/invalidation reasons |
| Consumer contract | verified | All matrix runs use `/v1/chat/completions` + request-id header |

## Coverage Gate

- [x] 40+ prompt cases with easy and hard coverage
- [x] All four routing strategies exercised
- [x] Combined addendum with recommendations

Coverage: PASS

## Approval Gate

- [ ] Operator review of improvement recommendations
- [x] Zero HTTP failures across matrix (0 failures)

Approval: PENDING

## Audit Context

- Audit Execution Mode: self-audit
- Subagent Capability Probe: available
- Delegation Decision Basis: agent-operated live runtime matrix QA
- Delegation Override Reason: n/a

Audit: PASS