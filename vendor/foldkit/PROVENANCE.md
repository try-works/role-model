# Vendored upstream: foldkit

This directory is a **verbatim copy of upstream foldkit source**, not first-party code. It is not a workspace
package, is not imported by any build, and is excluded from linting by the repository's `**/vendor/**` ignore.

| field | value |
| --- | --- |
| upstream | https://github.com/foldkit/foldkit |
| tag | `foldkit@0.169.0` |
| commit | `7ee214268c602967937b80f6f20d1e831f2e8ab6` |
| commit date | 2026-10-20T23:38:00Z |
| vendored into | role-model |
| vendored at | 2026-10-24T13:53:19.868Z |
| license | MIT (Copyright (c) 2025 Devin Jameson) — see `LICENSE` |
| payload | `packages`, `LICENSE`, `README.md` |
| file count | 2020 |
| size | 11.9 MB |
| content digest | `sha256:14a19d180fd43784b1c11073d9c7c6efa3a599c43b2fb8e5bcbd64136ed8322d` |

## Why it is here

Foldkit is the UI and application-architecture library the client port is being aligned to. Vendoring keeps the exact reviewed source in-repo (offline builds, no network resolution, an auditable pin) instead of a floating semver range.

## What was copied, and what was not

Copied verbatim: `foldkit`, `@foldkit/ui`, `@foldkit/devtools`, `@foldkit/vite-plugin`, `@foldkit/markdown`, `@foldkit/oxlint-plugin`, `create-foldkit-app`, `@foldkit/devtools-mcp`, `@foldkit/node`, `website`, plus the upstream licence and top-level documentation named in the
payload row above.

Deliberately not copied: .git, node_modules, *.tsbuildinfo, **/dist/**, **/coverage/**, .github/**, examples/**, scripts/**. Nothing in this tree has been modified: the content digest
above is computed over every file exactly as shipped.

## Licence and attribution

`foldkit` is MIT-licensed; the upstream licence text is retained verbatim in `LICENSE`. This repository's own
licence (BUSL-1.1 with an Additional Use Grant) does not relicense the vendored tree: the files here remain under the
MIT terms and the upstream copyright notice, as required by `CONTRIBUTING.md` § "Third-party material".

## Verifying or refreshing the pin

```bash
node scripts/vendor-upstream.mjs --name foldkit --verify          # recompute the content digest against VENDORED.json
node scripts/vendor-upstream.mjs --name foldkit --sync            # re-clone the pinned tag and re-copy the payload
node scripts/vendor-upstream.mjs --name foldkit --sync --tag <tag> --commit <sha>   # move the pin deliberately
```

Moving the pin is a reviewed change: update `VENDORED.json`, `PROVENANCE.md` and the vendored files in the same
commit so the digest always matches the tree.
