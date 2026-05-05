# Tasks

`TaskDefinition` models the unit of work that routing is trying to satisfy.

Baseline example task types include:

- `text.chat`: a user asks a general question and expects a prose answer; commonly paired with `general.chat`.
- `code.edit`: a repository-scoped change request that expects a patch or diff; commonly paired with `coder.patch` or `coder.review`.
- `tools.function_calling`: the task requires calling one or more tools with structured arguments; commonly paired with `tool.agent`.
- `embeddings.text`: the input must be converted into vectors for retrieval or similarity search; commonly paired with `embedder`.
- `text.classification`: the input must be labeled against a known taxonomy; commonly paired with `classifier`.
- `text.language_detection`: the input must be assigned a language code; commonly paired with `language.detector`.
- `json.schema_adherence`: the output must conform to a required JSON shape or policy contract; commonly paired with `coder.review` or another structured-output-capable role.

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
