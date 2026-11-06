# S96 J4 effort-honoring: NOT RUN, and the reason is a model-profile gap, not endpoint config

The worker tried the obvious seam and the host rejected it; I record the contract rather than the attempt.

## What was declared (temp fixture copy, repo fixture untouched)

An account with a mock `baseUrlOverride` and a registry endpoint `chatgpt.personal.primary.global.sol` for `chatgpt/gpt-6.1-sol` carrying:

`capabilities: ["text.chat","reasoning.effort_control"]`, `reasoningEffort: "medium"`, `reasoningEffortLevels: ["low","medium","high","xhigh","max"]`, and a `reasoning: {supported:true, effortControl:true, effortLevels:[...]}` block.

## What the host published

| Field | Published |
|---|---|
| `reasoningEffort` | `medium` |
| **`reasoningEffortLevels`** | **`[]`** |
| `effortSource` | **`fixed`** |
| `capabilities` | only `text.chat`, `tools.function_calling` |

Requests: `reasoning_effort:"high"` -> **400** `capability_eligibility_error / no_eligible_target`, `requiredCapabilities: ["reasoning.effort_control","text.chat"]`, **mock calls 0**. `ultra` -> same 400, 0 calls. Readback: `reasoningEffort: null`, `effortSource: "none"`, `routing.failed.pre-execution`.

## The contract this exposes

An endpoint's effort capability comes from the **model profile / catalog row**, not from effort fields declared on a registry endpoint. Fixture overrides alone cannot make a model effort-capable, so effort-honoring cannot be exercised in the standalone artifact against fixture endpoints.

That is a **real product dependency** worth knowing: effort control is catalog-driven, and a deployment whose catalog lacks a profile for a model will refuse effort requests for it - exactly what the code did (400 with the required capability named, and no silent downgrade).

## Classification

J4: **NOT RUN** for honoring (precondition: a catalog/model profile carrying `reasoning.effort_control` and levels). Honesty half remains PASS: the refusal is typed, names the missing capability, and never forwarded a request to the mock.