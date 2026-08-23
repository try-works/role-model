# Protocol-Only Codex Adapter (No Narration Detectors)

Type: `incident`
Status: `CURRENT`
Scope: `Codex adapter packages must not use phrase-matching narration detectors or injected anti-narration coaching prompts; fix protocol gaps generically; optional Stop-hook auto-continue is client-side.`
Owns-Paths: `role-model-router/packages/codex-role-model/`
Watch-Paths: `role-model-router/packages/codex-role-model/`; `.recursive/run/89-codex-role-model-package/`
Source-Runs:
- `89-codex-role-model-package`
Validated-At-Commit: `working-tree`
Last-Validated: `2026-08-07`
Tags: `codex`, `adapter`, `protocol-only`, `anti-pattern`

## Problem

Narrate-and-stop and similar model behaviors look fixable with reply-phrase detectors or “prefer web_search / don’t narrate” system coaching. Those approaches are brittle, host-specific, and forbidden for `@try-works/codex-role-model` after operator direction in run 89.

## Durable Rule

- Keep adapter transforms protocol-shaped (tool flatten/restore, search fulfill, SSE/WS/id repairs, dedupe).
- Do not match assistant prose to auto-continue or inject preference/anti-narration coaching.
- Do **not** add Codex Stop-hook auto-continue / continue-nudges unless the operator explicitly reverses this (declined 2026-08-07 in run 89).

## Evidence

- Run 89 Phase 5 addenda and package README state protocol-only boundary.
- Removed narration detector / coaching paths during packaging/verify iteration.
