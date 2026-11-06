# S337-lane — J1-J6 real-client lane plan (Lead-owned, owner-gated)

Prepared from R15-R17 clauses (00-requirements.md:148-181) + REASSESSMENT-AND-EXECUTION.md acceptance section. The product slices (B0-B6/B9/B10/R14/R23) are the prerequisites; this plan pins what the final acceptance lanes must prove, so the remaining product work targets them.

## Lanes (R17 J-matrix, verbatim by reference)

- **J1 stream** — ordinary DSH or pi CLI -> exact packaged router -> approved real provider; stream journey with joined request/decision/provider/capture IDs.
- **J2 tool turns** — ordered tool_call_id/result pairs and graph relationships through telemetry/API/rendered UI/graph/payload/projections.
- **J3 cancel/error** — no false success, no hung spinner, no double accounting.
- **J4 metadata/effort** — eligible model/reason/effort + live-only support metadata. MAY be NOT_RUN only with exact capability/authorization evidence + named alternative coverage (reassessment).
- **J5 restart** — persisted history after restart (not sockets), same IDs, bounded watermarks, before/after counters.
- **J6 configured replay/eval/learning** — configured arms/jobs/evidence, honest disabled/unavailable. MAY be NOT_RUN with exact evidence.

## R15 constraints (client inference)

- Both DSH and pi when shared contracts change; curl/fixture/script-only never substitute.
- Isolate client profile/session; NEVER repoint the controller session or the user's active model.
- Record executable/plugin/version, URL/discovery/alias/active model/effective config/capabilities; bound requests/tokens/time/cost; classify auxiliary calls.
- **Unauthorized/unavailable provider -> NOT RUN, no fixture substitution.**

## R16 constraints (R/D/C comparison)

- Preserve R (v0.0.20, isolated copy, unchanged bytes), D (clean pre-migration pair: public f0d50fab/private 16021cc5 per reassessment D0; release-line D1 945a8906/266ccf76), C (candidate) separately; independent state/config; classified deltas; no operator 3456/3457/3458 occupation; no shared SQLite or old-binary-on-new-schema.

## Owner questions (blocking the real-provider lanes only)

1. Approved real provider config/credentials for J1-J5 (or explicit NOT RUN authorization with the evidence shape in R15).
2. Confirmation the isolated client profile/session procedure (separate profile, never the controller session) is authorized on this machine.
3. Fixed workload budget (requests/tokens/time/cost) approval for the lanes.

Until (1)-(3) are answered, J1-J6 remain NOT RUN with this plan as the evidence; the remaining public/private product slices (R23 families, B9 Layers, B10 ledger, CI step) continue in parallel.
