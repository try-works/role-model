import { afterEach, describe, expect, it } from "vitest";

import { mountShell } from "../src/mount";

const mounted: Array<{ container: HTMLElement; handle: { dispose(): void } }> = [];
const mountAt = (path: string, id: string) => {
  window.history.replaceState({}, "", path);
  const container = document.createElement("div");
  container.id = id;
  document.body.append(container);
  const handle = mountShell(container);
  mounted.push({ container, handle });
};
const waitFor = async (read: () => string | undefined, label: string): Promise<string> => {
  const end = Date.now() + 3000;
  while (Date.now() < end) {
    const value = read();
    if (value !== undefined) return value;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Timed out waiting for " + label);
};
afterEach(() => {
  for (const entry of mounted.splice(0)) { entry.handle.dispose(); entry.container.remove(); }
  window.history.replaceState({}, "", "/");
});

describe("S26n redirects and static rows", () => {
  it("renders local-choose as a static route", async () => {
    mountAt("/local/choose", "s26n-choose");
    const text = await waitFor(() => document.querySelector("[data-route='local-choose']")?.textContent ?? undefined, "local-choose");
    expect(text).toContain("Choose peer-backed models or llama-swap models.");
  });

  it("redirects /local/models to the Local choose target view", async () => {
    mountAt("/local/models", "s26n-local-models");
    const title = await waitFor(() => document.querySelector(".rm3-next-route-title")?.textContent ?? undefined, "local-models");
    expect(title).toContain("Local choose");
  });
});
