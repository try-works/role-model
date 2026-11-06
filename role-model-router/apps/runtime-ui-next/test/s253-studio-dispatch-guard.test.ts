import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { Message } from "../src/message";
import { studioIdle, studioLoading } from "../src/studio";
import { shellModel, shellUpdate } from "./support/runtime-shell";

/**
 * S253: the Studio double-dispatch guard, asserted where it lives.
 *
 * s46a drove this with two element.click() calls and counted client calls. The rule is an update rule: while
 * a request is loading, a second StudioRunRequested must not emit a second command. This replaces the click
 * mechanism (S249: wiring tests do not move to scene, but they can move to the update).
 *
 * S260: the assertions read the `DispatchStudio` Command the reducer returned, including the exact
 * `StudioState` payload. A fake factory count could not see a wrong tab, model, or token.
 */
const model = () => shellModel({ route: { _tag: "Studio" }, studio: studioIdle("chat") });

describe("S253 studio dispatch guard", () => {
  it("the first run returns one DispatchStudio command and enters loading", () => {
    const next = shellUpdate(model(), Message.StudioRunRequested({ token: 0 }));
    const commands = next.commands ?? [];
    assert.equal(commands.length, 1, "one command per run request");
    assert.equal(
      commands[0]?.name,
      "DispatchStudio",
      "the reducer returned the production command",
    );
    assert.equal(commands[0]?.args?.token, 0, "the command carries the request token");
    assert.deepEqual(
      commands[0]?.args?.state,
      { ...studioLoading(0), statusCode: 0 },
      "the command carries the loading StudioState the view renders",
    );
    assert.equal(next.model.studio?.status, "loading");
  });

  it("a second run while loading returns no command", () => {
    const first = shellUpdate(model(), Message.StudioRunRequested({ token: 0 }));
    const second = shellUpdate(first.model, Message.StudioRunRequested({ token: 0 }));
    assert.equal(
      second.commands?.length ?? 0,
      0,
      "two clicks while loading must not dispatch twice",
    );
    assert.equal(
      second.model.studio?.token,
      first.model.studio?.token,
      "the loading token is unchanged",
    );
    assert.equal(second.model.studio?.status, "loading");
  });
});
