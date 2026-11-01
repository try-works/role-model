import { describe, expect, it } from "vitest";

import { createRuntimeConfigClient } from "../src/runtime-config";
import { Message } from "../src/message";
import { createUpdate } from "../src/update";
import { defineReadDiagnostics } from "../src/commands";
import { shellModel } from "./support/runtime-shell";

/** S613 (task-86): replay auto-queue UI plumbing. The Learning Overview card is lead-applied. */

describe("S613 replay auto-queue plumbing", () => {
  it("PUTs the exact auto-queue body to the runtime config endpoint", async () => {
    const calls: Array<{ readonly body: unknown; readonly method: string; readonly url: string }> = [];
    const client = createRuntimeConfigClient({
      baseUrl: "http://runtime.test",
      fetchImpl: async (input, init) => {
        calls.push({ body: JSON.parse(String(init?.body)), method: String(init?.method), url: String(input) });
        return new Response(JSON.stringify({ applied: true }), { headers: { "content-type": "application/json" }, status: 200 });
      },
    });
    const result = await client.patchReplayAutoQueue({ dailyCap: 25, enabled: false });
    expect(result.status).toBe(200);
    expect(calls).toEqual([{
      body: { replay: { auto_queue: { daily_cap: 25, enabled: false } } },
      method: "PUT",
      url: "http://runtime.test/api/role-model/runtime/config",
    }]);
  });

  it("exposes the five auto-queue messages with the contract payloads", () => {
    expect(Message.ReplayAutoQueueToggleChanged({ value: "off" })._tag).toBe("ReplayAutoQueueToggleChanged");
    expect(Message.ReplayAutoQueueCapChanged({ value: "25" })._tag).toBe("ReplayAutoQueueCapChanged");
    expect(Message.ReplayAutoQueueSaveRequested()._tag).toBe("ReplayAutoQueueSaveRequested");
    expect(Message.ReplayAutoQueueSaved({ token: 1 })._tag).toBe("ReplayAutoQueueSaved");
    expect(Message.ReplayAutoQueueSaveFailed({ message: "no", token: 1 })._tag).toBe("ReplayAutoQueueSaveFailed");
  });

  it("stores the toggle and cap draft in the learning auto-queue state", () => {
    const update = createUpdate(defineReadDiagnostics(async () => ({ body: { records: [], state: "empty" }, status: 200 })));
    const model = shellModel({ route: { _tag: "Learning" } });
    const toggled = update(model, Message.ReplayAutoQueueToggleChanged({ value: "off" }));
    expect(toggled.model.learningReplayAutoQueue).toMatchObject({ enabled: "off", status: "idle" });
    const capped = update(toggled.model, Message.ReplayAutoQueueCapChanged({ value: "25" }));
    expect(capped.model.learningReplayAutoQueue).toMatchObject({ dailyCap: "25", enabled: "off" });
  });
});
