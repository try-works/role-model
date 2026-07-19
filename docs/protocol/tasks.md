# Tasks

`TaskDefinition` models the unit of work that routing is trying to satisfy.

Taxonomy V1 example task types include:

- `coder.edit`: a repository-scoped change request that expects an implementation patch.
- `coder.review`: review-focused code analysis; commonly compatible with `security` and `architect`.
- `security.audit`: security-oriented audit work over code, configuration, prompts, or policies.
- `researcher.web_research.current`: current public-source research with citations.
- `product.requirements`: product requirement and acceptance-criteria drafting.
- `support.ticket.reply`: user-facing support response drafting.
- `architect.migration.strategy`: migration planning across systems, schemas, or APIs.

Tasks define required inputs, required/preferred capabilities, quality metrics, allowed roles, and
default benchmark suites.

The router uses task definitions as hard contract inputs, not just catalog metadata. In the current
baseline, a task definition must tell the router:

- the `task_type` and human-readable purpose,
- which inputs are required to execute the task safely,
- which capabilities are required versus merely preferred,
- which role IDs are allowed to serve the task,
- which `quality_metrics` matter for scoring and benchmark interpretation.

This keeps task eligibility deterministic. A role can support a task only if the task allows that role,
the role advertises the task in `task_types_supported`, and any effective binding restrictions still
permit the task and its required capabilities.
