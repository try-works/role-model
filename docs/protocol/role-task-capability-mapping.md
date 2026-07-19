# Role, Task, and Capability Mapping

The mapping rules are:

1. roles constrain which task families are allowed,
2. tasks declare the capabilities and modalities needed for execution,
3. endpoint profiles determine whether an endpoint is eligible for that task,
4. the router chooses among eligible endpoints using policy plus measured and declared evidence.

This keeps prompt personas, endpoint metadata, and routing decisions aligned instead of loosely inferred.

Concrete taxonomy V1 examples:

- `coder` -> `coder.edit` -> `code.read`, `code.write`, and optional `tools.command_execution` -> suitable for patch production in a repo workflow.
- `coder` -> `coder.review` -> `code.read` and `json.schema_adherence` -> suitable for review verdicts that need structured output.
- `security` -> `security.audit` -> `security.analysis` and `code.read` -> suitable for security review and risk analysis.
- `researcher` -> `researcher.web_research.current` -> `web.search` and `citation.synthesis` -> suitable for current public-source lookup.
- `product` -> `product.requirements` -> `reasoning.multi_step` and `communication.user_facing` -> suitable for requirements and acceptance criteria.
- `support` -> `support.ticket.reply` -> `communication.user_facing` and `communication.follow_up` -> suitable for customer-facing support replies.

The current routing baseline evaluates these layers in order:

1. task rules define the role set and capability floor,
2. role rules add required/preferred/forbidden capability policy and tool policy,
3. role bindings narrow that role further through `status`, `effective_capabilities`, and `effective_task_types`,
4. endpoint profiles and live status decide whether the endpoint can satisfy the remaining contract,
5. policy and measured or declared evidence score only the endpoints that survived the earlier filters.

This is why the router now emits binding-aware exclusions such as:

- `TASK_NOT_SUPPORTED_BY_ROLE`
- `FORBIDDEN_CAPABILITY_PRESENT`
- `ROLE_BINDING_INACTIVE`
- `ROLE_BINDING_DISABLED`
- `ROLE_BINDING_TASK_NOT_ALLOWED`
- `ROLE_BINDING_CAPABILITY_MISSING`

Scored candidates only appear for eligible endpoints. Each scored candidate exposes `total_score`,
per-metric breakdowns, and a deterministic `tie_break` object so routing is explainable and fixture-testable.
