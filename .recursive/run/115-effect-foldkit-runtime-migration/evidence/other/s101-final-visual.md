# S101 Final visual pass on the shipped build (0.0.20-81-g17cbdd21)

Host: `E:/rm-tmp/s97a/release/win32-x64/role-model-dev.exe` (exe sha256 `4898f865...`), port 5928, fresh `E:` state, fixture catalog, rebuilt client attached.

| Route | Result |
|---|---|
| `/models` | `state=success`; real cards, e.g. **GPT-4.1 Mini Fast - Provider: openai - Endpoint: openai.personal.primary.us-east-1.fast - Status: healthy - Effort: unavailable - Roles: analyst, architect, …** (3 models from the host, none invented) |
| `/learning` | one `h1`; `ok` / `empty` / `empty`; `h2` sections Knowledge worker, Replay jobs, Evaluation jobs |
| `/control/controller` | one `h1`; select showing the current controller `openai.personal.primary.us-east-1.fast`; **Save controller** present |
| `/` | one `h1` Runtime overview; **4 filter selects**; `0` chart SVGs because telemetry is empty - the honest empty state, not a broken render |

![Models page on the shipped build](.recursive/run/115-effect-foldkit-runtime-migration/evidence/visual-final/models-newbuild.png)

## Why this pass mattered

The earlier `/models` check on my own seeded host rendered *empty* because that state root had no catalog - correct behaviour, but it left the success path unverified on the current build. With the fixture catalog present the page renders real rows, so both the empty and the success states are now evidenced on the shipped binary.
