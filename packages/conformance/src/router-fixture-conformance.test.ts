import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import { routeRequest } from "@role-model-router/core";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const fixtureDir = path.join(repoRoot, "protocol", "fixtures", "router-golden", "cases");
const requiredCaseFiles = [
  "capability-missing.json",
  "modality-unsupported.json",
  "insufficient-context.json",
  "tools-unsupported.json",
  "privacy-remote-deny.json",
  "quality-strategy-measured-vs-declared.json",
  "endpoint-id-tie-break.json",
  "preferred-capability-selection.json",
  "fallback-chain-ordering.json",
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
  test("validates golden routing cases from fixture inputs", async () => {
    const fileNames = (await readdir(fixtureDir)).filter((fileName) => fileName.endsWith(".json"));
    expect(fileNames.length).toBeGreaterThan(0);
    expect(fileNames).toEqual(expect.arrayContaining([...requiredCaseFiles]));

    for (const fileName of fileNames) {
      const fixturePath = path.join(fixtureDir, fileName);
      const fixture = JSON.parse(await readFile(fixturePath, "utf8")) as RouterFixtureCase;
      const result = routeRequest(fixture.input);

      expect(result.chosen_endpoint_id, fixture.name).toBe(fixture.expected.chosen_endpoint_id);
      expect(result.fallback_endpoint_ids, fixture.name).toEqual(
        fixture.expected.fallback_endpoint_ids,
      );
      expect(result.selection_reasons, fixture.name).toEqual(
        expect.arrayContaining([...fixture.expected.selection_reasons]),
      );

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
