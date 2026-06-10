Run: `/.recursive/run/35-runtime-ui-connect-declutter/`
Phase: `01 AS-IS`
Status: `LOCKED`
LockedAt: `2026-06-08T10:45:07Z`
LockHash: `b9e28a10da4ef792803c4f9b591116317bd5418db495f924e1c2cf4666689eaf`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/run/35-runtime-ui-connect-declutter/00-requirements.md`
- `/.recursive/run/35-runtime-ui-connect-declutter/00-worktree.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/role-model-baseline.md`
- `/.recursive/memory/skills/SKILLS.md`
- `/role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.ts`
- `/role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
- `/role-model-router/apps/runtime-ui/app/components/app-shell.tsx`
- `/role-model-router/apps/runtime-ui/app/components/page-primitives.tsx`
- `/role-model-router/apps/runtime-ui/app/components/future-surface.tsx`
- `/role-model-router/apps/runtime-ui/app/routes.ts`
- `/role-model-router/apps/runtime-ui/app/routes/legacy-redirect.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/dashboard.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/requests.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/observe-activity.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/router.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/router-config.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/endpoints.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/local-models.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/local-matrix.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/workbench.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/runtime.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/providers.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/control-models.tsx`
- `/role-model-router/apps/runtime-ui/app/routes/request-detail.tsx`
Outputs:
- `/.recursive/run/35-runtime-ui-connect-declutter/01-as-is.md`
Scope note: Captures the pre-run runtime UI state that justifies Connect renaming, design-system-first de-clutter work, and in-pillar merges for run 35.

## TODO

- [x] Map current navigation and route taxonomy to requirement IDs
- [x] Record naming collision between Local Endpoints and router-as-provider Endpoints section
- [x] Inventory meta panels, duplicate surfaces, and test guards that constrain changes
- [x] Record design-system-first baseline and validation floor from memory
- [x] List known unknowns and Phase 2 planning inputs
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Effective Inputs Re-read

- Locked `00-requirements.md` (`R0`–`R14`, `OOS1`–`OOS9`)
- Locked `00-worktree.md` (baseline `48503a4`, worktree `recursive/35-runtime-ui-connect-declutter`)
- `role-model-baseline` domain memory: runtime-ui ownership, 86-test focused baseline, clean-worktree `pnpm install` requirement
- Prior run context: run `14` (UI foundation), run `32` (routing operator surface), run `34` (design-system-first, slim route metadata)

## AS-IS Summary

The runtime UI at baseline `48503a4` is functionally complete but architecturally noisy:

1. **Naming collision** — Local section tab **Endpoints** (`/app/local/endpoints`) and nav section **Endpoints** (`/app/endpoints*`) use the same word for different jobs (local device inference vs router-as-provider).
2. **Triple navigation prose** — shell header descriptions, `FactCard.detail`, and `SectionCard.description` stack on most pages.
3. **Conversion-era meta panels** — “Reading order” and “Inspection path” blocks remain on live routes.
4. **Duplicate surfaces** — Router Overview/Config KPI strip; Connect registry + Router alias table; Overview latest-requests vs Observe ledger; Local Matrix vs Local Models; credential readiness on Runtime, Connect registry, and Workbench.
5. **Test contract** — `design-system.test.ts` encodes current alias ownership on both Router and Connect registry and a distinct observational Router Config route; changes must update tests in the same sub-phase as design-system edits per `R0`.

`future-surface.tsx` exists but no live route imports it.

## Reproduction Steps (Novice-Runnable)

1. `cd D:\DEV\role-model\.worktrees\35-runtime-ui-connect-declutter`
2. `corepack pnpm install` (required on clean worktree)
3. `cd role-model-router/apps/runtime-ui && corepack pnpm test` — expect 86 passing tests
4. Open `app/lib/design-system.ts` and inspect `runtimeNavigationSections` — note **Endpoints** section at lines 524–528 and **Local** item `/app/local/endpoints` labeled **Endpoints** at lines 183–192
5. Open `app/routes/legacy-redirect.tsx` — note `/app/control/endpoints` → `/app/endpoints` (not yet `/app/connect`)
6. Open `dashboard.tsx`, `requests.tsx`, `observe-activity.tsx`, `router-config.tsx` — confirm meta-guidance panels
7. Compare `router.tsx` and `router-config.tsx` — note shared FactCards plus Config-only guidance/policy sections
8. Open `design-system.test.ts` lines 422–431 and 441–456 — note regression guards that constrain R4 and R9

## Current Behavior by Requirement

### `R0` Design-system-first delivery order

- `DESIGN_SYSTEM.md` is the documented contract; `design-system.ts` owns `RuntimeRouteDefinition` and `runtimeNavigationSections`
- Run `34` established precedent: update design system before route behavior (`00-requirements.md` product phase rule)
- **Gap:** no automated enforcement of file-order beyond Phase 2 plan discipline; tests lag route changes today (e.g., alias test assumes current registry layout)

### `R1` Connect section rename

- `runtimeNavigationSections` title is **Endpoints** (`design-system.ts:524–528`)
- Connect-family routes use `section: "Endpoints"` (`controlEndpointsRoute`, `integrationsDownstreamRoute`, `integrationsUpstreamRoute`)
- Registry tab label is **Endpoints** (`controlEndpointsRoute.label`, line 245) — will collide with Local → Endpoints under renamed section **Connect**
- `DESIGN_SYSTEM.md` navigation table still documents **Endpoints** section and `/app/endpoints*` paths (lines 115, 155–161)

### `R2` Connect URL migration

- `routes.ts` registers `endpoints`, `endpoints/downstream`, `endpoints/upstream` — no `connect/*` paths
- `legacy-redirect.tsx` maps legacy paths to `/app/endpoints*`; `/app/control/endpoints` → `/app/endpoints` (line 9)
- `getRuntimeRouteDefinition()` resolves `/app/endpoints` (line 687) but has no `/app/connect*` handlers
- Canonical in-app link: `providers.tsx:679` → `/app/endpoints`

### `R3` Local → Endpoints preserved

- `localPeersRoute`: `to: "/app/local/endpoints"`, `label: "Endpoints"`, `section: "Local"` (`design-system.ts:183–192`)
- `/app/local/peers` → `/app/local/endpoints` redirect exists (`legacy-redirect.tsx:4`)
- **Qualified copy gap:** `endpoints.tsx` uses “Open Local Endpoints” and “Local > Endpoints”; `control-models.tsx` uses “Open Local Endpoints”

### `R4` Connect registry consumer focus

- `endpoints.tsx` renders:
  - conditional full **Provider onboarding readiness** `SectionCard` (lines 80–93)
  - full **Alias readiness** table `SectionCard` (lines 95–149)
  - provider + endpoint catalog (primary consumer inventory)
- `design-system.test.ts` **requires** alias on registry: `expect(endpointsRouteSource).toContain("Alias readiness")` (line 426)

### `R5` Meta-guidance panels

| File | Panel |
| --- | --- |
| `dashboard.tsx` | `SectionCard` title `Reading order` (~line 167) |
| `requests.tsx` | `SectionCard` `Inspection path` + inner `Reading order` / `Adjacent surfaces` (~127–145) |
| `observe-activity.tsx` | static `Reading order` prose in capture column (~172–176) |
| `router-config.tsx` | `Editing boundary`, `Where to edit`, `Where to test` (~87–119) |

### `R6` Shell chrome and copy budgets

- `app-shell.tsx` renders per-section page counts (`section.items.length`, lines 62–64) and `"{activeSection.title} pages"` label (lines 90–92)
- `page-primitives.tsx` `SectionCard` includes decorative `h-px w-8` rule (line 25)
- Many routes pass long `description` strings in `design-system.ts` (multi-sentence, >120 chars)
- `FactCard.detail` present on `dashboard.tsx`, `requests.tsx`, `router.tsx`, `workbench.tsx`

### `R7` Local Matrix duplication

- Separate nav item `/app/local/matrix` (`localMatrixRoute`, `design-system.ts:172–181`)
- `local-matrix.tsx` and `local-models.tsx` both call `fetchLocalModels()`
- Matrix shows grid cells; Models shows list/cards with load/unload controls

### `R8` Overview request duplication

- `dashboard.tsx` renders `Latest requests` `SectionCard` with up to 5 detailed request panels (~127–164)
- `requests.tsx` provides full telemetry ledger with overlapping row metadata

### `R9` Router Overview vs Config

**Shared:** 4-up FactCard strip (strategy, execution mode, controller, alias/policy counts)

**Overview-only (`router.tsx`):** Alias inventory table, Execution-ready aliases pills

**Config-only (`router-config.tsx`):** Guidance provenance, Policy inputs (roles/tasks JSON) — **must survive merge**

**Nav:** Router section lists both Overview (`/app/router`) and Config (`/app/router/config`) (`design-system.ts:510–516`)

**Links to Config:** `router.tsx:55`, `control-routing-strategy.tsx:171,453`, `control-roles.tsx:398`

**Test guard:** `router config stays observational while routing strategy owns editing controls` (`design-system.test.ts:441–456`)

### `R10` Credential readiness duplication

- `runtime.tsx`: full readiness `SectionCard` when rows exist
- `endpoints.tsx`: full readiness `SectionCard` when rows exist (lines 80–93)
- `workbench.tsx`: `SectionCard` “Execution readiness” when `blockingReadinessRows.length > 0` (~195–208)

### `R11` Design-system contract and dead scaffold

- `DESIGN_SYSTEM.md` documents **Endpoints** section, not Connect pillar model
- No `DisclosureSection` primitive documented or implemented
- `future-surface.tsx` present; grep shows **no live route imports** — only `design-system.test.ts` reads source

### `R12` Verification floor

- Baseline at `48503a4` in worktree: `corepack pnpm test` → **86/86 pass** (`evidence/logs/baseline-runtime-ui-test.log`)
- No automated test for URL redirects today

### `R13` Progressive disclosure

- `request-detail.tsx`: ~8 FactCards + multiple expanded `SectionCard`s — no collapse primitive
- `control-models.tsx`: inspect modal with 7 sections all expanded by default
- No `DisclosureSection` in `page-primitives.tsx`

### `R14` Cross-link normalization

Grep snapshot (baseline):
- `/app/endpoints` in `providers.tsx` Link target
- `/app/router/config` in `router.tsx`, `control-routing-strategy.tsx`, `control-roles.tsx`
- “Open Local Endpoints” in `endpoints.tsx`, `control-models.tsx`

## Navigation Taxonomy (AS-IS)

| Section | Routes | Count |
| --- | --- | --- |
| Overview | `/app` | 1 |
| Studio | `/app/studio/*` | 5 |
| Local | models, endpoints, swap, policy, logs, matrix | 6 |
| Remote | providers | 1 |
| Models | inventory, roles | 2 |
| Router | overview, strategy, controller, config, candidates, decisions | 6 |
| Observe | activity, requests, logs | 3 |
| **Endpoints** | registry, downstream, upstream | 3 |
| System | runtime, runtime-config, peers | 3 |

**Total primary nav destinations:** 30

## Pillar Mapping (AS-IS vs target)

| Pillar | AS-IS home | Target (per requirements) |
| --- | --- | --- |
| Local device inference | Local section | Unchanged |
| Remote cloud providers | Remote section | Unchanged |
| Router-as-provider | **Endpoints** section `/app/endpoints*` | **Connect** section `/app/connect*` |

## Relevant Code Pointers

| Area | Path | Notes |
| --- | --- | --- |
| Nav + route metadata | `role-model-router/apps/runtime-ui/app/lib/design-system.ts` | `runtimeNavigationSections`, `controlEndpointsRoute`, `localPeersRoute` |
| Route registration | `role-model-router/apps/runtime-ui/app/routes.ts` | `/app/endpoints*` paths |
| Legacy redirects | `role-model-router/apps/runtime-ui/app/routes/legacy-redirect.tsx` | Maps control/integrations paths |
| Path resolution | `design-system.ts` `getRuntimeRouteDefinition()` | `/app/endpoints` alias only |
| Shell chrome | `app/components/app-shell.tsx` | Counts, section tabs label |
| Primitives | `app/components/page-primitives.tsx` | `SectionCard` divider |
| Regression tests | `app/lib/design-system.test.ts` | Nav inventory, alias ownership, router config guard |
| Design contract | `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md` | Endpoints section docs |
| Meta panels | `dashboard.tsx`, `requests.tsx`, `observe-activity.tsx`, `router-config.tsx` | Reading order / inspection / editing boundary |
| Duplicates | `router.tsx`, `router-config.tsx`, `endpoints.tsx`, `local-matrix.tsx`, `local-models.tsx` | KPI/alias/matrix duplication |
| Dead scaffold | `app/components/future-surface.tsx` | Unused by routes |

## Evidence

| Evidence | Path |
| --- | --- |
| Baseline test log (86/86 pass) | `/.recursive/run/35-runtime-ui-connect-declutter/evidence/logs/baseline-runtime-ui-test.log` |
| Worktree install log | `/.recursive/run/35-runtime-ui-connect-declutter/evidence/logs/baseline-pnpm-install.log` |
| Diff basis | `/.recursive/run/35-runtime-ui-connect-declutter/00-worktree.md` |
| Memory: runtime-ui ownership | `/.recursive/memory/domains/role-model-baseline.md` |
| Memory: clean worktree install | `role-model-baseline` Validation Path + worktree baseline failure before install |

## Known Unknowns

- Whether Connect registry tab should be titled **Registry** or **Overview** (requirements choose **Registry**)
- Whether `router-config.tsx` file is deleted or kept as redirect-only shim after R9 merge
- Whether `?view=grid` search param needs test coverage or URL-sync in Local Models toggle
- Human browser QA sign-off not requested; Phase 5 remains agent-operated per requirements

## Traceability

| R# | AS-IS gap recorded | Primary evidence |
| --- | --- | --- |
| R0 | No enforced design-system-first gate in code | `DESIGN_SYSTEM.md`, run 34 precedent |
| R1 | Section still named Endpoints; registry tab label Endpoints | `design-system.ts:242–252, 524–528` |
| R2 | No `/app/connect*` routes or path resolution | `routes.ts`, `legacy-redirect.tsx`, `getRuntimeRouteDefinition` |
| R3 | Local Endpoints correct; qualified copy incomplete | `localPeersRoute`, `endpoints.tsx`, `control-models.tsx` |
| R4 | Full alias + readiness on registry; test requires alias | `endpoints.tsx`, `design-system.test.ts:422–427` |
| R5 | All four meta panel sites present | route files listed above |
| R6 | Shell counts, section label, divider, stacked prose | `app-shell.tsx`, `page-primitives.tsx` |
| R7 | Matrix separate route duplicating API | `local-matrix.tsx`, `local-models.tsx` |
| R8 | Five-card latest requests on Overview | `dashboard.tsx` |
| R9 | Duplicate KPIs; Config has unique sections; test guard | `router.tsx`, `router-config.tsx`, tests |
| R10 | Readiness on 3 surfaces | `runtime.tsx`, `endpoints.tsx`, `workbench.tsx` |
| R11 | No Connect docs; no DisclosureSection; dead FutureSurface | `DESIGN_SYSTEM.md`, `future-surface.tsx` |
| R12 | 86-test baseline green | `evidence/logs/baseline-runtime-ui-test.log` |
| R13 | No disclosure primitive | `request-detail.tsx`, `control-models.tsx` |
| R14 | Stale links and ambiguous copy | grep results above |

## Subagent Capability Probe

- Subagent tools available in this environment; Phase 1 AS-IS performed as **self-audit** with full codebase reads and baseline test execution in worktree.

## Delegation Decision Basis

- Context bundle complete for AS-IS (requirements, worktree, memory, primary route sources); no delegated AS-IS audit required at this phase.

## Subagent Contribution Verification

- N/A — no delegated subagent work for Phase 1.

## Requirement Completion Status

| R# | Disposition | Evidence |
| --- | --- | --- |
| R0–R14 | `analyzed` | This AS-IS artifact |

## Coverage Gate

- [x] Every in-scope `R#` has AS-IS findings with code pointers
- [x] Memory docs (`MEMORY.md`, `role-model-baseline`) applied to baseline/setup narrative
- [x] Test guards and naming collisions explicitly recorded
- [x] Known unknowns listed for Phase 2

Coverage: PASS

## Approval Gate

- [x] AS-IS sufficient to draft Phase 2 plan with design-system-first sub-phases
- [x] No blocker prevents worktree-based implementation

Approval: PASS

Audit: PASS
