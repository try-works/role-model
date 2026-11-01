import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { renderToString } from "@role-model-router/foldkit/experimental/server";
import { view } from "../src/view";


import { createRuntimeConfigClient } from "../src/runtime-config";
import { Message } from "../src/message";
import { createUpdate } from "../src/update";
import { defineReadDiagnostics } from "../src/commands";
import type { Model } from "../src/model";
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

const renderLearning = async (learningReplayAutoQueue?: Model["learningReplayAutoQueue"]): Promise<HTMLElement> => {
  const rendered = await Effect.runPromise(renderToString({
    init: () => ({
      model: shellModel({
        route: { _tag: "Learning" },
        learningReplayAutoQueue,
      }),
      commands: [],
    }),
    view,
  }, { isHydratable: false }));
  const container = document.createElement("div");
  container.innerHTML = rendered.html;
  return container;
};

describe("S613 replay auto-queue Learning overview card", () => {
  it("renders the card controls from the model state", async () => {
    const card = document.createElement("div");
    card.innerHTML = (await renderLearning()).innerHTML;
    const toggle = card.querySelector("[data-replay-auto-queue-toggle]");
    expect(toggle).not.toBeNull();
    expect(toggle?.getAttribute("aria-pressed")).toBe("true");
    const cap = card.querySelector("[data-replay-auto-queue-cap]");
    expect(cap?.getAttribute("value")).toBe("100");
    expect(card.querySelector("[data-replay-auto-queue-save]")).not.toBeNull();
    expect(card.querySelector("[data-replay-auto-queue-status]")?.getAttribute("data-replay-auto-queue-status")).toBe("idle");
  });

  it("renders saved and error status states honestly", async () => {
    const saved = document.createElement("div");
    saved.innerHTML = (await renderLearning({ dailyCap: "25", enabled: "off", message: "Replay auto-queue updated.", status: "saved" })).innerHTML;
    expect(saved.querySelector("[data-replay-auto-queue-toggle]")?.getAttribute("aria-pressed")).toBe("false");
    expect(saved.querySelector("[data-replay-auto-queue-status='saved']")?.textContent).toContain("Replay auto-queue updated.");
    const failed = document.createElement("div");
    failed.innerHTML = (await renderLearning({ dailyCap: "100", enabled: "on", message: "HTTP 500", status: "error" })).innerHTML;
    expect(failed.querySelector("[data-replay-auto-queue-status='error']")?.textContent).toContain("HTTP 500");
  });
});
