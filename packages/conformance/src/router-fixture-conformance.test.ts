import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import { routeRequest } from "@role-model-router/core";
import { assertValid, createAjv } from "./schema-test-helpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const schemaDir = path.join(repoRoot, "protocol", "schemas");
const fixtureDir = path.join(repoRoot, "protocol", "fixtures", "router-golden", "cases");
const requiredCaseFiles = [
  "capability-missing.json",
  "insufficient-context.json",
  "tools-unsupported.json",
  "local-preference.json",
  "remote-preference.json",
  "measured-profile-prefers-observed.json",
  "cost-strategy-prefers-cheaper.json",
  "latency-strategy-prefers-faster.json",
  "quality-strategy-prefers-better-judged.json",
  "endpoint-id-tie-break.json",
  "role-forbids-capability.json",
  "task-not-allowed-for-role.json",
  "inactive-role-binding.json",
  "binding-capability-restriction.json",
  "binding-task-restriction.json",
  "advisory-vs-hard-budget.json",
  "measured-profile-partial-coverage.json",
  "unknown-metric-redistribution.json",
] as const;

type RouterFixtureCase = {
  name: string;
  input: Parameters<typeof routeRequest>[0];
  expected: {
    chosen_endpoint_id: string;
    fallback_endpoint_ids: readonly string[];
    selection_reasons: readonly string[];
    eligibility: ReadonlyArray<{
      endpoint_id: string;
      eligible: boolean;
      exclusions: ReadonlyArray<{
        code: string;
        detail: string;
      }>;
    }>;
  };
};

describe("router fixture conformance", () => {
  test("validates golden routing cases from fixture inputs against the hardened router decision contract", async () => {
    const fileNames = (await readdir(fixtureDir)).filter((fileName) => fileName.endsWith(".json"));
    expect(fileNames.length).toBeGreaterThan(0);
    expect(fileNames).toEqual(expect.arrayContaining([...requiredCaseFiles]));

    const ajv = await createAjv(schemaDir);
    const validateRouterDecision = ajv.getSchema("router-decision.schema.json");
    if (!validateRouterDecision) {
      throw new Error("router-decision.schema.json did not compile");
    }

    for (const fileName of fileNames) {
      const fixturePath = path.join(fixtureDir, fileName);
      const fixture = JSON.parse(await readFile(fixturePath, "utf8")) as RouterFixtureCase;
      const result = routeRequest(fixture.input) as ReturnType<typeof routeRequest> & {
        app_id?: string;
        org_id?: string | null;
        scored_candidates: Array<Record<string, unknown>>;
      };

      assertValid(validateRouterDecision, result, fileName);
      expect(result.app_id, fixture.name).toEqual(expect.any(String));
      expect(result.org_id, fixture.name).toSatisfy(
        (value: unknown) => value === null || typeof value === "string",
      );

      expect(result.chosen_endpoint_id, fixture.name).toBe(fixture.expected.chosen_endpoint_id);
      expect(result.fallback_endpoint_ids, fixture.name).toEqual(
        fixture.expected.fallback_endpoint_ids,
      );
      expect(result.selection_reasons, fixture.name).toEqual(
        expect.arrayContaining([...fixture.expected.selection_reasons]),
      );

      for (const scoredCandidate of result.scored_candidates) {
        expect(scoredCandidate, fixture.name).toEqual(
          expect.objectContaining({
            endpoint_id: expect.any(String),
            total_score: expect.any(Number),
            metric_breakdown: expect.objectContaining({
              quality: expect.objectContaining({
                value: expect.any(Number),
                source: expect.any(String),
              }),
              latency: expect.objectContaining({
                value: expect.any(Number),
                source: expect.any(String),
              }),
              throughput: expect.objectContaining({
                value: expect.any(Number),
                source: expect.any(String),
              }),
              cost: expect.objectContaining({
                value: expect.any(Number),
                source: expect.any(String),
              }),
              reliability: expect.objectContaining({
                value: expect.any(Number),
                source: expect.any(String),
              }),
              preference: expect.objectContaining({
                value: expect.any(Number),
                source: expect.any(String),
              }),
            }),
            tie_break: expect.objectContaining({
              quality: expect.any(Number),
              latency_ms: expect.any(Number),
              reliability: expect.any(Number),
              endpoint_id: expect.any(String),
            }),
          }),
        );
      }

      for (const expectedEligibility of fixture.expected.eligibility) {
        expect(result.eligibility, fixture.name).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              endpoint_id: expectedEligibility.endpoint_id,
              eligible: expectedEligibility.eligible,
              exclusions: expect.arrayContaining(
                expectedEligibility.exclusions.map((exclusion) =>
                  expect.objectContaining({
                    code: exclusion.code,
                    detail: exclusion.detail,
                  }),
                ),
              ),
            }),
          ]),
        );
      }
    }
  });
});
