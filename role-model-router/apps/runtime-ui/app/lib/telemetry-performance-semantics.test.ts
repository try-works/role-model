import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));

async function source(relativePath: string): Promise<string> {
  return readFile(path.resolve(here, relativePath), "utf8");
}

describe("source-separated performance evidence UI", () => {
  test("Router Candidates labels operational metrics and sample evidence", async () => {
    const route = await source("../routes/router-candidates.tsx");

    expect(route).toContain('label: "Live p50"');
    expect(route).toContain('label: "Live fail"');
    expect(route).toContain('label: "Live samples"');
    expect(route).toContain("live-request-operational");
  });

  test("Models and Dashboard distinguish benchmark capability from live telemetry", async () => {
    const [models, modelView, candidateSpace] = await Promise.all([
      source("../routes/control-models.tsx"),
      source("./view-models.ts"),
      source("./candidate-space.ts"),
    ]);

    expect(models).toContain("operationalProfile");
    expect(modelView).toContain("Live latency p50");
    expect(modelView).toContain("Live failure rate");
    expect(candidateSpace).toContain('tags.push("Live telemetry")');
    expect(candidateSpace).not.toContain('return candidate.sourceType === "local" ? 0.78 : 0.55');
  });

  test("Router decision detail promotes immutable live telemetry evidence", async () => {
    const route = await source("../routes/router-decision-detail.tsx");

    expect(route).toContain("Live telemetry evidence at decision");
    expect(route).toContain("detail.telemetryEvidence");
    expect(route).toContain("Current operational profile");
    expect(route).not.toContain('title="Endpoint profile"');
  });
});
