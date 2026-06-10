Type: `pattern`
Status: `CURRENT`
Scope: `How runtime UI verification should combine browser-use with direct Edge CDP when truthful operator-flow evidence is required on Windows, and when QA-bridge browser proof must be paired with backend validators for execution or routing claims.`
Owns-Paths:
Watch-Paths:
- `/.recursive/memory/skills/SKILLS.md`
- `/role-model-router/apps/runtime-ui/**`
- `/role-model-router/apps/runtime-host-bridge/**`
Source-Runs:
- `16-router-runtime-unified-telemetry-dashboard`
- `34-router-runtime-role-policy-and-ui-fixture-reduction`
- `35-runtime-ui-connect-declutter`
Validated-At-Commit: `working-tree`
Last-Validated: `2026-06-08T11:15:00Z`
Tags:
- `skills`
- `browser`
- `browser-use`
- `cdp`
- `windows`

# Browser Proof With Edge CDP

Use `browser-use` as the default browser driver for interactive runtime UI flows, but switch to direct Edge CDP when the evidence depends on exact viewport or color-scheme emulation.

## Default Pattern

- For runtime UI frontend changes, Phase 5 manual QA must use a live browser session plus visual verification (screenshots and/or DOM text receipts). Test-encoded nav contracts alone are companion proof, not a substitute.
- Seed a persistent runtime state first so screenshots and text receipts come from a reproducible live baseline.
- Use `browser-use` or Cursor IDE `cursor-ide-browser` MCP for:
  - route navigation
  - clicking through repo-owned controls
  - form input
  - full-page screenshots
  - text and JSON extraction from the live UI

## When To Fall Back To Edge CDP

On Windows, prefer direct Edge CDP for the final receipt when:

- the screenshot must reflect a truthful narrow mobile viewport
- the screenshot must reflect `prefers-color-scheme: dark`
- a longer `browser-use python` session starts stalling or timing out

## Why

- `browser-use` is reliable for interactive control flows in this repository.
- It was less dependable for exact mobile-width and dark-theme capture in the run-16 runtime UI proof.
- Direct Edge CDP gave stable control over viewport emulation and color-scheme emulation without changing the live runtime state or the evidence target.

## Practical Guidance

- Keep the browser proof same-origin to the live repo-owned UI and bridge.
- Save both screenshots and text-or-JSON companion receipts when the scenario is stateful.
- When refreshing SSE or other live data proof, use explicit request ids so new events do not overwrite each other in the captured ledger.
- Use the QA bridge/browser flow to prove operator reachability, form behavior, and live readback, but switch to backend validators or a direct HTTP harness when the QA launcher does not persist runtime config or cannot faithfully prove downstream routing behavior.
- When `browser_snapshot` returns empty refs but the page has rendered content, use CDP `Runtime.evaluate` against `document.body.innerText` or targeted selectors as the visual receipt companion to screenshots.
- Run the dev server from the implementation worktree on a dedicated port when the main-repo dev instance does not carry the feature diff.
