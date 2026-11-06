# S102 Audit of the five boilerplate rows: replaced with what the tree actually shows

Rows R5, R7, R8, R29 and R39 carried the same non-answer: *"part of this requirement has landed and is recorded in the audit trail, but the requirement is not satisfied in full"*. That sentence cannot be acted on, so I probed each requirement for concrete artefacts.

| Row | Requirement (short) | Probe | Finding |
|---|---|---|---|
| R5 | one Effect identity per realm; subpath/type/import graph; single-runtime guard | grep for a single-runtime guard in `runtime-host-bridge/test` | **not located** in that package - the guard may live elsewhere or not exist; unknown, not done |
| R7 | Crease vendoring with a pinned ledger and licence/owner records | grep `crease` across `packages/` | **6 references** - vendoring exists, but the file/hash/dependency/licence/owner ledger state is **unaudited** |
| R8 | single role-model facade over the design system, donor mapping, a11y matrix | grep `foldcn` across `packages/` | **0 references** - the facade/donor layer is **absent by name**; whatever exists is unnamed or missing |
| R29 | bounded single-flight drain with stop/join and a real-store fault matrix | grep single-flight/drain-join in host `src` | **1 reference** - a single-flight notion exists; the fault matrix (stale leases, failed ack, corrupt/decryption, partial publication) is **unaudited** |
| R39 | maintained `runtime:verify-client-journeys` and `runtime:compare-release` scripts with CI wiring | grep and package.json scan | **0 references, neither script exists** - this requirement is **unimplemented**, not partially landed |

## What changed

The five dispositions now state what is known (with the probe), what is unknown, and - for R39 - that nothing exists. That is still a blocked status, but a reader can act on it.

## The honest headline

Four of the five are "partly there, unaudited"; one (R39) is simply missing. The generic rationale had been hiding that distinction.