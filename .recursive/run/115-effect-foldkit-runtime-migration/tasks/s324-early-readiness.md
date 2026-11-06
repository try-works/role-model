# S324 — B6/R27 early-readiness owner (LANDED)

Scope: composition-dag.ts readiness owner + Server admission gate; index.ts startBridgeServer/lifecycle readiness threading; cli.ts readinessOwner creation + markReady/markFailed mirroring + lifecycle pass; test/**.

Contract: DAG Readiness service (pending -> ready | failed, first terminal wins, branded, no fallback) consumed by the Server admission gate before the handler with the exact existing 503 body; host readback gate index.ts:17525-17540 byte-unchanged; production cli marks transitions and threads the owner through the startBridgeServer lifecycle.

Evidence: RED s324-red.log 5/5 failed; GREEN s324-green.log 6 files / 33 tests; tsc exit 0. Admission tests: "server admission is refused with the existing 503 shape while pending, served after ready"; "failed readiness is refused with the message and static UI assets stay allowed"; transitions + no-fallback test. Lint: DAG 174 findings {"no-unknown-parameters":3,"no-runtime-typeof":1,"require-safety-comment-for-type-assertion":165,"no-unsafe-dictionary-type":2,"no-unknown-returns":2,"no-known-value-widening":1}; test findings. Hashes: composition-dag 8DE6B433..., index 51A1F69B..., cli 558AB4C6..., test 420C8E33.... Backups E:/rm-tmp/s324.
## S324 lint classification (final)

- composition-dag.ts: **161 findings** = 159 require-safety-comment-for-type-assertion (the moved-boundary cast set: production options/wires composed before S324) + 2 no-unknown-returns (boundary projections). No readiness/gate finding remains: the WeakSet branding removes the runtime typeof + unsafe dictionaries; gate request/response use named structural reads with SAFETY comments; body is typed by construction; no unknown-parameters; no known-value widening (state seeded from a typed pending constant).
- test/s324-readiness.test.ts: **CLEAN** (0 findings) via anti_slop_lint with the repo-relative target; all seven casts carry SAFETY comments and TestRequest/TestResponse/Captured types replace unknown parameters. (Note: the tool's absolute-path invocation errors with "invalid output: value is not lossless JSON" on this file; the repo-relative invocation returns clean.)
- No suppressions or config changes.
- GREEN s324-green2.log: 6 files / 33 tests; tsc exit 0. Hashes: composition-dag 58F37F2F..., test 45AA285B..., cli 558AB4C6..., index 51A1F69B....
## S325 repair (LANDED)

1. BYTE-FOR-BYTE 503: shared `startupReadinessRefusalBody(state)` in composition-dag.ts renders the host's exact bytes — field order error,status,message (message only when truthy), JSON.stringify + trailing newline — and both the DAG admission gate and the host gate (index.ts:17533-17539, now writeText with the shared body) use it. Test: "readiness refusal bytes match the host gate exactly for pending/failed/ready" (literal bytes for pending/failed, falsy-message omission, ready served).
2. STATIC-UI POSITIVE: test "failed readiness with staticRoot: static assets are SERVED while /api and /v1 return 503" — GET /app.js served (handler ran), /api/status and /v1/chat return 503.

RED s324-red3.log: 1 failed (byte test) + static test passing pre-existing; GREEN s324-green3.log: 6 files / 35 tests; tsc exit 0. Hashes: composition-dag EFFD4003..., index DC999129..., test D10ADDE8..., cli 558AB4C6... Lint: DAG 162 {"no-conditional-empty-object-spread":1,"no-unknown-returns":2,"require-safety-comment-for-type-assertion":159}; test clean 0 (repo-relative target).
## S325 repair (final)

1. EXACT 503 BYTES: startupReadinessRefusalBody in composition-dag.ts emits error,status,message in host order (message omitted when falsy) + JSON.stringify + trailing newline; DAG gate and host gate (index.ts:17533-17539) both call it (host via writeText). Test: "readiness refusal bytes match the host gate exactly for pending/failed/ready".
2. STATIC-UI POSITIVE: "failed readiness with staticRoot: static assets are SERVED while /api and /v1 return 503" (staticRoot override; /app.js served, /api/status and /v1/chat 503).

RED s324-red3.log 1 failed; GREEN s324-green3.log 6 files / 35 tests; tsc 0. Hashes: composition-dag 25E7C1AD..., index DC999129..., cli 558AB4C6..., test D10ADDE8.... Lint: DAG 161 (159 require-safety + 2 no-unknown-returns), test CLEAN (repo-relative target).
## S325 lint micro-repair

- SAFETY comments added above the four bare casts at test/s324-readiness.test.ts:139,179,185,186 (test-only structural casts).
- anti_slop_lint (repo-relative test target) = CLEAN (0 findings). tsc exit 0; 6 files / 35 tests GREEN (s324-green4.log). Test hash 06269245....
