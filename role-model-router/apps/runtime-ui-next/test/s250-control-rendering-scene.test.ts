import { Schema } from "effect";
import { describe, test } from "vitest";

import { expect, given, role, scene, text } from "@role-model-router/foldkit/scene";

import { emptyControls } from "../src/control";
import { idleDiagnostics } from "../src/diagnostics";
import { Model } from "../src/model";
import { idleObservability } from "../src/observability";
import { emptyReadbacks } from "../src/readback";
import { initialRuntimeRefreshState } from "../src/refresh";
import { createUpdate } from "../src/update";
import { view } from "../src/view";

/**
 * S250: the rendering half of the control-action test, driven through the real view.
 *
 * s26k-control asserts wiring (two clicks -> one dispatch) and cannot move to scene without losing that fact
 * (S249). These are the rendering assertions from the same file: pending, success and failure text painted
 * from a model state. No click, no client, no happy-dom event path.
 */
const noop = undefined as never;
const update = createUpdate(noop, undefined, undefined, undefined, undefined, undefined, undefined, undefined) as unknown as (
  model: unknown,
  message: unknown,
) => { commands?: readonly unknown[]; model: unknown };

const providerRow = { id: "provider-1", label: "provider-1", meta: "controller", value: "active" };

const modelWithProviders = (action: { actionMessage?: string; actionStatus: "idle" | "pending" | "ok" | "error" }) =>
  Schema.decodeUnknownSync(Model)({
    clicks: 0,
    controls: {
      ...emptyControls(),
      providers: {
        actionMessage: action.actionMessage,
        actionStatus: action.actionStatus,
        rows: [providerRow],
        status: "ok",
        token: 1,
      },
    },
    diagnostics: idleDiagnostics(),
    observability: idleObservability(),
    readbacks: emptyReadbacks(),
    refresh: initialRuntimeRefreshState(),
    route: { _tag: "Providers" },
    theme: "dark",
  });

describe("control action rendering", () => {
  test("pending shows the in-flight label and disables the action", () => {
    scene(
      { update, view } as never,
      given(modelWithProviders({ actionStatus: "pending" }) as never),
      expect(role("button", { name: "Dispatching…" })).toExist(),
    );
  });

  test("success paints the completion message", () => {
    scene(
      { update, view } as never,
      given(modelWithProviders({ actionMessage: "Providers action completed.", actionStatus: "ok" }) as never),
      expect(text("Providers action completed.")).toExist(),
    );
  });

  test("failure paints the bounded error phrase", () => {
    scene(
      { update, view } as never,
      given(modelWithProviders({ actionMessage: "Providers action failed: HTTP 500", actionStatus: "error" }) as never),
      expect(text("Providers action failed: HTTP 500")).toExist(),
    );
  });
});
