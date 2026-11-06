# S509 — W1c: co-locate the device-auth family

Status: pending
TDD Mode: pragmatic (pure refactor; same compensation as S505/S507)
Public basis 8f0498bb.

Extract device-auth (model slice incl deviceAuthDialog/key, messages, update handlers incl poll/cancel/dialog wiring, view incl the inline form + dialog panel from control-view.ts) into src/features/device-auth/ with byte-identical re-export shims where other modules import them; parent createUpdate delegates to extracted pure plans; zero message/query/interrupt flow change; NO test edits (s397/s425/s499/s491/s458/s25d/s111 stay unchanged green); dialog/listbox imports unchanged; flat Model/routeContent/createUpdate structure retained; no other families.

Evidence: unchanged suites green (s397+s425+s499+s491+s458+s25d+s111), UI tsc 0, rendered audit /control/endpoints + device-auth route PASS, s247 click budget 3/3, nonempty lint zero added-line, pragmatic RED=N/A rationale in evidence/logs/s509-green.log header. Freeze hashes; independent review by a different member; no commit; no whole Workspace claim.
