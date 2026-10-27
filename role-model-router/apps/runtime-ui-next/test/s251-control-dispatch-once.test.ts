import assert from "node:assert/strict";
import { Schema } from "effect";
import { describe, it } from "vitest";

import { emptyControls } from "../src/control";
import { idleDiagnostics } from "../src/diagnostics";
import { Model } from "../src/model";
import { Message } from "../src/message";
import { idleObservability } from "../src/observability";
import { emptyReadbacks } from "../src/readback";
import { initialRuntimeRefreshState } from "../src/refresh";
import { createUpdate } from "../src/update";

/**
 * S251: "two requests while one is pending dispatch once" without a DOM click.
 *
 * The s26k version drives this with element.click() twice and counts client calls. That is a wiring test, so
 * it cannot move to scene (S249) - but the fact it protects (one command per pending action) lives in the
 * update, and can be asserted there directly. This replaces the click mechanism without weakening the rule.
 */
const dispatched: unknown[] = [];
const fakeCommand = (args: unknown) => {
  dispatched.push(args);
  return { _tag: "DispatchControl", args };
};
const update = createUpdate(
  undefined as never,
  undefined,
  undefined,
  undefined,
  undefined,
  fakeCommand as never,
  undefined,
  undefined,
) as unknown as (model: unknown, message: unknown) => { commands?: readonly unknown[]; model: Record<string, unknown> };

const model = () =>
  Schema.decodeUnknownSync(Model)({
    clicks: 0,
    controls: {
      ...emptyControls(),
      providers: {
        actionStatus: "idle",
        rows: [{ id: "provider-1", label: "provider-1", meta: "controller", value: "active" }],
        status: "ok",
        token: 0,
      },
    },
    diagnostics: idleDiagnostics(),
    observability: idleObservability(),
    readbacks: emptyReadbacks(),
    refresh: initialRuntimeRefreshState(),
    route: { _tag: "Providers" },
    theme: "dark",
  }) as unknown as Record<string, unknown>;

const controlState = (m: Record<string, unknown>) =>
  (m.controls as Record<string, { actionStatus?: string; token?: number }>).providers;

describe("S251 control action dispatch", () => {
  it("the first request dispatches one command and marks the action pending", () => {
    dispatched.length = 0;
    const next = update(model(), Message.ControlActionRequested({ key: "providers", token: 0 }));
    assert.equal(dispatched.length, 1, "one command per request");
    assert.equal(controlState(next.model)?.actionStatus, "pending");
    assert.equal(controlState(next.model)?.token, 1, "the token advances so a stale result cannot apply");
  });

  it("a second request while pending dispatches nothing", () => {
    dispatched.length = 0;
    const first = update(model(), Message.ControlActionRequested({ key: "providers", token: 0 }));
    const second = update(first.model, Message.ControlActionRequested({ key: "providers", token: 0 }));
    assert.equal(dispatched.length, 1, "two requests must not dispatch twice");
    assert.equal(controlState(second.model)?.token, 1, "the pending token is unchanged");
  });
});
