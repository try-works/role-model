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
