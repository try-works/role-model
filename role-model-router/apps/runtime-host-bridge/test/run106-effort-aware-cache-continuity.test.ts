import { describe, expect, it } from "vitest";

import { toCacheContinuityScopeDescriptor } from "../src/index.js";

describe("run106 effort-aware cache continuity (R6)", () => {
  it("keys a prompt-cache scope by the effort arm", () => {
    const descriptor = toCacheContinuityScopeDescriptor({
      messages: [],
      promptCache: { key: "prompt-abc" },
      reasoning: { effort: "high" },
    });
    expect(descriptor).toMatchObject({
      scopeSource: "prompt_cache_key",
      scopeId: "prompt_cache_key:prompt-abc:effort:high",
    });
  });

  it("keys a session-affinity scope by the effort arm", () => {
    const descriptor = toCacheContinuityScopeDescriptor({
      messages: [],
      sessionAffinity: { sessionId: "sess-1" },
      reasoning: { effort: "low" },
    });
    expect(descriptor).toMatchObject({
      scopeSource: "session_affinity",
      scopeId: "session_affinity:sess-1:effort:low",
    });
  });

  it("keeps the historical effort-free scope key when no effort is requested", () => {
    const descriptor = toCacheContinuityScopeDescriptor({
      messages: [],
      promptCache: { key: "prompt-abc" },
    });
    expect(descriptor).toMatchObject({
      scopeSource: "prompt_cache_key",
      scopeId: "prompt_cache_key:prompt-abc",
    });
  });

  it("returns null when neither a prompt-cache key nor a session id is present", () => {
    expect(toCacheContinuityScopeDescriptor({ messages: [] })).toBeNull();
  });
});
