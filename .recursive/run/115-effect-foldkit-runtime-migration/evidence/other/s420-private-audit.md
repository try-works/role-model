# S420 private independent audit - handshake/R32, B10 ledger/R33, scoped stores

Date: 2026-10-28. Read-only. Public snapshot 22b3d9ab; private snapshot a86ea7a9. No product edits, commits, provider calls, or operator 3456/3457/3458. I wrote only this file.

## Active verification

list_agents: s9b-reviewer = deepseek-flash, status running; lead = chatgpt/gpt-6.1-sol. The active reviewer matches the required deepseek-flash route. No mismatch.

## Verdict

HOLD for the claimed B7/B9/B10 current-state completion. The scoped wrappers are wired and the selected lifecycle tests are green, but the B10 ledger is not an R33-complete per-operation ledger and the R32 handshake is not applied to the operator packaged host. These are confirmed current-state gaps, not historical narration.

## Confirmed defects and missing acceptance evidence

### High - B10 ledger is stale and incomplete against R33 (confirmed)

- Private HEAD is a86ea7a9, but s344-b10-ledger.json still declares sourceHead 4c24591d (line 652). The ledger therefore does not identify the source it is supposed to accept.
- The ledger has 15 surface entries (7 converted, 8 retained) but its own pending block (line 494) lists 34 operation names not dispositioned: EventLog 9, ArtifactStore 12, CaptureQueue 9, replay internals 4. Its notYetEnumerated block (line 647) explicitly excludes "shared queues/capture modules outside the three S0 surfaces", "sidecar factory internal methods and replay composition internals", and "replay runner/handoff internals". R33 requires every actual operation owner converted or explicitly retained, not a surface entry plus pending methods.
- A typical entry has only id/surface/kind/disposition/definition/callers/bodyEvidence/identity. R33 17.1 requires repo/path/export, current owner/caller, disposition, service/Layer/scope, error/wire, transaction/lease/fence/cancel, B/M/task/R IDs, RED/GREEN/refactor/maintained-lane, source/build identity, reviewer and rollback. Those are absent.
- The ledger checker is citation-oriented: it verifies definition symbols, callers, conversion identity, approval markers and pending operation membership, but does not require the R33 fields, compare sourceHead to HEAD, or require operation-level coverage (scripts/track-b/ledger-check.mjs:22-69). The 12/12 checker green is therefore not evidence that B10 is complete.
- The three extension-package entries are class-level retained adapters (knowledge-store:136, crowdsourced-learning:179, replay-core:473), not operation inventories; their operations are not in pending or entries.

Impact: R33/B10 cannot be marked complete; prior "B10 complete" headlines are contradicted by the ledger's own pending/notYet data. Confirmed.

### High - R32 handshake is absent on the packaged operator host (confirmed)

- openPackagedEvaluationHostScope performs verifyPackagedManifestHandshake before createProcess (private-layers.mjs:76-80, :263-284).
- openPackagedOperatorHostScope has no handshake at all (private-layers.mjs:103-118); it immediately calls createProcess.
- createPackagedOperatorProcess reads the manifest and checks host/extension bindings and artifacts (runtime-operations-server.mjs:860-919) but does not call the handshake, does not require manifest.protocolVersion === 1.1.0, and does not check a capability/readiness gate. It passes `protocolVersion: manifest.protocolVersion ?? "1.1.0"` into ExtensionHost (:976) and per-extension descriptor versions (:1049).
- A manifest with protocolVersion 2.0.0 and the six required extension ids would pass the operator factory's binding checks; only the host's own handling, if any, would reject it. R32 requires authenticated compatible DTO/version/capability/readiness for the private composition, not only evaluation.

Impact: the operator packaged host is outside the authenticated handshake boundary. Confirmed by source; no test covers an operator handshake rejection (the 6 handshake tests are evaluation-only).

### Medium - Evaluation handshake is weaker than the claim

- The handshake is conditional on options.manifestPath (private-layers.mjs:76). A custom createProcess can create a host with no manifest and no handshake; the production factory returns null without a path, so no live host is bypassed in that path, but the Layer contract permits it.
- It checks only top-level manifest.protocolVersion 1.1.0 (:267), any evaluation:* capability (:270-277), and non-empty host modulePath/artifactSha256 (:279-282). It does not check the evaluation-core descriptor protocolVersion or require the specific capability set used by the operator.
- It records handle.handshake before createProcess (:78); if createProcess throws, the accepted decision remains visible on scope.handshake. The Layer test uses a fake createProcess and does not prove real artifact readiness.
- The "ready" flag is returned before the factory verifies artifact existence/digest. This is an evidence-quality gap in the accepted record.

Impact: R32 version/capability/readiness is only partially enforced even on evaluation. Confirmed source behavior; not a live-host bypass when no manifest is supplied.

### Medium - Resource-release evidence is green but bounded

- Selected lifecycle close tests pass: packaged operator scope ordered/concurrent/null/late-open (5/5), sidecar scope-close 5/5, handshake 6/6, B10 checker 12/12; combined 28/28 exit 0.
- closeReplayLifecycle now closes runner before handoff; the operator/evaluation scopes use the shared owner. I found no unused open* wrapper: all seven open scopes are invoked from runtime-operations-server.mjs (9002, 9514, 9543, 9550, 9563, 9568; storage-audit callable at 5544).
- No process-kill or live packaged-R/D/C run was executed, so this is bounded release evidence, not proof of real child-process teardown. The handshake-accepted state on a failed factory (above) is the remaining release/evidence concern.

### Low - No unused scoped wrapper found

The seven scope builders are all actual callers. The gap is not dead wrappers; it is the B10 ledger's operation-level acceptance and the operator handshake coverage.

## Requirement mapping

| Requirement | Current finding |
|---|---|
| R32 authenticated compatible DTO/version/capability/readiness | Evaluation only, conditional and incomplete; operator host has no handshake. Partial/HOLD. |
| R32 scoped processes/stores, bounded joins, partial startup release | Scope wrappers wired; selected release tests 28/28; no live process-kill proof. Bounded progress. |
| R33 every operation converted/explicitly retained | 15 surface entries + 34 pending operations + 3 notYet groups; not per-operation. HOLD. |
| R33 ledger fields / source-build-reviewer-rollback | Missing required fields; sourceHead stale 4c24591d vs a86ea7a9. HOLD. |
| R33 anti_slop_lint | private-layers 0, ledger-check 0; node --check clean. PASS for scanned files. |

## Executed evidence

- node --test tests/track-b/run115-b9-handshake.test.mjs tests/track-b/run115-b9-packaged-operator-layer.test.mjs tests/track-b/run115-b9-sidecar-scope-close.test.mjs tests/track-b/run115-b10-ledger-check.test.mjs: 28/28 pass, exit 0, 18752ms.
- B10 ledger CLI: not separately re-run in this combined command; the 12/12 test includes CLI valid/invalid/no-path.
- anti_slop_lint effect:true: scripts/track-b/private-layers.mjs 0 findings; scripts/track-b/ledger-check.mjs 0 findings.
- node --check both files pass.
- File scans: private-layers handshake/scope; runtime operator/evaluation factories and scope call sites; ledger entries/pending/notYet; checker validation.

## Limitations / not read

- No full private suite, process-kill, packaged R/D/C, live provider, or operator 3456/3457/3458.
- Not every extension package or method was individually inspected; the ledger gap is established from its own pending/notYet and entry shape, not a complete operation census implementation.
- Source proposal 15.5/15.6/17.1 and requirements R28-R33 were read; addenda 01/02 and REASSESSMENT were reread at header/contract level. No claim about UI/library scope.

## Prioritized next work

1. Rebase/update s344 ledger to a86ea7a9 and add the R33 fields (repo/export/owner, error/cancel/transaction/lease/fence, B/M/task/R, RED/GREEN/CI, source/build/reviewer/rollback). Make the checker fail on sourceHead drift and missing fields.
2. Replace surface+pending entries with per-operation dispositions for EventLog, ArtifactStore, CaptureQueue, replay internals, retention/operator surfaces, and the three extension packages; remove pending from "complete" claims.
3. Apply verifyPackagedManifestHandshake (or an equivalent typed gate) to openPackagedOperatorHostScope/createPackagedOperatorProcess, with unsupported-version/missing-capability/not-ready tests and a real-factory test.
4. Tighten evaluation handshake: require manifestPath or fail closed for a non-null child, check evaluation-core descriptor protocolVersion/capabilities, set the accepted record only after factory readiness, and test factory failure does not leave ready=true.
5. Add a process-level release proof (kill/partial startup) if R32 resource release is to be called verified rather than bounded.

## Evidence classification

- Confirmed defect: operator handshake absent; ledger sourceHead stale and required fields/operation coverage missing.
- Missing acceptance evidence: live process release; real-factory handshake readiness; operator handshake tests.
- Historical claim: earlier "B10 complete"/PASS headlines are not current acceptance; the ledger's pending/notYet contradicts them.
- Speculation: none about external provider behavior; no live calls made.
