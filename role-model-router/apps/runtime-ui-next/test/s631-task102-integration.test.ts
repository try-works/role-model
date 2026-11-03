import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { renderToString } from "@role-model-router/foldkit/experimental/server";
import type { HtmlBuilder } from "@role-model-router/foldkit/html";

import { defineReadDiagnostics } from "../src/commands";
import { familyPage } from "../src/families-view";
import { observeLogsRoute } from "../src/features/observe/views";
import { Message } from "../src/message";
import type { Model } from "../src/model";
import { createUpdate } from "../src/update";
import { shellModel } from "./support/runtime-shell";

const empty = { rows: [], status: "ok" as const, token: 0 };
const update = createUpdate(defineReadDiagnostics(async () => ({ body: { records: [], state: "empty" }, status: 200 })));

const render = async (body: (h: HtmlBuilder<Message>) => unknown): Promise<HTMLElement> => {
  const rendered = await Effect.runPromise(renderToString({
    init: () => ({ model: shellModel({}), commands: [] }),
    // SAFETY: renderToString infers Message=unknown; bodies only emit typed messages.
    view: (_model: Model, h: HtmlBuilder<Message>) => ({ body: body(h as HtmlBuilder<Message>) as never, title: "route" }),
  }, { isHydratable: false }));
  const container = document.createElement("div");
  container.innerHTML = rendered.html;
  return container;
};

describe("S631 task-102 real familyPage state plumbing", () => {
  it("LocalLogs reads localLogsAutoRefresh and renders checked", async () => {
    const html = await render((h) => familyPage("Llama-swap logs", "local-logs", "logs", [{ label: "Structured local log history", readback: empty }], h, undefined, undefined, { localLogsAutoRefresh: true }));
    expect(html.querySelector("#autoRefresh")?.hasAttribute("checked")).toBe(true);
  });

  it("LocalPeers reads the draft and renders its values", async () => {
    const html = await render((h) => familyPage("Local endpoints", "local-peers", "peers", [{ label: "Local endpoints", readback: empty }], h, undefined, undefined, { localPeersDraft: { token: "secret", url: "http://new:1234" } }));
    expect(html.querySelector("#peer-url")?.getAttribute("value")).toBe("http://new:1234");
    expect(html.querySelector("#peer-auth-token")?.getAttribute("value")).toBe("secret");
  });

  it("LocalPeerModels reads localPeerModelId", async () => {
    const html = await render((h) => familyPage("Peer models", "local-peer-models", "peer models", [{ label: "Register model", readback: empty }], h, undefined, undefined, { localPeerModelId: "openai/gpt-4.1" }));
    expect(html.querySelector("#peer-model-id")?.getAttribute("value")).toBe("openai/gpt-4.1");
  });

  it("LocalLlamaSwapModels reads the model id and status", async () => {
    const html = await render((h) => familyPage("Llama-swap models", "local-llama-swap-models", "llama", [{ label: "Load model", readback: empty }], h, undefined, undefined, { localLlamaSwapMessage: "loaded", localLlamaSwapModelId: "lfm2.5-8b-a1b" }));
    expect(html.querySelector("#llama-swap-model-id")?.getAttribute("value")).toBe("lfm2.5-8b-a1b");
    expect(html.textContent).toContain("loaded");
  });

  it("SystemOperator reads token/trace/count", async () => {
    const html = await render((h) => familyPage("Operator Controls", "system-operator", "op", [{ label: "Operator status", readback: empty }], h, undefined, undefined, { learningOperatorToken: "tok", systemOperatorReplayCount: "7", systemOperatorTraceRoot: "trace-1" }));
    expect(html.querySelector("#operator-token")?.getAttribute("value")).toBe("tok");
    expect(html.querySelector("#operator-trace-root")?.getAttribute("value")).toBe("trace-1");
    expect(html.querySelector("#operator-replay-count")?.getAttribute("value")).toBe("7");
  });

  it("SystemExtensions renders one Pause per row and mutates the chosen id", async () => {
    const rows = [{ id: "ext-1", label: "ext-1", meta: "", value: "enabled" }, { id: "ext-2", label: "ext-2", meta: "", value: "disabled" }];
    const html = await render((h) => familyPage("Extensions", "system-extensions", "ext", [{ label: "Extension boundary", readback: { rows, status: "ok", token: 0 } }], h));
    expect(html.querySelectorAll("[data-system-extensions-pause]")).toHaveLength(2);
    const base = shellModel({ route: { _tag: "SystemExtensions" } });
    const model = { ...base, readbacks: { ...base.readbacks, extensions: { rows, status: "ok" as const, token: 0 } } };
    const next = update(model, Message.SystemExtensionsPauseRequested({ extensionId: "ext-2" }));
    const command = (next.commands ?? [])[0] as unknown as { readonly args: { readonly id: string } };
    expect(command.args.id).toBe("ext-2");
  });

  it("ObserveLogs filters rows by activeSource and keeps the active value", async () => {
    const rows = [{ id: "a", label: "a", meta: "", value: "1" }, { id: "b", label: "b", meta: "status=500", value: "2" }];
    const all = await render((h) => observeLogsRoute({ rows, status: "ok", token: 0 }, h));
    const combined = await render((h) => observeLogsRoute({ rows, status: "ok", token: 0 }, h, "combined"));
    expect(all.querySelectorAll("tbody tr")).toHaveLength(2);
    expect(combined.querySelectorAll("tbody tr")).toHaveLength(1);
    expect(combined.querySelector("[data-s563-segmented='Log source filter'] [aria-pressed='true']")?.textContent).toBe("combined");
  });
});
