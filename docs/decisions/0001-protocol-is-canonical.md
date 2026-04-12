# ADR 0001: Protocol Is Canonical

## Decision

The canonical contract for role-model is the combination of protocol docs plus JSON Schemas under
`protocol/schemas/`.

## Consequence

Generated types and host adapters may mirror the protocol, but they must not become an independent source
of truth.
