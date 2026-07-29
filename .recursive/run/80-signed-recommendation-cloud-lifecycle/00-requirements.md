Run: `/.recursive/run/80-signed-recommendation-cloud-lifecycle/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-07-24T10:52:36Z`
LockHash: `efe0dd456210f8a5802c65dad97af9ffd1dd608b6c3334226d08afac723cca3b`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- User direction (2026-07-24): create and strengthen run 80 requirements — consistent, comprehensive, thorough, detailed, verifiable, future-proof, and extensible; strengthen TDD and rebuilt-runtime verification
- Prior recommendation: live `--track=dev` signed recommendation download → validate → preview → apply and dismiss; KW `productionActivation` remains OOS
- Public run numbering: highest prior public run `79-extension-control-and-recommendations-qa` → this run id is `80`
- `D:/DEV/role-model-internal/.recursive/STATE.md`
- `D:/DEV/role-model-internal/.recursive/DECISIONS.md`
- `D:/DEV/role-model-internal/.recursive/memory/MEMORY.md`
- `D:/DEV/role-model-internal/.recursive/memory/domains/direct-track-b.md`
- Predecessor runs:
  - `00-direct-track-b-v1-1-implementation` (TB00–TB11 + PCR local/provisioned signed-apply evidence)
  - `79-extension-control-and-recommendations-qa` (mutate/dismiss APIs + Extensions UI; **live cloud signed-material apply/dismiss deferred**)
- Proposal / machine authorities:
  - `.../proposals/crowdsourced-evals/docs/guidance/16_crowdsourced_evidence_recommendations.md`
  - `.../proposals/crowdsourced-evals/docs/guidance/17_server_return_packets_client_usage.md`
  - `.../proposals/crowdsourced-evals/docs/guidance/19_cloudflare_server_aggregation_and_recommendation_engine.md`
  - `.../proposals/crowdsourced-evals/docs/guidance/server-return-contracts.schema.json`
  - `.../proposals/crowdsourced-evals/docs/guidance/product-defaults.json`
  - `.../proposals/crowdsourced-evals/docs/guidance/product-state-transitions.json`
  - `.../proposals/crowdsourced-evals/docs/phase-specs/v1.1/phases/tb08_cloud-ingestion-history-aggregation-and-recommendations.md`
- Operator docs and harnesses: `docs/testing.md`, `docs/cloudflare-cloud-path.md`, `scripts/track-b/launch-packaged-runtime.mjs`, `scripts/track-b/local-cloud-runtime.mjs`, `pnpm test:cloud:e2e`
- Current public surfaces (AS-IS anchors, not invent-new unless defective):
  - `POST /api/role-model/recommendations/download`
  - `POST /api/role-model/recommendations/apply`
  - `POST /api/role-model/recommendations/dismiss`
  - `GET /api/role-model/recommendations/active-pack`
  - host-bridge env: `ROLE_MODEL_RECOMMENDATION_SERVICE_URL`, `ROLE_MODEL_RECOMMENDATION_VERIFICATION_KEY`, `ROLE_MODEL_RECOMMENDATION_CHANNEL`, optional material file bindings
Outputs:
- `/.recursive/run/80-signed-recommendation-cloud-lifecycle/00-requirements.md`
Scope note: Defines the authoritative Phase 0 requirements for closing the deferred **live bound-cloud** signed recommendation lifecycle on Cloudflare `--track=dev`, under **strict TDD**, with acceptance proven on a **freshly rebuilt packaged runtime** plus offline/local-cloud regression harnesses that remain extensible. Does not unlock Knowledge Worker production activation. Does not auto-promote to `stage`/`main`.

## TODO

- [x] Elicit requirements from user/context and proposal authorities
- [x] Align run id with public max+1 (`79` → `80`)
- [x] Author comprehensive `R1`–`R12` with observable acceptance criteria
- [x] Add fixed decisions, open unknowns, lifecycle vocabulary, and API/env binding tables
- [x] Strengthen strict TDD matrix (`R8`) and rebuilt-runtime + multi-layer verification (`R9`–`R11`)
- [x] Add extensibility / future-proofing and evidence layout contracts
- [x] Document out of scope (`OOS1`–`OOS10`)
- [x] Confirm Status remains `DRAFT` (never locked; no unlock required)
- [x] Mirror requirements to public + private run folders
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Background

### Goal

An operator (or agent-operated QA) using a **freshly rebuilt** public packaged runtime, bound to authentic Cloudflare **`--track=dev`** recommendation trust material, can complete the signed recommendation trust loop end-to-end:

1. material is available and channel-bound;
2. download / resolve imports a signed server-return snapshot;
3. validation fails closed on bad trust;
4. preview/list shows validated rows;
5. apply succeeds only when policy allows;
6. dismiss terminates without apply;
7. receipts and evidence are durable and secret-free;

…with offline and local-cloud suites remaining green so future tracks/channels can reuse the same harness shape.

### Problem

- Run 79 closed public dismiss + local SEA mutate/dismiss, but **explicitly deferred** live cloud signed-material apply/dismiss against bound `--track=dev` when material was unavailable.
- Run 00 PCR proved signed apply against **local/provisioned** recommendation services; that evidence is **historical** and does **not** satisfy this run’s live permanent-dev closeout against a post-79 rebuilt runtime.
- Proposal TB08 / Guidance 16–17/19 / `server-return-contracts.schema.json` treat signed return bundles, channel partitioning, keyring checks, and policy-gated apply as the recommendation trust path. That live bound-cloud PASS remains open.

### Scope

| Axis | In scope |
|---|---|
| Repos | `try-works/role-model` (public) + `try-works/role-model-internal` (private) |
| Run id | `80-signed-recommendation-cloud-lifecycle` (mirrored) |
| Branch | `dev` only unless user later authorizes promotion |
| Cloud track for PASS | `--track=dev` required; `--track=stage` optional additive; `--track=production` refused |
| Client APIs | Prefer existing download / apply / dismiss / active-pack; add only minimum fixes |
| Server | Prefer existing recommendation-service / history / ingest permanent-dev workers; seed/repair/publish as needed |
| Verification | Strict TDD + offline/local-cloud regression + **rebuilt SEA** live verification |

### Non-goals (summary)

See **Out of Scope**. Notably: KW production activation, production-track live writes, stage/main auto-promotion, proposal-corpus status rewrite, Extensions UI redesign, full Cloudflare reprovision epic.

### Success definition (run-level)

The run may claim Phase 4/5 PASS for recommendation lifecycle only when **all** of the following are true:

1. Every in-scope `R#` has machine-checkable `Requirement Completion Status` reaching `verified` (or an explicit addendum-bound residual that does **not** claim PASS for that `R#`).
2. `R8` RED/GREEN evidence exists for every in-scope production code change.
3. `R9` rebuilt packaged runtime evidence exists and live `R2`/`R3`/`R4` hops targeted that artifact.
4. `R11` evidence binder under the run tree lists hosts, recommendation ids, channel, rebuild hashes/paths, and commands without secrets.
5. Historical PCR/local SEA proofs are cited only as predecessors, never as substitutes for `R2`/`R3` live `--track=dev` PASS.

## Fixed Decisions

| ID | Decision |
|---|---|
| `FD1` | Live PASS track for this run is Cloudflare `--track=dev` (`runtimeChannel=development`, `recommendations-dev.role-model.dev` / current documented permanent-dev binding). |
| `FD2` | Prefer existing public recommendation APIs; do not invent parallel unsigned convenience endpoints for green evidence. |
| `FD3` | Phase 3 `TDD Mode: strict` is mandatory for all in-scope production code changes. |
| `FD4` | Operator-facing live verification must run against a freshly rebuilt packaged public SEA (stale binary = FAIL). |
| `FD5` | Knowledge Worker `productionActivation` remains hard-off; recommendation apply ≠ production prompt injection. |
| `FD6` | Secrets/keys stay out of git; evidence cites hosts, ids, digests, and receipt paths only. |
| `FD7` | Local PCR / local-cloud signed-apply history from run 00 is non-substituting for this run’s live `--track=dev` closeout. |
| `FD8` | Contribution opt-out alone must not revoke eligible already-imported compatible unexpired recommendations (proposal Q-TB-08 / Guidance 16–17). |
| `FD9` | Independent product axes remain independent: installed ≠ enabled ≠ upload ≠ training-use ≠ recommendation access. |
| `FD10` | Work stays on `dev`; no auto-promotion to `stage`/`main`. |

## Open Unknowns (must resolve before claiming `R1`/`R2`/`R3` PASS)

| ID | Unknown | Resolution rule |
|---|---|---|
| `U1` | Whether permanent-dev recommendation workers already hold publishable signed heads or need seed/publish | Resolve in Phase 1/3 via probe; if missing, implement/seed under `R1` without full reprovision epic (`OOS8`) |
| `U2` | Exact verification key / channel env values for agent-operated QA | Resolve via local secrets / operator vault; never commit; record only that binding existed |
| `U3` | Whether UI preview is a distinct page control vs list-after-download | Prefer existing UI; if absent, API-level preview/list after download satisfies preview for PASS, with optional UI evidence |
| `U4` | Whether stage additive evidence will be collected | Optional; cannot replace `dev` PASS |

## Canonical lifecycle vocabulary

Use these statuses/terms consistently in tests, receipts, UI copy, and evidence. Map to existing code enums where present; do not invent conflicting synonyms without documenting the mapping.

| Term | Meaning |
|---|---|
| `material` | Signed server-return snapshot / recommendation bundle resolvable from the bound recommendation service |
| `download` | Client pull that resolves + imports signed material into local recommendation state |
| `validated` | Local row/bundle passed signature + channel/scope checks (`signatureValid: true` or equivalent) |
| `preview` | Operator-visible inspected state prior to apply (list/detail after download; optional dedicated preview API/UI) |
| `applied` | Recommendation pack activated locally (`activePack` set; status `applied`) |
| `dismissed` | Terminal non-applied decline (`status: dismissed`); must not set `activePack` for that id |
| `rejected` | Existing terminal non-applied status if present; treat as non-applicable like dismissed for apply |
| `recommendationAccess` | Local axis: `disabled` \| `download_only` \| `preview_and_apply` |
| `channel` / `runtimeChannel` | Trust partition (`development` for `--track=dev`) |

Forbidden for PASS narration: claiming “live cloud signed closeout” from local-only material file injection **unless** that injection is explicitly labeled offline fixture evidence and separate live hops still PASS.

## Public API / env binding inventory (preferred surface)

| Surface | Role |
|---|---|
| `POST /api/role-model/recommendations/download` | Resolve/import signed material |
| `POST /api/role-model/recommendations/apply` | Policy-gated apply by `{ id }` |
| `POST /api/role-model/recommendations/dismiss` | Terminal dismiss by `{ id }` |
| `GET /api/role-model/recommendations/active-pack` | Observe applied pack |
| `GET /api/role-model/recommendations` (if present) / list via download result | Observe validated/dismissed/applied rows |
| `ROLE_MODEL_RECOMMENDATION_SERVICE_URL` | Bound recommendation service base URL |
| `ROLE_MODEL_RECOMMENDATION_VERIFICATION_KEY` | Trust verification key (secret) |
| `ROLE_MODEL_RECOMMENDATION_CHANNEL` | Expected channel (must match `--track=dev` binding for live PASS) |
| `ROLE_MODEL_RECOMMENDATION_MATERIAL_FILE` | Offline/local fixture only; cannot alone satisfy live `R2`/`R3` |
| `ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT` | SEA packaging input for Track B extensions when required |

## Requirements

### `R1` Bound-cloud signed recommendation material on `--track=dev`

Description:
Make authentic signed recommendation / server-return material available and discoverable for the permanent-dev Cloudflare track so live client flows are not blocked by “material unavailable.” Material must match channel/scope contracts for `development` / `recommendations-dev` (or the current documented `--track=dev` binding in `docs/cloudflare-cloud-path.md` / `docs/testing.md`).

Acceptance criteria:
- A reproducible, secret-free procedure exists to probe, seed, publish, or resolve signed recommendation material for `--track=dev` (script, doc section under run evidence, or private `scripts/track-b/` helper).
- During verification, at least one recommendation id / snapshot is resolvable from the bound `dev` recommendation service (not solely from a local material file).
- Published/resolved material binds the expected `runtimeChannel` / channel id for `dev`; production or stage material must not be accepted as `--track=dev` success evidence.
- Procedure records: command(s), host(s), channel, snapshot/recommendation id(s), and result code — without private keys or tokens.
- If workers are healthy but empty, seeding/publishing is in-scope; full multi-worker reprovision from scratch remains `OOS8`.
- Extensibility: the procedure accepts a track/channel parameter so `--track=stage` can reuse it later without rewriting the contract.

### `R2` Live signed download / validate / import

Description:
Close the live download path: the rebuilt packaged runtime, bound to `--track=dev` trust env, downloads/resolves signed material and imports validated recommendation rows.

Acceptance criteria:
- With `ROLE_MODEL_RECOMMENDATION_SERVICE_URL`, verification key, and channel bound for `dev`, `POST /api/role-model/recommendations/download` succeeds against live material from `R1`.
- Successful download yields one or more local recommendation rows with validated signature state (`signatureValid: true` or equivalent) and non-applied status until apply.
- Missing trust env fails closed with an explicit configuration error (does not silently use unsigned local defaults as live PASS).
- Live evidence under the run tree includes request/response summaries (redacted), recommendation id(s), channel, and correlation to the rebuilt runtime identity from `R9`.
- Offline/unit/contract tests cover download/import success and at least one trust configuration failure without live cloud.

### `R3` Live preview and policy-gated apply

Description:
Close the live apply path: after download/validate, the operator can preview/inspect and apply when `recommendationAccess` / policy allows `preview_and_apply`.

Acceptance criteria:
- After successful `R2` download, recommendation id(s) are visible via list/download result and/or UI (preview).
- `POST /api/role-model/recommendations/apply` with `{ "id": "<id>" }` succeeds only when signature validates **and** local policy allows apply (`recommendationAccess === "preview_and_apply"` and `policyAllowed`).
- Successful apply sets status `applied` and populates `activePack` (or equivalent) observable via `GET /api/role-model/recommendations/active-pack`.
- Apply of `dismissed` or `rejected` ids fails closed.
- Live apply evidence is stored under the run evidence tree and cites the same track/channel/runtime rebuild as `R2`.
- Offline/unit/contract tests cover apply success, policy block (`download_only` / `disabled`), and dismissed-cannot-apply without live cloud.

### `R4` Live dismiss without apply

Description:
Close the live dismiss path using `POST /api/role-model/recommendations/dismiss` against bound `--track=dev` material (same set as `R2`, or a second live id from that set).

Acceptance criteria:
- Dismiss against a live downloaded, non-applied recommendation id records terminal `dismissed`.
- Dismiss does not set `activePack` for that id and does not require a prior successful apply.
- Idempotent re-dismiss of an already-dismissed id remains non-destructive (no apply; no crash).
- Apply after dismiss fails closed.
- Live dismiss evidence is stored under the run evidence tree and correlates to the same track/channel/runtime rebuild as `R2`.
- Offline/unit/contract tests cover dismiss, idempotent dismiss, and dismiss-blocks-apply.

### `R5` Fail-closed recommendation trust matrix

Description:
Preserve and prove fail-closed trust behavior. A green live hop must never require weakening signature, channel, keyring, or policy checks.

Acceptance criteria (minimum matrix — each cell has a named test or live negative probe with evidence):

| Case | Expected |
|---|---|
| Tampered / wrong signature | refuse import or refuse apply; no `applied` |
| Unsigned / missing signature | refuse |
| Wrong channel / scope vs client binding | refuse |
| Stale / non-monotonic revision or channel sequence (where enforced) | refuse |
| Revoked / expired key (where keyring status is available) | refuse |
| `recommendationAccess=disabled` | no apply; download behavior remains policy-faithful |
| `recommendationAccess=download_only` | download/validate may succeed; apply refused |
| Cross-track material (stage/prod into `dev` client) | refuse as `--track=dev` success |
| Applied id dismiss | refuse |
| Dismissed id apply | refuse |

- Contract/integration tests cover at least: bad signature, wrong channel/scope, policy-blocked apply, dismissed-cannot-apply, applied-cannot-dismiss.
- No requirement in this run authorizes bypassing signature verification for convenience.
- Future-proofing: new trust failure modes added later must extend this matrix rather than replace it; tests remain additive.

### `R6` Contribution opt-out independence

Description:
Recommendation download/preview/apply eligibility remains independent of upload/contribution opt-out per proposal Guidance 16–17 / Q-TB-08, subject to otherwise-enabled recommendation settings.

Acceptance criteria:
- Setting contribution/upload off (or equivalent opt-out) does **not** by itself revoke an already-imported compatible unexpired recommendation.
- Opt-out alone is not sufficient reason to delete validated local rows or force dismiss.
- Offline/contract test demonstrates opt-out without forced revocation of an eligible imported recommendation.
- Docs/evidence language does not equate “upload stopped” with “recommendations disabled.”

### `R7` Keep Knowledge Worker production activation hard-off

Description:
This run must not unlock Knowledge Worker / route-package production activation. Recommendation apply is not production prompt injection.

Acceptance criteria:
- `KnowledgeWorker.productionActivation` remains `false` (or equivalent immutable guard).
- Any activate / inject / production prompt-injection path still fails closed with an explicit error.
- Existing TB10 / KW activation-guard style regression tests remain green.
- Copy, API docs, and STATE/DECISIONS updates introduced by this run do not claim KW production activation is available.
- Applying a recommendation pack must not flip KW production activation.

### `R8` Strict TDD for all in-scope product and harness changes

Description:
Phase 3 uses `TDD Mode: strict`. No production implementation for in-scope product behavior lands without a failing test first, then minimum green, then refactor with suites still green. Pure ops seeding for `R1` may be documented without product code, but any code/harness/API/test-helper change that alters product-observable behavior must follow strict TDD.

Acceptance criteria:
- Phase 3 artifact declares `TDD Mode: strict` and links RED/GREEN/REFACTOR evidence under the run evidence tree.
- Every in-scope production code change cites:
  - **RED:** failing test against predecessor behavior (log path + expected failure),
  - **GREEN:** minimal implementation making that test pass,
  - **REFACTOR:** suites still green after cleanup.
- Mandatory layers for changed recommendation trust/apply/dismiss behavior:
  - unit
  - contract
  - integration (host-bridge and/or local-cloud)
  - regression (predecessor dismiss/apply guards from run 79 remain green)
- Live layer (`--track=dev`) is mandatory for `R2`/`R3`/`R4` PASS and must be recorded separately from offline GREEN.
- Browser/Playwright coverage is required for at least one operator-visible apply **or** dismiss path against the rebuilt runtime when a UI surface exists; if UI is absent, API live evidence satisfies UI-or-API for that path and the gap is recorded as residual (not a silent skip).
- Quarantined, skipped, `.only`, or structurally green-only tests cannot satisfy a requirement gate.
- Pragmatic TDD is **not** permitted for this run unless a locked addendum records impossibility + compensating evidence (default: refuse).

### `R9` Rebuilt packaged-runtime verification gate

Description:
Operator-facing acceptance requires verification against a freshly rebuilt packaged public runtime (and private Track B distribution when private packages/sidecar inputs change). Stale binaries fail the gate.

Acceptance criteria:
- After implementation, public `pnpm runtime:package-sea` succeeds (and `pnpm runtime:validate-packaging` when packaging contracts change).
- When Track B extensions must be present, packaging sets `ROLE_MODEL_TRACK_B_DISTRIBUTION_ROOT` to a current private `dist/run00-dev` (or equivalent) from `pnpm build:run00-runtime` when private distribution inputs changed — or an evidence note proves the existing distribution is current and unchanged.
- Packaged public runtime (`role-model-dev` / channel-appropriate SEA) is started from that freshly built artifact (`scripts/track-b/launch-packaged-runtime.mjs` or equivalent).
- Live/browser verification for `R2`/`R3`/`R4` targets that rebuilt runtime via `RUNTIME_LIVE_BASE_URL` (or equivalent), not an older binary.
- Evidence records include: rebuild command(s), cwd, exit code(s), artifact path and/or hash, start command, listen URL, Track B staging note, env binding names (not secret values), and test/harness results.
- Stale-binary rule: if relevant sources changed and rebuild was skipped, verification FAIL.
- Readiness regression from run 79: overview must not stick on persistent `503 runtime_initializing` solely due to extension-host registration lag during verification.
- Extensibility: rebuild/verify evidence schema fields are additive so future runs can attach stage/main artifacts without renaming this run’s binder.

### `R10` Offline and local-cloud regression harness (extensible)

Description:
Keep a durable offline/local-cloud path so recommendation trust regressions fail in CI/dev without permanent-dev credentials, while remaining the same shape as live hops.

Acceptance criteria:
- Offline unit/contract suites for download/apply/dismiss/trust failures remain runnable via default local test commands (no live Cloudflare required).
- Local-cloud or fixture path (`scripts/track-b/local-cloud-runtime.mjs` and/or recommendation material fixtures) can exercise signed import → apply and import → dismiss without `--track=dev`.
- Harness inputs are parameterized by service URL, channel, verification key source, and material source so `--track=dev` live mode is a binding change, not a fork of business logic.
- Default `pnpm test` / CI remain offline-only; live remains opt-in (`pnpm test:cloud:e2e` or run-scoped live scripts).
- Document how to extend the harness to `--track=stage` later without rewriting `R2`–`R5` contracts.

### `R11` Machine-checkable evidence binder and closeout

Description:
Closeout evidence is structured, secret-free, and sufficient for later audits to verify `R1`–`R10` without chat context.

Acceptance criteria:
- Run evidence root `/.recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/` contains a binder (JSON and/or Markdown index) listing:
  - pins / HEAD SHAs for public + private worktrees at verification time
  - rebuild artifact path/hash (`R9`)
  - `--track=dev` host + channel + recommendation/snapshot ids (`R1`–`R4`)
  - offline suite commands + exit codes (`R8`/`R10`)
  - live hop commands + exit codes (`R2`–`R4`)
  - RED/GREEN log paths (`R8`)
  - explicit statement that PCR/local historical proofs were not substituted for live PASS
- Binder contains **no** private keys, tokens, or raw `.env` contents.
- Phase 4/5 artifacts cite binder paths in `Requirement Completion Status` for each verified `R#`.
- Binder schema is additive (new fields allowed; required fields listed above must remain).

### `R12` Dual-repo paired delivery on `dev` with synced run id

Description:
Land public and private changes as a paired delivery on `dev`, using the same run id in both repositories. Do not auto-promote to `stage` or `main`.

Acceptance criteria:
- Run folder `/.recursive/run/80-signed-recommendation-cloud-lifecycle/` exists in both public and private repos.
- Public contract/host/UI/harness changes merge (or are ready to merge) to public `dev` before private consumers pin that public revision when a pin is required.
- Private cloud/worker/test/evidence pins the public revision when cross-repo contracts change.
- No promotion to `stage` or `main` by this run unless the user explicitly authorizes it later.
- Phase 6/7 update DECISIONS/STATE so the run-79 “live cloud signed-material deferred” limitation is cleared or replaced with a precise residual, and KW activation remains OOS.

## Verification matrix (cross-cutting)

| Gate | Offline unit/contract | Local-cloud / fixture | Rebuilt SEA | Live `--track=dev` | Browser (if UI) |
|---|---|---|---|---|---|
| `R1` material | probe docs/scripts | optional | n/a | **required** | n/a |
| `R2` download | **required** | recommended | host for live | **required** | optional |
| `R3` apply | **required** | recommended | host for live | **required** | required-if-UI |
| `R4` dismiss | **required** | recommended | host for live | **required** | required-if-UI |
| `R5` trust matrix | **required** | recommended | negative probes as needed | recommended negatives | n/a |
| `R6` opt-out independence | **required** | optional | optional | optional | n/a |
| `R7` KW hard-off | **required** | n/a | regression | n/a | copy check if UI touched |
| `R8` TDD | RED/GREEN logs | as changed | as changed | live green separate | as changed |
| `R9` rebuild gate | n/a | n/a | **required** | consumes rebuild | consumes rebuild |
| `R10` harness extensibility | **required** | **required** | optional | parameterized | n/a |
| `R11` binder | index offline | index local | index rebuild | index live | index screenshots |
| `R12` dual-repo | n/a | n/a | n/a | n/a | n/a |

Interpretation rule: a cell marked **required** must PASS with evidence before the owning `R#` may be `verified`. “Recommended” gaps must be named residuals, not silent omissions.

## Evidence layout (required)

```text
.recursive/run/80-signed-recommendation-cloud-lifecycle/evidence/
  binder.json                    # R11 machine index (or binder.md + json)
  logs/
    red/ ...
    green/ ...
    local-ci-*.log
    live-dev-download.log
    live-dev-apply.log
    live-dev-dismiss.log
    rebuild-public-sea.log
    rebuild-private-run00.log    # if private dist rebuilt
  other/
    material-probe-dev.json      # R1 secret-free
    rebuild-receipt.json         # R9
  screenshots/                   # if browser evidence
  traces/                        # optional Playwright/trace
```

Paths may be adjusted, but the binder must resolve whatever paths are used.

## Extensibility and future-proofing

1. **Track parameterization:** scripts/harnesses accept `--track=dev|stage` (production refused by harness). Stage evidence is additive and must not redefine `dev` PASS.
2. **API stability:** prefer additive fields on recommendation records/receipts; do not remove `dismissed`/`applied`/`signatureValid`/`policyAllowed` semantics without an addendum.
3. **Trust matrix growth:** new failure modes append rows to `R5`; do not shrink the minimum matrix without an approved requirements addendum.
4. **Evidence binder:** additive JSON fields only; required keys remain stable for auditors.
5. **N/N-1:** public host changes must keep prior dismiss/apply clients working or document an intentional paired break with private pin bump in the same run.
6. **Proposal authority evolution:** if `server-return-contracts.schema.json` gains fields, adapt importers/tests additively; do not invent a second unsigned wire format.
7. **UI optional depth:** API-complete live PASS is sufficient when UI is unchanged; UI tests become mandatory when this run modifies recommendation UI.

## Out of Scope

- `OOS1`: Knowledge Worker / route-package `productionActivation` or production prompt injection.
- `OOS2`: Enabling rich capture, training-use, external RL export, or external archive by default.
- `OOS3`: Lifting the live Cloudflare harness ban on `--track=production`.
- `OOS4`: Auto-promotion CD to `stage`/`main` beyond this run’s `dev` evidence.
- `OOS5`: Proposal-corpus documentation refresh of “implementation not started” status (separate docs run).
- `OOS6`: TB11 `predecessorReceipts` maxItems upstream schema fix.
- `OOS7`: Redesigning Extensions mutate/Set-mode UI from run 79 (reuse unless a defect blocks this run).
- `OOS8`: Full Cloudflare track reprovision from scratch when permanent-dev workers can be repaired/seeded.
- `OOS9`: Replacing Ed25519 / server-return contract family with a new crypto scheme.
- `OOS10`: Human-only Manual QA mandate (agent-operated QA remains allowed; human sign-off optional).

## Constraints

- Machine authorities win: `server-return-contracts.schema.json`, product-defaults/state-transitions, destination-authorization, TB08. No unsigned convenience path for live PASS.
- Live cloud E2E remains opt-in and limited to `dev` and `stage`; default `pnpm test` / CI stay offline-only.
- Bound-cloud verification for PASS of `R2`/`R3`/`R4` must use `--track=dev`.
- Work stays on `dev` until explicit user promotion.
- Diff basis is recorded in `00-worktree.md` and not silently substituted later.
- Phase 3 `TDD Mode: strict` is mandatory (`R8`).
- Operator-facing verification requires rebuilt packaged runtime evidence (`R9`).
- Secrets, signing keys, and Cloudflare credentials stay out of git (`R11`).
- Downstream phases must use machine-checkable `Requirement Completion Status` for every `R1`–`R12` (`implemented`/`verified` with Changed Files + distinct verification evidence for `verified`).

## Assumptions

- Permanent-dev Cloudflare workers (`ingest-dev` / `history-dev` / `recommendations-dev` on `role-model.dev`) remain available or repairable without `OOS8`.
- Operator/agent executing live verification can access required non-git secrets for `--track=dev`.
- Public recommendation download/apply/dismiss APIs from run 79 remain the preferred client surface.
- Local SEA / PCR signed-apply proofs remain historical predecessors only.
- `00-worktree.md` will be completed and locked before implementation; this requirements document stays `DRAFT` until explicitly locked.

## Coverage Gate

- Effective inputs reviewed:
  - User request to strengthen consistency, thoroughness, verifiability, future-proofing, TDD, and verification (2026-07-24)
  - Private STATE / DECISIONS / domain memory (run 79 deferral)
  - Proposal Guidance 16/17/19, TB08, server-return contracts
  - `docs/testing.md` / `docs/cloudflare-cloud-path.md`
  - Public host-bridge recommendation download/apply/dismiss + env bindings
  - Private `launch-packaged-runtime.mjs` / `local-cloud-runtime.mjs` harnesses
- Requirement coverage check:
  - `R1` material · `R2` download · `R3` apply · `R4` dismiss · `R5` trust matrix · `R6` opt-out independence · `R7` KW hard-off · `R8` strict TDD · `R9` rebuilt SEA · `R10` offline/local harness · `R11` evidence binder · `R12` dual-repo
- Out-of-scope confirmation: `OOS1`–`OOS10` explicit
- Lock state: `DRAFT` (no lock receipt; unlock not required)

Coverage: PASS

## Approval Gate

- Objective readiness checks:
  - Requirements expanded for consistency, verifiability, TDD depth, rebuild verification, and extensibility
  - Run id remains `80` (public max+1)
  - Live `--track=dev` closeout is distinct from historical PCR/local proofs
  - Acceptance criteria are observable and matrix-mapped
  - Status remains `DRAFT` pending explicit lock
- Remaining blockers:
  - Phase 0 worktree isolation + requirements lock still required before implementation

Approval: PASS
