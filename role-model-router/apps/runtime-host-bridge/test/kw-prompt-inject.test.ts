import { describe, expect, test, vi } from "vitest";
import {
  applyKwPromptInjectToMessages,
  applyKwPromptInjectToMessagesSync,
  registerKwPromptInjectSession,
  syncPrivateKnowledgeActivation,
} from "../src/kw-prompt-inject.js";

describe("legacy Knowledge Worker production helpers", () => {
  test("never inserts a system message even when a runner offers one", async () => {
    const run = vi.fn(async () => ({ injected: true, systemMessage: "legacy mutation" }));
    const messages = [{ role: "user", content: "unchanged" }];
    const result = await applyKwPromptInjectToMessages({
      messages,
      hostProductionActivation: true,
      sessionId: "legacy",
      run,
    });
    expect(result.messages).toEqual(messages);
    expect(result.receipt).toMatchObject({
      injected: false,
      code: "kw_prompt_inject_prohibited_shadow_only",
    });
    expect(run).not.toHaveBeenCalled();
  });

  test("never inserts through a registered synchronous worker", () => {
    const promptInject = vi.fn(() => ({ injected: true, systemMessage: "legacy mutation" }));
    registerKwPromptInjectSession("legacy-sync", { promptInject });
    const messages = [{ role: "user", content: "unchanged" }];
    const result = applyKwPromptInjectToMessagesSync({
      messages,
      hostProductionActivation: true,
      sessionId: "legacy-sync",
    });
    expect(result.messages).toEqual(messages);
    expect(result.receipt.code).toBe("kw_prompt_inject_prohibited_shadow_only");
    expect(promptInject).not.toHaveBeenCalled();
  });

  test("never invokes private production activation or deactivation", async () => {
    const run = vi.fn(async () => ({ productionActivation: true }));
    for (const action of ["activate", "deactivate"] as const) {
      const result = await syncPrivateKnowledgeActivation({
        sessionId: `legacy-${action}`,
        action,
        run,
      });
      expect(result).toMatchObject({
        ok: false,
        code: "kw_prompt_inject_prohibited_shadow_only",
      });
    }
    expect(run).not.toHaveBeenCalled();
  });
});
