import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { generateProtocolTypes } from "../src/validate-schemas.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map(async (tempRoot) => {
      await rm(tempRoot, { recursive: true, force: true });
    }),
  );
});

async function createGeneratedTypesPath(): Promise<string> {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-generated-types-"));
  tempRoots.push(tempRoot);
  return path.join(tempRoot, "generated.ts");
}

describe("generateProtocolTypes", () => {
  it("does not emit duplicate exported interfaces for externally referenced schemas", async () => {
    const generatedTypesPath = await createGeneratedTypesPath();
    await generateProtocolTypes(generatedTypesPath);

    const generatedTypes = await readFile(generatedTypesPath, "utf8");
    const exportMatches = Array.from(
      generatedTypes.matchAll(/^export interface (\w+)/gm),
      (match) => match[1],
    );
    const duplicates = exportMatches.filter((name, index) => exportMatches.indexOf(name) !== index);

    expect(duplicates).toEqual([]);
  });

  it("emits the router metricEntry helper instead of referencing an undefined MetricEntry symbol", async () => {
    const generatedTypesPath = await createGeneratedTypesPath();
    await generateProtocolTypes(generatedTypesPath);

    const generatedTypes = await readFile(generatedTypesPath, "utf8");

    expect(generatedTypes).toContain("interface MetricEntry");
  });
});
