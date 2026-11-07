# S662 - R38 fixed-workload budget matrix (draft for owner approval)

R38 requires fixing measured workload/hardware/fixture identity and approving thresholds BEFORE
pilot, then measuring startup/chunk/parse/first-chart/update/repeated-mount heap and backend
quiet/burst/degraded/collector-down latency/blocking/cancel/handles/lock/rollback.

## Fixed workload / hardware / fixture identity
- Candidate: 0.0.20-761-g3f7779fb (exe sha256 5e0810c0..., public tree 172fab4c, private manifest 7cc4b103...).
- Hardware: owner Windows 11 dev machine (the packaged verify runs on this host); E: staging store.
- Fixture: testdata/router-runtime/fixtures (the packaged verify seed) + the real DeepSeek endpoints for routing.
- Workload: the 12-journey packaged verify (health/models/telemetry/controller/learning/replay/eval/ui css/ui bundle/ui theme/chat completion/ui shell) plus the diagnostics + shell-registry legs.

## Proposed thresholds (for owner approval)
| Metric | Proposed threshold | Basis |
|---|---|---|
| ui bundle (raw) | <= 4.0 MB | current 3.73 MB (verify PASS) |
| ui css | <= 100 KB | current ~68 KB |
| first chart render | <= 1.5 s | React-free SVG pilot; needs measurement |
| repeated-mount heap growth | <= 8 MB over 20 mounts | to measure |
| startup (healthz ready) | <= 30 s | bounded; to measure |
| backend quiet latency (readback) | p95 <= 250 ms | to measure |
| open handles after stop | 0 leaked | to measure |
| cancel latency (benchmark cancel) | <= 1 s | R27 runner gate |
| rollback DB preservation | byte-identical | R37 db-preservation (15 files, aggregate ab462ccd) |

## Measured now (packaged verify, single fork)
- ui bundle 3.73 MB, ui css 68 KB, theme boot, chat completion 56 tokens — PASS (final-verify.log).
- diagnostics packaged browser receipt (stale/dropped/build-missing/cause.fail) — PASS (r21).
- R37 DB preservation aggregate identical before/during/after shell switch — PASS.

## Remaining to measure (requires approval + time)
- raw/gzip startup, lazy-chunk split, parse/first-chart/update/repeated-mount heap (browser instrumentation).
- backend burst/degraded/collector-down latency/blocking/cancel/handles/lock load (load harness).
- rollback reader/state matrix beyond the shell-switch DB hash.

DISPOSITION: PARTIAL — identity fixed and thresholds proposed; full measurement requires owner
approval of the thresholds and a load harness. No PASS is claimed until the owner approves and the
degraded/rollback legs are measured.
## Measured live (2026-11-07, real models on :3480)
End-to-end latency (p50, live telemetry) and estimated cost per request:
- deepseek-flash: ~1.0-2.2 s; deepseek-v4-pro: ~0.5-1.0 s (both sub-second-to-2 s, cheapest ~$1e-5).
- kimi-k2.6 ~3.0 s, kimi-k2.7-code ~2.3 s, kimi-k3 ~4.3-5.4 s (~$0.001-0.004/request).
- OUTLIER (recorded): one kimi-k2.7-code benchmark case took 613,708 ms (~10.2 min); a second
  kimi-k3-high case took 18,423 ms. No per-case timeout exists, so provider latency is unbounded
  (see the R27 timeout finding in s667).
- ui bundle main.js = 3,739,830 bytes (~3.73 MB) at HEAD (S664-S668 client).

## Implication for the threshold matrix
- The "backend quiet latency" threshold must be a p95 that tolerates a long tail; the 10-minute
  kimi outlier shows the current runner has no ceiling. A per-case timeout (e.g. 180 s) plus a
  p95 latency budget (e.g. <= 60 s) is proposed as part of R38/R27 closure.

DISPOSITION: PARTIAL — identity fixed, thresholds proposed, live latency/cost measured; approval
plus the burst/degraded/rollback legs remain owner-gated.
## Burst leg measured (2026-11-07, real model)
6 concurrent POST /v1/chat/completions to deepseek/deepseek-flash (max_tokens 30):
- 6/6 HTTP 200, 0 failures, wall 4.5 s, p50 2.8 s, p95 4.3 s (real token usage per request).
This is the "burst" leg of the R38 backend budget; the degraded/collector-down legs still need an
operator-approved fault harness.

## R39 workflow verification (2026-11-07)
node --test scripts/r39-workflow-flags.test.mjs -> 7/7 PASS, including "the advisory flag can be
flipped to blocking" and "every --flag the workflow passes exists". .github/workflows/build-binaries.yml
gates each R39 step with continue-on-error: ${{ vars.R39_VERIFY_BLOCKING != 'true' }} and the guard
code throws when a required R39 step "did NOT RUN" while blocking. So R39's mechanical half is
verified; only the GitHub repo variable flip + one dispatch run remain (owner-gated).

## OWNER APPROVAL (2026-11-07)
The owner approved the s662 threshold matrix ("approve s662"). R38 is approved; the remaining R38 work
is the degraded/collector-down measurement legs, which now proceed against the approved budget.
