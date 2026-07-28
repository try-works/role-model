import { describe, expect, test } from "vitest";
import {
  applyKwPromptInjectToMessages,
  applyKwPromptInjectToMessagesSync,
  clearKwPromptInjectSessionsForTests,
  registerKwPromptInjectSession,
  syncPrivateKnowledgeActivation,
} from "../src/kw-prompt-inject.js";

describe("kw-prompt-inject join and insertion helpers", () => {
  test("refuses inject when host production activation is off", async () => {
    const result = await applyKwPromptInjectToMessages({
      messages: [{ role: "user", content: "hello" }],
      hostProductionActivation: false,
      sessionId: "s1",
      run: async () => ({ injected: true, systemMessage: "should-not-run" }),
    });
    expect(result.receipt.injected).toBe(false);
    expect(result.receipt.code).toBe("kw_prompt_inject_requires_activation");
    expect(result.messages).toEqual([{ role: "user", content: "hello" }]);
  });

  test("refuses inject when private join runner is missing", async () => {
    clearKwPromptInjectSessionsForTests();
    const result = await applyKwPromptInjectToMessages({
      messages: [{ role: "user", content: "hello" }],
      hostProductionActivation: true,
      sessionId: "s1",
    });
    expect(result.receipt.injected).toBe(false);
    expect(result.receipt.code).toBe("kw_prompt_inject_join_unsatisfied");
  });

  test("prepends system message on successful private prompt-inject", async () => {
    const result = await applyKwPromptInjectToMessages({
      messages: [{ role: "user", content: "hello" }],
      hostProductionActivation: true,
      sessionId: "s1",
      requestId: "r1",
      run: async (envelope) => {
        expect(envelope.capability).toBe("knowledge:prompt-inject");
        expect(envelope.sessionId).toBe("s1");
        return {
          injected: true,
          plane: "production",
          systemMessage: "ROLE_MODEL_KW_PROMPT_INJECT_V1\ntip: prefer verified evidence",
        };
      },
    });
    expect(result.receipt.injected).toBe(true);
    expect(result.receipt.surface).toBe("applyRequestedRoleExecutionPolicy");
    expect(result.messages[0]).toEqual({
      role: "system",
      content: "ROLE_MODEL_KW_PROMPT_INJECT_V1\ntip: prefer verified evidence",
    });
    expect(result.messages[1]).toEqual({ role: "user", content: "hello" });
  });

  test("sync path uses registered session worker", () => {
    clearKwPromptInjectSessionsForTests();
    registerKwPromptInjectSession("sync-1", {
      promptInject: () => ({
        injected: true,
        systemMessage: "ROLE_MODEL_KW_PROMPT_INJECT_V1\ntip: sync",
      }),
    });
    const result = applyKwPromptInjectToMessagesSync({
      messages: [{ role: "user", content: "hello" }],
      hostProductionActivation: true,
      sessionId: "sync-1",
    });
    expect(result.receipt.injected).toBe(true);
    expect(result.messages[0]?.content).toContain("tip: sync");
    clearKwPromptInjectSessionsForTests();
  });

  test("syncPrivateKnowledgeActivation calls private activate/deactivate", async () => {
    const calls: string[] = [];
    const activated = await syncPrivateKnowledgeActivation({
      sessionId: "join-1",
      action: "activate",
      policy: { activationPolicyVersion: 1 },
      run: async (envelope) => {
        calls.push(String(envelope.capability));
        return { productionActivation: true };
      },
    });
    expect(activated.ok).toBe(true);
    const deactivated = await syncPrivateKnowledgeActivation({
      sessionId: "join-1",
      action: "deactivate",
      policy: { deactivationPolicyVersion: 1, operatorAttestation: "deactivate-production" },
      run: async (envelope) => {
        calls.push(String(envelope.capability));
        return { productionActivation: false };
      },
    });
    expect(deactivated.ok).toBe(true);
    expect(calls).toEqual(["knowledge:activate", "knowledge:deactivate"]);
  });

  test("syncPrivateKnowledgeActivation refuses when runner missing", async () => {
    const result = await syncPrivateKnowledgeActivation({
      sessionId: "join-2",
      action: "activate",
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("kw_prompt_inject_join_unsatisfied");
  });
});
