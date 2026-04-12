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
