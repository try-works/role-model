Run: `/.recursive/run/35-runtime-ui-connect-declutter/`
Phase: `02 TO-BE Plan`
Status: `LOCKED`
LockedAt: `2026-06-08T10:47:55Z`
LockHash: `e7ba97f09b987630e1307d152d4af6e0320aaae3343ad27c95f8c58ca14f3d1d`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/35-runtime-ui-connect-declutter/00-requirements.md`
- `/.recursive/run/35-runtime-ui-connect-declutter/00-worktree.md`
- `/.recursive/run/35-runtime-ui-connect-declutter/01-as-is.md`
- `/.recursive/memory/domains/role-model-baseline.md`
Outputs:
- `/.recursive/run/35-runtime-ui-connect-declutter/02-to-be-plan.md`
Scope note: ExecPlan for Connect renaming, design-system-first UI de-clutter, in-pillar merges, and bounded progressive disclosure in `role-model-router/apps/runtime-ui/`.

## TODO

- [x] Map each `R#` to implementation sub-phases and file-level edits
- [x] Preserve design-system-first ordering in every sub-phase
- [x] Define pragmatic TDD / regression-test strategy
- [x] Define agent-operated manual QA scenarios
- [x] Record worktree diff basis and expected product paths
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Planned Outcome

Run 35 will:

1. Rename the router-as-provider nav section and URLs from **Endpoints** to **Connect** while preserving Local → **Endpoints** and legacy redirects.
2. Quiet shell chrome and remove meta-guidance panels.
3. Reframe Connect registry for consumer visibility; merge duplicate surfaces within pillars.
4. Add `DisclosureSection` and collapse dense detail surfaces by default.
5. Keep **86+** runtime-ui tests green and production build passing.

All work executes from worktree `D:\DEV\role-model\.worktrees\35-runtime-ui-connect-declutter` on branch `recursive/35-runtime-ui-connect-declutter`.

## Requirement Mapping

| R# | Sub-phase(s) | Primary deliverable |
| --- | --- | --- |
| R0 | SP1–SP7 | Design-system-first file order in every sub-phase |
| R1 | SP1 | Connect section + tab labels + metadata |
| R2 | SP1 | `/app/connect/*` routes, legacy redirects, path resolution |
| R3 | SP1, SP3 | Local Endpoints preserved; qualified copy |
| R4 | SP3 | Connect registry reframe; alias table → Router link |
| R5 | SP2 | Meta panel removal |
| R6 | SP2 | Shell quieting + copy budgets |
| R7 | SP4 | Matrix → Local Models grid toggle |
| R8 | SP4 | Overview request teaser |
| R9 | SP5 | Router Config merged into Overview |
| R10 | SP3 | Credential readiness dedupe |
| R11 | SP1, SP2, SP6, SP7 | Docs, tests, `DisclosureSection`, remove `future-surface.tsx` |
| R12 | SP1–SP7 | Test + build verification each sub-phase |
| R13 | SP6 | Request detail + model modal disclosure |
| R14 | SP1, SP3, SP5 | Cross-link and copy normalization |

## Implementation Sub-phases

### SP1 — Connect rename and URL migration (`R1`, `R2`, `R3`, `R14` partial)

**Order (mandatory):**

1. `DESIGN_SYSTEM.md` — Connect pillar, `/app/connect*` route table, handoff copy table
2. `design-system.ts` — rename section; update `controlEndpointsRoute` → Connect paths/labels/titles; add `getRuntimeRouteDefinition` handlers for `/app/connect*` and legacy `/app/endpoints*`
3. `design-system.test.ts` — nav inventory expects Connect + `/app/connect*`; route definition tests
4. `routes.ts` — register `connect`, `connect/downstream`, `connect/upstream`; add legacy redirect routes for old `endpoints/*` paths
5. `legacy-redirect.tsx` — point all legacy targets to `/app/connect*` directly
6. `providers.tsx` and any other canonical links — `/app/connect`

**Route metadata targets:**

| Path | Section | Tab | Title |
| --- | --- | --- | --- |
| `/app/connect` | Connect | Registry | Available models & endpoints |
| `/app/connect/downstream` | Connect | Downstream | Connect your application |
| `/app/connect/upstream` | Connect | Upstream | Upstream passthrough |

### SP2 — Shell quieting and meta panel removal (`R5`, `R6`, `R11` partial)

**Order:**

1. `DESIGN_SYSTEM.md` — copy budget rules; shell chrome rules
2. `design-system.ts` — shorten all `RuntimeRouteDefinition.description` to ≤120 chars
3. `design-system.test.ts` — guards: no `Reading order`, `Inspection path`, `Editing boundary` in route sources; optional max description length helper
4. `page-primitives.tsx` — remove `SectionCard` decorative divider
5. `app-shell.tsx` — remove page counts and `"{Section} pages"` label
6. Routes — remove meta panels (`dashboard`, `requests`, `observe-activity`); strip `FactCard.detail` and `SectionCard.description` on ledger/meta routes per `R6` list

### SP3 — Connect registry reframe and readiness dedupe (`R4`, `R10`, `R14`)

**Order:**

1. `DESIGN_SYSTEM.md` — Connect registry scope: consumer inventory; alias lives on Router
2. `design-system.test.ts` — **first** update alias-ownership test: Router keeps alias; Connect registry must not contain `Alias readiness`
3. `endpoints.tsx` — remove alias table; add Router handoff link; compact readiness banner when `readinessRows.length > 0`; fix empty-state qualified copy
4. `control-models.tsx`, `local-models.tsx` — qualified Local/Connect copy
5. `providers.tsx` — post-activation link label **View in Connect registry**

### SP4 — Overview and Local merges (`R7`, `R8`)

**Order:**

1. `DESIGN_SYSTEM.md` — Local Models grid view; Overview teaser contract
2. `design-system.ts` — remove `localMatrixRoute` from nav; keep redirect metadata note
3. `design-system.test.ts` — nav without `/app/local/matrix`; matrix redirect or merged view test
4. `local-models.tsx` — List/Grid toggle; grid cells from matrix layout; read `?view=grid` on mount
5. `routes.ts` — `/app/local/matrix` → redirect component to `/app/local/models?view=grid`
6. `dashboard.tsx` — replace 5-card ledger with ≤3 compact rows + CTA to `/app/observe/requests`

### SP5 — Router Overview + Config merge (`R9`, `R14`)

**Order:**

1. `DESIGN_SYSTEM.md` — Router nav without Config tab; Overview owns guidance/policy read-only blocks
2. `design-system.ts` — remove `routerConfigRoute` from `runtimeNavigationSections`; keep detail route metadata for redirect/legacy only if needed
3. `design-system.test.ts` — replace `router config stays observational` test with merged-router guard
4. `router.tsx` — import/move **Guidance provenance** and **Policy inputs** sections from `router-config.tsx`; single FactCard strip; update header actions
5. `routes.ts` — `router/config` → `legacy-redirect` or inline redirect to `/app/router`
6. Update links in `control-routing-strategy.tsx`, `control-roles.tsx`, `router.tsx` — `/app/router` not `/app/router/config`
7. Delete or gut `router-config.tsx` if redirect-only shim unnecessary

### SP6 — Progressive disclosure (`R13`, `R11`)

**Order:**

1. `DESIGN_SYSTEM.md` — document `DisclosureSection` contract
2. `page-primitives.tsx` — add `DisclosureSection` (`summary`, `children`, `defaultOpen`, `aria-expanded`)
3. `design-system.test.ts` — primitive export / basic render smoke if useful
4. `request-detail.tsx` — wrap secondary groups (routing diagnostics, stream/cache, tooling, captures, endpoint profile) in collapsed disclosures; keep summary FactCards expanded
5. `control-models.tsx` — modal: Overview + Roles expanded; other sections collapsed

### SP7 — Dead scaffold removal and final sweep (`R11`, `R12`, `R14`)

1. Delete `future-surface.tsx`; remove from `design-system.test.ts` imports/assertions
2. Grep verification: no canonical `/app/endpoints` or `/app/router/config` links in `app/` (except legacy redirect)
3. Full `corepack pnpm test` + `build` in worktree
4. Update any remaining `DESIGN_SYSTEM.md` live route receipts

## Planned Changes by File

| File | SP | Change summary |
| --- | --- | --- |
| `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md` | SP1–SP7 | Connect IA, pillars, copy budgets, DisclosureSection, template receipts |
| `app/lib/design-system.ts` | SP1, SP4, SP5 | Connect section, paths, labels, descriptions, path resolution, remove matrix/config nav |
| `app/lib/design-system.test.ts` | SP1–SP7 | Nav paths, alias ownership, meta guards, merged router guard, redirect tests |
| `app/routes.ts` | SP1, SP4, SP5 | `connect/*` routes; matrix redirect; config redirect |
| `app/routes/legacy-redirect.tsx` | SP1 | Legacy → `/app/connect*` |
| `app/components/app-shell.tsx` | SP2 | Remove counts and section-pages label |
| `app/components/page-primitives.tsx` | SP2, SP6 | Remove divider; add `DisclosureSection` |
| `app/components/future-surface.tsx` | SP7 | **Delete** |
| `app/routes/dashboard.tsx` | SP2, SP4 | Remove Reading order; slim requests |
| `app/routes/requests.tsx` | SP2 | Remove Inspection path; strip descriptions/details |
| `app/routes/observe-activity.tsx` | SP2 | Remove Reading order blurb |
| `app/routes/endpoints.tsx` | SP3 | Registry reframe |
| `app/routes/router.tsx` | SP5 | Absorb config unique sections |
| `app/routes/router-config.tsx` | SP5 | Remove or redirect-only |
| `app/routes/local-models.tsx` | SP4 | Grid toggle + query param |
| `app/routes/local-matrix.tsx` | SP4 | Redirect shim or delete with routes.ts redirect |
| `app/routes/workbench.tsx` | SP2, SP3 | Strip FactCard details; readiness banner only |
| `app/routes/runtime.tsx` | SP2 | Strip SectionCard descriptions (keep readiness) |
| `app/routes/providers.tsx` | SP1, SP3 | Connect link + label |
| `app/routes/control-models.tsx` | SP6, SP14 | Modal disclosure; qualified copy |
| `app/routes/request-detail.tsx` | SP6 | Disclosure groups |
| `app/routes/control-routing-strategy.tsx` | SP5, SP14 | Links to `/app/router` |
| `app/routes/control-roles.tsx` | SP5, SP14 | Links to `/app/router` |
| `app/routes/integrations-downstream.tsx` | SP2 | Title-only SectionCards |
| `app/routes/integrations-upstream.tsx` | SP2 | Title-only SectionCards |

**Out of scope paths:** no `runtime-host-bridge` changes unless a missing link target is discovered (per `OOS1`).

## Implementation Steps

1. Complete **SP1** end-to-end (doc → tests → routes) and run `corepack pnpm test` in `runtime-ui`.
2. Complete **SP2**; re-run tests.
3. Complete **SP3**; re-run tests (alias ownership test must pass with new contract).
4. Complete **SP4**; verify matrix redirect and grid view manually or via test.
5. Complete **SP5**; verify merged router renders guidance + policy blocks.
6. Complete **SP6**; verify disclosures default collapsed.
7. Complete **SP7**; full test + build; grep link normalization.
8. Record Phase 3 implementation summary with per-SP evidence paths.

## TDD Plan

TDD Mode: `pragmatic`

Rationale: UI-heavy refactor with strong existing `design-system.test.ts` regression suite. Sub-phases update tests **before or with** route changes in the same commit series; no strict RED log required per slice unless a test is added first for new behavior (Connect paths, matrix redirect, merged router).

### Pragmatic test-first checkpoints

| Checkpoint | Test action | Then implement |
| --- | --- | --- |
| Connect nav | Update nav inventory test to expect Connect paths | `design-system.ts`, `routes.ts` |
| Alias ownership | Flip test: registry must not contain `Alias readiness` | `endpoints.tsx` |
| Meta panels | Add `not.toContain('Reading order')` guards | Remove panels |
| Merged router | Replace config observational test | `router.tsx` merge |
| Matrix merge | Nav test excludes matrix; optional redirect URL test | `local-models.tsx` |

## Testing Strategy

Per sub-phase, from worktree:

```powershell
cd D:\DEV\role-model\.worktrees\35-runtime-ui-connect-declutter\role-model-router\apps\runtime-ui
corepack pnpm test
corepack pnpm build
```

Record logs under `/.recursive/run/35-runtime-ui-connect-declutter/evidence/logs/`.

Final Phase 4 must show:
- 86+ tests passing (count may increase if new tests added)
- build exit 0
- redirect coverage via test or `05-manual-qa.md` evidence

Do **not** run repo-root `biome check .` across `.worktrees/` (per memory pattern).

## Playwright Plan (if applicable)

Not applicable. Agent-operated browser QA uses Cursor browser MCP or manual navigation per `05-manual-qa.md`.

## Manual QA Scenarios

QA Execution Mode: `agent-operated`

1. **Connect rename** — Open `/app/connect`; shell eyebrow **Connect**; tabs Registry / Downstream / Upstream; `/app/endpoints` redirects to `/app/connect`.
2. **Local Endpoints preserved** — Local → **Endpoints** tab still `/app/local/endpoints`; distinct from Connect.
3. **Registry reframe** — Connect registry shows endpoint catalog; no alias table; Router handoff link works.
4. **Overview** — KPI + comparison remain; latest requests ≤3 rows or absent with CTA to Observe → Requests.
5. **Local Models grid** — `/app/local/matrix` lands on grid view; load/unload still works in list view.
6. **Router merge** — `/app/router` shows guidance provenance + policy inputs; `/app/router/config` redirects; Strategy still editable on Strategy page.
7. **Disclosure** — Request detail and model modal secondary sections collapsed by default; expand reveals same data.
8. **Cross-links** — Providers post-activation → Connect registry; no bare "Open Endpoints" without section qualifier.

## Idempotence and Recovery

- Sub-phases are independently revertible via git commits on `recursive/35-runtime-ui-connect-declutter`.
- Legacy URLs remain valid via redirects; bookmarked `/app/endpoints*` paths must not 404.
- If a sub-phase fails tests, fix before proceeding; do not stack SP(n+1) on failing SP(n).
- Worktree can be recreated from `main` at `48503a4` if corrupted; baseline log paths are recorded in `00-worktree.md`.

## Plan Drift Check

| AS-IS assumption | Plan handling |
| --- | --- |
| `design-system.test.ts` requires alias on registry | SP3 updates test **before** removing alias table |
| Router Config has unique sections | SP5 moves them to Overview before removing Config tab |
| `future-surface.tsx` unused | SP7 deletes |
| Clean worktree needs `pnpm install` | Already done; repeat if worktree reset |
| Memory: focused runtime-ui tests only | No root-wide test gate for this run |

No requirement deferred. No scope expansion beyond `R0`–`R14`.

## Risks And Controls

| Risk | Control |
| --- | --- |
| Connect vs Local Endpoints confusion persists | Registry tab **Registry** not Endpoints; qualified copy table in design system (`R14`) |
| Removing alias table breaks operator workflow | Router retains alias inventory; Connect links to Router |
| Router merge loses guidance/policy | Explicit merge checklist in SP5; manual QA #6 |
| Route-only change ahead of design system | `R0` enforced per sub-phase order; Phase 3.5 review |
| Test count/regression drift | Run tests after every SP |

## Traceability

- `R0` → Every SP lists design-system-first order; Phase 3.5 checks compliance.
- `R1` → SP1 `DESIGN_SYSTEM.md`, `design-system.ts`, shell eyebrow.
- `R2` → SP1 `routes.ts`, `legacy-redirect.tsx`, `getRuntimeRouteDefinition`.
- `R3` → SP1 metadata; SP3/SP14 qualified copy.
- `R4` → SP3 registry reframe + test update.
- `R5` → SP2 route deletions.
- `R6` → SP2 shell + enumerated route classes.
- `R7` → SP4 matrix merge.
- `R8` → SP4 dashboard teaser.
- `R9` → SP5 router merge.
- `R10` → SP3 readiness banner rules.
- `R11` → SP1–SP7 docs/tests; SP6 primitive; SP7 delete FutureSurface.
- `R12` → Testing Strategy + per-SP test runs.
- `R13` → SP6 DisclosureSection + route/modal wiring.
- `R14` → SP1/SP3/SP5/SP7 grep and link updates.

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `48503a46b138054970ba63f576d0ce454f08b5c6`
- Comparison reference: `working-tree`
- Normalized baseline: `48503a46b138054970ba63f576d0ce454f08b5c6`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only 48503a46b138054970ba63f576d0ce454f08b5c6`
- Expected product/worktree paths:
  - `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
  - `role-model-router/apps/runtime-ui/app/lib/design-system.ts`
  - `role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
  - `role-model-router/apps/runtime-ui/app/components/`
  - `role-model-router/apps/runtime-ui/app/routes.ts`
  - `role-model-router/apps/runtime-ui/app/routes/`
- Planned out-of-scope protection:
  - no `runtime-host-bridge` changes
  - no Studio nav consolidation (`OOS5`)
  - no repo-wide Biome/format sweeps

## Prior Recursive Evidence Reviewed

- `/.recursive/run/14-router-runtime-ui-foundation/` — UI app structure and design-system ownership
- `/.recursive/run/32-router-runtime-routing-operator-surface/` — Router operator routes and workbench integration
- `/.recursive/run/34-router-runtime-role-policy-and-ui-fixture-reduction/` — design-system-first sequencing precedent

## Audit Context

- Audit Execution Mode: self-audit
- Subagent Capability Probe: Task/subagent tools available; plan is file-specific enough for self-audit without delegation.
- Delegation Decision Basis: full inputs locked (requirements, worktree, AS-IS); no ambiguous scope requiring external planner.
- Delegation Override Reason: n/a

## Effective Inputs Re-read

- `00-requirements.md` (LOCKED)
- `00-worktree.md` (LOCKED)
- `01-as-is.md` (LOCKED)
- `role-model-baseline` memory — focused runtime-ui validation path

## Earlier Phase Reconciliation

- AS-IS recorded test guards for alias ownership and router config — SP3 and SP5 explicitly reconcile.
- AS-IS recorded naming collision — SP1 tab label **Registry** addresses it.
- User-approved Connect pillar model — unchanged in plan.

## Subagent Contribution Verification

- N/A — no delegated subagent work for Phase 2.

## Requirement Completion Status

- R0 | Status: deferred | Rationale: plan defines design-system-first enforcement for Phase 3. | Deferred By: `03-implementation-summary.md`
- R1 | Status: deferred | Rationale: SP1 plans Connect section rename. | Deferred By: `03-implementation-summary.md`
- R2 | Status: deferred | Rationale: SP1 plans URL migration and redirects. | Deferred By: `03-implementation-summary.md`
- R3 | Status: deferred | Rationale: SP1/SP3 preserve Local Endpoints naming. | Deferred By: `03-implementation-summary.md`
- R4 | Status: deferred | Rationale: SP3 plans registry reframe. | Deferred By: `03-implementation-summary.md`
- R5 | Status: deferred | Rationale: SP2 plans meta panel removal. | Deferred By: `03-implementation-summary.md`
- R6 | Status: deferred | Rationale: SP2 plans shell/copy diet. | Deferred By: `03-implementation-summary.md`
- R7 | Status: deferred | Rationale: SP4 plans matrix merge. | Deferred By: `03-implementation-summary.md`
- R8 | Status: deferred | Rationale: SP4 plans overview teaser. | Deferred By: `03-implementation-summary.md`
- R9 | Status: deferred | Rationale: SP5 plans router merge with preserved sections. | Deferred By: `03-implementation-summary.md`
- R10 | Status: deferred | Rationale: SP3 plans readiness dedupe. | Deferred By: `03-implementation-summary.md`
- R11 | Status: deferred | Rationale: SP1–SP7 plan docs/tests/primitive cleanup. | Deferred By: `03-implementation-summary.md`
- R12 | Status: deferred | Rationale: testing strategy per SP. | Deferred By: `04-test-summary.md`
- R13 | Status: deferred | Rationale: SP6 plans disclosure. | Deferred By: `03-implementation-summary.md`
- R14 | Status: deferred | Rationale: SP1/SP3/SP5/SP7 plan link normalization. | Deferred By: `03-implementation-summary.md`

## Gaps Found

- None at plan time.

## Repair Work Performed

- None at plan time.

## Audit Verdict

- Coverage: PASS
- Approval: PASS
- Audit: PASS

## Coverage Gate

- [x] Every in-scope `R#` maps to a sub-phase and file surfaces
- [x] Design-system-first order explicit in every SP
- [x] AS-IS test conflicts reconciled (alias, router config)
- [x] Worktree diff basis recorded
- [x] Manual QA and test strategy defined

Coverage: PASS

## Approval Gate

- [x] Plan is specific enough to begin Phase 3 implementation
- [x] No unresolved ambiguity on merge behavior or Connect naming
- [x] Out-of-scope boundaries preserved

Approval: PASS

Audit: PASS
