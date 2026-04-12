# Protocol

`protocol/` is the canonical contract layer for role-model.

- `schemas/` contains authoritative JSON Schemas
- `fixtures/` contains example protocol-shaped artifacts used by tooling and tests

Generated types and runtime validators must follow these schemas instead of redefining the protocol in a
parallel type system.
