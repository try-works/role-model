import { Option } from "effect";
import { afterEach, describe, expect, it } from "vitest";
import { mountShell } from "../src/mount";
import { createReadbackClients } from "../src/readback";

import { Url } from "@role-model-router/foldkit";

import { Message } from "../src/message";

import { routeFromUrl } from "../src/route";
import { shellModel, shellUpdate } from "./support/runtime-shell";

/**
 * S379a (R11/R13): the Models/roles family canonical URL. /models/roles is a real typed route,
 * the original /app/models/roles and legacy /app/control/roles canonicalise through the one
 * ReplaceLegacyUrl history-replace Command (query/hash preserved), and the remaining missing
 * families stay explicit NotFound -- never a generic success page.
 */

const urlOf = (href: string) => Option.getOrThrow(Url.fromString(`http://localhost${href}`));
const legacy = () => import("../src/legacy-redirects");
const commandNames = (result: ReturnType<typeof shellUpdate>): readonly string[] =>
  (result.commands ?? []).map((command) => command.name);
const replaceCommand = (result: ReturnType<typeof shellUpdate>) =>
  (result.commands ?? []).find((command) => command.name === "ReplaceLegacyUrl");

describe("S379a Models/roles family", () => {
  it("parses /models/roles as the typed ModelsRoles route", () => {
    expect(routeFromUrl(urlOf("/models/roles"))._tag).toBe("ModelsRoles");
  });

  it("canonicalises the original /app/models/roles to /models/roles", async () => {
    const module = await legacy();
    expect(module.legacyRedirectForUrl(urlOf("/app/models/roles"))?.href).toBe("/models/roles");
    expect(routeFromUrl(urlOf("/app/models/roles"))._tag).toBe("ModelsRoles");
  });

  it("redirects legacy /app/control/roles with query/hash preserved and exactly one replace Command", async () => {
    const module = await legacy();
    const redirect = module.legacyRedirectForUrl(urlOf("/app/control/roles?filter=active#roles"));
    expect(redirect?.href).toBe("/models/roles?filter=active#roles");
    const result = shellUpdate(
      shellModel(),
      Message.ChangedUrl({ url: urlOf("/app/control/roles?filter=active#roles") }),
    );
    expect(result.model.route._tag).toBe("ModelsRoles");
    expect(result.model.pendingRedirectHref).toBe("/models/roles?filter=active#roles");
    expect(commandNames(result).filter((name) => name === "ReplaceLegacyUrl")).toHaveLength(1);
    expect(replaceCommand(result)?.args?.href).toBe("/models/roles?filter=active#roles");
  });

  it("keeps every current missing family explicit NotFound and never claims the landed family as missing", async () => {
    const module = await legacy();
    const paths = module.MISSING_ORIGINAL_TARGETS.map((entry) => entry.path);
    expect(paths).not.toContain("/app/models/roles");
    for (const entry of module.MISSING_ORIGINAL_TARGETS) {
      expect(routeFromUrl(urlOf(entry.path)), entry.path).toMatchObject({
        _tag: "NotFound",
        path: entry.path,
      });
      expect(module.legacyRedirectForUrl(urlOf(entry.path)), entry.path).toBeUndefined();
    }
  });

  it("leaves requestId detail families unchanged", async () => {
    const module = await legacy();
    expect(routeFromUrl(urlOf("/requests/req-9"))).toMatchObject({
      _tag: "RequestDetail",
      requestId: "req-9",
    });
    expect(module.legacyRedirectForUrl(urlOf("/app/observe/requests/req-9"))?.href).toBe(
      "/requests/req-9",
    );
    expect(routeFromUrl(urlOf("/app/observe/requests/req-9"))).toMatchObject({
      _tag: "RequestDetail",
      requestId: "req-9",
    });
  });
});
const pageMounted: Array<{ container: HTMLElement; handle: { dispose(): void } }> = [];
const mountRoles = (id: string, fetchImpl: typeof fetch) => {
  window.history.replaceState({}, "", "/models/roles");
  const container = document.createElement("div");
  container.id = id;
  document.body.append(container);
  const handle = mountShell(container, { readbackReaders: createReadbackClients({ fetchImpl }) });
  pageMounted.push({ container, handle });
};
const waitForState = async (expected: string, label: string): Promise<string> => {
  const end = Date.now() + 3000;
  let last: string | null = null;
  while (Date.now() < end) {
    last = document.querySelector("[data-models-roles-state]")?.getAttribute("data-models-roles-state") ?? null;
    if (last === expected) return last;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Timed out waiting for " + label + " (last: " + String(last) + ")");
};
const waitForText = async (read: () => string | undefined, label: string): Promise<string> => {
  const end = Date.now() + 3000;
  while (Date.now() < end) {
    const value = read();
    if (value !== undefined) return value;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Timed out waiting for " + label);
};
afterEach(() => {
  for (const entry of pageMounted.splice(0)) { entry.handle.dispose(); entry.container.remove(); }
  window.history.replaceState({}, "", "/");
});

describe("S381 Models/roles page state (read-only)", () => {
  it("renders loading while either readback is loading (endpoints loading is not masked as ok)", async () => {
    mountRoles("s381-loading", () => new Promise<Response>(() => {}));
    const state = await waitForText(
      () => document.querySelector("[data-models-roles-state]")?.getAttribute("data-models-roles-state") ?? undefined,
      "models-roles loading",
    );
    expect(state).toBe("loading");
    expect(document.querySelector("[data-route='models-roles']")?.textContent).toContain("Model roles");
    expect(document.querySelector("[data-route='models-roles']")?.textContent).toContain("Loading model roles");
  });

  it("renders error with the readback message when either readback errors", async () => {
    mountRoles("s381-error", async () => new Response("{}", { headers: { "content-type": "application/json" }, status: 200 }));
    const state = await waitForState("error", "models-roles error");
    expect(state).toBe("error");
    const text = document.querySelector("[data-route='models-roles']")?.textContent ?? "";
    expect(text).toMatch(/read failed/i);
  });

  it("renders empty when both readbacks are empty", async () => {
    mountRoles("s381-empty", async (input) => {
      const url = String(input);
      const body = url.includes("endpoint") ? { endpoints: [] } : [];
      return new Response(JSON.stringify(body), { headers: { "content-type": "application/json" }, status: 200 });
    });
    const state = await waitForState("empty", "models-roles empty");
    expect(state).toBe("empty");
    expect(document.querySelector("[data-route='models-roles']")?.textContent).toContain("No configured models");
  });
});
