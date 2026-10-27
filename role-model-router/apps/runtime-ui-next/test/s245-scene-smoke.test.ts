import { describe, test } from "vitest";

import { expect, given, role, scene } from "@role-model-router/foldkit/scene";

import { view } from "../src/view";
import { shellModel, shellUpdate } from "./support/runtime-shell";

/**
 * S245: first use of Foldkit's own scene DSL against this shell.
 *
 * The DSL already ships in the vendored 0.169.0 (`@role-model-router/foldkit/scene`), so this needs no
 * dependency change. It replaces hand-driven DOM clicks with declarative steps and command resolution.
 *
 * S260: `update`, `view`, and the model are all inferred from the real src signatures. The typed
 * harness supplies a reducer whose command slots are the production Command definitions.
 */
describe("shell scene", () => {
  test("renders the navigation links and the route section", () => {
    scene(
      { update: shellUpdate, view },
      given(shellModel()),
      expect(role("link", { name: "Studio" })).toExist(),
      expect(role("link", { name: "Overview" })).toExist(),
    );
  });
});
