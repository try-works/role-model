import { afterEach, describe, expect, it } from "vitest";

import { mountShell } from "../src/mount";

/**
 * Run 115 S14a (R11): the first real Foldkit application hosted on the built wrapper stack.
 *
 * This is a mount test, not a Scene test: a real DOM container is created in happy-dom and the
 * app is started with the runtime's host-controlled entry (`embed`), which returns an
 * EmbedHandle whose `dispose` removes the rendered DOM and restores the container
 * (vendor/foldkit/packages/foldkit/src/runtime/hostConnector.ts:61-74,
 * src/runtime/start.ts:186-286 in the vendored source). The click path is the real runtime
 * dispatch: a DOM click event -> h.OnClick handler -> Message -> update -> re-render.
 */

const waitFor = async <Value>(
  read: () => Value | undefined,
  label: string,
  timeoutMs = 4000,
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
    `Timed out waiting for ${label} (last value: ${String(last)}) | body: ${document.body.innerHTML.slice(
      0,
      900,
    )}`,
  );
};

const buttonByClass = (container: HTMLElement, className: string): HTMLButtonElement | undefined =>
  container.querySelector<HTMLButtonElement>(`button.${className}`) ?? undefined;

describe("Foldkit app shell on the wrapper stack", () => {
  let container: HTMLElement | undefined;

  afterEach(() => {
    container?.remove();
    container = undefined;
    localStorage.clear();
  });

  it("mounts the app into a DOM container, dispatches a click through the runtime, and unmounts without throwing", async () => {
    container = document.createElement("div");
    // Foldkit requires the runtime container to carry an id: the runtime refuses to start
    // without one because Model preservation across reloads is keyed by it
    // (dist/chunks cannot reach import.meta.hot from a plain test, but the precondition is
    // enforced unconditionally by the built wrapper).
    container.id = "s14a-app-shell";
    document.body.append(container);
    localStorage.clear();

    const handle = mountShell(container);

    // S49: the product view no longer renders the debug counter/button. Wait for the real
    // page heading and prove the debug artifacts are absent.
    const heading = await waitFor(
      () =>
        document.querySelector("h1")?.textContent === "Runtime overview"
          ? document.querySelector("h1")
          : undefined,
      "the product page heading to render",
    );
    expect(heading?.textContent).toBe("Runtime overview");
    expect(document.body.textContent).not.toContain("Clicked");
    expect(document.body.textContent).not.toContain("Clicks:");
    await waitFor(
      () =>
        document.querySelector('button[data-slot="role-model-theme-toggle"]') ? true : undefined,
      "the reference theme toggle to render",
    );

    const themeToggle = await waitFor(
      () =>
        document.querySelector<HTMLButtonElement>('button[data-slot="role-model-theme-toggle"]') ??
        undefined,
      "the reference theme toggle to render",
    );
    expect(themeToggle.getAttribute("aria-label")).toBe("Switch to light mode");
    themeToggle.click();

    await waitFor(
      () => (themeToggle.getAttribute("aria-label") === "Switch to dark mode" ? true : undefined),
      "the theme message to reach update",
    );

    expect(() => handle.dispose()).not.toThrow();
    // EmbedHandle.dispose is documented as idempotent (hostConnector.ts:66-70).
    expect(() => handle.dispose()).not.toThrow();
    expect(document.getElementById("s14a-app-shell")).toBe(container);
    expect(container.childNodes.length).toBe(0);
    // The rendered content must be gone. The Document title is not body text, so asserting on it
    // would pass before dispose as well; assert on text the mounted view actually renders.
    expect(document.body.textContent).not.toContain("Clicks:");
    expect(document.body.textContent).not.toContain("Clicked");
  });
});
