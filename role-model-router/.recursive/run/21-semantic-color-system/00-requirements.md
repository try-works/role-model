Run: `/.recursive/run/21-semantic-color-system/`
Phase: `00 Requirements`
Status: `LOCKED`

---

# Run 21: Semantic Color System + Deferred Run 20 Completion

## Context

This run combines two workstreams:

1. **Semantic Color System**: The current design system uses Swiss red (`#C8102E`) as the single accent color for all purposes: primary buttons, active states, links, focus rings, badges, and error states. This violates the semantic color principle — red should signal errors and destructive actions, not normal UI chrome.

2. **Deferred Run 20 Items**: Three requirements were deferred from Run 20 and are now in scope.

## Requirements

### Semantic Color System

#### R1: Semantic Color Token Architecture

Introduce a semantic color token system where each token has a meaning, not just a hue:

- **Primary** (`--rm-accent`): Cobalt blue `#003B8E` — primary actions, active states, focus rings, links
- **Error** (`--rm-error`): Swiss red `#C8102E` — errors, destructive actions, validation failures
- **Success** (`--rm-success`): Forest green `#166534` — success states, healthy indicators
- **Warning** (`--rm-warning`): Amber `#b45309` — warnings, cautions

Each semantic color has opacity variants (full, muted, subtle, ghost).

#### R2: Update CSS Variables

Update `app.css` to declare the new semantic color variables in both light and dark modes.

#### R3: Update Runtime Theme

Update `runtimeTheme` in `design-system.ts` to include the new semantic colors.

#### R4: Update Component Classes

Update `design-system.ts` component class contracts to use `--rm-accent` (blue) for primary actions, `--rm-error` (red) for error states.

#### R5: Update Page Primitives

Update `page-primitives.tsx` to use semantic colors correctly.

#### R6: Update Route Pages

Audit and update route pages to use semantic colors correctly.

#### R7: Update DESIGN_SYSTEM.md

Update the design system documentation to describe the semantic color architecture.

#### R8: Update Tests

Update `design-system.test.ts` to expect the new semantic color values.

### Deferred Run 20 Items

#### R9: Model-Level Overrides (R7 from Run 20)

- R9.1: Add per-model override persistence to `runtimeStateRoot/model-overrides.json`
- R9.2: Override schema: `{ modelId: { ttl?: number, contextWindow?: number, concurrencyLimit?: number } }`
- R9.3: Backend `readModelOverrides()` and `updateModelOverrides()` methods
- R9.4: Frontend controls in `local-models.tsx`: collapsible override panel per model
- R9.5: Overrides visually distinct (subtle border/muted panel)
- R9.6: Apply overrides when loading models (pass to llama-swap via request headers)

#### R10: Auto-Detected Swap Events (R2.5 from Run 20)

- R10.1: Background polling of `getRunningModels()` to detect model transitions
- R10.2: Insert swap events with `reason: "auto-detected"` when transitions detected
- R10.3: Record `oldModelId` (previous running model) and `newModelId` (newly detected)

#### R11: Peer Passthrough Backend (R9 backend from Run 20)

- R11.1: Add `peerConfigs` persistence to `runtimeStateRoot/peers.json`
- R11.2: Backend methods: `listPeers()`, `addPeer()`, `removePeer()`
- R11.3: Health check proxy to peer llama-swap instances
- R11.4: Wire peer management to `local-peers.tsx` frontend

## Constraints

- Red (`#C8102E`) must ONLY be used for error/destructive states
- Blue (`#003B8E`) is the new primary accent
- All existing UI tests must pass
- All bridge tests must pass
- Dark mode must preserve semantic meaning
- TDD required for R9–R11 (failing test before implementation)
