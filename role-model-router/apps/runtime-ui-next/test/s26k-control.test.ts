import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import type { ControlClient, ControlKey } from "../src/control";
import { CONTROL_SPECS } from "../src/control";
import { mountShell } from "../src/mount";
import type { RuntimeEventSourceFactory } from "../src/refresh";
import { CONTROL_ENDPOINTS } from "../src/runtime-endpoints";

const routes: readonly {
  key: ControlKey;
  path: string;
  label: string;
  empty: string;
  emptyBody: unknown;
  stateTestName: string;
  successBody: unknown;
  successText: string;
}[] = [
  {
    empty: "No providers configured yet.",
    emptyBody: [],
    key: "providers",
    label: "Providers",
    path: "/control/providers",
    successBody: [{ id: "r1", providerId: "p1", status: "active" }],
    stateTestName: "Providers renders success, empty, loading and error on the DOM",
    successText: "p1",
  },
  {
    empty: "No endpoints configured yet.",
    emptyBody: [],
    key: "endpoints",
    label: "Endpoints",
    path: "/control/endpoints",
    successBody: [{ endpointId: "e1", modelId: "m1", status: "active" }],
    stateTestName: "Endpoints renders success, empty, loading and error on the DOM",
    successText: "m1",
  },
  {
    empty: "No controller assignment available.",
    emptyBody: {},
    key: "controlController",
    label: "Controller",
    path: "/control/controller",
    successBody: { mode: "auto" },
    stateTestName: "Controller renders success, empty, loading and error on the DOM",
    successText: "auto",
  },
];
const mounted: Array<{ container: HTMLElement; handle: { dispose(): void } }> = [];
const mountAt = (pathname: string, client: ControlClient) => {
  window.history.replaceState({}, "", pathname);
  const container = document.createElement("div");
  container.id = `s26k-${pathname.replaceAll("/", "-")}-${String(mounted.length)}`;
  document.body.append(container);
  const handle = mountShell(container, { controlClient: client });
  mounted.push({ container, handle });
  return handle;
};
const waitFor = async <T>(read: () => T | undefined, label: string): Promise<T> => {
  const end = Date.now() + 3000;
  while (Date.now() < end) {
    const value = read();
    if (value !== undefined) return value;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Timed out waiting for ${label}`);
};
afterEach(() => {
  for (const entry of mounted.splice(0)) {
    entry.handle.dispose();
    entry.container.remove();
  }
  window.history.replaceState({}, "", "/");
});

const client = (input: Partial<ControlClient>): ControlClient => ({
  dispatch: async () => ({ body: {}, status: 200 }),
  read: async () => ({ body: [], status: 200 }),
  ...input,
});

describe("S26k control surface", () => {
  for (const route of routes) {
    it(route.stateTestName, async () => {
      const success = client({ read: async () => ({ body: route.successBody, status: 200 }) });
      mountAt(route.path, success);
      const ok = await waitFor(
        () =>
          document.querySelector(`[data-control-route='${route.key}'][data-control-state='ok']`) ??
          undefined,
        `${route.key} success`,
      );
      expect(ok.textContent).toContain(route.successText);

      const empty = client({ read: async () => ({ body: route.emptyBody, status: 200 }) });
      mountAt(route.path, empty);
      const emptyNode = await waitFor(
        () =>
          document.querySelector(
            `[data-control-route='${route.key}'][data-control-state='empty']`,
          ) ?? undefined,
        `${route.key} empty`,
      );
      expect(emptyNode.textContent).toContain(route.empty);

      let resolveRead: ((value: { body: unknown; status: number }) => void) | undefined;
      const loading = client({
        read: () =>
          new Promise((resolve) => {
            resolveRead = resolve;
          }),
      });
      mountAt(route.path, loading);
      const loadingNode = await waitFor(
        () =>
          document.querySelector(
            `[data-control-route='${route.key}'][data-control-state='loading']`,
          ) ?? undefined,
        `${route.key} loading`,
      );
      expect(loadingNode?.querySelector("[role='status'][aria-busy='true']")).not.toBeNull();
      expect(loadingNode?.textContent).toContain(`Loading ${route.label.toLowerCase()}…`);
      resolveRead?.({ body: route.emptyBody, status: 200 });
      await new Promise((resolve) => setTimeout(resolve, 20));

      const error = client({
        read: async () => ({ body: { reason: "unavailable" }, status: 503 }),
      });
      mountAt(route.path, error);
      const errorNode = await waitFor(
        () =>
          document.querySelector(
            `[data-control-route='${route.key}'][data-control-state='error']`,
          ) ?? undefined,
        `${route.key} error`,
      );
      expect(errorNode.textContent).toContain(`${route.label} read failed: HTTP 503 (unavailable)`);
    });
  }

  it("dispatches one action and refuses a second dispatch while pending", async () => {
    let dispatches = 0;
    let resolveDispatch: ((value: { body: unknown; status: number }) => void) | undefined;
    mountAt(
      "/control/providers",
      client({
        dispatch: () => {
          dispatches += 1;
          return new Promise((resolve) => {
            resolveDispatch = resolve;
          });
        },
        read: async () => ({ body: [{ id: "provider-1" }], status: 200 }),
      }),
    );
    const button = (await waitFor(
      () => document.querySelector("[data-control-action='reconnect']") ?? undefined,
      "dispatch button",
    )) as HTMLButtonElement;
    button.click();
    button.click();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(dispatches).toBe(1);
    const pending = await waitFor(
      () => document.querySelector("[data-control-action-state='pending']") ?? undefined,
      "pending action",
    );
    expect(pending.textContent).toContain("Dispatching…");
    resolveDispatch?.({ body: { ok: true }, status: 200 });
    const done = await waitFor(
      () => document.querySelector("[data-control-action-state='ok']") ?? undefined,
      "action success",
    );
    expect(done.textContent).toContain("Providers action completed.");
  });

  it("renders the exact action failure phrase", async () => {
    // S246: this used the controller row-action, which S209 deliberately disabled (it has no endpoint
    // target). The phrase is a property of the control surface, so it is exercised on the providers
    // action, which is enabled and posts a real row id.
    mountAt(
      "/control/providers",
      client({
        dispatch: async () => ({ body: { reason: "rejected" }, status: 500 }),
        read: async () => ({ body: [{ id: "provider-1" }], status: 200 }),
      }),
    );
    const button = (await waitFor(
      () => document.querySelector("[data-control-action='reconnect']") ?? undefined,
      "providers action",
    )) as HTMLButtonElement;
    button.click();
    const failed = await waitFor(
      () => document.querySelector("[data-control-action-state='error']") ?? undefined,
      "action error",
    );
    expect(failed.textContent).toContain("Providers action failed: HTTP 500");
  });

  it("ties every control endpoint to the parsed host route table including method", () => {
    const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..", "..");
    const sources = [
      "role-model-router/apps/runtime-host-bridge/src/index.ts",
      "role-model-router/apps/runtime-host-bridge/src/local-diagnostics-read.ts",
    ].map((file) => readFileSync(path.join(repoRoot, file), "utf8"));
    const methods = new Map<string, Set<string>>();
    for (const raw of sources) {
      const source = raw
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .split("\n")
        .filter((line) => !line.trim().startsWith("//"))
        .join("\n");
      for (const match of source.matchAll(
        /if\s*\(\s*request\.method\s*===\s*"(GET|POST|PATCH|PUT|DELETE)"\s*&&\s*url\.pathname\s*===\s*"([^"]+)"\s*\)/g,
      )) {
        const set = methods.get(match[2]) ?? new Set<string>();
        set.add(match[1]);
        methods.set(match[2], set);
      }
    }
    for (const endpoint of Object.values(CONTROL_ENDPOINTS)) {
      expect(methods.get(endpoint.path), `${endpoint.method} ${endpoint.path}`).toContain(
        endpoint.method,
      );
    }
    expect(CONTROL_SPECS.providers.action.method).toBe("POST");
    expect(CONTROL_SPECS.endpoints.action.method).toBe("POST");
    expect(CONTROL_SPECS.controlController.action.method).toBe("PATCH");
  });

  it("sends the real method, path and body through createControlClients", async () => {
    const calls: Array<{ body?: string; method?: string; path: string }> = [];
    const { createControlClients } = await import("../src/control");
    const clients = createControlClients({
      baseUrl: "http://localhost",
      fetchImpl: async (input, init) => {
        calls.push({ body: init?.body === undefined ? undefined : String(init.body), method: init?.method, path: new URL(String(input)).pathname });
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      },
    });
    for (const key of ["providers", "endpoints", "controlController"] as const) await clients.dispatch(key);
    expect(calls.map((call) => [call.method, call.path])).toEqual([
      ["POST", CONTROL_SPECS.providers.action.path],
      ["POST", CONTROL_SPECS.endpoints.action.path],
      ["PATCH", CONTROL_SPECS.controlController.action.path],
    ]);
    // S209: the specs no longer carry operator-catalogue sample bodies. Without an acting row the
    // payload is empty; the row id is merged at dispatch time.
    expect(JSON.parse(calls[0].body ?? "{}")).toEqual({});
    expect(JSON.parse(calls[1].body ?? "{}")).toEqual({});
    expect(JSON.parse(calls[2].body ?? "{}")).toEqual({});

    const targeted: Array<{ body?: string; method?: string }> = [];
    const targetedClients = createControlClients({
      baseUrl: "http://localhost",
      fetchImpl: async (_input, init) => {
        targeted.push({ body: init?.body === undefined ? undefined : String(init.body), method: init?.method });
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      },
    });
    await targetedClients.dispatch("providers", "provider-account-1");
    await targetedClients.dispatch("endpoints", "endpoint-1");
    await targetedClients.dispatch("controlController", "endpoint-2");
    expect(JSON.parse(targeted[0]?.body ?? "{}")).toEqual({ providerAccountId: "provider-account-1" });
    expect(JSON.parse(targeted[1]?.body ?? "{}")).toEqual({});
    expect(JSON.parse(targeted[2]?.body ?? "{}")).toEqual({ endpointId: "endpoint-2" });
  });

  it("keeps action bodies and read methods on the shared specs", () => {
    for (const spec of Object.values(CONTROL_SPECS)) {
      expect(spec.read.method).toBe("GET");
      expect(spec.action.method === "POST" || spec.action.method === "PATCH").toBe(true);
      expect(spec.action.path.length).toBeGreaterThan(0);
    }
  });
});