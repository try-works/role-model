import type { CompactTaxonomy } from "./compact-data.js";
import { createStagedCompactTaxonomyReader } from "./staged-compact-taxonomy.js";

export function loadCompactTaxonomy(): CompactTaxonomy {
  return createStagedCompactTaxonomyReader().loadFullTaxonomy();
}
