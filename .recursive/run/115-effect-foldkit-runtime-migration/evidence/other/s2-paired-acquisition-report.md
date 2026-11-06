# S2 paired Effect 4.0.6 acquisition — completed

**Verdict: COMPLETE.** Both repos moved from effect@4.0.1 to effect@4.0.6 (`3b28bf68`) with identical vendored bytes, verified twice, wrappers built, pin guards GREEN. No commits, installs, providers, operator ports, root or lockfile edits.

## Disk gate (PASS)
| | free bytes | required | result |
|---|---|---|---|
| C: | 1,000,808,448 | 268,435,456 | PASS |
| D: | 1,281,925,120 | 1,073,741,824 | PASS |

TMP/TEMP = `E:/dsh-tmp/run115-s2` (verified `os.tmpdir()` = `E:\\dsh-tmp\\run115-s2`), so the clone and tar extraction landed on E:. Final gate: C 988,094,464 / D 1,900,113,920.

## Paired vendor payload
| | before (4.0.1) | after (4.0.6) |
|---|---|---|
| tag / commit | effect@4.0.1 / 460272d3 | effect@4.0.6 / 3b28bf68 |
| commit date | 2026-10-04T21:47:48Z | 2026-10-22T02:35:18Z |
| files / bytes | 1878 / 40,357,638 | 2155 / 48,043,592 |
| content digest | 0d0028aa…49749 | 7c725625…24702 |

The after-digest is identical in public and private (paired consistency). `--verify` exit 0 before and after in both.

## Pin guards
| repo | before | after |
|---|---|---|
| public | exit 1, 5/5 fail (tag/commit/version/wrapper/default) | exit 0, 5/5 pass |
| private | exit 1, 5/5 fail | exit 0, 5/5 pass |

Guard files untouched: public sha256 `374c86aa…`, private `66292108…`.

## Wrapper builds (direct, no installs)
- public `node role-model-router/packages/effect/build.mjs` → exit 0, 167 entries, 1 warning.
- private `node shared/effect/build.mjs` → exit 0, 166 entries, 1 warning.
- Warning (both): `Cannot find base config file "../../tsconfig.base.json"` from the vendored `packages/effect/tsconfig.json` — pre-existing source-only vendored tsconfig warning; not a full-target typecheck claim.
- Public has one extra entry key, `http-api/HttpApiGroup/`, from a prose reference; the same prose exists in the 4.0.1 HEAD tree, so this is pre-existing public `entries.mjs` behaviour and was not touched.

## Consumer suites (selected)
- public: 5 host-bridge files, **46/46 pass**, exit 0 (observability, queue cancel/drain, attempt timeout, Effect entry case, stream commit).
- private: 7 files, **53/53 pass**, exit 0 (durable queue 18, evaluation score queue 6, Effect entry case 3, run88 observability, run115 queue/drain/event-log 20).

## Files changed (sha256)
Public: `scripts/vendor-upstream.mjs` d9ae8df8…, `role-model-router/packages/effect/package.json` 2c1fa075…, `vendor/effect/VENDORED.json` c6efdd3e…, `vendor/effect/PROVENANCE.md` ac6edbf2…, payload tree 7c725625….
Private: `scripts/vendor-upstream.mjs` d9ae8df8…, `shared/effect/package.json` 869b4cdd…, `vendor/effect/VENDORED.json` 561069441…, `vendor/effect/PROVENANCE.md` 2d94efe8…, payload tree 7c725625….

## SQL wrapper follow-up (controller-approved)
Both SQL wrappers were bumped 4.0.1 -> 4.0.6 (version + description only):
- public `role-model-router/packages/sql-sqlite-node/package.json` sha256 `2e1af24353a590299bce98493b50a8a017387520ed4ec0b4c561a59fa9ca76b1`
- private `shared/sql-sqlite-node/package.json` sha256 `59c36535f0c48c23305fae26b2aeba9088d74646289b31d8a775b90c3df38d03`
Builds (existing build.mjs, no installs): public exit 0 / PASS / entries ["index"]; private exit 0 / PASS / entries ["index"]; one warning each (pre-existing vendored `vendor/effect/packages/sql/sqlite-node/tsconfig.json:3` missing-base-config). Logs: `evidence/logs/s2-sql-build-{public,private}.log`.
SQL consumer suites found by glob: public `run101-r2-public-queue-store.test.ts` 4/4 pass exit 0; private `tests/track-b/run101-r2-queue-store.test.mjs` 5/5 pass exit 0. Logs: `evidence/logs/s2-sql-suite-{public,private}.log`.

## Pin-disagreement scan — none
All first-party `effect` / `@effect/*` dependency entries in both repos are `workspace:*` (public 55 manifests, private 17; checked dependencies/peerDependencies + a text scan for 4.0.0-4.0.5 literals). No other first-party package pins an `@effect/*` version string that disagrees with the 4.0.6 payload, so the list is empty and nothing else was edited.
