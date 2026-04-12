import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { generateProtocolTypes } from "../src/validate-schemas.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const generatedTypesPath = path.resolve(__dirname, "..", "..", "protocol-types", "src", "generated.ts");

describe("generateProtocolTypes", () => {
  it("does not emit duplicate exported interfaces for externally referenced schemas", async () => {
    await generateProtocolTypes();

    const generatedTypes = await readFile(generatedTypesPath, "utf8");
    const exportMatches = Array.from(generatedTypes.matchAll(/^export interface (\w+)/gm), (match) => match[1]);
    const duplicates = exportMatches.filter((name, index) => exportMatches.indexOf(name) !== index);

    expect(duplicates).toEqual([]);
  });
});
