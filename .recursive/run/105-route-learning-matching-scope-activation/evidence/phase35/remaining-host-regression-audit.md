# Remaining host regression audit — Run 105 Phase 3.5

## Scope

Initially read-only. Parent explicitly approved only two targeted legacy test repairs after behavioral cause identification. No production, retry test, commits, servers, production state, or live ports changed; no full suite rerun.

Current checkout: D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation, observed HEAD 60700837. Comparison: E:/tmp/run105-r15-hotfix2-public, clean before testing, HEAD 2f9db9b501d952710a92c8d26ff67e88d4285593. This is NOT pure baseline: 701b8b8f plus R15-only commits 0ef9b08d, ca91d98a, 2f9db9b5. R15-only delta affects telemetry/failure persistence and must be disclosed. Existing E:/tmp/run104-phase5/baseline-check-105 is private c993b2f2, not public baseline; not used for public host execution. Node v24.11.0 / Vitest v3.2.4.

Original [full-suite evidence](<D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/.recursive/run/105-route-learning-matching-scope-activation/evidence/phase35/controller-full-host-suite.log#L3324-L3507>): exit 1; 6 failed / 2220 passed / 5 skipped (2231), 1464.66s. Three concurrent Run105 fixture repairs were outside this delegation. This report covers the remaining three.

## Dispositions

### Retry/quota — unresolved suite-sensitive failure; not a proven regression or repair

[Index test](<D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/role-model-router/apps/runtime-host-bridge/test/index.test.ts#L15996-L16215>) expected primary,backup,primary,backup; full suite got primary,backup,backup. Mock primary throws timeout first then insufficient_quota second. First request requires zero retries/one reroute and timeout probation; second should select primary then reroute after quota.

Test and [execution circuit](<D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/role-model-router/apps/runtime-host-bridge/src/execution-circuit-breaker.ts#L393-L507>) unchanged from 701b8b8f (empty respective diffs). First timeout enters eligible probation. Identical controlled current/comparison runs pass unchanged; current alone and repeated comparison also pass. No assertion weakened. This does NOT prove contention/timing root cause, nor a pre-existing full-suite failure. Interference/clock/selection remain hypotheses. No product fix claimed. Parent may investigate separately with controlled clock/selection instrumentation.

### Run107 scope error — source-approved contract change; stale test pin repaired

[Approved plan C7](<D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/.recursive/run/105-route-learning-matching-scope-activation/02-to-be-plan.md#L93>) adds optional taxonomyVersion to scope. Schema/generated schema implement this; validator remains allErrors true. This is NOT merely error ordering: old taxonomy extra-scope error no longer applies. Raw live pack STILL REFUSES for missing required contract.

Parent-approved [test repair](<D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/role-model-router/apps/runtime-host-bridge/test/run107-contract-emission-pack-receipt.test.ts#L67-L126>): preserve raw missing-contract refusal; built valid envelope missing scope must refuse scope; unknown scope member must refuse; built candidate with taxonomyVersion explicitly allowed; valid-envelope receipt plus familyEvidence explicitly refused. Existing valid build and emission tests unchanged. No validator/schema production modification by audit.

### Run97 code regex — source-approved admission change; exact exception repaired

[Requirements R1](<D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/.recursive/run/105-route-learning-matching-scope-activation/00-requirements.md#L60-L64>) forbid replay/eval of unclassified requests. [Policy](<D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/role-model-router/apps/runtime-host-bridge/src/track-b-replay-policy.ts#L130-L137>) introduces terminal no_route_classification under R1/R8. Baseline regex passed; current failed exactly new code.

Parent-approved [test repair](<D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/role-model-router/apps/runtime-host-bridge/test/run97-replay-admission.test.ts#L73-L82>) requires this code's presence and exempts ONLY exact no_route_classification from unchanged forbidden tool/capability/classification/role/model/transcript/endpoint regex. All other codes and ten companion admission/candidate/tool/CLI safeguard cases retain protections.

## Exact commands and exits

Cwd for every Vitest command: current or comparison checkout plus /role-model-router/apps/runtime-host-bridge. All tests use mocked provider fetchers, not live ports.

### A: controlled current/comparison BEFORE repair

~~~powershell
corepack pnpm exec vitest run test/index.test.ts test/run107-contract-emission-pack-receipt.test.ts test/run97-replay-admission.test.ts -t "retries transient API timeouts|cross-scope|refusal|refuse|invalid" --testTimeout=30000 --hookTimeout=30000
~~~

Current pwsh-1983: exit1, 2 failed/6 passed/223 skipped, 20.75s. Fail exactly Run107 scope and Run97 code; retry passed. Comparison pwsh-1984: exit0, 8 passed/223 skipped, 19.92s. Regex incidentally selects five index/two Run97/one Run107 cases; not complete files.

### B: unchanged current retry alone

~~~powershell
corepack pnpm exec vitest run test/index.test.ts -t "retries transient API timeouts once" --testTimeout=30000 --hookTimeout=30000
~~~

pwsh-1995: exit0, 1 passed/215 skipped, 11.02s.

### C: complete affected files before/after repair

~~~powershell
corepack pnpm exec vitest run test/run107-contract-emission-pack-receipt.test.ts test/run97-replay-admission.test.ts --testTimeout=30000 --hookTimeout=30000
~~~

Before pwsh-1996: exit1, 2 failed/13 passed, 5.01s. First repair pwsh-2016: exit0, 15 passed, 9.99s. Final explicit allowed-taxonomy/closed-receipt additions pwsh-2021: exit0, 15 passed, 4.93s, NO SKIPS.

### D: exact A repeated after initial repair

Current pwsh-2019: exit0, 8 passed/223 skipped, 22.98s. Retry again passed unchanged. Final added contract checks were subsequently verified by C/pwsh-2021.

### E: targeted whitespace check

~~~powershell
git diff --check -- role-model-router/apps/runtime-host-bridge/test/run107-contract-emission-pack-receipt.test.ts role-model-router/apps/runtime-host-bridge/test/run97-replay-admission.test.ts
~~~

Exit0/no output. Earlier broad check reported unrelated concurrent private-sidecar green evidence CRLF trailing whitespace; not edited here.

## Conclusion

Two deterministic legacy tests reconciled only after actual approved contract behavior identified and parent approval. Retry/quota full-suite mismatch remains unproven suite-sensitive behavior, passing controlled runs; no production/test relaxation. Full host green NOT claimed. All audit jobs collected; no commits.
