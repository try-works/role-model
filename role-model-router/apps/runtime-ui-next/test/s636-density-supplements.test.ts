import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { renderToString } from "@role-model-router/foldkit/experimental/server";

import { parseReadbackFixture } from "../src/readback";
import type { Model } from "../src/model";
import { view } from "../src/view";
import { shellModel } from "./support/runtime-shell";

/**
 * S636: the static density supplements must not append duplicate/fake Workloads/Agent-strategy
 * sections ("Posture diagnostics", "Entries", "1 saved · 0 new rows", fixed template buttons,
 * hardcoded role list) on top of the real readback-driven pages. Other supplement users are audited
 * for the same class of placeholder content.
 */

const routerConfigBody = {
  agentStrategies: [{ name: "researcher", role_id: "researcher", routingMode: "hybrid", scoringStrategy: "cost" }],
  persisted: { executionMode: "decision_only", strategy: "hybrid" },
  postureDiagnostics: { violations: [], warnings: [] },
  routing: { mode: "hybrid", scoringStrategy: "cost" },
  workloads: [{ name: "batch", scoring_strategy: "cost" }],
};

const render = async (tag: string, readbackOverrides: Partial<Model["readbacks"]> = {}): Promise<HTMLElement> => {
  const base = shellModel({ route: { _tag: tag } as Model["route"] });
  const model: Model = {
    ...base,
    readbacks: {
      ...base.readbacks,
      routerConfig: parseReadbackFixture("routerConfig", routerConfigBody),
      ...readbackOverrides,
    },
  };
  const rendered = await Effect.runPromise(renderToString({
    init: () => ({ commands: [], model }),
    view,
  }, { isHydratable: false }));
  const container = document.createElement("div");
  container.innerHTML = rendered.html;
  return container;
};

const headingCount = (container: HTMLElement, text: string): number =>
  [...container.querySelectorAll("h2,h3")].filter((heading) => heading.textContent?.trim() === text).length;

describe("S636 density supplements", () => {
  it("renders Workloads without the static duplicate/placeholder sections", async () => {
    const page = await render("RouterWorkloads");
    const text = page.textContent ?? "";
    expect(headingCount(page, "Posture diagnostics")).toBe(1);
    expect(headingCount(page, "Workload templates")).toBe(1);
    expect(headingCount(page, "Entries")).toBe(1);
    expect(text).not.toContain("1 saved · 0 new rows");
    expect(text).not.toContain("0 saved · 0 new rows");
    expect(text).not.toContain("Workloads posture");
    expect(text).toContain("Save Workloads");
    expect(text).toContain("Workloads JSON");
  });

  it("renders Agent strategy without the static duplicate/placeholder sections", async () => {
    const page = await render("RouterAgentStrategy");
    const text = page.textContent ?? "";
    expect(headingCount(page, "Posture diagnostics")).toBe(1);
    expect(headingCount(page, "Entries")).toBe(1);
    expect(text).not.toContain("1 saved · 0 new rows");
    expect(text).not.toContain("0 saved · 0 new rows");
    expect(text).not.toContain("Agent strategy posture");
    expect(text).toContain("Save Agent strategy");
    expect(text).toContain("Agent strategy JSON");
  });

  it("audits the other supplement users for hardcoded placeholder content", async () => {
    const peers = await render("SystemPeers");
    expect(headingCount(peers, "Posture diagnostics")).toBe(0);
    expect(headingCount(peers, "Entries")).toBe(0);
    expect(peers.textContent).not.toContain("saved · 0 new rows");
    const llama = await render("LocalLlamaSwapModels");
    expect(llama.textContent).not.toContain("All roles 28 selected");
    expect(llama.textContent).not.toContain("saved · 0 new rows");
    const session = await render("SessionReadiness");
    expect(session.textContent).not.toContain("saved · 0 new rows");
    expect(session.textContent).not.toContain("Roles: coder, architect, security, researcher");
  });
});
