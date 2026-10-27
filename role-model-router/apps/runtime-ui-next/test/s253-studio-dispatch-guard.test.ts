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
import { studioIdle } from "../src/studio";
import { createUpdate } from "../src/update";

/**
 * S253: the Studio double-dispatch guard, asserted where it lives.
 *
 * s46a drove this with two element.click() calls and counted client calls. The rule is an update rule: while
 * a request is loading, a second StudioRunRequested must not emit a second command. This replaces the click
 * mechanism (S249: wiring tests do not move to scene, but they can move to the update).
 */
const dispatched: unknown[] = [];
const fakeStudioCommand = (args: unknown) => {
  dispatched.push(args);
  return { _tag: "DispatchStudio", args };
};
const update = createUpdate(
  undefined as never,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  fakeStudioCommand as never,
  undefined,
) as unknown as (model: unknown, message: unknown) => { commands?: readonly unknown[]; model: Record<string, unknown> };

const model = () =>
  Schema.decodeUnknownSync(Model)({
    clicks: 0,
    controls: emptyControls(),
    diagnostics: idleDiagnostics(),
    observability: idleObservability(),
    readbacks: emptyReadbacks(),
    refresh: initialRuntimeRefreshState(),
    route: { _tag: "Studio" },
    studio: studioIdle("chat"),
    theme: "dark",
  }) as unknown as Record<string, unknown>;

const studio = (m: Record<string, unknown>) => m.studio as { status?: string; token?: number };

describe("S253 studio dispatch guard", () => {
  it("the first run dispatches once and enters loading", () => {
    dispatched.length = 0;
    const next = update(model(), Message.StudioRunRequested({ token: 0 }));
    assert.equal(dispatched.length, 1, "one command per run request");
    assert.equal(studio(next.model)?.status, "loading");
  });

  it("a second run while loading dispatches nothing", () => {
    dispatched.length = 0;
    const first = update(model(), Message.StudioRunRequested({ token: 0 }));
    const second = update(first.model, Message.StudioRunRequested({ token: 0 }));
    assert.equal(dispatched.length, 1, "two clicks while loading must not dispatch twice");
    assert.equal(studio(second.model)?.token, studio(first.model)?.token, "the loading token is unchanged");
  });
});
