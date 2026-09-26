# Vendored upstream: Effect v4

This directory is a **verbatim copy of upstream Effect v4 source**, not first-party code. It is not a workspace
package, is not imported by any build, and is excluded from linting by the repository's `**/vendor/**` ignore.

| field | value |
| --- | --- |
| upstream | https://github.com/Effect-TS/effect |
| tag | `effect@4.0.0-rc.117` |
| commit | `14a3f140095fdebbff9162944fe7d4ea83e054e6` |
| commit date | 2026-09-20T23:56:33Z |
| vendored into | role-model |
| vendored at | 2026-09-25T23:38:39.006Z |
| license | MIT (Copyright (c) 2023 Effectful Technologies Inc) — see `LICENSE` |
| payload | `packages/**`, `LICENSE`, `README.md`, `MIGRATION.md` |
| file count | 1825 |
| size | 36.8 MB |
| content digest | `sha256:7f07b8268d769a4096f5550cd6f6be5a47a1463f3a2f7d445cf543d8a960020d` |

## Why it is here

Effect v4 is the runtime/effect-system library the router is being aligned to. Vendoring keeps the exact reviewed
source in-repo (offline builds, no network resolution, an auditable pin) instead of a floating semver range.

## What was copied, and what was not

Copied verbatim: the upstream `packages/` tree (all package groups: `effect`, `platform`, `sql`, `ai`,
`atom`, `opentelemetry`, `vitest`, `tools`), plus the upstream `LICENSE`, `README.md` and the v3→v4
`MIGRATION.md`.

Deliberately not copied: `.git`, `node_modules`, `*.tsbuildinfo`, the upstream `ai-docs/`, `scripts/`,
`.github/`, `patches/` and the upstream lockfile/workspace files. Nothing in this tree has been modified: the
content digest above is computed over every file exactly as shipped.

## Licence and attribution

Effect is MIT-licensed; the upstream licence text is retained verbatim in `LICENSE`. This repository's own licence
(BUSL-1.1 with an Additional Use Grant) does not relicense the vendored tree: the files here remain under the MIT
terms and the upstream copyright notice, as required by `CONTRIBUTING.md` § "Third-party material".

## Verifying or refreshing the pin

```bash
node scripts/vendor-effect.mjs --verify          # recompute the content digest against VENDORED.json
node scripts/vendor-effect.mjs --sync            # re-clone the pinned tag and re-copy the payload
node scripts/vendor-effect.mjs --sync --tag <tag> --commit <sha>   # move the pin deliberately
```

Moving the pin is a reviewed change: update `VENDORED.json`, `PROVENANCE.md` and the vendored files in the same
commit so the digest always matches the tree.
