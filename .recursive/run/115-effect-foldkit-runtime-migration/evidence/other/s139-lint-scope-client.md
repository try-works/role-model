# S139 R33 lint scope: what I changed is clean; what I did not change is not

R33 requires the lint on every **changed** first-party slice. Measured with absolute paths (the relative-path trap from S138):

| File | Findings | Changed by me this run? | Disposition |
|---|---|---|---|
| `src/control-view.ts` | **0** | yes (accessible name on the controller select) | clean |
| `src/view.ts` | 29 | no | pre-existing, out of scope |
| `src/control.ts` | 20 | no | pre-existing, out of scope |
| `src/readback.ts` | **73** | no | pre-existing, out of scope |

## Why the pre-existing 122 are not being swept in

They are concentrated in the client's **readback layer**: `unknown` parameters, `typeof` narrowing and type assertions while parsing JSON from the host. Converting that to `Effect.Schema` boundary parsing is the correct long-term answer, and it is a substantial refactor of the file every page depends on - not a lint cleanup to bolt onto a migration run at round 118.

Sweeping them in would mean either (a) mass `SAFETY:` comments that assert invariants nobody verified, which is worse than the finding, or (b) a risky rewrite of the readback layer with no new tests to prove it. Neither is honest lint remediation.

What I will not do is claim the client is lint-clean. It is not, and it was not before this run touched it.

## What this run did add on the client side

- the accessible name on the controller select (`control-view.ts`, lint clean);
- `s110` nav-link resolution (25 cases), `s111` per-route accessible names (7 routes), and the focus-visible/reduced-motion pin in the build guard.

Those are the client slices this run touched, and they are clean.