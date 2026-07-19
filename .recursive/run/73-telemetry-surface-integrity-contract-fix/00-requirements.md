Run: `/.recursive/run/73-telemetry-surface-integrity-contract-fix/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-07-16T11:52:40Z`
LockHash: `b0bdd63637158a5c8b4b9829f85dfccf7e8374b42cd48e7be8bbd748c60ccf76`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- `/.recursive/memory/MEMORY.md`
- `/.recursive/memory/domains/runtime-routing-and-provider-capabilities.md`
- `/.recursive/run/51-runtime-testing-architecture-and-regression-matrix/00-requirements.md`
- `/.recursive/run/53-runtime-telemetry-analytics-contract-hardening/00-requirements.md`
- `/.recursive/run/60-runtime-ui-paper-linear-review-alignment/00-requirements.md`
- `/.recursive/run/63-router-backend-regression-and-telemetry-surface-hardening/00-requirements.md`
- `/.recursive/run/65-codex-subscription-prompt-cache-parity/00-requirements.md`
- `/.recursive/run/70-cache-hit-token-rate-analytics-fix/00-requirements.md`
- `docs/architecture/11-runtime-ui-telemetry-graph-matrix.md`
- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-ui/app/components/telemetry-charts.tsx`
- `role-model-router/apps/runtime-ui/app/components/telemetry-charts.test.tsx`
- `role-model-router/apps/runtime-ui/app/lib/design-system.ts`
- `role-model-router/apps/runtime-ui/app/routes/request-detail.tsx`
- `role-model-router/apps/runtime-ui/e2e/shared-surface-regression.spec.ts`
- `role-model-router/packages/provider-openai/src/index.ts`
- `role-model-router/packages/provider-openai/test/index.test.ts`
- `C:\Users\erikb\.codex\attachments\99d8d17d-daef-4e12-ac8b-1e7835e6112b\pasted-text.txt`
- Moonshot official docs validated on `2026-07-16`:
  - `https://platform.kimi.ai/docs/api/chat`
  - `https://platform.kimi.ai/docs/guide/utilize-the-streaming-output-feature-of-kimi-api`
  - `https://platform.kimi.ai/docs/api/estimate`
- user-reported screenshots and validated root-cause findings in chat on `2026-07-16`
Outputs:
- `/.recursive/run/73-telemetry-surface-integrity-contract-fix/00-requirements.md`
Scope note: This draft intentionally combines two defect families that currently break trust on the same telemetry surfaces. The run must repair upstream prompt-cache and token-accounting truth for Kimi or OpenAI-compatible coding-agent traffic, and it must repair the shared runtime-ui time-series chart layout contract that renders those metrics. The work must stay root-cause-based at the shared backend and shared frontend seams, add strict-TDD regression protection, and prove both telemetry truth and chart geometry in a browser against the rebuilt runtime from the implementation commit.

## TODO

- [x] Ground the draft in current chart ownership, prior runs, and runtime-ui memory
- [x] Convert the validated chart defects and Kimi cache or usage defects into requirement IDs
- [x] Keep scope on shared-contract repair rather than route-local symptom masking or one-off provider hacks
- [x] Normalize the combined scope into one layered telemetry-surface integrity contract
- [x] Add explicit automated regression-test requirements
- [x] Make strict TDD mandatory
- [x] Make rebuilt-runtime browser verification mandatory
- [x] Capture the user-approved draft in the run folder without locking it

## Run Metadata

- Priority: `P1`
- Run type: `full-stack bugfix`
- Primary subsystems:
  - `role-model-router/apps/runtime-host-bridge/src/index.ts`
  - `role-model-router/packages/provider-openai/src/index.ts`
  - `role-model-router/apps/runtime-ui/app/components/telemetry-charts.tsx`
- Secondary subsystems:
  - `role-model-router/packages/provider-openai/test/index.test.ts`
  - `role-model-router/apps/runtime-ui/app/routes/request-detail.tsx`
  - `role-model-router/apps/runtime-ui/app/components/telemetry-charts.test.tsx`
  - `role-model-router/apps/runtime-ui/app/lib/design-system.ts`
  - `role-model-router/apps/runtime-ui/e2e/**`
- User-visible outcome:
  - Kimi-backed runtime requests truthfully record prompt-cache intent and token usage, request-size surfaces stop reporting false-zero token counts, and shared telemetry charts no longer clip axis labels, left-shift legends, or render visibly off-center within their cards.

## System Structure

- Layer `L1` request shaping and continuity:
  - ingress prompt-cache facts, synthesized fallback keys, and final provider request shaping
- Layer `L2` response normalization and telemetry fact extraction:
  - streamed or non-streamed usage parsing, cached-token extraction, and canonical token facts
- Layer `L3` operator-visible truth surfaces:
  - request detail, activity summaries, and backend-owned request-size truth consumed by the UI
- Layer `L4` shared chart geometry:
  - axis gutters, right-axis reserve, legend inset, and plot centering in shared telemetry charts
- Layer `L5` regression and verification:
  - strict-TDD tests, browser regressions, and rebuilt-runtime proof that the repaired layers stay aligned
- Historical run-slug note:
  - the run folder slug is chart-focused for continuity, but this requirements document is the scope authority and governs the broader telemetry-surface integrity work

## Relevant Prior Runs

- `51-runtime-testing-architecture-and-regression-matrix`
  - owns the layered runtime regression strategy and the expectation that surfaced regressions receive durable automated coverage
- `53-runtime-telemetry-analytics-contract-hardening`
  - owns the telemetry analytics contract, shared chart-state semantics, and the boundary that telemetry truth is backend-owned
- `60-runtime-ui-paper-linear-review-alignment`
  - owns the current Paper/Linear runtime-ui design baseline and shared chart primitive styling
- `63-router-backend-regression-and-telemetry-surface-hardening`
  - owns current runtime-ui browser regression expectations for telemetry-heavy routes and request-detail truth surfaces
- `65-codex-subscription-prompt-cache-parity`
  - owns prompt-cache continuity expectations and the requirement that cache-supporting OpenAI-family routes preserve canonical cache semantics end to end
- `70-cache-hit-token-rate-analytics-fix`
  - owns the split-axis cache-efficiency contract and the requirement that mixed-unit cache charts remain shared primitives rather than route-local hacks

## Problem Summary

The validated defects break operator trust on both the data layer and the geometry layer of the same telemetry experience.

On the frontend, the shared time-series telemetry chart layout contract is broken, not route composition, dashboard grid sizing, or backend chart-state semantics. The current shared Recharts wrapper relies on default Recharts margins and no explicit Y-axis width, which together cause three systemic failures across the chart family:

1. left-axis tick labels clip when they need more than the currently visible gutter
2. legend items render too close to the left card border because the shared legend has no intentional horizontal inset
3. plot areas render visibly off-center, especially for dual-axis charts that reserve excess right-side space or lack a true second Y-axis

On the backend and request-detail truth path, Kimi-backed coding-agent requests are also misrepresented. The runtime currently forwards `prompt_cache_key` only when the inbound request already supplied one, so Kimi requests never mark prompt cache as requested even though Moonshot documents `prompt_cache_key` as recommended for coding agents and required to improve cache hit rates for Kimi Code Plan. Separately, streamed usage normalization only trusts top-level transcript `usage`, while official Moonshot material and live captures show final usage may arrive either top-level or nested under `choices[0].usage`, including final chunks whose `finish_reason` is `tool_calls`. That mismatch causes token usage and cached-token facts to collapse to zero for affected requests. Request-detail and activity surfaces then echo false-zero input token counts because they depend on normalized usage with no truthful fallback despite large recorded request payload sizes.

These defects are systemic because the same shared chart primitives render multiple telemetry surfaces, and the same runtime-host and provider-openai contracts feed both request detail and cache-efficiency analytics. Current mocked chart tests do not validate rendered geometry, and current Kimi regression coverage does not fully protect prompt-cache synthesis, mixed-shape streamed usage parsing, or false-zero request-size display. A shared regression can therefore affect every current and future consumer of these contracts without being caught.

## Fixed Decisions

1. This run intentionally fixes both shared telemetry truth and shared chart geometry because the same operator-facing surfaces are currently untrustworthy in both dimensions.
2. Backend ownership remains intact: prompt-cache truth, token usage truth, cache-efficiency math, and request-size truth are runtime-host or provider-contract responsibilities, not route-local UI inferences.
3. Frontend ownership remains intact: chart layout repair happens in the shared time-series chart primitive, not individual route wrappers.
4. Mixed-unit charts such as cache efficiency must continue to use split left and right Y axes, rendered as a true dual-axis chart by the shared primitive.
5. Explicit caller-supplied `prompt_cache_key` remains authoritative; any synthesized key is an additive fallback when the caller omitted one.
6. Streamed usage normalization must support all documented or observed Moonshot-compatible final-usage shapes that the current transport can emit instead of encoding a single vendor-example assumption.
7. Request-size surfaces may never display `0` unless the canonical backend truth is actually zero. When provider usage is missing or delayed, the runtime must expose a truthful fallback estimate or an explicit unavailable state rather than fabricating zero.
8. Phase 1 through Phase 5 must preserve the `L1 -> L2 -> L3 -> L4 -> L5` layering above; no route-local patch may skip an earlier owning layer.
9. Geometry-sensitive and telemetry-truth claims both require automated regression coverage plus browser verification against the rebuilt runtime from the implementation commit.

## Requirements

### `R1` Establish one canonical prompt-cache request contract for cache-supporting coding-agent traffic

Description:
The runtime must expose one canonical prompt-cache request contract for cache-supporting coding-agent requests, including the current Kimi exact-model and alias-backed paths where the active transport supports prompt caching.

Acceptance criteria:
- explicit inbound `prompt_cache_key` survives unchanged from ingress through the shared execution contract and final provider request shaping
- when the caller omits `prompt_cache_key`, the runtime synthesizes a stable cache key from the canonical logical continuity facts in this order:
  1. the runtime conversation id when the request is part of a known conversation or session
  2. a stable hash of the request's system prompt and ordered messages when no conversation id is available
  3. no synthesis when the transport or provider does not declare prompt-cache support
- the synthesized path is governed by shared capability or execution-contract rules (`promptCaching.supported`), not hard-coded to one exact model id or one UI route
- the repaired contract preserves current prompt-cache continuity semantics from prior runs, including provider-local cache-domain continuity and additive exact-model or alias routing
- request detail, telemetry, or diagnostics expose truthful `promptCacheRequested` state for the canonical request contract instead of always reporting `false` for Kimi
- if any current provider or transport remains excluded from synthesized prompt-cache requests, the exclusion is capability-driven, explicitly documented, and protected by tests rather than being an implicit omission
- the implementation records a provenance label for the cache key source (`explicit` or `synthesized`) so operators and telemetry can distinguish authoritative caller intent from additive fallback behavior

### `R2` Normalize Kimi or OpenAI-compatible usage and cached-token facts across streamed response shapes

Description:
The shared provider-normalization path must produce truthful token and cache facts for current Kimi traffic and future compatible responses even when final streamed usage arrives in more than one documented shape.

Acceptance criteria:
- provider-openai normalization handles final usage from at minimum:
  - top-level streamed `usage`
  - nested streamed `choices[0].usage`
  - non-streamed completion `usage`
- the streamed normalization path uses a documented fallback list of usage extraction paths rather than a single hardcoded shape, so future Moonshot-compatible or OpenAI-compatible shapes can be added without rewriting the core normalization logic
- the fallback list is exercised for both ordinary final text completions and tool-calling completions whose final chunk ends with `finish_reason: "tool_calls"`
- normalized cache facts preserve documented cached-token and cache-write-token fields without rewriting totals or downgrading supported-zero cache results to unsupported
- the implementation continues to support currently working OpenAI-family usage shapes while adding the missing Moonshot-compatible shape support
- if `stream_options.include_usage` is introduced for Kimi or another compatible transport, it is added through a shared capability-aware request-shaping rule and does not replace the requirement to parse nested final-usage shapes
- telemetry rows for newly generated Kimi requests no longer collapse token usage to zero when the upstream response supplied usage facts in one of the supported shapes
- the final provider wire request for a streamed Kimi or compatible request is asserted to contain the expected usage-enabling shape and any synthesized `prompt_cache_key` in regression coverage

### `R3` Make request-size and input-token surfaces truthful when provider usage is absent, delayed, or previously dropped

Description:
Operator-visible request-size surfaces must stop presenting false-zero token counts for non-zero requests merely because provider usage facts were unavailable, delayed, or failed normalization. The runtime must expose a canonical fallback that is truthful, failure-safe, and clearly labeled.

Acceptance criteria:
- request-detail and equivalent runtime activity surfaces no longer show `0 input tokens` for materially non-zero requests solely because normalized usage is absent
- the backend owns one canonical fallback for request-size truth, sourced from the actual outbound request shape using a fast, failure-safe estimate path (e.g., character or byte count with a documented per-provider-family multiplier, or a lightweight tokenizer when available)
- if the estimate path cannot produce a value, the surfaced state is explicitly `unavailable` or equivalent rather than `0`
- every token count surfaced from the fallback path carries a provenance label (`measured`, `normalized`, `estimated`, or `unavailable`) so the UI and analytics can distinguish truth sources
- the same canonical token-truth source is consumable by all current operator surfaces that show request-size facts, including request detail and any activity or summary surfaces already backed by runtime-host truth
- `0` is only rendered when the canonical backend truth is genuinely zero
- estimate failure cannot corrupt execution or telemetry aggregation; the estimate path is isolated and its failure surface is logged or surfaced as `unavailable`
- the fallback applies primarily to display truth and telemetry ingestion; if it is used to repair an aggregated metric such as `cacheHitTokenRate`, the provenance is recorded as `estimated` and the metric definition itself does not change
- the fix does not require historical backfill of old telemetry rows unless Phase 1 proves an existing repo-owned backfill mechanism is already in scope; new requests and live response normalization are the authoritative repair target

### `R4` Preserve cache-efficiency and telemetry ownership semantics while repairing the truth source

Description:
This run must repair the source-of-truth defects without destabilizing the current analytics contract, routing receipts, or ownership boundaries established by prior runs.

Acceptance criteria:
- the run does not change cache-efficiency metric definitions, telemetry query semantics, route-level chart inventory, or routing decision semantics beyond repairing false-zero or false-unsupported facts
- the backend-owned `cacheHitTokenRate` contract from run `70` remains `sum(cacheReadTokens) / sum(inputTokens)` for cache-supported rows; because the repair now supplies truthful input tokens for Kimi, observed values may change, but the definition does not
- supported cache misses remain represented as supported-zero values rather than being reclassified as unsupported
- request detail, activity-summary, and telemetry surfaces continue to consume backend truth rather than inferring provider support or token counts from UI heuristics
- if a canonical fallback or estimate path is introduced for `R3`, that path is shared backend truth and not a divergent per-route formatting rule; the provenance label (`measured`, `normalized`, `estimated`, or `unavailable`) travels with the fact through every consumer
- no new parallel telemetry store, route-local provider parser, or route-local Kimi special-case surface is introduced to bypass shared runtime contracts

### `R5` Establish one canonical shared layout contract for time-series telemetry charts

Description:
Replace the current brittle chart layout math with a canonical shared contract for time-series telemetry charts that explicitly governs axis gutter space, legend inset, right-axis reserve, and plot centering.

Acceptance criteria:
- the shared time-series chart primitive owns one canonical layout contract for:
  - left-axis label gutter
  - right-axis label reserve
  - legend inset or alignment
  - plot centering within the card
- the repaired contract is shared by line, area, and bar time-series telemetry charts rather than duplicated per chart kind or route
- the implementation explicitly supports a mixed-unit or split-axis mode for charts such as `Cache Efficiency Trend`; when the chart definition includes metrics with incompatible units (e.g., token volume and rate), the shared primitive renders a left Y-axis for tokens and a right Y-axis for rate, each with its own scale and label gutter
- the implementation no longer relies on an ungoverned negative visible-margin hack or on Recharts default margins as the primary mechanism for fitting left-axis labels
- the shared layout contract is represented as an explicit exported config object (e.g., `telemetryChartLayoutContract`) with named fields for `leftAxisGutter`, `rightAxisReserve`, `legendInset`, `plotMargin`, and `plotHeight`
- future chart kinds or route consumers can import the contract and override only the fields they need without reintroducing magic numbers
- the contract is documented in `DESIGN_SYSTEM.md` or `docs/architecture/11-runtime-ui-telemetry-graph-matrix.md`
- the repair preserves the current shared telemetry-chart ownership model and does not introduce route-local wrappers to compensate for shared primitive defects

### `R6` Eliminate clipping, repair legend alignment, and restore plot centering across the shared chart family

Description:
The shared layout contract must visibly repair the current chart defects for representative current and future axis and legend cases.

Acceptance criteria:
- left-axis labels render fully for representative single-digit, multi-digit, and wide formatted tick cases used by current telemetry charts
- right-axis labels render fully on split-axis charts without forcing excess blank space beyond what the labels require
- representative formatting cases covered by this run include at minimum:
  - multi-digit integer left-axis labels
  - decimal or fractional right-axis labels on split-axis charts
  - zero-value boundary labels
- legends for affected time-series charts render with intentional inset from the left card border and remain aligned for single-series and multi-series charts
- single-axis charts no longer appear visibly shifted because of asymmetric left or right layout math
- dual-axis charts no longer reserve avoidable empty right-side space beyond the actual right-axis label requirement; the right-axis reserve is sized to the actual right-axis labels, not a fixed excess
- Overview and Observe charts that reuse the shared time-series primitive inherit the fix without route-local overrides
- the split-axis cache-efficiency charts remain truthful and continue to render separate left and right units after the geometry repair
- any shared legend change does not regress long-label ranking-chart readability if the same legend primitive is reused there

### `R7` Add strict-TDD automated regression coverage for both telemetry truth and chart layout contracts

Description:
The run must use strict TDD and add automated regression tests that protect the repaired backend and frontend contracts rather than only checking happy-path structure.

Acceptance criteria:
- `03-implementation-summary.md` declares `TDD Mode: strict`
- every production-code change for `R1` through `R6` is preceded by a failing owning automated test and recorded in the Phase 3 TDD evidence
- existing mocked `recharts` tests may remain, but they are no longer the only regression net for geometry-sensitive behavior
- the automated regression matrix is explicitly layered by owning subsystem:
  - runtime-host-bridge for prompt-cache request shaping and surfaced token-truth facts
  - provider-openai for streamed or non-streamed usage normalization, cached-token extraction, and final wire-request shape
  - runtime-ui for request-size display truth, shared chart-layout invariants, and request-detail rendering
- automated regression coverage exists for at minimum:
  - explicit `prompt_cache_key` forwarding
  - synthesized prompt-cache-key generation when the caller omitted one, including the capability-driven exclusion rule
  - truthful `promptCacheRequested` state after synthesis or explicit forwarding
  - cache-key provenance label (`explicit` or `synthesized`) recorded in request detail or telemetry diagnostics
  - streamed top-level `usage` normalization
  - streamed nested `choices[0].usage` normalization for a final `stop` case
  - streamed nested `choices[0].usage` normalization for a final `tool_calls` case
  - non-streamed completion `usage` normalization
  - supported-zero cache-miss handling that must remain zero rather than becoming unsupported
  - request-size display truth for a non-zero request whose provider usage is absent or delayed, proving the fallback path
  - request-size display truth for the same surface when normalized usage is present, so measured and fallback paths cannot diverge silently
  - token-truth provenance labels (`measured`, `normalized`, `estimated`, `unavailable`) exposed in request detail or telemetry diagnostics
  - one single-axis line chart
  - one dual-axis line chart with mixed-unit metrics
  - one area chart
  - one bar time-series chart
- automated coverage asserts observable contract behavior, rendered geometry, or stable data-testid markers, not only component presence or prop names
- one regression test explicitly protects against reintroducing left-axis clipping through shared margin and width coupling
- one regression test explicitly protects against reintroducing excess right-side reserve on dual-axis charts
- one regression test explicitly protects shared legend inset or alignment
- one regression test explicitly protects the split-axis mixed-unit rendering contract
- one regression test explicitly protects against Kimi or compatible requests regressing back to false-zero prompt-cache-requested state
- one regression test explicitly protects against Kimi or compatible requests regressing back to false-zero token usage when the upstream transcript supplied usage
- one regression test explicitly protects the explicit-caller-cache-key authority rule (synthesis must not override an explicit `prompt_cache_key`)
- one regression test explicitly protects the token-truth provenance label contract
- where deterministic repo fixtures already cover both exact-model and alias-backed routing for the affected provider family, at least one prompt-cache or token-truth regression must exercise each path; otherwise the uncovered path must be recorded explicitly in Phase 1 and covered by rebuilt-runtime proof

### `R8` Extend browser regression protection for real telemetry truth and chart geometry

Description:
Because the current defect class is visible in real runtime surfaces, the run must extend browser regression protection so both chart geometry and token-truth regressions are caught on rendered pages.

Acceptance criteria:
- the run adds or updates browser regression coverage for real operator surfaces that render the shared time-series chart primitive and request-token truth surfaces
- browser regression coverage includes at minimum:
  - one Overview route chart using the single-axis shared primitive
  - one Overview or Observe route chart using the dual-axis shared primitive
  - one request-detail or equivalent operator surface that renders Kimi or compatible request token facts and provenance labels
  - one additional current consumer from the shared time-series chart family
- the browser regression dataset uses the canonical QA seeding mechanism (`role-model-router/apps/runtime-host-bridge/scripts/start-for-qa.ts` and `testdata/router-runtime/fixtures`) so the data is deterministic and reproducible
- the browser regression dataset or fixture set includes at least one case that would fail on the current chart-clipping layout bug and at least one request case that would fail on the current false-zero token-display bug
- the browser assertions are strong enough to catch the current defect classes, including clipped labels, left-flush legends, visibly off-center plots, false-zero input-token display, or incorrect unavailable-state rendering
- the regression net remains CI-safe and offline-safe within the repository's existing browser-testing harness expectations
- if screenshot proof is used, it is tied to deterministic seeded or stable runtime data rather than brittle ambient runtime state

### `R9` Require rebuilt-runtime browser verification on the implementation commit for both live telemetry truth and chart layout repair

Description:
Phase 5 must prove the repaired telemetry truth and geometry in a browser against the rebuilt runtime from the implementation commit. This is mandatory and cannot be replaced by mocked tests, dev-only preview proof, or a generic equivalent environment.

Acceptance criteria:
- `05-manual-qa.md` declares a browser verification path against the rebuilt runtime from the implementation commit
- verification is run on the rebuilt runtime itself, not only on mocked or unit tests, story-style previews, or unrebuilt local dev pages
- Phase 5 verification must start the rebuilt runtime on a dedicated non-conflicting test port and must not disturb, stop, restart, rebind, or otherwise interfere with any already-running runtime process on `:3456`
- verification includes at minimum:
  - one representative Kimi or compatible request path proving prompt-cache-requested truth
  - one representative Kimi or compatible request path proving non-fabricated token usage and request-size display truth
  - one representative single-axis shared chart
  - one representative dual-axis shared chart
  - one additional current shared time-series chart consumer
- verification explicitly confirms:
  - prompt cache is requested when the canonical contract says it should be, and the request-detail or telemetry surface shows `promptCacheRequested: true` or equivalent
  - token usage is populated when the upstream response supplied supported usage facts, and the request-size surface shows a non-zero, non-fabricated value
  - request-size surfaces do not show false-zero token counts; estimated or unavailable states are labeled as such
  - left-axis labels are fully visible
  - right-axis labels are fully visible where applicable
  - legends are inset correctly from the card border
  - plot areas are visually centered and no longer carry avoidable right-side bias
- verification records:
  - rebuilt-runtime startup command
  - the dedicated verification port used, which must be different from `3456`
  - endpoint or port
  - exact routes visited
  - request ids or equivalent seeded identifiers used for proof
  - screenshots or equivalent evidence paths
- verification includes negative-case evidence where possible: a request or chart that previously exhibited the false-zero or clipping defect and now renders correctly, with the before state recorded in Phase 1 or prior run evidence
- if live Kimi verification is blocked by runtime state, missing endpoint eligibility, or unavailable benchmark or routing prerequisites, the blocker is recorded explicitly and separately from deterministic automated proof; it may not be silently omitted
- rebuilt-runtime browser verification is mandatory for closeout; there is no equivalent-environment fallback

## Out of Scope

- `OOS1`: changing telemetry analytics formulas, metric definitions, or support-state semantics beyond repairing false-zero or false-unsupported source facts
- `OOS2`: redesigning chart colors, typography, or route-level analytics composition
- `OOS3`: migrating from Recharts to a different charting library
- `OOS4`: adding analytics charts to setup or control pages that do not currently own them
- `OOS5`: historical telemetry backfill, telemetry seeding redesign, or unrelated chart feature work
- `OOS6`: provider catalog redesign, benchmark-policy redesign, or unrelated auth or endpoint lifecycle work
- `OOS7`: modifying the request-detail UI to infer provider-specific facts that belong in runtime-host or provider normalization layers

## Constraints

- preserve the shared telemetry-chart ownership boundaries established by run `53-runtime-telemetry-analytics-contract-hardening`
- preserve the current Paper or Linear runtime-ui visual baseline from run `60-runtime-ui-paper-linear-review-alignment`
- preserve the split-axis cache-efficiency contract from run `70-cache-hit-token-rate-analytics-fix`
- preserve the prompt-cache continuity expectations from run `65-codex-subscription-prompt-cache-parity`
- preserve the `L1 -> L2 -> L3 -> L4 -> L5` layering defined in `## System Structure`
- prefer one shared chart-layout repair over route-local special casing
- prefer one shared prompt-cache or usage-contract repair over route-local Kimi-only display hacks
- explicit inbound `prompt_cache_key` remains authoritative over any synthesized fallback; synthesis must never silently replace a caller-supplied key
- synthesized cache keys must be derived from shared continuity facts and capability rules, not from a hardcoded model or provider list
- if request-size truth uses an estimate path, the estimate must be canonical, failure-safe, documented as measured versus estimated truth, and tagged with a provenance label
- Phase 3 must use `TDD Mode: strict`, not `pragmatic`
- telemetry-truth and geometry-sensitive regressions must both be protected by automated regression tests plus rebuilt-runtime browser verification
- browser verification for closeout must run against the rebuilt runtime from the implementation commit; dev-only preview proof is insufficient
- rebuilt-runtime verification must use a non-`3456` port so the existing runtime bound to `:3456` remains undisturbed during Phase 5
- if the run changes shared legend behavior, it must verify that ranking-chart bottom legends do not regress
- if the run adds provider-request shaping such as `stream_options.include_usage`, it must be capability-aware and must not silently regress other OpenAI-compatible upstreams
- default automated verification must remain CI-safe and offline-safe

## Coverage Gate

- Requirement coverage check:
  - `R1`: establishes one canonical prompt-cache request contract, with explicit fallback precedence and provenance labels
  - `R2`: normalizes usage and cached-token facts across supported response shapes, using a fallback extraction list and wire-request assertions
  - `R3`: makes request-size and input-token surfaces truthful when usage is absent, delayed, or dropped, using a canonical, failure-safe fallback with provenance labels
  - `R4`: preserves telemetry semantics and shared ownership boundaries, including `cacheHitTokenRate` definition and token-truth provenance
  - `R5`: establishes one canonical shared chart-layout contract, represented as an exported config object with split-axis support for mixed-unit metrics
  - `R6`: eliminates clipping, legend misalignment, and plot-centering regressions, including true dual-Y-axis rendering for cache-efficiency charts
  - `R7`: requires strict-TDD automated regression coverage with layered subsystem ownership, provenance-label tests, and split-axis layout tests
  - `R8`: extends browser regression protection for real rendered pages using deterministic QA seeding
  - `R9`: requires rebuilt-runtime browser verification for closeout, including a non-`3456` port and negative-case evidence
- Out-of-scope confirmation:
  - no telemetry-contract redesign beyond repairing false-zero or false-unsupported source facts
  - no chart-library migration
  - no route inventory expansion
  - no unrelated visual redesign
  - no unrelated provider or auth redesign
  - no request-detail UI inference that bypasses shared backend truth

Coverage: PASS

## Approval Gate

- Objective readiness checks:
  - the scope is root-cause-based across both backend telemetry truth and shared frontend chart geometry
  - the scope is layered and systematic rather than an ad hoc list of unrelated fixes
  - requirement ownership is consistent across runtime-host, provider normalization, UI truth, chart layout, and verification
  - TDD is mandatory and explicit
  - regression-test expectations are concrete and layered
  - rebuilt-runtime browser verification is mandatory and explicit
  - prior-run ownership and semantic constraints are explicit
- Remaining blockers:
  - none; user approved creating the draft run artifact while leaving it unlocked

Approval: PASS
