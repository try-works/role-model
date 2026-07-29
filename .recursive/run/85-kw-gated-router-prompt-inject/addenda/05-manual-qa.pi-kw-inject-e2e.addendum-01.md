Run: `/.recursive/run/85-kw-gated-router-prompt-inject/`
Phase: `05 Manual QA / pi-kw-inject-e2e addendum`
Addendum: `05-manual-qa.pi-kw-inject-e2e.addendum-01`
Status: `LOCKED`
LockedAt: `2026-07-29T10:52:52Z`
LockHash: `b86ba29c6265818f710900e68b6653afbf7e14eeef2e33e408aaa67342e7e9d0`
Workflow version: `recursive-mode-audit-v2`
CapturedAt: `2026-07-29T09:05:00+08:00`
Parent: `05-manual-qa.md` (LOCKED)
Inputs:
- `/.recursive/run/85-kw-gated-router-prompt-inject/05-manual-qa.md`
- `/.recursive/run/85-kw-gated-router-prompt-inject/evidence/other/pi-kw-inject-e2e.json`
- `/.recursive/run/85-kw-gated-router-prompt-inject/evidence/logs/phase5/pi-kw-inject-e2e.json`
- Public host remediations under `runtime-host-bridge` (default query, bridge path, revision join, host-owned session)
Outputs:
- `/.recursive/run/85-kw-gated-router-prompt-inject/addenda/05-manual-qa.pi-kw-inject-e2e.addendum-01.md`
- `/.recursive/run/85-kw-gated-router-prompt-inject/evidence/other/pi-kw-inject-e2e.json`
Scope note: Post-lock live end-to-end verification of `pi` CLI → KW ceremony ON → gated prompt inject on the live provider capture path → router storage. Extends Phase 5 `R22` with KW inject accounting that the original pi hop did not cover. Authoritative input for reopened Phases 6–8.

## TODO

- [x] Define live `pi` → KW ON → inject → storage E2E scenario
- [x] Rebuild SEA after host remediations and run OFF/ON/pi/soft-OFF cases
- [x] Record PASS receipt + product fixes required for the hop
- [x] Fold into Phases 6–8 closeout (DECISIONS/STATE/memory)
- [x] Lock this addendum via recursive-lock ceremony

## Scenario

1. Soft OFF: live `/v1/chat/completions` must not prepend `ROLE_MODEL_KW_PROMPT_INJECT_V1`.
2. Activate KW (bootstrap + activate with signed joinSeed): live HTTP ON must prepend inject system message.
3. Live `pi --provider role-model` while ON: CLI exit 0 + provider capture contains inject + local observation/telemetry storage.
4. Soft OFF again: inject absent.

## Product fixes required for this hop (post-lock)

- Host derives default bounded retrieve query from latest user message when durable KW ON.
- Auto-arm reads the same bridge path mutate writes (`{stateRoot}/{scopeId}/track-b-production-bridge.json`).
- KW join session id uses next bridge revision (`state.revision + 1`) so activate registration matches auto-arm lookup.
- Auto-arm uses host-owned durable join session (not client `x-session-id`).

## Evidence

- `evidence/other/pi-kw-inject-e2e.json` — status PASS
- `evidence/logs/phase5/pi-kw-inject-e2e.json`
- `evidence/logs/phase5/pi-kw-e2e-run85-pi-kw-on-*.log`
- SEA sha bound in rebuild receipt / e2e receipt: `1a3ff1ea09cb03b446a31473e261bf89ec51bdf3f1ff0eea770b7f0f05c93795`
- Script: `scripts/track-b/run85-pi-kw-inject-e2e.mjs`

## Observed results

| Case | Result |
|---|---|
| HTTP OFF | injectPresent false |
| HTTP ON | injectPresent true (`ROLE_MODEL_KW_PROMPT_INJECT_V1` + tip) |
| Live pi ON | exit 0; injectPresent true; requestId recorded |
| HTTP soft OFF | injectPresent false |
| Storage | observations/telemetry present; secretsOmitted true |

## Disposition

- Completes the missing live `pi` → KW inject → storage chain requested after Phase 5 lock.
- Does not reopen Phase 5 lock; records as authoritative post-lock QA addendum.
- Public host wiring changes for this hop remain uncommitted until operator-requested ship.
- Folded into reopened/re-locked Phases 6–8 closeout.

## Audit Context

Audit Execution Mode: self-audit
Subagent Availability: available
Subagent Capability Probe: available
Delegation Decision Basis: self-audit selected
Delegation Override Reason: post-lock Phase 5 E2E addendum authored from live receipts; controller verifies evidence paths

## Audit

Audit: PASS

## Coverage Gate

Coverage: PASS

## Approval Gate

Approval: PASS
