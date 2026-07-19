# pi-role-model

Pi package for connecting Pi to an already-running role-model runtime.

Install the public package:

```bash
pi install npm:@try-works/pi-role-model
```

For local development from this repository root:

```bash
pi install ./packages/pi-role-model
```

By default the package connects to production at `http://127.0.0.1:3456`. To point Pi at a different local role-model runtime, set `ROLE_MODEL_ENDPOINT` before starting Pi:

```bash
ROLE_MODEL_ENDPOINT=http://127.0.0.1:3457 pi # stage
ROLE_MODEL_ENDPOINT=http://127.0.0.1:3458 pi # development
```

Remote endpoints are blocked by default. Enable remote runtime access only for a trusted endpoint and trusted project context with explicit `allowRemote` behavior, for example by setting `ROLE_MODEL_ALLOW_REMOTE=1` when launching Pi. A runtime whose downstream discovery reports `authentication.required` fails closed unless a future explicit supported token source is added; the package does not read Pi auth files.

Use slash commands only from an interactive Pi session. Supported command path:

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

Unsupported noninteractive slash-command path:

```text
pi -p "/role-model status"
```

Pi print mode currently does not invoke package slash commands. Treat that as an upstream Pi limitation, not as a role-model routing failure.

The package registers a Pi provider named `role-model` from role-model's downstream OpenAI discovery endpoint at `/api/role-model/downstream/openai`.

For explicit provider prompts, use the provider-relative role-model id that Pi lists for provider `role-model`, for example:

```bash
pi --no-session --provider role-model --model baseline.remote-only -p "<prompt>"
```

Canonical explicit-provider ids are provider-relative aliases such as `baseline.remote-only`. The qualified form `role-model/<alias>` is compatibility-only for Pi surfaces that explicitly require a qualified id for storage or display.

`/role-model alias list` shows the exact ids you can pass to Pi. `/role-model alias recommended` shows the current default. If someone tries a foreign id such as `gpt-4o` under provider `role-model`, the recovery path is to inspect the alias list and retry with the recommended role-model alias.

`/role-model alias use <alias>` stores the selected alias and asks Pi to make that exact role-model model id active when Pi exposes active model selection in the command context. If Pi rejects the model switch, the command reports that the active model was not changed.

`/role-model requests` and `/role-model explain <request-id|latest>` read the runtime-owned structured request inspection and router decision surfaces. They report routing reason codes, selected endpoint/model, and Observe request links from the runtime without claiming that the Pi package computes benchmark or telemetry analytics itself.

This package does not install, start, stop, or update the role-model runtime. It also does not copy or sync Pi provider credentials. Start role-model outside Pi, then run `/role-model setup`.

If Pi prints successful output and then exits with a Windows assertion, that is an upstream Pi bug rather than a package-owned routing failure.

Direct `curl` calls to the role-model `/v1/chat/completions` endpoint remain debug-only fallback tools when diagnosing Pi or runtime issues. They are not the primary supported integration path.
