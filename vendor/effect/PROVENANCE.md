# Vendored upstream: effect

This directory is a **verbatim copy of upstream effect source**, not first-party code. It is not a workspace
package, is not imported by any build, and is excluded from linting by the repository's `**/vendor/**` ignore.

| field | value |
| --- | --- |
| upstream | https://github.com/Effect-TS/effect |
| tag | `effect@4.0.0-rc.117` |
| commit | `14a3f140095fdebbff9162944fe7d4ea83e054e6` |
| commit date | 2026-09-20T23:56:33Z |
| vendored into | role-model |
| vendored at | 2026-09-26T00:10:11.819Z |
| license | MIT (Copyright (c) 2023 Effectful Technologies Inc) — see `LICENSE` |
| payload | `packages`, `LICENSE`, `README.md`, `MIGRATION.md` |
| file count | 1825 |
| size | 36.8 MB |
| content digest | `sha256:7f07b8268d769a4096f5550cd6f6be5a47a1463f3a2f7d445cf543d8a960020d` |

## Why it is here

Effect v4 is the runtime/effect-system library the router is being aligned to. Vendoring keeps the exact reviewed source in-repo (offline builds, no network resolution, an auditable pin) instead of a floating semver range.

## What was copied, and what was not

Copied verbatim: `effect`, `platform`, `sql`, `ai`, `atom`, `opentelemetry`, `vitest`, `tools`, plus the upstream licence and top-level documentation named in the
payload row above.

Deliberately not copied: .git, node_modules, *.tsbuildinfo, ai-docs/**, scripts/**, .github/**, patches/**. Nothing in this tree has been modified: the content digest
above is computed over every file exactly as shipped.

## Licence and attribution

`effect` is MIT-licensed; the upstream licence text is retained verbatim in `LICENSE`. This repository's own
licence (BUSL-1.1 with an Additional Use Grant) does not relicense the vendored tree: the files here remain under the
MIT terms and the upstream copyright notice, as required by `CONTRIBUTING.md` § "Third-party material".

## Verifying or refreshing the pin

```bash
node scripts/vendor-upstream.mjs --name effect --verify          # recompute the content digest against VENDORED.json
node scripts/vendor-upstream.mjs --name effect --sync            # re-clone the pinned tag and re-copy the payload
node scripts/vendor-upstream.mjs --name effect --sync --tag <tag> --commit <sha>   # move the pin deliberately
```

Moving the pin is a reviewed change: update `VENDORED.json`, `PROVENANCE.md` and the vendored files in the same
commit so the digest always matches the tree.
