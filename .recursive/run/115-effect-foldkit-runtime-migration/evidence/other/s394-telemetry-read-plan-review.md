# S394 — independent review: S392a telemetry read plan

Reviewer: `s9-private-readonly`, actual model **deepseek-flash** (live). Read-only on product files; no source edit, no commit. I ran the 4 affected UI files, UI tsc and anti-slop.

## Verified frozen artifacts

| File | sha256 | bytes |
| --- | --- | --- |
| `src/readback.ts` | `BFB075F554748986D4D488CCB93068250701BFC794E5673285C89A7666A96921` | 54891 |
| `src/update.ts` | `236755B9A87D26897A2AEA093CE5E0B14E074FB8852405A54621D35A3AC69ABE` | 35845 |
| `src/control.ts` | `9E0935495376A1507D150B7E5BCEACA2038E4998BA471AF681B81AB1AE78EDD3` | 10646 (unchanged) |
| `test/s393-telemetry-read-plan.test.ts` | `875518702AB3417C888CB551B8331ECF6170DAB04D0571A1ED2E53BB898AA790` | 7382 |

All match. Affected 4 files: **129/129 pass**; UI tsc exit 0.

## Q1 — Typed/exhaustive read plan: PASS

`readPlanForRoute` is typed to `{ key: ReadbackKey; id?; query? }` (`update.ts:297`) and handles ModelsRoles (configuredModels+modelEndpoints), SystemOperator (operatorStatus+operatorTraceRoots), the single-source table via `readbackKeyForRouteTag`, detail ids, dashboard id, overview query (`:297-313`). `readbackKeyForRouteTag` covers the S379 Learning children, llama-swap models, system extensions, Models, Learning, Router family and the older readbacks; null routes are Studio/NotFound/LocalChoose (no source) or Observability/control which have explicit branches. No S379a-d mapped route silently resolves to zero commands. PASS.

## Q2 — Per-key multi-source tokens: PASS

`invalidateCurrentRoute` clones `readbacks`, increments `readbacks[entry.key].token + 1` per plan entry, installs `loadingReadback(token)`, and emits one command per entry (`update.ts:315-325`). ModelsRoles and SystemOperator tests assert both keys and each token independently (`s393:83-110`). PASS.

## Q3 — Control branch: PASS

When the plan is empty and the route is not Observability, the control key path increments only `model.controls[controlKey].token` and emits exactly one `ReadControl`; no `ReadReadback` (`update.ts:334-341`). Providers/Endpoints/ControlController tests assert 0 ReadReadback and 1 ReadControl with the control token (`s393:112-128`). PASS.

## Q4 — Exact multiplicity/listener: PASS

One event emits exactly one read for the single-source table, two for ModelsRoles/SystemOperator, one control for control routes, zero for Studio; two events emit one each with advancing per-key tokens; the listener test sees one telemetry+revision listener pair and closes the source once (`s393:70-170`). PASS.

## Q5 — Watermark/resync: PASS

`invalidateCurrentRoute` does not touch `model.refresh`; every test asserts `result.model.refresh === model.refresh` for single/multi/control (`s393:79,95,126`), and the existing s278 suite passes. PASS.

## Q6 — Run: PASS

4 files **129/129 pass**; UI tsc exit 0.

## Q7 — Lint: PASS

anti_slop_lint reports no findings for s393 test.

## Residual notes (non-blocking)

- The single-source test table samples seven routes; Models, the Router family, Learning parent and LocalChoose are reviewed via the mapping/code rather than a per-route assertion. The plan itself handles them; Studio’s zero is intentionally tested.
- The listener test proves one pair/close-once; no source-close race is exercised.

## VERDICT: PASS

The plan is typed and exhaustive for the mapped routes, multi-source invalidation uses independent per-key tokens, the control branch emits ReadControl only, exact multiplicity and watermark preservation are tested, and 129/129 + UI tsc pass with clean lint. No remaining numbered items. No product file was modified; no commit made.

