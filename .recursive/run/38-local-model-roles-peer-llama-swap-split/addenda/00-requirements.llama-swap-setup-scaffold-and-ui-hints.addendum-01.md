Run: `/.recursive/run/38-local-model-roles-peer-llama-swap-split/`
Phase: `00 Requirements`
Status: `LOCKED`
LockedAt: `2026-06-11T04:22:13Z`
LockHash: `d4bf4a174e38957a761eea983f646bde664d09c484c7cca897b00c958a319fa7`
Workflow version: `recursive-mode-audit-v2`
Addendum: `01`
Inputs:
- `/.recursive/run/38-local-model-roles-peer-llama-swap-split/00-requirements.md` (locked scope `R1`–`R11`)
- `/.recursive/run/38-local-model-roles-peer-llama-swap-split/addenda/00-worktree.addendum-01.md` (worktree execution contract)
- `/.recursive/run/38-local-model-roles-peer-llama-swap-split/addenda/ui-architecture-and-page-spec.md`
- `/.recursive/run/38-local-model-roles-peer-llama-swap-split/05-manual-qa.md` (llama-swap live load SKIP — operator env has no `llama_swap` block)
- Operator runtime config at `%LOCALAPPDATA%\Role Model Runtime\runtime-config.yaml` (no `llama_swap:` section; `executionMode: decision_only`)
- `role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts` (`llamaSwap.enabled` derived from declared models)
- `role-model-router/apps/runtime-ui/app/routes/local-llama-swap-models.tsx`
- `role-model-router/apps/runtime-ui/app/routes/control-runtime-config.tsx`
- `role-model-router/apps/runtime-ui/app/routes/local-choose.tsx`
Outputs:
- `/.recursive/run/38-local-model-roles-peer-llama-swap-split/addenda/00-requirements.llama-swap-setup-scaffold-and-ui-hints.addendum-01.md`
Scope note: Post-closeout addendum for operator onboarding when llama-swap is not yet configured. Adds a canonical config scaffold and UI hints (with modal setup guide) so peer-only operators can enable llama-swap without guessing YAML/JSON shape. Does not change llama-swap execution semantics (`OOS2` remains out of scope).

## TODO

- [x] Define problem and motivation from run 38 QA gap
- [x] Add requirement identifiers `R12`–`R16` with observable acceptance
- [x] Mandate worktree-isolated implementation per `00-worktree.addendum-01.md`
- [x] Specify scaffold contract (YAML + JSON) and UI surfaces
- [x] Specify modal content and interaction contract
- [x] Record verification and out-of-scope boundaries
- [x] User approval of this addendum
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Problem Summary

Run 38 split the Local UI and implemented llama-swap role APIs/UI, but operator QA **skipped** llama-swap live load because the packaged runtime config has **no `llama_swap.models` entries**. The Llama-swap models page renders correctly yet shows an empty state with no guidance on *how* to become operational.

Peer-only setups are valid (`00-requirements.md` assumption: operators may use peer only, llama-swap only, or both). When llama-swap is not configured, the UI must explain the difference and provide a copy-paste scaffold plus step-by-step instructions — without mixing peer and llama-swap workflows on one page (`R1` / addendum preserved).

## Requirements

### `R12` Canonical llama-swap config scaffold

Description:
Provide a single canonical scaffold that operators can merge into runtime config. Scaffold must match `unified-runtime-config` parsing (`llama_swap.models.<id>.path` required) and use Windows-friendly placeholder paths.

Acceptance criteria:
- All files below are created/edited under the run-38 worktree only (see `R16`).
- Shared module `role-model-router/apps/runtime-ui/app/lib/llama-swap-setup.ts` (worktree-relative path) exports:
  - `LLAMA_SWAP_SCAFFOLD_MODEL_ID` placeholder (`your-model-id`)
  - `LLAMA_SWAP_SCAFFOLD_YAML` — valid YAML block for `runtime-config.yaml` on disk
  - `createLlamaSwapScaffoldModel()` — JSON/runtime-config editor shape
  - `applyLlamaSwapScaffold(config)` — idempotent merge when `llamaSwap.models` is empty
  - `readLlamaSwapConfigStatus(record)` — derives `operational` when ≥1 model has non-empty `path`
- Scaffold YAML includes commented optional fields (`context_window`, `command`, `proxy`, `check_endpoint`) as hints only, not required for parse.
- Unit tests cover scaffold merge idempotence and status derivation (`llama-swap-setup.test.ts`).
- Scaffold is **not** auto-injected into live operator config on runtime start; operators opt in via UI actions (`R13`).

### `R13` Runtime config editor insert action

Description:
System → Runtime config must offer a one-click way to insert the scaffold into the JSON editor when no llama-swap models are declared.

Acceptance criteria:
- `control-runtime-config.tsx` shows **Insert llama-swap scaffold** when `llamaSwap.models.length === 0`.
- Button merges `applyLlamaSwapScaffold` into the editor payload without overwriting existing `liteLLM`, aliases, or routing fields.
- Button hidden or disabled when `llamaSwap.models.length > 0` (no silent overwrite).
- Status message after insert: instruct operator to replace placeholder id/path before Save and apply.
- Does not auto-save; operator must explicitly Save and apply.

### `R14` Llama-swap setup hints and modal guide

Description:
When llama-swap is not operational, Local llama-swap surfaces show a concise hint and a **Setup guide** modal with full instructions. Detailed steps and scaffold blocks live in the modal, not inline on every page.

Acceptance criteria:

**Detection**
- UI reads `GET /api/role-model/runtime/config` (existing `fetchRuntimeConfig`) to determine status.
- `operational === false` when no declared models or any declared model lacks a non-empty `path`.
- Hints hidden when `operational === true`.

**Hint surfaces** (minimum)
| Surface | Variant | When shown |
| --- | --- | --- |
| `/app/local/llama-swap/models` | prominent | not operational |
| `/app/local/choose` | compact note on llama-swap card | not operational |
| `/app/local/llama-swap/policy`, `/swap`, `/logs`, `/matrix` | compact banner | not operational |

**Hint content (inline)**
- States llama-swap is **not configured** or **needs valid model paths** (two honest variants).
- Distinguishes peer-backed local (external server) vs role-model-managed llama-swap in one sentence.
- Primary CTA: **Setup guide** (opens modal).
- Secondary CTA on prominent variant: link to **System → Runtime config**.
- Product naming: **role-model** only.

**Modal contract** (`LlamaSwapSetupModal`)
- Opened from Setup guide; closable via Close, Escape, backdrop click.
- Sections:
  1. What llama-swap does vs peer-backed local
  2. Numbered setup steps (GGUF file → edit config → save/apply → restart if needed → load model here → optional host policy)
  3. YAML scaffold block with **Copy YAML**
  4. JSON `llamaSwap` snippet with **Copy JSON**
  5. Live status line: execution mode, config path when available
  6. Footer links: Open runtime config, Back to llama-swap models
- Modal uses existing shell styling (`fixed inset-0`, `CodeBlock`, design-system buttons) consistent with `control-models.tsx` inspect modal pattern.
- No secrets or env vars in scaffold copy.

**Llama-swap models page behavior when not operational**
- Load form remains visible but **Load model** disabled with honest helper text pointing to Setup guide.
- If config lists declared model ids (paths invalid), show ids as suggestions in load field placeholder or helper list.

**Design system**
- Update `DESIGN_SYSTEM.md` Local section with one paragraph on llama-swap setup hints + modal (design-system-first before routes).

### `R15` Addendum verification (lightweight)

Description:
Verify scaffold and hints without requiring operator to enable real GGUF inference.

Acceptance criteria:
- Unit tests PASS for `llama-swap-setup.ts`.
- `runtime-ui` production build PASS.
- Browser QA on `:3456` with current peer-only config:
  - Llama-swap models shows prominent hint + modal opens with scaffold copy buttons
  - Choose page shows compact llama-swap note
  - Runtime config shows Insert scaffold and editor receives placeholder model
- Record evidence in `05-manual-qa.addendum-01.md` (new artifact; do not edit locked `05-manual-qa.md`).
- No regression to peer models flow or `R11` probe guard when llama-swap remains disabled.
- All commands executed from `D:\DEV\role-model\.worktrees\38-local-model-roles-peer-llama-swap-split\role-model-router\` (or worktree repo root for `runtime:package-sea`).

### `R16` Worktree-isolated implementation

Description:
Addendum product work must run in the same isolated git worktree discipline as run 38. Locked `00-worktree.md` recorded a repo-root deviation for the initial `R1`–`R11` pass; this addendum reconciles forward by requiring the worktree before any `R12`–`R15` code changes.

Acceptance criteria:
- `addenda/00-worktree.addendum-01.md` bootstrap completed before first product edit.
- Worktree path: `D:\DEV\role-model\.worktrees\38-local-model-roles-peer-llama-swap-split\`
- Branch: `recursive/38-local-model-roles-peer-llama-swap-split`
- Repository root checked out to `main` (or documented exception) while addendum implementation proceeds in the worktree.
- Worktree contains full run-38 branch state (including prior repo-root changes) before addendum edits begin.
- Diff basis unchanged: `git diff --name-only c269a6d2e462dc0ca80539f1684785b2fc3b0960` run from worktree.
- Phase 2 amendment artifact `02-to-be-plan.addendum-01.md` cites worktree path in every sub-phase.
- Phase 3/4/5 addendum artifacts record worktree path in test/build/browser evidence.
- All addendum artifacts (`02-to-be-plan.addendum-01.md`, `05-manual-qa.addendum-01.md`, etc.) authored under worktree `.recursive/run/38-local-model-roles-peer-llama-swap-split/` only — not repository root.
- Evidence log: `evidence/logs/worktree-bootstrap-addendum-01.log` (worktree path)

## Implementation sequencing (for Phase 2 amendment)

0. Bootstrap worktree per `00-worktree.addendum-01.md` (`R16`) — **blocking**
1. `DESIGN_SYSTEM.md` — document hint + modal contract
2. `llama-swap-setup.ts` + tests (RED/GREEN)
3. `LlamaSwapSetupModal`, `LlamaSwapSetupHint` components
4. Wire routes: `local-llama-swap-models`, `local-choose`, satellite llama-swap pages
5. `control-runtime-config.tsx` insert action
6. Browser QA artifact `05-manual-qa.addendum-01.md`

TDD Mode: `strict` for `R12` helpers; `pragmatic` for modal/hint wiring with build + browser evidence (`R15`).

## Out of Scope (this addendum)

- `OOS-A1`: Auto-enabling llama-swap in operator config without explicit save
- `OOS-A2`: Downloading or installing GGUF weights for the operator
- `OOS-A3`: Changing llama-swap process supervision, swap algorithm, or TTL defaults (`OOS2` parent)
- `OOS-A4`: Replacing YAML-on-disk editing with a full graphical model wizard
- `OOS-A5`: Re-locking or editing run 38 phases `01`–`08`; use new addendum artifacts only
- `OOS-A6`: Addendum product or control-plane edits from repository root while the run-38 worktree exists (includes addenda under `D:\DEV\role-model\.recursive\run\38-...`)

## Traceability to parent run

| Parent | Addendum relationship |
| --- | --- |
| `R1` | Preserves split pages; hints only on llama-swap cluster |
| `R3` | Unblocks future `R3` live verification when operator enables llama-swap |
| `R9` / `R10` | Extends browser QA and design-system docs |
| `R11` | Must not regress probe suite on peer-only config |
| `R16` | Worktree isolation per `00-worktree.addendum-01.md` |

## Coverage Gate

- [x] Scaffold contract specified (`R12`)
- [x] Runtime config insert action specified (`R13`)
- [x] Hint surfaces, modal content, and disabled-load behavior specified (`R14`)
- [x] Verification path specified (`R15`)
- [x] Worktree execution contract specified (`R16`) and companion artifact `00-worktree.addendum-01.md` authored
- [x] Out-of-scope prevents silent config mutation and backend changes
- [x] User approved this addendum (closeout 2026-06-08)

Coverage: PASS

## Approval Gate

- [x] Addendum is bounded to onboarding/scaffold/hints; no execution-semantics change
- [x] Peer-only operators are supported; llama-swap enablement remains opt-in
- [x] Acceptance criteria are observable (unit tests, browser QA, editor behavior)
- [x] Worktree isolation is explicit; repo-root addendum implementation is forbidden (`R16`)
- [x] User approved implementation per this addendum (closeout 2026-06-08)

Approval: PASS

Audit: PASS
