# Vendored upstream: crease

This directory is a **verbatim copy of upstream crease source**, not first-party code. It is not a workspace
package, is not imported by any build, and is excluded from linting by the repository's `**/vendor/**` ignore.

| field | value |
| --- | --- |
| upstream | https://github.com/Potti1234/creaseui |
| tag | `(commit-only pin: the repository advertises no tag or branch at this commit)` |
| commit | `bb447e363e9c717bf11ebb10b2259f053bff6f71` |
| commit date | 2026-10-22T00:20:36+02:00 |
| vendored into | role-model |
| vendored at | 2026-10-24T17:19:37.224Z |
| license | MIT (Copyright (c) 2026 Potti1234) — see `LICENSE` |
| payload | `src`, `LICENSE`, `compatibility.json` |
| file count | 1512 |
| size | 13.3 MB |
| content digest | `sha256:e37e001fd8ba4a9f2f4e530ea391ca288472251d3a0b6b4450e55e6b666c6bed` |

## Why it is here

Crease UI carries the React-free pure-SVG chart helpers and the lazily imported ECharts renderer the R9 chart surface is modelled on; only its source is vendored, no dependency is added.

## What was copied, and what was not

Copied verbatim: none: this is a component source registry rather than a published package, plus the upstream licence and top-level documentation named in the
payload row above.

Deliberately not copied: .git, node_modules, **/dist/**, **/coverage/**, .github/**. Nothing in this tree has been modified: the content digest
above is computed over every file exactly as shipped.

## Licence and attribution

`crease` is MIT-licensed; the upstream licence text is retained verbatim in `LICENSE`. This repository's own
licence (BUSL-1.1 with an Additional Use Grant) does not relicense the vendored tree: the files here remain under the
MIT terms and the upstream copyright notice, as required by `CONTRIBUTING.md` § "Third-party material".

## Verifying or refreshing the pin

```bash
node scripts/vendor-upstream.mjs --name crease --verify          # recompute the content digest against VENDORED.json
node scripts/vendor-upstream.mjs --name crease --sync            # re-clone the pinned tag and re-copy the payload
node scripts/vendor-upstream.mjs --name crease --sync --tag <tag> --commit <sha>   # move the pin deliberately
```

Moving the pin is a reviewed change: update `VENDORED.json`, `PROVENANCE.md` and the vendored files in the same
commit so the digest always matches the tree.
