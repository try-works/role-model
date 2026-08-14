Run: `/.recursive/run/86-runtime-ui-rm3-design-system-frontend/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-07-30T13:03:18Z`
LockHash: `ceaec347c5a39c239e39efeb1ff321cacf219d9993686857e974b1beb46fe03d`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- User request (2026-07-30): create a recursive-mode run requirement on `dev` for implementing the new RM v3 design system and frontend in the router runtime; create the run folder and requirements doc
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/patterns/git-push-merge-workflow.md`
- `/.recursive/run/60-runtime-ui-paper-linear-review-alignment/00-requirements.md`
- `/.recursive/run/48-runtime-ui-design-system-apple-theme/00-requirements.md`
- `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
- Paper file: `https://app.paper.design/file/01KW9C35N2G5PZRS4SBJ5678Q6`
  - DS page `4-0` · role-model v3 design system
  - runtime specimens page `5-0`
  - grid templates page `6-0`
- External reference kit (sibling workspace, not yet in this repo): `@role-model/ui` in executor `packages/role-model/ui`
- External serialized contract reference: executor `design.md` (RM3 sections)
Outputs:
- `/.recursive/run/86-runtime-ui-rm3-design-system-frontend/00-requirements.md`
Scope note: This document defines the recursive-mode requirements for migrating the router runtime UI from the current Paper Linear review / `--rm-*` contract to the approved RM v3 design system and page compositions, then shipping that frontend through the live `runtime-ui` operator shell on branch lineage from `dev`.

## TODO

- [x] Read recursive-mode / recursive-spec skills
- [x] Read `STATE.md`, `DECISIONS.md`, `MEMORY.md`
- [x] Confirm work starts from `dev`
- [x] Inventory current runtime-ui design authority and prior Paper-alignment run
- [x] Draft stable `R#` / `OOS#` with observable acceptance criteria
- [x] Select package/adoption strategy **A** (port kit into this monorepo)
- [x] User authorized creating the run folder and requirements doc
- [x] `recursive-init` + write `00-requirements.md`
- [x] Expand requirements with exhaustive page/component ↔ Paper artboard inventory
- [x] Expand requirements with RM3 theme tokens / Graph palette / map-rule contract (**§H**)
- [x] Expand strict TDD (`R8`) + Phase 5 rebuilt-runtime hybrid QA (`R9`) + Verification Floor
- [x] Audit + fix: files-before-code waves; R1/R2 swap; extensibility; verifiability gaps
- [x] Resolve `/app/router/config` gap: Fixed Decision #15 redirect → Strategy; OOS9 no invented Config artboard
- [x] Lock Phase 0 requirements (user authorized implement-in-worktree)

Note: `00-worktree.md` isolation is a separate Phase 0 artifact and is completed next.

## Run Metadata

- Priority: `P0`
- Run type: frontend design-system + route-alignment migration
- Primary subsystem: `role-model-router/apps/runtime-ui/**`
- Secondary package surface: repo-owned RM3 UI kit package ported into this monorepo (exact path finalized in Phase 1/2; preferred names `@role-model/ui` under `role-model-router/packages/ui` or `packages/role-model-ui`)
- Branch baseline: `origin/dev` (short-lived `recursive/86-runtime-ui-rm3-design-system-frontend` worktree from `dev`; PR back to `dev`)
- User-visible outcome:
  - the shipped runtime operator UI matches the approved RM v3 Paper design system and page specimens (fullscreen shell, shared chrome, page compositions, charts, filters, metric strips) while remaining live-data-driven
- Main risk themes:
  - frontend/page restyles ahead of design-system **files** (Wave 1) or shared owners (Wave 2)
  - inventing FactCard / StatusPill chrome that RM3 retired
  - treating Linear/Apple-era `DESIGN_SYSTEM.md` wording as still-current authority
  - importing executor package boundaries incorrectly instead of adopting a repo-owned kit
  - Phase 5 QA against vite/mock preview instead of rebuilt runtime

## Relevant Prior Runs

| Run | Why it matters |
| --- | --- |
| `60-runtime-ui-paper-linear-review-alignment` | last major Paper-driven DS + page parity pass; establishes design-system-first sequencing, rebuilt-runtime browser QA, and Recharts chart rules this run supersedes with RM3 |
| `48-runtime-ui-design-system-apple-theme` | historical Apple theme authority; must remain historical only |
| `49-runtime-telemetry-analytics-charts` / `53-...` / `59-...` | telemetry/chart and Observe surfaces that must keep truthful data semantics while restyling to RM3 |
| `67-runtime-ui-route-startup-performance-hardening` | startup/data-loading contracts that must not regress during the visual migration |

## Source Requirement Inventory

| Source | Contribution |
| --- | --- |
| User request 2026-07-30 | create recursive-mode requirements for implementing the new DS + frontend in router runtime; place the run on `dev`; create the run folder and requirements doc |
| Paper DS `4-0` | canonical RM3 tokens, primitives, composites, shell rules, chart/page-shell/filters/metric-strip/segmented-control grammar |
| Paper runtime `5-0` | approved light/dark page specimens for Overview, Studio, Local, Remote, Models, Router, Observe, Connect, System |
| Paper grid `6-0` | 8/9/12/16/18/24 column templates; default 12-col track |
| Current `DESIGN_SYSTEM.md` | live Linear-era contract that this run must replace/supersede as active authority |
| Current `runtime-ui` components/routes | implementation consumers that must migrate to RM3 shell/primitives/page compositions |
| External `@role-model/ui` + executor `design.md` | reference production kit and serialized RM3 contract used to author Paper; **port into this monorepo** (strategy A) |

## Paper / Contract Authority

1. Active visual authority is the Paper file `01KW9C35N2G5PZRS4SBJ5678Q6`:
   - design system: page `4-0`
   - runtime pages: page `5-0`
   - grid templates: page `6-0`
   - production Overview cross-check: page `7-0`
   - **file-level design tokens** in Paper (`--rm3-*`, `--rm3-light-*`, fonts, type scale, spacing, radii) — these are part of the DS contract, not optional decoration
2. Repo-owned active contract after this run is an updated `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md` plus the ported kit package contract. Linear/Apple wording is historical only.
3. External executor `design.md` / `@role-model/ui` are reference inputs for Phase 1/2 translation and the port source. They are not a second live authority that can override Paper or the repo-owned contract once this run’s kit + `DESIGN_SYSTEM.md` are updated.
4. This run is repo implementation work. Paper editing is out of scope unless a later approved addendum says otherwise.
5. Anti-drift: for charts, production Recharts behavior is SoT once implemented; Paper SVG plots are visual reference only.
6. Token/foundation/graph rules in inventory **§H** are mandatory shared contract — route pages must consume them, not re-mint colors/type/spacing.

## Design-System-First Rule

Mandatory order — **design-system files before frontend implementation code**. The run is invalid if route pages or shared UI components are restyled before the repo-owned design-system contract files exist for those styles.

### Wave 1 — Design-system files (contract first; no page UI restyle)

1. Read Paper DS `4-0` (+ `6-0` grid rules, file-level `--rm3-*` tokens, maps in **§H**).
2. Rewrite repo design-system **files** to the RM3 contract **before** changing product UI:
   - `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md` (primary human contract)
   - machine-readable twins that encode the live authority (`app/lib/design-system.ts` + tests, and theme token metadata as applicable)
   - kit package contract docs (package `README` / export surface notes) when the package is scaffolded
3. Wave 1 output must cite Paper artboards / **§H** token families. Do **not** migrate route JSX or invent route-local RM3 styling in this wave.

### Wave 2 — Design-system implementation in shared frontend code

4. Port/land the repo-owned RM3 kit package (strategy A) implementing Wave 1.
5. Land shared tokens/CSS, shell, primitives, PageFilters, SegmentedControl, MetricStrip, chart primitives; wire `runtime-ui` to the in-repo kit.
6. No route-family page restyle may land without the shared owner from Wave 2 already present (or landing in the same slice as its shared owner).

### Wave 3 — Frontend page implementation

7. Only then migrate route families against Paper `5-0` / DS page artboards (**§B**/**§C**).
8. Do not land route-local RM3 styling ahead of the shared contract/primitives that should own it.

### Wave 4 — Verification

9. Strict TDD across Waves 2–3 (`R8`). Phase 4/5 rebuilt-runtime hybrid QA (`R9`).

Dependency summary: **Paper → DESIGN_SYSTEM files (Wave 1) → kit + shared code (Wave 2) → pages (Wave 3) → rebuilt-runtime QA (Wave 4)**.

## Fixed Decisions

1. Branch lineage: implement from `dev` via `recursive/86-runtime-ui-rm3-design-system-frontend`; PR to `dev`.
2. **Package strategy A:** port/adopt the RM3 kit into this monorepo as a first-class package, then migrate `runtime-ui` to consume it. Do not leave production builds dependent on a live executor checkout.
3. Themes remain Light/Dark only.
4. Happy-path specimens omit FactCard / StatusPill walls; use MetricStrip, SectionCard + PanelHeader, Badge, Button, Table, Select `34px`, SegmentedControl.
5. App shell is fullscreen edge-to-edge: no empty canvas outside Sidebar + main.
6. Theme toggle lives in the 48px page header strip (top-right), not the sidebar.
7. Secondary page nav uses SegmentedControl (not Tabs `line` / primary pills / bare text).
8. Charts follow RM3 composition rules (sentence-case titles, legends, Y gutters, time axis, chart semantic tokens / repo equivalents, ChartCard shell) from `RM v3 · Graph palette` + `Map · Side-by-side · Graphs`.
9. UI chrome is near-neutral grayscale; the only non-chart brand-independent accent in chrome is **destructive** red. Chart color is the documented exception (`--rm3-chart-*` / `--rm3-light-chart-*` only — never Linear purple / ad hoc hex on plots or chrome).
10. Typography is Geist + Geist Mono (`--rm3-font-sans` / `--rm3-font-mono` / `--rm3-font-display`); do not keep Inter / IBM Plex Mono / Linear type stacks as active authority.
11. Live runtime data contracts and route IA remain unless Phase 1 records a bounded frontend-structure exception required for Paper parity — **except** Fixed Decision #15 (`/app/router/config` retirement), which is already decided here.
12. **TDD Mode: `strict`** — RED → GREEN → REFACTOR for every production slice; see `R8`.
13. **Phase 5 QA Execution Mode: `hybrid`** — browser evidence only after **rebuilt runtime** build/start; human visual sign-off against Paper; see `R9`.
14. **Implementation waves:** Wave 1 design-system **files** → Wave 2 shared DS **code** → Wave 3 page frontend → Wave 4 verification. See Design-System-First Rule.
15. **`/app/router/config` is retired from the RM3 Router IA.** Paper Router SegmentedControl is only Overview · Routing Strategy · Controller · Candidates · Decisions (`RM v3 · Router *` on `4-0`). Convert `/app/router/config` to a **legacy redirect → `/app/router/strategy`**; remove Config from Router secondary nav / route catalog; do **not** invent a Paper Config artboard. Runtime config JSON editing remains `/app/system/runtime-config` (`RM v3 · System Config`). Keep the redirect so old deep links do not 404.

## Assumptions

- Approved Paper specimens on `4-0`/`5-0` already encode the intended operator IA for the families listed in STATE (Overview, Studio, Local, Remote, Models, Router, Observe, Connect, System).
- Backend APIs and telemetry contracts remain usable; this is primarily a frontend/design-system migration.
- Where current pages still use FactCards, soft status pills, Linear purple accent, or inset shell width, RM3 replaces those patterns.
- The external executor kit is a port source; after Phase 3 the role-model monorepo owns the kit source of truth for runtime-ui consumption.

## Constraints

- Design-system-first sequencing is mandatory: **files before frontend code** (Wave 1 → Wave 2 → Wave 3).
- No inventing FactCard strips or StatusPill walls on happy-path pages covered by approved specimens.
- No empty white/gray canvas outside the app shell.
- Shared tokens/components must own styling; route-local hardcoded colors/typography are treated as drift. Prefer **§H** tokens over literals.
- Paper Theme tokens, Light/Dark foundations, Graph palette, and Shell/Graphs map rules are in-scope contract surfaces — not optional reference.
- Preserve truthful live data; do not ship mock-only page bodies as the production path.
- Do not weaken startup/performance contracts from run 67 without an explicit addendum.
- Follow repo git workflow: feature/recursive branch from `dev`, PR to `dev`.
- Every shipped page and shared component in scope must cite its Paper artboard(s) from the inventory below; inventing unscoped pages/components is out of scope.

## Complete Paper ↔ Implementation Inventory

Paper file: `https://app.paper.design/file/01KW9C35N2G5PZRS4SBJ5678Q6`

| Page id | Name | Role in this run |
| --- | --- | --- |
| `4-0` | role-model v3 design system | Canonical DS + approved page compositions (117 artboards) |
| `5-0` | role-model v3 runtime pages | Working-copy / IA-variant specimens (parity check; prefer `4-0` when both exist) |
| `6-0` | role-model v3 grid templates | Column-track templates only |
| `7-0` | Production · RuntimeOverview | Production Overview light/dark cross-check (`RuntimeOverview · light` / `RuntimeOverview · dark`) |
| `1-0` / `2-0` / `3-0` / `8-0` | legacy / other | Historical or unused for this run |

Naming: DS page compositions use `RM v3 · …`; runtime working copies often omit the prefix (`Runtime overview · light`, `Studio · Chat · light`, …). Implementation must match the DS composition; `5-0` is for parity/IA notes.

### A. Shared kit / shell / primitives → Paper artboards

| Implementation surface (port / migrate) | Paper artboard(s) on `4-0` | Notes |
| --- | --- | --- |
| Theme tokens / CSS variables (full contract in **§H**) | `RM v3 · Theme tokens` (incl. Light/Dark token panels, Typography, Spacing and radii, Component gallery, **Semantic equivalence map**), `RM v3 · Light foundations`, `RM v3 · Dark foundations` + Paper file tokens | Light/Dark only; grayscale chrome |
| Base primitives (Button, Badge, Item, typography samples) | `RM v3 · Primitives light`, `RM v3 · Primitives dark`; rules: `Map · Side-by-side · Buttons & shell`, `Map · Side-by-side · Cards & status` | |
| Forms & controls (Field, Select `34px`, Checkbox, Textarea, triggers) | `RM v3 · Forms & controls`, `RM v3 · Forms & controls light`; rules: `Map · Side-by-side · Inputs`, `Map · Side-by-side · Inputs extended` | Replace `themed-select` / ad hoc selects |
| Overlays & menus | `RM v3 · Overlays & menus`, `RM v3 · Overlays & menus light`; rules: `Map · Side-by-side · Overlays` | Modals/menus including device-auth chrome |
| Layout & navigation | `RM v3 · Layout & navigation`, `RM v3 · Layout & navigation light` | |
| Data & feedback (Table, Empty/Loading/Error, Badge status) | `RM v3 · Data & feedback`, `RM v3 · Data & feedback light`; rules: `Map · Side-by-side · States & disclosure` | Retire happy-path `StatusPill` walls |
| Content (CodeBlock, disclosure, prose blocks) | `RM v3 · Content`, `RM v3 · Content light` | |
| Product composites (SectionCard / PanelHeader, cards) | `RM v3 · Product composites`, `RM v3 · Product composites light`; rules: `Map · Side-by-side · Cards & status`, `Map · New composites needed` | Retire happy-path `FactCard` strips |
| App shell fullscreen | `RM v3 · App shell light`, `RM v3 · App shell dark` | Rules: `Map · Side-by-side · Shell viewport`, `Map · Side-by-side · App shell` |
| Shell parts (header 48px, theme toggle, chrome pieces) | `RM v3 · Shell parts light`, `RM v3 · Shell parts dark` | Theme toggle top-right |
| Workspace shell | `RM v3 · Workspace shell light`, `RM v3 · Workspace shell dark` | Studio 4+8 grammar |
| Mobile shell | `RM v3 · Mobile shell light`, `RM v3 · Mobile shell dark` | Reference; desktop operator shell is primary |
| `Sidebar` + footer (Model inventory → Cache → Router endpoint) | Clone source: `RM v3 · Runtime overview` / `5-0` `Runtime overview · light|dark`; rules on `Map · Side-by-side · App shell` | Do not hand-build per page |
| `PageShell` / `SubPageHeaderBar` / `PageContent` | App shell + Shell parts + Runtime overview | |
| `PageFilters` / `TimeRangeControl` / `FilterSelect` | Runtime overview filters + Forms & controls; `5-0` `SegmentedControl · specimen` for track | |
| `SegmentedControl` | `5-0` `SegmentedControl · specimen`, `Studio page nav · variants`, `Studio page nav · more variants` | Not Tabs `line` / primary pills |
| `MetricStrip` (`inline` · `inventory` · `badge` · `panel`) | `RM v3 · MetricStrip`; `5-0` `Usage metrics · variants` | |
| Chart tokens / palette (full contract in **§H**) | `RM v3 · Graph palette` (Scale inventory · Categorical · Semantic · Status accents · Superlog · Dark categorical · Usage rules · ChartCard specimens) | `--rm3-chart-*` / `--rm3-light-chart-*` only on plots |
| Chart composition rules | `Map · Side-by-side · Graphs` (“RM3 chart composition rules” + Area/Line/Bar/Ranking/Analytics pairs + ChartCard states) and Graph palette Usage rules | Rules 1–10 mandatory |
| `ChartCard` / `ChartGrid` / time-series / ranking / composition charts | Graph palette ChartCard specimens + Graphs map canonical ChartCards; overview charts on `RM v3 · Runtime overview` / `RM v3 · Overview` | Recharts SoT in code |
| Observe chart grid / composition helpers | `RM v3 · Observe *` pages; `5-0` `Observe · Composition *`, `Observe · kit reference` | |
| Connections CardStack IA (collapsed roles) | `RM v3 · Connections CardStack IA`; `5-0` `Remote · Connections · IA variants` | Canonical **C · Collapsed roles** |
| Router Strategy option grammar | `RM3 Router Strategy rules` + `RM v3 · Router Strategy light|dark` | `5-0` option / custom-selected variants are IA notes |
| Page column grid | `6-0` templates; Shell viewport map rule 5 | Default **Template · 12-col · default** |
| Coverage / migration maps (contract only) | `Map · Inventory matrix`, `Map · Coverage checklist`, `Map · New composites needed`, remaining `Map · Side-by-side · *` | Do not ship map boards as product pages |

| Current runtime-ui file (migrate / retire styling) | Maps to |
| --- | --- |
| `app/components/app-shell.tsx` | App shell / Shell parts / Sidebar footer |
| `app/components/theme-toggle.tsx` | Shell parts header toggle |
| `app/components/themed-select.tsx` | Forms & controls Select |
| `app/components/page-primitives.tsx` (`SectionCard`, states, CodeBlock, Disclosure, SelectField) | Product composites / Data & feedback / Content / Forms |
| `app/components/page-primitives.tsx` (`FactCard`, `StatusPill`, `StatCard`) | **Retire on happy-path** per DS; keep only if a specimen still requires an equivalent |
| `app/components/telemetry-charts.tsx` | Graph palette + chart composition |
| `app/components/telemetry-controls.tsx` | PageFilters / SegmentedControl |
| `app/components/local-model-role-picker.tsx` | Connections CardStack + Remote / Local role expanders |
| `app/components/device-authorization-*.tsx` | Remote Providers OAuth + Overlays |
| `app/components/llama-swap-setup-*.tsx` | Local happy-path omits setup banners; keep functional modal without FactCard walls |

Kit port source exports (must land and stay mapped): `Sidebar*`, `PageShell`/`Rm3PageShell`, `PageFilters*`, `SegmentedControl`, `MetricStrip`, `Chart*`/`ChartCard`/`TimeSeries*`/`Ranking*`/`Composition*`, `RuntimeOverview`/`OverviewFilters`, `Observe*`, `usePrefersReducedMotion`.

### B. Shipped routes → Paper page artboards

Light and dark DS artboards are both required for visual QA unless a route is redirect-only.

| Route | Route module | DS `4-0` artboard(s) | Runtime `5-0` working copy | Grid |
| --- | --- | --- | --- | --- |
| `/app` (index) | `dashboard.tsx` | `RM v3 · Runtime overview`, `RM v3 · Overview`; also `7-0` `RuntimeOverview · light|dark` | `Runtime overview · light`, `Runtime overview · dark` | Template · 12-col · default |
| `/app/studio/chat` | `workbench.tsx` | `RM v3 · Studio Chat light`, `RM v3 · Studio Chat dark` | `Studio · Chat · light`, `Studio · Chat · dark` | 12-col; body **4+8** |
| `/app/studio/images` | `studio-images.tsx` | `RM v3 · Studio Images light`, `RM v3 · Studio Images dark` | `Studio · Images · light`, `Studio · Images · dark` | 12-col; **4+8** |
| `/app/studio/audio` | `studio-audio.tsx` | `RM v3 · Studio Audio light`, `RM v3 · Studio Audio dark` | `Studio · Audio · light`, `Studio · Audio · dark` | 12-col; **4+8** |
| `/app/studio/rerank` | `studio-rerank.tsx` | `RM v3 · Studio Rerank light`, `RM v3 · Studio Rerank dark` | `Studio · Rerank · light`, `Studio · Rerank · dark` | 12-col; **4+8** |
| `/app/studio/advanced` | `studio-advanced.tsx` | `RM v3 · Studio Advanced light`, `RM v3 · Studio Advanced dark` | `Studio · Advanced · light`, `Studio · Advanced · dark` | 12-col; **4+8** |
| `/app/local/choose` | `local-choose.tsx` | `RM v3 · Local Choose light`, `RM v3 · Local Choose dark` | `Local · Choose · light`, `Local · Choose · dark` | 12-col; **6+6** |
| `/app/local/endpoints` | `local-peers.tsx` | `RM v3 · Local Endpoints light`, `RM v3 · Local Endpoints dark` | `Local · Endpoints · light`, `Local · Endpoints · dark` | 12-col; Table inventory |
| `/app/local/peer-models` | `local-peer-models.tsx` | `RM v3 · Local Peer models light`, `RM v3 · Local Peer models dark` | `Local · Peer models · light`, `Local · Peer models · dark` | 12-col |
| `/app/local/llama-swap/models` | `local-llama-swap-models.tsx` | `RM v3 · Local Models light`, `RM v3 · Local Models dark` | `Local · Models · light`, `Local · Models · dark` | 12-col |
| `/app/local/llama-swap/swap` | `local-swap.tsx` | `RM v3 · Local Swap history light`, `RM v3 · Local Swap history dark` | `Local · Swap history · light`, `Local · Swap history · dark` | 12-col |
| `/app/local/llama-swap/policy` | `local-policy.tsx` | `RM v3 · Local Host policy light`, `RM v3 · Local Host policy dark` | `Local · Host policy · light`, `Local · Host policy · dark` | 12-col |
| `/app/local/llama-swap/logs` | `local-logs.tsx` | `RM v3 · Local Logs light`, `RM v3 · Local Logs dark` | `Local · Logs · light`, `Local · Logs · dark` | 12-col |
| `/app/local/llama-swap/matrix` | `local-matrix.tsx` | `RM v3 · Local Matrix light`, `RM v3 · Local Matrix dark` | `Local · Matrix · light`, `Local · Matrix · dark` | stub → models `?view=grid`; do not invent matrix grid |
| `/app/remote/providers` | `providers.tsx` | `RM v3 · Remote Providers light`, `RM v3 · Remote Providers dark`, `RM v3 · Remote Providers OAuth light`, `RM v3 · Connections CardStack IA` | `Remote · Providers · light|dark`, `Remote · Providers · OAuth · light`, `Remote · Connections · IA variants` | 12-col; **0.95+1.05** SectionCards |
| `/app/models` | `control-models.tsx` | `RM v3 · Models Models light`, `RM v3 · Models Models dark` | `Models · Models · light`, `Models · Models · dark`; IA: `Models · Inventory · IA variants`, `Models · Selected · IA variants` | 12-col; inventory **6+6** |
| `/app/models/roles` | `control-roles.tsx` | `RM v3 · Models Roles light`, `RM v3 · Models Roles dark` | `Models · Roles · light|dark`, `Models · Roles · Advanced · light`, `Models · Roles · Task detail · light`, `Models · Roles · expanded variants` | 12-col |
| `/app/models/benchmark` | `control-benchmark.tsx` | `RM v3 · Models Benchmark light`, `RM v3 · Models Benchmark dark` | `Models · Benchmark · light|dark`, `Models · Benchmark · IA variants`, `Models · Benchmark · Taxonomy & Progress IA` | 12-col |
| `/app/router` | `router.tsx` | `RM v3 · Router Overview light`, `RM v3 · Router Overview dark` | `Router · Overview · light`, `Router · Overview · dark` | 12-col |
| `/app/router/strategy` | `control-routing-strategy.tsx` | `RM v3 · Router Strategy light`, `RM v3 · Router Strategy dark` + `RM3 Router Strategy rules` | `Router · Strategy · light|dark`, `Router · Strategy · option variants`, `Router · Strategy · custom selected · light` | 12-col |
| `/app/router/controller` | `control-controller.tsx` | `RM v3 · Router Controller light`, `RM v3 · Router Controller dark` | `Router · Controller · light`, `Router · Controller · dark` | 12-col |
| `/app/router/candidates` | `router-candidates.tsx` | `RM v3 · Router Candidates light`, `RM v3 · Router Candidates dark` | `Router · Candidates · light|dark`, `Router · Candidates · card variants` | 12-col |
| `/app/router/decisions` | `router-decisions.tsx` | `RM v3 · Router Decisions light`, `RM v3 · Router Decisions dark` | `Router · Decisions · light`, `Router · Decisions · dark` | 12-col |
| `/app/observe/requests` | `requests.tsx` | `RM v3 · Observe Requests light`, `RM v3 · Observe Requests dark` | `Observe · Requests · light`, `Observe · Requests · dark` | 12-col |
| `/app/observe/routing` | `observe-routing.tsx` | `RM v3 · Observe Routing light`, `RM v3 · Observe Routing dark` | `Observe · Routing · light`, `Observe · Routing · dark` | 12-col |
| `/app/observe/activity` | `observe-activity.tsx` | `RM v3 · Observe Activity light`, `RM v3 · Observe Activity dark` | `Observe · Activity · light`, `Observe · Activity · dark` | 12-col |
| `/app/observe/logs` | `observe-logs.tsx` | `RM v3 · Observe Logs light`, `RM v3 · Observe Logs dark` | `Observe · Logs · light`, `Observe · Logs · dark` | 12-col |
| `/app/connect` | `endpoints.tsx` | `RM v3 · Connect Registry light`, `RM v3 · Connect Registry dark` | `Connect · Registry · light`, `Connect · Registry · dark` | 12-col |
| `/app/connect/downstream` | `integrations-downstream.tsx` | `RM v3 · Connect Downstream light`, `RM v3 · Connect Downstream dark` | `Connect · Downstream · light`, `Connect · Downstream · dark` | 12-col |
| `/app/connect/upstream` | `integrations-upstream.tsx` | `RM v3 · Connect Upstream light`, `RM v3 · Connect Upstream dark` | `Connect · Upstream · light`, `Connect · Upstream · dark` | 12-col |
| `/app/system/runtime` | `runtime.tsx` | `RM v3 · System Runtime light`, `RM v3 · System Runtime dark` | `System · Runtime · light`, `System · Runtime · dark` | 12-col |
| `/app/system/session-readiness` | `session-readiness.tsx` | `RM v3 · System Readiness light`, `RM v3 · System Readiness dark` | `System · Readiness · light`, `System · Readiness · dark` | 12-col |
| `/app/system/runtime-config` | `control-runtime-config.tsx` | `RM v3 · System Config light`, `RM v3 · System Config dark` | `System · Config · light`, `System · Config · dark` | 12-col |
| `/app/system/peers` | `system-peers.tsx` | `RM v3 · System Peers light`, `RM v3 · System Peers dark` | `System · Peers · light`, `System · Peers · dark` | 12-col |
| `/app/system/extensions` | `extensions.tsx` | `RM v3 · System Extensions light`, `RM v3 · System Extensions dark` | `System · Extensions · light`, `System · Extensions · dark` | 12-col |
| `/app/system/storage-retention` | `storage-retention.tsx` | `RM v3 · System Storage light`, `RM v3 · System Storage dark` | `System · Storage · light`, `System · Storage · dark` | 12-col |

### C. Secondary / detail / redirect routes

| Route | Module | Paper mapping | Requirement |
| --- | --- | --- | --- |
| `/app/local/models` | `local-models.tsx` | n/a (redirect → `/app/local/choose`) | Keep redirect; no specimen work |
| `/app/router/config` | `router-config.tsx` → redirect | **No Paper artboard by design** — Router IA has no Config page | **Fixed Decision #15:** legacy redirect → `/app/router/strategy`; remove Config from Router SegmentedControl / `design-system` route catalog; update tests that currently require a first-class provenance page; do not invent a Paper board. Provenance concerns map to Strategy + Controller + System Config specimens |
| `/app/router/decisions/:requestId` | `router-decision-detail.tsx` | Inherit `RM v3 · Router Decisions light|dark` ledger/detail grammar + Content/CodeBlock boards | No separate artboard; stay inside Decisions visual language |
| `/app/observe/requests/:requestId` | `request-detail.tsx` | Inherit `RM v3 · Observe Requests light|dark` + Content boards | No separate artboard |
| Legacy redirects (`/app/local/swap`, `/app/observe`, `/app/control/*`, …) | `legacy-redirect.tsx` | n/a | Keep redirects; no visual specimen work |
| `*` | `not-found.tsx` | Data & feedback empty/error grammar | Minimal RM3 empty/error; no new marketing layout |

### D. Grid templates (`6-0`)

| Artboard | Use |
| --- | --- |
| `Template · 8-col` | Allowed column count |
| `Template · 9-col` | Allowed (track 1172 remainder rule) |
| `Template · 12-col · default` | **Default** for overview-class / Studio / Local / Remote / Models / Router / Observe / Connect / System |
| `Template · 16-col` | Allowed |
| `Template · 18-col` | Allowed (track 1172 remainder rule) |
| `Template · 24-col` | Allowed |

### E. Historical / composite reference boards on `4-0` (not standalone routes)

| Artboard | Use in run |
| --- | --- |
| `RM v3 · Telemetry ledger` | Ledger/table grammar reference for Observe/Router ledgers |
| `RM v3 · Routing analytics` | Chart/analytics composition reference |

### F. Paper-only / not shipped runtime-ui routes (do not implement as product pages unless addendum)

| `5-0` artboard family | Disposition |
| --- | --- |
| `Explore · *` (3D cost/quality/speed, alias composite, candidates graph, hex profile, instrument panel, routing×model graphs) | Out of scope for shipped routes |
| `Catalog Shell` | Specimen / chrome reference only |
| `Observe · Composition *`, `Observe · kit reference` | Kit/specimen reference while implementing Observe pages |
| Studio/Local/Models/Router IA variant boards already cited in §B | Reference for chosen IA; ship the canonical DS page, not every variant |

### G. Inventory completeness gate

Phase 1 must re-verify this table against `app/routes.ts` and Paper `4-0`/`5-0`/`6-0`/`7-0`, plus Paper file tokens vs **§H**. Any new route, DS artboard, or token family discovered after lock requires an addendum. Phase 3/5 evidence must cite the artboard name(s) for each migrated route and each shared component change.

### H. RM3 token system, foundations, graph palette, and map rules

These Paper surfaces are **in scope for the shared contract**. Order: document in Wave 1 (`DESIGN_SYSTEM.md` + authority twins) → implement in Wave 2 (kit + CSS/theme wiring) → consume in Wave 3 (pages). Repo-owned aliases allowed only if mapped 1:1 and documented; raw Linear `--linear-*` / Apple tokens must not remain the active shipped vocabulary on migrated surfaces.

#### H.1 Theme token + foundations artboards (`4-0`)

| Artboard | Required content to port / document |
| --- | --- |
| `RM v3 · Theme tokens` | Light tokens · Dark tokens · Typography · Spacing and radii · Component gallery · **Semantic equivalence map** (old Linear → RM3) |
| `RM v3 · Light foundations` | Light token panels + Typography + Spacing/radii + Component gallery (light) |
| `RM v3 · Dark foundations` | Dark token panels + Typography + Spacing/radii + Component gallery (dark) |

#### H.2 Paper file token families (authoritative names)

Source: Paper file tokens on `01KW9C35N2G5PZRS4SBJ5678Q6` (also serialized in executor `design.md` as port reference).

| Family | Token pattern | Contract |
| --- | --- | --- |
| Dark semantic chrome | `--rm3-background`, `--rm3-foreground`, `--rm3-card`, `--rm3-popover`, `--rm3-primary*`, `--rm3-secondary*`, `--rm3-muted*`, `--rm3-accent*`, `--rm3-destructive`, `--rm3-border`, `--rm3-input`, `--rm3-ring`, `--rm3-scrollbar-thumb*` | Near-neutral grayscale UI; hierarchy via tone/hairlines, not hue |
| Light semantic chrome | `--rm3-light-*` mirrors of the above | Light theme only uses light family (or documented theme-switch aliases) |
| Sidebar chrome | `--rm3-sidebar*`, `--rm3-light-sidebar*` (incl. `active`, `border`, `foreground`, generic `accent`/`primary`/`ring`) | Product shell active row = `sidebar-active` |
| Fonts | `--rm3-font-sans`, `--rm3-font-mono`, `--rm3-font-display` | Geist / Geist Mono; display = Geist |
| Type scale | `--rm3-text-{xs,sm,md,lg,xl}`, `--rm3-font-weight-{regular,medium,semibold}`, `--rm3-tracking-{tight,mono}`, `--rm3-leading-{xs,sm,md,lg,xl}` | Prefer tokens over ad hoc px |
| Spacing | `--rm3-space-{4,8,12,16,24,32,40}` | 4px base rhythm |
| Radii | `--rm3-radius-{sm,md,lg,xl}` | 5 / 6 / 8 / 11 |
| Chart scale ramps | `--rm3-royal-blue-{50…1900}`, `--rm3-emerald-{50…1900}`, `--rm3-di-serria-{50…1900}`, `--rm3-black-{50…1900}` | Underlying ramps only; prefer semantic chart tokens in UI |
| Chart categorical | `--rm3-chart-{1…8}`, `--rm3-light-chart-{1…8}` | Multi-series categorical |
| Chart semantic metrics | `--rm3-chart-{local,remote,throughput,latency,cache,cost,queue,anomaly}`, light mirrors | Prefer these for telemetry series |
| Chart muted radar | `--rm3-{mist,sage,lilac,blush}` + `--rm3-chart-*` / light mirrors | Soft multi-series explore; not neon |
| Chart taxonomy / accents | `--rm3-{amber,coral,azure,mustard,teal,rose,violet,sky,cobalt,mint}` + chart aliases | Secondary; never as UI chrome brand color |
| Chart Superlog series | `--rm3-chart-{green,blue,purple,pink,orange,error,nodata}` + light mirrors | Saturated dashboard fills; **error** for failures (not coral) |
| Cache / status greens in chrome-adjacent UI | chart-cache / deep emerald stops (e.g. emerald-900 / emerald-600) | Sidebar cache bar + active status dots; **not** neon emerald-50/100 |

**Hard rules**

1. Reference tokens — never raw hex/rgb in route code for colors covered by the system.
2. No Linear purple accent (`--linear-accent-*`) as live authority on migrated surfaces.
3. Destructive red is the only non-grayscale chrome accent; chart hues never paint buttons/borders/shell.
4. Cache fills / healthy status use deep chart-cache emerald — not neon green fills.

#### H.3 Graph palette artboard (`RM v3 · Graph palette`)

Must be implemented / documented as the chart color + composition SoT:

| Board section | Requirement |
| --- | --- |
| Header (“UI chrome stays grayscale…”) | Enforce chrome vs chart separation |
| Scale inventory · all stops | Port four ramps (royal-blue / emerald / di-serria / black) `50–1900` |
| Categorical · light / Dark categorical | Port `--rm3-chart-1…8` / `--rm3-light-chart-1…8` |
| Semantic metrics | Port local/remote/throughput/latency/cache/cost/queue (+ anomaly→error) for both themes |
| Status accents | Port amber/coral (and related status accents shown) as chart/status accents only |
| Superlog series · graphs | Port green/blue/purple/pink/orange/error/nodata |
| Usage rules · “RM3 chart composition rules” | Ship rules 1–10 (titles, legends, width, color, ChartCard anatomy, time axis, grid, value axes, Y domain includes 0, ChartGrid shared-border stacks) |
| ChartCard specimens | Match shared ChartCard shell (header divider, Y gutters, TimeAxis, Legend) |

Companion map: **`Map · Side-by-side · Graphs`** — old→new Area/Line/Bar/Ranking/Analytics pairs, TelemetryChartCard states, canonical ChartCards, same composition rules 1–10.

#### H.4 Shell / grid / footer map rules (mandatory)

| Artboard | Rules block to honor |
| --- | --- |
| `Map · Side-by-side · Shell viewport` | RM3 shell viewport rules 1–7 (root height chain, no outer canvas, flush sidebar, padding only in content, column grid 8/9/12/16/18/24, sidebar footer stack, fullscreen only) + Page column grid · default 12 specimen |
| `Map · Side-by-side · App shell` | Full chrome old→new + **RM3 sidebar footer rules** 1–6 (stack, model inventory rows, cache bar, router endpoint, canonical specimens, live-update motion / reduced-motion) |
| `6-0` templates | Clone matching template; default `Template · 12-col · default` |

#### H.5 Primitive / control / state map boards (mandatory for shared primitives)

| Artboard | Use |
| --- | --- |
| `Map · Side-by-side · Cards & status` | Card / Badge / status migration |
| `Map · Side-by-side · Buttons & shell` | Button + shell control grammar |
| `Map · Side-by-side · Inputs` / `… · Inputs extended` | Field/Select/Checkbox/`34px` triggers |
| `Map · Side-by-side · States & disclosure` | Loading/Empty/Error/disclosure |
| `Map · Side-by-side · Overlays` | Dialog/menu/popover |
| `Map · Side-by-side · Charts & domain` | Domain chart pairing notes |
| `Map · Inventory matrix` / `Map · Coverage checklist` / `Map · New composites needed` | Migration coverage tracking (docs/evidence), not product UI |

#### H.6 Component composite boards still in token scope

| Artboard | Why |
| --- | --- |
| `RM v3 · MetricStrip` | MetricStrip variants use chrome tokens + chart-cache where applicable |
| `RM v3 · Connections CardStack IA` | Remote connection rows / Badge / expanders |
| `RM3 Router Strategy rules` | Strategy option visual grammar |
| `RM v3 · Telemetry ledger` / `RM v3 · Routing analytics` | Ledger + analytics composition references |

## Requirements

### `R0` Enforce design-system files → shared code → pages sequencing

Description:
The run is invalid if frontend implementation (kit components, shared UI, or route pages) is restyled before the repo-owned design-system **files** that should own those styles, or if route pages land before shared owners.

Acceptance criteria:
- Phase 2 plan is ordered as Waves 1→2→3→4 from the Design-System-First Rule
- Phase 3 evidence shows Wave 1 contract files (`DESIGN_SYSTEM.md` + authority twins) landed **before** Wave 2 shared UI code and Wave 3 route migrations (or Wave 1 files land in an earlier slice with explicit receipt)
- No route introduces RM3-only styling/layout without matching shared ownership updates already present
- Phase 3 implementation checklist separates Wave 1 / Wave 2 / Wave 3 slices; a Wave 3 slice that precedes its Wave 1/2 dependencies fails this requirement

### `R1` Rewrite design-system files to the RM3 contract (Wave 1)

Description:
Repo-owned design-system **files** become the active RM3 contract **before** frontend product UI is migrated. This is the human/machine contract layer — not yet the full page restyle.

Acceptance criteria:
- `DESIGN_SYSTEM.md` cites Paper pages `4-0` / `5-0` / `6-0` / `7-0` and Paper file `--rm3-*` tokens as visual/token authorities
- Linear accent / Apple-reference language is historical-only or removed from the active contract sections
- the document captures the full **§H** contract: Theme tokens + Light/Dark foundations, semantic chrome + sidebar families, Geist fonts/type/spacing/radii, Graph palette (ramps, categorical, semantic, Superlog, chrome-vs-chart), composition rules 1–10, Shell viewport + App shell footer rules, and no happy-path FactCard strips
- `DESIGN_SYSTEM.md` also covers: fullscreen shell, sidebar footer stack, page header + theme toggle, 12-col default grid, SegmentedControl, PageFilters, MetricStrip variants, ChartCard/ChartGrid, and cites inventory **§A–§B** as the page/component map
- Wave 1 docs state Router SegmentedControl = Overview · Strategy · Controller · Candidates · Decisions and record `/app/router/config` as redirect-only (Fixed Decision #15)
- `app/lib/design-system.ts` (+ tests) and related theme/token metadata are updated so the machine-readable authority matches the markdown contract (no leftover Linear-as-current metadata; no Config as a live Router catalog route)
- Wave 1 lands before Wave 2 shared component restyles and Wave 3 route migrations
- Phase 6/7 update `DECISIONS.md` / `STATE.md` so they no longer claim Linear Paper review as the current live styling authority after this run

### `R2` Port a repo-owned RM3 UI kit package (Wave 2)

Description:
After Wave 1 contract files exist, port the RM3 kit into this monorepo as a first-class package that `runtime-ui` consumes, based on the external `@role-model/ui` reference without requiring a live executor checkout at build/runtime.

Acceptance criteria:
- Wave 1 `DESIGN_SYSTEM.md` (and authority twins) already describe the surfaces being ported, or land in the same Phase 3 slice **before** kit export code is marked GREEN
- Phase 2 records the exact package path and package name
- the kit is part of the pnpm workspace and is buildable/testable in this repo alone
- the kit exports at least the surfaces listed in inventory **§A** (PageShell / sidebar chrome + footer, PageFilters, SegmentedControl, MetricStrip, ChartCard/time-series/ranking/composition chart primitives, Observe helpers as needed, shared utils/tokens)
- each exported kit surface cites its Paper artboard mapping from **§A** in Phase 2/3 notes or `DESIGN_SYSTEM.md`
- runtime-ui depends on the in-repo kit for migrated surfaces rather than keeping a second competing design authority
- production packaging does not require the executor workspace to be present
- kit package README/contract notes point at `DESIGN_SYSTEM.md` + Paper pages as authority

### `R3` Rebuild shared tokens, shell, and primitives to RM3 (Wave 2)

Description:
Shared implementation must match the Wave 1 RM3 contract and primitive grammar before page bodies are migrated (Wave 3).

Acceptance criteria:
- shared theme tokens implement **§H.2** families (dark/light semantic chrome, sidebar, fonts, type, spacing, radii) from `RM v3 · Theme tokens` + Light/Dark foundations + Paper file tokens; repo-owned aliases allowed only if mapped 1:1 and documented in Wave 1 files
- Semantic equivalence map on Theme tokens is used to retire Linear `--linear-*` authority on migrated surfaces
- UI chrome stays grayscale; destructive is the only non-chart chrome accent; no Linear purple as live accent
- shell is fullscreen edge-to-edge (`h-screen`/`100dvh`, no outer canvas gutter) per **§H.4** Shell viewport + App shell maps
- sidebar includes pinned footer: Model inventory → Cache → Router endpoint, with reduced-motion-safe live-update behavior per App shell footer rules; cache/status greens use chart-cache / deep emerald
- page header is 48px with title left and theme toggle right; no route-id mono subtitle (`Shell parts`)
- SegmentedControl, PageFilters, MetricStrip, and chart primitives exist as shared kit components mapped in **§A**/**§H** and have automated coverage
- select triggers default to height `34px` where the DS requires it (`Forms & controls` / Inputs maps)
- legacy runtime-ui component files listed in **§A** are migrated or retired on touched surfaces
- primitive grammar follows **§H.5** map boards for cards/buttons/inputs/states/overlays
- Wave 2 shared owners land before dependent Wave 3 route slices

### `R4` Align chart composition and graph palette to RM3 (Wave 2, consumed in Wave 3)

Description:
Telemetry/overview charts must follow `RM v3 · Graph palette` + `Map · Side-by-side · Graphs` rather than Linear-era chart chrome or ad hoc colors. Chart **rules and tokens** are documented in Wave 1; shared chart primitives land in Wave 2; page charts adopt them in Wave 3.

Acceptance criteria:
- Wave 1 `DESIGN_SYSTEM.md` lists composition rules 1–10 and **§H.2**/**§H.3** token families before Wave 3 chart-bearing pages are marked done
- chart colors come only from **§H.2**/**§H.3** token families (`--rm3-chart-*` / `--rm3-light-chart-*` and documented scale aliases); no Linear telemetry hues or raw hex in plot series
- prefer semantic series tokens; muted mist/sage/lilac/blush for multi-series explore; Superlog series where the specimen uses them; failures use chart-error (not coral); cache fills use deep emerald
- multi-series charts have legends; titles are sentence case
- every time-series chart has the required time axis (7 ticks `00:00`…`24:00`) and at least a left Y axis; dual-Y only for incompatible units/scales
- Y domain includes 0 at baseline; grid is solid (not dashed); Y gutter / plot inset match DS (left Y width 40 + tickMargin 6; plot/legend/time left 56)
- ChartCard uses the shared header-divider shell; default plot height **192** unless a page specimen documents otherwise; page stacks use ChartGrid shared-border cells where overview/Observe require it
- composition rules 1–10 are enforced in shared chart primitives (Wave 2), not reimplemented per route
- Recharts remains the production chart engine; no ad hoc decorative SVG chart replacements for shipped analytics

### `R5` Migrate shipped runtime pages to approved RM3 specimens (Wave 3)

Description:
After Wave 1 files and Wave 2 shared code land, migrate every live route in inventory **§B** (and secondary routes in **§C**) to the cited Paper artboards while keeping live data. Family summaries are not enough — each route row is in scope.

Acceptance criteria:
- Phase 3 evidence for each Wave 3 route slice cites completed Wave 1/2 dependencies
- every **§B** route is migrated against its listed `4-0` light/dark artboard(s); `5-0` working copies are used for parity/IA notes; Overview also cross-checks `7-0`
- Phase 3/5 evidence for each migrated route names the Paper artboard(s) from **§B**/**§C**
- composition matches the specimen (grid spans, SegmentedControl usage, MetricStrip placement, panel chrome, absence of FactCard strips on happy path)
- Studio remains mode-specific composers + 4+8 workspace without invented fact strips
- Remote Providers follows Connections CardStack IA **C** (`RM v3 · Connections CardStack IA`) and omits Models.dev api-key-static metadata panel
- Local Matrix stays a stub redirect per DS (no invented capability matrix)
- System Extensions/Storage use RM3 composites (no FactCard/StatusPill walls)
- **§C** `/app/router/config` is converted to legacy redirect → `/app/router/strategy` per Fixed Decision #15; Config is removed from Router SegmentedControl; tests asserting a first-class config provenance page are updated accordingly
- **§C** decision/request detail and not-found use shared RM3 grammar only (no separate artboards)
- **§F** Explore / Catalog-only boards are not shipped as product pages
- pages remain wired to real runtime APIs/view-models; specimen copy may guide empty/loading states but must not become fake production data

### `R6` Remove conflicting legacy visual drift on touched surfaces

Description:
Touched routes/components must not keep mixed Linear/Apple/RM3 styling.

Acceptance criteria:
- Phase 1 inventories hardcoded colors/typography/control treatments that conflict with RM3 on in-scope surfaces
- Phase 3 removes or migrates those on changed surfaces to shared tokens/components
- any temporary exception is explicitly recorded in Phase 2 with rationale and removal criteria

### `R7` Preserve runtime truth, startup, and telemetry semantics

Description:
Visual migration must not break truthful operator behavior or prior hardening.

Acceptance criteria:
- route ownership and telemetry semantics remain consistent with current architecture docs, or docs are updated in-run if ownership changes
- deferred-loading / startup contracts for heavy pages remain intact unless an explicit addendum changes them
- no decorative placeholder telemetry is introduced to “fill” charts

### `R8` Strict TDD for kit, tokens, primitives, and route migration

Description:
Every production-code slice in this run follows test-first discipline. Visual migration is not an excuse to skip RED → GREEN.

Acceptance criteria:
- Phase 3 declares `TDD Mode: strict` in the TDD Compliance Log
- every production-code slice follows RED → GREEN → REFACTOR for:
  - kit package landing / exports
  - shared token / theme / CSS authority (**§H**)
  - shared shell / primitives / PageFilters / SegmentedControl / MetricStrip / chart primitives
  - route-consumer changes where rendering, behavior, or route-model contracts change
- no production-code change to tokens, shared primitives, shell behavior, route layout, route styling, or route view-model behavior is accepted without preceding failing automated evidence
- RED evidence and GREEN evidence are recorded separately for each implemented slice before refactor/cleanup is accepted
- if a purely visual route change cannot be expressed with an existing automated assertion, Phase 2 must explicitly record the reason and define compensating verification instead of silently skipping test-first discipline
- automated coverage is **required** for Wave 1 authority twins and Wave 2 shared kit/token/shell/chart surfaces touched by the run
- automated coverage is required for Wave 3 route-consumer changes that alter rendering, interaction, or route-model behavior; Phase 2 must list any purely visual exception with compensating rebuilt-runtime browser verification — “where practical” is not a silent skip
- changed route-consumer surfaces have focused automated coverage for rendering, interaction, and route-model behavior changed by the run, or an explicit Phase 2 compensating-verification row
- regression-sensitive user flows touched by the frontend rebuild are covered by end-to-end tests or by updates to existing end-to-end tests

### `R9` Phase 5 rebuilt-runtime hybrid QA against Paper

Description:
Phase 5 Manual QA must verify the **rebuilt runtime** path (not a design-only / mock-only / `vite`-only preview), prove functionality still works, and gather hybrid visual evidence against Paper with human sign-off.

Acceptance criteria:
- Phase 2 maps each materially changed surface to at least one verification owner among: automated test · build check · end-to-end regression · rebuilt-runtime browser verification · hybrid manual QA
- Phase 2 records the exact rebuilt-runtime validation/start/serve path that Phase 4 and Phase 5 must execute (including any `runtime:validate-ui` / packaging / host-bridge command)
- Phase 4 executes rebuilt-runtime startup/build validation on that actual runtime path and records evidence under `evidence/`
- Phase 5 declares `QA Execution Mode: hybrid` in `05-manual-qa.md`
- Phase 5 records route-level browser evidence **only after** rebuilding the runtime UI and launching the rebuilt runtime stack
- required browser evidence is gathered against the rebuilt runtime path, **not only** `vite`, Storybook/playground, or a mock-only route preview
- browser verification covers, at minimum:
  - shared shell / sidebar footer / header / theme-toggle behavior
  - every migrated **§B** family (artboard citations); first QA pass may start with one chart-heavy + one config/ledger page, but remaining **§B** routes are covered before Phase 5 lock
  - at least one detail/ledger-style page if changed (**§C** detail routes when touched)
- Phase 5 explicitly verifies that rebuilt-runtime **functionality still works** on changed surfaces (navigation, controls, filters, toggles, forms, selections, page-to-page transitions) — not only visual resemblance to Paper
- Phase 5 explicitly checks that changed graphs use Recharts-backed components, follow **§H.3** composition/palette rules, and remain understandable
- Phase 5 includes explicit visual verification against Paper `4-0` / `5-0` / `7-0` (and `6-0` grid where relevant) per inventory tables
- final QA includes human sign-off (`Approved by` + `Date`) because visual fidelity to Paper is part of acceptance
- kit package tests + runtime-ui tests + build pass; validators selected in Phase 2 stay green or have explicit scoped exceptions

## Out of Scope

- `OOS1`: Editing the Paper file as part of this run
- `OOS2`: Backend routing/provider/benchmark behavior changes unrelated to UI consumption needs
- `OOS3`: Replacing the operator information architecture with a new nav tree not present in Paper `5-0`
- `OOS4`: Publishing the kit to npm or coupling production builds to a live executor checkout
- `OOS5`: Executor multiplayer shell or non-runtime-ui products
- `OOS6`: Treating chat prose as the design authority after this artifact exists
- `OOS7`: Shipping Paper Explore / Catalog Shell specimens as product routes (inventory **§F**)
- `OOS8`: Implementing every IA-variant artboard as a separate product page when a canonical DS page already exists in **§B**
- `OOS9`: Inventing a Paper / DS **Router Config** page artboard for `/app/router/config` — Paper Router IA deliberately has no Config segment; Fixed Decision #15 retires the route instead

## Expected Product Paths

Likely touched (finalized in Phase 1/2), ordered by wave:

**Wave 1 — design-system files**
- `role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
- `role-model-router/apps/runtime-ui/app/lib/design-system.ts`
- `role-model-router/apps/runtime-ui/app/lib/design-system.test.ts`
- kit package README / contract notes (when scaffolded)

**Wave 2 — shared DS implementation**
- new kit package under `role-model-router/packages/**` or `packages/**`
- `role-model-router/apps/runtime-ui/app/app.css`
- `role-model-router/apps/runtime-ui/app/lib/theme.ts` (+ tests)
- `role-model-router/apps/runtime-ui/app/lib/telemetry-chart-config.ts` (+ tests)
- `role-model-router/apps/runtime-ui/app/components/**` (shell, primitives, charts, controls)
- workspace package manifests / lockfile as needed for the new package

**Wave 3 — page frontend**
- `role-model-router/apps/runtime-ui/app/routes/**` per **§B**/**§C**
- specifically: convert `router-config.tsx` to redirect (or reuse `legacy-redirect.tsx`), remove Config from Router nav in `design-system.ts` / shell SegmentedControl, update `design-system.test.ts` expectations that currently require a first-class config provenance surface

**Later phases**
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- possibly `docs/architecture/11-runtime-ui-telemetry-graph-matrix.md` if chart ownership wording must change

## Extensibility and future-proofing

After this run locks, the durable contract stack is:

1. **Paper** (`4-0`/`5-0`/`6-0`/`7-0` + file tokens) — visual authority (edit only via future approved addendum / separate run)
2. **`DESIGN_SYSTEM.md` + authority twins** — repo-owned written/machine contract
3. **In-repo RM3 kit** — implementation SoT for shared components consumed by `runtime-ui`

Extension rules (no chat-only scope growth):

- New shipped page → addenda + inventory **§B**/**§C** row citing Paper artboard(s), or an explicit redirect/retirement decision like Fixed Decision #15
- New shared component → **§A** row + Wave 1 contract update + Wave 2 kit export + tests
- New token / chart rule → Paper tokens/boards first (separate run if Paper must change) → Wave 1 `DESIGN_SYSTEM.md`/**§H** → Wave 2 CSS/kit → consumers
- Paper IA variants (**§F**) stay non-shipped unless an addendum promotes a specific variant to canonical
- Strategy A remains: never reintroduce a live executor checkout dependency for production builds

## Verification Floor

Phase 2 records exact commands; Phase 4 executes them; Phase 5 browser QA depends on rebuilt-runtime evidence from Phase 4. Minimum expected verification:

- kit package test + build (exact filter/path recorded in Phase 2 after package landing)
- `corepack pnpm --filter @role-model-router/runtime-ui test`
- `corepack pnpm --filter @role-model-router/runtime-ui build`
- any changed-path focused test commands selected in Phase 2 for tokens, shared primitives, chart helpers, route view models, and route consumers
- end-to-end regression commands covering the rebuilt runtime flows affected by the run
- rebuilt-runtime startup/build validation sufficient to **serve** the runtime UI from the actual runtime path (not design-only preview)
- if runtime rebuild or startup requires a repo-standard validator or packaging path (e.g. `runtime:validate-ui` / host-bridge), Phase 2 records the exact command and Phase 4/5 show the evidence
- Phase 5 browser verification on that rebuilt runtime for **§B** coverage + shell/chrome, with hybrid human sign-off
- explicit visual verification of tokens/typography/shell/SegmentedControl/PageFilters/MetricStrip/ChartCard treatment against Paper **§A**/**§H**

## Phase Receipt Expectations

- `00-worktree.md` — isolated worktree, baseline branch/commit, runtime-ui (+ kit) test/build baseline
- `01-as-is.md` — drift vs Paper `4-0`/`5-0`/`6-0`/`7-0` and inventory **§A–§H**; current Linear-token / FactCard / inset-shell debt
- `02-to-be-plan.md` — maps each `R#` to **Wave 1 files → Wave 2 shared code → Wave 3 pages**; maps surfaces to automated / build / e2e / rebuilt-runtime browser / hybrid QA owners; records exact rebuilt-runtime validate/start path for Phase 4/5
- `03-implementation-summary.md` — strict TDD RED and GREEN evidence for Wave 1 authority twins, Wave 2 kit/tokens/primitives/charts, and Wave 3 route-family slices; proves wave order was respected
- `04-test-summary.md` — kit + runtime-ui test/build evidence, e2e regression, **rebuilt-runtime build/start validation** evidence paths
- `05-manual-qa.md` — `QA Execution Mode: hybrid`; browser evidence only after rebuilt runtime is up; functionality + Paper visual checks; human sign-off

## Coverage Gate

- Effective inputs reviewed:
  - recursive control-plane docs
  - run 60 requirements pattern (strict TDD + rebuilt-runtime Phase 5)
  - current `DESIGN_SYSTEM.md`
  - Paper RM3 pages `4-0` (117 artboards), `5-0`, `6-0` (6 templates), `7-0` (Overview production)
  - current `app/routes.ts` + `app/components/*` + kit export surface
- Requirement coverage check:
  - `R0`–`R9` cover **Wave 1 files → Wave 2 shared code → Wave 3 pages**, kit port, contract, shell/primitives, charts, pages, drift removal, truth preservation, **strict TDD**, and **Phase 5 rebuilt-runtime hybrid QA**
  - inventory **§A–§H** lists every shared component surface, every shipped route, secondary routes, grids, map boards, Paper-only exclusions, and the full token/foundation/graph-palette contract
  - Extensibility / future-proofing section defines post-run contract stack and addendum rules
  - Out-of-scope confirmation:
  - `OOS1`–`OOS9` listed
  - Explore / Catalog Shell remain non-shipped unless addendum
  - `/app/router/config` retired via redirect (Fixed Decision #15); no invented Config artboard
  - Linear file tokens remain historical once RM3 tokens land

Coverage: PASS

## Approval Gate

- Objective readiness checks:
  - requirements are observable and sequenced (**files before frontend code**)
  - Paper authorities + token/graph contract (**§H**) are explicit
  - branch baseline is `dev`
  - package strategy A is recorded as a fixed decision
  - `TDD Mode: strict` and Phase 5 rebuilt-runtime `QA Execution Mode: hybrid` are required
  - run folder and this artifact exist under `/.recursive/run/86-runtime-ui-rm3-design-system-frontend/`
- Audit disposition (2026-07-30):
  - **Consistent:** Wave order aligned across Design-System-First Rule, Fixed Decision #14, `R0`–`R5`, paths, and Phase receipts (prior kit-before-docs ordering removed)
  - **Comprehensive:** pages/components/tokens/maps/TDD/Phase 5 covered; `local/models` redirect in **§C**; `/app/router/config` retired via Fixed Decision #15 (no open artboard gap)
  - **Specific:** artboard names, token families, numeric chart/shell rules, wave gates
  - **Verifiable:** strict TDD + rebuilt-runtime hybrid QA + Verification Floor; silent “where practical” skips removed
  - **Extensible / future-proof:** addenda + inventory rules + three-layer contract stack (Paper / `DESIGN_SYSTEM.md` / in-repo kit)
- Remaining blockers:
  - none for Phase 0 requirements lock; worktree isolation is the next Phase 0 artifact

Approval: PASS
