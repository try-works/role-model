Run: `/.recursive/run/81-kw-activation-browser-recommendation-evidence/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-07-24T20:16:54Z`
LockHash: `24b647a5de6c2eb178db8c805cecdae1df6e80425d7fd210eca58fdf0cc67b44`
CapturedAt: `2026-07-24T21:45:00+08:00`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- User direction (2026-07-24): author requirements for a new run covering (1) Knowledge Worker `productionActivation` policy/lifecycle and (2) browser UI live recommendation evidence; require strict TDD and rebuilt-runtime verification; include server-side changes if needed; keep requirements consistent, thorough, specific, extensible, and future-proof; unlock prior hard-off requirement where needed to land the policy/lifecycle
- Prior control-plane truth: `/.recursive/STATE.md`, `/.recursive/DECISIONS.md`, `/.recursive/memory/MEMORY.md`, `/.recursive/memory/domains/direct-track-b.md`
- Predecessor runs:
  - `00-direct-track-b-v1-1-implementation` (TB00–TB11; KW `productionActivation` hard-off; `activate()` fail-closed)
  - `79-extension-control-and-recommendations-qa` (mutate/dismiss APIs + Extensions UI; KW hard-off retained as OOS)
  - `80-signed-recommendation-cloud-lifecycle` (live `--track=dev` API recommendation download/apply/dismiss on rebuilt SEA; browser UI live evidence optional residual; KW hard-off retained)
- Public run numbering: highest prior public run `80-signed-recommendation-cloud-lifecycle` → this run id is `81`
- AS-IS product anchors:
  - Private: `extensions/knowledge-worker/index.mjs` (`productionActivation = false`; `activate()` throws; candidates force `productionPromptInjection: false`; TB10 asserts immutability)
  - Public UI: `role-model-router/apps/runtime-ui/app/routes/extensions.tsx` (Signed recommendations Download/Apply/Dismiss; copy asserts KW hard-off)
  - Public APIs: `POST /api/role-model/recommendations/{download,apply,dismiss}`; host-bridge env bindings from run 80
  - Harnesses: `scripts/track-b/launch-packaged-runtime.mjs`, run-80 seed/lifecycle helpers (parameterized track), public Playwright under `role-model-router/apps/runtime-ui/e2e/`
- Operator docs: `docs/testing.md`, `docs/cloudflare-cloud-path.md`
Outputs:
- `/.recursive/run/81-kw-activation-browser-recommendation-evidence/00-requirements.md` (after user approval + recursive-init)
Scope note: Defines authoritative Phase 0 requirements for (A) replacing KW hard-off with an explicit, gated `productionActivation` policy/lifecycle (unlocking prior OOS only as needed), and (B) mandatory browser UI live recommendation evidence on a freshly rebuilt packaged runtime against Cloudflare `--track=dev`, under **strict TDD**, with offline/local regression and optional additive server-side contracts. Does not auto-promote to `stage`/`main`. Does not lift the live `--track=production` harness ban.

## TODO

- [x] Elicit requirements from user/context and predecessor control-plane docs
- [x] Align run id with public max+1 (`80` → `81`)
- [x] Author comprehensive `R1`–`R14` with observable acceptance criteria
- [x] Add fixed decisions, open unknowns, lifecycle vocabulary, and verification matrix
- [x] Require strict TDD (`R11`) and rebuilt-runtime verification (`R12`)
- [x] Authorize gated KW unlock where needed to implement policy/lifecycle (`FD5`, `R1`–`R5`)
- [x] Require browser UI live recommendation evidence (`R7`–`R9`) beyond run-80 API hops
- [x] Allow additive server-side changes when policy/evidence needs them (`R6`)
- [x] Add extensibility / future-proofing and evidence layout contracts
- [x] Document out of scope (`OOS1`–`OOS12`)
- [x] User approve this draft (2026-07-24)
- [x] recursive-init + write approved content into both repos’ run folders
- [x] Complete Coverage / Approval gates for repo artifact (after approval)
- [x] Lock Phase 0 via recursive-lock after worktree PASS (this lock step)

## Background

### Goal

After this run:

1. **KW activation policy/lifecycle exists and is proven.** Knowledge Worker (and any coupled route-package activation surface touched by this run) is no longer an immutable hard-off stub. Activation is **policy-gated**: fail-closed by default; may succeed only when explicit activation policy inputs are satisfied; is rollback-capable; remains distinct from extension enablement / Set mode / recommendation apply.
2. **Browser UI live recommendation evidence exists and is proven.** An operator (or agent-operated browser automation) using a **freshly rebuilt** public packaged SEA bound to authentic Cloudflare `--track=dev` material can complete Download → preview → Apply and Download → preview → Dismiss **through the Extensions UI**, with durable screenshots/traces — not API-only hops.

### Problem

- Runs 00/79/80 correctly kept `KnowledgeWorker.productionActivation` hard-off and `activate()` throwing. DECISIONS explicitly lists a dedicated later policy/lifecycle run as the remaining follow-up. Continuing to treat unlock as forever-OOS blocks that follow-up.
- Run 80 closed live API recommendation lifecycle on rebuilt SEA, but left **browser UI live evidence optional**. Operator-visible UI proof of the same trust loop remains a residual.
- Any KW unlock without strict TDD, rebuilt-runtime verification, fail-closed policy matrix, and clear axis separation risks narrating extension enablement as production prompt injection.

### Scope

| Axis | In scope |
|---|---|
| Repos | `try-works/role-model` (public) + `try-works/role-model-internal` (private) |
| Run id | `81-kw-activation-browser-recommendation-evidence` (mirrored) |
| Branch | `dev` only unless user later authorizes promotion |
| Theme A | KW `productionActivation` policy/lifecycle + TB10 evolution + UI/copy honesty |
| Theme B | Browser UI live recommendation download/preview/apply/dismiss on rebuilt SEA vs `--track=dev` |
| Server | Additive server/worker/contract changes **only when required** to support activation policy evidence or recommendation UI live binding (no full reprovision epic) |
| Verification | Strict TDD + offline/local regression + **rebuilt SEA** + live `--track=dev` browser evidence |

### Non-goals (summary)

See **Out of Scope**. Notably: auto-promotion to `stage`/`main`, live `--track=production`, unbounded always-on prompt injection, rich capture / training-use / external RL defaults, proposal-corpus status rewrite, TB11 maxItems hygiene, full Cloudflare reprovision.

### Success definition (run-level)

The run may claim Phase 4/5 PASS only when **all** of the following are true:

1. Every in-scope `R#` has machine-checkable `Requirement Completion Status` reaching `verified` (or an explicit addendum-bound residual that does **not** claim PASS for that `R#`).
2. `R11` RED/GREEN evidence exists for every in-scope production code change.
3. `R12` rebuilt packaged runtime evidence exists; browser recommendation hops (`R7`–`R9`) and any packaged KW activation UI/API verify (`R4`/`R5` as applicable) target that artifact.
4. `R13` evidence binder lists hosts, ids, channels, rebuild hashes/paths, RED/GREEN paths, browser artifact paths, and commands without secrets.
5. Prior run-80 API live PASS may be cited as predecessor for recommendation trust, but **does not substitute** for this run’s mandatory browser UI evidence.
6. Prior TB10 “never activates / immutable false” fixtures are **evolved**, not silently deleted: fail-closed default remains proven; gated success paths are additive and explicit.

## Fixed Decisions

| ID | Decision |
|---|---|
| `FD1` | Live browser recommendation PASS track is Cloudflare `--track=dev` (`runtimeChannel=development`, permanent-dev recommendation binding). `--track=stage` evidence may be additive; `--track=production` refused. |
| `FD2` | Prefer existing public recommendation APIs and Extensions Signed-recommendations UI; add only minimum fixes for browser-complete evidence. |
| `FD3` | Phase 3 `TDD Mode: strict` is mandatory for all in-scope production code changes (private KW, public host/UI, and any required server contract code). |
| `FD4` | Operator-facing live verification must run against a freshly rebuilt packaged public SEA (stale binary = FAIL). |
| `FD5` | **Gated unlock authorized:** prior hard-off OOS for KW `productionActivation` is unlocked for this run only to the extent required to implement an explicit activation policy/lifecycle. Default remains fail-closed. Always-on / ungated activation is forbidden. |
| `FD6` | Independent product axes remain independent: installed ≠ enabled/Set-mode ≠ upload/contribution ≠ training-use ≠ recommendation access ≠ **`productionActivation`**. |
| `FD7` | Recommendation apply/dismiss must **not** imply or flip KW `productionActivation`. |
| `FD8` | Secrets/keys stay out of git; evidence cites hosts, ids, digests, receipt/trace paths only. |
| `FD9` | Server-side changes are allowed **iff** Phase 1/2 shows client-local policy cannot satisfy an acceptance criterion without them; changes must be additive and track-safe. |
| `FD10` | Work stays on `dev`; no auto-promotion to `stage`/`main`. |
| `FD11` | Browser UI live recommendation evidence is **mandatory** for this run (not an optional residual). |
| `FD12` | TB10 / KW regression suite remains the authority surface for activation guards; fixtures/tests must be updated under strict TDD rather than bypassed. |

## Open Unknowns (must resolve before claiming related PASS)

| ID | Unknown | Resolution rule |
|---|---|---|
| `U1` | Exact activation policy inputs (evidence receipt shape, operator attestation, env gate, channel restriction, holdout thresholds, etc.) | Resolve in Phase 1/2 against code + proposal authorities; lock concrete policy schema in Phase 2; do not invent unsigned convenience activation. |
| `U2` | Whether route-package attribution surfaces share KW’s activation flag or need a paired guard | Resolve in Phase 1; if coupled, include under `R3`; if independent, document as residual/OOS with explicit non-implication. |
| `U3` | Whether any server-side attestation/authorization is required for activation | Resolve per `FD9`; if required, land under `R6` with additive contracts + offline fixtures. |
| `U4` | Exact Playwright/browser automation entry for rebuilt SEA Extensions page | Prefer existing e2e helpers; extend under `R7`–`R9`; record base URL + selectors/contracts without secrets. |
| `U5` | Whether `--track=stage` browser evidence is collected in this run | Optional additive only; not required for PASS. |

## Lifecycle vocabulary (KW activation)

| Term | Meaning for this run |
|---|---|
| `shadow` | Candidate/derived knowledge exists; not production-activated |
| `activation-eligible` | Policy inputs satisfied; activation may be attempted |
| `production-activated` | `productionActivation` true (or equivalent observable); production prompt-injection path allowed only under this state and remaining safety filters |
| `activation-refused` | Attempted activate failed closed with explicit error; state unchanged |
| `rolled-back` | Prior activation cleared; `productionActivation` false again; candidates/injection cleared per policy |
| `enablement` | Extension Set-mode / mutate enabled — **not** activation |

State machine (normative intent):

```text
[hard-off default] --(policy inputs ok)--> [activation-eligible]
[activation-eligible] --(activate success)--> [production-activated]
[activation-eligible] --(activate fail)--> [activation-refused] (still not activated)
[production-activated] --(rollback)--> [rolled-back / default-off]
Any state without policy inputs: activate() must fail closed.
```

## Requirements

### `R1` Explicit KW activation policy (replace immutable hard-off)

Description:
Replace the immutable “always throw / always false” stub with an **explicit activation policy** that remains fail-closed by default. Unlock is gated, not ambient.

Acceptance criteria:
- `KnowledgeWorker.productionActivation` is no longer an immutable forever-false constant without a defined transition path; default process/instance state remains inactive unless activation succeeds.
- An activation policy object/contract is defined (schema or equivalent) listing required inputs (e.g. verified validation receipt, disjoint evidence sets, operator/local attestation, channel restriction, prohibited tip checks). Exact fields may be finalized in Phase 2 but must be testable.
- Missing/invalid policy inputs ⇒ `activate()` / `knowledge:activate` fails closed with an explicit, stable error class/message family.
- Enabling the `knowledge-worker` extension via mutate/Set-mode alone does **not** satisfy activation policy and does not set `productionActivation`.
- Applying or dismissing a recommendation does **not** satisfy activation policy and does not set `productionActivation`.
- Unit/contract tests cover: default-off, missing inputs refuse, invalid inputs refuse, enablement-without-activation, recommendation-apply-without-activation.

### `R2` Successful gated activation path

Description:
When policy inputs are satisfied, activation may succeed and is observable.

Acceptance criteria:
- Given valid policy inputs, `activate()` / `knowledge:activate` succeeds exactly once per intended transition (or is idempotent per Phase 2 contract — pick one and test it).
- On success, observable health/status reports `productionActivation: true` (or equivalent documented field).
- Production prompt-injection / production tip application remains prohibited while inactive; may occur only after successful activation and still subject to existing safety filters (no generic/jailbreak tips).
- Success path has strict TDD RED→GREEN evidence (`R11`).
- Offline/unit tests do not require live Cloudflare for the core activation success path.

### `R3` Rollback and fail-closed matrix for activation

Description:
Activation must be reversible and must refuse unsafe transitions.

Acceptance criteria (minimum matrix — each cell has a named test with evidence):

| Case | Expected |
|---|---|
| Activate without policy inputs | refuse; still inactive |
| Activate with tampered/invalid validation receipt | refuse |
| Activate while extension disabled / not installed (if applicable) | refuse or no-op-safe per Phase 2; never silent activate |
| Double-activate when already active | idempotent success **or** explicit already-active handling (documented) |
| Rollback after activation | returns to inactive; injection cleared per policy |
| Rollback when already inactive | non-destructive |
| Recommendation apply while inactive | does not activate |
| Set-mode enable while inactive | does not activate |
| Activate then disable extension | activation cannot remain falsely claimed as available in UI/health without reconciliation (Phase 2 defines exact reconciliation) |

- TB10-style regression suite is updated under strict TDD: prior “never activates” cases become “refuses without policy” plus additive “activates with policy” / “rollback” cases — do not delete coverage of fail-closed default.
- Quarantined/skipped tests cannot satisfy matrix cells.

### `R4` Public/host/UI honesty for activation state

Description:
Any public host or UI surfaces that mention KW activation must reflect the new policy honestly and must not equate enablement with activation.

Acceptance criteria:
- Extensions UI copy no longer claims permanent hard-off if activation is now policy-gated; copy states fail-closed default + gated activation (exact wording Phase 2/3).
- If UI exposes activation controls or status, they are distinct from Set-mode / recommendation controls.
- If UI does **not** expose an activation control in this run, health/API must still expose truthful `productionActivation` for operator tooling, and UI must not contradict it.
- Unit/UI tests assert: enablement copy ≠ activation; recommendation apply copy ≠ activation.
- N/N-1: prior clients that assumed hard-off must either keep working (inactive default) or be intentionally broken with paired dual-repo pin notes in the same run.

### `R5` Packaged-runtime verification of activation guards

Description:
Prove activation default-off and gated success/refusal on a freshly rebuilt packaged public runtime (and private Track B distribution when private KW packaging inputs change).

Acceptance criteria:
- After implementation, rebuild public SEA per `R12`.
- Against that SEA (or Track-B-staged host it serves):
  - default health/probe shows inactive activation;
  - activate-without-policy fails closed (API, capability envelope, or documented host probe);
  - activate-with-policy succeeds when the run includes a packaged-accessible activation path; if activation remains private-extension-only without public HTTP, private packaged/distribution probe + offline suite satisfy this cell and the binder records the surface used.
- Evidence records commands, artifact hash, and outcomes without secrets.
- Stale-binary rule applies (`R12`).

### `R6` Additive server-side support only when required

Description:
If Phase 1/2 determines activation policy or browser recommendation binding needs server/worker/contract changes, land the minimum additive server-side support. If not required, record an explicit “no server change” residual with rationale — do not invent server churn.

Acceptance criteria:
- Decision recorded in Phase 2/3: `serverChange: required | not-required` with rationale.
- If required:
  - changes are additive (new fields/endpoints/fixtures preferred over breaking removals);
  - offline `pnpm test:cloud` (or equivalent) covers new contracts;
  - live `--track=dev` only when the changed worker is needed for browser recommendation PASS or activation attestation;
  - production track writes remain refused by harness policy.
- If not required: binder includes `serverChange: not-required` and no silent server edits land “just in case.”
- Strict TDD applies to any server production code change (`R11`).

### `R7` Browser UI live recommendation download + preview

Description:
On a freshly rebuilt SEA bound to live `--track=dev` material, the Extensions **Signed recommendations** UI can download & validate and show previewable rows.

Acceptance criteria:
- Browser automation (Playwright or equivalent) drives the rebuilt SEA UI (not a detached Vite-only mock unless binder proves identical API wiring — default: packaged SEA).
- Operator/agent performs **Download & validate latest** (or equivalent UI control).
- After download, UI lists at least one validated recommendation row with visible signature/policy status (preview).
- Evidence includes: trace and/or screenshots, base URL, recommendation id(s), channel/track, SEA hash.
- API-only download evidence from run 80 does **not** satisfy this requirement.
- Failures (disabled access, empty material) are either pre-seeded away using run-80-style seed helpers or recorded as blockers — not silent skips.

### `R8` Browser UI live recommendation apply

Description:
From the same rebuilt SEA UI session/context as `R7` (or a fresh SEA session with equivalent binding), apply a validated recommendation through the UI.

Acceptance criteria:
- UI **Validate & apply** (or equivalent) succeeds for a policy-allowed, signature-valid row.
- UI reflects applied status; active-pack indicator updates if exposed.
- Evidence correlates recommendation id + SEA hash + `--track=dev` host/channel.
- Negative UI path (optional but recommended): apply disabled when `policyAllowed=false` or access ≠ `preview_and_apply`.
- Does not set KW `productionActivation`.

### `R9` Browser UI live recommendation dismiss

Description:
From rebuilt SEA UI, dismiss a non-applied recommendation without applying it.

Acceptance criteria:
- UI **Dismiss** succeeds for a downloaded, non-applied row (reseed if apply consumed the only row).
- UI reflects `dismissed`; apply control remains unavailable for that id.
- Evidence correlates id + SEA hash + track/channel.
- Does not set KW `productionActivation`.
- Idempotent re-dismiss remains non-destructive (UI or API follow-up assertion acceptable if UI hides control).

### `R10` Preserve recommendation trust + opt-out independence regressions

Description:
Browser work and any host fixes must not regress run-80 trust/opt-out guarantees.

Acceptance criteria:
- Offline/contract suites for signature/channel/policy fail-closed and opt-out independence remain green.
- Live `--track=dev` API smoke may be re-run as regression but is not a substitute for `R7`–`R9`.
- Contribution opt-out alone still does not revoke eligible imported recommendations.
- No unsigned convenience endpoint introduced for green browser evidence.

### `R11` Strict TDD for all in-scope product and harness changes

Description:
Phase 3 uses `TDD Mode: strict`. No production implementation for in-scope product behavior lands without a failing test first, then minimum green, then refactor with suites still green.

Acceptance criteria:
- Phase 3 artifact declares `TDD Mode: strict` and links RED/GREEN/REFACTOR evidence under the run evidence tree.
- Every in-scope production code change cites:
  - **RED:** failing test against predecessor behavior (log path + expected failure),
  - **GREEN:** minimal implementation making that test pass,
  - **REFACTOR:** suites still green after cleanup.
- Mandatory layers by theme:
  - KW activation (`R1`–`R5`): unit + TB10/contract regression + packaged probe as applicable
  - Browser recommendation (`R7`–`R9`): UI unit/contract where UI code changes + browser e2e against rebuilt SEA
  - Server (`R6` if required): offline cloud tests + RED/GREEN
- Live browser layer is mandatory for `R7`–`R9` PASS and recorded separately from offline GREEN.
- Quarantined, skipped, `.only`, or structurally green-only tests cannot satisfy a requirement gate.
- Pragmatic TDD is **not** permitted unless a locked addendum records impossibility + compensating evidence (default: refuse).

### `R12` Rebuilt packaged-runtime verification gate

Description:
Operator-facing acceptance requires verification against a freshly rebuilt packaged public runtime (and private Track B distribution when private packages/sidecar inputs change). Stale binaries fail the gate.

Acceptance criteria:
- After implementation, public `pnpm runtime:package-sea` succeeds (and `pnpm runtime:validate-packaging` when packaging contracts change).
- When Track B extensions must be present, packaging sets `ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT` to a current private `dist/run00-dev` (or equivalent) from `pnpm build:run00-runtime` when private distribution inputs changed — or an evidence note proves the existing distribution is current and unchanged.
- Packaged public runtime is started from that freshly built artifact (`scripts/track-b/launch-packaged-runtime.mjs` or equivalent).
- Browser verification for `R7`–`R9` and packaged activation checks for `R5` target that rebuilt runtime via `RUNTIME_LIVE_BASE_URL` (or equivalent), not an older binary.
- Evidence records include: rebuild command(s), cwd, exit code(s), artifact path and/or hash, start command, listen URL, Track B staging note, env binding names (not secret values), and test/harness results.
- Stale-binary rule: if relevant sources changed and rebuild was skipped, verification FAIL.
- Readiness regression: overview must not stick on persistent `503 runtime_initializing` solely due to extension-host registration lag during verification.
- Extensibility: rebuild/verify evidence schema fields are additive so future runs can attach stage/main artifacts without renaming this run’s binder.

### `R13` Machine-checkable evidence binder and closeout

Description:
Closeout evidence is structured, secret-free, and sufficient for later audits to verify `R1`–`R12` without chat context.

Acceptance criteria:
- Run evidence root `/.recursive/run/81-kw-activation-browser-recommendation-evidence/evidence/` contains a binder (JSON and/or Markdown index) listing:
  - pins / HEAD SHAs for public + private worktrees at verification time
  - rebuild artifact path/hash (`R12`)
  - KW activation policy summary + RED/GREEN paths (`R1`–`R5`, `R11`)
  - `serverChange: required | not-required` (`R6`)
  - `--track=dev` host + channel + recommendation ids for browser hops (`R7`–`R9`)
  - browser trace/screenshot paths
  - offline suite commands + exit codes
  - explicit statement that run-80 API-only live PASS was not substituted for browser PASS
  - explicit statement that ungated always-on activation is not claimed
- Binder contains **no** private keys, tokens, or raw `.env` contents.
- Phase 4/5 artifacts cite binder paths in `Requirement Completion Status` for each verified `R#`.
- Binder schema is additive (new fields allowed; required fields listed above must remain).

### `R14` Dual-repo paired delivery on `dev` with synced run id

Description:
Land public and private changes as a paired delivery on `dev`, using the same run id in both repositories. Do not auto-promote to `stage` or `main`.

Acceptance criteria:
- Run folder `/.recursive/run/81-kw-activation-browser-recommendation-evidence/` exists in both public and private repos.
- Public contract/host/UI/harness changes merge (or are ready to merge) to public `dev` before private consumers pin that public revision when a pin is required.
- Private KW/TB10/cloud/test/evidence pins the public revision when cross-repo contracts change.
- No promotion to `stage` or `main` by this run unless the user explicitly authorizes it later.
- Phase 6/7 update DECISIONS/STATE:
  - close the “KW productionActivation still needs a dedicated run” follow-up with the new policy/lifecycle truth (gated, not ungated);
  - record that browser UI live recommendation evidence residual from run 80 is closed;
  - retain production-track refuse + no auto-promotion.

## Verification matrix (cross-cutting)

| Gate | Offline unit/contract | TB10 / local | Rebuilt SEA | Live `--track=dev` | Browser UI |
|---|---|---|---|---|---|
| `R1` policy default-off | **required** | **required** | packaged probe | n/a | copy check if UI |
| `R2` gated activate success | **required** | **required** | as applicable (`R5`) | only if server attestation | n/a unless UI control |
| `R3` refuse/rollback matrix | **required** | **required** | recommended | n/a | n/a |
| `R4` UI/host honesty | **required** if UI/host touched | n/a | recommended | n/a | **required** if copy/controls |
| `R5` packaged activation verify | n/a | supporting | **required** | n/a | optional |
| `R6` server (if required) | **required** | cloud offline | as needed | as needed | n/a |
| `R7` UI download/preview | UI unit if changed | n/a | host for live | **required** | **required** |
| `R8` UI apply | UI unit if changed | n/a | host for live | **required** | **required** |
| `R9` UI dismiss | UI unit if changed | n/a | host for live | **required** | **required** |
| `R10` trust/opt-out regression | **required** | recommended | optional | optional API smoke | n/a |
| `R11` TDD | RED/GREEN logs | as changed | as changed | live green separate | e2e green separate |
| `R12` rebuild gate | n/a | n/a | **required** | consumes rebuild | consumes rebuild |
| `R13` binder | index offline | index TB10 | index rebuild | index live | index traces |
| `R14` dual-repo | n/a | n/a | n/a | n/a | n/a |

Interpretation rule: a cell marked **required** must PASS with evidence before the owning `R#` may be `verified`. “Recommended” gaps must be named residuals, not silent omissions.

## Evidence layout (required)

```text
.recursive/run/81-kw-activation-browser-recommendation-evidence/evidence/
  binder.json
  logs/
    red/ ...
    green/ ...
    tb10-*.log
    rebuild-public-sea.log
    rebuild-private-run00.log    # if private dist rebuilt
    browser-dev-download.log
    browser-dev-apply.log
    browser-dev-dismiss.log
    local-ci-*.log
  other/
    activation-policy.md         # or .json schema summary
    server-change-decision.json  # required | not-required
    rebuild-receipt.json
    material-probe-dev.json      # if reseeded
  screenshots/
  traces/
```

Paths may be adjusted, but the binder must resolve whatever paths are used.

## Extensibility and future-proofing

1. **Activation policy versioning:** policy schema is versioned (`activationPolicyVersion` or equivalent); future fields append; unknown fields fail closed or are ignored per explicit Phase 2 rule (choose one; test it).
2. **Track parameterization:** browser/live harnesses accept `--track=dev|stage` (production refused). Stage evidence is additive and must not redefine `dev` PASS.
3. **Axis independence:** new features must not collapse enablement/recommendation/activation into one flag without an approved requirements addendum.
4. **TB10 growth:** new activation cases append; fail-closed default coverage remains.
5. **Evidence binder:** additive JSON fields only; required keys remain stable for auditors.
6. **N/N-1:** public host/UI changes keep inactive-default clients working or document intentional paired break with private pin bump in the same run.
7. **Server contracts:** if `R6` lands changes, prefer additive fields compatible with existing recommendation server-return family; do not invent a second unsigned wire format for browser green.
8. **UI optional depth beyond this run:** this run makes browser recommendation evidence mandatory; future tracks can reuse the same Playwright shape with binding changes only.

## Out of Scope

- `OOS1`: Ungated / always-on production prompt injection without policy inputs.
- `OOS2`: Enabling rich capture, training-use, external RL export, or external archive by default.
- `OOS3`: Lifting the live Cloudflare harness ban on `--track=production`.
- `OOS4`: Auto-promotion CD to `stage`/`main` beyond this run’s `dev` evidence.
- `OOS5`: Proposal-corpus documentation refresh of historical “implementation not started” status (separate docs run).
- `OOS6`: TB11 `predecessorReceipts` maxItems upstream schema fix.
- `OOS7`: Redesigning Extensions Set-mode / Mode-row layout beyond honesty copy or minimum activation UI needed for `R4`.
- `OOS8`: Full Cloudflare track reprovision from scratch when permanent-dev workers can be repaired/seeded.
- `OOS9`: Replacing Ed25519 / server-return contract family with a new crypto scheme.
- `OOS10`: Human-only Manual QA mandate (agent-operated browser QA remains allowed; human sign-off optional unless Phase 5 declares hybrid/human).
- `OOS11`: Mandatory `--track=stage` browser or activation evidence (additive only).
- `OOS12`: Unlocking Profile Learner or other packages’ shadow `productionActivation` flags unless Phase 1 proves they are the same KW activation authority (default: leave other packages unchanged).

## Constraints

- Machine authorities and predecessor contracts win where applicable; no unsigned convenience path for browser PASS or activation success.
- Live cloud E2E remains opt-in and limited to `dev` and `stage`; default `pnpm test` / CI stay offline-only.
- Bound-cloud browser PASS for `R7`–`R9` must use `--track=dev`.
- Work stays on `dev` until explicit user promotion.
- Diff basis is recorded in `00-worktree.md` and not silently substituted later.
- Phase 3 `TDD Mode: strict` is mandatory (`R11`).
- Operator-facing verification requires rebuilt packaged runtime evidence (`R12`).
- Secrets, signing keys, and Cloudflare credentials stay out of git (`R13`).
- Downstream phases must use machine-checkable `Requirement Completion Status` for every `R1`–`R14` (`implemented`/`verified` with Changed Files + distinct verification evidence for `verified`).
- Do not author Phase 3–8 docs before each phase’s real work (anticipatory closeout is a fail).

## Assumptions

- Permanent-dev Cloudflare recommendation workers remain available or repairable without `OOS8` for browser hops.
- Operator/agent executing live browser verification can access required non-git secrets for `--track=dev`.
- Run-80 seed/lifecycle helpers (or successors) can publish Windows-safe scoped material for UI hops.
- Public Signed-recommendations UI from runs 79/80 remains the preferred browser surface.
- `00-worktree.md` will be completed and locked before implementation; this requirements document stays `DRAFT` until explicitly locked after user approval and recursive-init.

## Coverage Gate

- Effective inputs reviewed:
  - User request for KW policy/lifecycle + browser UI live recommendation evidence; strict TDD; rebuilt runtime; server-side if needed; unlock hard-off as needed (2026-07-24)
  - Private STATE / DECISIONS / domain memory (KW follow-up; run-80 browser residual)
  - AS-IS KW extension + TB10 fixtures + Extensions UI recommendation controls
  - Run 80 requirements patterns for TDD/rebuild/binder/extensibility
- Requirement coverage check:
  - Theme A: `R1`–`R6` (policy, activate, matrix, honesty, packaged verify, optional server)
  - Theme B: `R7`–`R10` (browser download/preview/apply/dismiss + trust regression)
  - Cross-cutting: `R11`–`R14` (TDD, rebuild, binder, dual-repo)
- Out-of-scope confirmation: `OOS1`–`OOS12` explicit
- Lock state: `DRAFT` (ready to lock after worktree PASS)

Coverage: PASS

## Approval Gate

- Objective readiness checks:
  - Requirements cover both requested themes with observable criteria
  - Gated KW unlock authorized (`FD5`) without allowing ungated injection (`OOS1`)
  - Browser UI live evidence mandatory (`FD11`, `R7`–`R9`)
  - Strict TDD + rebuilt SEA gates first-class (`R11`, `R12`)
  - Server changes conditional and additive (`R6`, `FD9`)
  - Extensibility / future-proofing section present
  - Run id `81` (public max+1)
  - User approved draft 2026-07-24; written into both worktree run folders
- Remaining blockers:
  - Phase 0 worktree lock, then Phase 1+

Approval: PASS
