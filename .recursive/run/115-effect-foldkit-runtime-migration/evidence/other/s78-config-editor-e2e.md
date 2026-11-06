# S78 Runtime-config editor: E2E proven by the lead (the worker reported it NOT RUN)

The worker could not exercise the editor end-to-end because a fresh temp state root returns `{"applied":false,"config":null}`. The cause is not the editor: the host needs a `runtime-config.yaml` in its state root. I seeded one (the repo's own fixture shape) and ran the whole flow.

## Setup

- Temp state root `E:/rm-tmp/cfg-state` containing `runtime-config.yaml` with `routing: {strategy: controller, execution_mode: remote_only}`.
- Packaged exe on ephemeral port 5806 with `--static-root` and the rebuilt client. `GET /api/role-model/runtime/config` then returns `{"applied":true, "config": {...}}`.

## Flow driven through the UI

1. `/runtime` shows the editor: **Load runtime config**, a textarea, **Review changes**.
2. Clicking Load filled the textarea (686 chars) with the real config JSON.
3. I changed `"routingStrategy": "controller"` to `"baseline"` and clicked Review changes.
4. The diff rendered: **Changed top-level keys - changed: routingStrategy**, and a **Confirm save** button appeared.
5. Confirm save produced **Applied snapshot from server**; the host then reported `routingStrategy = baseline`.
6. I restored it to `controller` with a direct PUT and confirmed `final = controller` - the edit is reversible.

So the editor contract is proven end-to-end: GET -> edit -> diff -> PUT -> re-read, with the server as the source of truth.

## Why the earlier attempt failed (recorded so it is not repeated)

A temp state root with no `runtime-config.yaml` returns `config: null`, which is the host being honest about an unconfigured runtime - not an editor defect. The E2E always needed a seeded config; the harness, not the feature, was missing.