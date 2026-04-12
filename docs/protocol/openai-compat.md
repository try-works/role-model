# OpenAI Compatibility

OpenAI-compatible surfaces are adapters, not the canonical protocol.

The baseline allows:

- exposing selected routing outputs in an OpenAI-like shape,
- mapping endpoint metadata or requests into compatibility helpers,
- keeping the canonical contract in `protocol/schemas/` and `docs/protocol/`.

Compatibility layers must not redefine or replace the canonical role-model protocol entities.
