# S407 — R9/R10 chart & ranking interaction characterization

Worktree: `D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration` · HEAD `db5b135b` · evidence doc only, no product edits, no commit.

## 1. Inventory — what charts exist and who renders them

| Chart | Renderer | Data contract | Caller |
| --- | --- | --- | --- |
| Token usage / Latency / Success-vs-failure cards | `chartView` from `role-model-router/packages/ui/src/foldkit-chart.ts:294` | `series: { id, label, points: { label, value: number|null }[] }` (`:68-80`), `state` (`:87-93`) | `apps/runtime-ui-next/src/view.ts:661-670` (Dashboard/Index) |
| Model pool cost strip | hand-authored SVG in `apps/runtime-ui-next/src/view.ts:633-658` | overview metrics rows (`bucketsFor`, `view.ts:537-580`) | Dashboard `view.ts:633-671` |
| Original telemetry charts | recharts in `apps/runtime-ui/app/components/telemetry-charts.tsx` | telemetry analytics rows | original dashboard/requests |
| Original candidate-space (model pool) | `apps/runtime-ui/app/components/candidate-space-chart.tsx:251` | `points` only (`:116`) | `app/routes/dashboard.tsx:312` |
| Chart interaction state machine | `packages/ui/src/foldkit-chart-interaction.ts:1-100` | `ChartInteractionState` (tooltip, hiddenSeriesIds, range, requestToken) | **NONE** — no import in `apps/runtime-ui-next/src` (grep result empty) |

Chart primitive tests: `packages/foldkit/test/s13b-foldkit-chart.test.ts:87-320` (pure SVG, accessible table, ragged series, loading/error/stale/truncated/no-data states, determinism).
Dashboard bucket tests: `apps/runtime-ui-next/test/s40b-overview.test.ts:39-140` (p95 nearest-rank, empty buckets, object tokens, Week switch ignores late Day response, fabricated-body rejection).

## 2. Exists / missing interaction table (original React vs Foldkit shell)

| Interaction | Original | Foldkit capability | Wired in shell? | Verdict |
| --- | --- | --- | --- | --- |
| Hover / point tooltip | recharts `<Tooltip>` + cursor in telemetry charts (`telemetry-charts.tsx:377,431,484,526`; content `:205`) | `Rm3ChartInteraction.tooltip` + `onShowPoint/onHideTooltip` (`foldkit-chart.ts:95-103`), point `OnMouseEnter/OnClick` (`:486-502`), tooltip node + live region (`:511-552`) | **NO** — dashboard calls pass only title/series/state/yUnit (`view.ts:661-670`), no `interaction` | **MISSING wiring** (capability exists) |
| Tooltip dismissal / Escape | cursor leaves chart (recharts) | `onHideTooltip` message exists; **no** Escape/keydown handler in `foldkit-chart.ts` (no `OnKey*` matches) | NO | MISSING (also primitive gap) |
| Series hide/show via legend | not present in original telemetry charts | legend buttons with `aria-pressed` + `onToggleSeries` (`foldkit-chart.ts:560-593`), hidden series omitted from chart and table (`:296-299`) | NO | Capability beyond parity, unwired |
| Range / window switch | dashboard `timeRange` state rebuilds chart definitions (`dashboard.tsx:120-135`), URL params | readback refresh tokens + resync (`update.ts:206-308`, handler `:656`); interaction module `SwitchRange/RangeLoaded` token fence (`foldkit-chart-interaction.ts:55-100`) | readback window switch wired via shell, **interaction range model unused** | PARTIAL (data path only) |
| Zoom / pan | none found in original charts | none | — | NOT A PARITY GAP |
| Point selection / keyboard | candidate chart: `role="img"` + `aria-label` (`:128-129`), computed `point.selected` highlight (`:210,220,285`), `aria-hidden` layer (`:272`); **no click/key/focus handlers** | points are `tabindex=0` with `aria-label` + click/mouseenter (`foldkit-chart.ts:486-502`); **no Enter/Space/Escape** | NO | Keyboard/selection gap both sides; next has partial a11y |
| Accessible numeric table | recharts tooltip only (limited) | always-present HTML table (`foldkit-chart.ts:629`, test `:107`) | YES (primitive) | Next ahead of original |
| Loading / error / empty / stale / truncated state | per-page Loading/Error/Empty states around charts | explicit states + notices (`foldkit-chart.ts:87-93,311-355`; tests `:213-301`) | **NO for dashboard charts** — callers hard-code `state: { status: "ready" }` (`view.ts:661-670`) regardless of readback status | MISSING (honesty gap) |
| Lifecycle dispose / re-init on route change | charts are declarative; page effect with `disposed` flag + cleanup (`dashboard.tsx:120,195-196`); live-refresh subscription unsubscribe (`lib/live-refresh.ts:6-29`) | chart = pure deterministic markup (`foldkit-chart.ts:294-630`; determinism test `:311`), no imperative instance → no dispose needed; route changes reset readbacks and bump tokens (`update.ts:276-290`), refresh resync token (`:206-308`) | shell readback lifecycle YES; chart-local interaction lifecycle N/A | NO CHART DISPOSE NEEDED; unwired interaction token ownership is the real gap |
| Model pool hover/select | candidate chart is visual only (no handlers) | hand-authored SVG: `aria-label`, focusable circles, sr-only table (`view.ts:654-658`) | no hover/select | parity (both non-interactive) |
| Ranking: top-3 ranked endpoints + full ranking disclosure | `learning.tsx:1026-1032` (top-3 + full ranking), `:1085-1146` (rank rows/denominator) | none | **NO** — learning is readback-only (`view.ts:825-831`) | MISSING, but belongs to M9 learning family |
| Ranking: Activate / Roll back per task | `learning.tsx:1188-1196` (`onToggle`), summary `:2042-2043` | none | NO | MISSING (M9) |
| Ranking: Requests ranking metric/target filters | `requests.tsx:471-482` (Ranking metric, Ranking target → `updateParam`) | Requests is a generic readback page (`view.ts:884`) | NO | MISSING (M9/requests slice) |

## 3. Data contracts (real shapes)

- Chart series: `ChartSeries` and `ChartPoint` (`foldkit-chart.ts:68-80`); values may be `null` (empty bucket) and ragged series are supported (`s13b` test `:122`).
- Overview buckets: `bucketsFor(state, windowMs)` builds `Bucket[]` with `tokens/avg/p95/success/failure/empty` from `readbacks.overviewMetrics` (`view.ts:537-580`); series values are `bucket.empty ? null : value` (`:661-670`).
- Chart status is caller-supplied (`ChartState`, `foldkit-chart.ts:87-93`); the primitive derives empty when usable series are absent (`:300-301`).
- Tooltip contract is `{ seriesId, label }` (`foldkit-chart-interaction.ts:10-13`), resolving the point by `(seriesId, label)` (`foldkit-chart.ts:511-524`) — no point index or numeric value in the message, so the consumer cannot show a stale value for a relabeled series.
- Ranking readbacks: `rankedCount`, top-3 `{ endpointId, rank, status }` and full `endpoint.rank` rows in the original (`learning.tsx:1085-1146`); Requests ranking dimension options at `requests.tsx:85`, selection writes `metric`/`rankBy` URL params (`:471-482`).

## 4. Caller / region table for the first slice

| Caller (file:line) | Region | Current interaction | First-slice change |
| --- | --- | --- | --- |
| `apps/runtime-ui-next/src/view.ts:661` token chart | Dashboard/Index, token card | none; forced ready | pass `interaction` + readback-derived state |
| `apps/runtime-ui-next/src/model.ts` (model fields) | shell model | no chart state | add optional chart interaction state (per chart kind id) |
| `apps/runtime-ui-next/src/message.ts` | message union | none | chart messages (ShowPoint/HideTooltip/ToggleSeries) |
| `apps/runtime-ui-next/src/update.ts` route transitions (+~270-310) | shell update | readback reset/token bump | clear chart tooltip on route change; keep token fence |
| `packages/ui/src/foldkit-chart.ts:95-103,486-593` | primitive | capability present | no change (reuse), except optional keydown support if slice includes keyboard |
| `packages/ui/src/foldkit-chart-interaction.ts:1-100` | library | unused | reuse state machine for tooltip/hidden series; do NOT adopt range until a real range loader exists |
| `apps/runtime-ui-next/test/s40a* / s40b*` | tests | bucket/rail only | new interaction/lifecycle tests |

## 5. Named first slice

**S408 — Overview token chart hover/select tooltip + honest status + route-change cleanup.**

Bounded to ONE chart (token usage card, `view.ts:661`):
1. Wire the existing `Rm3ChartInteraction` (`tooltip`, `onShowPoint`, `onHideTooltip`, `onToggleSeries`) into the token chart; use `ChartInteractionState` from `foldkit-chart-interaction.ts` for state (tooltip + hiddenSeriesIds only; do not wire `SwitchRange` yet).
2. Replace forced `state: { status: "ready" }` with the readback's real status (loading/error/empty/stale) for that chart; add tests that loading/error render the primitive notices instead of a fake chart.
3. Tooltip lifecycle: show on point click/Enter/Space (add the missing keydown support in the primitive), hide on Escape/blur; route change clears tooltip state (no stale tooltip after navigation). Keep hidden series per chart id across readback refreshes, but reset when the route changes.
4. Tests: exact point -> tooltip value; Escape hides; series toggle removes both path and table rows; loading/error/empty status honored; route change clears tooltip and tokens ignore late responses; no regression in s40a/s40b.
5. Accessibility: focusable point already exists; add `role`/label consistency and keyboard activation, and keep the numeric table as the keyboard-accessible fallback.

Out of scope for S408: range switching via the interaction module (no real range loader in the shell), zoom/pan (absent in the original), model-pool selection, camera/3D, ranking interactions (M9 learning/requests: top-3 ranking, full ranking disclosure, Activate/Roll back, Requests ranking filters).

## 6. Risks / unknowns

- `ChartInteractionState` range/token code is library-tested (S13e) but has no producer/consumer in the shell; adopting it wholesale would be dead code. S408 uses only tooltip/hidden-series.
- The chart primitive has no `OnKey*` support; S408 must extend it or accept mouse/click-only parity (original was also mouse/click-light, but the points are already tabbable, so keydown is the cheaper honest fix).
- Dashboard charts currently lie about status (`ready` hard-coded) — this is a user-visible honesty gap independent of interactions.
- Ranking interactions cannot be meaningfully ported without the M9 learning/requests readbacks; do not fake them in the chart family.
- Late-response behavior is already covered for readbacks (`s40b` "switches Week and ignores a late Day response", `s40b-overview.test.ts:106`); the first slice must not duplicate or weaken that fence.
