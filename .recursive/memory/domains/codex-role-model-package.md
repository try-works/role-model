# Codex Role-Model Package

Type: `domain`
Status: `CURRENT`
Scope: `Repo-owned Codex Desktop/CLI/IDE adapter package that proxies Codex Responses traffic to an already-running role-model runtime, injects role_model.intent, bridges Codex tool wire shapes, and ships npm + Codex marketplace install surfaces.`
Owns-Paths: `packages/codex-role-model/**`
Watch-Paths: `.agents/plugins/marketplace.json`, `apps/docs-site/content/docs/integrations/codex.mdx`
Source-Runs:
- `89-codex-role-model-package`
Validated-At-Commit: `working-tree`
Last-Validated: `2026-08-07`
Tags: `codex`, `runtime-integration`, `responses-adapter`, `tool-bridge`, `npm`, `marketplace`
Created: `2026-08-07`
Last Validated: `2026-08-07`
Validated By: `run-89`

## Package Identity

- npm: `@try-works/codex-role-model@0.1.1` (public)
- Bin: `codex-role-model` (`setup`, `start`, `stop`, `doctor`, `status`, `requests`, `explain`, …)
- Does NOT: install/start/own the role-model runtime process; implement Remote Compact; coach model narration via phrase detectors
- Plugin: Agent Plugins 1.0 `plugin.json` + `.codex-plugin/plugin.json` + `skills/role-model/`

## Request Path

```
Codex Desktop/CLI/IDE
  → local adapter :3460 (/v1/responses)  [intent inject + tool-bridge]
  → role-model main runtime router       [always — routing + telemetry]
  → eligible endpoint/model
  → adapter restore / SSE compat
  → Codex
```

## Install Surfaces

- One-liner: `npx --yes @try-works/codex-role-model@latest setup && … start`
- Codex marketplace: repo `.agents/plugins/marketplace.json` (npm source); personal copy via `marketplace.npm.json`
- Marketplace root must be repo-shaped (`.agents/plugins/marketplace.json`); bare `marketplace.json` folders fail Codex CLI add

## Durable Constraints

- Protocol-only adapter: transform requests/returns so role-model models work in Codex; do not reintroduce narration phrase-matchers or anti-narration system-prompt coaching
- Tool bridge stays in `packages/codex-role-model`; do not edit `role-model-router` for Codex wire shapes
- Signed-in preferred path keeps ChatGPT history visible (merged catalog + `openai_base_url` hijack to adapter)
- Compaction is Codex-owned
- Operator confirmed (2026-08-07): Codex Desktop model picker shows strategy alias and configured model ids — no further Desktop glance residual
- Operator declined (2026-08-07): Codex Stop-hook auto-continue / continue-nudge — out of scope; leave narrate-and-stop to the model

## Related

- Behavioral parity source for discovery/intent/inspection: `domains/pi-role-model-package.md`
- Run evidence: `.recursive/run/89-codex-role-model-package/`
