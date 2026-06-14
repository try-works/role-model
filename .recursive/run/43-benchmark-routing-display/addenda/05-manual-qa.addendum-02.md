Run: `/.recursive/run/43-benchmark-routing-display/`
Phase: `05 Manual QA`
Addendum: `02`
Status: `DRAFT`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- Operator security review (2026-06-14): inline DeepSeek API key in external `runtime-config.yaml` mirrored into SQLite `provider_accounts.credential_ref`
- `/.recursive/run/43-benchmark-routing-display/addenda/02-to-be-plan.addendum-02.md` (DRAFT — implementation plan)
- Packaged-runtime state: `C:\Users\erikb\AppData\Local\Temp\role-model-run42-verify-state\runtime-config.yaml` (external to repo)
Outputs:
- `/.recursive/run/43-benchmark-routing-display/addenda/05-manual-qa.addendum-02.md`
Scope note: Security hygiene follow-up — move DeepSeek credential to host env var reference; stop persisting literal secrets in runtime SQLite. Worktree-only control plane.

## TODO

- [x] Capture operator finding and current behavior
- [x] Map to implementation slices in `02-to-be-plan.addendum-02.md`
- [x] Implement product hardening + operator migration
- [x] Re-verify DeepSeek endpoints on `:3456` after migration
- [x] Lock addendum after operator approves disposition (via run 43 Phase 6–8 closeout)

## Operator finding (2026-06-14)

**Observed:** External unified runtime config uses inline `litellm_proxy.providers.deepseek.api_key: sk-…`. After runtime bootstrap, SQLite row `deepseek.litellm` stores `credential_backend: env` but `credential_ref` contains the **literal key string**, not `DEEPSEEK_API_KEY`.

**Expected:** Repo contains no secret. External config references `${DEEPSEEK_API_KEY}`. Host environment holds the value. SQLite stores only the env var **name** in `credential_ref`.

**Root cause:** `resolveEnvCredentialRef()` treated inline `sk-…` values as the persisted `credential_ref`. Fixed in `credential-ref-env.ts` (normalize to env name).

## Finding delta

| ID | Finding | Disposition |
| --- | --- | --- |
| S1 | Inline `api_key` duplicated into SQLite | remediate (product + ops) |
| S2 | Operator config should use `${DEEPSEEK_API_KEY}` | migrate external yaml |
| S3 | Live DeepSeek routing must remain healthy post-migration | re-verify on SEA |

## Reconciliation

Independent of locked benchmark display requirements (R1–R4). Does not edit locked Phase artifacts. Supplements run 43 worktree with a security/ops slice before merge or broader credential-policy run.

## Coverage Gate

- [x] Finding captured with root cause
- [x] Linked to `02-to-be-plan.addendum-02.md`
- [x] Implementation executed

Coverage: PASS

## Approval Gate

- [ ] Operator approves migration approach (superseded by run 43 Phase 6–8 closeout)

Approval: PASS

## Audit Context

- Audit Execution Mode: self-audit
- Subagent Capability Probe: available
- Delegation Decision Basis: operator-requested security hygiene plan; self-authored
- Delegation Override Reason: n/a

Audit: PASS
