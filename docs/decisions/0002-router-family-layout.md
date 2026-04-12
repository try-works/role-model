# ADR 0002: Router Family Layout

## Decision

Router-specific implementation lives under `role-model-router/`, split into skills, packages, apps, and
native crates.

## Consequence

Future desktop, Pi, plugin, or daemon hosts can grow under the same family layout without moving shared
protocol-wide tooling out of the root `packages/` space.
