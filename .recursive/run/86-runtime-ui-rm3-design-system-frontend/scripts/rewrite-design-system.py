from pathlib import Path

root = Path(r"D:\DEV\role-model\.worktrees\86-runtime-ui-rm3-design-system-frontend")
ds_path = root / "role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md"
old = ds_path.read_text(encoding="utf-8")

marker = "## Navigation model"
idx = old.find(marker)
if idx < 0:
    raise SystemExit("marker not found")
tail = old[idx:]

replacements = [
    (
        "The intended visual authority for these contracts remains the Paper Linear review file, but the contracts below are the canonical implementation record when Paper temporarily lags the latest approved runtime UI.",
        "The intended visual authority for these contracts remains Paper RM3 pages `4-0`/`5-0`/`6-0`/`7-0`, but the contracts below are the canonical implementation record when Paper temporarily lags the latest approved runtime UI.",
    ),
    (
        "Page content begins immediately in `<main>` with template primitives (`FactCard`, `SectionCard`, …)",
        "Page content begins immediately in `<main>` with template primitives (`SectionCard`, `MetricStrip`, `ChartCard`, …). Happy-path pages must not lead with `FactCard` / `StatusPill` walls.",
    ),
    (
        "All templates assume the shell header is already visible. Page content begins directly with template primitives (`FactCard`, `SectionCard`, …) and never with a duplicate page-title block.",
        "All templates assume the shell header is already visible. Page content begins directly with template primitives (`SectionCard`, `MetricStrip`, `ChartCard`, …) and never with a duplicate page-title block. Happy-path pages omit FactCard/StatusPill walls.",
    ),
    (
        "| `/app/router` | live | `registry-detail` | First-class routing overview that summarizes active posture, recent decisions, and operator handoff into config, candidates, and decision interpretation. |",
        "| `/app/router` | live | `registry-detail` | First-class routing overview that summarizes active posture, recent decisions, and operator handoff into strategy, candidates, and decision interpretation. |\n| `/app/router/config` | redirect | — | Legacy redirect → `/app/router/strategy` (Fixed Decision #15). No Paper Config artboard; Router SegmentedControl has no Config segment. |",
    ),
    (
        "| `model-inventory` | `/app/models` uses fact strips before a responsive configured-model card grid and an inspect-only modal. |",
        "| `model-inventory` | `/app/models` uses MetricStrip / inventory summary before a responsive configured-model card grid and an inspect-only modal (no FactCard strip). |",
    ),
    (
        "Secondary navigation sits beneath the shell header as section-local page tabs",
        "Secondary navigation sits beneath the shell header as section-local **SegmentedControl** (not Tabs `line` / primary pills / bare text)",
    ),
]
for a, b in replacements:
    if a not in tail:
        print("WARN missing:", a[:80])
    else:
        tail = tail.replace(a, b)

front = r"""# Runtime UI Design System

## Intent

The runtime UI is a repo-owned operator shell for the role-model router runtime. The intended visual source of truth for both the design system and the actual runtime page implementations is the **Paper RM3** design file `01KW9C35N2G5PZRS4SBJ5678Q6` (pages `4-0` design system, `5-0` runtime specimens, `6-0` grid templates, `7-0` Production RuntimeOverview). This document is the repo-owned canonical translation of that Paper source into tokens, shared primitives, route contracts, and implementation receipts.

This shell must not clone the vendored llama-swap UI, and it must not treat Swiss-design guidance, the older Apple reference, or the superseded **Paper Linear review** board as current runtime UI authority. Linear/`--rm-*` and Apple references remain historical only. The runtime information architecture, route ownership, and workflow structure stay repo-owned; Paper RM3 informs theme tokens (`--rm3-*` / `--rm3-light-*`), typography (Geist), shell grammar, charts, and control chrome.

## Authority and sync policy

1. **Paper RM3 is the intended visual source of truth.** Pages `4-0` / `5-0` / `6-0` / `7-0` plus file-level `--rm3-*` tokens are the design authority for shared design-system decisions and for the layout/content of actual runtime pages.
2. **This document is the repo-owned canonical translation.** `DESIGN_SYSTEM.md` records the exact token values, component rules, and page contracts that engineering implements in the repo.
3. **In-repo kit `@role-model/ui`** (`role-model-router/packages/ui`) is the shared implementation SoT for shell, filters, SegmentedControl, MetricStrip, and chart primitives once Wave 2 lands.
4. **Approved runtime implementation may temporarily lead Paper.** When Paper is known to be out of date relative to the latest approved runtime UI, the repo-owned implementation plus this document become the temporary reconciliation source until Paper is updated.
5. **Paper must be resynced after approved design/code changes.** Any approved runtime-shell, token, component, or page-layout change must be reflected back into Paper so visual authority and repo implementation converge again.
6. **Apple reference remains historical only.** `DESIGN_APPLE_REFERENCE.md` is not allowed to override Paper, this document, or the live runtime UI.
7. **Linear review remains historical only.** Prior Paper Linear / `--linear-*` / purple accent contracts are not live authority on migrated surfaces.
8. **Anti-drift for charts:** production Recharts behavior is SoT once implemented; Paper SVG plots are visual reference only.

## Core rules

1. **Light and Dark only.** The operator UI exposes exactly `Light` and `Dark`; system preference is initial-default logic only until the operator chooses.
2. **Quiet chrome, strong content.** Shell, cards, tables, and controls stay near-neutral grayscale so runtime facts, ledgers, and charts remain primary.
3. **No brand hue in chrome.** Primary actions use near-black / near-white primary fills (`--rm3-primary` / `--rm3-light-primary`). The only non-grayscale chrome accent is **destructive** red. Chart hues never paint buttons, borders, or shell chrome.
4. **Radii follow RM3.** Shared surfaces use `--rm3-radius-sm|md|lg|xl` = `5px` / `6px` / `8px` / `11px` (plus pill `9999px` where needed). Soft Linear `12/16/28` shell radii are historical.
5. **Typography is Geist-led and startup-safe.** `--rm3-font-sans` / `--rm3-font-display` = `"Geist", ui-sans-serif, system-ui, sans-serif`; `--rm3-font-mono` = `"Geist Mono", ui-monospace, "SF Mono", Menlo, monospace`. Packaged runtime startup must not depend on remote font fetches. The runtime ships **bundled font assets**.
6. **One shell header (48px).** Page title left + theme toggle (sun/moon) top-right. No route-id / mono subtitle. Route files do not duplicate eyebrow, title, or description blocks. The shell header is the **only** route-level header.
7. **Fullscreen shell.** Sidebar flush left (224px) + main column; no empty outer canvas / inset `1840px` card chrome. Content uses default **12-col** track (`max-w-[1216px]`, pad `16`, gutter `16`).
8. **Secondary nav is SegmentedControl.** Bordered secondary track + primary fill on the active segment — not Tabs `line`, primary pills, or bare text.
9. **Happy-path pages omit FactCard / StatusPill walls.** Prefer MetricStrip, SectionCard + PanelHeader, Badge, Button, Table, Select `34px`.
10. **Analytics routes and evidence routes stay distinct.** `/app` and charted Observe pages lead with analytics bands; raw-host and request-detail pages remain evidence-first. Canonical telemetry pages must not embed a redundant “Adjacent raw-host tools” panel.
11. **The shell viewport stays fixed.** Sidebar and shell header remain fixed; only the page-content frame scrolls, and that internal scrollbar stays visually hidden.

### Shell receipts

- Sidebar navigation is text-only. Section links never render route icons inside the rail.
- No visible divider separates the sidebar from the content column; both live on the same shell surface.
- Sidebar footer (pinned, shrink-0): **Model inventory → Cache → Router endpoint** with reduced-motion-safe live-update motion.
- Cache / healthy status greens use chart-cache / deep emerald — not neon emerald-50/100.
- The light/dark toggle sits on the right edge of the 48px page header strip.
- Overview analytics empty states stay compact and never fabricate synthetic chart data to fill space.
- Configured-model detail code blocks show the compact preview payload (`modelId` plus `endpointIds`) instead of dumping full endpoint records into the first screen.
- Compact advanced-filter rows use `DisclosureSection` in compact mode.
- Role / category selectors use grouped category rows with a leading checkbox.
- Status pills use solid token-backed backgrounds when a specimen still requires a pill-equivalent Badge (happy-path pages prefer Badge / MetricStrip, not StatusPill walls). Documented migration aliases during Wave 2: `--rm-pill-info-bg`, `--rm-pill-advisory-bg` (historical Linear) → RM3 muted/info badge tokens.

## Theme contract

### Typography tokens

| Token | Value |
| --- | --- |
| `--rm3-font-display` | `"Geist", ui-sans-serif, system-ui, sans-serif` |
| `--rm3-font-sans` | `"Geist", ui-sans-serif, system-ui, sans-serif` |
| `--rm3-font-mono` | `"Geist Mono", ui-monospace, "SF Mono", Menlo, monospace` |

### Typography scale (prefer tokens)

| Token / use | Notes |
| --- | --- |
| `--rm3-text-{xs,sm,md,lg,xl}` | Prefer over ad hoc px |
| `--rm3-font-weight-{regular,medium,semibold}` | Two weights per view (400/500; 600 headings) |
| `--rm3-tracking-{tight,mono}` | Tight on display; mono tracking on section labels |
| `--rm3-leading-{xs,sm,md,lg,xl}` | Prefer tokens |

### Semantic chrome (dark `--rm3-*` / light `--rm3-light-*`)

| Role | Dark | Light |
| --- | --- | --- |
| background | `#0A0A0A` | `#FFFFFF` |
| foreground | `#EDEDED` | `#111111` |
| card | `#0F0F0F` | `#FFFFFF` |
| primary | `#FFFFFF` | `#0A0A0A` |
| primary-foreground | `#0A0A0A` | `#FFFFFF` |
| muted-foreground | `#9A9A9A` | `#666666` |
| border | `#1F1F1F` | `#EAEAEA` |
| destructive | `#E0726A` | `#B4261A` |
| sidebar | `#0A0A0A` | (light sidebar family) |
| sidebar-active | `#141414` | (light sidebar-active) |

Full families (popover, secondary, accent surface, input, ring, scrollbar, sidebar-*) are Paper file tokens on `01KW9C35N2G5PZRS4SBJ5678Q6` and must be implemented in Wave 2 CSS. Route code references tokens — never raw hex for covered roles. Also keep transitional `--rm-on-primary` documented until Wave 2 retires Linear aliases.

### Spacing and radii

| Family | Values |
| --- | --- |
| `--rm3-space-{4,8,12,16,24,32,40}` | 4px base rhythm |
| `--rm3-radius-sm` | `5px` |
| `--rm3-radius-md` | `6px` |
| `--rm3-radius-lg` | `8px` |
| `--rm3-radius-xl` | `11px` |

### Machine-readable twin (`runtimeTheme`)

Wave 1 authority twin uses:

- `maxContentWidth: "1216px"` (main content track; shell itself is fullscreen)
- radii sm/md/lg/xl = 5/6/8/11; panel/field follow lg/md; pill/badge `9999px`; shell no longer uses Linear `28px` inset
- chrome accent fields map to RM3 primary (near-black light / near-white dark) — **not** Linear purple `#5E6AD2`

### Semantic equivalence (Linear → RM3)

| Historical Linear | RM3 |
| --- | --- |
| `--linear-accent-primary` / `--rm-accent` purple | `--rm3-primary` / `--rm3-light-primary` (grayscale CTA) |
| `--rm-font-*` Inter / IBM Plex | `--rm3-font-sans|mono|display` Geist |
| `--rm-shell-width` `1840px` inset | fullscreen + `1216px` content |
| `--rm-chart-*` Linear hues | `--rm3-chart-*` / `--rm3-light-chart-*` (Wave 2 CSS; Wave 1 docs name the target) |

## Chart system contract

### Palette families (Paper `RM v3 · Graph palette`)

- Scale ramps: `--rm3-royal-blue-*`, `--rm3-emerald-*`, `--rm3-di-serria-*`, `--rm3-black-*` (`50…1900`)
- Categorical: `--rm3-chart-{1…8}` / `--rm3-light-chart-{1…8}`
- Semantic metrics: `--rm3-chart-{local,remote,throughput,latency,cache,cost,queue,anomaly}` (+ light mirrors)
- Superlog: `--rm3-chart-{green,blue,purple,pink,orange,error,nodata}`
- Failures use **chart-error** (not coral); cache fills use deep emerald / chart-cache

Example semantic stops (dark): `--rm3-chart-local` → `var(--rm3-black-100)`; `--rm3-chart-remote` → `var(--rm3-royal-blue-400)`; `--rm3-chart-cache` → `var(--rm3-emerald-600)`; `--rm3-chart-latency` → `var(--rm3-di-serria-300)`; `--rm3-chart-error` → `#F04646`.

Live CSS may still expose transitional `--rm-chart-*` aliases until Wave 2/SP5 flips production bindings; **documented authority is `--rm3-chart-*`**.

### RM3 chart composition rules

1. **Titles** — sentence case only (`Token usage over time`), never Title Case for chart titles.
2. **Legends** — required on every multi-series chart (swatch + metric key/label); inset to match plot/X (`pl-10` / left **56**).
3. **Width** — plot fills the card content width (or the span between Y axes when present); TimeAxis aligns to plot width; no centered stubs.
4. **Color** — `--rm3-chart-*` / `--rm3-light-chart-*` only on plots; prefer semantic series tokens; never on chrome.
5. **ChartCard** — shared shell (`padding 16` / `height auto`): Header (full-bleed title band + `border-b`) → YAxisLeft + Plot (+ optional YAxisRight) → TimeAxis → Legend. Default plot height **192**.
6. **Y gutter** — left Y `width 40` + `tickMargin 6`. Plot / TimeAxis / Legend left **56**. Dual-Y: plot width = rightAxis.left − 56.
7. **Bars** — `barCategoryGap` **2%**, `maxBarSize` **96**.
8. **Time axis** — mono X labels at 7 ticks on a 24h domain: `00:00`…`20:00` plus end `24:00`. Required on every time-series chart.
9. **Grid** — solid horizontals ≈5% ink + baseline ≈8%; verticals at those 7 time ticks. Never dashed. `vector-effect: non-scaling-stroke`.
10. **Value axes / Y domain** — every chart has at least one Y axis (left). Same unit → left only; incompatible units → dual-Y. Y domain always includes **0** at the plot baseline.

### Chart behavior rules (operations)

- Shared layout contracts own gutters/margins; route-local axis widths are not allowed once ChartCard/ChartGrid land.
- legends display explicit human-readable labels for endpoint, model, provider, role, strategy, and source series
- ranked comparisons remain horizontal bars rather than pie charts
- color assignment is deterministic where feasible
- a single chart must not reuse the same resolved visual color for different visible metrics or series
- loading, empty, and error states are distinct
- telemetry chart states remain canonical: `loading`, `refreshing`, `empty`, `unsupported`, `partial`, `truncated`, `error`, and `populated`
- no fake sample series may be rendered in production empty states

## Shell layout

- **Fullscreen:** root `h-screen` / `100dvh`; no outer canvas gutter outside Sidebar + main
- Sidebar width **224px**, absolute/flush left; MainPane offset `marginLeft: 224px`
- SidebarNav `flex-grow: 1`; SidebarFooter `flex-shrink: 0` with Model inventory → Cache → Router endpoint
- Page header strip **48px**: title left, theme toggle right
- Page content: `max-w-[1216px]`, `px-4 py-5`, `gap-6`; place `PageFilters` then grid rows
- Default grid: **Template · 12-col · default** (col 84 · gutter 16 · track 1184). Allowed counts: 8 / 9 / 12 / 16 / 18 / 24
- Mobile: section rail stacks above content; secondary navigation becomes a horizontal SegmentedControl scroll row
- The shell viewport itself does not scroll; only the content frame under the shell header scrolls
- The content frame keeps scroll behavior but hides the native scrollbar chrome — only the page-content frame scrolls; content-frame scrollbar is hidden
- Route files must **not** repeat title metadata inside page content
- Preserve vendor-host escape hatches as contextual page actions or route-local references, not as global shell chrome

### Kit package

| Package | Path | Role |
| --- | --- | --- |
| `@role-model/ui` | `role-model-router/packages/ui` | Shared RM3 shell, PageFilters, SegmentedControl, MetricStrip, ChartCard/time-series/ranking/composition, Observe helpers |

Exports map to Paper inventory §A in run requirements. Kit README points at this document + Paper pages as authority.

### Shared composites (Wave 2 owners)

- `PageShell` / `SubPageHeaderBar` / `PageContent`
- `PageFilters` / `TimeRangeControl` / `FilterSelect` (time range left; labeled selects right; trigger height `34px`)
- `SegmentedControl`
- `MetricStrip` variants: `inline` · `inventory` · `badge` · `panel`
- `ChartCard` / `ChartGrid` / time-series / ranking / composition charts
- SectionCard + PanelHeader (full-bleed title band + `border-b`)

### Rollout order

1. Wave 1 — this document + `design-system.ts` authority twin + kit README scaffold
2. Wave 2 — kit port, `--rm3-*` CSS/theme, fullscreen shell, shared primitives, charts
3. Wave 3 — migrate §B routes; `/app/router/config` becomes redirect → `/app/router/strategy`
4. Wave 4 — rebuilt-runtime hybrid QA

Router SegmentedControl (Paper): **Overview · Strategy · Controller · Candidates · Decisions** only. `/app/router/config` is **redirect-only** → `/app/router/strategy` (no Paper Config artboard). Runtime JSON editing stays at `/app/system/runtime-config`.

"""

out = front + "\n" + tail
ds_path.write_text(out, encoding="utf-8", newline="\n")
print("wrote", ds_path, "bytes", ds_path.stat().st_size)
for needle in [
    "RM3",
    "Geist",
    "--rm3-",
    "redirect-only",
    "SegmentedControl",
    "chart composition rules",
    "1216",
]:
    print(needle, needle in out)
