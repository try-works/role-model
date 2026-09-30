/**
 * Live contract check for the discovery mapper.
 *
 * Fetches the real runtime's rich discovery payload and asserts the mapping DSH
 * will consume: every entry names the provider exactly, ids are unique, aliases
 * are selectable, effort sets are declared, and the placeholder token is used as
 * the bearer credential.
 *
 * Run:  node --import tsx scripts/check-live-discovery.mts [endpoint]
 */

import {
  createRoleModelCatalog,
  validateDownstreamOpenAIDiscovery,
} from "../src/downstream-openai.js";

const endpoint = (process.argv[2] ?? process.env.ROLE_MODEL_ENDPOINT ?? "http://127.0.0.1:3457")
  .trim()
  .replace(/\/+$/u, "");
const providerRoute = "role-model";

let failures = 0;

function check(label: string, condition: boolean, detail = ""): void {
  if (!condition) failures += 1;
  console.log(`${condition ? "PASS" : "FAIL"}  ${label}${detail.length > 0 ? ` — ${detail}` : ""}`);
}

console.log(`fetching ${endpoint}/api/role-model/downstream/openai ...`);
const response = await fetch(`${endpoint}/api/role-model/downstream/openai`, {
  headers: { connection: "close" },
});
check("discovery responds 200", response.ok, `status ${response.status}`);
if (!response.ok) process.exit(1);

const discovery = validateDownstreamOpenAIDiscovery(await response.json());
const catalog = createRoleModelCatalog(discovery, providerRoute);

check("contract validated", true, `contractVersion=${discovery.contractVersion}`);
check(
  "runtime reports the exact lower-case name",
  discovery.displayName === "role-model",
  `displayName=${JSON.stringify(discovery.displayName)}`,
);
check("provider route is role-model", catalog.providerRoute === "role-model");
check(
  "baseUrl carries /v1 exactly once",
  catalog.baseUrl.endsWith("/v1") && !catalog.baseUrl.endsWith("/v1/v1"),
  catalog.baseUrl,
);
check(
  "bearer credential is the placeholder, not a real secret",
  catalog.apiKey === discovery.authentication.placeholderToken,
);
check("catalog is non-empty", catalog.entries.length > 0, `${catalog.entries.length} entries`);

const everyEntryNamesProvider = catalog.entries.every((entry) => entry.provider === providerRoute);
check("every entry names the owning provider (DSH requires this)", everyEntryNamesProvider);

const ids = catalog.entries.map((entry) => entry.id);
check("model ids are unique", new Set(ids).size === ids.length);
check(
  "no blank id or name",
  catalog.entries.every((entry) => entry.id.length > 0 && entry.name.length > 0),
);

const aliases = discovery.models.filter((model) => model.type === "alias").map((model) => model.id);
const endpoints = discovery.models
  .filter((model) => model.type === "endpoint")
  .map((model) => model.id);
const models = discovery.models.filter((model) => model.type === "model").map((model) => model.id);
check(
  "aliases are selectable",
  aliases.every((id) => ids.includes(id)),
  `${aliases.length} aliases`,
);
check(
  "endpoints are selectable",
  endpoints.every((id) => ids.includes(id)),
  `${endpoints.length} endpoints`,
);
check(
  "models are selectable",
  models.every((id) => ids.includes(id)),
  `${models.length} models`,
);

const orderedAliasesFirst = (() => {
  const firstNonAlias = catalog.entries.findIndex((entry) => !aliases.includes(entry.id));
  if (firstNonAlias === -1) return true;
  return catalog.entries.slice(firstNonAlias).every((entry) => !aliases.includes(entry.id));
})();
check("aliases are ordered before the rest", orderedAliasesFirst);

check(
  "the recommended alias is first",
  catalog.entries[0]?.id === catalog.recommendedModel,
  `first=${catalog.entries[0]?.id} recommended=${catalog.recommendedModel}`,
);

const withReasoning = catalog.entries.filter((entry) => entry.reasoning !== undefined);
check(
  "declared effort sets only contain expressible efforts",
  withReasoning.every(
    (entry) =>
      (entry.reasoning?.efforts.length ?? 0) > 0 &&
      entry.reasoning?.efforts.every((effort) =>
        ["off", "minimal", "low", "medium", "high", "xhigh", "max"].includes(effort.id),
      ),
  ),
  `${withReasoning.length} entries declare reasoning`,
);
check(
  "a default effort is always one of the offered efforts",
  withReasoning.every(
    (entry) =>
      entry.reasoning?.defaultEffort === undefined ||
      entry.reasoning.efforts.some((effort) => effort.id === entry.reasoning?.defaultEffort),
  ),
);
check(
  "every entry is sized",
  catalog.entries.every((entry) => entry.contextWindow > 0 && entry.maxTokens > 0),
);

console.log("\n--- catalog summary ---");
for (const entry of catalog.entries) {
  const efforts =
    entry.reasoning === undefined
      ? "none"
      : `${entry.reasoning.efforts.map((effort) => effort.id).join("/")}${entry.reasoning.defaultEffort === undefined ? "" : ` default=${entry.reasoning.defaultEffort}`}`;
  console.log(
    `  ${entry.id.padEnd(34)} ctx=${String(entry.contextWindow).padStart(9)} max=${String(entry.maxTokens).padStart(7)} in=${entry.inputModalities.join("+")} efforts=${efforts}`,
  );
}
console.log(`\ndiagnostics (degraded mappings): ${catalog.diagnostics.length}`);
for (const diagnostic of catalog.diagnostics.slice(0, 5)) {
  console.log(`  ${diagnostic.id}: ${diagnostic.reasons.join("; ")}`);
}

console.log(`\n${failures === 0 ? "ALL LIVE CHECKS PASSED" : `${failures} LIVE CHECK(S) FAILED`}`);
process.exitCode = failures === 0 ? 0 : 1;
