import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { renderToString } from "@role-model-router/foldkit/experimental/server";
import type { HtmlBuilder } from "@role-model-router/foldkit/html";

import { createSystemExtensionsClient, defineSystemExtensionsCommands } from "../src/commands";
import { systemExtensionsPage } from "../src/features/system/extensions";
import type { Message } from "../src/message";
import type { Model } from "../src/model";
import { shellModel } from "./support/runtime-shell";

const readback = { rows: [{ id: "ext-1", label: "ext-1", meta: "", value: "enabled" }], status: "ok" as const, token: 0 };

describe("S630 system extensions wiring", () => {
  it("renders Pause and Download & validate latest", async () => {
    const rendered = await Effect.runPromise(renderToString({
      init: () => ({ model: shellModel({}), commands: [] }),
      // SAFETY: renderToString infers Message=unknown; the page only emits typed messages.
      view: (_model: Model, h: HtmlBuilder<Message>) => ({ body: systemExtensionsPage(readback, h as Parameters<typeof systemExtensionsPage>[1]), title: "extensions" }),
    }, { isHydratable: false }));
    const container = document.createElement("div");
    container.innerHTML = rendered.html;
    expect(container.querySelector("[data-system-extensions-pause]")?.textContent).toBe("Pause");
    expect(container.querySelector("[data-system-extensions-download]")?.textContent).toBe("Download & validate latest");
  });

  it("sends the exact mutate and download POST bodies", async () => {
    const calls: Array<{ body: unknown; method: string; path: string }> = [];
    const commands = defineSystemExtensionsCommands(createSystemExtensionsClient(async (input, init) => {
      calls.push({ body: JSON.parse(String(init?.body)), method: String(init?.method), path: String(input) });
      return new Response("{}", { status: 200 });
    }));
    await Effect.runPromise(commands.pause({ id: "ext-1", token: 1 }).effect);
    await Effect.runPromise(commands.download({ token: 1 }).effect);
    expect(calls[0]).toEqual({ body: { action: "set_mode", id: "ext-1", mode: "disabled" }, method: "POST", path: "/api/role-model/extensions/mutate" });
    expect(calls[1]).toEqual({ body: {}, method: "POST", path: "/api/role-model/recommendations/download" });
  });
});
