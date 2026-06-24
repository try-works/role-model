import { canonicalTaxonomy } from "@role-model-router/core";

export const defaultRoles = canonicalTaxonomy.roles.map((role) => ({
  role_id: role.id,
  task_types_supported: [...role.taskIds],
})) as readonly {
  readonly role_id: string;
  readonly task_types_supported: readonly string[];
}[];
