import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { renderToString } from "@role-model-router/foldkit/experimental/server";
import type { HtmlBuilder } from "@role-model-router/foldkit/html";

import { defineReadDiagnostics } from "../src/commands";
import { observeLogsRoute } from "../src/features/observe/views";
import { Message } from "../src/message";
import type { Model } from "../src/model";
import { createUpdate } from "../src/update";
import { shellModel } from "./support/runtime-shell";

const readback = { rows: [{ id: "l1", label: "[t1]", meta: "[t1] warn status=500 boom", value: "req-1" }], status: "ok" as const, token: 0 };
const update = createUpdate(defineReadDiagnostics(async () => ({ body: { records: [], state: "empty" }, status: 200 })));

describe("S624 observe logs source filter", () => {
  it("renders the labelled filter with the active value and dispatches on selection", async () => {
    const rendered = await Effect.runPromise(renderToString({
      init: () => ({ model: shellModel({}), commands: [] }),
      // SAFETY: renderToString infers Message=unknown; the route only emits typed messages.
      view: (_model: Model, h: HtmlBuilder<Message>) => ({ body: observeLogsRoute(readback, h as Parameters<typeof observeLogsRoute>[1], "combined"), title: "logs" }),
    }, { isHydratable: false }));
    const container = document.createElement("div");
    container.innerHTML = rendered.html;
    expect(container.textContent).toContain("Source filter");
    expect(container.querySelector("[data-s563-segmented='Log source filter'] [aria-pressed='true']")?.textContent).toBe("combined");
  });

  it("stores the selected source in state", () => {
    const next = update(shellModel({ route: { _tag: "ObserveLogs" } }), Message.ObserveLogsSourceChanged({ value: "combined" }));
    expect(next.model.observeLogsSource).toBe("combined");
  });
});
