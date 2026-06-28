# pi-role-model

Pi package for connecting Pi to an already-running Role-Model runtime.

Install the public package:

```bash
pi install npm:@try-works/pi-role-model
```

For local development from this repository root:

```bash
pi install ./packages/pi-role-model
```

By default the package connects to `http://127.0.0.1:3456`. To point Pi at a different local Role-Model runtime, set `ROLE_MODEL_ENDPOINT` before starting Pi:

```bash
ROLE_MODEL_ENDPOINT=http://127.0.0.1:4567 pi
```

Remote endpoints are blocked by default. Enable remote runtime access only for a trusted endpoint and trusted project context with explicit `allowRemote` behavior, for example by setting `ROLE_MODEL_ALLOW_REMOTE=1` when launching Pi. A runtime whose downstream discovery reports `authentication.required` fails closed unless a future explicit supported token source is added; the package does not read Pi auth files.

Then use these Pi commands:

```text
/role-model setup
/role-model status
/role-model doctor
/role-model ui
/role-model alias list
/role-model alias recommended
/role-model alias use <alias>
/role-model alias choose <alias>
/role-model alias refresh
/role-model requests [limit]
/role-model explain <request-id|latest>
```

The package registers a Pi provider named `role-model` from Role-Model's downstream OpenAI discovery endpoint at `/api/role-model/downstream/openai`.

`/role-model alias use <alias>` stores the selected alias and asks Pi to make that exact Role-Model model id active when Pi exposes active model selection in the command context. The command accepts either the canonical runtime alias id or a convenience unprefixed alias when the runtime exposes prefixed ids. If Pi rejects the model switch, the command reports that the active model was not changed.

`/role-model requests` and `/role-model explain <request-id|latest>` read the runtime-owned structured request inspection and router decision surfaces. They report routing reason codes, selected endpoint/model, and Observe request links from the runtime without claiming that the Pi package computes benchmark or telemetry analytics itself.

This package does not install, start, stop, or update the Role-Model runtime. It also does not copy or sync Pi provider credentials. Start Role-Model outside Pi, then run `/role-model setup`.
