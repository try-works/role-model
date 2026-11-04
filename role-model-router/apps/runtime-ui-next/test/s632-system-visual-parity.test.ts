import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { renderToString } from "@role-model-router/foldkit/experimental/server";
import type { HtmlBuilder } from "@role-model-router/foldkit/html";

import { Message } from "../src/message";
import type { Model } from "../src/model";
import { systemExtensionsPage } from "../src/features/system/extensions";
import { systemOperatorPage } from "../src/features/system/operator";
import type { ReadbacksState } from "../src/readback";
import { shellModel } from "./support/runtime-shell";

const ok = (rows: Array<{ id: string; label: string; meta: string; value: string }>) => ({ rows, status: "ok" as const, token: 0 });
const headings = (container: HTMLElement): string[] => [...container.querySelectorAll("main h2, h2")].map((node) => node.textContent?.trim() ?? "");
const render = async (body: (readbacks: ReadbacksState, h: HtmlBuilder<Message>) => unknown, readbacks: Partial<ReadbacksState>, tag: string): Promise<HTMLElement> => {
  const base = shellModel({});
  const model: Model = { ...base, readbacks: { ...base.readbacks, ...readbacks } as ReadbacksState, route: { _tag: tag } as Model["route"] };
  const rendered = await Effect.runPromise(renderToString({
    init: () => ({ commands: [], model }),
    // SAFETY: renderToString infers Message=unknown; the pages only emit typed messages.
    view: (_model: Model, h: HtmlBuilder<Message>) => ({ body: body(model.readbacks, h as Parameters<typeof systemOperatorPage>[1]) as never, title: tag }),
  }, { isHydratable: false }));
  const container = document.createElement("div");
  container.innerHTML = rendered.html;
  return container;
};

describe("S632 system visual parity", () => {
  it("SystemOperator renders the reference card hierarchy, real capability grid and controls", async () => {
    const capability = ok([{ id: "row", label: "capability", meta: "available", value: "ready" }]);
    const page = await render((readbacks, h) => systemOperatorPage(readbacks, h, { learningOperatorToken: "tok", operatorLearningMode: "shadow", systemOperatorReplayCount: "25", systemOperatorTraceRoot: "trace-1" }), {
      evaluationJobs: capability,
      learningAdvisory: capability,
      learningProfile: capability,
      operatorStatus: capability,
      operatorTraceRoots: capability,
      replayJobs: capability,
    }, "SystemOperator");
    expect(headings(page).slice(0, 6)).toEqual(["Operator Controls", "Operator Capability Status", "Trace lineage", "Replay Jobs", "Evaluation Jobs", "Shadow Learning"]);
    expect([...page.querySelectorAll("h3")].map((node) => node.textContent?.trim())).toEqual(["Learning profile", "Advisory"]);
    expect(page.textContent).toContain("This page does not enable production learning. Learning actions remain shadow-only and the runtime is the source of truth.");
    expect(page.textContent).toContain("Learning output is advisory. Mode changes and rollback never directly alter production routing.");
    expect(page.querySelectorAll("[data-operator-capability-grid] > div")).toHaveLength(1);
    expect(page.querySelector("[data-operator-capability-grid]")?.textContent).toContain("capability");
    expect(page.querySelector("#operator-access-token")?.getAttribute("value")).toBe("tok");
    expect(page.querySelector("#replay-trace-root")?.getAttribute("value")).toBe("trace-1");
    expect(page.querySelector("#replay-budget")?.getAttribute("value")).toBe("25");
    const options = [...page.querySelectorAll("#shadow-learning-mode option")].map((option) => option.textContent);
    expect(options).toEqual(["Disabled", "Shadow", "Advisory"]);
    expect(page.querySelector('a[href="/system/storage-retention"]')?.textContent).toBe("Open Storage & Retention");
  });

  it("SystemExtensions renders the reference cards, real inventory fields, download, apply/dismiss and automation controls", async () => {
    const rows = [
      { id: "ext-1", label: "ext-1", meta: JSON.stringify({ enabledMode: "active", health: { available: true }, lifecycle: "ready" }), value: "enabled" },
      { id: "ext-2", label: "ext-2", meta: JSON.stringify({ enabledMode: "shadow", health: { available: false }, lifecycle: "degraded" }), value: "shadow" },
    ];
    const page = await render((readbacks, h) => systemExtensionsPage(readbacks, h), {
      contribution: ok([{ id: "access", label: "recommendation_access", meta: "", value: "preview_and_apply" }]),
      extensions: ok(rows),
      recommendations: ok([{ id: "rec-1", label: "rec-1", meta: "signed", value: "pending" }]),
      replayAutomation: ok([{ id: "ticks", label: "ticks", meta: "", value: "2" }]),
    }, "SystemExtensions");
    expect(headings(page)).toEqual(["Readiness", "Contribution posture", "Recommendation ledger", "Replay automation", "Extension inventory"]);
    expect(page.textContent).toContain("Contribution policy records whether the runtime may contribute aggregate observations. It is independent from extension enablement.");
    expect(page.textContent).toContain("Signed bundles validated locally before apply or dismiss.");
    expect(page.textContent).toContain("Canonical packages on this host. Modes change the extension boundary without becoming contribution policy.");
    expect(page.querySelector("[data-system-extensions-download]")?.textContent).toBe("Download & validate latest");
    expect(page.querySelectorAll("[data-system-extensions-pause]")).toHaveLength(2);
    expect(page.querySelector("[data-system-recommendation-apply='rec-1']")).not.toBeNull();
    expect(page.querySelector("[data-system-recommendation-dismiss='rec-1']")).not.toBeNull();
    expect(page.querySelector("[data-system-replay-automation-pause]")).not.toBeNull();
    expect(page.querySelector("[data-system-replay-automation-resume]")).not.toBeNull();
    const headers = [...page.querySelectorAll("[data-extension-inventory-table] th")].map((node) => node.textContent);
    expect(headers).toEqual(["Extension", "Lifecycle", "Mode", "Health", "Actions"]);
    expect(page.querySelector("[data-extension-inventory-table]")?.textContent).toContain("ext-1");
    expect(page.querySelector("[data-extension-inventory-table]")?.textContent).toContain("active");
    expect(page.querySelector("[data-extension-inventory-table]")?.textContent).toContain("ready");
    expect(page.textContent).toContain("preview_and_apply");
  });
});
