import { Option } from "effect";
import { afterEach, describe, expect, it } from "vitest";

import { Url } from "@role-model-router/foldkit";

import { mountShell } from "../src/mount";
import { Message } from "../src/message";
import { createReadbackClients } from "../src/readback";
import { routeFromUrl } from "../src/route";
import { shellModel, shellUpdate } from "./support/runtime-shell";

/**
 * S379b (R11/R13): the Router family canonical URLs. The host exposes ONE real readback source
 * (GET /api/role-model/router/config) carrying the persisted strategy/execution mode plus the
 * role (agent strategy) and workload posture entries; the four shell pages are read-only
 * projections of that ONE source, with honest loading/error/empty states.
 */

const urlOf = (href: string) => Option.getOrThrow(Url.fromString(`http://localhost${href}`));
const legacy = () => import("../src/legacy-redirects");
const commandNames = (result: ReturnType<typeof shellUpdate>): readonly string[] =>
  (result.commands ?? []).map((command) => command.name);
const replaceCommand = (result: ReturnType<typeof shellUpdate>) =>
  (result.commands ?? []).find((command) => command.name === "ReplaceLegacyUrl");

const pageMounted: Array<{ container: HTMLElement; handle: { dispose(): void } }> = [];
const mountAt = (path: string, id: string, fetchImpl: typeof fetch) => {
  window.history.replaceState({}, "", path);
  const container = document.createElement("div");
  container.id = id;
  document.body.append(container);
  const handle = mountShell(container, { readbackReaders: createReadbackClients({ fetchImpl }) });
  pageMounted.push({ container, handle });
};
const waitForRouteState = async (routeName: string, expected: string, label: string): Promise<string> => {
  const end = Date.now() + 3000;
  let last: string | null = null;
  while (Date.now() < end) {
    last = document.querySelector("[data-route='" + routeName + "'][data-router-family-state='" + expected + "']")?.getAttribute("data-router-family-state") ?? null;
    if (last === expected) return last;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Timed out waiting for " + label + " (last: " + String(last) + " | path: " + window.location.pathname + " | firstRoute: " + (document.querySelector("[data-route]")?.getAttribute("data-route") ?? "none") + ")");
};
const waitForState = async (expected: string, label: string): Promise<string> => {
  const end = Date.now() + 3000;
  let last: string | null = null;
  while (Date.now() < end) {
    last = document.querySelector("[data-router-family-state]")?.getAttribute("data-router-family-state") ?? null;
    if (last === expected) return last;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Timed out waiting for " + label + " (last: " + String(last) + ")");
};
afterEach(() => {
  for (const entry of pageMounted.splice(0)) { entry.handle.dispose(); entry.container.remove(); }
  window.history.replaceState({}, "", "/");
});

const routerConfigBody = {
  agentStrategies: [
    {
      kind: "role",
      name: "coder",
      routingMode: "difficulty",
      scoringStrategy: "difficulty",
      configuredModelIds: ["model-a"],
      requiredCapabilities: [],
      violations: [],
    },
  ],
  controller: null,
  guidance: null,
  persisted: { executionMode: "decision_only", strategy: "hybrid" },
  postureDiagnostics: { skipped: [], violations: [], warnings: [] },
  routing: null,
  sources: { policyInputs: "runtime", routingModel: "unconfigured", runtimeConfigPath: null },
  workloadExamples: [],
  workloads: [
    {
      kind: "workload",
      name: "batch",
      routingMode: "baseline",
      scoringStrategy: "cost",
      configuredModelIds: ["model-b"],
      requiredCapabilities: [],
      violations: [],
    },
  ],
};

describe("S379b Router family canonical URLs", () => {
  it("parses the four canonical router routes as typed routes", () => {
    expect(routeFromUrl(urlOf("/router/strategy"))._tag).toBe("RouterStrategy");
    expect(routeFromUrl(urlOf("/router/workloads"))._tag).toBe("RouterWorkloads");
    expect(routeFromUrl(urlOf("/router/config"))._tag).toBe("RouterConfig");
    expect(routeFromUrl(urlOf("/router/agent-strategy"))._tag).toBe("RouterAgentStrategy");
  });

  it("canonicalises the original router URLs to their canonical targets", async () => {
    const module = await legacy();
    expect(module.legacyRedirectForUrl(urlOf("/app/router/strategy"))?.href).toBe("/router/strategy");
    expect(module.legacyRedirectForUrl(urlOf("/app/router/agent-strategy"))?.href).toBe("/router/agent-strategy");
    expect(module.legacyRedirectForUrl(urlOf("/app/router/workloads"))?.href).toBe("/router/workloads");
    expect(module.legacyRedirectForUrl(urlOf("/app/router/config"))?.href).toBe("/router/strategy");
    expect(module.legacyRedirectForUrl(urlOf("/app/control/routing-strategy"))?.href).toBe("/router/strategy");
  });

  it("keeps the existing redirects resolving with query/hash and exactly one replace Command", async () => {
    const module = await legacy();
    expect(module.legacyRedirectForUrl(urlOf("/app/control/routing-strategy?scope=live#strategy"))?.href).toBe(
      "/router/strategy?scope=live#strategy",
    );
    const result = shellUpdate(
      shellModel(),
      Message.ChangedUrl({ url: urlOf("/app/control/routing-strategy") }),
    );
    expect(result.model.route._tag).toBe("RouterStrategy");
    expect(result.model.pendingRedirectHref).toBe("/router/strategy");
    expect(commandNames(result).filter((name) => name === "ReplaceLegacyUrl")).toHaveLength(1);
    expect(replaceCommand(result)?.args?.href).toBe("/router/strategy");
  });

  it("keeps every current missing family explicit NotFound and never claims a landed router family as missing", async () => {
    const module = await legacy();
    const paths = module.MISSING_ORIGINAL_TARGETS.map((entry) => entry.path);
    for (const landed of [
      "/app/router/strategy",
      "/app/router/agent-strategy",
      "/app/router/workloads",
      "/app/router/config",
    ]) {
      expect(paths).not.toContain(landed);
    }
    for (const entry of module.MISSING_ORIGINAL_TARGETS) {
      expect(routeFromUrl(urlOf(entry.path)), entry.path).toMatchObject({ _tag: "NotFound" });
    }
  });

  it("leaves requestId detail families unchanged", () => {
    expect(routeFromUrl(urlOf("/router/decisions/req-4"))).toMatchObject({
      _tag: "RouterDecisionDetail",
      requestId: "req-4",
    });
  });
});

describe("S379b Router family pages (one real router/config readback)", () => {
  it("renders the strategy projection with honest loading then ok", async () => {
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    mountAt("/router/strategy", "s383-strategy", async () => {
      await gate;
      return new Response(JSON.stringify(routerConfigBody), { headers: { "content-type": "application/json" }, status: 200 });
    });
    expect(await waitForRouteState("router-strategy", "loading", "strategy loading")).toBe("loading");
    release?.();
    expect(await waitForRouteState("router-strategy", "ok", "strategy ok")).toBe("ok");
    const text = document.querySelector("[data-route='router-strategy']")?.textContent ?? "";
    expect(text).toContain("hybrid");
    expect(text).toContain("decision_only");
  });

  it("renders error honestly when the router/config readback fails", async () => {
    mountAt("/router/strategy", "s383-error", async () => new Response("{}", { status: 200, headers: { "content-type": "application/json" } }));
    expect(await waitForRouteState("router-strategy", "error", "strategy error")).toBe("error");
    expect(document.querySelector("[data-route='router-strategy']")?.textContent).toMatch(/read failed/i);
  });

  it("renders the workload and agent-strategy projections from the same readback", async () => {
    mountAt("/router/workloads", "s383-workloads", async () =>
      new Response(JSON.stringify(routerConfigBody), { headers: { "content-type": "application/json" }, status: 200 }));
    expect(await waitForRouteState("router-workloads", "ok", "workloads ok")).toBe("ok");
    expect(document.querySelector("[data-route='router-workloads']")?.textContent).toContain("batch");
    mountAt("/router/agent-strategy", "s383-agent", async () =>
      new Response(JSON.stringify(routerConfigBody), { headers: { "content-type": "application/json" }, status: 200 }));
    expect(await waitForRouteState("router-agent-strategy", "ok", "agent ok")).toBe("ok");
    expect(document.querySelector("[data-route='router-agent-strategy']")?.textContent).toContain("coder");
  });
});
