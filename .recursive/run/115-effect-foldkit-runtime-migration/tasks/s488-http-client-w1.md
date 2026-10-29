# S488 — Workspace W1: shared application HTTP client

Status: pending
TDD Mode: strict
Public basis 3299ad00; private b8733789.

Gap (S485 trace #3): app.ts builds 8+ independent clients; readback transport owner-local; commands.ts localPolicy bypasses with global fetch (no token/signal).

Repair (bounded W1a): NEW src/http/runtime-client.ts - one typed runtime HTTP client owning baseUrl, authorization token, AbortSignal-per-request, JSON decode + typed error; migrate ONLY the localPolicy client path (commands.ts localPolicy request) to it; keep all other clients unchanged (no wholesale rewrite). Behavior parity: same URL/path/headers/body semantics; add token+signal where the current bypass lacks them only if the local policy host contract accepts authorization (verify host; if it rejects the header, keep headerless but still centralize).

Strict RED first: test asserting localPolicy requests flow through the shared client (injectable fetch sees the shared-client call with exact path/headers); today it uses a separate global fetch path. Then minimal wiring; UI tsc + s458/s25d parity suites + nonempty lint; freeze hashes; independent review by a different member; no commit. No Dialog/Listbox or feature co-location in this slice (W1b/W1c later).
