Run: `/.recursive/run/14-router-runtime-ui-foundation/`
Phase: `02 To-Be Plan`
Status: `LOCKED`
LockedAt: `2026-05-07T11:33:33Z`
LockHash: `ae23214dd3aeb900ccf4652ba363ffc4be4dc458da32b129b3e94313a9126e35`
Workflow version: `recursive-mode-audit-v1`
Addendum: `09`
Inputs:
- `/.recursive/run/14-router-runtime-ui-foundation/02-to-be-plan.md`
- `/.recursive/run/14-router-runtime-ui-foundation/addenda/02-to-be-plan.runtime-ia-redesign.addendum-07.md`
- `/role-model-router/apps/runtime-ui/DESIGN_SYSTEM.md`
Outputs:
- `/.recursive/run/14-router-runtime-ui-foundation/addenda/02-to-be-plan.live-vendor-pages.addendum-09.md`
Scope note: This addendum records the run-14 planning slice that converts the remaining scaffold pages into live repo-owned runtime pages.

## TODO

- [x] Record the remaining page-conversion scope without rewriting the locked base plan
- [x] Map vendored capabilities to concrete repo-owned page contracts
- [x] Capture topology, layout, and validation constraints for the conversion slice
- [x] Complete Coverage Gate checklist
- [x] Complete Approval Gate checklist

## Scope Amendment

The locked run-14 redesign plan established the hierarchical shell, but six routes still remained as scaffolds. This addendum makes the remaining page-conversion scope explicit:

- `Studio > Images`
- `Studio > Audio`
- `Studio > Rerank`
- `Studio > Advanced APIs`
- `Integrations > Upstream`
- `System > Peers`

These routes must become real repo-owned pages rather than long-lived `FutureSurface` placeholders.

## Vendor Capability Mapping

- `Studio > Images`
  - OpenAI-style image generation
  - SDAPI txt2img as the first alternate mode
- `Studio > Audio`
  - voice discovery
  - speech generation
  - transcription
- `Studio > Rerank`
  - rerank request entry
  - ordered score ledger
- `Studio > Advanced APIs`
  - `/v1/responses`
  - `/v1/messages`
  - `/v1/messages/count_tokens`
  - `/v1/embeddings`
  - `/completion`
  - `/infill`
- `Integrations > Upstream`
  - per-model `/upstream/<model>/` doorways
  - contract/reference posture instead of recreating the vendored UI wholesale
- `System > Peers`
  - peer inventory, contract fields, and empty-state guidance

## Bridge And Topology Stance

- `/ui` must not remain in global shell chrome
- raw vendor surfaces stay contextual or route-local, not global navigation escapes
- repo-owned pages should rely on existing runtime snapshot helpers and preserved host routes rather than a global vendor UI dependency

## Implementation Order

1. Align `DESIGN_SYSTEM.md` with the live-route target contracts
2. Replace route-level `FutureSurface` placeholders with real page implementations
3. Keep shared shell primitives and route metadata aligned with the converted pages
4. Re-audit doc/code parity after implementation so the design system marks the pages `live`

## Validation Amendment

- `corepack pnpm --filter runtime-ui test`
- `corepack pnpm --filter runtime-ui build`
- `corepack pnpm run runtime:validate-ui`
- focused design-system parity tests for the converted pages

## Traceability

- R5 the runtime shell must expose the planned hierarchical pages as real repo-owned surfaces
- R6 preserved vendor capabilities must be mapped into the repo-owned shell without relying on global `/ui`

## Coverage Gate

- [x] Remaining scaffold pages are named concretely
- [x] Vendored capabilities are mapped to repo-owned route contracts
- [x] Layout/topology/validation constraints are recorded

Coverage: PASS

## Approval Gate

- [x] The page-conversion scope is explicit
- [x] Implementation order is clear
- [x] The addendum is ready to guide design-system alignment and implementation

Approval: PASS
