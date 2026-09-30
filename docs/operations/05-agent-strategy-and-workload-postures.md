# Agent strategy and workload postures

Run 103 ships two operator surfaces on top of the routing posture:

- **Agent strategy** (`agent_strategies`) binds a name to a role, so a downstream agent can select
  `coder.remote-only` and inherit both the routing posture and the role the operator chose for it.
- **Workloads** (`workloads`) binds a name to a workload-shaped posture for cases where no taxonomy
  role fits, optionally pinning the capabilities the workload needs.

Both materialise one client-facing alias per execution scope: `<name>.decision-only`,
`<name>.local-only`, `<name>.remote-only`, `<name>.hybrid`. A scope with no routable targets is
reported (`ALIAS_POOL_EMPTY`) and never widened to the full inventory.

## Configuration

```yaml
routing:
  mode: intelligent            # baseline | difficulty | hybrid | intelligent (controller)
  scoring_strategy: custom     # balanced | quality | latency | cost | custom
  pin_weights: false           # true = nothing may replace the saved scoring strategy
  weights:                     # required iff scoring_strategy: custom
    quality: 0.35
    latency: 0.10
    throughput: 0.05
    cost: 0.35
    reliability: 0.10
    preference: 0.05

agent_strategies:
  coder:
    role_id: coder             # must exist in the runtime role policy
    scoring_strategy: quality
  researcher:
    role_id: researcher
    routing_mode: difficulty   # optional; defaults to routing.mode

workloads:
  batch:
    scoring_strategy: cost
  embedding:
    scoring_strategy: cost
    required_capabilities: [embeddings.text]
```

## Shipped examples

The two workloads below are validated by the runtime test suite
(`role-model-router/apps/runtime-host-bridge/test/agent-strategy-workload-examples.test.ts`) and are
offered as one-click templates on the Workloads page:

| Name | Posture | Binding |
| --- | --- | --- |
| `batch` | `cost` | none (posture only) |
| `embedding` | `cost` | requires `embeddings.text` |

## Rules the runtime enforces

| Rule | Behaviour |
| --- | --- |
| Entry names | `^[a-z0-9][a-z0-9-]*$`, never `default`, `baseline`, `controller`, `difficulty`, `hybrid` |
| Name reuse | A duplicate or a name used by both an agent strategy and a workload is a config write error |
| Alias namespace | A posture alias that would shadow an existing routing alias is a config write error |
| `role_id` | Must exist in the runtime role policy; an unknown role is a config write error |
| `required_capabilities` | An unknown capability is a warning, because capability taxonomies extend |
| Request intent | A role the request itself declares wins over the alias preset; the decision records both |
| Empty scope | Reported as `ALIAS_POOL_EMPTY`; the pool is never widened |

## Reading a decision

Every decision records the posture binding it used (`aliasPostureBinding`): the alias, the declared
and preset role, which of the two supplied the role, the capabilities that were added, and the
scoring strategy the alias carried. The routing posture page shows the resolved posture, and the
Agent strategy and Workloads pages list each entry with its per-scope aliases, candidate counts and
current winner.
