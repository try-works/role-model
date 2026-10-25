import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { mountShell } from "../src/mount";
import {
  OBSERVABILITY_CLIENT_PATH,
  createObservabilityClient,
  observabilityErrorMessage,
} from "../src/observability";
import type { RuntimeEventSourceFactory } from "../src/refresh";
import { READBACK_PATHS } from "../src/runtime-endpoints";

const repoRoot = path.resolve(import.meta.dirname, "../../../..");
const waitFor = async <Value>(
  read: () => Value | undefined,
  label: string,
  timeoutMs = 4000,
): Promise<Value> => {
  const deadline = Date.now() + timeoutMs;
  let last: Value | undefined;
  while (Date.now() < deadline) {
    last = read();
    if (last !== undefined) return last;
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(
    `Timed out waiting for ${label} (last: ${String(last)}) | body: ${document.body.textContent?.slice(0, 500) ?? ""}`,
  );
};
const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });

const mounted: Array<{ readonly container: HTMLElement; readonly handle: { dispose(): void } }> =
  [];
const mountAt = (id: string, pathname: string, options: Parameters<typeof mountShell>[1] = {}) => {
  window.history.replaceState({}, "", pathname);
  localStorage.clear();
  const container = document.createElement("div");
  container.id = id;
  document.body.append(container);
  const handle = mountShell(container, options);
  mounted.push({ container, handle });
  return handle;
};
afterEach(() => {
  for (const entry of mounted.splice(0)) {
    entry.handle.dispose();
    entry.container.remove();
  }
  localStorage.clear();
  window.history.replaceState({}, "", "/");
});

describe("S26f client/host tie", () => {
  it("ties every shared client path to the parsed host route table and the inventory", () => {
    const hostSources = [
      "role-model-router/apps/runtime-host-bridge/src/index.ts",
      "role-model-router/apps/runtime-host-bridge/src/local-diagnostics-read.ts",
    ].map((file) => readFileSync(path.join(repoRoot, file), "utf8"));
    const registrations = new Set<string>();
    for (const rawSource of hostSources) {
      const source = rawSource
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .split("\n")
        .filter((line) => !line.trim().startsWith("//"))
        .join("\n");
      for (const match of source.matchAll(/url\.pathname\s*===\s*"([^"]+)"/g)) {
        registrations.add(match[1]);
      }
      for (const match of source.matchAll(/url\.pathname\.startsWith\("([^"]+)"\)/g)) {
        registrations.add(match[1]);
      }
      for (const match of source.matchAll(
        /(?:LOCAL_DIAGNOSTICS_PATH|const path)\s*=\s*"([^"]+)"/g,
      )) {
        registrations.add(match[1]);
      }
    }
    const inventory = JSON.parse(
      readFileSync(
        path.join(
          repoRoot,
          ".recursive/run/115-effect-foldkit-runtime-migration/evidence/other/s26a-route-inventory.json",
        ),
        "utf8",
      ),
    ) as { routes: Array<{ hostEndpoints?: string[] }> };
    const declared = new Set(inventory.routes.flatMap((row) => row.hostEndpoints ?? []));
    const sharedPaths = [OBSERVABILITY_CLIENT_PATH, ...Object.values(READBACK_PATHS)];
    expect(sharedPaths).toHaveLength(Object.keys(READBACK_PATHS).length + 1);
    for (const endpoint of sharedPaths) {
      expect(registrations.has(endpoint), endpoint).toBe(true);
      expect(declared.has(endpoint), `inventory row for ${endpoint}`).toBe(true);
    }
  });

  it("refetches observability on a revision gap 1 -> 3", async () => {
    let fetchCalls = 0;
    const listeners: Map<string, (event: MessageEvent<string>) => void> = new Map();
    let active = 0;
    const factory: RuntimeEventSourceFactory = () => {
      active += 1;
      return {
        addEventListener: (type, listener) => listeners.set(type, listener),
        close: () => {
          active -= 1;
        },
      };
    };
    mountAt("s26f-gap", "/observe/observability-snapshot", {
      readObservability: createObservabilityClient({
        fetchImpl: async () => {
          fetchCalls += 1;
          return json({
            metrics: { "router.decisions": { count: fetchCalls, incremental: false } },
          });
        },
      }),
      runtimeEventSourceFactory: factory,
    });
    await waitFor(
      () => (document.querySelector("[data-observability-state='ok']") ? true : undefined),
      "initial read",
    );
    expect(fetchCalls).toBe(1);
    listeners.get("revision.update")?.({
      data: JSON.stringify({ revision: 1 }),
    } as MessageEvent<string>);
    await waitFor(() => (fetchCalls === 2 ? true : undefined), "revision 1 refresh");
    listeners.get("revision.update")?.({
      data: JSON.stringify({ revision: 3 }),
    } as MessageEvent<string>);
    await waitFor(() => (fetchCalls === 3 ? true : undefined), "gap 3 refetch");
    expect(active).toBe(1);
  });

  it("the default observability wiring sends the provisioned bearer", async () => {
    const headers: string[] = [];
    mountAt("s26f-bearer", "/observe/observability-snapshot", {
      observabilityFetchImpl: async (_input, init) => {
        headers.push(new Headers(init?.headers).get("authorization") ?? "missing");
        return json({ metrics: { "router.decisions": { count: 1, incremental: false } } });
      },
      observabilityToken: "s26f-default-token",
    });
    await waitFor(
      () => (document.querySelector("[data-observability-state='ok']") ? true : undefined),
      "default-token read",
    );
    expect(headers).toEqual(["Bearer s26f-default-token"]);
  });

  it("distinguishes 401 and 403 and exposes aria-busy while loading", async () => {
    expect(observabilityErrorMessage(401)).toBe(
      "Observability read failed: HTTP 401 (not authorized)",
    );
    expect(observabilityErrorMessage(403)).toBe("Observability read failed: HTTP 403 (forbidden)");
    expect(observabilityErrorMessage(503, "unavailable")).toBe(
      "Observability read failed: HTTP 503 (unavailable)",
    );

    let resolveRead: ((response: Response) => void) | undefined;
    mountAt("s26f-busy", "/observe/observability-snapshot", {
      readObservability: createObservabilityClient({
        fetchImpl: async () =>
          await new Promise<Response>((resolve) => {
            resolveRead = resolve;
          }),
      }),
    });
    await waitFor(
      () => document.querySelector("[role='status'][aria-busy='true']") ?? undefined,
      "aria-busy loading",
    );
    resolveRead?.(json({ metrics: {} }));
    await waitFor(
      () => (document.querySelector("[data-observability-state='empty']") ? true : undefined),
      "empty after loading",
    );
  });
});
