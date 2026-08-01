import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const workflow = readFileSync(path.join(root, ".github/workflows/ci.yml"), "utf8");
const browserSpec = readFileSync(
  path.join(
    root,
    "role-model-router/apps/runtime-ui/e2e/recursive-87-direct-track-b-semantic-completion.sp5.retention.spec.ts",
  ),
  "utf8",
);

test("SP6 public CI binds host integration to the same tagged live browser gate", () => {
  expect(workflow).toContain("recursive-87-ci-contract.test.ts");
  expect(workflow).toContain("@recursive:87-direct-track-b-semantic-completion");
  expect(workflow).toContain("RUNTIME_LIVE_BASE_URL");
  expect(browserSpec).toContain("@sp5");
  expect(browserSpec).toContain("Physical storage inventory");
});
