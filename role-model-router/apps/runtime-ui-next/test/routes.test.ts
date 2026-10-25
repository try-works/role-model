import { afterEach, describe, expect, it } from "vitest";

import { mountShell } from "../src/mount";

/**
 * Run 115 S14b (R11/R21): routing in the Foldkit shell.
 *
 * Routing is owned by the runtime's RoutingConfig, not a hand-rolled listener:
 *   - makeApplication reads window.location at startup and passes the derived Url to the
 *     routing init (vendor/foldkit/packages/foldkit/src/runtime/makeApplication.ts:307-309,
 *     :370-383);
 *   - the runtime installs popstate, link-click and 'foldkit:urlchange' listeners from that
 *     config (src/runtime/browserListeners.ts:13-27, :29-41, :43-102, :104-116;
 *     src/runtime/runtime.ts:601-609).
 *
 * happy-dom note (measured, not assumed): history.pushState/replaceState update
 * window.location synchronously and do not emit popstate (same as browsers); history.back()
 * restores the previous entry synchronously and emits popstate asynchronously (observed on a
 * 50ms wait). The popstate test therefore uses a real history.back() over pre-seeded entries,
 * so the event reaching the runtime is happy-dom's own, not a hand-dispatched stand-in.
 */

const waitFor = async <Value>(
  read: () => Value | undefined,
  label: string,
  timeoutMs = 2000,
): Promise<Value> => {
  const deadline = Date.now() + timeoutMs;
  let last: Value | undefined;
  while (Date.now() < deadline) {
    last = read();
    if (last !== undefined) {
      return last;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(
    `Timed out waiting for ${label} (last value: ${String(last)}) | url: ${window.location.pathname} | body: ${document.body.textContent?.slice(0, 500) ?? ""}`,
  );
};

const bodyText = (): string => document.body.textContent ?? "";

interface Mounted {
  readonly container: HTMLDivElement;
  readonly handle: { dispose: () => void };
}

const mounted: Mounted[] = [];

const mountHere = (): Mounted => {
  const container = document.createElement("div");
  container.id = "s14b-app-shell";
  document.body.append(container);
  const handle = mountShell(container);
  const entry = { container, handle };
  mounted.push(entry);
  return entry;
};

const mountAt = (path: string): Mounted => {
  window.history.replaceState({}, "", path);
  return mountHere();
};

afterEach(() => {
  for (const entry of mounted.splice(0)) {
    entry.handle.dispose();
    entry.container.remove();
  }
  window.history.replaceState({}, "", "/");
});

describe("runtime routing in the Foldkit shell", () => {
  it("renders the route from the initial URL, including the diagnostics path parameter", async () => {
    mountAt("/diagnostics/abc");

    await waitFor(
      () => (bodyText().includes("Diagnostics: abc") ? true : undefined),
      "the diagnostics route from the initial URL",
    );

    expect(bodyText()).not.toContain("Index page");
  });

  it("renders the not-found view for an unknown URL without throwing", async () => {
    expect(() => mountAt("/does/not/exist")).not.toThrow();

    await waitFor(
      () => (bodyText().includes("Not found: /does/not/exist") ? true : undefined),
      "the not-found view for an unknown URL",
    );
  });

  it("pushes a URL from an in-app control and the URL, not local state, changes the view", async () => {
    mountAt("/");

    await waitFor(() => (bodyText().includes("Index page") ? true : undefined), "the index route");

    const clicksBefore = document.querySelector("[data-clicks]")?.getAttribute("data-clicks");
    expect(clicksBefore).toBe("0");

    const link = await waitFor(
      () => document.querySelector<HTMLAnchorElement>('a[data-nav="diagnostics"]') ?? undefined,
      "the diagnostics navigation control",
    );

    link.click();

    await waitFor(
      () => (window.location.pathname === "/diagnostics/42" ? true : undefined),
      "the pushed diagnostics URL",
    );
    await waitFor(
      () => (bodyText().includes("Diagnostics: 42") ? true : undefined),
      "the diagnostics view after the URL push",
    );

    expect(document.querySelector("[data-clicks]")?.getAttribute("data-clicks")).toBe(clicksBefore);
    expect(bodyText()).not.toContain("Index page");
  });

  it("changes the view when history navigates back, through the runtime popstate config", async () => {
    // Two entries before the mount: [Index "/"] then [Diagnostics "/diagnostics/7"].
    window.history.replaceState({}, "", "/");
    window.history.pushState({}, "", "/diagnostics/7");

    mountHere();

    await waitFor(
      () => (bodyText().includes("Diagnostics: 7") ? true : undefined),
      "the diagnostics route from the current entry",
    );

    history.back();

    await waitFor(
      () => (bodyText().includes("Index page") ? true : undefined),
      "the index view after the runtime popstate handler",
    );

    expect(window.location.pathname).toBe("/");
    expect(document.querySelector("[data-clicks]")?.getAttribute("data-clicks")).toBe("0");
  });
});
