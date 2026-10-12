import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaDir = path.resolve(__dirname, "..", "..", "..", "protocol", "schemas");

interface RouterDecisionSchema {
  properties: {
    effort_source: {
      enum: string[];
    };
  };
}

describe("run 106 M-5: router-decision effort_source backward compatibility", () => {
  test("keeps legacy client/variant/variant_coerced readable alongside canonical values", async () => {
    const schema = JSON.parse(
      await readFile(path.join(schemaDir, "router-decision.schema.json"), "utf8"),
    ) as RouterDecisionSchema;
    const values = schema.properties.effort_source.enum;
    expect(values).toEqual(
      expect.arrayContaining(["named", "disabled", "provider_default", "none"]),
    );
    expect(values).toEqual(expect.arrayContaining(["client", "variant", "variant_coerced"]));
  });
});
