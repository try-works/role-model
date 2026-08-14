# Run 81 activation policy (v1)

```json
{
  "activationPolicyVersion": 1,
  "operatorAttestation": "activate-production",
  "receipt": { "kind": "knowledge_validation", "reviewed": true, "safetyReviewed": true, "redacted": true, "holdoutPassed": true }
}
```

- Instance `#productionActivation` defaults false; static `productionActivation` remains false (ungated/always-on not shipped).
- `activate(policy)` requires version 1, attestation, verified receipt claims, and a shadow candidate.
- `rollback()` clears candidates and deactivates.
- `productionPromptInjection` stays false on derive; this run does not auto-inject on activate.
