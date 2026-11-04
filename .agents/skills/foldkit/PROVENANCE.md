# Repo-local skill provenance: `foldkit`

This skill is a **repo-local rewrite**, not an installed copy of an upstream skill. It adapts
Foldkit's own conventions guide so agents working in this repository read the conventions that apply
here instead of the ones written for a standalone `create-foldkit-app` project.

| field | value |
| --- | --- |
| upstream | https://github.com/foldkit/foldkit |
| tag | `foldkit@0.169.0` |
| commit | `7ee214268c602967937b80f6f20d1e831f2e8ab6` (2026-10-20) |
| source path | `packages/create-foldkit-app/templates/base/FOLDKIT.md` |
| source sha256 | `528a49661fa7265fcf4f724413b8b004ce43e5f5773dcd0e178ec300ec9f7faf` |
| retrieved | 2026-11-04, from the vendored source drop `vendor/foldkit` (vendored 2026-10-24) |
| license | MIT (Copyright (c) 2025 Devin Jameson) |

The sha256 above is the digest of the upstream `FOLDKIT.md` as it exists in the vendored drop:

```powershell
(Get-FileHash vendor/foldkit/packages/create-foldkit-app/templates/base/FOLDKIT.md -Algorithm SHA256).Hash
# 528a49661fa7265fcf4f724413b8b004ce43e5f5773dcd0e178ec300ec9f7faf
```

## Why this skill exists

Foldkit is the Elm-architecture UI framework the runtime UI is being rebuilt on, and it is tightly
coupled to Effect. The framework source is vendored at `vendor/foldkit` (pinned by
`vendor/foldkit/VENDORED.json`), but it is an aggregate source drop, not a workspace dependency, and
the upstream guide assumes a standalone project with a `repos/foldkit` git subtree and a vendored
`examples/` directory. Neither exists here. Without a repo-local skill, an agent either follows dead
paths or invents conventions.

## Local adaptation

The upstream `FOLDKIT.md` is source material; the installed `SKILL.md` is a rewrite for this
repository. Concretely:

- Removed the upstream guide's `repos/foldkit` subtree instructions (subtree add/pull, the
  `subtree_prompted` line) and the "vendor the repository" offer. This repository already vendors
  Foldkit under `vendor/foldkit`; the skill points there directly.
- Pointed at the vendored framework source (`vendor/foldkit/packages/foldkit/src`) and the two
  vendored production apps (`vendor/foldkit/packages/typing-game/client/src`,
  `vendor/foldkit/packages/website/src`) as the canonical references.
- Dropped the upstream example apps (weather, kanban, auth) from every instruction: upstream
  `examples/**` is excluded from the vendoring payload, so those paths do not exist in this
  checkout.
- Added the repository layout this repo actually uses: the first-party wrappers
  `role-model-router/packages/foldkit` and `role-model-router/packages/foldkit-ui`, the live app
  shell `role-model-router/apps/runtime-ui-next`, and the rule that application code imports the
  wrappers, never the vendored tree.
- Kept the upstream convention sections (project conventions, update, view, commands, file
  organization, testing, code style, message layout, debugging) because they encode the architecture,
  condensed and re-pointed at the vendored code.
- Recorded the devtools MCP requirement: the repository-root `.mcp.json` registers
  `foldkit-devtools`, which needs the Foldkit dev server running.
- Attributed the source and license above (MIT).

## Refreshing the pin

When Foldkit is re-vendored, read the template at the new `foldkit@` tag from the new
`vendor/foldkit` drop, re-adapt `SKILL.md` (do not copy `FOLDKIT.md` verbatim), recompute the
sha256 above, and update this table in the same commit. The upstream guide changes with Foldkit's
APIs; a stale copy sends agents after APIs the vendored source no longer exports.
