# S381 — independent review: S379a Models/roles family

Reviewer: `s9-private-readonly`, actual model **deepseek-flash** (live). Read-only on product files; no source edit, no commit. I ran the 5 affected UI files, UI tsc and anti-slop.

## Verified frozen artifacts

| File | sha256 | bytes |
| --- | --- | --- |
| `src/route.ts` | `23E691121C1AC34B36DC53A10BC22743A4893A47207F1BC4870E006C78D94B87` | 9380 |
| `src/legacy-redirects.ts` | `85A4892B8A1492A8BCD6962C99A89AC5E08BEAA7A559D02D0985147AA46C9DB3` | 12076 |
| `src/view.ts` | `AE279FCC7A97939260B561744DC7B423D7B7E269959E986B0F7621E18502EA9B` | 62239 |
| `test/s380-models-roles.test.ts` | `16E7BD911E8CBAC3204AEB098FAEA503E69FD6A4AF76A1BBA1B796F63CBBF4DA` | 3605 |
| `test/s269-canonical-url.test.ts` | `17078F9D080C3583CE0E06D268245E4065FD164834EA6F6822B0E5A4120E0B1E` | 23350 |

All match. Affected 5 files: **123/123 pass**; UI tsc exit 0.

## Q1 — Legacy redirect: PASS

`/app/control/roles` maps to `/app/models/roles` and both canonicalise to `/models/roles` (`legacy-redirects:37,70,100`). The redirect is the `ReplaceLegacyUrl` Command using `Navigation.replaceUrl` (`:297-301`); the test asserts exactly one such Command with href `/models/roles?filter=active#roles` and the route becomes `ModelsRoles` (`s380:36-48`). Query/hash preserved; no push. PASS.

## Q2 — 14 remaining NotFound: PASS

`MISSING_ORIGINAL_TARGETS` has length 14 and no `/app/models/roles`; every entry parses to `NotFound` with the same path and has no legacy redirect; `/app/router/strategy` is also NotFound (`s380:50-63`). PASS.

## Q3 — Roles page: read-only PASS; state handling HOLD

The page has no write path or mutation message; it reads `configuredModels` and `modelEndpoints` and renders a read-only list (`view:691-727`). That satisfies read-only.

**But its loading/error/empty state is not honest for the endpoint readback.** The guard is `models.status !== "ok" || endpoints.status === "loading"`, and the data attribute uses only `models.status` (`view:692-702`). If `models` is ok and `endpoints` is **loading**, the section still advertises `models-roles-state="ok"` and shows the generic "No role eligibility…" text rather than a loading state. If `models` is ok and `endpoints` is **error**, the guard does not trigger at all; the code proceeds with empty/endpoint rows, sets state ok, and silently omits the endpoint read error. Neither case is an honest page state. Required: include endpoints loading/error in the state/guard (and message), add a read-only roles page test for loading/empty/error (the current s380 test does not render the role page at all).

## Q4 — RequestId families: PASS

`/requests/req-9` still parses RequestDetail with requestId; `/app/observe/requests/req-9` redirects to it and parses the same (`s380:65-78`). PASS.

## Q5 — Run: PASS

5 files **123/123 pass**; UI tsc exit 0.

## Q6 — Lint: PASS

`anti_slop_lint` reports no findings for `test/s380-models-roles.test.ts` or `test/s269-canonical-url.test.ts`. The route/redirect/view files are not the scoped lint targets but no new test finding is present.

## VERDICT: HOLD (1 state/test repair)

1. **Make the roles page states honest:** treat `modelEndpoints` loading as loading and `modelEndpoints` error as error (data attribute and message), not as ok/“No role eligibility”; add a read-only page test covering loading/empty/error for both readbacks. The read-only/list behavior is otherwise sound.

No product file was modified; no commit made.

## Final state/test verification — PASS

Final hashes: view 469094098D75AB3F0B44B971E97B78E5223F36788DB4D73ABA9C2B9A40A4F580 (62571 B); init DB5DC53C87744119847B7282173686287EAE65CB1140B7B1DCDD54A3FDC451AE (8260 B); s380 test 2C9EC34BCFDAD3B87D2D2C37EB9680CECEC9FE0C7F4D112A151713499BFBF142 (6897 B). 5 UI files: 126/126; UI tsc exit 0; test lint 0.

- The roles page now derives state from BOTH readbacks: loading if either is loading/idle, error if either is error, empty if models empty/rows0 or endpoints empty; messages are Loading / models.message / endpoints.message / No configured models (view:691-711). The endpoint-loading/error masking is gone.
- init dispatches configuredModels AND modelEndpoints for ModelsRoles (init:75-79), so the page states are driven by real readbacks, not idle placeholders.
- The new mounted page tests assert loading (endpoints loading), error with read-failed message, and empty with “No configured models” through data-models-roles-state and visible text (s380:115-145). They are real mounts at /models/roles; 126/126 with tsc 0.
- The read-only behavior is unchanged (no write path); redirects, 14 NotFound families and requestId tests remain green.

Residual note: the error test exercises both readers failing rather than an isolated endpoints-only error, but the implementation checks both statuses and the endpoint error path is covered by the same branch.

## FINAL VERDICT: PASS

The S381 state/fixture HOLD is closed: honest loading/error/empty from both readbacks, real dispatches, mounted behavioral tests, 126/126 and UI tsc green. No remaining numbered items. No product file was modified; no commit made.

