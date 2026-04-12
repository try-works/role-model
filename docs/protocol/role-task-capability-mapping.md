# Role, Task, and Capability Mapping

The mapping rules are:

1. roles constrain which task families are allowed,
2. tasks declare the capabilities and modalities needed for execution,
3. endpoint profiles determine whether an endpoint is eligible for that task,
4. the router chooses among eligible endpoints using policy plus measured and declared evidence.

This keeps prompt personas, endpoint metadata, and routing decisions aligned instead of loosely inferred.

Concrete baseline examples:

- `general.chat` -> `text.chat` -> text-generation plus instruction-following capabilities -> suitable for general conversational replies.
- `coder.patch` -> `code.edit` -> code-editing, multi-step reasoning, and optional tool-calling capabilities -> suitable for patch production in a repo workflow.
- `coder.review` -> `json.schema_adherence` -> critique plus structured-output capabilities -> suitable for review verdicts that must match a required JSON contract.
- `tool.agent` -> `tools.function_calling` -> function-calling capability -> suitable for orchestrating CLI, MCP, or other external tool invocations.
- `embedder` -> `embeddings.text` -> embedding-generation capability -> suitable for retrieval pipelines and vector-store ingestion.
- `classifier` -> `text.classification` -> label selection and deterministic output behavior -> suitable for policy or intent tagging.
- `language.detector` -> `text.language_detection` -> lightweight text-analysis capability -> suitable for locale or routing prechecks.
