# Independent AS-IS Audit — Run 115

**Verdict: Audit: FAIL** — Phase1 lock readiness, not target implementation.

## Verified (independent)

- Current artifact SHA-256 `a725b675…c7cefaf` matches the bundle.
- Public HEAD `f0d50fab083e3fe8daf2474cd9fb08b51066c8e1` / tree `b3d5cf91…`; private HEAD `16021cc5f87f60f2d01338a29adf0002da5e8327` / tree `18a0e994…`. No tracked product diff in either repo; only `.recursive` untracked. Addenda directory is empty.
- Inventory contains exactly 39 R + 45 SRC entries (84 total). All 84 `Source Quote` strings are verbatim substrings of locked `00-requirements.md` (0 mismatches).
- Route census is exact: 75 call entries = 73 `route` + 2 `index`; 20 legacy-redirect entries; one layout; one wildcard; 53 canonical leaf patterns; exactly 2 parameterized detail patterns; 6 `learning.tsx` routes. The client report's “3 detail / 8 learning” is wrong and the artifact's correction to 2/6 is correct.
- Spot checks of claimed source anchors:
  - `process-supervisor/src/index.ts:106-145`: line 126 is a bare `await fetch(...)`; the deadline loop cannot interrupt a hung fetch. Claim is accurate.
  - `sqlite-memory/src/index.ts:167-213`: 5 s busy timeout, 3 attempts, retry delay `100 * attempt` (100/200 ms), fresh connection per attempt. Accurate.
  - `queue-runtime/workers.ts:245-247`: `tryPromise` receives `handler(job, { attempt })`; **no AbortSignal is passed**. The artifact's broader conclusion — Effect timeout/interrupt does not cancel underlying I/O — is correct, but the wording “ignores provided AbortSignal” is not.
  - Private `scripts/track-b/runtime-operations-server.mjs:7318-7328,8601-8615`: the 5 s `captureBacklogDrainTimer` is not cleared or joined by `close()`; the `if (timer) clearTimeout(timer)` in close refers to a different timer. The lifecycle-gap claim is accurate.
- No tests/builds were run, per scope. Baseline counts remain log-backed, not re-executed; that limitation is honestly stated.

## Blocking findings

1. **The locked Phase1 mapping obligation is not met.** `00-requirements.md:27` requires Phase1 to “map every source obligation to these IDs … and record actual owner/caller/tests.” The artifact's `Current Behavior by Requirement` is the same sentence for **82 of 84 IDs** (only R34/R35 differ); `Traceability` is the same sentence for **all 84**; `Requirement Completion Status` is the same blocked line. There is no per-ID owner/caller/test mapping. The `Current Source and Ownership` section covers B2/B3/B4/B6/B8 and UI routes, but R6–R18, R31–R33, and R36–R39 have only general assertions or pointers to analyst reports. This is not a demand for Phase2 planning detail; it is the AS-IS mapping the locked requirements explicitly require.
   - **Repair:** add a compact per-ID table (current owner/caller, current test/evidence anchor, observed behavior, explicit “unknown — read before slice” where applicable), using the analyst reports' `[O]/[P]/[B]` provenance. Do not retain a boilerplate “Existing mechanisms/source observed” line for IDs whose source was not read.

2. **The “every subordinate acceptance bullet” claim is false.** `00-requirements.md` contains 122 acceptance bullets: 84 specific clauses + 38 repetitions of “Cited source/build/files/test evidence proves the stage-specific result; planned/implemented is not verified.” The artifact carries the 84 specific clauses and omits all 38 generic ones, while stating “Every explicit R plus each subordinate acceptance bullet is carried without umbrella merging.”
   - **Repair:** carry the shared evidence gate once, explicitly applying it to every R/SRC, or narrow the sentence to the 45 SRC/specific clauses. The `Coverage Gate` claim “39R and 45 subordinate clauses retained” is true; the broader claim is not.

3. **R34/R35 do not name the owner-approved follow-ons.** The requirement demands a named follow-on with rationale and revised scope. `owner-scope-decision.md` names `E1-storage-authority-protocol` and `E2-durable-live-inference-protocol` and records the 2026-10-24 “defer both” decision, but R34/R35 only say “Owner-approved named follow-on disposition.”
   - **Repair:** add both exact names, the owner-decision date, and a link to the decision; do not leave the names only in an input file.

4. **Source-claim precision and provenance need correction.** Replace “tryPromise handler ignores provided AbortSignal” with “handler receives no AbortSignal; Effect timeout/interrupt does not cancel the underlying Promise/I/O.” Also, `Main-Agent Verification Performed` omits the private source files supporting the capture/event/artifact claims; add them or mark those claims as controller/analyst-read and not independently re-read. The event-log post-commit rollback and ArtifactStore DELETE/FULL/FK claims should remain explicitly hypothesis-level (“targeted fault test required”), not treated as reproduced defects.

## Non-blocking corrections

- Give the full route-proof path: `evidence/other/team-model-routing/as-is-analyst-routes.json`.
- The R rows quote the heading plus the first acceptance bullet, not the full R text; state that so the inventory is not read as a complete reproduction of each R.
- Remove or replace the duplicated `Current Behavior` / `Traceability` filler once the per-ID table exists.

## Strengths

The domain architecture, paired-identity baseline, route census, supervisor/SQL/worker anchors, capture-drain lifecycle gap, and honest separation of observed source from unreproduced hypotheses are sound. The artifact is close; the failure is completeness/traceability fidelity, not a wrong architecture.

**Re-audit scope:** verify the new per-ID mapping against source for at least five representative IDs, verify the completeness sentence/gate against the 122-bullet count, verify the R34/R35 names and owner approval, and confirm the worker-signal wording.

**Audit: FAIL**
