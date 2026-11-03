import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { renderToString } from "@role-model-router/foldkit/experimental/server";
import type { HtmlBuilder } from "@role-model-router/foldkit/html";

import { familyPage } from "../src/families-view";
import { Message } from "../src/message";
import type { Model } from "../src/model";
import { shellModel } from "./support/runtime-shell";

const empty = { rows: [{ id: "row", label: "capability", meta: "available", value: "ready" }], status: "ok" as const, token: 0 };
const render = async (tag: string, route: string, state?: Record<string, unknown>): Promise<HTMLElement> => {
  const rendered = await Effect.runPromise(renderToString({
    init: () => ({ model: shellModel({}), commands: [] }),
    // SAFETY: renderToString infers Message=unknown; familyPage only emits typed messages.
    view: (_model: Model, h: HtmlBuilder<Message>) => ({ body: familyPage(tag, route, "", [{ label: "readback", readback: empty }], h, undefined, undefined, state as never), title: tag }),
  }, { isHydratable: false }));
  const container = document.createElement("div");
  container.innerHTML = rendered.html;
  return container;
};
const headings = (container: HTMLElement): string[] => [...container.querySelectorAll("main h2, h2")].map((node) => node.textContent?.trim() ?? "");

describe("S632 system visual parity", () => {
  it("SystemOperator renders the reference card hierarchy and copy", async () => {
    const page = await render("Operator Controls", "system-operator", { learningOperatorToken: "tok", operatorLearningMode: "shadow", systemOperatorReplayCount: "25", systemOperatorTraceRoot: "trace-1" });
    expect(headings(page).slice(0, 6)).toEqual(["Operator Controls", "Operator Capability Status", "Trace lineage", "Replay Jobs", "Evaluation Jobs", "Shadow Learning"]);
    expect(page.textContent).toContain("This page does not enable production learning. Learning actions remain shadow-only and the runtime is the source of truth.");
    expect(page.textContent).toContain("Replay and evaluation operations below preserve the trace root identity instead of inferring lineage from a job label.");
    expect(page.querySelector("#operator-access-token")?.getAttribute("value")).toBe("tok");
    expect(page.querySelector("#replay-trace-root")?.getAttribute("value")).toBe("trace-1");
    expect(page.querySelector("#replay-budget")?.getAttribute("value")).toBe("25");
    const options = [...page.querySelectorAll("#shadow-learning-mode option")].map((option) => option.textContent);
    expect(options).toEqual(["Disabled", "Shadow", "Advisory"]);
    expect(page.textContent).toContain("Load operator state to inspect shadow-learning status.");
    expect(page.querySelector('a[href="/system/storage-retention"]')?.textContent).toBe("Open Storage & Retention");
  });

  it("SystemExtensions renders the reference cards, copy, download and per-row Pause", async () => {
    const rows = [{ id: "ext-1", label: "ext-1", meta: "healthy", value: "enabled" }, { id: "ext-2", label: "ext-2", meta: "degraded", value: "shadow" }];
    const rendered = await Effect.runPromise(renderToString({
      init: () => ({ model: shellModel({}), commands: [] }),
      // SAFETY: renderToString infers Message=unknown; familyPage only emits typed messages.
      view: (_model: Model, h: HtmlBuilder<Message>) => ({ body: familyPage("Extensions", "system-extensions", "", [{ label: "readback", readback: { rows, status: "ok", token: 0 } }], h), title: "Extensions" }),
    }, { isHydratable: false }));
    const page = document.createElement("div");
    page.innerHTML = rendered.html;
    expect(headings(page)).toEqual(["Contribution posture", "Recommendation ledger", "Replay automation", "Extension inventory"]);
    expect(page.textContent).toContain("Aggregate upload is independent from local recommendation use, training, external RL, and rich capture. Contribution policy is not extension enablement.");
    expect(page.textContent).toContain("Signed bundles validated locally before apply.");
    expect(page.textContent).toContain("Canonical packages on this host. Modes change the extension boundary without becoming contribution policy.");
    expect(page.querySelector("[data-system-extensions-download]")?.textContent).toBe("Download & validate latest");
    expect(page.querySelectorAll("[data-system-extensions-pause]")).toHaveLength(2);
  });
});
