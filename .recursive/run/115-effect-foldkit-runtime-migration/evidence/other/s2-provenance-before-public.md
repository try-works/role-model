# Vendored upstream: effect

This directory is a **verbatim copy of upstream effect source**, not first-party code. It is not a workspace
package, is not imported by any build, and is excluded from linting by the repository's `**/vendor/**` ignore.

| field | value |
| --- | --- |
| upstream | https://github.com/Effect-TS/effect |
| tag | `effect@4.0.1` |
| commit | `460272d30457f4697d8b8c52cad41caccbcace08` |
| commit date | 2026-10-04T21:47:48Z |
| vendored into | role-model |
| vendored at | 2026-10-06T23:06:08.534Z |
| license | MIT (Copyright (c) 2023 Effectful Technologies Inc) — see `LICENSE` |
| payload | `packages`, `LICENSE`, `README.md`, `MIGRATION.md` |
| file count | 1878 |
| size | 38.5 MB |
| content digest | `sha256:0d0028aa7de72ff9e6a8e39f4bc4232640bd1111b30aaa3440d0c53116a49749` |

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
