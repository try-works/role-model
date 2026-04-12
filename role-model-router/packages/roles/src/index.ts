export const defaultRoles = [
  { role_id: "general.chat", task_types_supported: ["text.chat"] },
  { role_id: "coder.patch", task_types_supported: ["code.edit"] },
  { role_id: "coder.review", task_types_supported: ["code.edit", "json.schema_adherence"] },
  { role_id: "tool.agent", task_types_supported: ["tools.function_calling"] },
  { role_id: "embedder", task_types_supported: ["embeddings.text"] },
  { role_id: "classifier", task_types_supported: ["text.classification"] },
  { role_id: "language.detector", task_types_supported: ["text.language_detection"] },
] as const;
