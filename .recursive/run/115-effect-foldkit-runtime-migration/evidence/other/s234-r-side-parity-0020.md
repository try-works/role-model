# S234 R-side parity measured against the released 0.0.20 production package

Previous parity evidence was D-vs-C (pre-migration commit vs current) with R "dated" because a
production candidate was needed. A production-channel package of **0.0.20** was already on this machine
(`E:/rm-tmp/r-stage/role-model.exe`, built 2026-10-16, commit `945a8906`, channel `production`), so the
R side could be measured today without a Run 88 dispatch.

## Command

    node scripts/runtime/compare-release.mjs \
      --left-exe role-model-router/dist/release/win32-x64/role-model-dev.exe --left-port 6271 \
      --right-exe E:/rm-tmp/r-stage/role-model.exe                              --right-port 6272 \
      --fixture-root testdata/router-runtime/fixtures --allow-cross-channel `
      --expect-left-version 0.0.20-231-gd61c32dc --expect-right-version 0.0.20

`--allow-cross-channel` was passed **explicitly**: a dev candidate and a production package legitimately
differ on channel-carrying surfaces, and the tool must not hide that behind a classification.

## Result

    same               /api/role-model/models
    same               /api/role-model/endpoints
    same               /api/role-model/router/summary
    same               /api/role-model/operator/learning
    same               /api/role-model/operator/replay/jobs
    same               /api/role-model/operator/evaluation/jobs
    shape-delta        /healthz                        (+ runtime.release_id, + runtime.private_distribution_sha256)
    shape-delta        /api/role-model/runtime/summary (+ runtime.release_id, + runtime.private_distribution_sha256)
    environment-state  /api/role-model/telemetry/summary (fresh hosts, no traffic)

    {"shape-delta":2,"same":6,"environment-state":1}    exit=0

**Zero `different`.** The only structural difference is two keys ADDED to health/summary by this run
(`release_id`, `private_distribution_sha256`) - additive fields, not changed behaviour.

## What this does and does not establish

| Claim | Status |
|---|---|
| released 0.0.20 production API vs dev candidate 0.0.20-231: no behaviour differences | **verified for these 9 surfaces** |
| R leg fully closed | **no** - Run 88 package identity is a separate requirement; this package is a real 0.0.20 production build, not the Run 88 artefact |
| D-vs-C at 188 (7 same, 2 environment-state) | unchanged, still valid for its build |

## Note on the two added keys

They appear on the dev side only. Both are informational identity fields; a consumer that requires an
exact key set would see a difference. Recorded rather than dismissed, because "additive" is a judgement
about intent, not a fact about the diff.