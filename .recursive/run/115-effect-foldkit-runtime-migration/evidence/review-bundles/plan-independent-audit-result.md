**Audit verdict: FAIL — plan is not yet lock-ready.** The scope, sequencing, and most of the executable detail are sound, but seven finite defects block acceptance. This is a Phase 2 plan-readiness verdict only; it is not product acceptance and does not demand Phase 3 implementation.

**Verified**
- **84/84 IDs present and quoted exactly.** `02-to-be-plan.md` maps 39 `R` + 45 `SRC` IDs, repeats them in Traceability and Requirement Completion Status, and each mapped quote matches the locked bullet in `00-requirements.md` verbatim. `01-as-is.md` LockHash `1d7a97bc...` matches the plan input.
- **Scope is right.** B0–B10, full Foldkit UI, diagnostics, and release parity are mandatory; E1/E2 are deferred by name, rationale, and follow-on in `owner-scope-decision.md`, with no conflicting implementation claim.
- **No product edits.** HEAD is `f0d50fab...`; `git diff --name-only f0d50fab...` is empty; all 108 untracked entries are under `.recursive/run/115-effect-foldkit-runtime-migration` in the public worktree. Source pair `f0d50fab` / private `16021cc5` is consistent with locked 00/01.
- **Controller corrections are present.** S3 says “parse5 approved locked dependency closure” (no extra vendor); S1/Commands say missing imports/setup are not behavioral RED; target signatures are not asserted as current fact (“actual tsc”, “unchecked online signature is not actual API proof”); unsafe claims are excluded (S8 “no paid retry after commit”, S9 “no schema/consolidation or fictional multi-DB atomicity”, S6 “Effect sleeps do not make DatabaseSync nonblocking”, S10 “actual two-host distinct-job topology”, S11 “no stochastic dedup”).
- **First slices are finite and executable.** S1 parity/actual-client baseline → S2 paired stable pin → S3 closed graphs, with dependency edges and named production surfaces.
- **Budget is correctly not claimed measured.** `implementation-slices.md` proposes relative limits (20% p95/heap) and requires absolute thresholds calibrated and reviewer-approved from pre-change measurements before enablement.

**Blocking corrections**

1. **Diff basis is not machine-checkable (`02-to-be-plan.md:352-362`).** Normalized baseline says “exact corresponding immutable commit”, and the normalized command is `git diff --name-only <respective00worktreecommit>`. Replace with the exact per-repo bases — public `f0d50fab083e3fe8daf2474cd9fb08b51066c8e1`, private `16021cc5f87f60f2d01338a29adf0002da5e8327` — and explicit commands (`git -C <public> diff --name-only f0d50fab...`, same for private, plus `git status --porcelain=v1 --untracked-files=all`). This is required by the locked `00-worktree.md` basis rule.

2. **Verification surfaces are non-concrete or on the wrong surface.** Several IDs point only at directories/evidence (`R7/SRC-009` → `evidence/screenshots`; `R10/SRC-012`, `R13`, `R21/SRC-026`, `R14/SRC-015/016` → `apps/runtime-ui/e2e`; `R19/SRC-023`, `R25/SRC-029` → `test/`; `R33/SRC-037/038` → `evidence`; `R38/SRC-045` → `evidence/perf`; `R39` → `evidence/traces`). `R17/SRC-020/021` cite only `sqlite-memory/test/recursive-87-atomic-observation.test.ts`, which cannot prove rendered UI/DOM, graph, API, and persisted-restart J1–J6 joins. `R7/R8/SRC-010` cite the existing React `design-system.test.ts`, and `R9/SRC-011` cite `observe-chart-adapter.test.ts`, while S12/S13 create new Foldkit facade/chart surfaces. Name the exact new/owning test file plus assertion for each, or explicitly mark S16 real-client receipt fields as the acceptance surface; mark existing React tests as regression-only. This is the bundle’s “concrete test/implementation/QA” requirement.

3. **Client API/refresh work is unowned.** `R12/SRC-014` maps to `apps/runtime-ui/app/lib/runtime-api.ts`, but the assigned slice S8 owns only host/backend `execution/provider-*`, `private-client.ts`, and shared index. No client slice (S14/S15) lists `runtime-api.ts` or the `RuntimeEventSourceFactory`/Refresh Subscription tests. Assign it to S14 (or a named S14a) with owned surface and `runtime-api.test.ts`/live-refresh assertions.

4. **R39 root scripts/CI wiring is unassigned.** S1 creates `scripts/verify-client-journeys.mjs` and `compare-release.mjs`, and S0 owns root `package.json`/CI by controller, but no step names the required `runtime:verify-client-journeys` and `runtime:compare-release` script entries, CI selectors, or the fail-closed target/config/port/root validation test. Add these as explicit S0/S1 deliverables with the test that proves NOT RUN ≠ pass.

5. **R23’s 5s timeout is missing from S6.** S6 says “3attempt100/200ms wait” but omits the required 5s outer timeout and post-timeout cleanup assertion. Add both to S6’s RED/GREEN behavior.

6. **R33/SRC-037/038 acceptance artifacts are unnamed.** A per-operation disposition ledger with the required fields, and the `anti_slop_lint` command/CI selector, are mapped only to `evidence`. Name the ledger path and lint invocation, and attach them to the S11 completion gate.

7. **S2 owns no vendor test file.** R6/SRC-007/008 name `/scripts/vendor-upstream.test.mjs` as the verification surface, but that file does not exist and is absent from S2’s owned surface (only `scripts/vendor-upstream.mjs` is listed). Add the test file to S2’s owned surface, or point these IDs at a named existing/new wrapper test.

**Non-blocking**
- `SRC-013` requires a recorded sibling-vs-in-place decision before edits. The plan’s S14 outcome (`apps/runtime-ui-next` sibling) is explicit, but no rationale/decision record exists yet; add a short decision paragraph or addendum now.
- `R21` is claimed by S4 (backend query) and S15 (Foldkit page). That is defensible, but state the split explicitly.
- S0 lists `R38` alongside S16; acceptable as setup safety, but perf ownership should remain explicitly S16.

**Gate disposition:** Coverage/Approval/Audit must stay `FAIL` until corrections 1–7 are applied, the review bundle is refreshed, and a bounded independent recheck confirms them; then the controller may close the gates and invoke the supported lock. Do not start Phase 3 before that lock. The corrections are edits to the plan/slices mapping, not a scope rewrite.
