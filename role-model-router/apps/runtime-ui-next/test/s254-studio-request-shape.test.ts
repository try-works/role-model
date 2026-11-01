import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { createStudioClient, studioIdle, studioRequestFor, type StudioRequest } from "../src/studio";

// Literal expectations are independent of studioRequestFor. A unique /v1/* path is not
// sufficient proof of an endpoint or payload. Builder/client checks do not replace
// tab-click-to-client integration coverage.
const requests: readonly StudioRequest[] = [
  {
    tab: "chat", method: "POST", path: "/v1/chat/completions",
    body: { messages: [{ content: "A quiet harbour at dawn", role: "user" }], model: "moonshot/kimi-k2.5", stream: false },
  },
  {
    tab: "images", method: "POST", path: "/v1/images/generations",
    body: { mode: "generate", model: "moonshot/kimi-k2.5", prompt: "A quiet harbour at dawn", size: "1024x1024" },
  },
  {
    tab: "audio", method: "POST", path: "/v1/audio/speech",
    body: { input: "A quiet harbour at dawn", model: "moonshot/kimi-k2.5", response_format: "mp3", voice: "alloy" },
  },
  {
    tab: "rerank", method: "POST", path: "/v1/rerank",
    body: { documents: ["first document", "second document"], model: "moonshot/kimi-k2.5", query: "Which document is first?", top_n: 5 },
  },
  {
    tab: "advanced", method: "POST", path: "/v1/responses",
    body: { model: "moonshot/kimi-k2.5", messages: [{ role: "user", content: "Hello" }] },
  },
];

describe("S254 studio request shape per tab", () => {
  it("chat posts to the chat completions path with the prompt as a user message", () => {
    assert.deepEqual(studioRequestFor(studioIdle("chat")), requests[0]);
  });

  // Preserve the inventory's proof name while making its assertions match the claim.
  it("every tab produces a POST with a distinct path and its own body", () => {
    for (const expected of requests) {
      assert.deepEqual(studioRequestFor(studioIdle(expected.tab)), expected, expected.tab);
    }
  });

  for (const expected of requests) {
    it("serializes the exact " + expected.tab + " request and preserves the response", async () => {
      const calls: Array<{ readonly url: string; readonly init: RequestInit | undefined }> = [];
      const client = createStudioClient({
        baseUrl: "http://studio.invalid",
        fetchImpl: async (input, init) => {
          calls.push({ url: String(input), init });
          return new Response('{"error":"fixture rejection"}', {
            status: 422, headers: { "content-type": "application/json" },
          });
        },
      });
      const request = studioRequestFor(studioIdle(expected.tab));
      assert.ok(!("error" in request));
      const signal = new AbortController().signal;
      const response = await client(request, signal);
      assert.equal(calls.length, 1);
      const call = calls[0];
      assert.ok(call);
      assert.equal(call.url, "http://studio.invalid" + expected.path);
      assert.equal(call.init?.method, expected.method);
      assert.equal(call.init?.body, JSON.stringify(expected.body));
      assert.deepEqual(call.init?.headers, { "content-type": "application/json" });
      assert.equal(call.init?.signal, signal);
      assert.deepEqual(response, {
        contentType: "application/json", status: 422, text: '{"error":"fixture rejection"}',
      });
    });
  }

  it("advanced sends the edited JSON body verbatim", () => {
    const state = { ...studioIdle("advanced"), advancedBody: '{"model":"m","max_tokens":7}' };
    const request = studioRequestFor(state);
    assert.ok(!("error" in request));
    assert.deepEqual(request.body, { model: "m", max_tokens: 7 });
  });
});
