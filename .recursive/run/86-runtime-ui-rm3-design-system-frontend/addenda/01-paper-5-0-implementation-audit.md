# Paper 5-0 · Implementation audit addenda

**Run:** 86-runtime-ui-rm3-design-system-frontend  
**Paper:** https://app.paper.design/file/01KW9C35N2G5PZRS4SBJ5678Q6/5-0  
**Scope:** Product runtime pages vs Paper `role-model v3 runtime pages` (happy-path light/dark).  
**Method:** One page family at a time; kit specimens only when clarifying IA.  
**Updated:** 2026-07-31 07:55 UTC+8

---

## Fix status (High + Med batch)

| ID | Status | Evidence |
|----|--------|----------|
| OV-2 / OV-3 | **Fixed** | `overview-chart-adapter` order/spans; vitest green; live `/app` DOM title order Token→Cache→Effective→Avoided→Latency→Success |
| OV-1 | **Fixed (placeholder)** | Leading `ChartCard` “Candidate space” + legend from endpoints; not full 3D scatter yet |
| OV-4 | **Fixed** | Sentence-case overview titles in adapter + `buildOverviewChartDefinitions` |
| OV-5 | **Fixed** | Overview filters = Breakdown / Source / Status / Difficulty only via `PageFilters` |
| OV-6 | **Fixed** | Removed Latest requests + Current endpoint inventory from overview |
| LC-1 / LC-3 | **Fixed** | `hubTo` + `isSecondaryNavPath`; Choose has no Local secondary nav; Local sidebar → Choose |
| LC-2 | **Fixed** | Removed `LlamaSwapSetupHint` from Choose happy path |
| LE-1 | **Fixed** | Endpoints inventory `<table>` Endpoint/Status/Type/Actions |
| LE-2 / LE-3 | **Fixed** | URL+token side-by-side; removed Add footnote + description |
| CH-1 / CH-2 / CH-3 / CH-6 | **Fixed** | Chat Request = Model·Prompt·Run; no receipts / lifecycle |
| AD-3 | **Fixed** | Removed Advanced “Execution readiness”; Request template nested |
| IM/AU/RR/AD titles + nest + page actions | **Fixed** | `* workspace`; nested result; no `usePageActions` |
| AU/RR panel descriptions | **Fixed** | Title-only SectionCards |
| LM/LP/LS banners | **Fixed** | Removed `LlamaSwapSetupHint`/`Banner` from Models / Policy / Swap / Logs |
| RP-1 / RP-2 / RP-3 / RP-4 | **Fixed** | Remote: no Choose RolePicker; no Models.dev catalog; no Connect link; collapsed `N roles` + expand RolePicker |
| MM-1 / MM-2 / MM-3 | **Fixed (partial)** | Models: removed MetricStrip fact strip; list-select 6+6 inventory; Make primary controller footer |
| MM-5 | **Fixed** | Selected meta denser rows (Source/Status/Endpoints/Tool/Context/Mode + Cost + Benchmark); meta under list |
| Studio 4+8 | **Fixed** | Chat/Images/Audio/Rerank/Advanced use `4fr+8fr` kit track (was `360px`) |
| CH-4 / CH-5 | **Fixed** | Chat tool rows = status dot + name + latency; Assistant MetricStrip+prose |
| LC-4 | **Fixed** | Local Choose explicit `6fr+6fr` track |
| RR-4 / AU-5 | **Fixed** | Rerank inline mono scores; Audio `SpeechPlayer` (play + waveform + clock) |
| Studio IM/AU/RR/AD gap table | **Synced** | Marked Fixed for titles, nested results, grids, no page actions |
| MM-4 | **Fixed** | Models inventory uses `ModelRoleBindingTree` (checkbox roles + expand tasks) instead of RolePicker disclosure |
| MR-1 / MB-1 | **Fixed** | Roles + Benchmark: removed MetricStrip fact strips |
| RO-1 | **Fixed** | Router overview: removed 5-col fact strip + bottom guidance band; Alias inventory + Routing candidates only |
| RS/RC/RD/RCtl | **Fixed** | Strategy master–detail + Active posture; Controller/Candidates/Decisions MetricStrip cards |
| ORQ/OR/OL | **Fixed** | Requests/Routing PageFilters in content; Routing no side rail; Logs no handoff/stream chrome |
| OA/CD | **Fixed** | Activity = MetricStrip + 8+4 (no handoff/header streams); Downstream no Provider JSON header action |
| LE-3 | **Fixed** | Local Endpoints empty state no peer-models rail |
| CU/CR | **Fixed** | Upstream 2-col inventories; Registry table only |
| SY-R | **Fixed** | System Runtime MetricStrip + 8+4 topology |
| SY-Ready/Config/Peers | **Fixed** | Readiness/Config/Peers aligned to Paper 8+4 |
| SY-Ext | **Fixed** | Extensions: Contribution posture + Recommendation ledger 8+4; inventory table; KW gate disclosure |
| SY-Stor | **Fixed** | Storage: 8+4 usage + Retention/Manual pruning; conflicts folded into pruning |
| OV-filters | **Fixed** | Overview `PageFilters` in page content (no header `usePageActions`) |
| Focused tests | **Green** | `design-system` 93 + extensions + storage-retention |

---

## Status

| # | Page family | Paper nodes | Code | Status |
|---|-------------|-------------|------|--------|
| 1 | Runtime overview | `P3V-0` / `SAN-0` | `/app` `dashboard.tsx` | Audited + fixed |
| 2 | Studio · Chat | `TEQ-0` / `U1S-0` | `/app/studio/chat` `workbench.tsx` | Audited + fixed |
| 3 | Studio · Images | `USB-0` / `UVZ-0` | `/app/studio/images` `studio-images.tsx` | Audited + fixed |
| 4 | Studio · Audio | `W7N-0` / `WB6-0` | `/app/studio/audio` `studio-audio.tsx` | Audited + fixed |
| 5 | Studio · Rerank | `WWL-0` / `X0O-0` | `/app/studio/rerank` `studio-rerank.tsx` | Audited + fixed |
| 6 | Studio · Advanced | `Z4Q-0` / `Z8I-0` | `/app/studio/advanced` `studio-advanced.tsx` | Audited + fixed |
| 7 | Local · Choose | `13RE-0` / `13UX-0` | `/app/local/choose` `local-choose.tsx` | Audited + fixed |
| 8 | Local · Endpoints | `10IG-0` / `114E-0` | `/app/local/endpoints` `local-peers.tsx` | Audited + fixed |
| 9 | Local · Peer models | `10LX-0` / `1183-0` | `/app/local/peer-models` `local-peer-models.tsx` | Audited |
| 10 | Local · Models | `10PE-0` / `588` | `/app/local/llama-swap/models` | Audited + fixed |
| 11 | Local · Host policy | `10SV-0` | `/app/local/llama-swap/policy` | Audited + fixed |
| 12 | Local · Swap history | `11K8-0` | `/app/local/llama-swap/swap` | Audited + fixed |
| 13 | Local · Logs | `11NX-0` | `/app/local/llama-swap/logs` | Audited + fixed |
| 14 | Local · Matrix | `11RM-0` | `/app/local/llama-swap/matrix` | Audited (stub matches Paper) |
| 15 | Remote · Providers | `142I-0` / `148K-0` | `/app/remote/providers` | Audited + fixed |
| 16 | Models · Models | `17D7-0` | `/app/models` `control-models.tsx` | Audited + fixed |
| 17 | Models · Roles / Benchmark | `17H3-0` / `17KZ-0` | roles + benchmark | Audited + fact strips fixed |
| 18 | Router · Overview | `1E7M-0` | `/app/router` | Audited + fixed |
| 19 | Observe · Activity | `1IYO-0` | observe-activity | Audited + fixed |
| 20 | Connect · Downstream | `1TQ2-0` | integrations-downstream | Audited + fixed |
| 21 | Router · Strategy | `1EF9-0` | control-routing-strategy | Audited + fixed |
| 22 | Router · Controller | `1EMW-0` | control-controller | Audited + fixed |
| 23 | Router · Candidates | `1EUJ-0` | router-candidates | Audited + fixed |
| 24 | Router · Decisions | `1F26-0` | router-decisions | Audited + fixed |
| 25 | Observe · Requests | `1IDK-0` | requests | Audited + fixed |
| 26 | Observe · Routing | `1IO4-0` | observe-routing | Audited + fixed |
| 27 | Observe · Logs | `1J2T-0` | observe-logs | Audited + fixed |
| 28 | Connect · Upstream | `1U0N-0` | integrations-upstream | Audited + fixed |
| 29 | Connect · Registry | `1T7R-0` | endpoints | Audited + fixed |
| 30 | System · Runtime | `1UEP-0` | runtime | Audited + fixed |
| 31 | System · Readiness | — | session-readiness | Audited + fixed |
| 32 | System · Config | — | control-runtime-config | Audited + fixed |
| 33 | System · Peers | — | system-peers | Audited + fixed |
| 34 | System · Extensions | `1VVR-0` | extensions | Audited + fixed |
| 35 | System · Storage | `1WAR-0` | storage-retention | Audited + fixed |

---

## 1 · Runtime overview

**Paper:** Runtime overview · light/dark (`P3V-0` / `SAN-0`)  
**Code:** `/app` (`dashboard.tsx` + `AppShell`)

### Aligned

- Shell: 224 sidebar + main, Overview active, live footer (models / cache / router endpoint)
- Header: “Runtime overview” + theme toggle
- Filters: `PageFilters` with time range left, labeled selects right
- Time-series charts via kit `ChartGrid` / ChartCard pattern

### Gaps

| ID | Gap | Paper | Implementation | Severity |
|----|-----|--------|----------------|----------|
| OV-1 | Candidate space | Full-width 3D scatter + legend | **Fixed (placeholder)** — Candidate space ChartCard + live legend | High → **Fixed (placeholder)** |
| OV-2 | Chart order | Token → Cache → Effective+Avoided → Latency+Success | **Fixed** | High → **Fixed** |
| OV-3 | Chart spans | Cache **12**; Success **6** | **Fixed** | High → **Fixed** |
| OV-4 | Chart titles | Sentence case | **Fixed** | Med → **Fixed** |
| OV-5 | Filters | 4 selects only via PageFilters in content | **Fixed** | Med → **Fixed** |
| OV-6 | Extra body | Charts only under filters | **Fixed** — no Latest requests / endpoint inventory | Med → **Fixed** |

### Verdict

Shell and filter chrome are mostly on-spec; the chart stack and Candidate space diverge materially from the Paper happy path. Product does not compose kit `RuntimeOverview` — it hand-wires filters + charts.

---

## 2 · Studio · Chat

**Paper:** Studio · Chat · light/dark (`TEQ-0` / `U1S-0`)  
**Code:** `/app/studio/chat` (`workbench.tsx`)

### Aligned

- Shell: Studio active, live footer, title **Chat workspace**, theme toggle
- Studio **SegmentedControl** (Chat / Images / Audio / Rerank / Advanced…)
- Rough **4+8** request/result split
- Result title **Result workspace**; **Run request** CTA; **MetricStrip** `inline` for Input / Output / Latency
- Tool calls + raw JSON present (shape differs)

### Gaps

| ID | Gap | Paper | Implementation | Severity |
|----|-----|--------|----------------|----------|
| CH-1 | Composer fields | Model · Prompt · Run request only | **Fixed** | High → **Fixed** |
| CH-2 | Request panel | Title **Request**, no description | **Fixed** | Med → **Fixed** |
| CH-3 | Invented result chrome | Assistant → Tool calls → Raw | **Fixed** — no receipt invents | High → **Fixed** |
| CH-4 | Assistant structure | One Assistant block: MetricStrip then prose | **Fixed** — MetricStrip + prose under Assistant | Low → **Fixed** |
| CH-5 | Tool calls | Simple rows (name + latency, status dots) | **Fixed** — status dot + mono name + latency ms | Med → **Fixed** |
| CH-6 | No fact strip | None | **Fixed** — no credential lifecycle banner on Chat | Med → **Fixed** |
| CH-7 | Grid | Strict 12-col **4+8** (384+784) | **Fixed** — `4fr+8fr` kit track | Low → **Fixed** |

### Verdict

Chrome and IA shell match; Chat composer still exposes Endpoint/Routing mode, and the result side invents routing/execution-receipt layouts Paper omits.

---

## 3 · Studio · Images

**Paper:** Studio · Images · light/dark (`USB-0` / `UVZ-0`)  
**Code:** `/app/studio/images` (`studio-images.tsx`)

### Aligned

- Shell: Studio active, SegmentedControl with Images selected
- Composer fields match specimen: Mode · Model · Prompt · Size (Width/Height in SDAPI mode) · **Run image request**
- Panel titles match Paper: **Image request modes** / **Image result stage**
- Result content: gallery + raw JSON (payload present)
- No FactCard strip / lifecycle banner on happy path

### Gaps

| ID | Gap | Paper | Implementation | Severity |
|----|-----|--------|----------------|----------|
| IM-1 | Page title | **Images workspace** | **Fixed** | Med → **Fixed** |
| IM-2 | Result chrome | Single panel with Generated images + Raw subsections | **Fixed** — nested in Image result stage | Med → **Fixed** |
| IM-3 | Panel descriptions | Title-only | **Fixed** | Low → **Fixed** |
| IM-4 | Header actions | Theme toggle only | **Fixed** — no `usePageActions` | Med → **Fixed** |
| IM-5 | Grid | Strict **4+8** | **Fixed** — `4fr+8fr` | Low → **Fixed** |

### Verdict

Closest Studio page so far. Field set and panel names match Paper; main misses are page title, split raw-JSON card, and header action chrome.

---

## 4 · Studio · Audio

**Paper:** Studio · Audio · light/dark (`W7N-0` / `WB6-0`)  
**Code:** `/app/studio/audio` (`studio-audio.tsx`)

### Aligned

- Composer title **Audio mode and request**; fields Mode · Model · Voice · Input · **Run audio request** (transcription swaps Voice/Input for Audio file)
- Result title **Audio result stage**; speech meta + player + captions note
- Voice inventory pills + JSON payload present
- No FactCard strip

### Gaps

| ID | Gap | Paper | Implementation | Severity |
|----|-----|--------|----------------|----------|
| AU-1 | Page title | **Audio workspace** | **Fixed** | Med → **Fixed** |
| AU-2 | Result chrome | Single stage with Speech + Voice inventory | **Fixed** — nested subsections | Med → **Fixed** |
| AU-3 | Header actions | Theme toggle only | **Fixed** — no `usePageActions` | Med → **Fixed** |
| AU-4 | Panel descriptions | Title-only | **Fixed** | Low → **Fixed** |
| AU-5 | Player chrome | Custom play + waveform | **Fixed** — `SpeechPlayer` play/pause + waveform + clock | Low → **Fixed** |
| AU-6 | Grid | Strict **4+8** | **Fixed** — `4fr+8fr` | Low → **Fixed** |

### Verdict

Field IA matches Paper closely; same structural pattern as Images — page title mismatch, split secondary card, extra header actions.

---

## 5 · Studio · Rerank

**Paper:** Studio · Rerank · light/dark (`WWL-0` / `X0O-0`)  
**Code:** `/app/studio/rerank` (`studio-rerank.tsx`)

### Aligned

- Composer: **Rerank request** with Contract · Model · Query · Candidate documents (newline textarea) · **Submit rerank request**
- No `top_k` field (matches DS)
- Result title **Ranked results**; Document N + score ledger; **Contract details** JSON present
- No FactCard strip

### Gaps

| ID | Gap | Paper | Implementation | Severity |
|----|-----|--------|----------------|----------|
| RR-1 | Page title | **Rerank workspace** | **Fixed** | Med → **Fixed** |
| RR-2 | Result chrome | Single panel with Ordered ledger + Contract details | **Fixed** — nested subsections | Med → **Fixed** |
| RR-3 | Header actions | Theme toggle only | **Fixed** — no `usePageActions` | Med → **Fixed** |
| RR-4 | Score presentation | Score inline with Document title | **Fixed** — mono tabular score, no StatusPill | Low → **Fixed** |
| RR-5 | Panel descriptions | Title-only | **Fixed** | Low → **Fixed** |
| RR-6 | Grid | Strict **4+8** | **Fixed** — `4fr+8fr` | Low → **Fixed** |

### Verdict

Strong field/IA match; same Studio pattern gaps (title, split JSON card, header actions).

---

## 6 · Studio · Advanced

**Paper:** Studio · Advanced · light/dark (`Z4Q-0` / `Z8I-0`)  
**Code:** `/app/studio/advanced` (`studio-advanced.tsx`)

### Aligned

- Composer: **Endpoint family** with Family · Model · JSON payload · **Submit advanced request**
- Result title **Response workspace**; Request template JSON adjacent
- SegmentedControl Studio nav with Advanced active
- No FactCard invent metrics strip on Paper happy path

### Gaps

| ID | Gap | Paper | Implementation | Severity |
|----|-----|--------|----------------|----------|
| AD-1 | Page title | **Advanced workspace** | **Fixed** | Med → **Fixed** |
| AD-2 | Result chrome | Single Response workspace with Request template nested | **Fixed** | Med → **Fixed** |
| AD-3 | No fact / readiness strip | None on happy path | **Fixed** — no Execution readiness | High → **Fixed** |
| AD-4 | Header actions | Theme toggle only | **Fixed** — no `usePageActions` | Med → **Fixed** |
| AD-5 | Panel descriptions | Title-only | **Fixed** | Low → **Fixed** |
| AD-6 | Grid | Strict **4+8** | **Fixed** — `4fr+8fr` | Low → **Fixed** |

### Verdict

Composer fields match; Advanced reintroduces readiness chrome Paper omits, and splits Request template out of the result panel (same Studio pattern).

---

## Cross-cutting Studio notes

Shared gaps across Studio pages (except Chat’s unique Endpoint/Routing / receipt invents):

1. **Page titles** often use product “workflows / APIs” names instead of Paper `* workspace`.
2. **Result secondary content** (raw JSON / voice inventory / contract / request template) is a **separate SectionCard** in code; Paper nests it inside one result panel.
3. **`usePageActions`** injects Model list / endpoint shortcuts; Paper header is title + theme toggle only.
4. Grid uses `360px` rail instead of strict 12-col **4+8** (384+784).
5. **Chat** is the outlier with High severity IA invents (Endpoint, Routing mode, routing receipt, execution receipts, lifecycle banner).

---

## 7 · Local · Choose

**Paper:** Local · Choose · light/dark (`13RE-0` / `13UX-0`)  
**Code:** `/app/local/choose` (`local-choose.tsx`)

### Aligned

- Title **Choose local backend**; Local active in sidebar; theme toggle
- **No SegmentedControl** on Paper hub (hub only)
- **6+6** option cards: External server / Peer-backed models vs Managed by role-model / Llama-swap models
- Copy and CTAs match (Open peer models · Configure endpoints · Open llama-swap models · Edit runtime config)

### Gaps

| ID | Gap | Paper | Implementation | Severity |
|----|-----|--------|----------------|----------|
| LC-1 | SegmentedControl on hub | Omitted on Choose | **Fixed** — `isSecondaryNavPath` + hubTo | High → **Fixed** |
| LC-2 | Setup banner | Happy path has none | **Fixed** | Med → **Fixed** |
| LC-3 | Sidebar Local entry | Hub is Choose | **Fixed** — `hubTo: /app/local/choose` | Med → **Fixed** |
| LC-4 | Card chrome | Soft option cards on 12-col track | **Fixed** — explicit `6fr+6fr` chooser track | Low → **Fixed** |

### Verdict

Content IA matches Paper well; shell wiring incorrectly attaches Local SegmentedControl to the Choose hub.

---

## 8 · Local · Endpoints

**Paper:** Local · Endpoints · light/dark (`10IG-0` / `114E-0`)  
**Code:** `/app/local/endpoints` (`local-peers.tsx`)

### Aligned

- Title **Local endpoints**; SegmentedControl Local nav (Endpoints active)
- Stacked SectionCards: **Endpoint inventory** + **Add peer endpoint**
- Field labels / CTA: Endpoint URL · Auth token · **Add endpoint**
- Status via Badge/StatusPill (`healthy` / `unknown`)

### Gaps

| ID | Gap | Paper | Implementation | Severity |
|----|-----|--------|----------------|----------|
| LE-1 | Inventory presentation | DS **Table** | **Fixed** | High → **Fixed** |
| LE-2 | Add form layout | URL + token side-by-side | **Fixed** | Med → **Fixed** |
| LE-3 | Extra copy | Compact panel | **Fixed** — no peer-models empty-state rail | Low → **Fixed** |

### Verdict

IA/titles match; inventory must become a Table to match Paper/DS.

---

## 9 · Local · Peer models

**Paper:** Local · Peer models · light (`10LX-0`) · dark (see status)  
**Code:** `/app/local/peer-models` (`local-peer-models.tsx`)

### Aligned

- Title **Peer models**; Local SegmentedControl with Peer models active
- Stack: **Register model** (Model ID · Roles · Register) + **Registered models** cards
- Card actions: Save roles · Re-register · Remove from router
- Role picker / badges present; no FactCard strip

### Gaps

| ID | Gap | Paper | Implementation | Severity |
|----|-----|--------|----------------|----------|
| LP-1 | Register helper copy | Panel description + roles helper (matches Paper tree) | **Aligned** | Low → **Aligned** |
| LP-2 | Empty / blocked states | Happy-path specimen assumes peers exist | Extra “Open endpoints” gated empty states (acceptable product) | Low |

### Verdict

Strong match to Paper happy path; gaps are mostly empty-state/helper copy.

---

## 10 · Local · Models (llama-swap)

**Paper:** Local · Models · light (`10PE-0`)  
**Code:** `/app/local/llama-swap/models` (`local-llama-swap-models.tsx`)

### Aligned

- Title **Llama-swap models**; Local SegmentedControl; Load model + Loaded models
- Fields: Model ID · Role summary · Load model · Declared in config · RolePicker · Open runtime config
- Loaded cards: Save roles · Reload · Unload · Overrides

### Gaps (pre-fix)

| ID | Gap | Paper | Implementation | Severity |
|----|-----|--------|----------------|----------|
| LM-1 | Setup banner | Happy path has none | Conditional `LlamaSwapSetupHint` prominent | High → **Fixed** |
| LM-2 | Extra helper copy | Declared + Open runtime config only | Extra “Assign roles before loading” + non-operational scaffold note | Med → **Fixed** |

### Verdict

IA matches Paper after removing setup banner and extra helper copy.

---

## 11–14 · Local · Host policy / Swap / Logs / Matrix

**Paper:** `10SV-0` · `11K8-0` · `11NX-0` · `11RM-0`  
**Code:** `local-policy` · `local-swap` · `local-logs` · `local-matrix`

### Aligned

- Host policy: Policy configuration (TTL · Max concurrency · Auto-unload · Save/Reset/Open models) + Raw policy
- Swap: Event ledger with timestamp · reason · model transition rows
- Logs: Structured local log history table + Raw log streams
- Matrix: explanatory stub (Redirect target · Shared inventory) — matches Paper; DS allows stub

### Gaps (pre-fix)

| ID | Gap | Paper | Implementation | Severity |
|----|-----|--------|----------------|----------|
| LH-1 | Setup banners | None on happy path | `LlamaSwapSetupBanner` on Policy / Swap / Logs | Med → **Fixed** |

### Verdict

Local remaining pages align after banner removal; Matrix stub is intentional.

---

## 15 · Remote · Providers

**Paper:** Remote · Providers · light (`142I-0`)  
**Code:** `/app/remote/providers` (`providers.tsx`)

### Aligned (post-fix)

- **0.95+1.05** Choose · Configured split; no SegmentedControl; no FactCards
- Choose: Provider · Connection method · connection id · Credential · Model · Save (no RolePicker)
- Configured: account groups; collapsed model title + healthy + `N roles` + expand RolePicker / Save roles
- OAuth metadata kept when OAuth method selected

### Gaps (pre-fix → fixed)

| ID | Gap | Paper / DS | Implementation | Severity |
|----|-----|------------|----------------|----------|
| RP-1 | RolePicker in Choose | Forbidden; default all roles | RolePicker under Model | High → **Fixed** |
| RP-2 | Models.dev catalog panel | Forbidden on Remote | Catalog models / API base / SDK / Docs | High → **Fixed** |
| RP-3 | Connect registry CTA | Forbidden | “View in Connect registry” | Med → **Fixed** |
| RP-4 | Collapsed roles IA | Title + healthy + N roles | Routing/benchmark pills + role chip wall | High → **Fixed** |

### Verdict

Remote Providers now matches CardStack collapsed-roles IA and Choose field set.

---

## 16 · Models · Models

**Paper:** Models · Models · light (`17D7-0`)  
**Code:** `/app/models` (`control-models.tsx`)

### Aligned (post-fix)

- Title **Configured models**; SegmentedControl Models/Roles/Benchmark
- Single **Model inventory** SectionCard with **6+6** list select (leading bar + muted) + selected meta
- Controller is badge only; footer **Make primary controller** · Open Roles · Open Benchmark
- No MetricStrip fact strip

### Gaps remaining

| ID | Gap | Paper | Implementation | Severity |
|----|-----|--------|----------------|----------|
| MM-5 | Selected meta fields | Source/Status/Endpoints/Tool/Cost/Benchmark labeled rows | **Fixed** — `buildSelectedModelMetaPanel` + left-column Selected meta under inventory list | Low → **Fixed** |

### Verdict

Inventory list-select + roles→tasks binder match Paper; remaining polish is selected-meta density.

---

## 17 · Models · Roles / Benchmark

**Paper:** `17H3-0` / `17KZ-0`  
**Code:** `control-roles.tsx` / `control-benchmark.tsx`

### Gaps fixed

| ID | Gap | Severity | Status |
|----|-----|----------|--------|
| MR-1 | MetricStrip fact strip on Roles | Med | **Fixed** |
| MB-1 | MetricStrip fact strip on Benchmark | Med | **Fixed** |

### Verdict

Happy-path pages no longer lead with invented summary strips; Run/Scores/Taxonomy stack remains.

---

## 18 · Router · Overview

**Paper:** `1E7M-0`  
**Code:** `router.tsx`

### Aligned

- Title **Routing overview**; SegmentedControl; **Alias inventory** (active · readiness · modes + expand pools) · **Routing candidates** table

### Gaps fixed

| ID | Gap | Severity | Status |
|----|-----|----------|--------|
| RO-1 | Top 5-col Strategy/Execution/Controller fact strip + bottom guidance band | Med | **Fixed** |

### Verdict

Overview now matches Paper’s Alias inventory → Routing candidates composition.

---

## 19–20 · Observe Activity / Connect Downstream

**Paper:** `1IYO-0` / `1TQ2-0`  
**Code:** `observe-activity.tsx` / `integrations-downstream.tsx`

### Verdict

Activity MetricStrip + Recent host activity / Capture inspector match Paper. Downstream Connection contract + Consumer setup + MetricStrip match Paper. No High gaps.

---

## Severity key

- **High** — contradicts Paper happy path or documented DS rule; visible IA/layout mismatch
- **Med** — wrong labels, extra chrome, or secondary sections not on specimen
- **Low** — spacing/track/copy polish
