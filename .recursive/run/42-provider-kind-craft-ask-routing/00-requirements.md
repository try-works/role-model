Run: `/.recursive/run/42-provider-kind-craft-ask-routing/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-06-12T09:00:47Z`
LockHash: `dd54c97fbf92d93071fd60f176bec200cfe3dfe18491d328be2bd29dbde023b6`
Workflow version: `recursive-mode-audit-v2`
Inputs:
- `/.recursive/RECURSIVE.md`
- `/.recursive/STATE.md`
- `/.recursive/DECISIONS.md`
- Conversation transcript: DeepSeek remote connect failure + Craft simple chat routed to Kimi as `hard` (agent transcript `43bc0f89-dfe3-4319-bcc4-aa61b8317713`)
- **Post-run-40 product baseline (authoritative, merged to `main` @ `f4e951f`):**
  - `/.recursive/run/40-catalog-economics-moonshot-consolidation/00-requirements.md` (`R0`–`R10`, locked)
  - `/.recursive/run/39-runtime-session-rehydration-model-inventory/00-requirements.md` (`R11`/`R15` ask-mode last-user-turn burden)
- Code baseline (post-run-40 `main` @ `f4e951f`):
  - `role-model-router/packages/provider-account/src/index.ts` (`validateProviderAccounts`, `PROVIDER_KIND_MISMATCH`)
  - `role-model-router/packages/catalog/data/normalized-catalog.json` (models.dev `provider-${providerId}` kinds)
  - `role-model-router/packages/catalog/src/litellm-catalog.ts` (`KNOWN_PROVIDER_OVERRIDES`)
  - `role-model-router/apps/runtime-host-bridge/src/index.ts` (`listProviders`, `upsertProviderAccount`, `summarizeDifficultySignals`)
  - `role-model-router/apps/runtime-ui/app/routes/providers.tsx` (account upsert payload)
  - `role-model-router/apps/runtime-host-bridge/test/craft-ask-difficulty.test.ts`
Outputs:
- `/.recursive/run/42-provider-kind-craft-ask-routing/00-requirements.md`
Scope note: Run 42 closes two operator-facing regressions on packaged runtime `:3456`: (1) **systemic** remote provider connect failure when catalog and LiteLLM disagree on operator metadata for catalog∩LiteLLM overlap (**19 providers today** — audit below); and (2) Craft-style chat with declared tools but no active tool usage misclassified as `hard`/`quality` and routed to Kimi instead of local easy/cost paths.
## TODO

- [x] Declare post-run-40 product baseline as implementation starting point
- [x] Document motivating gaps (providerKind split-brain, Craft declared-tools rubric inflation)
- [x] Define stable `R#` identifiers with observable acceptance
- [x] Record fixed decisions for metadata precedence and ask-mode semantics
- [x] Unify provider connect under one systemic requirement (no DeepSeek exception)
- [x] Record strict TDD and verification discipline per requirement
- [x] Merge overlap audit into main requirements doc (no separate addendum)
- [x] Record out-of-scope boundaries
- [x] User approval of run creation and requirements draft (2026-06-12)
- [x] Complete Coverage Gate checklist (controller self-audit before lock)
- [x] Complete Approval Gate checklist (user lock approval 2026-06-12)

## Prerequisite — post-run-40 product baseline

Run 42 implementation **must branch from post-run-40 `main`**, which includes merged catalog economics, Moonshot consolidation, and run 39 session rehydration behavior.

| Field | Value |
| --- | --- |
| Baseline commit | `f4e951f` (post-run-40 `main`, PR #16) |
| Packaged-runtime proof surface | `:3456` SEA with local peer + Kimi + `mixed.local-remote` alias |
| Prior ask-mode work | Run 39 `R11`/`R15` last-user-turn burden applies only when `toolCount === 0` |

### What exists after run 40 (starting truths)

**Provider onboarding**

- `GET /api/role-model/providers` merges normalized catalog providers with LiteLLM-derived providers.
- `POST /api/role-model/accounts` validates via `validateProviderAccounts({ catalog, additionalProviders: liteLLMProviders })`.
- LiteLLM `additionalProviders` **overwrite** catalog entries in the validation map when `providerId` collides.
- UI sends `providerKind` from `listProviders()` unchanged into account upsert.

**Craft difficulty routing**

- Run 39 `R11`/`R15` uses last user turn for burden when `toolCount === 0`.
- Craft Agents sends declared tools on every request even for plain chat.

### Post-run-40 gaps (motivation for run 42)

| Gap | Observed behavior | Impact |
| --- | --- | --- |
| **G1** Provider metadata split-brain | `listProviders` uses catalog row; validation uses LiteLLM overwrite on collision | **19/23** overlap providers fail connect with `PROVIDER_KIND_MISMATCH` |
| **G2** Unguarded overlap set | No CI test tying operator API to validator truth | Catalog refresh can re-break any overlap provider silently |
| **G3** Craft declared-tools rubric | Simple chat classified `hard` with declared `tools` present | Kimi selected on trivial Craft chat |
| **G4** Easy/cost local routing blocked | G3 defeats run 40 economics on Craft ingress | Local peer not selected for simple chat |

Run 42 closes G1–G4 **without** re-implementing run 40 catalog economics or run 39 session rehydration.

## Problem Summary

Remote provider connect is broken **systemically** for every catalog∩LiteLLM provider whose shipped catalog row disagrees with LiteLLM-derived metadata (19 ids today). The UI copies `providerKind` from `listProviders`; validation resolves the same `providerId` through LiteLLM overwrite — any mismatch yields HTTP 400. **No provider id is special-cased in the fix or verification.**

Separately, Craft sends declared tools on every request, bypassing run 39 ask-mode, inflating difficulty rubric signals, and routing simple chat to Kimi.

## Catalog∩LiteLLM overlap audit

Automated audit (`main` @ `f4e951f`, 2026-06-12). Any provider in **both** `normalized-catalog.json` and the runtime LiteLLM inventory whose catalog `providerKind` differs from LiteLLM-derived metadata fails connect with `PROVIDER_KIND_MISMATCH` (HTTP 400). **DeepSeek is one row in this set, not a separate defect class.**

| Metric | Count |
| --- | --- |
| Catalog providers | 129 |
| LiteLLM-derived providers | 108 |
| Overlap (both sources) | 23 |
| **Broken** (`listProviders` kind ≠ validation kind) | **19** |
| Aligned overlap | 4 |

### Root cause (systemic)

```text
listProviders()  ──► currentNormalizedCatalog.providers[].providerKind   (models.dev export: provider-${id})
        │
        ▼
   UI POST /accounts with providerKind from listProviders

validateProviderAccounts()
        │
        ├─► catalog.providers (first)
        └─► additionalProviders liteLLMProviders (overwrite on collision)
        │
        ▼
   PROVIDER_KIND_MISMATCH when account.providerKind ≠ merged lookup kind
```

**Why only 19 of 129 catalog providers break:** overlap is required. Catalog-only providers (~106 ids) agree with themselves. LiteLLM-only providers (~85 ids) are served from the LiteLLM branch in `listProviders` and align with validation.

**Why OpenAI / Anthropic / Moonshot / Azure work today:** catalog rows already carry aligned `providerKind` (`localOverrideApplied: true` for openai, anthropic, moonshot) or native match (azure).

### Broken overlap set (all fail connect on baseline)

These providers advertise `provider-${providerId}` in `GET /api/role-model/providers` but validation expects `provider-openai`:

| providerId | listProviders kind | validation kind |
| --- | --- | --- |
| baseten | provider-baseten | provider-openai |
| cerebras | provider-cerebras | provider-openai |
| cohere | provider-cohere | provider-openai |
| databricks | provider-databricks | provider-openai |
| deepinfra | provider-deepinfra | provider-openai |
| deepseek | provider-deepseek | provider-openai |
| groq | provider-groq | provider-openai |
| minimax | provider-minimax | provider-openai |
| mistral | provider-mistral | provider-openai |
| morph | provider-morph | provider-openai |
| nebius | provider-nebius | provider-openai |
| openrouter | provider-openrouter | provider-openai |
| ovhcloud | provider-ovhcloud | provider-openai |
| perplexity | provider-perplexity | provider-openai |
| sarvam | provider-sarvam | provider-openai |
| v0 | provider-v0 | provider-openai |
| wandb | provider-wandb | provider-openai |
| xai | provider-xai | provider-openai |
| zai | provider-zai | provider-openai |

### Aligned overlap set (must not regress)

| providerId | shared kind | notes |
| --- | --- | --- |
| openai | provider-openai | `localOverrideApplied: true` |
| anthropic | provider-anthropic | `localOverrideApplied: true` |
| moonshot | provider-openai | `localOverrideApplied: true` |
| azure | provider-azure | native match |

### Secondary drift — `adapterFamily`

Several broken overlap providers also differ in `adapterFamily` between catalog and LiteLLM (e.g. `groq`: catalog `ai-sdk-groq`, LiteLLM `ai-sdk-openai-compatible`). Account upsert does **not** validate adapter family today; mismatch is **not** the 400 cause. `R1` merge helper still prefers LiteLLM `adapterFamily` on overlap for operator consistency.

### Overlap audit repro (maintainers)

From `role-model-router/`:

```bash
node --input-type=module -e "
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { deriveLiteLLMProviders, loadLiteLLMModelPrices } from './packages/catalog/src/litellm-catalog.ts';
const repoRoot = path.resolve('..');
const catalog = JSON.parse(readFileSync('./packages/catalog/data/normalized-catalog.json','utf8'));
const lite = deriveLiteLLMProviders(await loadLiteLLMModelPrices(repoRoot));
const cat = new Map(catalog.providers.map(p=>[p.providerId,p]));
const lit = new Map(lite.map(p=>[p.providerId,p]));
for (const id of [...cat.keys()].filter(id=>lit.has(id)).sort()) {
  const c=cat.get(id), l=lit.get(id);
  if (c.providerKind !== l.providerKind) console.log(id, c.providerKind, '->', l.providerKind);
}
"
```

## Fixed decisions

### Provider metadata precedence (overlap providers)

When a `providerId` exists in **both** `currentNormalizedCatalog.providers` and runtime `liteLLMProviders`:

| Field | Canonical source for operator surfaces |
| --- | --- |
| `providerKind` | LiteLLM provider entry (matches `validateProviderAccounts` lookup) |
| `adapterFamily` | LiteLLM when present; else catalog |
| `apiBase` | LiteLLM when non-empty; else catalog |
| `supportedAuthModes`, `oauth` | Existing merge rules (LiteLLM augments presets) |

**Implementation:** one shared merge helper consumed by `listProviders`, `startProviderDeviceAuthorization`, and any other operator metadata surface — not per-provider patches and **not** rewriting `normalized-catalog.json` at export (deferred optional follow-up).

### Ask-mode semantics (declared tools)

A request is **difficulty ask-mode** when either:

1. `toolCount === 0` (existing run 39 behavior), **or**
2. Tools are declared but message history has **no active tool usage** (no `tool` role messages and no non-empty `tool_calls` on assistant messages).

In ask-mode, rubric signals use last user turn, `toolCount: 0` for scoring, user-turn `historyTurnCount`, and user-message-only context tokens. Active tool loops **must not** enter ask-mode.

### TDD mode (Phase 3)

| Track | TDD Mode | Iron Law |
| --- | --- | --- |
| Provider metadata merge (`R1`) | **strict** | RED overlap/connect tests before merge helper; GREEN after |
| Craft ask-mode rubric (`R2`) | **strict** | RED declared-tools classification test before rubric change; GREEN after |

Packaged-runtime proof (`R3`) is verification evidence, not a substitute for unit/integration RED→GREEN.

## Requirements

### `R0` Branch from post-run-40 `main` and protect prior runs

Description:
Implementation and verification start from merged run 40 on `main` @ `f4e951f`. Run 40 catalog economics, Moonshot consolidation, and run 39 session rehydration must remain intact.

Acceptance criteria:
- Phase 0 worktree records `f4e951f` (or later `main` merge commit) before Phase 3.
- Run 40 tier-1 catalog economics tests remain green after run 42.
- Run 39 restart drill behaviors remain green (`connectedWithoutEndpointCount: 0`, alias pool from inventory).

Verification evidence:
- `00-worktree.md` baseline commit
- `evidence/logs/green/run40-regression.green.log` (or equivalent tier-1 replay)
- `evidence/logs/green/run39-restart-regression.green.log` (or equivalent)

---

### `R1` Systemic catalog∩LiteLLM provider metadata merge and remote account connect

Description:
Fix remote provider connect **for the entire overlap set**, not individual providers. Introduce a shared runtime merge helper that makes operator-facing metadata match `validateProviderAccounts` lookup for every catalog∩LiteLLM `providerId`. Wire the helper into `listProviders`, device OAuth start, and any provisional account construction paths. Do **not** weaken validation or patch `normalized-catalog.json` export.

**Historically broken overlap ids (19):** `baseten`, `cerebras`, `cohere`, `databricks`, `deepinfra`, `deepseek`, `groq`, `minimax`, `mistral`, `morph`, `nebius`, `openrouter`, `ovhcloud`, `perplexity`, `sarvam`, `v0`, `wandb`, `xai`, `zai`.

**Already aligned overlap ids (4, must not regress):** `openai`, `anthropic`, `moonshot`, `azure`.

Product acceptance criteria:
- `GET /api/role-model/providers` emits validation-canonical `providerKind` (and LiteLLM-preferred `adapterFamily` when present) for **every** overlap provider.
- `POST /api/role-model/accounts` with UI-equivalent payloads succeeds (no `PROVIDER_KIND_MISMATCH`) for **each of the 19** historically broken overlap ids using `providerKind` from merged `listProviders`.
- Aligned overlap providers unchanged.
- Catalog-only and LiteLLM-only providers unchanged.
- Runtime UI Remote Providers connect flow succeeds for any overlap provider the operator selects (same code path; no provider-specific UI branch).

TDD acceptance criteria (strict — mandatory before implementation):
- **RED:** Overlap alignment test enumerates catalog∩LiteLLM providers and **fails** on baseline with exactly the 19 known mismatches (audit table above). Log: `evidence/logs/red/sp1-overlap-alignment.red.log`.
- **RED:** Parameterized account-upsert validation test builds payloads from **unmerged** `listProviders` metadata and **fails** with `PROVIDER_KIND_MISMATCH` for all 19 ids. Log: `evidence/logs/red/sp1-overlap-upsert.red.log`.
- **GREEN:** Same tests **pass** after merge helper. Log: `evidence/logs/green/sp1-overlap-alignment.green.log`, `evidence/logs/green/sp1-overlap-upsert.green.log`.
- **GREEN:** HTTP-level bridge test (or `runtime:validate-ui` extension) asserts merged `listProviders` + successful upsert for parameterized overlap subset covering **all 19** ids (single test table, not one-off DeepSeek case).

Regression guard (part of `R1`, not a separate product requirement):
- Overlap alignment test remains in CI; fails if any overlap id regresses to split-brain after catalog or LiteLLM inventory changes.
- Failure output includes `providerId`, catalog kind, LiteLLM kind, and merged kind.

Changed files (expected):
- `role-model-router/apps/runtime-host-bridge/src/index.ts` (merge helper, `listProviders`, OAuth start)
- `role-model-router/apps/runtime-host-bridge/test/*` (overlap alignment + parameterized upsert)
- Optionally shared export from `role-model-router/packages/catalog/src/litellm-catalog.ts` if merge logic is reusable

Verification evidence (distinct from TDD logs):
- Phase 3.5 code review cites merge helper call sites and test table coverage
- Phase 4 test summary maps **each of 19 ids** to `implemented` + `verified` with test name references

Disposition rule:
- No `verified` on `R1` from DeepSeek manual QA alone; **verified** requires GREEN parameterized tests covering the full 19-id table plus overlap guard in CI.

---

### `R2` Craft declared-tools ask-mode difficulty routing

Description:
Extend difficulty rubric ask-mode so Craft payloads with declared tools but no active tool usage classify simple chat as easy/cost on `mixed.local-remote`, without regressing tool-heavy agent sessions.

Product acceptance criteria:
- Craft-like payload (preamble + optional assistant turn + `tools: N`, N≥2 + simple last user message) → `difficulty: "easy"`, `strategy: "cost"`, `rubricSignals.toolCount: 0`, `codeOrSchemaBurden: false`.
- Payload with declared tools **and** active tool usage (`tool_calls` or `tool` role) does **not** use ask-mode shortcut.
- Existing run 39 ask-mode tests (`toolCount === 0`) remain green.
- When local peer is healthy and alias pool includes local+remote models, easy/cost Craft-like path selects local peer (run 40 economics).

TDD acceptance criteria (strict):
- **RED:** `craft-ask-difficulty.test.ts` (or new test file) case for declared-tools simple chat **fails** on baseline (`hard` or non-cost). Log: `evidence/logs/red/sp2-craft-ask-mode.red.log`.
- **RED:** Active-tool guard case **passes** on baseline (documents expected non-ask behavior) or fails if baseline incorrectly easy — capture in RED log.
- **GREEN:** Declared-tools simple chat case **passes**. Log: `evidence/logs/green/sp2-craft-ask-mode.green.log`.
- **GREEN:** Active-tool guard case **passes**. Log: `evidence/logs/green/sp2-craft-ask-guard.green.log`.

Changed files (expected):
- `role-model-router/apps/runtime-host-bridge/src/index.ts` (`summarizeDifficultySignals`, ask-mode helpers)
- `role-model-router/apps/runtime-host-bridge/test/craft-ask-difficulty.test.ts`

Verification evidence:
- Mapped-request diagnostics JSON in Phase 4/5 showing easy/cost for Craft-like payload
- Run 40 catalog economics tests still green (local preferred on cost strategy)

---

### `R3` Packaged-runtime verification on `:3456`

Description:
Prove both tracks on the launched SEA runtime, not worktree dev server alone. Packaged proof uses the same systemic acceptance as automated tests — **not** a DeepSeek-only manual drill.

Acceptance criteria:
- Rebuilt SEA SHA256 recorded in Phase 5 QA artifact.
- Restart on `:3456` with quoted `--runtime-state-root` when path contains spaces.
- **Provider track:** Script or agent-operated probe loops **all 19** historically broken overlap ids — for each, `GET /api/role-model/providers` merged kind matches upsert validation and `POST /api/role-model/accounts` returns non-400 for UI-equivalent stub payload (credential ref may be env stub; no live provider call required). Log: `evidence/logs/phase5-overlap-connect-qa.log`.
- **Craft track:** Probe or mapped request shows `difficultyRouting.difficulty: easy`, `strategy: cost`, local downstream model when peer registered. Log: `evidence/logs/phase5-craft-ask-routing-qa.log`.
- Ingress probe: 0 `BRIDGE_CRASH`.
- `runtime:validate-ui` green if touched for provider list assertions.

Disposition rule:
- `verified` on `R1` requires Phase 5 overlap connect log covering **all 19** ids.
- `verified` on `R2` requires Phase 5 Craft routing log.

---

## Requirement Completion Status (template — fill in Phase 3+)

| R# | Disposition | Changed Files | Implementation Evidence | Verification Evidence |
| --- | --- | --- | --- | --- |
| R0 | pending | — | — | worktree + regression logs |
| R1 | pending | — | RED/GREEN sp1 logs | parameterized tests + phase5 overlap log |
| R2 | pending | — | RED/GREEN sp2 logs | craft tests + phase5 routing log |
| R3 | pending | — | SEA rebuild receipt | phase5 QA logs |

## Out of Scope

- Re-implementing run 40 catalog economics or run 39 session rehydration (regression only).
- Strategy-page alias publish UI (separate uncommitted work).
- Rewriting `normalized-catalog.json` at export or bulk models.dev refresh (runtime merge is the fix).
- LiteLLM proxy config, new provider presets, or OAuth provider additions.
- Difficulty cache key redesign.
- Remote Providers UI redesign beyond eliminating connect 400s.
- Eighteen separate manual QA sessions — **forbidden**; use parameterized automation + one Phase 5 loop script.

## Assumptions

- LiteLLM vendor model prices remain available under `role-model-router/vendor/litellm` at runtime build and test time.
- Overlap provider inventory counts (23 overlap / 19 broken) remain stable unless catalog refresh or LiteLLM vendor update changes them; CI guard detects drift.
- Craft Agents continues to send declared tools on chat turns without executing them until tool loop begins.
- Packaged runtime `:3456` state root path may contain spaces; restart uses quoted `--runtime-state-root`.

## Constraints

- One merge helper; no provider-id `if (providerId === "deepseek")` branches.
- Do not weaken `validateProviderAccounts`.
- Phase 3 declares `TDD Mode: strict` for `R1` and `R2`.
- `implemented` / `verified` dispositions must cite concrete changed files and **distinct** verification evidence (tests ≠ packaged QA log).
- Branch from `main` @ `f4e951f` in isolated worktree.

## Open Unknowns (resolve in Phase 1 AS-IS)

1. ~~Overlap mismatch cardinality~~ **Resolved (overlap audit above):** 19 broken, 4 aligned, 23 total.
2. Whether to export-time patch catalog kinds later — document in Phase 6 if deferred.
3. Craft tool count in production (~33); tests use parameterized N≥2.
4. Ask-mode `historyTurnCount` user-turn-only vs user+assistant — confirm in AS-IS against medium Craft sessions.

## Dependencies

| Prior run | Relationship |
| --- | --- |
| **40** | Economics regression; Craft easy/cost local selection |
| **39** | Ask-mode baseline extended |
| **32** | Catalog + LiteLLM derivation |
| **17** | OAuth paths in `R1` |
| **14** | Providers UI consumes merged `listProviders` |
| **06** | `validateProviderAccounts` contract unchanged |

## Targeted Package And File Inventory

- `role-model-router/apps/runtime-host-bridge/src/index.ts`
- `role-model-router/apps/runtime-host-bridge/test/` (overlap + craft tests)
- `role-model-router/packages/catalog/src/litellm-catalog.ts`
- `role-model-router/packages/provider-account/` (tests only unless shared merge export)
- `role-model-router/apps/runtime-ui/app/routes/providers.tsx`
- `role-model-router/apps/runtime-host-bridge/src/validate-ui.ts` (optional extension)
- `role-model-router/scripts/` (optional `phase5-overlap-connect` probe)

## Coverage Gate

- [x] Post-run-40 baseline (`R0`)
- [x] G1–G4 mapped to `R1`–`R3`
- [x] Provider connect is **one** systemic requirement (`R1`) — no DeepSeek exception
- [x] Strict TDD RED/GREEN paths defined per track
- [x] `verified` dispositions require full 19-id coverage, not spot checks
- [x] Packaged `:3456` proof defined (`R3`)
- [x] Out of scope forbids per-provider manual QA sprawl
- [ ] User lock approval recorded

Coverage: PASS

## Approval Gate

- [ ] Requirements bounded; run 40/39 not re-implemented
- [ ] Acceptance criteria observable via parameterized tests, CI guard, and Phase 5 logs
- [x] User approved run creation and requirements draft (2026-06-12)
- [x] Run id confirmed: `42-provider-kind-craft-ask-routing`
- [ ] User confirmed proceeding to Phase 0 lock / worktree implementation

Approval: PASS
