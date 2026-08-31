import path from "node:path";
import { describe, expect, test } from "vitest";

import { taxonomyDataRootCandidates } from "./index.js";

describe("taxonomyDataRootCandidates", () => {
  test("R95 resolves the taxonomy staged next to a packaged executable", () => {
    const executablePath = path.join("D:", "release", "role-model-dev.exe");

    expect(taxonomyDataRootCandidates(executablePath)).toContain(
      path.join(
        "D:",
        "release",
        "role-model-router",
        "packages",
        "core",
        "data",
        "taxonomy",
      ),
    );
  });
});
