import { renderToString } from "@role-model-router/foldkit/experimental/server";
import type { HtmlBuilder } from "@role-model-router/foldkit/html";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import {
  createLocalPeersClient,
  defineLocalPeersCommands,
  defineReadDiagnostics,
} from "../src/commands";
import { localPeerModelsPage } from "../src/features/local/peer-models";
import { Message } from "../src/message";
import type { Model } from "../src/model";
import { createUpdate } from "../src/update";
import { shellModel } from "./support/runtime-shell";

const readback = { rows: [], status: "ok" as const, token: 0 };
const update = createUpdate(
  defineReadDiagnostics(async () => ({ body: { records: [], state: "empty" }, status: 200 })),
);

describe("S627 local peer models wiring", () => {
  it("renders the model id input and load action", async () => {
    const rendered = await Effect.runPromise(
      renderToString(
        {
          init: () => ({ model: shellModel({}), commands: [] }),
          // SAFETY: renderToString infers Message=unknown; the page only emits typed messages.
          view: (_model: Model, h: HtmlBuilder<Message>) => ({
            body: localPeerModelsPage(readback, h as Parameters<typeof localPeerModelsPage>[1], {
              localPeerModelId: "openai/gpt-4.1",
            }),
            title: "peer models",
          }),
        },
        { isHydratable: false },
      ),
    );
    const container = document.createElement("div");
    container.innerHTML = rendered.html;
    expect(container.querySelector("#peer-model-id")?.getAttribute("value")).toBe("openai/gpt-4.1");
    expect(container.querySelector("[data-local-peer-model-load]")).not.toBeNull();
  });

  it("posts the exact peer-model load path", async () => {
    const calls: Array<{ body: unknown; method: string; path: string }> = [];
    const commands = defineLocalPeersCommands(
      createLocalPeersClient(async (input, init) => {
        calls.push({
          body: JSON.parse(String(init?.body)),
          method: String(init?.method),
          path: String(input),
        });
        return new Response("{}", { status: 200 });
      }),
    );
    await Effect.runPromise(commands.loadPeerModel({ modelId: "openai/gpt-4.1", token: 1 }).effect);
    expect(calls[0]).toEqual({
      body: {},
      method: "POST",
      path: "/api/role-model/local/peer/models/openai%2Fgpt-4.1/load",
    });
  });

  it("stores the model id and dispatches the load command", () => {
    const typed = update(
      shellModel({ route: { _tag: "LocalPeerModels" } }),
      Message.LocalPeerModelIdChanged({ value: "openai/gpt-4.1" }),
    );
    expect(typed.model.localPeerModelId).toBe("openai/gpt-4.1");
    const loaded = update(typed.model, Message.LocalPeerModelLoadRequested());
    expect(loaded.commands ?? []).toHaveLength(1);
  });
});
