# S452 independent review - evaluation packaged-host handshake correctness

Date: 2026-10-29. Read-only. Public tree D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration; private tree D:/DEV/role-model-internal/.worktrees/115-effect-foldkit-runtime-migration, HEAD ac809d31. No source/test edits by this reviewer; only this report written.

## Active verification

list_agents: s9b-reviewer = deepseek-flash, status running; lead = chatgpt/gpt-6.1-sol. The active reviewer matches the required deepseek-flash route.

## Frozen hashes verified

- private-layers.mjs = 433267bcecdd540c004b099dde28a6430b2ecea1aa002b7482b6ef0ad0bafdc2 (match)
- run115-b9-evaluation-handshake-correctness.test.mjs = ac37d4c7ac9b244e7351fec9ba0a71ed4ab3d326885af5b0295634c9e38524d3 (match)
- run115-b9-handshake.test.mjs = f19716dac3ffb9b9a84a492dd4545e6904100705715331e9bc624aefc7bb9105 (match)
- run115-b9-packaged-evaluation-layer.test.mjs = 2a770c18eb1b8efb40a45bf92b52b7fe61a8f0b695299b0d94ef0c87cfc37c45 (match)
- operator-handshake test 3c422819... and sidecar-scope 0a1d6e6b... unchanged; runtime-operations-server untouched.

## Verdict

HOLD, bounded to test integrity/acceptance evidence. The evaluation handshake product behavior now matches the requested contract in the paths tested, and the actual manifest verifies in a direct probe. But the S449 diff rewrote and weakened the existing evaluation unit fixture, and the new "actual manifest accepted" test is a field parse that passed before the product change, not an acceptance test. Those must be repaired before this slice is accepted.

## High - evaluation unit fixture was flattened and weakened

The S449 diff replaces the 53-line maintained run115-b9-packaged-evaluation-layer.test.mjs with a 15-line single-line helper/test block. Two concrete losses:

1. The original "a late child whose close fails is still attempted and the original open error wins" test is gone. The replacement "a late manifest open fails closed and releases the late child" asserts only the release count; it never makes the late child's close throw and never asserts the original open error wins. That is the contract this fixture previously protected.
2. The original second close was await scope.close() and required it to resolve. The rewrite uses await scope.close().catch(() => {}), which suppresses an unexpected second-close rejection. This is a test weakening, not a neutral formatting choice.

The close-order test still covers first-close failure/second close, and the concurrent/null/no-manifest tests remain, but the rewritten one-line format is materially less reviewable and loses the late-close-failure/original-error case. The lead's flattening/weakening concern is confirmed.

Required: restore the original readable test file format and assertions, add only the manifest helper needed by the new handshake, keep the late-child close-failure/original-error test, and do not wrap the second close in a catch that hides an unexpected rejection.

## High - "actual manifest accepted" test is not behavioral

run115-b9-evaluation-handshake-correctness.test.mjs ends with:

    const parsed = JSON.parse(await readFile(realManifestPath, "utf8"));
    const evaluation = parsed.extensions.find(...);
    assert.equal(parsed.protocolVersion, "1.1.0");
    assert.equal(evaluation.descriptor.capabilities.includes("evaluation:list-jobs"), true);

It never calls verifyPackagedManifestHandshake, never opens the scope, and never invokes the real factory. It is a fixture-field assertion, not "actual manifest accepted" evidence. It is the one test that passed in s449-red (8 fail/1 pass), so the RED set is not fully behavioral for the acceptance claim.

A direct probe of the current verifier accepted the actual dist/run00-dev manifest (version 1.1.0, ready:false, evaluation-core, evaluation:list-jobs present), so the product behavior is likely correct; but the test does not prove it. Required: call the verifier on the actual manifest (and ideally open the real factory fixture) and make that test RED before the product fix, or remove the acceptance claim.

## Product behavior findings

The evaluation boundary now matches the requested behavior in the tested paths:

- descriptor protocolVersion must be 1.1.0 and evaluation:list-jobs is required (private-layers.mjs:310-324), rejecting wrong descriptor and invented evaluation:* capabilities before the factory;
- open resets handshake, returns null before the factory when no manifestPath, sets ready:false on null/factory/owner.add failure/closed/reused open, and ready:true only after a non-null child is successfully owner.add'ed (:73-104);
- closed late open releases the child and leaves not-ready; reused handle clears prior accepted evidence; no-manifest does not invoke a custom factory;
- the actual manifest verifies in a direct probe (accepted, ready:false, evaluation-core capability present).

No confirmed counterexample against these evaluation behaviors was found. The concurrent single handshake slot remains explicitly nonauthoritative (task allowed); no per-open concurrent evidence. The no-manifest open after a prior successful host clears the handshake while the child remains open (scope still owns it); this is a state caveat, not a stale true.

## Operator contract

Operator hashes/tests are unchanged from S426 (operator handshake 3c422819, packaged-operator-layer 6e552ef6, sidecar-scope 0a1d6e6b); the operator suite continues to pass. The evaluation change did not modify runtime-operations-server.

## Executed evidence

- node --test seven relevant suites: 41/41 pass, exit 0 (evaluation correctness 9, old handshake 6, operator handshake 10, evaluation unit 5, operator unit 5, sidecar scope 5, sidecar main 1).
- s449-red.log: tests 9, pass 1, fail 8 (the one pass is the non-behavioral actual-manifest field test).
- s449-green.log: 53/53 pass across the broader selected set, but that count includes unrelated A48/run96 tests and does not repair the missing behavioral acceptance.
- anti_slop_lint effect:true: private-layers, evaluation correctness test, old handshake test and evaluation unit each filesScanned 1, rules 16, 0 findings.
- node --check all four pass.
- Actual manifest direct verifier probe: accepted, version 1.1.0, evaluation-core, evaluation:list-jobs, ready:false.
- No real factory invocation with the actual manifest and no process-kill/live R32 evidence.

## Required before PASS

1. Restore the original evaluation unit test format/assertions and late-close-failure/original-error case; remove the .catch(() => {}) on the second close; add the manifest helper narrowly.
2. Make the actual-manifest test call verifyPackagedManifestHandshake (and/or open the real factory with it), with a genuine RED before the product change; do not count a field parse as acceptance.
3. Keep the new evaluation handshake tests and the operator contract unchanged; rerun the affected suites and lint.
4. No full R32 claim: concurrent handshake single slot and real-factory/live evidence remain bounded.

## Limitations

Bounded to source/test inspection, disposable probes, selected suites and lint; no full private suite, real factory with actual manifest, process-kill or live provider. No source/test edits by this reviewer.


---

# S452 final re-review - S449 repair2

Date: 2026-10-29. Read-only. New hashes verified: private-layers 433267bcecdd540c004b099dde28a6430b2ecea1aa002b7482b6ef0ad0bafdc2 (unchanged); evaluation-handshake test 5c72f1cbac1230d1537483b3ac5d28fd6762382e777582e848b54563d1ec229e; packaged-evaluation-layer test f6820dcc50941fb817c41e7ee891df1906e27585c51e3311bcd6eb6bdb7cc48d; old handshake f19716da unchanged. runtime-operations-server untouched. Active list_agents: s9b-reviewer = deepseek-flash, running.

## FINAL VERDICT: PASS (bounded to the evaluation boundary; no full R32 claim)

The S452 HOLD is repaired. The evaluation unit fixture is restored to readable multiline tests with the original late-close-failure/original-open-error case and a real second-close assertion; the actual-manifest test now calls verifyPackagedManifestHandshake and asserts ready:false; the 8 behavioral RED cases are genuine. 42/42 independently run tests pass and the evidence log reports 54/54 across 9 suites.

## Prior blockers - closed

1. Eval unit fixture: restored original multiline format and all old assertions, including "a late child whose close fails is still attempted and the original open error wins" and the second scope.close() that must resolve (no catch suppression). A narrow manifest helper is added; the new late no-manifest test does not replace the old contracts.
2. Actual-manifest test: now imports and calls verifyPackagedManifestHandshake on dist/run00-dev/track-b-runtime-manifest.json, asserts version 1.1.0, extensionId evaluation-core, evaluation:list-jobs present, and ready:false. It is no longer a parse-only field assertion. The actual verifier accepts the real manifest with ready:false in my direct probe.
3. No hidden false green: the eight behavioral cases cover descriptor version, exact capability, ready during factory/after owner.add, null, factory failure, closed late open, reused stale handle, and no-manifest factory skip. The one pass in the original RED was the old static actual-manifest test; it is now a real verifier acceptance check. The eight behavioral failures are genuine; the ninth is an acceptance check that would also pass pre-fix because the actual manifest already met the old any-evaluation:* rule, and that is disclosed rather than counted as a behavioral fix.

## Product/behavior checks

- Descriptor protocolVersion must be 1.1.0 and evaluation:list-jobs is required; wrong descriptor and invented evaluation:* are rejected before the factory.
- ready is false during the factory and true only after non-null child + owner.add; null, factory throw, owner.add failure, closed late open, reused stale handle, and no-manifest paths stay not-ready/null.
- No-manifest returns null without invoking a custom factory.
- Real manifest accepted by the verifier (version 1.1.0, evaluation-core, list-jobs, ready:false).
- The concurrent single handshake slot remains explicitly nonauthoritative, as allowed; no per-open concurrent evidence.

## Operator unaffected

The operator contract and tests are unchanged: operator-handshake 3c422819, packaged-operator-layer 6e552ef6, sidecar-scope 0a1d6e6b. The 27-test operator/evaluation layer grouping passes within the 42-test run; runtime-operations-server untouched.

## Executed evidence

- Independent key suites: 42/42 pass, exit 0 (evaluation correctness 9, old handshake 6, operator handshake 10, packaged evaluation 6, packaged operator 5, sidecar scope 5, sidecar main 1).
- s449-green.log: 54/54 across 9 suites, including the A48/run96 regression fixtures; no failures.
- s449-red.log: 8 fail/1 pass; the one pass was the old static actual-manifest test, now corrected to call the verifier. The 8 behavioral REDs are genuine.
- anti_slop_lint effect:true: private-layers, eval correctness, old handshake, packaged evaluation each filesScanned 1, rules 16, 0 findings. node --check all four pass.

## Bounded caveats (not HOLD)

1. No real factory invocation with the actual dist/run00-dev manifest and no process-kill/live R32 evidence; actual acceptance is verifier-level plus the existing synthetic real-factory fixture.
2. Concurrent opens share the single handshake slot; per-open evidence remains nonauthoritative.
3. R33/B10 ledger and broader R32 evaluation/process evidence remain open; this is a bounded evaluation-boundary PASS, not R32 completion.

## Evidence summary

- Hashes: match.
- 42/42 independent key tests; 54/54 evidence log; RED 8 behavioral fail/1 disclosed static pass.
- Restored unit assertions and actual-manifest verifier gate; no hidden fixture false green.
- Operator unchanged; lint/syntax clean; no source/test edits by this reviewer.
