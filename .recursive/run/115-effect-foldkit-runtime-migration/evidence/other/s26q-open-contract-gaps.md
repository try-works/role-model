# S26q open gaps from the audit review (queued as S26p)

Recorded so they are not lost while the repairs run.

- **The contract test cannot fail**: it calls the production parser on a fixture and asserts only "not error". Reverting the `/dashboard` or `/observe/activity` parser keeps it green, so the two fixes whose old parser also produced empty are not pinned.
- **Fixtures are unbound**: no URL, status, capture timestamp, sha256 or artifact identity. Replacing `endpoints.json` with `[{}]` still passes.
- **No row-level expectations**: changing an `ok` row value or label passes.
- **Empty-by-state, not empty-by-contract**: a parser returning empty for every route passes 11 of 16 readback rows.
- **Uncaptured bodies**: `/observe/observability-snapshot` and `/diagnostics/:id` are ported with invented bodies; control action responses were never captured.

## What the fixes must prove

A fixture manifest bound to the artifact; row-level assertions with values; non-empty dashboard/activity fixtures that pin the two fixes; invalid-body cases that must error; the three missing real captures; and a reverting mutation that turns each fixed parser RED.
