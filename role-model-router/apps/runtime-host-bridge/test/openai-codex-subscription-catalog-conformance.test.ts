import path from "node:path";

import { readNormalizedCatalogFile } from "@role-model-router/catalog";
import { describe, expect, test } from "vitest";

import {
  OPENAI_CODEX_SUBSCRIPTION_MODEL_EXCLUSIONS,
  OPENAI_CODEX_SUBSCRIPTION_MODEL_IDS,
} from "../src/index.js";

/**
 * Keeping the Codex subscription surface in step with the catalog, in both directions.
 *
 * The runtime declares what it offers in `OPENAI_CODEX_SUBSCRIPTION_MODEL_MATRIX`, while the catalog
 * declares what exists. Nothing connected the two, so `feat(catalog): add the new OpenAI models and
 * bill context tiers` (#286) added six OpenAI rows to the catalog - `gpt-6-astra`, `gpt-6-luna`,
 * `gpt-6-sol`, `gpt-6.1-sol` and the daybreak pair - and no runtime offered any of them: the models
 * were priced, described and context-tiered while the matrix stayed at twelve. The gap was invisible
 * because a matrix entry the catalog does not carry is dropped without a word
 * (`codexSubscriptionRecords`: `if (!source) return []`), and a catalog row the matrix does not
 * carry is simply never read.
 *
 * These tests make both directions fail loudly, so a catalog refresh that adds a subscription-eligible
 * OpenAI model cannot land without someone deciding whether it is offered - and a matrix entry with no
 * catalog row cannot silently leave the surface.
 */

const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..", "..");
const catalogPath = path.join(
  repoRoot,
  "role-model-router",
  "packages",
  "catalog",
  "data",
  "normalized-catalog.json",
);

/**
 * The floor the surface itself documents: `assertOpenAICodexSubscriptionModelIds` refuses anything
 * outside the subscription matrix with "Codex Subscription only supports OpenAI GPT-5.3+ model ids for
 * this runtime", and the matrix has carried exactly the 5.3+ rows since the GPT-5 line began. The
 * floor is a statement about the catalog, which is why it lives here rather than in the runtime.
 */
const SUBSCRIPTION_VERSION_FLOOR = { major: 5, minor: 3 } as const;

/** `gpt-5.6-sol` -> `{ major: 5, minor: 6 }`; a row that is not a versioned gpt id is not eligible. */
function parseGptVersion(modelName: string): { major: number; minor: number } | null {
  const match = /^gpt-(\d+)(?:\.(\d+))?/.exec(modelName);
  if (!match) return null;
  return { major: Number(match[1]), minor: match[2] === undefined ? 0 : Number(match[2]) };
}

function meetsSubscriptionFloor(modelName: string): boolean {
  const version = parseGptVersion(modelName);
  if (!version) return false;
  if (version.major !== SUBSCRIPTION_VERSION_FLOOR.major) {
    return version.major > SUBSCRIPTION_VERSION_FLOOR.major;
  }
  return version.minor >= SUBSCRIPTION_VERSION_FLOOR.minor;
}

const modelName = (modelId: string): string => modelId.slice(modelId.lastIndexOf("/") + 1);

const readOpenAIModelNames = async (): Promise<readonly string[]> => {
  const catalog = await readNormalizedCatalogFile(catalogPath);
  return [
    ...new Set(
      catalog.models
        .filter((model) => model.providerId === "openai")
        .map((model) => modelName(String(model.modelId))),
    ),
  ].sort();
};

describe("Codex Subscription surface conforms to the OpenAI catalog", () => {
  test("every offered model is a row the catalog carries", async () => {
    const catalogNames = new Set(await readOpenAIModelNames());
    const missing = OPENAI_CODEX_SUBSCRIPTION_MODEL_IDS.filter(
      (modelId) => !catalogNames.has(modelName(modelId)),
    );
    expect(
      missing,
      `these matrix entries have no openai/* catalog row, so codexSubscriptionRecords drops them and the runtime offers nothing: ${missing.join(", ")}`,
    ).toEqual([]);
  });

  test("every subscription-eligible catalog row is offered or explicitly excluded", async () => {
    const catalogNames = await readOpenAIModelNames();
    const offered = new Set(OPENAI_CODEX_SUBSCRIPTION_MODEL_IDS.map(modelName));
    const excluded = new Set(Object.keys(OPENAI_CODEX_SUBSCRIPTION_MODEL_EXCLUSIONS));
    const undecided = catalogNames.filter(
      (name) => meetsSubscriptionFloor(name) && !offered.has(name) && !excluded.has(name),
    );
    expect(
      undecided,
      `the catalog carries these OpenAI rows at or above GPT-5.${SUBSCRIPTION_VERSION_FLOOR.minor} that this surface neither offers nor excludes - add them to OPENAI_CODEX_SUBSCRIPTION_MODEL_MATRIX or record why not in OPENAI_CODEX_SUBSCRIPTION_MODEL_EXCLUSIONS: ${undecided.join(", ")}`,
    ).toEqual([]);
  });

  test("no exclusion is stale and every exclusion carries a reason", async () => {
    const catalogNames = new Set(await readOpenAIModelNames());
    const offered = new Set(OPENAI_CODEX_SUBSCRIPTION_MODEL_IDS.map(modelName));
    for (const [name, reason] of Object.entries(OPENAI_CODEX_SUBSCRIPTION_MODEL_EXCLUSIONS)) {
      // An exclusion for a row the catalog no longer carries, or one that has since been offered,
      // is a decision that no longer describes anything.
      expect(
        catalogNames.has(name),
        `${name} is excluded but the catalog no longer carries it`,
      ).toBe(true);
      expect(offered.has(name), `${name} is both offered and excluded`).toBe(false);
      expect(reason.trim().length).toBeGreaterThan(0);
    }
  });

  test("the exclusions are exactly the rows this surface decided against", async () => {
    const catalogNames = await readOpenAIModelNames();
    const offered = new Set(OPENAI_CODEX_SUBSCRIPTION_MODEL_IDS.map(modelName));
    const eligible = catalogNames.filter((name) => meetsSubscriptionFloor(name));
    const declined = eligible.filter((name) => !offered.has(name));
    // Pins the current decision set, so dropping an exclusion is a deliberate edit rather than a
    // silent widening of what the subscription surface offers.
    //
    // Only `gpt-5.6` is here: the daybreak rows are not versioned `gpt-<major>.<minor>` ids, so the
    // floor rule never considers them at all. They are still declared in the exclusion table - that is
    // where the operator's "these are provider ids for Sol and Cyber, not models" decision lives, and
    // it survives any future loosening of the version rule - but they are not what the floor rule
    // declines.
    expect(declined).toEqual(["gpt-5.6"]);
  });

  test("the daybreak provider ids stay out of the surface", async () => {
    const catalogNames = new Set(await readOpenAIModelNames());
    for (const alias of ["gpt-daybreak-blue-latest", "gpt-daybreak-red-latest"]) {
      expect(catalogNames.has(alias), `${alias} is no longer a catalog row`).toBe(true);
      expect(
        OPENAI_CODEX_SUBSCRIPTION_MODEL_IDS.includes(`chatgpt/${alias}` as never),
        `${alias} is a provider id for GPT-5.6 Sol / GPT-5.6 Cyber, not a model to offer`,
      ).toBe(false);
      expect(OPENAI_CODEX_SUBSCRIPTION_MODEL_EXCLUSIONS).toHaveProperty(alias);
    }
  });
});
