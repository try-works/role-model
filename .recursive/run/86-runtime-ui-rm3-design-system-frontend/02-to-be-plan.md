Run: `/.recursive/run/86-runtime-ui-rm3-design-system-frontend/`
Phase: `02 TO-BE Plan`
Status: `LOCKED`
LockedAt: `2026-07-30T13:35:00Z`
Workflow version: `recursive-mode-audit-v2`
TDD Mode: `strict`
QA Execution Mode: `hybrid`
Inputs:
- `/.recursive/run/86-runtime-ui-rm3-design-system-frontend/00-requirements.md` (LOCKED; LockHash `ceaec347c5a39c239e39efeb1ff321cacf219d9993686857e974b1beb46fe03d`)
- `/.recursive/run/86-runtime-ui-rm3-design-system-frontend/00-worktree.md` (LOCKED; LockHash `5e6ad3855c8f7351a051f4211d1ce54c509afad5cb77cb39dd91cb6ac43a06cb`)
- `/.recursive/run/86-runtime-ui-rm3-design-system-frontend/01-as-is.md` (LOCKED; LockHash `7d0ce7308178b2c942852ab2c9951396a40f95eb2de9dac6b52fa450f7e6e1f1`)
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/run/60-runtime-ui-paper-linear-review-alignment/02-to-be-plan.md` (pattern reference)
- Paper file `01KW9C35N2G5PZRS4SBJ5678Q6` pages `4-0` / `5-0` / `6-0` / `7-0`
- External port source: `C:\Users\erikb\code\executor\packages\role-model\ui` (`@role-model/ui`)
- Worktree product surface: `D:\DEV\role-model\.worktrees\86-runtime-ui-rm3-design-system-frontend`
Outputs:
- `/.recursive/run/86-runtime-ui-rm3-design-system-frontend/02-to-be-plan.md`
Scope note: This artifact defines the Wave 1→4 execution plan for migrating `runtime-ui` from Linear/`--rm-*` to the approved RM v3 design system: contract files first, in-repo kit + shared code second, route pages third, rebuilt-runtime verification fourth. No product code is changed in Phase 2.

Audit Execution Mode: `self-audit`
Subagent Availability: `available`
Subagent Capability Probe: explore subagent used in Phase 1; no delegation required for Phase 2 planning
Delegation Decision Basis: Phase 2 plan is assembled directly from locked requirements, AS-IS findings, and verified repo/executor kit inventory
Delegation Override Reason: User requested direct ExecPlan authorship; planning surface is fully local to locked run artifacts
Audit Inputs Provided:
- locked run-86 requirements, worktree, and AS-IS artifacts
- current runtime-ui shared code inventory (Linear-era baseline)
- executor `@role-model/ui` export surface list
- rebuilt-runtime QA harness (`runtime:validate-ui`, `start-for-qa.ts`, Playwright webServer)

## TODO

- [x] Re-read locked requirements, worktree diff basis, and AS-IS drift inventory
- [x] Encode Fixed Decisions #2 (strategy A kit path), #14 (waves), #15 (router/config redirect)
- [x] Map `R0`–`R9` to SP1–SP8 and verification owners
- [x] Define strict-TDD RED/GREEN slices per wave
- [x] Pin exact verification commands for Phase 4/5
- [x] Define hybrid manual QA scenarios against Paper + rebuilt runtime
- [x] Complete Coverage / Approval gates for DRAFT readiness
- [x] Lock Phase 2 after audit pass (Phase 3 may begin only after lock)

## Audit Context

- Worktree: `D:\DEV\role-model\.worktrees\86-runtime-ui-rm3-design-system-frontend`
- Branch: `recursive/86-runtime-ui-rm3-design-system-frontend`
- Baseline commit: `b633056aa52252eaa40a7324ac7018b84d1ea0d9`
- Phase purpose: convert Phase 1 drift findings into a wave-ordered, file-concrete implementation plan before any Wave 1 product edits
- Package strategy A (fixed): kit lands at `role-model-router/packages/ui`, package name `@role-model/ui`
- Audit method: reread locked inputs; derive mandatory design-system-first sequencing; map each slice to tests, builds, validators, E2E, and hybrid QA; reconcile Fixed Decision #15 without inventing a Config artboard

## Effective Inputs Re-read

- `00-requirements.md` — `R0`–`R9`, inventory §A–§H, Fixed Decisions #1–#15, Verification Floor
- `00-worktree.md` — isolated worktree, baseline test/build PASS (361 tests), diff basis fields
- `01-as-is.md` — Linear DESIGN_SYSTEM live; no kit package; inset shell; `--rm-chart-*`; router-config still full page
- Paper authorities `4-0`/`5-0`/`6-0`/`7-0` on file `01KW9C35N2G5PZRS4SBJ5678Q6`
- Executor kit exports: `sidebar`, `page-shell`, `page-filters`, `segmented-control`, `metric-strip`, `chart*`, `observe-*`, `runtime-overview`, `use-prefers-reduced-motion`
- Current rebuilt-runtime paths confirmed in worktree: `runtime:validate-ui`, `start-for-qa.ts` (:3456 default), Playwright webServer (:3462)

## Planned Outcome

Run 86 will deliver:

- **`R0`** — Enforced wave order: Wave 1 contract files land before Wave 2 shared code; Wave 2 before Wave 3 pages; Wave 4 verification gates Phase 4/5
- **`R1`** — `DESIGN_SYSTEM.md` + `design-system.ts` (+ tests) + kit README scaffold rewritten to RM3 Paper/`--rm3-*` authority; Router catalog documents Config as redirect-only (not live nav segment)
- **`R2`** — Repo-owned `@role-model/ui` at `role-model-router/packages/ui`, ported from executor reference, workspace-buildable without executor checkout
- **`R3`** — Shared `--rm3-*` tokens/CSS, fullscreen AppShell, sidebar footer stack, PageShell/PageFilters/SegmentedControl/MetricStrip wired from kit; Linear `--linear-*`/`--rm-*` retired on migrated shared surfaces
- **`R4`** — Chart palette + composition rules 1–10 in shared primitives; `telemetry-chart-config.ts` maps to `--rm3-chart-*`; ChartCard/ChartGrid shared owners
- **`R5`** — Every inventory §B route migrated to cited Paper artboards; `/app/router/config` becomes legacy redirect → `/app/router/strategy` (Wave 3); detail/redirect routes per §C
- **`R6`** — FactCard/StatusPill/Linear purple/inset-shell drift removed on all touched surfaces
- **`R7`** — Live APIs, startup contracts (run 67), and truthful telemetry semantics preserved
- **`R8`** — Strict RED → GREEN → REFACTOR for every production slice; authority-test flips in Wave 1 before contract files go GREEN
- **`R9`** — Phase 5 hybrid QA on rebuilt runtime (not vite-only preview) with Paper visual sign-off

## Wave Summary

| Wave | Sub-phases | Primary deliverable |
| --- | --- | --- |
| Wave 1 — contract files | SP1 | RM3 `DESIGN_SYSTEM.md` + authority twins + kit README scaffold; **no** CSS/page JSX restyle |
| Wave 2 — shared DS code | SP2–SP5 | Kit port, tokens/theme, shell/primitives, charts |
| Wave 3 — page frontend | SP6–SP7 | Route-family migrations + router/config redirect |
| Wave 4 — verification prep | SP8 | Rebuilt-runtime command floor green before Phase 5 |

---

## Implementation Sub-phases

### `SP1` Wave 1 — RM3 contract files (no product UI restyle)

**Scope:** `R0`, `R1`, `R8` (authority twins only). Rewrite human + machine design-system contract to RM3. Scaffold kit README. Update route catalog metadata for Fixed Decision #15. **Explicitly exclude:** `app.css`, `theme.ts`, component JSX, route modules, `router-config.tsx` behavior change.

**Implementation checklist**

- [ ] `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md` — full RM3 rewrite citing Paper `4-0`/`5-0`/`6-0`/`7-0`, inventory §A–§H, `--rm3-*` token families, graph rules 1–10, shell footer rules, SegmentedControl IA, MetricStrip variants; mark Linear/Apple as historical; Router secondary nav = Overview · Strategy · Controller · Candidates · Decisions; `/app/router/config` documented as **redirect-only → `/app/router/strategy`**
- [ ] `role-model-router/apps/runtime-ui/app/lib/design-system.ts` — update theme/token metadata, shell constants (fullscreen, no `1840px` inset), chart token **names documented** as `--rm3-chart-*` in DESIGN_SYSTEM.md (keep live `chartColors` CSS var bindings on `--rm-chart-*` until SP3/SP5), Router route catalog: remove Config from live Router SegmentedControl set; add redirect-only metadata row if needed
- [ ] `role-model-router/apps/runtime-ui/app/lib/design-system.test.ts` — **RED first:** flip assertions from Linear/`--rm-*`/inset-shell/`routerConfigRoute` live-page expectations to RM3/fullscreen/redirect-only catalog; remove tests requiring Config provenance page content
- [ ] `role-model-router/packages/ui/README.md` — scaffold only: authority pointers to `DESIGN_SYSTEM.md` + Paper pages; export surface notes per §A; no component source yet
- [ ] `role-model-router/packages/ui/package.json` — stub manifest (`name: @role-model/ui`, `private: true`, `test` script placeholder) if needed for workspace registration without implementation
- [ ] **Do not touch:** `app/routes/router-config.tsx`, `app.css`, `app/components/**`, `theme.ts`

**Tests (exact commands)**

RED (before contract GREEN):
```bash
corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/lib/design-system.test.ts
```
Expect failures on RM3 assertions until production files updated.

GREEN (after contract files):
```bash
corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/lib/design-system.test.ts
corepack pnpm --filter @role-model-router/runtime-ui test
```

**Acceptance**

- Wave 1 files describe RM3 as live authority; Linear wording historical-only in active sections
- Machine twin + tests agree: no Config in live Router nav catalog; redirect documented
- No CSS, shell, primitive, or route JSX changed in this slice
- Phase 3 RED/GREEN evidence paths recorded under `evidence/logs/sp1-*`

**Rollback notes**

- Revert only `DESIGN_SYSTEM.md`, `design-system.ts`, `design-system.test.ts`, kit README stub; baseline tests return to Phase 0 green

---

### `SP2` Wave 2a — Port kit package into monorepo

**Scope:** `R2`, `R8`. Land `@role-model/ui` as first-class workspace package after Wave 1 contract exists.

**Implementation checklist**

- [ ] Create `role-model-router/packages/ui/` by copying from `C:\Users\erikb\code\executor\packages\role-model\ui\src/**` (+ executor tests)
- [ ] `role-model-router/packages/ui/package.json` — adapt: remove `catalog:` refs and `@executor-js/react`; set `react`/`react-dom` to `^19.2.0` (match runtime-ui); set `recharts` to `^2.15.4` (match runtime-ui, not executor 3.x); add `vitest`, `typescript`, `@types/react` devDeps from monorepo conventions
- [ ] `role-model-router/packages/ui/tsconfig.json` — standalone package TS config
- [ ] `role-model-router/packages/ui/src/index.ts` — export surface per §A (Sidebar, PageShell, PageFilters, SegmentedControl, MetricStrip, Chart*, Observe*, RuntimeOverview, usePrefersReducedMotion)
- [ ] `role-model-router/packages/ui/README.md` — finalize authority notes (Wave 1 scaffold → full contract)
- [ ] `role-model-router/apps/runtime-ui/package.json` — add `"@role-model/ui": "workspace:*"` dependency (consumption wiring completes in SP4; dependency may land here)
- [ ] Remove executor-only imports (`@executor-js/react`, bun playground refs) from ported sources
- [ ] Port kit tests: `chart*.test.ts`, `sidebar.test.ts`, `observe.test.ts`, `runtime-overview.test.ts`, `chart-composition.test.ts`, `chart-grid.test.ts`

**Tests (exact commands)**

RED (kit tests may fail until port/adaptation complete):
```bash
corepack pnpm --filter @role-model/ui test
```

GREEN:
```bash
corepack pnpm --filter @role-model/ui test
corepack pnpm --filter @role-model-router/runtime-ui test
```

**Acceptance**

- Kit builds and tests pass in repo alone; no executor checkout required
- Package registered under `role-model-router/packages/ui` as `@role-model/ui`
- README cites Paper + `DESIGN_SYSTEM.md` as authority

**Rollback notes**

- Remove `role-model-router/packages/ui/` directory and workspace dependency; lockfile revert if touched

---

### `SP3` Wave 2b — RM3 tokens, theme, CSS foundations

**Scope:** `R3`, `R6`, `R8`. Replace Linear/`--rm-*` live vocabulary with `--rm3-*` / `--rm3-light-*` on shared foundations.

**Implementation checklist**

- [ ] `role-model-router/apps/runtime-ui/app/app.css` — implement §H.2 token families (semantic chrome, sidebar, fonts, type scale, spacing, radii, chart ramps); semantic equivalence map retires `--linear-*`/`--rm-*` on migrated surfaces; Geist font faces (`--rm3-font-sans`, `--rm3-font-mono`, `--rm3-font-display`)
- [ ] `role-model-router/apps/runtime-ui/app/lib/theme.ts` — FOUC/bootstrap colors from RM3 foundations
- [ ] `role-model-router/apps/runtime-ui/app/lib/theme.test.ts` — RED then GREEN for RM3 browser chrome colors
- [ ] `role-model-router/apps/runtime-ui/app/root.tsx` — align meta theme-color and font loading to Geist/RM3
- [ ] `role-model-router/apps/runtime-ui/app/lib/design-system.ts` — token helper exports if any remain machine-readable here post-Wave 1
- [ ] Kit token CSS partials if kit ships co-located CSS variables (only if required by ported components)

**Tests (exact commands)**

```bash
corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/lib/theme.test.ts app/lib/design-system.test.ts
corepack pnpm --filter @role-model-router/runtime-ui test
corepack pnpm --filter @role-model-router/runtime-ui build
```

**Acceptance**

- Shared CSS exposes full §H.2 families; no Linear purple as live accent on foundations
- Theme tests GREEN; build passes
- Route JSX still untouched (Wave 3)

**Rollback notes**

- Revert `app.css`, `theme.ts`, `theme.test.ts`, `root.tsx` as a unit; shared surfaces fall back to Linear stack

---

### `SP4` Wave 2c — AppShell, sidebar footer, page chrome wiring

**Scope:** `R3`, `R6`, `R8`. Fullscreen shell + shared page chrome from kit.

**Implementation checklist**

- [ ] `role-model-router/apps/runtime-ui/app/components/app-shell.tsx` — fullscreen edge-to-edge (`h-screen`/`100dvh`); remove `max-w-[var(--rm-shell-width)]` inset; wire kit `Sidebar` + footer stack (Model inventory → Cache → Router endpoint) per `Map · Side-by-side · App shell`
- [ ] `role-model-router/apps/runtime-ui/app/components/theme-toggle.tsx` — 48px header strip, top-right per Shell parts
- [ ] `role-model-router/apps/runtime-ui/app/routes/app-layout.tsx` — consume kit `PageShell` / `Rm3PageShell` / `SubPageHeaderBar` / `PageContent`
- [ ] `role-model-router/apps/runtime-ui/app/components/telemetry-controls.tsx` — migrate to kit `PageFilters`, `SegmentedControl`, `FilterSelect`, `TimeRangeControl`
- [ ] `role-model-router/apps/runtime-ui/app/components/page-primitives.tsx` — retire happy-path `FactCard`/`StatusPill`/`StatCard` usage in shared exports; align SectionCard/PanelHeader/Badge/Table/Select-34px to kit or RM3 composites
- [ ] `role-model-router/apps/runtime-ui/app/components/themed-select.tsx` — 34px trigger height per Forms & controls
- [ ] `role-model-router/apps/runtime-ui/app/components/page-primitives.test.tsx` — RED/GREEN for RM3 primitive grammar

**Tests (exact commands)**

```bash
corepack pnpm --filter @role-model/ui test
corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/components/page-primitives.test.tsx
corepack pnpm --filter @role-model-router/runtime-ui test
corepack pnpm --filter @role-model-router/runtime-ui build
```

**Acceptance**

- Shell is fullscreen; sidebar footer present with reduced-motion-safe updates
- SegmentedControl/PageFilters/MetricStrip available as shared imports from `@role-model/ui`
- No route-family page restyle yet (except layout shell wrapping)

**Rollback notes**

- Revert shell + primitive files; keep Wave 1 contract + kit package if stable

---

### `SP5` Wave 2d — Chart primitives + telemetry chart config

**Scope:** `R4`, `R7`, `R8`. Shared chart layer before page chart consumers.

**Implementation checklist**

- [ ] `role-model-router/apps/runtime-ui/app/lib/telemetry-chart-config.ts` — map series colors to `--rm3-chart-*` / `--rm3-light-chart-*`; remove Linear purple (`link-blue` / `#5e6ad2`)
- [ ] `role-model-router/apps/runtime-ui/app/lib/telemetry-chart-config.test.ts` — RED/GREEN semantic token assertions
- [ ] `role-model-router/apps/runtime-ui/app/components/telemetry-charts.tsx` — wire kit ChartCard/ChartGrid/time-series/ranking/composition; enforce rules 1–10 (sentence-case titles, legends, Y gutters 40+6, plot inset 56, time axis 7 ticks, Y domain includes 0, solid grid, default height 192)
- [ ] `role-model-router/apps/runtime-ui/app/components/telemetry-charts.test.tsx` — RED/GREEN for palette + composition helpers
- [ ] Kit chart modules already ported in SP2; adjust only if runtime-ui adapter layer needed
- [ ] Optional: `docs/architecture/11-runtime-ui-telemetry-graph-matrix.md` — update chart ownership wording only if semantics change (prefer no semantic change)

**Tests (exact commands)**

```bash
corepack pnpm --filter @role-model/ui exec vitest run src/chart-composition.test.ts src/chart.test.ts src/chart-grid.test.ts
corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/lib/telemetry-chart-config.test.ts app/components/telemetry-charts.test.tsx app/lib/telemetry-analytics.test.ts
corepack pnpm --filter @role-model-router/runtime-ui test
```

**Acceptance**

- Charts use only §H.2/H.3 token families; Recharts remains engine
- Shared composition rules enforced in primitives, not per-route copies
- Wave 2 complete before any Wave 3 chart-bearing page slice

**Rollback notes**

- Revert chart config + telemetry-charts; pages still render with old charts until Wave 3

---

### `SP6` Wave 3a — Overview + Studio + Observe families

**Scope:** `R5`, `R6`, `R7`, `R8`. First page migrations after Waves 1–2 complete.

**Implementation checklist**

- [ ] `app/routes/dashboard.tsx` — `RM v3 · Runtime overview` / `RM v3 · Overview`; cross-check `7-0` Production Overview; MetricStrip + ChartGrid; Template · 12-col · default
- [ ] Studio routes (4+8 workspace grammar):
  - [ ] `workbench.tsx` — Studio Chat
  - [ ] `studio-images.tsx`, `studio-audio.tsx`, `studio-rerank.tsx`, `studio-advanced.tsx`
- [ ] Observe routes:
  - [ ] `requests.tsx`, `request-detail.tsx`
  - [ ] `observe-routing.tsx`, `observe-activity.tsx`, `observe-logs.tsx`
- [ ] Per-route: replace FactCard/StatusPill walls with MetricStrip/SectionCard/Badge; wire PageFilters/SegmentedControl; cite Paper artboard in Phase 3 evidence
- [ ] Route-level tests where behavior/layout contracts change (`index.test.tsx`, `request-detail.test.tsx`, view-model tests as needed)

**Tests (exact commands)**

```bash
corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/routes/index.test.tsx app/routes/request-detail.test.tsx app/lib/telemetry-route-models.test.ts app/lib/view-models.test.ts
corepack pnpm --filter @role-model-router/runtime-ui test
corepack pnpm --filter @role-model-router/runtime-ui build
```

**Acceptance**

- Overview + Studio + Observe match cited `4-0` light/dark specimens; live data preserved
- Phase 3 slice cites completed SP1–SP5 dependencies
- Purely visual gaps without unit assertions documented with compensating browser verification row (see Traceability)

**Rollback notes**

- Revert route batch independently; shared Wave 2 owners remain

---

### `SP7` Wave 3b — Local + Remote + Models + Router + Connect + System

**Scope:** `R5`, `R6`, `R7`, `R8`, Fixed Decision #15.

**Implementation checklist**

- [ ] Local family:
  - [ ] `local-choose.tsx`, `local-peers.tsx`, `local-peer-models.tsx`
  - [ ] `local-llama-swap-models.tsx`, `local-swap.tsx`, `local-policy.tsx`, `local-logs.tsx`
  - [ ] `local-matrix.tsx` — keep stub redirect to models `?view=grid` (no invented matrix)
  - [ ] `local-models.tsx` — keep redirect to choose
- [ ] Remote: `providers.tsx` — Connections CardStack IA **C**; OAuth overlays per Overlays & menus
- [ ] Models: `control-models.tsx`, `control-roles.tsx`, `control-benchmark.tsx`
- [ ] Router:
  - [ ] `router.tsx`, `control-routing-strategy.tsx`, `control-controller.tsx`, `router-candidates.tsx`, `router-decisions.tsx`, `router-decision-detail.tsx`
  - [ ] **`router-config.tsx` → legacy redirect → `/app/router/strategy`** (reuse `Navigate` pattern from `legacy-redirect.tsx` or inline equivalent)
  - [ ] `app/routes.ts` — keep route entry but module becomes redirect
  - [ ] `design-system.ts` / tests — Config redirect-only, not live SegmentedControl segment
- [ ] Connect: `endpoints.tsx`, `integrations-downstream.tsx`, `integrations-upstream.tsx`
- [ ] System: `runtime.tsx`, `session-readiness.tsx`, `control-runtime-config.tsx`, `system-peers.tsx`, `extensions.tsx`, `storage-retention.tsx`
- [ ] Secondary: `not-found.tsx` — RM3 empty/error grammar; legacy redirects unchanged
- [ ] Device/setup modals: `device-authorization-*.tsx`, `llama-swap-setup-*.tsx` — RM3 overlays without FactCard walls

**Tests (exact commands)**

RED (router-config redirect — update tests that currently forbid `Navigate`):
```bash
corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/lib/design-system.test.ts
```

GREEN (full suite):
```bash
corepack pnpm --filter @role-model-router/runtime-ui exec vitest run app/lib/router-candidate-labels.test.ts app/lib/runtime-api.test.ts
corepack pnpm --filter @role-model-router/runtime-ui test
corepack pnpm --filter @role-model-router/runtime-ui build
```

**Acceptance**

- All §B routes migrated; §C redirects/detail routes handled
- `/app/router/config` redirects; old deep links do not 404
- Runtime config editing remains at `/app/system/runtime-config`
- No Explore/Catalog Shell routes shipped (§F)

**Rollback notes**

- Router redirect reversible independently; preserve Strategy/Controller page migrations if stable

---

### `SP8` Wave 4 prep — Rebuilt-runtime verification floor

**Scope:** `R7`, `R9`, `R8` regression floor before Phase 5 manual QA.

**Implementation checklist**

- [ ] Run full verification floor (commands below) from worktree root
- [ ] Record evidence logs under `/.recursive/run/86-runtime-ui-rm3-design-system-frontend/evidence/logs/`
- [ ] Fix any regressions in startup/bootstrap tests (`startup-bootstrap-regression.test.ts`) without weakening run 67 contracts
- [ ] Update/extend Playwright specs if shell/nav changed:
  - [ ] `e2e/runtime-shell.spec.ts`
  - [ ] `e2e/shared-surface-regression.spec.ts`
- [ ] Confirm `runtime:validate-ui` packaging path serves built client

**Tests (exact commands — mandatory floor)**

```bash
corepack pnpm --filter @role-model/ui test
corepack pnpm --filter @role-model-router/runtime-ui test
corepack pnpm --filter @role-model-router/runtime-ui build
corepack pnpm run runtime:validate-ui
corepack pnpm --filter @role-model-router/runtime-host-bridge exec tsx scripts/start-for-qa.ts
# Manual smoke: rebuilt UI at http://127.0.0.1:3456 after build; Ctrl+C when done
corepack pnpm --filter @role-model-router/runtime-ui run test:browser
# Playwright: builds UI, start-for-qa on :3462 per playwright.config.ts
```

**Acceptance**

- All commands PASS (or documented scoped exception with addendum)
- Phase 4 can cite same command set with log paths
- Phase 5 browser evidence may begin only after this floor is green

**Rollback notes**

- If `runtime:validate-ui` fails, fix packaging before Phase 5; do not substitute vite-only preview

---

## Verification Command Reference

| When | Command | Owner |
| --- | --- | --- |
| After SP2 | `corepack pnpm --filter @role-model/ui test` | kit unit |
| Every SP | `corepack pnpm --filter @role-model-router/runtime-ui test` | runtime-ui unit |
| SP3+ | `corepack pnpm --filter @role-model-router/runtime-ui build` | build |
| SP8 / Phase 4 | `corepack pnpm run runtime:validate-ui` | packaging validator |
| SP8 / Phase 5 prep | `corepack pnpm --filter @role-model-router/runtime-host-bridge exec tsx scripts/start-for-qa.ts` | rebuilt runtime (:3456) |
| SP8 / Phase 5 | `corepack pnpm --filter @role-model-router/runtime-ui run test:browser` | Playwright E2E (:3462) |

Focused RED/GREEN runs: `corepack pnpm --filter @role-model-router/runtime-ui exec vitest run <path>` for each touched test file.

---

## Traceability

| Requirement | Sub-phases | Primary validation owner |
| --- | --- | --- |
| `R0` | SP1→SP8 ordering | Phase 3 commit/slice receipts + wave gate checks |
| `R1` | SP1 | `design-system.test.ts`; doc assertions |
| `R2` | SP2 | `@role-model/ui test`; workspace build |
| `R3` | SP3, SP4 | `theme.test.ts`, `page-primitives.test.tsx`, build, browser shell QA |
| `R4` | SP5 | `telemetry-chart-config.test.ts`, `telemetry-charts.test.tsx`, kit chart tests |
| `R5` | SP6, SP7 | route tests + hybrid manual QA per family |
| `R6` | SP3–SP7 | unit tests + visual QA drift checklist |
| `R7` | SP5–SP8 | `telemetry-analytics.test.ts`, `runtime-api.test.ts`, startup regression, functional QA |
| `R8` | All SPs | RED/GREEN logs per slice; E2E in SP8 |
| `R9` | SP8 + Phase 5 | `runtime:validate-ui`, `start-for-qa`, `test:browser`, hybrid sign-off |

**Compensating verification (purely visual routes without new unit assertions)**

| Surface | Reason | Compensating owner |
| --- | --- | --- |
| Light/dark visual parity per §B route | Paper fidelity is visual | Hybrid manual QA + screenshot evidence |
| Sidebar footer live-update motion | Motion hard to unit-test | Playwright + manual reduced-motion check |
| Chart plot spacing vs Paper | Pixel-perfect gutters | Manual QA on Overview + one Observe chart page |

---

## Manual QA Scenarios (Phase 5 — hybrid)

Execute **only after** SP8 floor green and UI rebuilt via `runtime:validate-ui` + `start-for-qa` (not vite dev alone).

1. **Shell chrome** — Overview light/dark: fullscreen shell, no outer canvas; 48px header; theme toggle top-right; sidebar footer stack (inventory → cache bar → router endpoint) matches `RM v3 · App shell` / Runtime overview specimens
2. **Overview charts** — `dashboard.tsx` vs `RM v3 · Runtime overview` + `7-0` Production Overview: Recharts render; `--rm3-chart-*` colors; legends; time axis; sentence-case titles
3. **SegmentedControl IA** — Router family: secondary nav shows Overview · Strategy · Controller · Candidates · Decisions only (no Config); Studio page nav uses SegmentedControl not Tabs
4. **Router config redirect (Fixed Decision #15)** — Navigate to `/app/router/config` → lands on `/app/router/strategy`; no 404; no Config segment in nav
5. **One ledger/detail page** — `router-decision-detail.tsx` or `request-detail.tsx`: typography, CodeBlock, disclosure within Decisions/Requests visual language
6. **One config-heavy page** — `control-runtime-config.tsx` vs `RM v3 · System Config`: forms/selects 34px; no FactCard walls
7. **Remote Providers** — CardStack IA variant C; OAuth overlay if exercisable in QA seed
8. **Functional regression** — navigation, filters, time range, theme toggle, form submit/selection, page transitions on changed surfaces still work with live QA data
9. **Paper visual sign-off** — human compares light/dark for each migrated §B family against Paper `4-0`/`5-0`/`7-0`; record `Approved by` + `Date` in `05-manual-qa.md`

---

## Idempotence and Recovery

- **Centralize tokens** in `app.css` + kit exports so route edits do not reintroduce hex literals
- **Wave gates are hard** — if a Wave 3 slice lands before its Wave 2 owner, revert the page slice and re-enter through RED, not route-local CSS overrides
- **Kit port is repo-owned** — never reintroduce executor workspace dependency for production builds
- **Router redirect is idempotent** — `/app/router/config` always 302/Navigate to strategy; bookmark-safe
- **Chart semantics frozen** — styling changes must not alter telemetry series meaning or API call patterns
- **Recovery per SP** — each sub-phase lists rollback scope; prefer reverting the latest SP batch over bypassing shared owners
- **Geist fonts** — if not already vendored, add once in SP3; do not duplicate per route

---

## Worktree Diff Audit

- Baseline type: `local commit`
- Baseline reference: `b633056aa52252eaa40a7324ac7018b84d1ea0d9`
- Comparison reference: `working-tree`
- Normalized baseline: `b633056aa52252eaa40a7324ac7018b84d1ea0d9`
- Normalized comparison: `working-tree`
- Normalized diff command: `git diff --name-only b633056aa52252eaa40a7324ac7018b84d1ea0d9`
- Base branch: `dev`
- Worktree branch: `recursive/86-runtime-ui-rm3-design-system-frontend`
- Worktree path: `D:\DEV\role-model\.worktrees\86-runtime-ui-rm3-design-system-frontend`
- Phase 2 planned product paths (Phase 3 ownership):
  - Wave 1: `DESIGN_SYSTEM.md`, `design-system.ts`, `design-system.test.ts`, `packages/ui/README.md`
  - Wave 2: `packages/ui/**`, `app.css`, `theme.ts`, `app/components/**`, `telemetry-chart-config.ts`
  - Wave 3: `app/routes/**`, `app/routes.ts`
- Phase 2 artifact-only diff expected now; no product code until Phase 3 SP1

---

## Source Requirement Inventory

| Requirement | Source (00-requirements) | Phase 2 plan surface |
| --- | --- | --- |
| `R0` | Design-system-first wave sequencing | Wave summary; SP1–SP8 gates |
| `R1` | Rewrite DESIGN_SYSTEM files (Wave 1) | SP1 |
| `R2` | Port repo-owned kit (strategy A) | SP2; `@role-model/ui` at `role-model-router/packages/ui` |
| `R3` | Shared tokens/shell/primitives (Wave 2) | SP3, SP4 |
| `R4` | Chart palette + composition rules | SP5 |
| `R5` | Migrate §B/§C routes (Wave 3) | SP6, SP7; Fixed Decision #15 in SP7 |
| `R6` | Remove legacy visual drift | SP3–SP7 |
| `R7` | Preserve truth/startup/telemetry | SP5–SP8; no fake telemetry |
| `R8` | Strict TDD | RED/GREEN per SP; authority tests first in SP1 |
| `R9` | Rebuilt-runtime hybrid QA | SP8 commands; Manual QA scenarios |

Fixed decisions encoded: #2 kit path `@role-model/ui`; #14 waves; #15 config redirect in SP7 (catalog/docs in SP1).

---

## Requirement Completion Status

| Requirement | Status | Changed Files (planned) | Implementation Evidence | Verification Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| `R0` | `planned` | — | — | — | Wave order enforced in SP1–SP8 |
| `R1` | `planned` | `DESIGN_SYSTEM.md`, `design-system.ts`, `design-system.test.ts`, `packages/ui/README.md` | — | — | SP1; no CSS/page JSX |
| `R2` | `planned` | `role-model-router/packages/ui/**` | — | — | SP2 |
| `R3` | `planned` | `app.css`, `theme.ts`, `app/components/app-shell.tsx`, `page-primitives.tsx`, `telemetry-controls.tsx`, kit wiring | — | — | SP3–SP4 |
| `R4` | `planned` | `telemetry-chart-config.ts`, `telemetry-charts.tsx`, kit chart modules | — | — | SP5 |
| `R5` | `planned` | `app/routes/**`, `router-config.tsx`, `routes.ts` | — | — | SP6–SP7 |
| `R6` | `planned` | touched components/routes above | — | — | Continuous SP3–SP7 |
| `R7` | `planned` | route view-models preserved | — | — | Guard in SP5–SP8 |
| `R8` | `planned` | all test files listed per SP | — | — | Strict RED→GREEN |
| `R9` | `planned` | — | — | — | SP8 + Phase 5 hybrid QA |

Disposition `planned` = Phase 2 scope only; Phase 3 will track `implemented` / `verified`.

---

## Earlier Phase Reconciliation

- AS-IS confirms Wave 1 must precede kit port: DESIGN_SYSTEM still Linear; no `@role-model/ui` in workspace
- AS-IS router-config conflict resolved by Fixed Decision #15: SP1 updates catalog/docs; SP7 implements redirect
- Phase 0 baseline green (361 tests) — Wave 1 RED will intentionally fail until RM3 contract lands
- Run 60 pattern adopted for audit blocks, verification floor, and hybrid QA; superseded visually by RM3 Paper authorities

---

## Subagent Contribution Verification

- Reviewed Action Records: none for Phase 2
- Main-Agent Verification Performed: cross-checked executor kit file list, runtime-ui package versions, Playwright/start-for-qa ports, design-system.test.ts router-config assertions
- Acceptance Decision: `not applicable` (planning phase)
- Repair Performed After Verification: none

---

## Gaps Found

- none blocking Phase 2 DRAFT; Geist font vendoring path to be confirmed during SP3 implementation

---

## Audit Verdict

Audit: PASS

---

## Coverage Gate

- [x] Effective inputs re-read (requirements, worktree, AS-IS, Paper authorities, executor kit)
- [x] Every `R0`–`R9` mapped to SP1–SP8 and verification owners
- [x] Fixed Decisions #2, #14, #15 encoded
- [x] Strict TDD and hybrid QA modes declared with exact commands
- [x] Wave 1 explicitly excludes CSS/page JSX; router-config deferred to SP7
- [x] Out-of-scope confirmed: no Paper editing; no executor production dependency; no Config artboard

Coverage: PASS

---

## Approval Gate

- [x] Implementation order is concrete and design-system-first (files → kit → pages → verify)
- [x] Kit path/name finalized: `role-model-router/packages/ui` / `@role-model/ui`
- [x] Rebuilt-runtime validation path pinned for Phase 4/5
- [x] Traceability and Requirement Completion Status tables complete
- [x] No unresolved in-scope planning gaps

Approval: PASS
LockHash: `5316239e9b37a47305e092b0d6a0ce4f8bd4bc0b0e9e640642c3a2e64fb4ed2c`
