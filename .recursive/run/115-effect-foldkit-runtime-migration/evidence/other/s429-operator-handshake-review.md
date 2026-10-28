# S429 independent review - private packaged operator handshake repair

Date: 2026-10-29. Read-only. Public tree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration. Private tree: D:/DEV/role-model-internal/.worktrees/115-effect-foldkit-runtime-migration, HEAD a86ea7a9. No source mutation, commit, provider call, or operator 3456/3457/3458. I wrote only this file.

## Active model verification

list_agents: s9b-reviewer = deepseek-flash, status running; lead = chatgpt/gpt-6.1-sol. The active reviewer matches the required deepseek-flash route. No mismatch.

## Frozen inputs

- scripts/track-b/private-layers.mjs = 6a9b2e27a3d8258b64e40897be2b240ed3e1b68d09f4f85622a63953274a7491 (match)
- tests/track-b/run115-b9-operator-handshake.test.mjs = 478a199cc4923e7a996d3959a799e37e441d15e20afc955e69ed1516042f77e8 (match)
- tests/track-b/run115-b9-sidecar-scope-close.test.mjs = 0a1d6e6bed59387ac211ebd753a93f2153633a406c8e7015f5cbeb130bc4cdaa (match)
- runtime-operations-server.mjs untouched (not in status/diff).

## Verdict

HOLD, bounded to this repair. The new operator validator correctly checks the root version, all six real required bindings, each descriptor's 1.1.0 version, and the actual real manifest is accepted. But the claimed readiness invariant is false in three concrete paths, and the capability rule accepts invented capabilities instead of the real operator contract. The repair also leaves the evaluation handshake gaps open, as the task allowed. This is not PASS evidence for the operator boundary.

## High - ready=true is set before null, owner.add and failure - confirmed

private-layers.mjs:118-122:

    const child = await createProcess(options);
    if (decision !== null) handle.handshake = Object.freeze({ ...decision, ready: true });
    if (child === null || child === undefined) return child;
    try { return owner.add(child); }
    catch (error) { ... throw error; }

The ready flag is written before the null check and before owner.add. I reproduced all three direct consequences with the real scope and disposable manifests:

1. Manifest present, createProcess returns null:
   {"out":null,"ready":true,"handshake":{...ready:true}}
   No host exists, yet the accepted record says ready.
2. Scope closed first, then open with a valid manifest and a successful fake child:
   owner.add throws "packaged operator scope is already closed"; scope.handshake.ready remains true. The child is closed, but the accepted record is false.
3. Successful open, then a second open with an invalid (2.0.0) manifest:
   verify throws PACKAGED_MANIFEST_VERSION_UNSUPPORTED; handle.handshake is never reset, so the prior accepted record remains ready:true and version 1.1.0. This is stale reused-handle evidence.

The new test "accepted operator evidence is not ready until the real factory succeeds" only covers a factory that returns a child; it does not cover null, owner.add failure, closed scope, or a second failed open. The "a factory failure never leaves ready=true" test covers a factory throw (which leaves the decision ready:false), not these paths. The lead's line-119 concern is valid.

Required: set ready:true only after child is non-null AND owner.add succeeds; clear/reset handshake (or set a distinct failed decision) at the start of every open before validation/factory; test null, closed-late-open, owner.add failure, and a reused handle with an invalid second manifest.

## High - capability check accepts invented capabilities - confirmed

verifyPackagedOperatorManifestHandshake only requires, for each required id, that some capability is not "health:probe" (private-layers.mjs:323-328). It does not require the actual domain capability each operator extension needs. I reproduced:

- manifest with every required id declaring ["health:probe","invented:capability"] => accepted, capabilities include invented:capability.
- manifest with replay-core declaring ["health:probe","bogus:replay"] and the other five real => accepted; the real required replay capability "replay:prepare-dispatch" is absent.

The real private manifest dist/run00-dev/track-b-runtime-manifest.json does contain the six required ids with the real capabilities (replay:prepare-dispatch, evaluation:list-jobs, profile:estimate, knowledge:list-candidates, knowledge:engage-kill-switch, signals:read), and the validator accepts that real manifest with ready:false. But the validator's rule is not the real contract; the test's DOMAIN map is test data, not enforced by the product. The new "without a domain capability" test only removes all non-health capabilities; it cannot catch an invented one. The task explicitly required real existing capabilities, not an arbitrary non-health check.

Required: define the required capability per operator binding from the existing manifest contract (or derive it from the real descriptor contract), reject a binding that lacks it, and add invented/wrong-domain capability negatives.

## Medium - no-manifest custom factory bypass is permitted

With options.manifestPath absent, decision stays null, handle.handshake is untouched, and createProcess proceeds. A custom createProcess returning a non-null child therefore creates a host with handshake null; the production factory returns null without a path, but the Layer contract permits the bypass. The test "no manifest preserves honest null semantics" only uses a factory that returns null. The task said fail closed or an honest compatible seam; this is neither for a custom non-null factory. Confirm the intended contract and test it.

## Medium - evaluation handshake remains the known gap

The evaluation path is unchanged: verifyPackagedManifestHandshake still returns ready:true (private-layers.mjs:293), is conditional on manifestPath (:76), checks only top-level version and any evaluation:* capability, and records the decision before createProcess (:78). The S420 evaluation findings therefore stay open, as the task said. This repair does not close R32 overall.

## Medium - RED/GREEN evidence claim is overstated

The new operator tests pass 6/6 (previously RED). But s426-red.log is tests 6, pass 1, fail 5, not "6 fail": the factory-failure test passed before the repair because scope.handshake was undefined and notEqual(undefined,true) is true. It is not a valid strict RED for that behavior. s426-green.log is 6/6 operator tests only, not the claimed 23 green across five suites. My independent run of the five suites is 23/23 pass, exit 0, so the combined green is true, but the evidence log does not show it and one of the six RED tests was already green.

## Passed checks

- Root protocol must be 1.1.0: rejects 2.0.0 (test).
- All six required extension ids and modulePath/artifactSha256 are required (test).
- Each required descriptor.protocolVersion must be 1.1.0 (source).
- Real manifest verifies: extensionIds six, version 1.1.0, ready false, 114 capabilities including replay:prepare-dispatch.
- Full selected suites: 23/23, exit 0. anti_slop_lint filesScanned 1/rules 16/0 findings for private-layers, operator-handshake test, sidecar-scope-close test. node --check clean.
- Runtime-operations-server untouched; real factory digest authority preserved.

## Priority

1. Fix ready:true ordering and reset/stale handle semantics; add null/closed/owner.add/reused-handle tests.
2. Enforce the actual required capability per operator binding; add invented-capability negative.
3. Decide/test the no-manifest custom factory contract.
4. Keep evaluation gaps open and do not claim R32 closure from this slice.
5. Correct RED/GREEN evidence: 5/1 RED with an explained already-green test, and green log for the full five-suite set if 23 is claimed.

## Limitations

Bounded to source inspection, disposable probes, selected suites and lint; no full private suite, real process-kill, packaged R/D/C or live provider. No source or test edits by this reviewer.


---

# S429 final re-review - S426 repair2

Date: 2026-10-29. Read-only. New hashes verified: private-layers 251f364f48b4d712507749095271256bc7d12cbdcec9aa716c56dad4704c1ce0; operator-handshake test 3c4228199162ce09237b9d5e302353a63d531101d0dabc904bf3d07c1d1de41b; packaged-operator-layer test 6e552ef6cb24bb846acffb3c319d226ee94ddf90a5eaa5259151eb0eac00ddf1; sidecar-scope-close 0a1d6e6b unchanged. runtime-operations-server untouched. Active list_agents: s9b-reviewer = deepseek-flash, running.

## FINAL VERDICT: PASS (bounded to the S426 operator boundary; R32 not complete)

The three prior high findings are fixed and the no-manifest bypass is closed. The operator handshake is now a real gate for the six existing operator bindings and their real capabilities, with ready evidence only after owner.add. 27/27 selected tests pass and the actual private manifest is accepted with ready:false.

## Prior blockers - closed

1. ready ordering: open resets handle.handshake=null at entry (:112); no manifest returns null before createProcess (:113); a null factory result records ready:false with reason (:124-126); owner.add success sets ready:true only after add (:128-131); owner.add failure closes the child and records ready:false (:132-135). The null/closed/reused/factory-failure probes from S429 now classify correctly, and the new tests cover null, closed late-open, owner.add failure, reused handle and no-manifest-no-factory.
2. Real capabilities: REQUIRED_OPERATOR_CAPABILITIES maps the six ids to the actual contract capabilities (:315-322), and the validator requires each exact capability (:350-352). Invented:capability/bogus:replay is now rejected before the factory; the real dist/run00-dev manifest is accepted with six ids, version 1.1.0, ready:false, and 114 capabilities including replay:prepare-dispatch.
3. No-manifest custom factory bypass: missing manifestPath returns null before createProcess (:113); the test asserts calls===0. This is fail-closed/absent-host behavior, not an unauthenticated child.

## Verification run

- 5 suites: operator-handshake 10, evaluation-handshake 6, packaged-operator-layer 5, sidecar-scope-close 5, sidecar-main 1 = 27/27 pass, exit 0.
- RED2 log: 5 fail / 5 pass (matches the claim, not 6 fail). The five failures are the behavioral cases; factory-failure/root-version/etc. were already green pre-repair.
- Actual manifest: accepted, ready:false, extensionIds six, has replay:prepare-dispatch.
- Tests not weakened: no-manifest test asserts factory not called; operator-layer test requires manifest for open and no-manifest no child; sidecar real-factory manifest now has real capabilities. No bypass path added.
- anti_slop_lint: private-layers, operator-handshake test, packaged-operator-layer test, sidecar-scope-close test each filesScanned 1, rules 16, 0 findings. node --check all four pass.

## Bounded caveats (not a new blocker)

1. Concurrent opens share the single handle.handshake slot. A valid+invalid concurrent pair is last-completion-wins (my probe: invalid failed, then valid completed -> final ready:true because a valid host exists). Reused sequential evidence is tested; per-call concurrent evidence is not. If readiness must be per-open, serialize opens or return the decision from open. As scope-level state, the final true corresponds to the host that was actually added.
2. A no-manifest open after a prior successful host clears handshake to null while the prior child remains open; the scope still owns/close it. This is a per-open decision reset, not a stale true, but it means handshake is not a history of all open children.
3. Evaluation handshake is unchanged: conditional on manifestPath, top-level/any evaluation:* checks, ready:true before createProcess. The S420 evaluation gaps remain open.
4. R33/B10 ledger completeness/sourceHead gaps from S420 are untouched; this repair does not close R32/R33 or the run.

## Evidence summary

- New hashes: match.
- 27/27 selected tests pass; RED2 5/5 as claimed.
- Actual manifest accepted; six real capabilities enforced; no-manifest factory bypass closed.
- Lint nonempty and clean; syntax clean.
- No product/source mutation by this reviewer; runtime-operations-server untouched.
- PASS is limited to the S426 operator boundary. No R32-complete claim.
