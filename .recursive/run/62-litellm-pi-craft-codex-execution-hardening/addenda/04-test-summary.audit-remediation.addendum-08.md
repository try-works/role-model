Run: `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/`
Phase: `04 Test Summary`
Addendum: `08`
Status: `LOCKED`
LockedAt: `2026-07-08T16:08:00Z`
LockHash: `3098195ead808d051a862880e5963a4709b0dc99ce014e861979cc6b7c141d45`
Workflow version: `recursive-mode-audit-v1`
Inputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/02-to-be-plan.audit-remediation.addendum-08.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/03-implementation-summary.audit-remediation.addendum-08.md`
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/logs/addendum-08/`
Outputs:
- `/.recursive/run/62-litellm-pi-craft-codex-execution-hardening/addenda/04-test-summary.audit-remediation.addendum-08.md`
Scope note: This addendum records the automated RED/GREEN and build verification for the generic OpenAI-compatible streaming and alias-routing remediation.

## TODO

- [x] Confirm RED tests failed before production changes
- [x] Confirm GREEN tests passed after production changes
- [x] Confirm impacted package builds passed
- [x] Confirm vendor abort-signal paths compile and remain tested
- [x] Record residual risks separately from passing evidence

## RED Evidence

- `evidence/logs/addendum-08/red/host-bridge-routing-stream-red.log`
  - covers declared default tools and downstream streamed-client lifecycle defects
- `evidence/logs/addendum-08/red/direct-provider-stream-writer-red.log`
  - covers swallowed downstream writer errors during direct provider streaming

RED verified: PASS

## GREEN Evidence

- `evidence/logs/addendum-08/green/host-bridge-routing-stream-green.log`
  - targeted host-bridge routing and stream lifecycle tests passed
- `evidence/logs/addendum-08/green/direct-provider-stream-writer-green.log`
  - direct provider stream-writer failure propagation passed
- `evidence/logs/addendum-08/green/host-bridge-full-failure-recheck.log`
  - broader host-bridge recheck after focused fixes

GREEN verified: PASS

## Automated Validation

- `evidence/logs/addendum-08/automated/runtime-host-bridge-index-test-rerun.log`
  - final result: `191 passed`
- `evidence/logs/addendum-08/automated/runtime-host-bridge-build-rerun.log`
  - host bridge build passed
- `evidence/logs/addendum-08/automated/vendor-litellm-build.log`
  - LiteLLM vendor package build passed
- `evidence/logs/addendum-08/automated/vendor-litellm-test.log`
  - LiteLLM vendor tests passed, `13/13`
- `evidence/logs/addendum-08/automated/vendor-llama-swap-build.log`
  - llama-swap vendor package build passed

## Behavior Covered

- Declared default tools do not alone force OpenAI Codex Subscription preference.
- Active tool/coding signals can still prefer a higher-capability path.
- Downstream client abort cancels streamed execution.
- SSE writes respect backpressure through the shared write helper.
- Direct provider stream writer failures are propagated instead of silently converting to success.
- Vendor execution paths accept abort signals without changing provider identity semantics.

## Residual Risk

- GitHub-hosted CI was not executed from this local worktree.
- The live routing score can still select GPT/Codex for a trivial alias when current runtime scoring makes it best; the fixed invariant is that declared default tools alone are not the hard preference trigger.
- One pre-existing local Chrome/network connection remained established against `:3456`; post-verification runtime responsiveness checks still passed.

## Coverage Gate

- [x] RED evidence exists for each production behavior changed in addendum 08
- [x] GREEN evidence exists after implementation
- [x] Build and package-level impacted validation are recorded
- [x] Residual risks are explicit

Coverage: PASS

## Approval Gate

- [x] Test evidence is concrete and run-local
- [x] TDD compliance is supported by RED and GREEN logs
- [x] The test summary does not claim external CI that was not run

Approval: PASS

## Audit Verdict

Audit: PASS
