import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { renderToString } from "@role-model-router/foldkit/experimental/server";
import type { HtmlBuilder } from "@role-model-router/foldkit/html";

import { createSystemOperatorClient, defineSystemOperatorCommands } from "../src/commands";
import { systemOperatorPage } from "../src/features/system/operator";
import type { Message } from "../src/message";
import type { Model } from "../src/model";
import { shellModel } from "./support/runtime-shell";

describe("S629 system operator wiring", () => {
  it("renders token, Load Operator State, trace root, count, Create Replay", async () => {
    const rendered = await Effect.runPromise(renderToString({
      init: () => ({ model: shellModel({}), commands: [] }),
      // SAFETY: renderToString infers Message=unknown; the page only emits typed messages.
      view: (_model: Model, h: HtmlBuilder<Message>) => ({ body: systemOperatorPage(undefined, h as Parameters<typeof systemOperatorPage>[1], { learningOperatorToken: "tok", systemOperatorReplayCount: "25", systemOperatorTraceRoot: "trace-1" }), title: "operator" }),
    }, { isHydratable: false }));
    const container = document.createElement("div");
    container.innerHTML = rendered.html;
    expect(container.querySelector("#operator-token")?.getAttribute("value")).toBe("tok");
    expect(container.querySelector("[data-operator-load-state]")).not.toBeNull();
    expect(container.querySelector("#operator-trace-root")?.getAttribute("value")).toBe("trace-1");
    expect(container.querySelector("#operator-replay-count")?.getAttribute("value")).toBe("25");
    expect(container.querySelector("[data-operator-create-replay]")).not.toBeNull();
  });

  it("sends the exact operator status GET and replay POST", async () => {
    const calls: Array<{ body?: unknown; headers: unknown; method: string; path: string }> = [];
    const commands = defineSystemOperatorCommands(createSystemOperatorClient(async (input, init) => {
      calls.push({ body: init?.body === undefined ? undefined : JSON.parse(String(init.body)), headers: init?.headers, method: String(init?.method ?? "GET"), path: String(input) });
      return new Response("{}", { status: 200 });
    }));
    await Effect.runPromise(commands.loadState({ token: "tok", tokenId: 1 }).effect);
    await Effect.runPromise(commands.createReplay({ maxRequests: 25, token: "tok", tokenId: 1, traceRootId: "trace-1" }).effect);
    expect(calls[0]).toEqual({ body: undefined, headers: { authorization: "Bearer tok" }, method: "GET", path: "/api/role-model/operator/status" });
    expect(calls[1]).toEqual({ body: { budget: { maxRequests: 25 }, traceRootId: "trace-1" }, headers: { authorization: "Bearer tok", "content-type": "application/json" }, method: "POST", path: "/api/role-model/operator/replay/jobs" });
  });
});
