# Immediate resurrection reproduction

Date: `2026-07-17`
Execution context: isolated run-76 worktree, temporary runtime-state directory removed after the probe.

Executable harness:

- `/.recursive/run/76-configured-model-membership-authority-and-eject-convergence/evidence/root-cause/reproduce-immediate-resurrection.ts`

Exact command from the repository root:

```powershell
node --import tsx .\.recursive\run\76-configured-model-membership-authority-and-eject-convergence\evidence\root-cause\reproduce-immediate-resurrection.ts
```

The harness sets a clearly synthetic, process-local API-key placeholder only to satisfy the account-readiness guard; it performs no provider network request.

The probe created a healthy two-model Moonshot account, activated `moonshot/kimi-k2.5` through the real backend API so both a SQLite endpoint and `operator-intent.remoteActivations` existed, then called `removeProviderAccountModel()` and immediately reread accounts, endpoints, and the manifest.

Observed output:

```json
{
  "before": [
    "moonshot/kimi-k2.5",
    "moonshot/kimi-k2.7-code"
  ],
  "removal": {
    "success": true,
    "removedAccount": false
  },
  "after": [
    "moonshot/kimi-k2.5",
    "moonshot/kimi-k2.7-code"
  ],
  "endpointModels": [],
  "remoteActivations": [
    {
      "providerAccountId": "moonshot.personal.primary",
      "modelId": "moonshot/kimi-k2.5"
    }
  ]
}
```

Interpretation:

- DELETE reported success.
- The endpoint row was removed.
- The activation survived.
- `rebuildCurrentState()` ran inside the DELETE mutation and immediately re-added the model to account `allowedModels` from that activation.
- Restart is not required to trigger the membership resurrection; restart later supplies an additional endpoint-recreation path.

Two initial harness attempts were rejected before mutation: the first used a provider absent from the normalized catalog, and the second lacked a resolved API-key environment variable so endpoint activation correctly refused an unready account. The successful attempt used a catalog-backed account plus a temporary placeholder environment value. No product or test source was edited.
