# S493 — enumerate remaining ledger groups

Status: pending
TDD Mode: pragmatic (evidence ledger, checker already fail-closed; RED is checker rejection until rows complete)
Private basis 90e5ba27.

Gap (S489 residual): 3 not-yet:* rows are group-level placeholders (path/export unresolved); 20 callerless rows callerStatus unresolved. Enumerate the 3 groups into concrete per-operation rows with real repo/path/export from current private source (grep the actual groups); resolve callers where discoverable from call sites; keep missingContract only where the contract truly does not exist. Do NOT fabricate dispositions: keep not-converted with rationale where conversion is genuinely absent.

Verify: run115-b10-ledger-schema-v2.test.mjs + run115-b10-ledger-check.test.mjs stay green (checker must accept the enumerated rows without weakening); node --check; lint 0 on changed files; record red (checker rejecting placeholder rows when required) + green logs; freeze hashes; independent review; no commit. No product code.
