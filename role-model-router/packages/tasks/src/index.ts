import { canonicalTaxonomy } from "@role-model-router/core";

export const defaultTasks = canonicalTaxonomy.tasks.map((task) => task.id) as readonly string[];
