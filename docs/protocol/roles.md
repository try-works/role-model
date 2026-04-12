# Roles

`RoleDefinition` is a first-class protocol entity.

Baseline example roles include:

- `general.chat`: conversational assistant for `text.chat` tasks; prefers text-generation and instruction-following capabilities and returns user-facing prose.
- `coder.patch`: code-editing role for `code.edit`; prefers diff-safe editing, repository reasoning, and tool-use support for patch application workflows.
- `coder.review`: review-focused role for `code.edit` and `json.schema_adherence`; prefers critique, policy checking, and structured pass/fail output over free-form chat.
- `tool.agent`: orchestration role for `tools.function_calling`; requires tool-calling capability and emits tool plans plus invocation-ready arguments.
- `embedder`: retrieval/indexing role for `embeddings.text`; requires embedding generation and produces vectorizable text representations rather than natural-language answers.
- `classifier`: labeling role for `text.classification`; prefers deterministic, schema-friendly outputs such as category IDs and confidence-oriented reasoning notes.
- `language.detector`: detection role for `text.language_detection`; prefers lightweight text analysis and returns normalized language identifiers.

Each role defines supported task families, required/preferred/forbidden capabilities, tool policy,
routing overrides, and output contracts.
