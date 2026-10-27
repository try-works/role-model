import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { emptyControls } from "../src/control";
import { Message } from "../src/message";
import { shellModel, shellUpdate } from "./support/runtime-shell";

/**
 * S251: "two requests while one is pending dispatch once" without a DOM click.
 *
 * The s26k version drives this with element.click() twice and counts client calls. That is a wiring test, so
 * it cannot move to scene (S249) - but the fact it protects (one command per pending action) lives in the
 * update, and can be asserted there directly. This replaces the click mechanism without weakening the rule.
 *
 * S260: the assertions read the `DispatchControl` Command the reducer returned. The old counter recorded
 * that a factory was invoked; this records the production Command identity and the args it carries, so a
 * command-slot or token drift fails here.
 */
const model = () =>
  shellModel({
    controls: {
      ...emptyControls(),
      providers: {
        actionStatus: "idle",
        rows: [{ id: "provider-1", label: "provider-1", meta: "controller", value: "active" }],
        status: "ok",
        token: 0,
      },
    },
    route: { _tag: "Providers" },
  });

describe("S251 control action dispatch", () => {
  it("the first request returns one DispatchControl command and marks the action pending", () => {
    const next = shellUpdate(model(), Message.ControlActionRequested({ key: "providers", token: 0 }));
    const commands = next.commands ?? [];
    assert.equal(commands.length, 1, "one command per request");
    assert.equal(commands[0]?.name, "DispatchControl", "the reducer returned the production command");
    assert.equal(commands[0]?.args?.key, "providers", "the command addresses the requested control");
    assert.equal(commands[0]?.args?.token, 1, "the command carries the advanced token");
    assert.equal(next.model.controls.providers.actionStatus, "pending");
    assert.equal(next.model.controls.providers.token, 1, "the token advances so a stale result cannot apply");
  });

  it("a second request while pending returns no command", () => {
    const first = shellUpdate(model(), Message.ControlActionRequested({ key: "providers", token: 0 }));
    const second = shellUpdate(first.model, Message.ControlActionRequested({ key: "providers", token: 0 }));
    assert.equal(second.commands?.length ?? 0, 0, "two requests must not dispatch twice");
    assert.equal(second.model.controls.providers.token, 1, "the pending token is unchanged");
    assert.equal(second.model.controls.providers.actionStatus, "pending");
  });
});
