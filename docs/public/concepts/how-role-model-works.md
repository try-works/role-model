# How role-model works

`role-model` turns AI routing into a protocol-driven flow instead of a pile of model-specific conditionals.

## The end-to-end flow

At a high level, the baseline works like this:

1. **Discover or register endpoints.** Provider- or host-specific inputs are normalized into concrete
   endpoint identities and capability profiles.
2. **Describe the request.** A request declares task type, required capabilities, modalities, tool needs,
   context needs, and policy hints.
3. **Apply eligibility filters.** The router removes endpoints that fail hard requirements such as missing
   capabilities, unsupported modalities, policy denies, or budget constraints.
4. **Score the remaining candidates.** The router uses observed performance first, then benchmark evidence,
   then declared profile data, then neutral defaults.
5. **Select and explain.** The router emits a `RouterDecision` with a chosen endpoint, exclusions,
   selection reasons, and fallback metadata.
6. **Emit observability artifacts.** Trace spans, trace events, usage events, and observed performance can be
   recorded alongside the decision.

## The pieces involved

| Piece | Purpose |
| --- | --- |
| request | the work that needs to be satisfied |
| role and task metadata | the semantic shape of the work |
| endpoint identity | the concrete thing being routed to |
| declared profile | what an endpoint says it can do |
| observed profile | how it has actually been behaving |
| routing policy | the hard constraints and preferences |
| observability artifacts | the explanation and evidence trail |

## A concrete walkthrough

The current smoke baseline is a good small example.

The request asks for:

- task type `code.edit`
- required capability `code.edit`
- preferred capability `reasoning.multi_step`
- required modality `text`
- tool support
- balanced strategy
- local preference

The sample endpoints are:

| Endpoint | Capabilities |
| --- | --- |
| `cli.local.coder` | `code.edit`, `reasoning.multi_step`, `tools.function_calling` |
| `acp.remote.general` | `text.chat`, `tools.function_calling` |
| `mcp.remote.embedder` | `embeddings.text`, `tools.function_calling` |

The router then proceeds in order:

1. `cli.local.coder` remains eligible because it satisfies the required capability and modality.
2. `acp.remote.general` is excluded with `CAPABILITY_MISSING` because it does not satisfy `code.edit`.
3. `mcp.remote.embedder` is excluded with `CAPABILITY_MISSING` for the same reason.
4. The remaining eligible endpoint is scored using declared and measured evidence.
5. The router chooses `cli.local.coder` and records why.

The emitted decision includes selection reasons:

- `BEST_TOTAL_SCORE`
- `DECLARED_PROFILE_USED`
- `MEASURED_PROFILE_USED`
- `LOCAL_PREFERENCE_APPLIED`

## Why the endpoint model matters

This flow is intentionally endpoint-centric.

The router is not asking "which model family sounds right?" It is asking "which concrete endpoint, with
this provider, runtime, policy shape, and observed behavior, is the best valid target for this request?"

That is what makes the protocol useful across different providers and future hosts.

## Related reference docs

- [Endpoint identity](../../protocol/endpoint-identity.md)
- [Profiles](../../protocol/profiles.md)
- [Roles](../../protocol/roles.md)
- [Tasks](../../protocol/tasks.md)
- [Observability model](../../architecture/03-observability-model.md)
