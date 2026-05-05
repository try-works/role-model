# Memory Model Boundary

The current codebase still exposes a `MemoryStore` contract boundary without a production runtime memory backend,
but the router-runtime architecture is now locked to a **SQLite-first, same-host, local-disk** baseline for the
first complete runtime milestone.

What exists now:

- a shared store contract package,
- protocol and architecture language for future memory-backed behavior,
- explicit architectural selection of SQLite as the first authoritative runtime store,
- continued extension seams for later secondary stores.

What the architecture lock now requires:

- SQLite-backed local persistence for routed-model handoff and context continuity,
- schema-version and migration responsibilities,
- backup, restore, deletion, retention, and redaction expectations,
- bounded retrieval and context-envelope behavior built on top of the local store.

What is still deferred:

- the production runtime implementation of that SQLite layer,
- synchronization strategies,
- secondary backends beyond the SQLite-first baseline,
- application-layer encryption beyond the local OS or disk-encryption baseline.
