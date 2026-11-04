# Installed skill provenance: `effect-ts`

This skill is an installed copy of upstream `Effect-TS/skills`, not first-party text.

| field | value |
| --- | --- |
| upstream | https://github.com/effect-ts/skills |
| path upstream | `skills/effect-ts/SKILL.md` |
| commit | `2309e6f27d9955b434c0e3f394b945c136e89fd2` ("Update effect-ts skill to install effect@rc (#12)") |
| retrieved | 2026-09-27 |
| sha256 | `fb9ca878f0a7fa98046d5b34396cb7febcef7a143546fadff68029e727479e0f` |

## Why it is installed here

The public repository vendors Effect v4 (`vendor/effect`) and `effect-mq` (`vendor/effect-mq`) and treats Effect as
the default implementation substrate (`AGENTS.md` § "Effect-first implementation rule"). This skill is what an agent
reads before writing that Effect code: it points at the guidance shipped with the library rather than at a copy that
can drift from the pinned version.

## Local adaptation

Upstream points at `node_modules/effect/AGENTS.md`, which assumes a published `effect@rc` package. This repository
consumes the vendored source drop instead, so the same instruction resolves to:

- `vendor/effect/packages/effect/*.md` (the topic guides shipped with the pinned tree: `SCHEMA.md`, `CONFIG.md`,
  `HTTPAPI.md`, `MCP.md`, `OPTIC.md`, `ARBITRARY.md`);
- `vendor/effect/packages/**/src/**` for the source of any API the guides do not cover;
- `role-model-router/packages/effect/src/**`, the workspace package published as `effect` from that vendored tree.

## Local delta from upstream (2026-11-04)

Upstream points at `node_modules/effect/...`, a package this repository never installs: it consumes
the vendored source drop (`vendor/effect`) and publishes `effect` from
`role-model-router/packages/effect`. The installed `SKILL.md` therefore changes exactly three body
lines; everything else is byte-identical to the upstream file described above. The sha256 recorded
above is the digest of the **unmodified upstream file**, not of the installed copy.

| upstream line | upstream text | installed text |
| --- | --- | --- |
| 15 | the source code from `node_modules/effect/src`. | the source code from `vendor/effect/packages/effect/src`. |
| 30 | first read `node_modules/effect/AGENTS.md` | first read `vendor/effect/packages/effect/*.md` |
| 34 | search through the source code in `node_modules/effect/src`. | search through the source code in `vendor/effect/packages/effect/src`. |

## Refreshing the pin

```bash
git clone --depth 1 https://github.com/effect-ts/skills.git /tmp/effect-skills
cp /tmp/effect-skills/skills/effect-ts/SKILL.md .agents/skills/effect-ts/SKILL.md
```

Then re-apply the three-line vendor redirect recorded above and update this file's commit, retrieval date and upstream digest in the same commit. The installed file is intentionally not byte-identical to upstream, so the recorded sha256 stays the upstream file's digest.
