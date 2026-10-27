import { Schema } from "effect";
import { describe, test } from "vitest";

import { expect, given, role, scene } from "@role-model-router/foldkit/scene";

import { emptyControls } from "../src/control";
import { idleDiagnostics } from "../src/diagnostics";
import { Model } from "../src/model";
import { idleObservability } from "../src/observability";
import { emptyReadbacks } from "../src/readback";
import { initialRuntimeRefreshState } from "../src/refresh";
import { createUpdate } from "../src/update";
import { view } from "../src/view";

/**
 * S245: first use of Foldkit's own scene DSL against this shell.
 *
 * The DSL already ships in the vendored 0.169.0 (`@role-model-router/foldkit/scene`), so this needs no
 * dependency change. It replaces hand-driven DOM clicks with declarative steps and command resolution.
 */
const noop = undefined as never;
const update = createUpdate(noop, undefined, undefined, undefined, undefined, undefined, undefined, undefined) as unknown as (
  model: unknown,
  message: unknown,
) => { commands?: readonly unknown[]; model: unknown };

const model = Schema.decodeUnknownSync(Model)({
  clicks: 0,
  controls: emptyControls(),
  diagnostics: idleDiagnostics(),
  observability: idleObservability(),
  readbacks: emptyReadbacks(),
  refresh: initialRuntimeRefreshState(),
  route: { _tag: "Index" },
  theme: "dark",
});

describe("shell scene", () => {
  test("renders the navigation links and the route section", () => {
    scene(
      { update, view } as never,
      given(model as never),
      expect(role("link", { name: "Studio" })).toExist(),
      expect(role("link", { name: "Overview" })).toExist(),
    );
  });
});
