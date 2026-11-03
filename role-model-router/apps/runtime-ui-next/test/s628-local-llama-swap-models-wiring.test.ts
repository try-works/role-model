import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { renderToString } from "@role-model-router/foldkit/experimental/server";
import type { HtmlBuilder } from "@role-model-router/foldkit/html";

import { createLocalPeersClient, defineLocalPeersCommands } from "../src/commands";
import { localLlamaModelsPage } from "../src/features/local/llama-swap-models";
import type { Message } from "../src/message";
import type { Model } from "../src/model";
import { shellModel } from "./support/runtime-shell";

const readback = { rows: [], status: "ok" as const, token: 0 };

describe("S628 llama-swap models wiring", () => {
  it("renders the model input, Load model, and All roles", async () => {
    const rendered = await Effect.runPromise(renderToString({
      init: () => ({ model: shellModel({}), commands: [] }),
      // SAFETY: renderToString infers Message=unknown; the page only emits typed messages.
      view: (_model: Model, h: HtmlBuilder<Message>) => ({ body: localLlamaModelsPage(readback, h as Parameters<typeof localLlamaModelsPage>[1], { localLlamaSwapModelId: "lfm2.5-8b-a1b" }), title: "llama" }),
    }, { isHydratable: false }));
    const container = document.createElement("div");
    container.innerHTML = rendered.html;
    expect(container.querySelector("#llama-swap-model-id")?.getAttribute("value")).toBe("lfm2.5-8b-a1b");
    expect(container.querySelector("[data-llama-swap-load]")).not.toBeNull();
    expect(container.querySelector("[data-llama-swap-all-roles]")).not.toBeNull();
  });

  it("posts the exact llama-swap load bodies", async () => {
    const calls: Array<{ body: unknown; method: string; path: string }> = [];
    const commands = defineLocalPeersCommands(createLocalPeersClient(async (input, init) => {
      calls.push({ body: JSON.parse(String(init?.body)), method: String(init?.method), path: String(input) });
      return new Response("{}", { status: 200 });
    }));
    await Effect.runPromise(commands.loadLlamaSwapModel({ allRoles: false, modelId: "lfm2.5-8b-a1b", token: 1 }).effect);
    await Effect.runPromise(commands.loadLlamaSwapModel({ allRoles: true, modelId: "lfm2.5-8b-a1b", token: 1 }).effect);
    expect(calls[0]).toEqual({ body: {}, method: "POST", path: "/api/role-model/local/llama-swap/models/lfm2.5-8b-a1b/load" });
    expect(calls[1]).toEqual({ body: { roleAssignmentMode: "all" }, method: "POST", path: "/api/role-model/local/llama-swap/models/lfm2.5-8b-a1b/load" });
  });
});
