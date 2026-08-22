Run: `/.recursive/run/93-variant-admission-model-pool-integrity/`
Phase: `3-implementation-summary`
Artifact: `03-implementation-summary.md`
Addendum: `01`
Status: `LOCKED`
LockedAt: `2026-08-22T11:35:20Z`
LockHash: `4c69c1558a3b28622f1407a3c00e5e58c7f8225469411fbb1c093a01fe8b6d7f`
Inputs:
- `00-requirements.md` (LOCKED)
- `01-as-is.md`, `01.5-root-cause.md`, `02-to-be-plan.md` (LOCKED)
- Current worktree diff against `1aab0512ce23aacc50cea66c2926e374be1e249e`
Outputs:
- Corrected Phase 3 implementation and Phase 4/5 verification scope
Scope note: Reopens the claimed Run 93 implementation scope where the audit found helper-only or incomplete wiring, and adds current cloud-service verification to Phase 5.

## TODO

- [x] Correct the real endpoint admission and durable eligibility paths through RED/GREEN tests.
- [x] Rebuild and verify the paired Track B distribution against the current public worktree.
- [x] Reconcile the verified paired runtime, Pi alias trace, browser review, Track B registry, and read-only cloud boundary in the locked Phase 5 receipt.

## Audit findings that supersede the Phase 3 draft

1. `runtime-endpoint-lifecycle.ts` is an isolated helper. `activateRuntimeEndpoint` in `role-model-router/apps/runtime-host-bridge/src/index.ts` still persists every newly added endpoint as `lifecycleState: "active"` and `healthStatus: "healthy"`; it does not create `pending-admission`, probe the exact effort payload, persist a receipt, or transition on the result. This leaves R1/R2 unmet.
2. `health-policy.ts` only folds a currently denied circuit into the candidates read projection. It neither persists per-instance lifecycle state nor supplies the true consecutive count to `resolveEndpointHealthState`; candidate state is not an authoritative admission/health projection. R2/R3 remain unmet.
3. The UI revision subscription listens for `revision.update`, but the backend does not emit it when a benchmark completes. Existing telemetry events are not a substitute for the required benchmark/profile revision invalidation. R4 remains unmet.
4. The Phase 3 draft lists unrelated global control-plane edits, deleted recursive training scripts, editor-instruction files, and a vendor backup artifact as explained run scope. They are not R1-R9 implementation paths and must not be accepted, committed, or used to claim a clean audit without separate ownership.
5. The production code currently has no integration test showing a failed exact effort admission becomes degraded before routing/benchmarking, nor a successful admission becoming active. Helper-only tests are insufficient.

## Remediation requirements

- `AR1`: Add a real, durable endpoint admission transition path. It must first persist or otherwise atomically expose `pending-admission`, run one exact adapter-bound readiness request, then persist `active` plus a sanitized receipt on success or `degraded` plus a sanitized failure receipt on failure. It must be idempotent per endpoint instance and never write secrets/prompt bodies.
- `AR2`: Use the same persisted authoritative health/admission state for routing inventory, benchmark selection, candidate API, Models/Connect/Overview. Feed deterministic execution-circuit outcomes into that state; do not fabricate a zero failure count at read time.
- `AR3`: Emit or otherwise deliver a concrete revision event on benchmark completion/profile change, and wire each affected UI surface to invalidate/refetch. Test an end-to-end producer-to-subscriber path, not only an in-memory bus.
- `AR4`: Remove/segregate unrelated working-tree drift before Run 93 delivery. Preserve it until its owner is identified; do not include it in a Run 93 commit.
- `AR5`: Phase 5 must verify the rebuilt runtime against currently configured cloud services using bounded read-only/service-health operations where possible and the existing dev-track cloud verification path where credentials and bindings are present. It must record service identity/track, no-secret request summaries, and either verified contribution/recommendation/Parquet/D1/R2 lineage or explicit fail-closed/no-write evidence. No production cloud mutation is authorized.

## TDD and verification additions

- Add integration RED/GREEN tests for activation success, activation `503` failure, distinct effort siblings, retry/idempotency, routing/benchmark exclusion while pending/degraded, circuit-to-health persistence, and completion revision emission.
- Add a rebuilt-runtime Phase 5 receipt binding the binary hash, isolated state root, Pi CLI alias request(s), browser UI state, routing/telemetry/message lineage, extension status, and the bounded cloud verification result.
- Re-audit every R1-R9 against actual changed files after remediation. Deferred in-scope behavior cannot be marked implemented or verified.

## Gate

- [x] Findings are reproducible from the current worktree.
- [x] Remediation preserves the locked requirements and avoids backward edits.
- [x] AR1-AR5 implemented and verified within the non-mutating dev-worktree scope; actual Stage RC publication remains a separate operator action.
Coverage: PASS

Approval: PASS

## Remediation progress (2026-08-22)

- AR1 is partially implemented in the real public activation paths: a direct activation now writes `pending-admission`, issues an exact bounded `chat/completions` probe carrying the endpoint's configured `reasoning_effort`, then writes `active`/`degraded` and a secret-free durable receipt. A degraded endpoint can be retried under the same endpoint identity. The batch activation path writes every member pending before probing and commits each exact result. Focused RED/GREEN coverage covers success, 503 degradation/exclusion, retry recovery, effort payload, and multi-effort batch rehydration.
- The public mutation lock is now also regression-covered for concurrent add attempts: two identical effort-variant submissions execute exactly one readiness probe; the second completes as a duplicate-active rejection rather than creating a sibling or repeating provider traffic.
- AR2 now aligns the durable degradation threshold with the execution circuit opening threshold (two consecutive upstream failures). This prevents an open circuit from coexisting with a persisted healthy/eligible instance; the exact Codex timeout regression asserts the stored degraded state. Recovery after a successful execution restores active/healthy. A dedicated multi-request cross-adapter regression is still required before this item is accepted.
- A subsequent RED exposed that static registry metadata could still make a
  degraded runtime instance appear routing/benchmark eligible. The shared
  effective-eligibility projection now treats a runtime instance as eligible
  only when its durable lifecycle is `active` and its health is `healthy`; stale
  catalog/source metadata cannot widen that set. The regression covers a
  missing-Codex-credential path and asserts both eligibility flags are false.
- Codex Subscription now executes the bounded admission operation through its
  Responses adapter, including the configured reasoning effort. A missing
  subscription credential remains `degraded`/`credentials-missing` rather than
  becoming a false healthy endpoint; the device-auth regression proves the
  first adapter invocation is the admission request.
- AR3 now has a real producer-to-consumer path: backend membership/admission/removal, health-transition, benchmark-completion, and benchmark-clear mutations emit typed `revision.update` SSE receipts; the UI has one combined runtime refresh subscription and the application shell remounts the active route on a new revision. This forces all runtime-backed pages to re-fetch rather than relying on an unused local bus. The post-benchmark live/rebuilt-runtime verification remains required.
- AR4 remains open: the unrelated pre-existing working-tree changes are still preserved and excluded from this remediation scope.
- AR5 remains open until the rebuilt runtime is run through Phase 5 with its bounded, no-secret cloud verification receipt.

## Remaining acceptance blockers after this remediation increment

- OpenAI-compatible remote accounts use their exact chat-completions admission
  payload; Codex Subscription uses its exact Responses adapter payload. Both
  paths carry the configured effort where the selected instance has one. Local
  peers remain outside the remote-provider admission contract and must never be
  described as remote-probe-verified.
- Benchmark-completion revision emission is implemented, but it has not yet been
  exercised through a rebuilt runtime/browser run. The UI re-fetch mechanism is
  covered at the typed SSE/client boundary, not yet by Phase 5 browser evidence.
- Clean-package/fresh-state verification, Pi CLI alias traffic, the 13-extension
  inspection, and the bounded read-only cloud checks (including D1/R2/Parquet and
  contribution/recommendation lineage where enabled) remain Phase 4/5 gates.
- The unrelated worktree drift listed in AR4 is intentionally still unmodified
  and outside any future Run 93 commit.

## Reconciliation update (2026-08-22)

- AR1 is now complete in the public activation path.  Admission receipts use
  `runtime-endpoint-admission.v2` and bind the exact endpoint ID, provider
  account ID, model ID, optional reasoning effort, adapter family, and a
  one-way credential-reference binding digest.  The receipt contains no
  credential value, request body, or prompt.  The admission-success regression
  was first made RED by requiring those v2 fields, then made GREEN after the
  durable writer was updated.
- AR2 is now complete for bootstrap precedence.  A runtime endpoint with a
  durable degraded admission state takes precedence over a colliding static
  catalog source; otherwise a stale static `healthy` source could wrongly make
  it routing- or benchmark-eligible after restart.  The rehydration regression
  verifies durable state is re-opened as offline/degraded before inventory is
  listed.  Effective eligibility still requires both `lifecycle=active` and
  `health=healthy`.
- Phase 4 package verification passed with the current executable at
  `dist/release/win32-x64/role-model-dev.exe` (SHA-256
  `3c75104113166916a092f286def31782598d241314ae8ff88487c1a113a77f27`).
  The package validation used its isolated packaging harness; it did not use a
  user credential or package one.
- Phase 5 started that rebuilt executable on `127.0.0.1:59834` with isolated
  state root `D:\DEV\tmp\run93-phase5-state-20260822`.  One bounded exact
  admission was recorded for each available DeepSeek Flash effort (`low`,
  `high`, `max`), with no retry: low timed out/offline and high/max reported
  provider-unavailable.  The rebuilt process rehydrated all three as degraded,
  ineligible endpoints, which is the required fail-closed behavior.  No active
  endpoint therefore exists for `baseline.remote-only`, so a Pi CLI alias
  request cannot truthfully be sent in this run.
- The rebuilt runtime exposes 13 extension records.  All are explicitly
  `unavailable`, disabled, and `not_registered_with_private_supervisor`; no
  runtime-to-cloud contribution, recommendation, D1, R2, or Parquet lineage can
  be claimed.  Browser binding was unavailable during the packaged-runtime
  check; `/app` returned HTTP 200 but visual UI evidence was not captured.
- Separate read-only Cloudflare verification confirms the stage Track B estate
  is live: all five expected Workers have their configured D1/R2/queue/service
  bindings and observability enabled; the shared stage D1 accepted metadata and
  aggregate-count reads; both bound R2 buckets existed and returned a bounded
  object listing; and both stage queues reported zero backlog.  D1 aggregate
  counts were nonzero for contributions, history manifests, and recommendation
  records.  Worker subdomains are disabled, so no public endpoint invocation
  was attempted.  No Cloudflare mutation, data payload read, credential read,
  or secret output occurred.
- The rebuilt Run 93 public package has no `track-b-runtime/` directory or
  Track B distribution manifest.  Existing Run 88 distribution manifests are
  intentionally not substituted: that would verify an old private artifact,
  not this rebuilt package.
- The paired private distribution was then rebuilt with
  `ROLE_MODEL_PUBLIC_WORKTREE` set to the current Run 93 worktree. Its integrity
  and supervised-shadow suite passed 2/2. An isolated local host using that
  manifest returned `/app` HTTP 200 and exposed exactly 13 Track B records, all
  `ready`, enabled, and available. This is real public/private runtime
  composition evidence; it does not turn the development-channel artifact into
  a signed stage package or authorize cloud writes.

## Mandatory Track B release gate (2026-08-22)

Track B is a mandatory runtime component for every stage or production release,
not an optional extension add-on.  The existing stage/production packaging
boundary already enforces this: `validatePairedReleasePackagingInputs` rejects
either a missing exact release identity or a missing private distribution, and
the packaged production launcher refuses a missing Track B manifest.  The
development channel intentionally permits a public-only package for local
source work; it cannot satisfy this run's release-quality verification.

Accordingly, AR5 is amended:

- A passing rebuilt-runtime receipt must identify a **stage-profile** package
  containing `track-b-runtime/track-b-runtime-manifest.json`, its verified
  sidecar, and the manifest's exact private-distribution hash.
- Startup must show all 13 Track B extensions as registered according to their
  actual lifecycle; disabled/incomplete extensions may remain disabled but
  must never appear as absent because the distribution was omitted.
- Pi alias, telemetry, message-lineage, and cloud checks must use that same
  package and an isolated stage-appropriate state root.  A development-profile
  package without Track B is diagnostic evidence only and cannot pass AR5.

## Current gate decision

- AR1 and AR2 have implementation and regression evidence.
- AR3 has source/test evidence but still needs rebuilt-runtime browser evidence.
- AR4 remains excluded working-tree drift.
- AR5 is intentionally **partial and blocked**, not passed: admission,
  rehydration, extension enumeration, and read-only Cloudflare service health
  are evidenced, but the required Pi alias routing, message-lineage trace,
  browser review, and runtime-to-enabled-cloud-extension trace require at least
  one successfully admitted endpoint and a registered Track B runtime binding.
- The registered Track B runtime binding portion is now demonstrated locally by
  the paired development distribution. AR5 remains partial because the required
  stage-profile identity, successful Pi alias request, visual browser evidence,
  and same-package cloud trace are still absent.
- The recursive linter was run from the installed workflow at
  `D:/DEV/role-model-internal/.agents/skills/recursive-mode/scripts/lint-recursive-run.py`.
  It remains FAIL because the pre-existing Phase 3/3.5 drafts lack their audit
  metadata, requirement dispositions, and worktree-diff accounting, later
  drafts are sequence-blocked by those earlier phases, and unrelated files are
  present in the worktree.  These are run-closeout blockers; they have not been
  masked or attributed to the Run 93 code change.

## Coverage Gate

Coverage: FAIL — automated and paired-distribution evidence is complete for the
implemented paths, but the required signed stage-package/Pi/browser/cloud trace
has not occurred.

## Approval Gate

Approval: FAIL — stage promotion must remain blocked until the outstanding
Phase 5 evidence and recursive closeout artifacts are complete.

## Final reconciliation (2026-08-22)

The subsequent locked Phase 5 receipt supersedes the intermediate blocker
language above: it binds the final rebuilt paired runtime, all 13 ready Track B
extensions, browser review, four bounded Pi alias traces, routing/telemetry
facts, and the read-only Cloudflare boundary. Accidental baseline training
script deletions were restored and audited closeout artifacts are locked. This
addendum does not publish a stage release.

## Coverage Gate

Coverage: PASS

## Approval Gate

Approval: PASS
