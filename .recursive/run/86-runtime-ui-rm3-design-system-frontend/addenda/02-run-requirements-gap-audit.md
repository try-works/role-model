# Addenda 02 · Run-requirements gap audit + todos

Run: `/.recursive/run/86-runtime-ui-rm3-design-system-frontend/`
Phase: `03 Implementation Summary` (stage-local)
Status: `LOCKED`
LockedAt: `2026-07-31T22:56:04Z`
LockHash: `9c4481833d45b82de6671819de2eb39bb41153e213afa9fda49315f4dd3d52c5`

**Against:** locked `00-requirements.md` (R0–R9) · `02-to-be-plan.md` (SP1–SP8) · Fixed Decisions #1–#15  
**Not a substitute for:** Paper 5-0 page IA addenda (`01-paper-5-0-implementation-audit.md`)  
**Updated:** 2026-07-31 09:40 UTC+8  
**Method:** Code/grep audit of worktree vs R0–R9 + SP checklists; SP8 evidence logs reviewed.  
**Code batch:** G1–G8, G10, G15–G17 implemented; focused vitest green.  
**Receipts:** Phase 3–5 closeout in progress.

---

## Executive verdict

| Layer | Status |
|-------|--------|
| Wave 1 contract (R1 / SP1) | **Done** — RM3 `DESIGN_SYSTEM.md` + twins; Config redirect-only in catalog |
| Wave 2 kit (R2 / SP2) | **Done** — `@role-model/ui` at `role-model-router/packages/ui` |
| Wave 2 shell (R3 / SP4) | **Done** — fullscreen + kit Sidebar; 34px fields; Linear block collapsed to thin stubs (G6) |
| Wave 2 charts (R4 / SP5) | **Mostly done** — overview/observe on kit; analytics `--rm3-chart-*`; legacy charts StatusPill-free |
| Wave 3 pages (R5) | **Done (IA)** — Paper 5-0 addenda; Config → strategy redirect; StatusPill→Badge (G8) |
| Wave 4 floor (SP8) | **Done (logs)** — kit/runtime tests, build, validate-ui, Playwright green |
| Phase 3–5 receipts (R8 / R9) | **DRAFT** — `03`/`04`/`05`; Phase 5 **agent PASS** on `:3470`; human Paper sign-off pending |
| Control plane | **Partial** — DECISIONS run-86 DRAFT section + STATE note; full LOCK at Phase 6/7 |

---

## Requirement scorecard

| ID | Status | Notes |
|----|--------|-------|
| R0 | Partial | Waves executed; DRAFT `03`/`04` prove gates until LOCK + Phase 5 |
| R1 | Done | RM3 contract live; Linear historical |
| R2 | Done | Kit ported + workspace dep |
| R3 | Done | SegmentedControl + 34px; `--rm-*` → RM3; Linear thin stubs only |
| R4 | Mostly done | Kit charts + `--rm3-chart-*` analytics; legacy module retained for tests only |
| R5 | Done (IA) | §B families + #15 redirect; Badge on status chips (G8) |
| R6 | Done | Dead `--linear-*` vocabulary removed; accent/radius/space no longer Linear-backed |
| R7 | Done | SP8 suite green; startup contracts preserved |
| R8 | Partial | SP8 GREEN; DRAFT receipts; incomplete per-slice RED archive |
| R9 | Partial | Phase 5 agent PASS on rebuilt `:3470`; human Paper sign-off pending |

---

## Gaps & todos

### High — implement now (code)

| ID | Gap | Req / SP | Todo | Owner file(s) |
|----|-----|----------|------|----------------|
| **G1** | `TelemetryTimeRangeControl` is custom primary-pill buttons, not kit `SegmentedControl` | R3 · SP4 | **Fixed** — kit `SegmentedControl` | `app/components/telemetry-controls.tsx` |
| **G2** | `themed-select` trigger `min-h-[44px]` vs DS Forms `34px` | R3 · SP4 | **Fixed** — `h-[34px]` | `app/components/themed-select.tsx` |
| **G3** | `telemetry-analytics.ts` series colors use `--rm-chart-*` | R4 · SP5 | **Fixed** — `--rm3-chart-*` | `app/lib/telemetry-analytics.ts` (+ `.test.ts`) |
| **G4** | Nav item radius uses `--linear-radius-8` | R6 | **Fixed** — `--rm3-radius-lg` | `app/lib/design-system.ts` |
| **G5** | `--linear-accent-primary: #5e6ad2` still defined | R6 · FD#9 | **Fixed** — aliases to RM3 primary/grayscale | `app/app.css` |

### Med — follow-up

| ID | Gap | Req / SP | Todo |
|----|-----|----------|------|
| **G6** | Transitional `--rm-*` / `--linear-*` alias layer still large | R3 · R6 | **Fixed** — dead Linear block removed; `--rm-*` geometry → RM3/literals; thin `--linear-bg-canvas` / accent stubs only; field/icon **34px** |
| **G7** | Legacy `telemetry-charts.tsx` unused by routes but still tested | R4 · SP5 | **Fixed** — StatusPill removed; neutral `TelemetryChartStateBadge`; delete module later if desired |
| **G8** | `StatusPill` imported in ~28 routes | R5 · R6 · FD#4 | **Fixed** — all route/component call sites use kit `Badge`; `StatusPill` deprecated alias only |
| **G9** | `app-layout` uses custom `AppShell` only (not kit `PageShell`) | R3 · SP4 | Optional: wrap with kit PageShell — **defer** if `AppShell` already embeds kit Sidebar + PageContent |
| **G10** | Native `fieldClassName` / `selectFieldClassName` still >34px | R3 | **Fixed** — `min-h`/`h` **34px** + design-system tests |

### High — process / receipts (not product JSX)

| ID | Gap | Req | Todo |
|----|-----|-----|------|
| **G11** | Missing `03-implementation-summary.md` | R0 · R8 | **DRAFT written** — LOCK after Phase 5 |
| **G12** | Missing `04-test-summary.md` | R7 · SP8 | **DRAFT written** — cites SP8 + gap-fix tests |
| **G13** | Missing `05-manual-qa.md` | R9 | **Agent PASS** — rebuilt `:3470` + screenshots; **human sign-off pending** |
| **G14** | `STATE.md` / `DECISIONS.md` not updated | R1 | **Partial** — run-86 DECISIONS DRAFT + STATE note; LOCK at Phase 6/7 |

### Low

| ID | Gap | Todo |
|----|-----|------|
| **G15** | `--rm-shell-width: 1840px` retained (unused by shell) | **Fixed** — removed |
| **G16** | Stale narrative in Paper addenda §2 Studio verdicts | Sync Fixed status text | **Fixed** — Studio/Choose verdicts + cross-cutting notes synced |
| **G17** | Candidate-space chart fallback `var(--rm-chart-link-blue)` | **Fixed** — `--rm3-chart-1` |

---

## Explicitly out of this addenda’s code batch

- Optional full TSX rewrite of `var(--rm-*)` → `var(--rm3-*)` at every call site — deferred; `--rm-*` now aliases RM3 without Linear
- Phase 5 human Paper sign-off execution (G13) — needs rebuilt runtime + operator
- Paper editing (OOS per requirements)

---

## Implementation batch (this addenda)

| Todo | Status |
|------|--------|
| G1 TelemetryTimeRange → SegmentedControl | **Fixed** |
| G2 themed-select 34px | **Fixed** |
| G3 analytics → `--rm3-chart-*` | **Fixed** |
| G4 nav radius → `--rm3-radius-lg` | **Fixed** |
| G5 Linear purple → RM3 primary alias | **Fixed** |
| G6 Linear block collapse + RM3 geometry | **Fixed** |
| G7 legacy telemetry-charts StatusPill | **Fixed** |
| G8 StatusPill → Badge (all routes) | **Fixed** |
| G10 field/select 34px | **Fixed** |
| G11 DRAFT `03-implementation-summary.md` | **Fixed** |
| G12 DRAFT `04-test-summary.md` | **Fixed** |
| G13 DRAFT `05-manual-qa.md` | **Fixed** (execution pending) |
| G15 remove unused `--rm-shell-width` | **Fixed** |
| G16 Paper addenda Studio verdict sync | **Fixed** |
| G17 candidate-space chart tokens | **Fixed** |
| Update tests for gap batch | **Fixed** — design-system + theme green |

**Still open:** G13 **human Paper sign-off** · G14 Phase 6/7 LOCK.

**Closed this pass (2026-08-01):** G9 AppShell kit chrome (no separate PageShell wrap required) · Local Matrix Navigate stub · Studio Chat/Advanced models-only startup addenda/03 · legacy `telemetry-charts` deprecated for routes.

**Shell/Overview visual batch (2026-07-31):** Fixed broken Tailwind `@source` path (kit classes were never emitted — primary cause of flat/black “token failure”); AppShell → `SubPageHeaderBar` icon toggle; overview Candidate caption dedupe + ChartCardPlot; Geist font preloads.

**Theme wiring (2026-07-31 12:10):** `@custom-variant dark` → `data-theme`; `html.dark` class sync; chart THEMES → `[data-theme]`; Observe state panels off Tailwind `amber-*` onto `--rm-warning-*`; `--rm-chart-tokens` → throughput (was anomaly red).

---

## Evidence already green (do not re-open)

- Kit package + 24 kit tests (`evidence/logs/sp8-kit-test.log`)
- runtime-ui unit suite (`sp8-runtime-ui-test.log`)
- build + `runtime:validate-ui` + Playwright (`sp8-*`)
- Paper 5-0 High/Med page IA (`addenda/01-…`)
- `/app/router/config` → `/app/router/strategy` (Fixed Decision #15)
- DRAFT receipts: `03-implementation-summary.md`, `04-test-summary.md`, `05-manual-qa.md`
