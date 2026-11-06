import { renderToString } from "@role-model-router/foldkit/experimental/server";
import type { HtmlBuilder } from "@role-model-router/foldkit/html";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { defineReadDiagnostics } from "../src/commands";
import { localLogsPage } from "../src/families-view";
import { Message } from "../src/message";
import type { Model } from "../src/model";
import { createUpdate } from "../src/update";
import { shellModel } from "./support/runtime-shell";

const readback = { rows: [], status: "ok" as const, token: 0 };
const update = createUpdate(
  defineReadDiagnostics(async () => ({ body: { records: [], state: "empty" }, status: 200 })),
);

describe("S625 local logs controls", () => {
  it("renders a labelled auto-refresh control", async () => {
    const rendered = await Effect.runPromise(
      renderToString(
        {
          init: () => ({ model: shellModel({}), commands: [] }),
          // SAFETY: renderToString infers Message=unknown; the page only emits typed messages.
          view: (_model: Model, h: HtmlBuilder<Message>) => ({
            body: localLogsPage(readback, h as Parameters<typeof localLogsPage>[1]),
            title: "logs",
          }),
        },
        { isHydratable: false },
      ),
    );
    const container = document.createElement("div");
    container.innerHTML = rendered.html;
    expect(container.querySelector("#autoRefresh")?.getAttribute("aria-label")).toBe(
      "Auto-refresh logs every 3 seconds",
    );
  });

  it("stores the auto-refresh choice", () => {
    const next = update(
      shellModel({ route: { _tag: "LocalLogs" } }),
      Message.LocalLogsAutoRefreshToggled({ value: true }),
    );
    expect(next.model.localLogsAutoRefresh).toBe(true);
  });
});
