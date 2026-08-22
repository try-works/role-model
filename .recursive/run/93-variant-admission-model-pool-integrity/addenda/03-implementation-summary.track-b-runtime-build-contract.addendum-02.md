Run: `/.recursive/run/93-variant-admission-model-pool-integrity/`
Phase: `3-implementation-summary`
Artifact: `03-implementation-summary.md`
Addendum: `02`
Status: `LOCKED`
LockedAt: `2026-08-22T11:34:53Z`
LockHash: `0d58885cf98adc7cf4edb38b1b676fc24509164832774329949d18ffe1053474`
Inputs:
- `/.recursive/run/93-variant-admission-model-pool-integrity/00-requirements.md` (LOCKED)
- `/.recursive/run/93-variant-admission-model-pool-integrity/02-to-be-plan.md` (LOCKED)
- `/.recursive/run/93-variant-admission-model-pool-integrity/addenda/03-implementation-summary.audit-remediation.addendum-01.md`
- `role-model-router/apps/runtime-host-bridge/src/package-sea.ts`
- `role-model-router/apps/runtime-host-bridge/src/cli.ts`
- `D:/DEV/role-model-internal/scripts/track-b/build-runtime-distribution.mjs`
Outputs:
- A corrected paired public/private build contract and its strict regression/Phase 5 evidence.
Scope note: The rebuilt public development executable omitted the mandatory Track B runtime distribution. This addendum makes that omission an explicit build-contract defect rather than accepting a public-only development package as a runtime candidate.

## TODO

- [x] Add strict RED tests for missing, malformed, tampered, incomplete, and public-source-mismatched Track B distributions.
- [x] Change the paired build/package path so every runnable runtime artifact contains the verified Track B distribution and fails closed when it is absent.
- [x] Keep any intentionally public-only developer diagnostic artifact separate in name, metadata, and launch contract so it cannot be confused with a runnable runtime release. No runnable public-only artifact remains: every channel now requires Track B.
- [x] Rebuild the paired runtime and verify Pi alias routing, telemetry/lineage, and the configured shadow-cloud boundary from that same artifact.

## Finding

The public `role-model-dev.exe` verified in Phase 4 was a development-channel
package without `track-b-runtime/track-b-runtime-manifest.json`. Its 13
extension records were therefore unavailable. Separately rebuilding
`D:/DEV/role-model-internal/dist/run00-dev` and launching the current public
Run 93 host with that manifest proved the private distribution is healthy (13
extensions ready), but that is a manual pairing step outside the public build.
The two artifacts must not remain interchangeable in documentation or release
validation. The defect has now been repaired for the rebuilt executable: the
private builder records the exact public Git tree in its v2 manifest, and the
public packager supplies its current source tree to the distribution stager.
The stager rejects a mismatch before release assembly and records the verified
tree identity in the packaged manifest.

The initial implementation exposed a second provenance gap: `HEAD^{tree}`
does not describe uncommitted source files which a development package could
otherwise include. The packager now fails closed before any build work when
the public worktree is dirty. Consequently, release-grade Phase 5 rebuilding
must occur after the in-scope source is committed; the earlier dirty-worktree
executable evidence remains useful for extension-host behavior only and is not
release provenance evidence.

## Added Requirement AR6 — Mandatory paired Track B build contract

1. Every artifact described as a runnable role-model runtime—development,
   stage, or production—must contain a `track-b-runtime/` directory with the
   current `track-b-runtime-manifest.json`, verified sidecar, public runtime
   adapter, and exactly 13 integrity-verified canonical extensions. Startup
   must fail closed if the distribution is absent, malformed, tampered, or
   incomplete; it must never degrade into a public-only host while reporting a
   ready runtime.
2. The paired build input must prove it was built against the same public source
   tree/package revision that is being packaged. A manifest from an older or
   different public worktree, even if structurally valid and 13-extension
   complete, must be rejected before packaging or startup. The proof may use a
   canonical public-source tree digest or equivalent reviewed binding; it must
   not expose a repository credential or mutable path as the identity.
3. The build pipeline must take the paired Track B distribution through an
   explicit, reviewable input boundary (for example a verified distribution
   root/manifest supplied by the private build) and copy only verified manifest
   members into the package. It must preserve the manifest/sidecar hashes and
   record them in the package profile or release receipt.
4. If a public-only executable remains necessary for low-level host diagnostics,
   it must use an explicit `host-only-diagnostic` identity, must not be called a
   runtime build or release candidate, must not expose a normal ready state, and
   must be refused by Phase 5/CI/release tooling. It is not a substitute for
   AR6(1).
5. Stage and production must retain their existing signed Run 88 identity
   checks. AR6 extends the mandatory paired-distribution rule to development
   runtime artifacts; it does not allow a fabricated release identity or reuse
   an older Stage/Production distribution.

## Strict TDD plan

### RED cases

- A development runtime packaging attempt without a Track B manifest fails
  before an executable is emitted.
- A manifest with 12 extensions, a changed sidecar/extension hash, a missing
  public runtime adapter, or a public-source binding from another worktree
  fails before an executable is emitted.
- A package assembled without the copied `track-b-runtime/` tree fails startup
  and its runtime health remains unavailable rather than `ready`.
- A host-only diagnostic artifact is rejected by the normal Phase 5 and release
  validators.

### GREEN cases

- The private distribution builder produces the source-bound manifest from the
  current public worktree; the public packager verifies and stages every member.
- The rebuilt development executable starts only with the paired distribution
  and `/api/role-model/extensions` reports exactly 13 records with each
  installed/ready state derived from the real extension host.
- The existing Stage/Production package regression remains green with its
  signed Run 88 identity and the same copied distribution contract.

### REFACTOR constraint

Share one verifier for all three channels. Channel policy may add signed
identity requirements, but it must not fork manifest integrity, extension
count, or public-source-binding logic.

## Rebuilt-runtime Phase 5 acceptance

- Build a new paired artifact from the Run 93 public worktree and a freshly
  verified private distribution; record executable, manifest, sidecar, and
  public-source binding digests without logging secrets.
- Start it in a fresh `D:/DEV/tmp` state root and verify `/app` plus all 13
  extension records through the running process.
- After one real endpoint is successfully admitted, run a bounded Pi CLI
  request through `baseline.remote-only`, inspect its routing decision,
  telemetry, message graph/lineage, and all applicable extension receipts.
- Verify the same artifact's bounded cloud path using only the configured
  track: contribution/recommendation lineage plus D1/R2/Parquet evidence when
  enabled; otherwise record the real fail-closed reason. No secret may appear
  in package content, logs, receipts, or this run document.
- Re-run the current Run 93 requirements audit after remediation. A successful
  manually paired development host is supporting evidence only; it cannot close
  this addendum until the actual packaged artifact passes.

### Clean-snapshot execution record

To avoid mutating the shared dirty Run 93 worktree during verification, the
controller created a local-only detached snapshot at commit
`8470c98700656d69502a78b90ef9f6ffaacf9733`. It contains the exact working
state at the time of snapshotting and was clean after a normal workspace build.
The private builder was pointed at that snapshot, and the public packager then
produced `role-model-dev.exe` whose package manifest records source tree
`b3d8328cb173494e168a5ad278adbc1324e4a5a8`, Track B manifest SHA-256
`83e0ed2ca624a0218de408d469c4a72b743feb38902b9216abc6c25b01abe3c2`,
and `extension_count: 13`. This snapshot is Phase 5 evidence only; it is not a
branch, release candidate, or replacement for the eventual reviewed Run 93
commit.

The exact snapshot package started from fresh
`D:/DEV/tmp/run93-phase5-clean-package-state-20260822` state. `/app` returned
200 and its extension API reported the exact 13 canonical extensions all
`ready` and `health.available: true`. Pi CLI 0.84.2 reached that same package
through `role-model/baseline.remote-only`; the request was correctly persisted
as `req-db87df85-f855-4ba8-8f0b-5da87b4951f6` with a correlated routing
decision and failed closed as `no_eligible_target`. The isolated DeepSeek
endpoint had already been rejected by its real admission probe as
`vendor-down`, so the alias was not discoverable/routable. No success, graph
write, contribution, recommendation, or D1/R2/Parquet success is claimed
from this negative path. The process shut down through its API and
released port 59842.

### Credential-backed Phase 5 continuation — 2026-08-22

The earlier endpoint block was cleared without reading, copying, or writing a
credential. A second clean local-only snapshot at commit
`7ed7d470ff3126fedaf6ca14d6fd78354596040e`, source tree
`b3d8328cb173494e168a5ad278adbc1324e4a5a8`, was paired with the freshly
rebuilt private distribution. Its `role-model-dev.exe` SHA-256 is
`4482efca3bda770036978bffa9bdf9c7d1312a91a1aed5aefbdfb5c48cbb5739`; package
manifest SHA-256 is
`e1d4e80d84f6a8b00c35861306316573e5f553681969daf03a1d5ab98b10395c`. The
manifest records the same source tree, Track B manifest SHA-256
`83e0ed2ca624a0218de408d469c4a72b743feb38902b9216abc6c25b01abe3c2`, sidecar
SHA-256 `58f15aa1bbc83f6fb8b058abb78eb53d4898e3f130e73c5d04497e908219f355`, and
exactly 13 extensions.
The installed DeepSeek credential reference was compared in-memory against
non-binary package members; it had zero matches. Its value was not printed or
written during that verification.

At `127.0.0.1:59850`, an isolated copy of the stage state served `/app` and
`/app/observe/requests` with HTTP 200 and reported `baseline` / `remote_only`
with four healthy endpoints. Pi CLI 0.84.2 completed a bounded request through
`role-model/baseline.remote-only`. Persisted telemetry
`req-1366ea48-81c6-4a82-9b3e-0b567259da4a` and its routing decision record a
successful DeepSeek V4 Flash Low selection with `reasoningEffort: low`,
`effortSource: variant`, and HTTP 200. A direct bounded request to the other
configured DeepSeek model, V4 Pro, also completed successfully and persisted
`req-8d52c89b-0399-4124-bb9a-113367ef6cc2` with HTTP 200. The alias is
intentionally eligible only for Flash under the current role/capability pool;
the direct request proves both configured DeepSeek deployments through the
same rebuilt package.

The alias receipt produced a completed Track B shadow receipt with pipeline,
projection, consumption, and repository-context records. All 13 canonical
extensions reported `ready`; artifact-store, retention, and post-observation
state advanced after the request. The development profile retained
`productionMutation: false`, so no contribution/recommendation cloud write is
claimed. Read-only Cloudflare verification independently found the stage D1
database (11 tables), both bound stage R2 buckets (nonzero object counts), the
two active stage queues with consumers plus the zero-consumer dead-letter
queue, and deployed versions of all five Track B stage Workers. This is the
configured shadow-cloud boundary, not a fabricated production-write claim.

## Audit Context

Audit Execution Mode: self-audit
Subagent Availability: available
Subagent Capability Probe: Current controller task has active agents but the
developer instruction prohibits new delegation for this bounded addendum edit.
Delegation Decision Basis: No implementation or review claim is made here; this
is an authoritative Phase 3 scope correction.
Delegation Override Reason: The current collaboration policy prohibits spawning
or delegating new work unless explicitly required.
Audit Inputs Provided: Locked Run 93 requirements/plan, Addendum 01, current
paired distribution test result, isolated runtime extension inventory, and
packaging/CLI source paths listed in the header.

## Effective Inputs Re-read

- Locked Run 93 requirements and Phase 2 plan.
- Addendum 01, including its mandatory Track B release gate.
- Current public package/CLI source and current private distribution builder.

## Earlier Phase Reconciliation

The locked requirements correctly make Track B mandatory at runtime, but the
earlier Phase 3/4 execution accepted a public-only development executable as a
rebuilt runtime diagnostic. AR6 narrows that ambiguity without rewriting locked
history: only explicitly labeled host-only diagnostics may omit Track B, and
they cannot satisfy runtime or release verification.

## Subagent Contribution Verification

Reviewed Action Records: none.
Main-Agent Verification Performed:

- RED: `recursive-87-compatibility.test.ts` accepted a v2 distribution bound
  to public tree `a…a` while the package requested `b…b`; the private
  distribution test also failed because `publicSourceTree` was absent.
- GREEN: rebuilt `D:/DEV/role-model-internal/dist/run00-dev` against the Run
  93 worktree, then passed `tests/track-b/runtime-distribution.test.mjs`
  (2/2) and public `recursive-87-compatibility`, `run88-stage-release`, and
  `cli-startup-readiness` (25/25).
- Rebuilt the actual `role-model-dev.exe` through `runtime:package-sea` with
  `ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT` set to that private distribution.
  Its release manifest binds host and Track B to public tree
  `7f6efe4515d86f0a5442855d4395295db25dcc88`, records manifest digest
  `e81c78e4483fc4a66b8432ba4c2bf639e1862a7fc9449904915a91faf89461a0`,
  and records 13 extensions.
- Started that executable twice in fresh `D:/DEV/tmp` state roots. `/app`
  returned 200 and the live extension endpoint returned the exact 13
  canonical IDs, each `lifecycle: ready` and `health.available: true`.
  Both isolated instances accepted the shutdown endpoint (202) and released
  their listener.
- RED: the source-binding helper was absent, so a dirty worktree could still
  use its `HEAD^{tree}` in a package manifest. GREEN: the new helper rejects
  non-empty Git porcelain status; its focused public regression suite passed
  26/26, and a direct dirty-worktree `package-sea` invocation failed before
  release assembly with `Packaged runtime requires a clean public worktree`.

Acceptance Decision: implementation accepted for the paired build contract;
the live Pi/cloud continuation remains open.
Refresh Handling: This addendum is the required refreshed Phase 3 scope.
Repair Performed After Verification: added current-tree binding to the private
distribution manifest; added public staging validation and packaged receipt
field; changed all runnable channels to require a Track B manifest at package
and startup boundaries; rebuilt and exercised the actual executable.

## Worktree Diff Audit

Baseline type: worktree baseline recorded by `00-worktree.md`.
Baseline reference: `1aab0512ce23aacc50cea66c2926e374be1e249e`.
Comparison reference: current Run 93 worktree.
Normalized baseline: `1aab0512ce23aacc50cea66c2926e374be1e249e`.
Normalized comparison: current working tree, including uncommitted Run 93
changes and unrelated pre-existing drift.
Normalized diff command: `git diff --check`.
In-scope changed files: private Track B distribution builder/test; public
Track B staging, package/startup tests, and this addendum. Product build
changes are implemented and verified as recorded above.
Out-of-scope drift: existing editor/training/memory changes remain excluded as
recorded by Addendum 01.

## Gaps Found

- The original public-only development package and stale-distribution gaps are
  repaired by this addendum's implementation and tests. The previous
  dirty-worktree source-provenance ambiguity is also repaired fail-closed;
  a clean committed Run 93 source is now required for the final rebuilt
  release-grade package.
- The prior credential-free negative path remains useful diagnostic evidence,
  but it no longer blocks AR6. The credential-backed continuation supplies the
  required successful Pi alias, route, telemetry, and Track B shadow-lineage
  proof from the exact paired package.
- The development profile has no enabled production contribution or
  recommendation write binding. Its observed `productionMutation: false` is
  the required fail-closed boundary; Cloudflare was inspected read-only.

## Repair Work Performed

Created this authoritative implementation-phase addendum. No product code,
release identity, cloud state, or secret handling was changed.

## Requirement Completion Status

| Requirement | Status | Changed Files | Implementation Evidence | Verification Evidence | Deferred By | Scope Decision | Blocking Evidence | Addendum |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AR6 | pass | private builder; public Track B stager, packager, startup guard, and regression tests | current-tree-bound manifest plus shared all-channel package/startup guards | RED failures observed; 2/2 private distribution, 26/26 public regression, paired executable `/app` 200, 13/13 ready extensions, successful Pi alias/telemetry/Track B shadow receipt, and bounded Cloudflare read-only inventory | none | In scope | Development profile correctly refuses production cloud mutation | this file |

## Audit Verdict

Audit: PASS FOR AR6 — the defect is fixed in the build path and verified in
the actual paired executable. It completed the required admitted Pi alias,
telemetry, and Track B shadow-lineage check. The development profile's
read-only cloud boundary was verified without claiming a production write.

## Coverage Gate

Coverage: PASS

The paired-runtime acceptance criteria are satisfied. This narrow result does
not by itself close unrelated Run 93 Phase 5 acceptance items.

## Approval Gate

Approval: PASS

The mandatory Track B package gate is enforced and the addendum-specific
runtime evidence is complete. Release approval remains governed by the locked
Run 93 requirements and remaining Phase 5 matrix.

## Post-Phase-5 Sidebar / Model Pool Consistency Repair — 2026-08-22

The isolated paired runtime showed six sidebar `MODELS` rows while the Model
Pool had four candidates. Root-cause inspection established that this was not
an API pagination defect: the candidate-space correctly excludes entries with
`routingEligible: false` (including discovered vendor inventory and degraded
entries), while the sidebar formerly rendered every configured endpoint and
aggregated those excluded endpoints' telemetry into same-model rows. Thus a
non-routable endpoint could consume a sidebar slot or make a routable sibling
appear to have traffic it did not receive.

The sidebar is now explicitly the active routing-pool roster. It applies the
same `routingEligible !== false` boundary as candidate-space, counts telemetry
only for the endpoint instances it displays, and retains a model-only row only
when telemetry is historical and no endpoint is currently known. This preserves
historical observability without presenting excluded inventory as a route
candidate. The Model Pool continues to exclude non-routable/degraded inventory
by design; its four candidates therefore agree with the corrected sidebar.

Strict TDD record:

- RED: `corepack pnpm exec vitest run app/lib/effort-identity.test.ts -t
  "shows the routable model pool rather than non-routable endpoint inventory"`
  failed with the pre-fix sidebar rows for the non-routable LiteLLM-style
  endpoint plus its routable Low sibling.
- GREEN: the sidebar now partitions known endpoints by routing eligibility and
  endpoint-level telemetry. The focused regression, the existing effort-sibling
  regression, and the full candidate-space/effort-identity suite passed
  (`32/32`).
- The previously requested redundant `Showing N of N` candidate-rail counter
  was removed under its own RED/GREEN source regression. The candidate rail is
  scrollable rather than silently truncated.

The next paired rebuild on this corrected source must verify `/app` at the
isolated runtime and show exactly the same routable endpoint identities in the
sidebar and Model Pool. It must not use vendor inventory or excluded/degraded
endpoints as route candidates, and it must retain all 13 Track B extension
checks from AR6.

### Corrected paired rebuild receipt

The corrected files were applied to a new clean detached source snapshot
(`531561d86073624af7421a49a16f5daa6551c578`, source tree
`20c244ad1a09344244742abf87c0d5d8fffd89bf`). A full offline workspace build
preceded package assembly; an initial package attempt correctly failed while
workspace dependency output was absent, and succeeded only after that build.
The resulting development release manifest is SHA-256
`4798a5b029f3bd9f6eac6feecd4ad82a9a4fc4ad6b6986f5ccec8334e0e58dc6`; it
records the same source tree, the rebuilt Track B manifest SHA-256
`1859a535377abf8e805f7b1e5edfabd17acf8b6cf91f901d87c2759c60117e2f`, and
13 extensions. The executable's bootstrap SHA remains
`4482efca3bda770036978bffa9bdf9c7d1312a91a1aed5aefbdfb5c48cbb5739`; the
release manifest is the source/asset provenance receipt.

It is running separately at `http://127.0.0.1:59851/app` with an isolated copy
of the active state root. Its live APIs report seven discovered endpoints,
exactly four routing-eligible endpoints, seven raw router candidates, exactly
four routing-eligible candidates, `/app` HTTP 200, and 13/13 Track B extensions
ready and available. The original runtime at port 59850 was not stopped or
modified. Static inspection of the new release tree confirms the removed
`Showing N of N` candidate-rail text is absent. The unit regression establishes
that the sidebar presents the same four-endpoint eligible cohort rather than
the seven-endpoint discovery inventory; browser review of port 59851 is the
remaining visual confirmation of that projection.

## Post-Phase-5 Provider Connection Identity Repair — 2026-08-22

### Root Cause

The runtime registry intentionally contains two different kinds of remote
record: a user-owned direct provider account (`servingSource:
remote-service`) and a managed LiteLLM adapter inventory record
(`servingSource: vendor-litellm`). The latter is necessary for runtime
diagnostics but is not a provider account that the user can configure. The
Connect registry already suppressed those managed rows; the editable
**Configured provider connections** projection did not. It therefore rendered
`deepseek.litellm` beside the user's actual `deepseek.personal.*` account and
made a serving implementation look like a second DeepSeek provider.

### Strict TDD Record

- RED: added `buildConfiguredRemoteConnectionRows` regression
  `excludes managed LiteLLM adapter records from user-configured provider
  connections`; it failed with two rows where only the direct account should
  have appeared.
- GREEN: added the shared `isManagedRemoteAdapterEndpoint` predicate and
  applied it to the configured-connection projection. The registry now uses
  the same predicate for its already-correct managed-adapter suppression.
- Verification: `corepack pnpm exec vitest run
  role-model-router/apps/runtime-ui/app/lib/view-models.test.ts
  role-model-router/apps/runtime-ui/app/routes/providers.test.ts
  role-model-router/apps/runtime-ui/app/routes/endpoints.test.tsx` passed
  **68/68**; Biome passed for the touched files.

### Presentation Contract

- **Remote → Providers** lists only accounts a user configured and can edit.
  Direct DeepSeek endpoints remain under the direct DeepSeek account.
- **Connect → Registry** remains a runtime diagnostic projection. It does not
  duplicate managed LiteLLM inventory as a second account, but retains source
  labeling for any managed-serving rows that are intentionally shown in future
  diagnostic surfaces.
- LiteLLM is not presented as a provider. It is an internal managed adapter;
  it does not introduce a second credential, provider selection, routing
  target, or benchmark candidate.

The next rebuilt isolated runtime must confirm that the Remote page contains
the direct DeepSeek group and no `deepseek.litellm` configured-connection card,
while preserving the prior 13-extension Track B receipt.

### Rebuilt Runtime Receipt

The corrected source was committed only into the clean isolated verification
snapshot at `96408703f91e92fdc429624f570544063cc6f965` (tree
`47444403ecc5f9ddb0944196861f14696ae3a33f`). Its rebuilt development package
has release-manifest SHA-256
`bb5ab191e17633bd020d7fbf4b9f2a7489deb93048283fea0325637f2ddee441`, binds
Track B manifest SHA-256
`d6b3feea1da8c34ca8a2f9045e6d929eeba16795bd9d9cbb1702c647d6cc0c33`, and
declares exactly 13 extensions. The packaged runtime is serving the isolated
state at `http://127.0.0.1:59851/app` with `/app` HTTP 200 and **13/13**
extension lifecycle/health records `ready` and `available`.

This isolated restart rehydrates four direct DeepSeek endpoints and no managed
LiteLLM inventory from its copied state, so the browser-level visual is not
used to fake an adapter-present assertion. The dedicated RED/GREEN regression
is the authoritative proof that, when both records are present, the Remote
page projects only the direct account. The live API confirms the direct account
continues to expose its four endpoints; no credential value was read or
reported during this verification.
