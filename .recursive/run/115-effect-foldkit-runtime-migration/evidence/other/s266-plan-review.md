# S266 — bounded independent plan review

Read-only; no product writes/children/suites/provider calls; 2026-10-27.
Read: effective plan, addenda/02, locked R1-R39/02-plan, source §4-§7/§15-§17 via normalized mappings and
S261-S263, slices, owner E1/E2, S265. Working diff: run docs plus S259/S260-owned test/harness files; no
product src change from this review.

## Verdict: HOLD (narrow), not rejection

Direction is sound; B-SQL/F-URL/V-CAPTURE are safe to start. Not yet acceptable as the complete run115
execution/closure plan until the bounded corrections below are recorded. No rewrite or new planning round.

## Q1 — backend / full UI / actual-client R-D-C scope

Retained at domain level:
- Only E1/E2 deferred, matching the owner decision; B0-B10, Foldkit UI, strict TDD, diagnostics and
  packaged real-client acceptance remain.
- Map covers backend B0-B10, UI R7-R13, R14, R15-R18/R37-R39, and rejects the "5 verified" headline.
- §D keeps actual-client R/D/C: rebuild SEA/private/UI, verify bytes/PID/served, isolated DSH/pi
  J1/J2/J5 + changed J3/J4/J6, true R/D/C, then cutover.
- R = designated 0.0.20, Run88 not a precondition; D = pre-migration 00-worktree pair, not the
  post-migration dev squash. Both false blockers are removed.

Gaps in the ordered program (map-only R#):
- R19/B0: §C omits B0; B-SQL edits `sql-sqlite-node/src/service.ts`, which the 16-entry inventory falsely
  excludes as "no product caller". Fix the inventory/exclusion or make B0 a B10 prerequisite.
- R7 provenance/adaptation ledger and R31 portable trial/learning evidence have no batch/owner in §C.
- R1/R2/R3/R36 (current pair, worker ledger, Phase3 audit/lock, action records) have no A0; §A only
  integrates S259/S260.
- R25/B4 is a verified slice; state it is retained with artifact revalidation rather than omitting B4.

## Q2 — Workspace reference and exact-preview gate

Concretely mapped, not reference-only:
- Typed child/view: child interaction state; parent canonical URL/query/auth/catalogue/refresh facts;
  controlled ViewInputs; typed OutMessage; no child global model.
- Effects: one application-lifetime typed HTTP service; exact request/fallback/status/headers/signal; no
  per-command graph rebuild; closed at shutdown.
- Drafts/race: baseline vs draft vs pending save vs incoming revision; retry retains edits; refresh does
  not overwrite dirty; stale conflict requires explicit reload; double-submit fenced; exact PUT/PATCH.
- Controls/tests: one RM3 facade over vendored `@foldkit/ui` listbox/dialog, device-auth modal;
  keyboard/focus/RTL/mobile/reduced-motion; scene + shipped-browser + packaged real-client.
- Gate is real: preview `f3be22cf`, manifest/migration -> exports/types/peers/compiler -> leaf
  assembly/browser graph; merge is not proof; immutable target/no floating main; pass -> leaf-first
  adoption; fail -> recorded adapter/pin remedy; no fake Blocks; backend R27 not blocked.

Gate is real but not yet executable:
- No named record path, owner, exact checks, timebox or decision field. "Bounded report" is intent, not
  an artifact. Name F0 output, pass/fail/inconclusive criteria, and the leaf pilot
  (RuntimeConfigEditor/Controller) tests.
- Feature-owner list is not exhaustive: Extensions, Workbench, Control/Roles, Workloads, Routing/Agent
  strategy and Studio advanced endpoints are absent from the addendum and §C's M8/M9 shorthand. Map each
  to an owner/test or record it as missing/retained; "full forms/heavy" is too loose for R13.

## Q3 — ordered batches and next SQL/URL/capture scopes

Feasible and disjoint at first step:
- B-SQL: service + colocated tests; real DB, suspended Effect transaction vs sync query/write/close;
  typed refusal or serialized owner; same PRAGMAs/retries/errors.
- F-URL: route/legacy-redirect/init/update + URL tests; original `/app` built families, 20 redirects as
  history-replace Commands; missing families explicit; shared files serialized.
- V-CAPTURE: separate capture adapter + preflight; React-vs-React 0 diff/two runs; real-client NOT_RUN,
  never mocked PASS; controller owns script/CI/manifest.
- No fake preview -> R27 or Run88 -> R blocker remains.

Disjointness/closure gaps:
- B-SQL follow-ons (maintenance, async callers/observation/hydration) touch `cli.ts`/host callers, the
  same surface as B6/R27. Name file scope and serialize with B6 (Lead single writer).
- F-URL says "serialized shared files" but names no writer for `init.ts`/`update.ts` when feature waves
  start.
- V-CAPTURE only promises React-vs-React; R14's packaged React/Foldkit dual-build has no later batch or
  §D exit criterion. Add twice/same fixtures, non-chart 0 perceptual diff, chart-only approvals,
  mutation/determinism, CI selector.
- §D "actual ... J3/J4/J6" reads as full pass. J4 needs an effort-capable catalog; J6 a private trace
  root. Add "or documented NOT-RUN with named capability; no fixture substitution."

## Scope waivers / misleading closure

No explicit product waiver beyond E1/E2. Risks are silent narrowing and stale closure:
1. M8/M9/feature-owner shorthand can drop extensions, workbench, control/roles, workloads,
   routing/agent strategy and Studio advanced endpoints.
2. R16 D-target change is right but changes locked wording. Record a reviewed decision: D =
   `f0d50fab`/`16021cc5`; R release-line = `945a8906`/`266ccf76`; which receipts measure which. Not
   "assess".
3. `FINAL-STATUS.md` still carries 5-verified/32-blocked and "Phase 3 is the path to R27"; 03 still marks
   R19 verified, R22/R33 implemented, R34/R35 blocked. Mark historical or correct before gates use them.
4. R28 EventLog prune off-by-one has no §C disposition. Add fix-or-owner-approve + regression to B7.

## Corrections

- A. Add A0 for R1/R2/R3/R36 and R19/B0: current pair/diff, worker ledger, records, Phase3 audit/lock;
  regenerate inventory and remove the false `sql-sqlite-node` exclusion.
- B. Add a route-family map for all original M8/M9 families to addendum02 owners/tests, including
  extensions, workbench, control/roles, workloads, routing/agent strategy and Studio advanced endpoints;
  map R7 and R31.
- C. Make R14 packaged dual-build and J4/J6 NOT-RUN explicit §D exits; keep R37 rollback and R38
  thresholds as exits, not prose.
- D. Record R16 D/R/C and R28 prune; name B-SQL follow-on files/B6 serialization; turn the preview gate
  into a named artifact with owner/checks/decision.
- E. Mark `FINAL-STATUS.md`/`03-implementation-summary.md` affected rows historical or correct them.

## Verdict

HOLD (narrow). B-SQL/F-URL/V-CAPTURE may start as scoped pilots. A-E are bounded edits, not a scope
rewrite and not a demand for complete code; re-review can be short.
