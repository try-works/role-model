# Post-closeout addendum 20 — a finalized comparison now carries effortComparability

## Result (verified live on :3457)
A freshly replayed request produced a finalized evaluation comparison whose `comparability.effortComparability`
is populated:

```json
[
  { "comparability": "source_effort_unspecified", "endpointId": "deepseek-…-flash-high",
    "modelId": "deepseek/deepseek-flash", "reasoningEffort": "high",
    "sourceModelId": "chatgpt/gpt-5.6-luna", "sourceReasoningEffort": null }
]
```

The comparison group row is `status: finalized` (evaluation_jobs moved 35 -> 36 completed). This closes the R9
producer-plumbing carry: `classifyReplayArmEffort` records flow through the auto-replay resume entry (addendum 16),
survive the resume store round-trip (addendum 17), and the evaluation resume can resolve the arms (addendum 18 +
addendum 19 compact dispatch locators) to finalize the comparison carrying `effortComparability`.

The comparability is `source_effort_unspecified` because the source capture's reasoning effort is not recorded on
the capture's top-level `reasoningEffort` (the harness request's `role_model.intent.reasoningEffort` does not land
there). That is a valid R9 comparability value; "matched"/"mismatched" would require the source effort to be captured.
