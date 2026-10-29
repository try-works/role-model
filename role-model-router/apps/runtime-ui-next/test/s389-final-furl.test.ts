import { Option } from "effect";
import { afterEach, describe, expect, it } from "vitest";

import { Url } from "@role-model-router/foldkit";

import { mountShell } from "../src/mount";
import { Message } from "../src/message";
import { createReadbackClients } from "../src/readback";
import { resolveAppUrl, routeFromUrl } from "../src/route";
import { shellModel, shellUpdate } from "./support/runtime-shell";

/**
 * S379d (R11/R13): the last F-URL families. Real host readbacks exist for llama-swap models
 * (/local/llama-swap/models), system operator (/operator/status + /operator/trace-roots) and
 * system extensions (/extensions). llama-swap policy and matrix have NO host readback route, so
 * they stay explicit NotFound with a recorded reason.
 */

const urlOf = (href: string) => Option.getOrThrow(Url.fromString(`http://localhost${href}`));
const legacy = () => import("../src/legacy-redirects");
const commandNames = (result: ReturnType<typeof shellUpdate>): readonly string[] =>
  (result.commands ?? []).map((command) => command.name);

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
    last = document.querySelector("[data-route='" + routeName + "'][data-final-family-state='" + expected + "']")?.getAttribute("data-final-family-state") ?? null;
    if (last === expected) return last;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Timed out waiting for " + label + " (last: " + String(last) + ")");
};
afterEach(() => {
  for (const entry of pageMounted.splice(0)) { entry.handle.dispose(); entry.container.remove(); }
  window.history.replaceState({}, "", "/");
});

describe("S379d final F-URL families", () => {
  it("parses the three landed canonical routes as typed routes", () => {
    expect(routeFromUrl(urlOf("/local/llama-swap/models"))._tag).toBe("LocalLlamaSwapModels");
    expect(routeFromUrl(urlOf("/system/operator"))._tag).toBe("SystemOperator");
    expect(routeFromUrl(urlOf("/system/extensions"))._tag).toBe("SystemExtensions");
  });

  it("canonicalises the original URLs with query/hash and exactly one replace Command", async () => {
    const module = await legacy();
    expect(module.legacyRedirectForUrl(urlOf("/app/local/llama-swap/models"))?.href).toBe("/local/llama-swap/models");
    expect(module.legacyRedirectForUrl(urlOf("/app/system/operator"))?.href).toBe("/system/operator");
    expect(module.legacyRedirectForUrl(urlOf("/app/system/extensions"))?.href).toBe("/system/extensions");
    expect(module.legacyRedirectForUrl(urlOf("/app/system/operator?limit=25#roots"))?.href).toBe(
      "/system/operator?limit=25#roots",
    );
    const result = shellUpdate(shellModel(), Message.ChangedUrl({ url: urlOf("/app/system/extensions") }));
    expect(result.model.route._tag).toBe("SystemExtensions");
    expect(result.model.pendingRedirectHref).toBe("/system/extensions");
    expect(commandNames(result).filter((name) => name === "ReplaceLegacyUrl")).toHaveLength(1);
  });

  it("drops exactly the three landed families; llama-swap policy/matrix are now implemented", async () => {
    const module = await legacy();
    expect(module.MISSING_ORIGINAL_TARGETS).toHaveLength(0);
    expect(routeFromUrl(urlOf("/app/local/llama-swap/policy"))).toMatchObject({ _tag: "LocalPolicy" });
    expect(resolveAppUrl(urlOf("/app/local/llama-swap/matrix")).redirectHref).toBe("/local/llama-swap/models?view=grid");
  });

  it("leaves the requestId families unchanged", () => {
    expect(routeFromUrl(urlOf("/requests/req-6"))).toMatchObject({ _tag: "RequestDetail", requestId: "req-6" });
    expect(routeFromUrl(urlOf("/router/decisions/req-6"))).toMatchObject({ _tag: "RouterDecisionDetail", requestId: "req-6" });
  });
});

describe("S379d final family pages (real host readbacks)", () => {
  const body = { items: [{ id: "row-1", label: "First row", value: "ready" }] };
  const json = () => new Response(JSON.stringify(body), { headers: { "content-type": "application/json" }, status: 200 });

  it("renders llama-swap models loading then ok", async () => {
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    mountAt("/local/llama-swap/models", "s389-models", async () => { await gate; return json(); });
    expect(await waitForRouteState("local-llama-swap-models", "loading", "models loading")).toBe("loading");
    release?.();
    expect(await waitForRouteState("local-llama-swap-models", "ok", "models ok")).toBe("ok");
    expect(document.querySelector("[data-route='local-llama-swap-models']")?.textContent).toContain("First row");
  });

  it("renders error honestly on the extensions readback", async () => {
    mountAt("/system/extensions", "s389-error", async () => new Response("null", { headers: { "content-type": "application/json" }, status: 200 }));
    expect(await waitForRouteState("system-extensions", "error", "extensions error")).toBe("error");
    expect(document.querySelector("[data-route='system-extensions']")?.textContent).toMatch(/read failed/i);
  });

  it("renders the system operator page from the operator status readback", async () => {
    mountAt("/system/operator", "s389-operator", async () => json());
    expect(await waitForRouteState("system-operator", "ok", "operator ok")).toBe("ok");
    expect(document.querySelector("[data-route='system-operator']")?.textContent).toContain("Operator status");
  });
});
