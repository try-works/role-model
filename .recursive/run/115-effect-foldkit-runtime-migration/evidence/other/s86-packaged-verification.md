# S86 Packaged verification by the lead: origin gate (all four proofs) and a scripted config E2E

Artifact verified: `E:/rm-tmp/s85a/release/win32-x64/role-model-dev.exe`, **sha256 `9faa2e1c8e7bd2bc176270de15e8a1bd580d86067914b00eb600898b77975827`** (I recomputed it myself), version `0.0.20-66-g91f089ec`.

## Origin gate on the PACKAGED binary (ephemeral 5910, fresh temp state)

| Proof | Result |
|---|---|
| (a) foreign `Origin: https://evil.example` `PATCH /api/role-model/controller` | **403** `{"error":"cross-origin write rejected","code":"cross_origin_write_rejected"}`, **no ACAO**, controller still `openai.personal.primary.us-east-1.fast` |
| (b) same-origin `Origin: http://127.0.0.1:5910` PATCH | **200**, no ACAO, controller became `anthropic.team.shared.us-east-1.default` |
| (c) no-`Origin` PATCH back | **200** (CLI/curl path preserved) |
| (d) `GET /healthz` with foreign Origin | **200** with `Access-Control-Allow-Origin: *` (reads unchanged) |

So the critical fix is proven in the shipped bytes, not just in source tests.

## Scripted config E2E (replaces my earlier unlogged claim)

Script: `evidence/e2e/s86-config-editor.ps1`; transcript: `evidence/e2e/s86-config-editor.log`.

```
[step1] GET applied=True strategy=controller
[step2] PUT status=200
[step3] GET after save strategy=baseline
[step4] restore PUT status=200 final strategy=controller
RESULT: PASS - GET -> PUT -> GET persisted -> PUT restore -> GET verified
```

The script asserts the persisted value and the restore, and fails (throws) if either check does not hold. This is reproducible by running the script, unlike the interactive session I reported earlier without a log.
