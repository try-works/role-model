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

The router interprets roles as executable policy, not just labels. A role definition must be rich
enough to answer:

- which task types the role may serve,
- which capabilities are mandatory, preferred, or forbidden,
- whether tools are disabled, limited, or allowed,
- which routing-policy fields should be overridden for requests using that role.

Runtime attachment happens through `RoleBinding`. A binding ties one role to one endpoint and carries
`effective_capabilities` plus `effective_task_types` after local policy or operator restrictions are
applied. Binding status is part of the routing contract:

- `active`: the binding may be considered during routing,
- `inactive`: the binding is known but excluded from routing,
- `disabled`: the binding is explicitly blocked and must surface a distinct exclusion reason.
