Run: `/.recursive/run/43-benchmark-routing-display/`
Phase: `02 To-Be Plan`
Addendum: `02`
Status: `DRAFT`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/43-benchmark-routing-display/addenda/05-manual-qa.addendum-02.md` (DRAFT — S1–S3)
- `/.recursive/run/43-benchmark-routing-display/00-worktree.md` (LOCKED)
- `/.recursive/run/06-router-runtime-provider-accounts-sqlite-memory/02-to-be-plan.md` (credential-ref-by-name precedent)
- External operator config (not in repo): `%TEMP%\role-model-run42-verify-state\runtime-config.yaml`
Outputs:
- `/.recursive/run/43-benchmark-routing-display/addenda/02-to-be-plan.addendum-02.md`
Scope note: Move DeepSeek credential from inline `api_key` to `${DEEPSEEK_API_KEY}`; harden bridge so SQLite never stores literal API keys in `credential_ref`. Worktree-only control plane.

## TODO

- [x] Map S1–S3 to implementation slices with TDD mode
- [x] Define RED/GREEN evidence paths under worktree `evidence/logs/`
- [x] Define Phase 4 automated checks and Phase 5 re-verification
- [x] Execute slices in worktree (Phase 3 follow-up)
- [ ] Lock addendum after implementation + verification

## Effective Inputs Re-read

- `05-manual-qa.addendum-02.md`: inline key in external yaml; literal key in SQLite `deepseek.litellm.credential_ref`
- Locked provider-account design: SQLite persists **credential references**, not raw secrets (`packages/sqlite-memory/test/index.test.ts` — `OPENAI_API_KEY` ref pattern)
- Current bug: `resolveEnvCredentialRef()` line `ref: envMatch?.[1] ?? value` treats inline secrets as ref values

## Problem statement

Operator runtime uses inline `api_key: sk-…` under `litellm_proxy.providers.deepseek` in **external** `runtime-config.yaml`. The bridge already supports `${DEEPSEEK_API_KEY}` syntax (see `unified-runtime-config.test.ts`), but inline values:

1. **Leak into runtime state** — `provider_accounts.credential_ref` holds the full key string.
2. **Expand blast radius** — backups, logs, and sqlite dumps may carry the secret outside the intended config file.
3. **Contradict fixture/test intent** — testdata uses `"ref": "DEEPSEEK_API_KEY"` (name only).

**Target end state:**

| Location | Content |
| --- | --- |
| Repo | Env var **names** only (`DEEPSEEK_API_KEY`, catalog metadata) |
| External `runtime-config.yaml` | `api_key: ${DEEPSEEK_API_KEY}` |
| Host environment | Actual `DEEPSEEK_API_KEY` value (user shell, service env, or local secrets manager) |
| SQLite `credential_ref` | `DEEPSEEK_API_KEY` (never `sk-…`) |
| LiteLLM generated config | `${DEEPSEEK_API_KEY}` passthrough (vendor-litellm already preserves ref strings) |

## Requirement delta

| ID | Finding | Slice | Disposition |
| --- | --- | --- | --- |
| S1 | Literal key in SQLite | SP43-S1 | remediate (product) |
| S2 | Inline key in external yaml | SP43-S2 | migrate (ops) |
| S3 | DeepSeek still routes after change | SP43-S3 | re-verify |

## Worktree execution context

| Field | Value |
| --- | --- |
| Worktree | `D:\DEV\role-model\.worktrees\43-benchmark-routing-display` |
| Branch | `recursive/43-benchmark-routing-display` |
| Run control plane | `/.recursive/run/43-benchmark-routing-display/` **in worktree only** |
| External config | `C:\Users\erikb\AppData\Local\Temp\role-model-run42-verify-state\runtime-config.yaml` |
| External state DB | `…\run43-verify\memory\memory.sqlite` (under same state root) |
| Product paths | `role-model-router/apps/runtime-host-bridge/src/index.ts`, `…/unified-runtime-config.ts`, `packages/vendor-litellm/`, `packages/sqlite-memory/test/` |

## Implementation slices

### SP43-S1 — Never persist inline API keys in `credential_ref` (S1)

**TDD mode:** strict (Iron Law)

| Step | Action |
| --- | --- |
| RED | New bridge unit test: `resolveEnvCredentialRef` / `createUnifiedProviderAccounts` with `apiKeyRef: "sk-inline-test-key"` → persisted `credentialRef.ref` must equal `DEEPSEEK_API_KEY` (fallback), **not** the inline string |
| RED | Extend sqlite-memory or bridge integration test: after `persistProviderAccounts`, `credential_ref` column must not match `/^sk-[A-Za-z0-9]/` for env-backed accounts |
| GREEN | Update `resolveEnvCredentialRef()` in `index.ts`: when `${ENV}` match → use env name; when value looks like an inline secret (e.g. `sk-` prefix or fails env-ref pattern) → use `fallbackName`; never assign raw secret to `ref` |
| GREEN | Optional guard in `normalizeUnifiedRuntimeConfigInput` / provider parse: emit structured diagnostic if `api_key` is inline secret (warn operator to use `${PROVIDER}_API_KEY`) — do not block `none` sentinel |
| Log RED | `evidence/logs/red/sp43-s1-credential-ref-no-inline.red.log` |
| Log GREEN | `evidence/logs/green/sp43-s1-credential-ref-no-inline.green.log` |

**Primary files:**

- `apps/runtime-host-bridge/src/index.ts` (`resolveEnvCredentialRef`)
- `apps/runtime-host-bridge/test/credential-ref-env.test.ts` (new)
- `packages/sqlite-memory/test/index.test.ts` (extend “without storing raw secrets” case for inline-key rejection)

**Design note:** Prefer **normalizing to fallback env name** over throwing on parse, so existing configs keep working while SQLite stops storing secrets. Operator migration (SP43-S2) still moves yaml to explicit `${DEEPSEEK_API_KEY}`.

---

### SP43-S2 — Operator config migration (S2)

**TDD mode:** pragmatic (ops-only; no product RED required)

| Step | Action |
| --- | --- |
| Pragmatic | Edit **external** `runtime-config.yaml`: replace `deepseek.api_key: sk-…` with `api_key: ${DEEPSEEK_API_KEY}` |
| Pragmatic | Set host env var before runtime start: `[Environment]::SetUserEnvVar('DEEPSEEK_API_KEY', '…')` or session `$env:DEEPSEEK_API_KEY = '…'` for dev |
| Pragmatic | Remove any copy of the literal key from yaml backups under repo/worktree (verify with ripgrep — repo must stay clean) |
| Pragmatic | Add worktree script `evidence/scripts/migrate-deepseek-env-credential.ps1`: documents steps, patches yaml ref only (does **not** commit secrets), validates env var is set |
| Compensating | Log: before/after `credential_ref` query (redacted) + grep proof repo has no `sk-` DeepSeek material |

**Primary files (ops, external):**

- `%TEMP%\role-model-run42-verify-state\runtime-config.yaml`
- `evidence/scripts/migrate-deepseek-env-credential.ps1` (new, worktree)

**Log:** `evidence/logs/green/sp43-s2-config-migration.green.log`

---

### SP43-S3 — Refresh runtime state + live verification (S3)

**TDD mode:** pragmatic (agent-operated QA)

| Step | Action |
| --- | --- |
| Pragmatic | Restart SEA on `:3456` with `DEEPSEEK_API_KEY` in process environment and updated external yaml |
| Pragmatic | Confirm `applyUnifiedRuntimeConfigState` re-persists `deepseek.litellm` with `credential_ref = DEEPSEEK_API_KEY` |
| Pragmatic | Smoke: `GET /api/role-model/runtime/summary` healthy; `GET /api/role-model/router/candidates` lists DeepSeek endpoints; optional single chat completion |
| Pragmatic | Confirm sqlite: `SELECT credential_ref FROM provider_accounts WHERE provider_account_id = 'deepseek.litellm'` → `DEEPSEEK_API_KEY`; no `sk-` in any `credential_ref` |
| Compensating | Re-run quick benchmark subset optional — not required if chat smoke passes |

**Script:** `evidence/scripts/phase5-addendum-s3-env-credential-verify.ps1` (new)

**Log:** `evidence/logs/green/sp43-s3-env-credential-live.green.log`

## TDD compliance summary

| Slice | TDD mode | RED required | GREEN / compensating |
| --- | --- | --- | --- |
| SP43-S1 | strict | yes | bridge + sqlite tests |
| SP43-S2 | pragmatic | no | migration script + external yaml edit |
| SP43-S3 | pragmatic | no | live API + sqlite ref check |

## Phase 4 verification floor (addendum)

Run from worktree `role-model-router/`; logs under worktree `evidence/logs/green/`:

| Command | Slice | Pass criteria |
| --- | --- | --- |
| `corepack pnpm --filter @role-model-router/runtime-host-bridge exec vitest run test/credential-ref-env.test.ts` | SP43-S1 | inline `sk-` input → ref is env name |
| `corepack pnpm --filter @role-model-router/sqlite-memory test -- credential` | SP43-S1 | no literal secret in `credential_ref` |
| `rg -i "sk-[a-zA-Z0-9]{20,}" role-model-router testdata .recursive/run/43-benchmark-routing-display/addenda` | SP43-S2 | no DeepSeek secret in repo (vendor example keys excluded or documented) |

Aggregate log: `evidence/logs/green/phase4-addendum-02-verification-floor.green.log`

## Phase 5 re-verification (addendum)

**Prerequisite:** SP43-S2 yaml migrated; `DEEPSEEK_API_KEY` set in runtime process env; SEA rebuilt if SP43-S1 code changed.

| ID | Scenario | Pass criteria | Evidence |
| --- | --- | --- | --- |
| Q-S1 | SQLite credential ref | `deepseek.litellm.credential_ref` = `DEEPSEEK_API_KEY`; no `sk-` in provider_accounts | `evidence/logs/sp43-s3-env-credential-live.green.log` |
| Q-S2 | DeepSeek routing alive | Candidates API shows DeepSeek endpoints healthy; optional chat smoke returns 200 | same log |
| Q-S3 | Repo hygiene | No DeepSeek secret in git worktree product paths | ripgrep note in migration log |

## Implementation order

1. SP43-S1 strict RED → GREEN (prevents regression even before ops migration)
2. SP43-S2 operator yaml + env var (external)
3. SP43-S3 restart + live verification
4. Phase 4 floor log
5. Update `05-manual-qa.addendum-02.md` disposition; lock addenda

## Traceability

| ID | Slice | Verification |
| --- | --- | --- |
| S1 | SP43-S1 | strict tests + sqlite ref check |
| S2 | SP43-S2 | external yaml + migration script log |
| S3 | SP43-S3 | live API smoke + Q-S1–Q-S3 |

## Out of scope

- Rotating the DeepSeek key (operator may rotate separately when moving to env)
- Encrypting env vars at rest on Windows (future secrets-manager integration)
- Changing OAuth / local-file credential backends
- Editing locked run 43 Phase 0–5 artifacts
- Committing external `runtime-config.yaml` or any secret into the repo

## Coverage Gate

- [x] S1–S3 mapped to slices SP43-S1–S3
- [x] TDD mode declared per slice with RED/GREEN paths
- [x] Phase 4 and Phase 5 verification matrix defined
- [x] Slices executed in worktree

Coverage: PASS

## Approval Gate

- [x] Supplements locked plan via addendum only (worktree path)
- [ ] Operator approves plan before implementation lock (superseded by run 43 Phase 6–8 closeout)

Approval: PASS

## Audit Context

- Audit Execution Mode: self-audit
- Subagent Capability Probe: available
- Delegation Decision Basis: operator-requested credential hygiene plan; self-authored
- Delegation Override Reason: n/a

Audit: PASS
