# Phase 00 Requirements Re-Audit — attempt02

**Scope.** Read-only independent re-audit of `00-requirements.md` (R1–R39) for Phase 00 only. No edits, file writes, child workers, goals, provider/runtime calls, or implementation/verification claims were made.

## 1. Read-only verification performed

- Requirements artifact hash: `833440a5ef525ef9846a3852f66452be438c084ddc521eb130b19b6b2060bce3` — matches the bundle. Verified in both public and private run trees.
- `source-proposal.md` hash: `870fa27fbc2ebe277c633ba539073037a2b330ac411c61b661804e7779be534c` — unchanged in both trees. Full 1,357-line source read.
- Public root: `f0d50fab083e3fe8daf2474cd9fb08b51066c8e1`, tree `b3d5cf91435faad39d11a0dc1d65f54d8668cc2e`.
- Private root: `16021cc5f87f60f2d01338a29adf0002da5e8327`, tree `18a0e994ed3330293c8bb61931dbf44834172f41`.
- `git diff --name-only` is empty in both roots; `git status --porcelain` shows only the untracked run directory. No addenda files exist.
- Route evidence: 3 recorded requests, all provider `deepseek-official` / model `deepseek-flash` (`actual-request-routes.json`).
- Release-workflows log: 57/57 passed. Private source-seal log: 1/1 passed.
- Reviewed attempt01 findings, controller repair disposition, reconciliation map, both baseline receipts, preserved worktree prework, dispatch policy, identities, and applicable `RECURSIVE.md` audit/lock sections.

Attempt01 findings F1–F13 are substantially addressed: exact worker-route verification, commit/tree/hash re-pin, expanded R36 controller/evidence contract, R16 five-way delta policy, R33 negative checks and ledger fields, R27 no-stochastic-dedup, R23/R28/R30 storage/queue invariants, R14/R15/R18/R39 live/harness/command requirements, exact R4/R6/R7 pins, correctly open E1/E2, chart budgets, R3 characterisation exception, and runtime-ui-only React cutover. F14 is only partly closed.

## 2. Remaining content omissions

These are explicit source obligations without enforceable acceptance in the current draft. They are source-derived, not new requirements.

| # | Requirement | Source | Missing acceptance | Finite repair |
|---|---|---|---|---|
| F1 | R20 `00-requirements.md:182-184` | `source:1076-1079,1081-1082` | No concrete bounded record/byte/ingress/formatting/TTL/query limits; no single reporting owner at the request/job/lifecycle edge after finalizers; no compile-against-target `ErrorReporter`/`Cause` API requirement; no hostile/cyclic/nested/reused-error or sink-overflow/exporter-outage test requirement. R20’s “bounded” is not defined. | Add one B1 acceptance bullet containing those four obligations. |
| F2 | R21 `:190` | `source:1083-1089,1187-1189` | Does not explicitly require “never trust forwarded owner headers or wildcard CORS,” no-telemetry-contamination, an injected-defect test, or preservation of the existing observability/store-degradation pages. Peer/trust/Host/Origin tests do not fully cover these negatives. | Add security-negative and coexistence/injected-defect acceptance. |
| F3 | R26 `:226`; R12 `:122` | `source:1115-1123` | “Exact per-operation retry” does not state the 250/1000/2500/5000 ms schedule or the distinct typed idempotent aggregate timeout; no async-span rule; no lossless downstream backpressure; no token-vs-refresh buffer distinction. R12 has gap/snapshot resync but not the rule that token streams cannot share the refresh buffer. | Add exact retry/timeout, span, backpressure, and token/refresh-buffer acceptance. |
| F4 | R29 `:249` | `source:1151-1155` | Only partial acquire, committed-vs-postcommit, and restart/recovery are named. Missing stale leases, interrupted maintenance, failed ack/late completion, corruption/decryption, restore, partial publication, and preserved recovery receipts. Committed-append masking is only partly implied. | Add the B7 failure matrix and recovery-receipt requirement. |
| F5 | R32 `:271` | `source:1176-1179` | Missing B9’s readline readiness, ephemeral auth, timeouts, post-acquire endpoint rejection, partial-startup child release, bounded pagination, missing-vs-unavailable joins, live/probe/evaluation classification, codec/externalization limits, and incremental-compatibility rule. “Answering port” is not recorded as insufficient proof. | Expand R32 with the B9 lifecycle and compatibility invariants. |
| F6 | R25 `:218-220` | `source:1107-1113` | Does not require the alternative of a separately named producer with a tested compatibility adapter, does not state that returning `Effect` changes the sync signature, has no protocol-routing `runSync` edge rule, and does not preserve reason-code values/order (“code/detail wire projection” is not sufficient). | Add B4 signature/compatibility/reason-code acceptance. |
| F7 | R5 `:66-68`; R27 `:233-235`; R32 `:271` | `source:1041-1042,1053-1059` | The §15.2 boundary rules remain split/incomplete: no single acceptance requires separate Effect runtime identities, validated DTOs rather than raw Causes/Layers/Fibers, no nested `runPromise` inside domain services, and a pure kernel with no fetch/SQL/clock/random. R5 covers leaf Layer/MemoMap and per-request graph; R32 covers DTO/auth only. | Add one cross-cutting §15.2 acceptance bullet (extend R27/R32). |
| F8 | R37 `:311-313` | `source:843-846` | Covers React/UI rollback and compatible schema/pending work, but not Effect-pin rollback: restore the reviewed previous pin/tooling and matching wrapper graph, rebuild the matched public/private/UI closure, verify schema-reader compatibility and pending/persisted work, and never run a rebuilt old binary against new state. | Add an Effect-pin rollback bullet to R37. |
| F9 | R17 `:160-162` | `source:664-698` | J1–J6 are named but their per-journey assertions are not acceptance: tool_call_id/ordered relationships, no hung spinner/false success/double accounting, eligible reason codes and live-only exclusion, sockets not surviving restart, configured arms/no inserted fake rows, and disabled/unavailable named. Also missing live/probe/evaluation classification and headline-inclusion rules, and complete source-to-projection chain sampling. | Add per-journey acceptance or explicitly incorporate the source J1–J6 matrix and traffic-class rules. |

**Narrower remaining omissions**

- **R31 `:264`** — `source:1168-1174`: no no-egress sandbox/process-tree/time/output/workspace limits, versioned profile publication, late-ack checks, or explicit “not a second learner.”
- **R14 `:136-138`** — `source:513-516,527,531-547,474-475`: no packaged-lane-twice requirement (React and Foldkit, same fixture backend/scenario), no explicit retention/reuse of `runtime:validate-ui`, and no zero-perceptual-pixel/carets/scrollbars/`networkidle` comparator detail.
- **R16 `:152-154`** — `source:642-649`: R-reference isolation is under-specified. Missing isolated copy/staging preserving bytes, unused loopback ports, independent config/state/log/lock, owned process, supported launch overrides, stop-if-isolation-fails, no shared writable SQLite, and consistent backups. R38 ports/roots covers only part.
- **R33 `:280`; R7 `:84`** — `source:1011-1013`: general anti-slop lint for changed first-party backend slices is absent; R7 covers only adapted component source. No “do not bulk-fix legacy files / do not delete security checks / leave vendor untouched” acceptance.
- **R2 `:42`** — `source:863-890`; bundle `:9,:21`: the “when normal tool policy is disabled” qualifier remains stale/ambiguous against the verified per-launch overlay and ordinary/process-worker authorization. The rest of R2’s per-worker route/header/config/session/job/output/controller-verification and NOT RUN/no-fallback acceptance is correct.

## 3. Draft prerequisite gaps vs content defects

- **E1/E2 remain correctly open.** R34/R35 and `:335,:342` record the unresolved owner choice and prohibit destructive tiering/live-admission changes. This is not a content defect, but it independently prevents a final lock PASS under source §16 and the bundle instruction.
- **No canonical `00-worktree.md` is not counted as a defect.** Per the bundle and sequencing repair, only Phase 00 Requirements is active; the preserved prework is factual baseline evidence.
- **Audit/lock scaffolding is not yet in the artifact.** The draft has no `Audit:` line, `## Audit Context`, `## Worktree Diff Audit`, `## Requirement Completion Status`, or `## Audit Verdict`. Per `RECURSIVE.md:626-636,680-707,780-785`, the controller must add the required audited-phase sections before a supported lock. This is structural lock-readiness, not source content.
- **Evidence hygiene:** `current-paired-identities.json:7-36` is a pre-attempt02 status snapshot and omits newer evidence files. Live status still shows only the run directory untracked and no tracked diff; refresh the array if it is cited as R1’s untracked inventory. `CONTROLLER-HANDOFF.md` is also stale (R1–R38, route unresolved) and should be annotated superseded before lock.

## 4. Verdict

**Content coverage: FAIL.** Attempt01’s major repairs are present, but F1–F9 above are material source obligations still lacking enforceable acceptance; F9/R17 and the narrower items also remain in scope. The draft’s own `Coverage: FAIL` and `Approval: FAIL` are therefore correct, and no false PASS or invented E1/E2 decision was found.

**Lock-readiness: FAIL.** This is not blocked only by unresolved owner scope. Even after the finite content repairs, E1/E2 owner dispositions and the required audit/lock sections must be completed before a supported lock.

**Audit: FAIL — scope: Phase 00 Requirements DRAFT only; R1–R39 (`00-requirements.md`, SHA-256 `833440a5ef525ef9846a3852f66452be438c084ddc521eb130b19b6b2060bce3`) reviewed read-only against the full `source-proposal.md` (SHA-256 `870fa27fbc2ebe277c633ba539073037a2b330ac411c61b661804e7779be534c`, 1,357 lines), preserved paired baseline/identity/route evidence, and applicable `.recursive/RECURSIVE.md` audit/lock rules. No product implementation, test execution, provider calls, edits, writes, goals, or child workers. Lock is not blocked only by unresolved E1/E2 owner scope: the content omissions above also require finite repair.**
