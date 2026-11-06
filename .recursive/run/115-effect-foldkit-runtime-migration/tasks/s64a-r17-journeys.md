# S64a R17 journeys J3/J4/J6 against the packaged runtime (public)

Worktree: D:/DEV/role-model/.worktrees/115-effect-foldkit-runtime-migration
R27 is parked at a documented boundary (see `evidence/other/s62-r27-boundary.md` plus the primitives landed in `host-runtime-resource.ts`); it is NOT complete. This task advances a different, achievable requirement: R17 journeys **J3, J4, J6**, against the PACKAGED executable.

## Scope

J3 **cancel/error**: request cancellation and provider error must not create a false success, must not leave a hung spinner, and must not double-account in telemetry.
J4 **metadata/effort**: an eligible model with an explicit reasoning effort must carry model, reason and effort metadata through telemetry/API/rendered UI, and live-only support metadata must not be fabricated for non-live requests.
J6 **configured replay/eval/learning**: with the capability configured, the arm/job produces evidence with real ids; when it is NOT configured, the UI and API must report honest disabled/unavailable states - never seeded success rows.

## Method (per journey)

1. Start the PACKAGED executable on an ephemeral port with a fresh temp state root (E:) and a mock upstream you control; never bind 3456/3457/3458 and never touch operator state.
2. Drive the journey through the real HTTP API (curl-equivalent), capture the request/decision/provider/capture ids, then read them back through telemetry, the API and the rendered UI (browser tools or the served HTML readback of the same surfaces).
3. Assert with throwing checks on REAL values: the same id appears in each surface; counters before/after differ by exactly one; a cancel produces a terminal non-success state and no hung spinner; a disabled capability renders the honest disabled text.
4. Where the environment genuinely cannot exercise the path (no provider/weights), record **NOT RUN** with the reason - do not substitute a fixture.

## Evidence

- A script per journey under `evidence/journeys/` that throws on any failed assertion.
- Logs with the exact commands and outputs, the captured ids, before/after counters, and the UI readback showing the same ids.
- `s64a-tdd.json`: per journey, PASS / NOT RUN / FAIL with the reason, plus the assertion count and the exact commands.

## Constraints

NO packaging, no installs, no commits, no subagents; ephemeral ports and temp state only; read-only inspection of storage; never POST to :3456.

## Report
Per journey: what you drove, the ids, the assertions with counts, the honest classification, and any defect the journey exposed.