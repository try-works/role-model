# Vendored upstream: effect-mq

This directory is a **verbatim copy of upstream effect-mq source**, not first-party code. It is not a workspace
package, is not imported by any build, and is excluded from linting by the repository's `**/vendor/**` ignore.

| field | value |
| --- | --- |
| upstream | https://github.com/TeamWarp/effect-mq |
| tag | `v0.7.0` |
| commit | `5fea694188ee33c132bed27e1f97c40533276511` |
| commit date | 2026-08-25T12:39:17-04:00 |
| vendored into | role-model |
| vendored at | 2026-09-26T00:09:06.284Z |
| license | MIT (Copyright (c) 2026 Adam Rankin) — see `LICENSE` |
| payload | `packages`, `docs`, `LICENSE`, `README.md`, `CHANGELOG.md`, `ROADMAP.md` |
| file count | 65 |
| size | 1.1 MB |
| content digest | `sha256:aa7cae59104a2472ea5127488641643eca5498b5a4955d362b4ff37c5b76f655` |

## Why it is here

effect-mq is the Effect-native background-jobs library (schema-first job definitions, storage-agnostic queue core, worker runtime and a drizzle/Postgres store) the durable-work lane is being aligned to. It targets the same Effect v4 line vendored under `vendor/effect`.

## What was copied, and what was not

Copied verbatim: `effect-mq`, plus the upstream licence and top-level documentation named in the
payload row above.

Deliberately not copied: .git, node_modules, *.tsbuildinfo, examples/**, designs/**, tools/**, .github/**. Nothing in this tree has been modified: the content digest
above is computed over every file exactly as shipped.

## Licence and attribution

`effect-mq` is MIT-licensed; the upstream licence text is retained verbatim in `LICENSE`. This repository's own
licence (BUSL-1.1 with an Additional Use Grant) does not relicense the vendored tree: the files here remain under the
MIT terms and the upstream copyright notice, as required by `CONTRIBUTING.md` § "Third-party material".

## Verifying or refreshing the pin

```bash
node scripts/vendor-upstream.mjs --name effect-mq --verify          # recompute the content digest against VENDORED.json
node scripts/vendor-upstream.mjs --name effect-mq --sync            # re-clone the pinned tag and re-copy the payload
node scripts/vendor-upstream.mjs --name effect-mq --sync --tag <tag> --commit <sha>   # move the pin deliberately
```

Moving the pin is a reviewed change: update `VENDORED.json`, `PROVENANCE.md` and the vendored files in the same
commit so the digest always matches the tree.
