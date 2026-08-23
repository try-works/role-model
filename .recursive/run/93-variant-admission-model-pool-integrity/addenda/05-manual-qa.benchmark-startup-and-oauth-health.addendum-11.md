Run: `/.recursive/run/93-variant-admission-model-pool-integrity/`
Phase: `5-manual-qa`
Artifact: `05-manual-qa.md`
Addendum: `11`
Status: `LOCKED`
LockedAt: `2026-08-23T13:13:08Z`
LockHash: `405e70561c7ac4b8284017a6cac2cbd319be0dae85a86c907a551aba90c1b75f`
Inputs:
- `00-requirements.md` (LOCKED), especially R2, R3, R4, R8, and R9
- `01.5-root-cause.md` (LOCKED)
- `05-manual-qa.oauth-callback-admission-and-provider-rows.addendum-09.md` (effective OAuth policy to refine)
- Read-only Stage RC investigation on `http://127.0.0.1:3457` on 2026-08-23
Outputs:
- A binding remediation and verification contract for benchmark startup failure handling and OAuth-confirmed endpoint health.
Scope note: This addendum authorizes implementation only in the existing Run 93 worktree. It does not authorize a provider request, credential read, runtime restart, state reset, benchmark retry, or Stage release by itself.

# Benchmark startup recovery and OAuth-confirmed health

## TODO

- [x] Capture strict RED evidence for every BSH-P1 and BSH-P3 regression before production edits.
- [x] Implement the shared benchmark terminal-state boundary and OAuth-authenticated health projection.
- [x] Run focused GREEN, regression, rebuild, and paired-runtime checks from BSH-P4. The clean-tree paired executable includes and verifies all 13 Track B extensions.
- [x] Complete BSH-P5 using the operator-authorized rebuilt-runtime UAT benchmark recorded by Addendum 12; no additional provider workload was sent for closeout.
- [x] Re-audit the effective Run 93 requirements and update/re-lock the Phase 3–8 closeout receipts; the recursive linter passes with zero failures and warnings.

## Root-cause findings

### BSH-1 — A failed benchmark initializer is represented forever as running

The live Stage runtime reports active benchmark run
`6c9ecf1d-48c5-40ae-973e-298f8dcacc19` as `running`, with `0/385` steps,
no current endpoint/case/phase, and an unchanged `updatedAtMs` from creation.
There is no artifact directory, manifest, or response record for that run.
The Stage health endpoint, candidates endpoint, and endpoints endpoint remain
responsive. Therefore no target-model or judge request has been made.

The source explains the false running state:

1. `runRoutingCapabilityBenchmark` in
   `role-model-router/apps/runtime-host-bridge/src/benchmark-runner.ts`
   calls `createBenchmarkRunProgress` before resolving configured endpoints,
   target eligibility, membership, and judge.
2. Its `try/catch`, which calls `failBenchmarkRunProgress`, begins only after
   that initialization. An exception in the pre-`try` work leaves the newly
   created entry in the in-memory `running` map.
3. `runBenchmark` in
   `role-model-router/apps/runtime-host-bridge/src/index.ts` launches that
   promise with `void … .catch(() => undefined)`. The caller, log, and UI get
   neither the sanitized error nor a terminal transition.

This is the proven root cause of the stuck UI. The exact initializer exception
cannot be reconstructed from the current Stage record because the code
discarded it and persisted neither request selection nor a terminal receipt.
It must not be guessed from the GPT judge selection.

### BSH-2 — OAuth-confirmed endpoints are misleadingly shown as unexecuted

The same Stage state contains a durable OAuth admission receipt with
`reasonCode: oauth-auth-confirmed` for the configured Codex endpoint, yet its
runtime endpoint health is `not-yet-executed`. Existing OAAR1 intentionally
separates account authentication from model-execution evidence. That remains
correct provenance, but it produces an operator-facing status which conflicts
with the accepted policy: a verified OAuth callback is sufficient account
health to add and use the configured OAuth endpoint without a hidden probe.

`not-yet-executed` is not the immediate cause of BSH-1: the current benchmark
predicate treats it as eligible, and BSH-1 stops before any judge request.
Nevertheless, it is an independent UI and lifecycle defect that must be
repaired in this addendum.

## Effective requirement changes

The following clauses are authoritative additions to Run 93. Where they
conflict with OAAR1's `not-yet-executed` presentation wording, these clauses
supersede that wording. They preserve the requirement that OAuth does not
fabricate endpoint-specific execution success.

### `BSH-R1` — Benchmark startup must have a terminal, observable outcome

- A benchmark may expose `running` only after its complete initial plan is
  resolved or after every initializer failure path is protected by the same
  terminal failure transition as execution/grading.
- Any failure after a run ID is allocated and before the first benchmark case
  persists a secret-free terminal `failed` progress state with a stable error
  code/category, timestamp, requested subject count, selected judge identity
  when known, and no prompt, credential, provider header, or raw response.
- The API must not discard an asynchronous benchmark failure. It must retain a
  diagnosable terminal result for the existing run ID, emit the normal revision
  update, and make the UI leave its running state without a reload.
- A failed initializer must not create benchmark response artifacts, observed
  benchmark samples, profile revisions, routing-decision metadata, or false
  successful completion evidence.
- A later benchmark start is allowed after a failed run subject to the existing
  selection/concurrency policy. A truly active run is still protected from
  duplicate execution.
- Restart/recovery must not report a run as active merely because an incomplete
  or absent artifact directory exists. Any durable start receipt must be
  reconciled to `failed` or an explicit recoverable state; it cannot become a
  silent permanent block.

### `BSH-R2` — OAuth callback establishes eligible healthy account state

- A verified OAuth callback, after local identity/configuration validation,
  commits each configured supported instance for that account as
  `active` and `healthy` with a durable `oauth-auth-confirmed` health/admission
  receipt. It performs zero hidden model execution or readiness probe calls.
- The receipt/status must distinguish `healthEvidence: oauth-auth-confirmed`
  from `healthEvidence: endpoint-executed`; the word `healthy` therefore means
  authenticated and eligible, not that a specific model has already completed
  a request.
- The same authoritative state is projected by Remote providers, Models,
  Connect, candidates, Model Pool, router eligibility, and benchmark target
  selection. No page may present the endpoint as `not-yet-executed`,
  `provider-unavailable`, or degraded solely because no request has yet run.
- An actual execution, admission, circuit, credential, quota, or provider
  failure remains bound to the exact endpoint instance. OAuth reconnection may
  not erase a quota circuit or silently turn a known endpoint failure healthy.
- The policy is capability/connection-method based, not a provider-ID special
  case, so future OAuth providers can opt into the same authenticated-health
  behavior explicitly.

## Strict TDD remediation plan

### `BSH-P1` — Reproduce and protect the benchmark-initializer boundary

Before production edits, add focused tests that make the following current
behavior fail visibly:

1. A configured-endpoint resolver rejection immediately after progress creation
   leaves a run `running` with no error (the RED regression).
2. Target eligibility/no-target/judge-resolution failures after run allocation
   finish the same run as `failed`, retain a sanitized code, and do not create
   artifacts, samples, or profile revisions.
3. The public start API does not swallow the rejected runner promise: polling
   observes a terminal failure and the subscribed revision/update path fires.
4. A subsequent valid start is not blocked by the failed initializer, while an
   already executing run remains single-flight.
5. Restart reconciliation cannot invent an active run from an incomplete or
   absent start artifact.

Record distinct RED outputs under
`evidence/logs/red/` before implementation. The test fixtures must use only
synthetic endpoint IDs and error classes.

### `BSH-P2` — Implement one benchmark lifecycle boundary

- Refactor the runner so all code after run allocation has one terminal
  success/failure boundary. Prefer resolving the plan before publishing
  `running`; if a progress record is intentionally published earlier, ensure
  the catch covers every following initializer and persists a terminal result.
- Replace the empty fire-and-forget rejection handler with a bounded,
  secret-free failure reporter. Never expose the underlying provider body,
  prompt, credential, or authorization header.
- Persist a minimal, atomic start/failure receipt only if it is required for
  restart reconciliation; it must bind canonical endpoint identities and not
  claim execution occurred. Do not introduce a second benchmark state store.
- Reuse the existing benchmark progress, revision/SSE, artifact, and
  membership-provenance mechanisms rather than adding a retry script or a
  parallel benchmark runner.

### `BSH-P3` — Correct OAuth health projection without adding a probe

Before production edits, add focused RED tests that prove:

1. A verified OAuth callback creates the configured default and fixed-effort
   instances as `active` + `healthy` with `oauth-auth-confirmed` evidence and
   invokes no adapter execution/probe.
2. Rehydration retains that state and every candidate/list/UI projection uses
   the same healthy status.
3. A sibling's later execution failure degrades/circuits only that sibling;
   the OAuth-authenticated sibling remains healthy.
4. Reconnecting OAuth does not clear a persisted quota/provider circuit or
   overwrite a newer endpoint-executed health receipt.

Implement the minimum shared state/formatter change needed to pass those tests,
then run the affected host, restart/rehydration, admission, circuit, benchmark,
and UI suites green. Store GREEN evidence separately under
`evidence/logs/green/`.

### `BSH-P4` — Rebuild and verify the paired runtime

Phase 4 must build the paired Stage-profile runtime from the final source tree
and verify its exact public commit, Track B distribution manifest, executable
hash, and all thirteen extension registrations. Run focused benchmark/OAuth
regressions plus the relevant host/router/UI package suites and packaging
validation.

### `BSH-P5` — Agent-operated Stage-style verification

Phase 5 must use an isolated state root and port; it must not mutate the
existing Stage state while diagnosing this incident. It must verify:

1. OAuth callback or a synthetic callback-complete fixture shows the configured
   OAuth endpoint as healthy/eligible, with `oauth-auth-confirmed` evidence and
   zero hidden execution probes.
2. A forced synthetic benchmark initialization error produces a visible failed
   run, a sanitized reason, no artifact/sample/profile write, and a UI that can
   start a subsequent valid run.
3. With explicit operator authorization and an existing configured credential,
   one bounded quick benchmark or Pi-alias request exercises a real eligible
   endpoint. Inspect canonical identity, routing decision, telemetry, benchmark
   progress/result, message lineage, and the registered Track B extension
   receipts. Do not retry automatically or run a full benchmark solely as
   validation.
4. Browser checks cover Models, Benchmark, Remote providers, Router,
   Overview Model Pool, Observe, and Connect for consistent healthy OAuth and
   terminal benchmark-failure rendering.
5. All thirteen extensions are enumerated against their actual lifecycle. A
   disabled/gated extension is reported as such; no cloud contribution,
   recommendation, D1, R2, Parquet, or message-graph result is fabricated.

After implementation and Phase 5, re-audit BSH-R1/BSH-R2 alongside original
R1-R9 and all effective Run 93 addenda before declaring this remediation
complete.

## Scope exclusions

- No deletion/reset of the existing Stage benchmark record or runtime state is
  authorized by this addendum.
- No full benchmark, unlimited retry, provider quota recovery, OAuth token
  inspection, credential logging, or stage/main release is authorized by this
  addendum.
- This does not change the separate requirement for endpoint-specific execution
  health; it only changes OAuth's initial admitted health presentation.

## Implementation and deterministic verification record

TDD Mode: strict

### Benchmark terminal state

- RED: `evidence/logs/red/bsh-benchmark-initializer-red.log` proves a rejected
  configured-endpoint resolver left the allocated run in `running` state.
- GREEN: `evidence/logs/green/bsh-benchmark-initializer-green.log` proves the
  same run becomes `failed` with code `benchmark_initialization_failed`, the
  bounded message `Benchmark initialization failed.`, and no raw provider
  detail. Failed progress is excluded from the active-run list.
- Implementation: `benchmark-runner.ts` now protects every operation after run
  allocation with one catch boundary; `benchmark-progress.ts` owns the stable
  failure code/message; the fire-and-forget API edge emits its revision update
  on both resolve and reject instead of silently discarding rejection.

### OAuth-authenticated health

- RED: `evidence/logs/red/bsh-oauth-healthy-red.log` proves callback
  reconciliation still returned `not-yet-executed`; the existing quota-circuit
  sibling remained blocked. `evidence/logs/red/bsh-oauth-health-evidence-red.log`
  separately proves admission receipts lacked explicit evidence provenance.
- GREEN: `evidence/logs/green/bsh-oauth-healthy-green.log` and
  `evidence/logs/green/bsh-focused-regression-green.log` prove direct,
  callback-reconciled, and batch OAuth instances are active/healthy without a
  network probe, while the exact quota-blocked sibling remains degraded.
- Implementation: the shared single/batch/callback admission paths now project
  OAuth-authenticated instances as healthy and write
  `healthEvidence: oauth-auth-confirmed`. Probe-admitted endpoints write
  `healthEvidence: endpoint-executed`; pending and failed admission receipts
  retain distinct evidence values.

### Regression and build evidence

- Focused host behavior: 46/46 passed in
  `evidence/logs/green/bsh-focused-regression-green.log`.
- Complete host bridge: 796 passed / 4 skipped in
  `evidence/logs/green/bsh-host-full-green.log`.
- Complete runtime UI: 481/481 passed in
  `evidence/logs/green/bsh-ui-full-green.log`.
- Host TypeScript build and runtime UI production build passed in
  `evidence/logs/green/bsh-host-build-green.log` and
  `evidence/logs/green/bsh-ui-build-green.log`.
- Scoped Biome validation passed in
  `evidence/logs/green/bsh-biome-green.log`; `runtime:validate-ui` and
  `runtime:validate-observability` also passed with receipts in
  `evidence/logs/green/bsh-validate-ui-green.log` and
  `evidence/logs/green/bsh-validate-observability-green.log`.
- The mandatory paired Track B distribution passed 2/2 integrity and supervised
  shadow-pipeline tests in
  `evidence/logs/green/bsh-track-b-distribution-green.log`. The clean-tree
  standalone executable then passed packaging validation with all 13
  extensions, chat and Responses execution, and SHA-256
  `e0a79bb4729b16735048a3a86b88d305462baa5fd8d6d53b581da67e9883990e`
  in `evidence/logs/green/bsh-packaged-executable-green.log`.

Changed Files:

- `role-model-router/apps/runtime-host-bridge/src/benchmark-progress.ts`
- `role-model-router/apps/runtime-host-bridge/src/benchmark-runner.ts`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/test/account-repair.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/benchmark-runner-judge.test.ts`
- `role-model-router/apps/runtime-host-bridge/test/remote-health-bootstrap.test.ts`
- `role-model-router/apps/runtime-ui/app/lib/runtime-api.ts`

The existing `:3457` Stage state and stuck run were not mutated. No credential
was read and no provider request was sent during this implementation pass.
The later operator-authorized rebuilt-runtime UAT benchmark on isolated port
`59921` exercised real endpoint execution and grading. Its truthful stale
membership outcome, telemetry/UI inspection, mandatory Track B readiness, and
operator approval are recorded in
`addenda/05-manual-qa.benchmark-stale-completion-truthfulness.addendum-12.md`
and `evidence/logs/green/bsq-rebuilt-uat-green.log`; this satisfies BSH-P5
without sending another validation workload.

## Coverage Gate

- [x] BSH-1 documents the observed Stage state, exact code boundary, and
  evidence limits without inventing an unobserved provider failure.
- [x] BSH-R1 covers initializer failures, observability, restart, concurrency,
  and artifact/profile non-effects.
- [x] BSH-R2 preserves endpoint-specific failure truth while making verified
  OAuth account health usable and consistently projected.
- [x] BSH-P1 through BSH-P5 require strict TDD, rebuild, UI, Pi, telemetry,
  message lineage, and all 13 extension checks.
Coverage: PASS

## Approval Gate

- [x] User authorized these two fixes in the existing Run 93 scope.
- [x] The addendum adds requirements without reopening or editing locked
  phase artifacts.
Approval: PASS
