## S2 paired acquisition — stopped at disk gate (exact results)

**Verdict: disk preflight FAILED → captured paired pin-assertion RED, stopped before clone/build/pin changes.** No commits, children, goals, providers, or operator ports.

### Disk gate (checked 2026-10-24T11:29:40.938Z)
| | free bytes | free MiB | required | result |
|---|---|---|---|---|
| C: | 87,453,696 | 83.4 | 268,435,456 (256 MiB) | **FAIL** |
| D: | 2,008,248,320 | 1915.2 | 1,073,741,824 (1 GiB) | PASS |

Gate result: **FAIL** (`C < 256 MiB`). Final re-check: C 76 MiB, D 1915 MiB. No clone/sync, no build, no pin or wrapper change, no deletion of user data.

### Strict-TDD RED — paired maintained pin tests
New `scripts/vendor-upstream.test.mjs` in each repo (`node:test`), asserting the five surfaces: VENDORED tag, VENDORED commit, vendored upstream package version, wrapper version, `vendor-upstream.mjs` default tag/commit.

| repo | command | exit | tests | pass | fail | assertion-level |
|---|---|---|---|---|---|---|
| public | `node --test scripts/vendor-upstream.test.mjs` | **1** | 5 | 0 | 5 | true |
| private | `node --test scripts/vendor-upstream.test.mjs` | **1** | 5 | 0 | 5 | true |

Exact failures (both repos): tag `effect@4.0.1` ≠ `effect@4.0.6`; commit `460272d30457f4697d8b8c52cad41caccbcace08` ≠ `3b28bf686bf26e9700edd39c025aff2744dc5303`; upstream package `4.0.1` ≠ `4.0.6`; wrapper `4.0.1` ≠ `4.0.6`; source default pin `effect@4.0.1 / 460272d3…` ≠ target pair.

Test SHA-256: public `374c86aaa0badccefd9305c963b93c15fa0404b88e542ce59370ba4385157d8d`; private `66292108f5d67858fcf233c958ea8b5d072d9cf02139af77ca21cdc578f10a2f`. Node v24.11.0, model deepseek-flash.

### Baseline preserved (`--verify` exit 0 in both)
- Pin: `effect@4.0.1`, commit `460272d30457f4697d8b8c52cad41caccbcace08`, commitDate `2026-10-04T21:47:48Z`
- Bytes/digest: **1878 files, 40,357,638 bytes (38.5 MB), `sha256:0d0028aa7de72ff9e6a8e39f4bc4232640bd1111b30aaa3440d0c53116a49749`**
- Wrappers at `4.0.1`: public `role-model-router/packages/effect/package.json`, private `shared/effect/package.json`; SQL wrappers also `4.0.1` and untouched.
- Source script default pin unchanged (`git diff` shows no edit).

### Source IDs
`locked02planf79220f` / lock hash `f79220f73c04a8a8c97c8ef7c4c3d1a3e6b1ddd058d9bc151ecdf4e2fe9bfcc1`; public `run115baselinef0d50fab` HEAD `f0d50fab083e`; private `baseline16021cc5` HEAD `16021cc5f87f`.

### Writes performed
Only `scripts/vendor-upstream.test.mjs` plus evidence in each repo: `evidence/logs/s2-public-pin-red.log`, `s2-public-vendor-verify-before.log`, `s2-private-pin-red.log`, `s2-private-vendor-verify-before.log`, and `evidence/other/s2-acquisition.json` (both, JSON parses; status `BLOCKED_DISK_PREFLIGHT`).

**Not performed:** vendor sync, `effect@4.0.6` bytes, wrapper version/description, SQL manifests, `build.mjs`, smoke tests, GREEN, root/lock edits. **Build warnings:** none observed — builds were not run.

Public `git diff` still shows only pre-existing controller edits (`package.json`, `pnpm-lock.yaml`, `scripts/ci-workflow.test.mjs`), present before this slice and untouched by me; private `git diff` is empty. Root/lock stayed frozen.

**Resume condition:** free C: to ≥ 268,435,456 bytes, then run the sync/build/GREEN sequence; the RED tests are already in place and intentionally failing on the 4.0.1 baseline.
