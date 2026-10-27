import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { studioIdle, studioRequestFor } from "../src/studio";

/**
 * S254: the per-tab request shape, asserted where it is built.
 *
 * s46a drove this with five tab clicks and one Run click per tab, then read the fetch call. The mapping from
 * (tab, fields) to (method, path, body) is `studioRequestFor`, a pure function, so it can be asserted directly
 * - and the five clicks become redundant (S249: wiring assertions move to the unit that owns the wire).
 */
describe("S254 studio request shape per tab", () => {
  it("chat posts to the chat completions path with the prompt as a user message", () => {
    const request = studioRequestFor(studioIdle("chat"));
    assert.equal("error" in request, false);
    if ("error" in request) return;
    assert.equal(request.method, "POST");
    assert.equal(request.path, "/v1/chat/completions");
    assert.equal(request.tab, "chat");
    assert.deepEqual(request.body.messages, [{ role: "user", content: studioIdle("chat").prompt }]);
  });

  it("every tab produces a POST with a distinct path and its own body", () => {
    const tabs = ["chat", "images", "audio", "rerank", "advanced"] as const;
    const seen = new Map();
    for (const tab of tabs) {
      const request = studioRequestFor(studioIdle(tab));
      assert.equal("error" in request, false, tab + " must build a request");
      if ("error" in request) continue;
      assert.equal(request.method, "POST", tab + " uses POST");
      assert.ok(request.path.startsWith("/v1/"), tab + " path " + request.path);
      assert.equal(request.tab, tab);
      seen.set(tab, request.path);
    }
    assert.equal(new Set(seen.values()).size, tabs.length, "each tab has its own path: " + JSON.stringify([...seen]));
  });

  it("advanced sends the edited JSON body verbatim", () => {
    const state = { ...studioIdle("advanced"), advancedBody: '{"model":"m","max_tokens":7}' };
    const request = studioRequestFor(state);
    assert.equal("error" in request, false);
    if ("error" in request) return;
    assert.deepEqual(request.body, { model: "m", max_tokens: 7 });
  });
});
