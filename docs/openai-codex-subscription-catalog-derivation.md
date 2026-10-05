# Derive the Codex subscription model surface from the catalog

Status: scoping - a decision document, not an implementation. Follows #299 (adds the four GPT-6 rows) and #300 (fails CI when the catalog and the matrix drift apart). This document scopes the remaining work: make a catalog refresh change the offered surface without a hand-maintained list.

## Problem

OPENAI_CODEX_SUBSCRIPTION_MODEL_MATRIX in role-model-router/apps/runtime-host-bridge/src/index.ts is the runtime's own declaration of what the ChatGPT Codex subscription offers, while packages/catalog/data/normalized-catalog.json declares what exists. Nothing connects them. feat(catalog): add the new OpenAI models and bill context tiers (#286) added six OpenAI rows and no runtime offered any of them; #299 restored those four by hand, and #300 makes the drift fail CI instead of failing silently. The remaining gap is that a human must still make a one-line decision per model.

## The two data sources, precisely

| fact | catalog | matrix |
| --- | --- | --- |
| which model exists, its capabilities / function-calling / reasoning efforts / context / modalities / pricing | yes | - |
| which model the subscription offers, in what order | - (has everything, offers nothing) | yes (curated) |
| lifecycle (supported / preview / deprecated) | - | yes |
| supportsHostedWebSearch (gates resolveEndpointWebSearchSupport) | - | yes (all true today) |
| the code.edit capability | - | yes (added in three places) |

So a catalog row is necessary but not sufficient: the matrix carries Codex-specific facts the catalog cannot. Full derivation therefore has to split 'what exists + what it can do' (catalog) from 'what to offer and how to present it' (a small curation overlay).

## Current consumers (line numbers as of the #300 branch)

1. OPENAI_CODEX_SUBSCRIPTION_MODEL_ID_SET (index.ts:748) -> isOpenAICodexSubscriptionModelId (index.ts:789). Membership predicate, used at index.ts:6915 (capability synthesis, has catalog in scope) and via assertOpenAICodexSubscriptionModelIds (index.ts:800).
2. assertOpenAICodexSubscriptionModelIds - admission gate, called at index.ts:22413 (activateEndpoint), 31477 (account upsert) and 31572 (device authorization). All three sites have currentNormalizedCatalog in scope.
3. createRuntimeModelRecords (index.ts:8773) - builds /api/role-model/models. Already takes catalog: NormalizedCatalog. Iterates the matrix at index.ts:8829 and silently drops a matrix entry with no catalog row (if (!source) return []).
4. resolveEndpointWebSearchSupport (index.ts:8921) - reads supportsHostedWebSearch from the matrix (index.ts:8925).
5. per-account effort override - index.ts:22428 OPENAI_CODEX_SUBSCRIPTION_MODEL_MATRIX.find(...).
6. provider variant modelIds - index.ts:23242 [...OPENAI_CODEX_SUBSCRIPTION_MODEL_IDS] (what listProviders returns for the Codex Subscription variant).

The first two are module-scope and synchronous; the catalog is only available asynchronously (readNormalizedCatalogFile is awaited inside the backend factory at index.ts:19958). That is the only reason this is a refactor rather than a one-line change.

## Proposed design

Keep one source of truth for 'what to offer' that is computed from the catalog plus a curation overlay for the facts the catalog cannot supply.

    // Pure, unit-testable. Membership is the catalog, not a list.
    function codexSubscriptionCatalogModelNames(catalog) {
      // providerId === 'openai', meetsSubscriptionFloor(name) (GPT-5.3+, see #300), not excluded.
    }

    // The overlay that survives catalog refreshes: order, lifecycle, hosted web search, effort override.
    const OPENAI_CODEX_SUBSCRIPTION_CURATION = {
      order: readonly string[],            // stable picker order; names not listed sort after
      excluded: Readonly<Record<string,string>>,  // already in #300
      overrides: Readonly<Record<string, {
        lifecycle?, supportsHostedWebSearch?, reasoningEffortLevels?
      }>>,
    };

Then:

- #3 - createRuntimeModelRecords derives codexSubscriptionRecords from codexSubscriptionCatalogModelNames(catalog) instead of the matrix; effort levels come from the catalog row, overridden by the overlay.
- #1/#2 - membership becomes catalog-aware: a helper isOpenAICodexSubscriptionCatalogModelName (floor + exclusions), and the three assert call sites pass the catalog-derived set. The pure predicate keeps a module-scope form for the places that already have catalog in scope.
- #4 - resolveEndpointWebSearchSupport reads the overlay's supportsHostedWebSearch (default true, matching today).
- #5/#6 - read the overlay for effort and the catalog for the variant modelIds.

## Decisions required before implementing (blocking)

1. Default lifecycle for an auto-discovered model. Today the matrix marks everything supported except two preview and one deprecated. If a catalog refresh adds a model nobody curated, should it default to supported (the operator already said 'gpt-6.1-sol is just a regular model') or to preview until explicitly promoted?
2. Default supportsHostedWebSearch. Every current entry is true. Is hosted web search a property of the whole subscription surface (default true) or per-model (default false until overridden)?
3. Ordering. The current picker order is curated (5.6-sol, terra, luna; 5.4 before mini/nano/pro). A deterministic version-desc + name sort changes that order. Keep the curated order as the explicit order overlay, or accept the sort?
4. Admission on catalog removal. A catalog row that disappears would make a previously-admitted account's allowedModels fail assertOpenAICodexSubscriptionModelIds on the next restart. Should already-admitted accounts stay valid (admission checked only for new mutations), or should a removed model be refused everywhere?

## Risk

This widens admission from 'the curated allowlist' to 'any catalog OpenAI row at/above the floor minus exclusions'. That is the intent, but it is a routing-surface behaviour change; #300's conformance test stays as the backstop that the curated set and the derived set agree on today's catalog.

## Recommended sequence

1. Extract codexSubscriptionCatalogModelNames + the curation overlay; unit-test against the shipped catalog (must equal the current 16, minus exclusions).
2. Rewrite createRuntimeModelRecords (the /api/role-model/models surface).
3. Make isOpenAICodexSubscriptionModelId / assertOpenAICodexSubscriptionModelIds catalog-aware at the four call sites.
4. Rewrite the variant modelIds and the effort override.
5. Keep #300's conformance test; add a test asserting the derived list equals the curated list on today's catalog, so the switch is behaviour-preserving for the current surface.
