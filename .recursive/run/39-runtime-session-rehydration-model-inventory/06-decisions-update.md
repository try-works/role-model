Run: `/.recursive/run/39-runtime-session-rehydration-model-inventory/`
Phase: `06 Decisions Update`
Status: `LOCKED`
LockedAt: `2026-06-11T12:41:28Z`
LockHash: `bffa136c1d0a5f1117c72ed5e8c16b58ccac338ee8f805df5873120df875452c`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/39-runtime-session-rehydration-model-inventory/05-manual-qa.md`
- `/.recursive/run/39-runtime-session-rehydration-model-inventory/addenda/00-requirements.routing-diagnostics-remediation.addendum-01.md`
- `/.recursive/run/39-runtime-session-rehydration-model-inventory/addenda/00-requirements.session-persistence-and-r11-gap.addendum-02.md`
Outputs:
- `/.recursive/run/39-runtime-session-rehydration-model-inventory/06-decisions-update.md`
- `/.recursive/DECISIONS.md` (receipt — apply on lock)
Scope note: Delta receipt for global decisions ledger entry for run 39 session rehydration, routing diagnostics remediation, and addenda closeout.

## TODO

- [x] Summarize what changed and why
- [x] Record addenda outcomes
- [x] Complete gates

## Decisions Changes Applied

- Add `### Run \`39-runtime-session-rehydration-model-inventory\`` entry to `/.recursive/DECISIONS.md`
- Record endpoint rehydration + `operator-intent.json` dual-write/read and ordered session bootstrap
- Record inventory-first alias reconciliation and session readiness API/UI
- Record addendum routing diagnostics (`R10`) and Craft ask-mode last-user-turn burden (`R11`/`R15`)

## Rationale

- Restart dropped activations while OAuth persisted (G1–G3); alias pools drifted from live inventory (G4)
- Production diagnostics showed non-routable fixture routing-model IDs and inflated Ask-mode difficulty for Craft dual-user payloads

## Resulting Decision Entry

- `/.recursive/DECISIONS.md#run-39-runtime-session-rehydration-model-inventory`

## Decision summary (for `DECISIONS.md`)

**Run `39-runtime-session-rehydration-model-inventory`**

- **What changed:** Packaged runtime rehydrates operator intent on startup (`operator-intent.json`, SQLite `runtime_endpoints`, bootstrap pipeline, session readiness UI). Inventory-first alias pools reduce YAML drift. Routing diagnostics hide non-routable fixture routing-model IDs (R10). Ask-mode difficulty ignores non-user boilerplate and uses the **last user turn** for Craft dual-user payloads (R11/R15).
- **Why:** Restart dropped peer/remote activations while OAuth tokens persisted (G1–G3); Craft `hello` was classified `medium` due to user-role preamble and shared cache coupling.
- **How:** SP1–SP6 strict TDD in worktree; addenda R10–R15; `validate-ui` + restart-rehydration validators green; agent-operated session-readiness QA.
- **What was not done:** Packaged `:3456` restart drill with live peer process (deferred in Phase 5); latency-score tuning to prefer local on `easy` prompts.
- **Follow-ups:** Operator SEA rebuild post-merge; optional purge of stale `moonshot.personal.moonshot-oauth` duplicate account.

## Traceability

- `R0` → decision entry records run 38 baseline inheritance (split local UI/APIs, bindings, llama-swap scaffold) without regression
- `R1` → decision entry records removal of init-time endpoint wipe and SQLite rehydration
- `R2` → decision entry records `operator-intent.json` manifest dual-write/read
- `R3` → decision entry records ordered session bootstrap pipeline and diagnostics
- `R4` → decision entry records OAuth hydrate + pending resume + credential-path unification
- `R5` → decision entry records startup remote health bootstrap stage
- `R6` → decision entry records peer/llama-swap auto-reload on restart
- `R7` → decision entry records routable inventory and alias drift warnings
- `R8` → decision entry records session readiness API/UI surfaces
- `R9` → decision entry records restart-rehydration validators and regression guards
- `R10` → addendum-01 production routing-model resolver hides non-routable fixture IDs
- `R11` → addendum-01 ask-mode burden excludes system/non-user boilerplate
- `R12` → addendum-02 documents G1 root cause; SP1 delivers endpoint persistence fix
- `R13` → addendum-02 operator-intent reader wired into bootstrap (closes orphan manifest)
- `R14` → addendum-02 bootstrap OAuth refresh/resume path on startup
- `R15` → addendum-02 last-user-turn `codeOrSchemaBurden` for Craft `hello`
- `R16` → run 38 llama-swap scaffold/modal UX preserved (no redesign in run 39)

## Coverage Gate

- [x] Decision delta is concise and points to run folder
- [x] Follow-ups are actionable

Coverage: PASS

## Approval Gate

- [x] Ready to append to `/.recursive/DECISIONS.md` on Phase 6 lock

Approval: PASS

Audit: PASS
