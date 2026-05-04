# Public docs

This folder contains the public-facing documentation for `role-model`.

It is intentionally separated from the rest of `docs/` so a future docs site can use `docs/public/` as its
content root while the existing protocol and architecture material remains available as deeper reference
documentation.

## Start here

1. [Introduction](introduction.md)
2. [Quickstart](quickstart.md)
3. [How role-model works](concepts/how-role-model-works.md)
4. [Protocol overview](concepts/protocol-overview.md)
5. [Routing overview](concepts/routing-overview.md)

## What these docs cover

These pages are optimized for a new external technical reader who wants to understand:

- what `role-model` is
- what problem it solves
- how the system works end to end
- what the protocol owns
- how routing decisions are made and explained

## What stays in reference docs

The public docs summarize and link to the deeper reference material instead of duplicating it.

- Protocol reference docs: [`../protocol/`](../protocol)
- Architecture notes: [`../architecture/`](../architecture)
- Canonical schemas and fixtures: [`../../protocol/README.md`](../../protocol/README.md)
- Reference router implementation: [`../../role-model-router/README.md`](../../role-model-router/README.md)

## Suggested reading paths

| Path | Best for |
| --- | --- |
| [Introduction](introduction.md) -> [Quickstart](quickstart.md) | first-time readers |
| [Introduction](introduction.md) -> [Protocol overview](concepts/protocol-overview.md) | protocol/design readers |
| [Introduction](introduction.md) -> [How role-model works](concepts/how-role-model-works.md) -> [Routing overview](concepts/routing-overview.md) | routing and system readers |
